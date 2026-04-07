import { escapeHtml, formatTimeBrief, renderMarkdown, genId, setupCollapse, createBlock, addCollapsible, extractText } from '../utils.js';

// ── Codex-specific blocks ────────────────────────────────

export function renderTurnContext(conversation, payload, ts) {
  const policy = payload.approval_policy || '';
  const sandbox = payload.sandbox_policy || {};
  const sandboxType = sandbox.type || '';
  const networkAccess = sandbox.network_access;

  const chips = [];
  if (policy) {
    const policyLabel = policy === 'on-request' ? '🔒 Approval: on-request' :
                        policy === 'auto-approve' ? '✅ Approval: auto-approve' :
                        `Approval: ${policy}`;
    chips.push(`<span class="ctx-chip ctx-policy-${policy === 'auto-approve' ? 'auto' : 'request'}">${escapeHtml(policyLabel)}</span>`);
  }
  if (sandboxType) {
    chips.push(`<span class="ctx-chip ctx-sandbox">📦 Sandbox: ${escapeHtml(sandboxType)}</span>`);
  }
  if (networkAccess === true) {
    chips.push(`<span class="ctx-chip ctx-net-yes">🌐 Network: allowed</span>`);
  } else if (networkAccess === false) {
    chips.push(`<span class="ctx-chip ctx-net-no">🚫 Network: blocked</span>`);
  }
  if (chips.length === 0) return;

  const div = document.createElement('div');
  div.className = 'turn-context-bar';
  div.innerHTML = `<span class="turn-context-label">Turn context · ${formatTimeBrief(ts)}</span>${chips.join('')}`;
  conversation.appendChild(div);
}

export function renderMessage(conversation, payload, ts) {
  const role = payload.role || 'unknown';
  if (role === 'developer') {
    const text = extractText(payload.content);
    if (!text) return;
    const block = createBlock('msg-developer', 'SYSTEM', ts);
    const bodyEl = block.querySelector('.msg-body');
    bodyEl.textContent = text.slice(0, 200) + (text.length > 200 ? '…' : '');
    addCollapsible(block, 'Full system prompt', text, true);
    conversation.appendChild(block);
    return;
  }

  const text = extractText(payload.content);
  if (!text) return;

  const cssClass = role === 'user' ? 'msg-user' : 'msg-assistant';
  const label = role === 'user' ? 'USER' : 'ASSISTANT';
  const block = createBlock(cssClass, label, ts);
  const bodyEl = block.querySelector('.msg-body');
  bodyEl.innerHTML = renderMarkdown(text);
  conversation.appendChild(block);
}

