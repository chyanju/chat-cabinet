/**
 * Convert Codex CLI raw JSONL entries into Chat Cabinet unified format.
 */
function convertCodexSession(entries, meta) {
  const session = {
    version: 1,
    session_id: meta.id,
    source: { tool: 'codex', format: 'codex', file_path: meta.filePath },
    created_at: meta.timestamp || null,
    title: null,
    workspace: { cwd: meta.cwd || null },
    model: { id: meta.model_provider || null, provider: meta.originator || null },
    config: {},
    turns: [],
  };

  // Extract session-level config from session_meta and turn_context
  for (const e of entries) {
    if (e.type === 'session_meta') {
      const p = e.payload || {};
      session.source.tool_version = p.cli_version || null;
      session.model.id = p.model_provider || session.model.id;
    }
    if (e.type === 'turn_context') {
      const p = e.payload || {};
      session.config.approval_policy = p.approval_policy || null;
      session.config.sandbox = p.sandbox_policy || null;
      session.config.effort = p.effort || null;
      session.config.personality = p.personality || null;
      if (p.model) session.model.id = p.model;
    }
  }

  // Pre-index function_call pairs and exec/patch results
  const callMap = new Map();
  const execEndMap = new Map();
  const patchEndMap = new Map();
  for (const e of entries) {
    if (e.type === 'response_item') {
      const p = e.payload;
      if (p.type === 'function_call') callMap.set(p.call_id, { call: p, output: null });
      else if (p.type === 'function_call_output') {
        const ex = callMap.get(p.call_id);
        if (ex) ex.output = p;
        else callMap.set(p.call_id, { call: null, output: p });
      }
    } else if (e.type === 'event_msg') {
      const p = e.payload;
      if (p.type === 'exec_command_end') execEndMap.set(p.call_id, p);
      else if (p.type === 'patch_apply_end') patchEndMap.set(p.call_id, p);
    }
  }

  // Build turns — split on turn_context or user_message events
  let currentTurn = null;
  const renderedCalls = new Set();

  function ensureTurn(ts) {
    if (!currentTurn) {
      currentTurn = { turn_id: String(session.turns.length), started_at: ts || null, ended_at: null, events: [] };
      session.turns.push(currentTurn);
    }
    return currentTurn;
  }

  for (const e of entries) {
    const ts = e.timestamp || null;

    if (e.type === 'session_meta') continue; // already handled

    if (e.type === 'turn_context') {
      const p = e.payload || {};
      currentTurn = { turn_id: p.turn_id || String(session.turns.length), started_at: ts, ended_at: null, events: [] };
      session.turns.push(currentTurn);
      currentTurn.events.push({
        type: 'status', timestamp: ts, kind: 'turn_start',
        label: `Turn context`,
        details: { approval_policy: p.approval_policy, sandbox: p.sandbox_policy, model: p.model, effort: p.effort },
      });
      continue;
    }

    if (e.type === 'event_msg') {
      const p = e.payload;
      const turn = ensureTurn(ts);

      if (p.type === 'user_message') {
        turn.events.push({ type: 'message', timestamp: ts, role: 'user', content: p.message || '' });
      } else if (p.type === 'agent_message') {
        turn.events.push({ type: 'message', timestamp: ts, role: 'assistant', content: p.message || '' });
      } else if (p.type === 'agent_reasoning') {
        turn.events.push({ type: 'thinking', timestamp: ts, content: p.text || '' });
      } else if (p.type === 'task_started') {
        turn.events.push({ type: 'status', timestamp: ts, kind: 'task_started', details: { mode: p.collaboration_mode_kind } });
      } else if (p.type === 'task_complete') {
        turn.events.push({ type: 'status', timestamp: ts, kind: 'task_complete' });
        turn.ended_at = ts;
      } else if (p.type === 'turn_aborted') {
        turn.events.push({ type: 'status', timestamp: ts, kind: 'turn_aborted', details: { reason: p.reason } });
        turn.ended_at = ts;
      } else if (p.type === 'thread_rolled_back') {
        turn.events.push({ type: 'status', timestamp: ts, kind: 'thread_rolled_back', details: { num_turns: p.num_turns } });
      } else if (p.type === 'context_compacted') {
        turn.events.push({ type: 'status', timestamp: ts, kind: 'context_compacted' });
      } else if (p.type === 'token_count') {
        turn.events.push({
          type: 'status', timestamp: ts, kind: 'token_count',
          details: { input_tokens: p.input_tokens || p.prompt_tokens, output_tokens: p.output_tokens || p.completion_tokens },
        });
      } else if (p.type === 'exec_command_end' || p.type === 'patch_apply_end') {
        // Handled via callMap
      } else {
        turn.events.push({ type: 'status', timestamp: ts, kind: p.type, label: p.type.replace(/_/g, ' ') });
      }
      continue;
    }

    if (e.type === 'response_item') {
      const p = e.payload;
      const turn = ensureTurn(ts);

      if (p.type === 'message') {
        const text = extractText(p.content);
        if (text) {
          if (p.role === 'developer') {
            turn.events.push({ type: 'message', timestamp: ts, role: 'system', content: text });
          } else {
            turn.events.push({ type: 'message', timestamp: ts, role: p.role || 'assistant', content: text });
          }
        }
      } else if (p.type === 'reasoning') {
        let summary = '';
        if (p.content && Array.isArray(p.content)) {
          for (const c of p.content) { if (c.type === 'summary_text') summary += c.text + '\n'; }
        }
        turn.events.push({
          type: 'thinking', timestamp: ts,
          content: summary || null,
          encrypted: !!p.encrypted_content,
          summary: summary || null,
        });
      } else if (p.type === 'function_call') {
        if (renderedCalls.has(p.call_id)) continue;
        renderedCalls.add(p.call_id);
        const pair = callMap.get(p.call_id) || {};
        const execEnd = execEndMap.get(p.call_id);
        const patchEnd = patchEndMap.get(p.call_id);
        turn.events.push(convertCodexToolCall(pair, ts, execEnd, patchEnd));
      } else if (p.type === 'function_call_output') {
        if (renderedCalls.has(p.call_id)) continue;
        renderedCalls.add(p.call_id);
        turn.events.push(convertCodexToolCall({ call: null, output: p }, ts));
      } else if (p.type === 'custom_tool_call') {
        if (renderedCalls.has(p.call_id)) continue;
        renderedCalls.add(p.call_id);
        turn.events.push({
          type: 'tool_call', timestamp: ts, tool_id: p.name || 'unknown',
          call_id: p.call_id, status: p.status === 'completed' ? 'ok' : p.status || null,
          input: { raw: p.input || null },
          output: {},
          confirmation: { state: 'unknown', user_action: null },
        });
      }
      continue;
    }
  }

  return session;
}

