/**
 * Convert VS Code chatSessions key-value JSONL into Chat Cabinet unified format.
 *
 * This is the richest source — it has confirmation state, toolSpecificData,
 * file edits, thinking, and more.
 */
function convertVSCodeChatSession(entries, meta) {
  // Step 1: Reconstruct the session object from the KV store
  const session = {};

  for (const entry of entries) {
    const { kind, k, v } = entry;
    if (kind === 0 && v && typeof v === 'object') {
      Object.assign(session, v);
    } else if (kind === 1 && Array.isArray(k) && k.length > 0) {
      setAtPath(session, k, v);
    } else if (kind === 2 && Array.isArray(k) && k.length > 0) {
      appendAtPath(session, k, v);
    }
  }

  // Step 2: Build Chat Cabinet format
  const modelInfo = session.inputState?.selectedModel || {};
  const modelMeta = modelInfo.metadata || {};

  const result = {
    version: 1,
    session_id: session.sessionId || meta.id,
    source: { tool: 'vscode-chat', format: 'vscode-chat-session', file_path: meta.filePath, tool_version: null },
    created_at: session.creationDate ? new Date(session.creationDate).toISOString() : meta.timestamp || null,
    title: session.customTitle || null,
    workspace: { cwd: meta.cwd || null },
    model: {
      id: modelMeta.id || modelInfo.identifier || meta.model_provider || null,
      provider: modelMeta.vendor || 'copilot',
      name: modelMeta.name || null,
    },
    config: {
      permission_mode: session.inputState?.permissionLevel || null,
      agent_mode: session.inputState?.mode?.id || null,
    },
    turns: [],
  };

  // Step 3: Convert each request into a turn
  const requests = session.requests || [];
  for (const req of requests) {
    if (!req || typeof req !== 'object') continue;
    const turn = convertRequest(req);
    if (turn) result.turns.push(turn);
  }

  // Step 4: Deduplicate tool_call events by call_id across turns.
  // VS Code may record the same tool call in multiple requests (e.g. once
  // without isConfirmed, then again with the final consent state).  Keep the
  // last occurrence (richest data) and remove earlier duplicates.
  const seenCallIds = new Map(); // call_id → { turnIdx, eventIdx }
  for (let ti = 0; ti < result.turns.length; ti++) {
    const events = result.turns[ti].events;
    for (let ei = 0; ei < events.length; ei++) {
      const ev = events[ei];
      if (ev.type !== 'tool_call' || !ev.call_id) continue;
      const prev = seenCallIds.get(ev.call_id);
      if (prev) {
        // Remove the earlier (less complete) duplicate
        result.turns[prev.turnIdx].events[prev.eventIdx] = null;
      }
      seenCallIds.set(ev.call_id, { turnIdx: ti, eventIdx: ei });
    }
  }
  // Clean up nulled entries
  for (const turn of result.turns) {
    turn.events = turn.events.filter(e => e !== null);
  }

  return result;
}