export function renderToolCall(conversation, pair, ts, execEnd, patchEnd) {
  const block = document.createElement('div');
  block.className = 'msg-block msg-tool';

  const call = pair?.call;
  const output = pair?.output;

  let name = call?.name || 'unknown_tool';
  let args = '';
  if (call?.arguments) {
    try {
      const parsed = JSON.parse(call.arguments);
      args = parsed.cmd || JSON.stringify(parsed, null, 2);
    } catch {
      args = call.arguments;
    }
  }

  let execHtml = '';
  if (execEnd) {
    const exitCode = execEnd.exit_code;
    const execStatus = execEnd.status || '';
    const dur = execEnd.duration;
    const durStr = dur ? `${dur.secs || 0}s` : '';
    if (execStatus === 'completed' && exitCode === 0) {
      execHtml = `<div class="tool-exec-result exec-ok">✅ Command completed (exit ${exitCode}${durStr ? ', ' + durStr : ''})</div>`;
    } else if (execStatus === 'completed') {
      execHtml = `<div class="tool-exec-result exec-warn">⚠️ Command exited with code ${exitCode}${durStr ? ' (' + durStr + ')' : ''}</div>`;
    } else {
      execHtml = `<div class="tool-exec-result exec-fail">❌ Command ${escapeHtml(execStatus)} (exit ${exitCode != null ? exitCode : '?'})</div>`;
    }
    if (execEnd.aggregated_output) {
      const out = execEnd.aggregated_output;
      const shortOut = out.length > 500 ? out.slice(0, 500) + '...' : out;
      execHtml += `<div class="tool-output" style="margin-top:4px">${escapeHtml(shortOut)}</div>`;
    }
  }
  if (patchEnd) {
    if (patchEnd.success) {
      execHtml += `<div class="tool-exec-result exec-ok">✅ Patch applied</div>`;
      if (patchEnd.stdout) execHtml += `<div class="tool-cmd" style="margin-top:4px;font-size:11px">${escapeHtml(patchEnd.stdout)}</div>`;
    } else {
      execHtml += `<div class="tool-exec-result exec-fail">❌ Patch failed</div>`;
      if (patchEnd.stderr) execHtml += `<div class="tool-cmd" style="margin-top:4px;color:var(--red)">${escapeHtml(patchEnd.stderr)}</div>`;
    }
  }

  const id = genId();
  block.innerHTML = `
    <div class="msg-label collapse-toggle" data-target="${id}">
      🔧 ${escapeHtml(name)}
      <span style="font-weight:400;font-size:10px;color:var(--text-muted);margin-left:auto">${formatTimeBrief(ts)}</span>
    </div>
    <div class="collapsible-content open" id="${id}">
      <div class="tool-detail">
        ${args ? `<div style="font-size:11px;color:var(--text-muted);margin-bottom:4px">Arguments:</div><div class="tool-cmd">${escapeHtml(args)}</div>` : ''}
        ${execHtml}
        ${output ? `<div style="font-size:11px;color:var(--text-muted);margin:8px 0 4px">Output:</div><div class="tool-output">${escapeHtml(String(output.output || ''))}</div>` : ''}
      </div>
    </div>
  `;
  setupCollapse(block);
  conversation.appendChild(block);
}

export function renderCustomToolCall(conversation, payload, ts, patchEnd) {
  const block = document.createElement('div');
  block.className = 'msg-block msg-tool';

  const name = payload.name || 'unknown_tool';
  const status = payload.status || '';
  const input = payload.input || '';

  let statusHtml = '';
  if (status === 'completed') statusHtml = '<span class="tool-status-ok">✅ completed</span>';
  else if (status) statusHtml = `<span class="tool-status-fail">❌ ${escapeHtml(status)}</span>`;

  let patchHtml = '';
  if (patchEnd) {
    if (patchEnd.success) {
      patchHtml = `<div class="tool-exec-result exec-ok">✅ Patch applied successfully</div>`;
      if (patchEnd.stdout) patchHtml += `<div class="tool-cmd" style="margin-top:4px;font-size:11px">${escapeHtml(patchEnd.stdout)}</div>`;
    } else {
      patchHtml = `<div class="tool-exec-result exec-fail">❌ Patch failed</div>`;
      if (patchEnd.stderr) patchHtml += `<div class="tool-cmd" style="margin-top:4px;color:var(--red)">${escapeHtml(patchEnd.stderr)}</div>`;
    }
  }

  const id = genId();
  const shortInput = input.length > 200 ? input.slice(0, 200) + '...' : input;
  block.innerHTML = `
    <div class="msg-label collapse-toggle" data-target="${id}">
      🔧 ${escapeHtml(name)} ${statusHtml}
      <span style="font-weight:400;font-size:10px;color:var(--text-muted);margin-left:auto">${formatTimeBrief(ts)}</span>
    </div>
    <div class="collapsible-content open" id="${id}">
      <div class="tool-detail">
        ${shortInput ? `<div class="tool-cmd">${escapeHtml(shortInput)}</div>` : ''}
        ${patchHtml}
      </div>
    </div>
  `;
  if (input.length > 200) addCollapsible(block, 'Full patch content', input, true);
  setupCollapse(block);
  conversation.appendChild(block);
}