function convertCodexToolCall(pair, ts, execEnd, patchEnd) {
  const call = pair?.call;
  const output = pair?.output;
  const name = call?.name || 'unknown';

  let input = {};
  if (call?.arguments) {
    try {
      const parsed = JSON.parse(call.arguments);
      input = { command: parsed.cmd || null, file_path: parsed.workdir || null, raw: call.arguments };
    } catch { input = { raw: call.arguments }; }
  }

  let out = {};
  if (output?.output) out.text = String(output.output);
  if (execEnd) {
    out.exit_code = execEnd.exit_code;
    if (execEnd.aggregated_output) out.text = execEnd.aggregated_output;
    if (execEnd.status && execEnd.status !== 'completed') out.error = execEnd.status;
  }
  if (patchEnd) {
    if (!patchEnd.success) out.error = patchEnd.stderr || 'Patch failed';
    else if (patchEnd.stdout) out.text = patchEnd.stdout;
  }

  let status = 'ok';
  if (execEnd && execEnd.exit_code !== 0) status = 'error';
  if (patchEnd && !patchEnd.success) status = 'error';

  return {
    type: 'tool_call', timestamp: ts, tool_id: name, call_id: call?.call_id || null,
    status, input, output: out,
    confirmation: { state: 'unknown', user_action: null },
    duration_ms: execEnd?.duration?.secs ? execEnd.duration.secs * 1000 : null,
  };
}

function extractText(content) {
  if (!content) return '';
  if (typeof content === 'string') return content;
  if (Array.isArray(content)) {
    return content
      .filter(c => c.type === 'input_text' || c.type === 'output_text' || c.type === 'text')
      .map(c => c.text || '').join('\n');
  }
  return '';
}

module.exports = { convertCodexSession };