function convertRequest(req) {
  const msg = req.message || {};
  const text = msg.text || '';
  const ts = req.timestamp ? new Date(req.timestamp).toISOString() : null;
  const agent = req.agent || {};
  const agentId = agent.id || '';
  const modelId = req.modelId || '';

  const events = [];

  // User message
  if (text.trim()) {
    events.push({
      type: 'message', timestamp: ts, role: 'user', content: text,
      agent: agentId ? { id: agentId, name: agent.fullName || agent.name || agentId } : null,
    });
  }

  // Response items
  const response = req.response || [];
  let markdownBuffer = '';

  for (const item of response) {
    if (!item || typeof item !== 'object') continue;
    const ik = item.kind;

    if (ik === 'markdownContent' || !ik) {
      // Markdown content (default kind)
      const content = item.content || item;
      const val = (typeof content === 'object' ? content.value : content) || '';
      markdownBuffer += val;
      continue;
    }

    // Flush markdown buffer before non-markdown items
    if (markdownBuffer.trim()) {
      events.push({ type: 'message', timestamp: ts, role: 'assistant', content: markdownBuffer, model: modelId || null });
      markdownBuffer = '';
    }

    if (ik === 'toolInvocationSerialized') {
      // Skip hidden wrapper tools (e.g. copilot_fetchWebPage wrapping vscode_fetchWebPage_internal)
      if (item.presentation === 'hidden' || item.presentation === 'hiddenAfterComplete') continue;
      events.push(convertToolInvocation(item, ts));
    } else if (ik === 'thinking') {
      const thinkItems = item.value || [];
      let thinkText = '';
      if (Array.isArray(thinkItems)) {
        for (const t of thinkItems) {
          if (t && typeof t === 'object' && t.value) thinkText += t.value + '\n';
          else if (typeof t === 'string') thinkText += t + '\n';
        }
      } else if (typeof thinkItems === 'string') {
        thinkText = thinkItems;
      }
      if (thinkText.trim()) {
        events.push({ type: 'thinking', timestamp: ts, content: thinkText.trim(), model: modelId || null });
      }
    } else if (ik === 'textEditGroup') {
      const uri = item.uri || {};
      const filePath = uri.path || uri.fsPath || '';
      if (filePath) {
        events.push({ type: 'file_edit', timestamp: ts, uri: filePath, action: 'modify' });
      }
    } else if (ik === 'progressTaskSerialized') {
      const label = item.title || (item.content && typeof item.content === 'object' ? item.content.value : item.content) || '';
      if (label) {
        events.push({ type: 'status', timestamp: ts, kind: 'progress', label });
      }
    } else if (ik === 'codeblockUri') {
      // Code block reference — skip
    } else if (ik === 'undoStop') {
      // Undo checkpoint — skip
    } else if (ik === 'inlineReference') {
      // Inline file reference — skip (info is in markdown)
    } else if (ik === 'confirmation') {
      events.push({
        type: 'status', timestamp: ts, kind: 'confirmation',
        label: item.title || 'Confirmation',
        details: { message: item.message?.value || '', used: item.isUsed },
      });
    } else if (ik === 'elicitationSerialized') {
      events.push({
        type: 'status', timestamp: ts, kind: 'elicitation',
        label: item.title?.value || 'Question',
        details: { state: item.state, hidden: item.isHidden },
      });
    }
  }

  // Flush remaining markdown
  if (markdownBuffer.trim()) {
    events.push({ type: 'message', timestamp: ts, role: 'assistant', content: markdownBuffer, model: modelId || null });
  }

  // Result metadata
  const result = req.result || {};
  const timings = result.timings || {};
  const duration = timings.totalElapsed || null;
  if (duration) {
    events.push({ type: 'status', timestamp: ts, kind: 'turn_end', details: { duration_ms: duration } });
  }

  // Error info
  if (result.errorDetails) {
    events.push({
      type: 'status', timestamp: ts, kind: 'error',
      label: result.errorDetails.message || 'Error',
      details: result.errorDetails,
    });
  }

  if (events.length === 0) return null;

  return {
    turn_id: req.requestId || null,
    started_at: ts,
    ended_at: null,
    duration_ms: duration,
    model: modelId ? { id: modelId } : null,
    token_usage: result.metadata ? {
      input: result.metadata.promptTokens || null,
      output: result.metadata.outputTokens || null,
    } : null,
    events,
  };
}

/**
 * Map VS Code ToolConfirmKind (isConfirmed.type) to Chat Cabinet confirmation state.
 *
 * VS Code enum (src/vs/workbench/contrib/chat/common/chatService/chatService.ts):
 *   0 = Denied              — user explicitly denied
 *   1 = ConfirmationNotNeeded — auto-approved, no prompt shown
 *   2 = Setting             — approved via persistent user setting
 *   3 = LmServicePerTool    — approved by LM service per-tool rule
 *   4 = UserAction          — user explicitly clicked Accept
 *   5 = Skipped             — user chose to skip (proceed without running)
 *
 * Legacy: isConfirmed may be a plain boolean (pre-1.104 VS Code).
 */
function mapConfirmation(isConfirmed) {
  if (isConfirmed == null) return { state: 'unknown', required: null, user_action: null };
  if (typeof isConfirmed === 'boolean') {
    return isConfirmed
      ? { state: 'accepted', required: null, user_action: true }
      : { state: 'rejected', required: null, user_action: true };
  }
  const raw = typeof isConfirmed === 'object' ? isConfirmed : { type: isConfirmed };
  const type = raw.type;
  switch (type) {
    case 0: return { state: 'rejected', required: true, user_action: true };
    case 1: return { state: 'auto', required: false, user_action: false };
    case 2: return { state: 'setting', required: false, user_action: false };
    case 3: return { state: 'setting', required: false, user_action: false, scope: raw.scope || null };
    case 4: return { state: 'accepted', required: true, user_action: true };
    case 5: return { state: 'skipped', required: true, user_action: true };
    default: return { state: 'unknown', required: null, user_action: null };
  }
}