export function renderReasoning(conversation, payload, ts) {
  const block = document.createElement('div');
  block.className = 'msg-block msg-reasoning';
  const id = genId();

  let summary = '';
  if (payload.content && Array.isArray(payload.content)) {
    for (const c of payload.content) {
      if (c.type === 'summary_text') summary += c.text + '\n';
    }
  }
  if (!summary) summary = '(reasoning content encrypted or not available)';

  block.innerHTML = `
    <div class="msg-label collapse-toggle" data-target="${id}">
      🧠 Reasoning
      <span style="font-weight:400;font-size:10px;color:var(--text-muted);margin-left:auto">${formatTimeBrief(ts)}</span>
    </div>
    <div class="collapsible-content" id="${id}">
      <div class="msg-body" style="font-size:12px;opacity:0.8">${renderMarkdown(summary)}</div>
    </div>
  `;
  setupCollapse(block);
  conversation.appendChild(block);
}

export function renderEvent(conversation, payload, ts) {
  const etype = payload.type;

  if (etype === 'token_count') {
    const inputTokens = payload.input_tokens || payload.prompt_tokens || '';
    const outputTokens = payload.output_tokens || payload.completion_tokens || '';
    if (inputTokens || outputTokens) {
      const div = document.createElement('div');
      div.className = 'token-info';
      div.textContent = `tokens: in=${inputTokens} out=${outputTokens}`;
      conversation.appendChild(div);
    }
    return;
  }

  if (etype === 'turn_aborted') {
    const reason = payload.reason || 'unknown';
    const div = document.createElement('div');
    div.className = 'msg-block msg-action action-rejected';
    div.innerHTML = `
      <div class="msg-label"><span class="action-icon">⛔</span> Turn Aborted
        <span style="font-weight:400;font-size:10px;color:var(--text-muted);margin-left:auto">${formatTimeBrief(ts)}</span>
      </div>
      <div class="action-body">User interrupted the turn. Reason: <strong>${escapeHtml(reason)}</strong></div>
    `;
    conversation.appendChild(div);
    return;
  }

  if (etype === 'thread_rolled_back') {
    const numTurns = payload.num_turns || '?';
    const div = document.createElement('div');
    div.className = 'msg-block msg-action action-rollback';
    div.innerHTML = `
      <div class="msg-label"><span class="action-icon">↩️</span> Thread Rolled Back
        <span style="font-weight:400;font-size:10px;color:var(--text-muted);margin-left:auto">${formatTimeBrief(ts)}</span>
      </div>
      <div class="action-body">User rolled back <strong>${escapeHtml(String(numTurns))}</strong> turn(s)</div>
    `;
    conversation.appendChild(div);
    return;
  }

  if (etype === 'exec_command_end' || etype === 'patch_apply_end') return;

  if (etype === 'agent_reasoning') {
    const text = payload.text || '';
    if (!text) return;
    const block = document.createElement('div');
    block.className = 'msg-block msg-reasoning';
    const id = genId();
    block.innerHTML = `
      <div class="msg-label collapse-toggle" data-target="${id}">
        🧠 Agent Reasoning
        <span style="font-weight:400;font-size:10px;color:var(--text-muted);margin-left:auto">${formatTimeBrief(ts)}</span>
      </div>
      <div class="collapsible-content" id="${id}">
        <div class="msg-body" style="font-size:12px;opacity:0.8">${renderMarkdown(text)}</div>
      </div>
    `;
    setupCollapse(block);
    conversation.appendChild(block);
    return;
  }

  if (etype === 'agent_message') {
    const text = payload.message || '';
    if (!text) return;
    const phase = payload.phase || '';
    const label = phase === 'commentary' ? 'ASSISTANT (commentary)' : 'ASSISTANT';
    const block = createBlock('msg-assistant', label, ts);
    block.querySelector('.msg-body').innerHTML = renderMarkdown(text);
    conversation.appendChild(block);
    return;
  }

  if (etype === 'user_message') {
    const text = payload.message || '';
    if (!text) return;
    const block = createBlock('msg-user', 'USER', ts);
    block.querySelector('.msg-body').innerHTML = renderMarkdown(text);
    conversation.appendChild(block);
    return;
  }

  if (etype === 'task_started') {
    const mode = payload.collaboration_mode_kind || '';
    const div = document.createElement('div');
    div.className = 'msg-event';
    div.innerHTML = `<span class="event-pill task-start-pill">Task started${mode ? ' · mode: ' + escapeHtml(mode) : ''} · ${formatTimeBrief(ts)}</span>`;
    conversation.appendChild(div);
    return;
  }

  if (etype === 'task_complete') {
    const div = document.createElement('div');
    div.className = 'msg-event';
    div.innerHTML = `<span class="event-pill task-end-pill">Task complete · ${formatTimeBrief(ts)}</span>`;
    conversation.appendChild(div);
    return;
  }

  if (etype === 'context_compacted') {
    const div = document.createElement('div');
    div.className = 'msg-event';
    div.innerHTML = `<span class="event-pill">Context compacted · ${formatTimeBrief(ts)}</span>`;
    conversation.appendChild(div);
    return;
  }

  const div = document.createElement('div');
  div.className = 'msg-event';
  const label = etype.replace(/_/g, ' ');
  div.innerHTML = `<span class="event-pill">${escapeHtml(label)} · ${formatTimeBrief(ts)}</span>`;
  conversation.appendChild(div);
}

// ── Shared tool blocks (used by Claude & Cursor) ─────────

export function renderClaudeToolUse(conversation, toolUse, ts) {
  const block = document.createElement('div');
  block.className = 'msg-block msg-tool';

  const name = toolUse.name || 'unknown_tool';
  const input = toolUse.input || {};
  let argsStr = '';
  try { argsStr = JSON.stringify(input, null, 2); } catch { argsStr = String(input); }

  const id = genId();
  block.innerHTML = `
    <div class="msg-label collapse-toggle" data-target="${id}">
      🔧 ${escapeHtml(name)}
      <span style="font-weight:400;font-size:10px;color:var(--text-muted);margin-left:auto">${formatTimeBrief(ts)}</span>
    </div>
    <div class="collapsible-content open" id="${id}">
      <div class="tool-detail">
        ${argsStr ? `<div style="font-size:11px;color:var(--text-muted);margin-bottom:4px">Input:</div><div class="tool-cmd">${escapeHtml(argsStr)}</div>` : ''}
      </div>
    </div>
  `;
  setupCollapse(block);
  conversation.appendChild(block);
}

export function renderClaudeToolResult(conversation, toolResult, ts) {
  const content = toolResult.content || '';
  let resultText = '';
  if (typeof content === 'string') resultText = content;
  else if (Array.isArray(content)) {
    for (const c of content) {
      if (c && c.type === 'text') resultText += (resultText ? '\n' : '') + (c.text || '');
    }
  }
  if (!resultText.trim()) return;

  const isError = toolResult.is_error === true;
  const block = document.createElement('div');
  block.className = 'msg-block ' + (isError ? 'msg-tool-error' : 'msg-tool');

  const id = genId();
  block.innerHTML = `
    <div class="msg-label collapse-toggle" data-target="${id}">
      ${isError ? '❌' : '📋'} Tool Result${isError ? ' (Error)' : ''}
      <span style="font-weight:400;font-size:10px;color:var(--text-muted);margin-left:auto">${formatTimeBrief(ts)}</span>
    </div>
    <div class="collapsible-content open" id="${id}">
      <div class="tool-detail">
        <div class="tool-output">${escapeHtml(resultText.slice(0, 3000))}</div>
      </div>
    </div>
  `;
  setupCollapse(block);
  conversation.appendChild(block);
}

// ── Thinking block (shared) ──────────────────────────────

export function renderThinking(conversation, thinkText, ts, model) {
  if (!thinkText) return;
  const block = document.createElement('div');
  block.className = 'msg-block msg-reasoning';
  const id = genId();
  block.innerHTML = `
    <div class="msg-label collapse-toggle" data-target="${id}">
      🧠 Thinking${model ? ' · ' + escapeHtml(model) : ''}
      <span style="font-weight:400;font-size:10px;color:var(--text-muted);margin-left:auto">${formatTimeBrief(ts)}</span>
    </div>
    <div class="collapsible-content" id="${id}">
      <div class="msg-body" style="font-size:12px;opacity:0.8">${renderMarkdown(thinkText)}</div>
    </div>
  `;
  setupCollapse(block);
  conversation.appendChild(block);
}