function convertToolInvocation(item, ts) {
  const toolId = item.toolId || '';
  const tsd = item.toolSpecificData || {};
  const confirmation = mapConfirmation(item.isConfirmed);

  let input = {};
  let output = {};
  let status = item.isComplete ? 'ok' : 'pending';
  let durationMs = null;
  let subagent = null;

  if (tsd.kind === 'terminal') {
    const cmd = tsd.commandLine || {};
    input.command = (typeof cmd === 'object' ? cmd.original : cmd) || null;
    const cwd = tsd.cwd;
    if (cwd) input.file_path = typeof cwd === 'object' ? (cwd.path || cwd.fsPath) : cwd;

    const termOutput = tsd.terminalCommandOutput || {};
    const outputText = (typeof termOutput === 'object' ? termOutput.text : termOutput) || '';
    if (outputText) output.text = outputText;

    const state = tsd.terminalCommandState || {};
    if (typeof state === 'object' && state.exitCode != null) {
      output.exit_code = state.exitCode;
      if (state.exitCode !== 0) status = 'error';
      if (state.duration) durationMs = state.duration;
    }
  } else if (tsd.kind === 'subagent') {
    subagent = {
      agent_name: tsd.agentName || null,
      prompt: tsd.prompt || null,
      result: tsd.result || null,
    };
    input.raw = tsd.description || null;
  } else if (tsd.kind === 'todoList') {
    input.raw = JSON.stringify(tsd.todoList || []);
  } else {
    // Fallback: use invocationMessage
    const invMsg = item.invocationMessage || {};
    const invText = (typeof invMsg === 'object' ? invMsg.value : invMsg) || '';
    if (invText) input.raw = invText;
  }

  // resultDetails (e.g. fetched URLs)
  const resultDetails = item.resultDetails;
  if (Array.isArray(resultDetails) && resultDetails.length > 0) {
    const urls = resultDetails
      .filter(u => u && typeof u === 'object' && u.scheme && u.authority)
      .map(u => `${u.scheme}://${u.authority}${u.path || ''}`);
    if (urls.length > 0) output.urls = urls;
  }

  // pastTenseMessage as fallback
  const ptm = item.pastTenseMessage;
  const ptmText = (typeof ptm === 'object' ? ptm?.value : ptm) || '';
  if (!input.raw && !input.command && ptmText) {
    input.raw = ptmText;
  }

  // resultMessage fallback
  const resultMsg = item.resultMessage || {};
  const resultText = (typeof resultMsg === 'object' ? resultMsg.value : resultMsg) || '';
  if (!output.text && !output.urls && resultText) {
    output.text = resultText;
  }

  return {
    type: 'tool_call', timestamp: ts, tool_id: toolId, call_id: item.toolCallId || null,
    status, input, output, confirmation, duration_ms: durationMs, subagent,
  };
}

// ── KV store helpers ─────────────────────────────────────

function setAtPath(obj, pathArr, value) {
  for (let i = 0; i < pathArr.length - 1; i++) {
    const key = pathArr[i];
    const nextKey = pathArr[i + 1];
    if (typeof key === 'number') {
      while (obj.length <= key) obj.push(typeof nextKey === 'number' ? [] : {});
      obj = obj[key];
    } else {
      if (!(key in obj)) obj[key] = typeof nextKey === 'number' ? [] : {};
      obj = obj[key];
    }
  }
  const last = pathArr[pathArr.length - 1];
  if (typeof last === 'number') {
    while (obj.length <= last) obj.push(null);
    obj[last] = value;
  } else {
    obj[last] = value;
  }
}

function appendAtPath(obj, pathArr, values) {
  for (const key of pathArr) {
    if (typeof key === 'number') {
      while (obj.length <= key) obj.push({});
      obj = obj[key];
    } else {
      if (!(key in obj)) obj[key] = [];
      obj = obj[key];
    }
  }
  if (Array.isArray(obj)) {
    obj.push(...(Array.isArray(values) ? values : [values]));
  }
}

module.exports = { convertVSCodeChatSession };
