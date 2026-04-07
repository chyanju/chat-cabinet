/**
 * Unified renderer for Chat Cabinet format.
 *
 * This single renderer handles all source formats — the server-side converters
 * have already normalized everything into the Chat Cabinet JSON structure.
 */
import { escapeHtml, formatTime, formatTimeBrief, renderMarkdown, genId, setupCollapse, createBlock } from '../utils.js';

/**
 * Render a full Chat Cabinet session into the conversation container.
 */
export function renderSession(conversation, session) {
  // Session start pill
  const title = session.title || '';
  const ts = session.created_at || '';
  const src = session.source?.tool || '';
  const div = document.createElement('div');
  div.className = 'msg-event';
  div.innerHTML = `<span class="event-pill session-start-pill">Session${title ? ': ' + escapeHtml(title) : ''}${src ? ' · ' + escapeHtml(src) : ''} · ${formatTimeBrief(ts)}</span>`;
  conversation.appendChild(div);

  for (const turn of (session.turns || [])) {
    renderTurn(conversation, turn);
  }
}

function renderTurn(conversation, turn) {
  for (const event of (turn.events || [])) {
    renderEvent(conversation, event);
  }
}

function renderEvent(conversation, event) {
  switch (event.type) {
    case 'message':   return renderMessage(conversation, event);
    case 'tool_call': return renderToolCall(conversation, event);
    case 'thinking':  return renderThinking(conversation, event);
    case 'file_edit': return renderFileEdit(conversation, event);
    case 'status':    return renderStatus(conversation, event);
  }
}

// ── Message ──────────────────────────────────────────────

function renderMessage(conversation, event) {
  const role = event.role || 'unknown';
  const content = event.content || '';
  if (!content.trim()) return;

  if (role === 'system') {
    const block = createBlock('msg-developer', 'SYSTEM', event.timestamp);
    const bodyEl = block.querySelector('.msg-body');
    bodyEl.textContent = content.slice(0, 200) + (content.length > 200 ? '…' : '');
    addCollapsible(block, 'Full system prompt', content, true);
    conversation.appendChild(block);
    return;
  }

  const isUser = role === 'user';
  const cssClass = isUser ? 'msg-user' : 'msg-assistant';
  let label = isUser ? 'USER' : 'ASSISTANT';

  // Show agent info for user messages
  if (isUser && event.agent) {
    const agentName = event.agent.name || event.agent.id || '';
    if (agentName) label = `USER → ${agentName.replace('github.copilot.', '')}`;
  }

  // Show command badge
  if (event.is_command) {
    const evDiv = document.createElement('div');
    evDiv.className = 'msg-event';
    evDiv.innerHTML = `<span class="event-pill">${escapeHtml(content.slice(0, 120))} · ${formatTimeBrief(event.timestamp)}</span>`;
    conversation.appendChild(evDiv);
    return;
  }

  const block = createBlock(cssClass, label, event.timestamp);
  const bodyEl = block.querySelector('.msg-body');
  bodyEl.innerHTML = renderMarkdown(content);
  conversation.appendChild(block);
}

// ── Tool Call ────────────────────────────────────────────

const CONFIRMATION_BADGES = {
  'auto':      '<span class="tool-status-auto" title="Auto-confirmed">⚡ Auto</span>',
  'accepted':  '<span class="tool-status-ok" title="User accepted">👤 Accepted</span>',
  'rejected':  '<span class="tool-status-fail" title="User rejected">🚫 Rejected</span>',
  'allow_all': '<span class="tool-status-auto" title="Session-level Allow All">✅ Allow All</span>',
  'pending':   '<span class="tool-status-fail" title="Pending confirmation">⏳ Pending</span>',
};

function renderToolCall(conversation, event) {
  const block = document.createElement('div');
  const isError = event.status === 'error';
  block.className = 'msg-block ' + (isError ? 'msg-tool-error' : 'msg-tool');

  const toolId = event.tool_id || 'unknown';
  const conf = event.confirmation || {};
  const badge = CONFIRMATION_BADGES[conf.state] || '';
  const ts = event.timestamp;

  // Build input HTML
  let inputHtml = '';
  const input = event.input || {};
  if (input.command) {
    inputHtml = `<div style="font-size:11px;color:var(--text-muted);margin-bottom:4px">Command:</div><div class="tool-cmd">${escapeHtml(input.command)}</div>`;
  } else if (input.file_path && !input.raw) {
    inputHtml = `<div class="tool-cmd">${escapeHtml(input.file_path)}</div>`;
  } else if (input.urls && input.urls.length) {
    inputHtml = `<div class="tool-cmd">${input.urls.map(u => escapeHtml(u)).join('\n')}</div>`;
  } else if (input.raw) {
    // Try to show structured if it's JSON
    let display = input.raw;
    try {
      const parsed = JSON.parse(input.raw);
      display = JSON.stringify(parsed, null, 2);
    } catch {}
    inputHtml = `<div class="tool-cmd">${escapeHtml(display.slice(0, 2000))}</div>`;
  }

  // Subagent info
  if (event.subagent) {
    const sa = event.subagent;
    const agentLabel = sa.agent_name ? `Agent: ${escapeHtml(sa.agent_name)}` : '';
    if (agentLabel) {
      inputHtml = `<div style="font-size:11px;color:var(--text-muted);margin-bottom:4px">${agentLabel}</div>` + inputHtml;
    }
    if (sa.prompt) {
      inputHtml += `<div style="font-size:11px;color:var(--text-muted);margin:8px 0 4px">Prompt:</div><div class="tool-cmd">${escapeHtml(sa.prompt.slice(0, 2000))}</div>`;
    }
  }

  // Build output HTML
  let outputHtml = '';
  const output = event.output || {};
  if (output.error) {
    outputHtml = `<div class="tool-exec-result exec-fail">❌ ${escapeHtml(output.error)}</div>`;
  }
  if (output.text) {
    const exitBadge = output.exit_code != null
      ? (output.exit_code === 0 ? '<span class="tool-status-ok">✅ exit 0</span>' : `<span class="tool-status-fail">exit ${output.exit_code}</span>`)
      : '';
    outputHtml += `<div style="font-size:11px;color:var(--text-muted);margin:8px 0 4px">Output: ${exitBadge}</div><div class="tool-output">${escapeHtml(output.text.slice(0, 3000))}</div>`;
  } else if (output.exit_code != null) {
    const ok = output.exit_code === 0;
    outputHtml += `<div class="tool-exec-result ${ok ? 'exec-ok' : 'exec-fail'}">${ok ? '✅' : '❌'} exit ${output.exit_code}</div>`;
  }
  if (output.urls && output.urls.length) {
    outputHtml += `<div style="font-size:11px;color:var(--text-muted);margin:8px 0 4px">URLs:</div><div class="tool-output">${output.urls.map(u => escapeHtml(u)).join('\n')}</div>`;
  }
  if (event.subagent?.result) {
    const resultStr = typeof event.subagent.result === 'string' ? event.subagent.result : JSON.stringify(event.subagent.result, null, 2);
    outputHtml += `<div style="font-size:11px;color:var(--text-muted);margin:8px 0 4px">Result:</div><div class="tool-output">${escapeHtml(resultStr.slice(0, 3000))}</div>`;
  }

  // Duration
  const durStr = event.duration_ms ? `${(event.duration_ms / 1000).toFixed(1)}s · ` : '';

  const id = genId();
  block.innerHTML = `
    <div class="msg-label collapse-toggle" data-target="${id}">
      🔧 ${escapeHtml(toolId)} ${badge}
      <span style="font-weight:400;font-size:10px;color:var(--text-muted);margin-left:auto">${durStr}${formatTimeBrief(ts)}</span>
    </div>
    <div class="collapsible-content open" id="${id}">
      <div class="tool-detail">
        ${inputHtml}
        ${outputHtml}
      </div>
    </div>
  `;

  setupCollapse(block);
  conversation.appendChild(block);
}

// ── Thinking ─────────────────────────────────────────────

function renderThinking(conversation, event) {
  const content = event.content || '';
  if (!content.trim() && !event.encrypted) return;

  const block = document.createElement('div');
  block.className = 'msg-block msg-reasoning';
  const id = genId();
  const modelStr = event.model ? ' · ' + escapeHtml(event.model) : '';
  const displayContent = event.encrypted && !content ? '(reasoning content encrypted)' : content;

  block.innerHTML = `
    <div class="msg-label collapse-toggle" data-target="${id}">
      🧠 Thinking${modelStr}
      <span style="font-weight:400;font-size:10px;color:var(--text-muted);margin-left:auto">${formatTimeBrief(event.timestamp)}</span>
    </div>
    <div class="collapsible-content" id="${id}">
      <div class="msg-body" style="font-size:12px;opacity:0.8">${renderMarkdown(displayContent)}</div>
    </div>
  `;

  setupCollapse(block);
  conversation.appendChild(block);
}

// ── File Edit ────────────────────────────────────────────

function renderFileEdit(conversation, event) {
  const uri = (event.uri || '').replace(/^\/Users\/[^/]+/, '~');
  if (!uri) return;
  const action = event.action || 'modify';
  const icon = action === 'create' ? '📄' : action === 'delete' ? '🗑️' : '✏️';
  const div = document.createElement('div');
  div.className = 'msg-event';
  div.innerHTML = `<span class="event-pill">${icon} ${escapeHtml(action)} ${escapeHtml(uri)}</span>`;
  conversation.appendChild(div);
}

// ── Status ───────────────────────────────────────────────

function renderStatus(conversation, event) {
  const kind = event.kind || '';
  const details = event.details || {};
  const ts = event.timestamp;

  // Skip noisy events
  if (kind === 'token_count') return;

  // Turn boundaries
  if (kind === 'turn_start' || kind === 'turn_end') {
    const turnId = details.turn_id || '';
    const div = document.createElement('div');
    div.className = 'turn-boundary';
    const action = kind === 'turn_start' ? 'started' : 'ended';
    const durStr = details.duration_ms ? ` · ${(details.duration_ms / 1000).toFixed(1)}s` : '';
    div.innerHTML = `<span class="turn-marker turn-${kind === 'turn_start' ? 'start' : 'end'}">Turn ${escapeHtml(String(turnId))} ${action}${durStr} · ${formatTimeBrief(ts)}</span>`;
    conversation.appendChild(div);
    return;
  }

  // Turn aborted
  if (kind === 'turn_aborted') {
    const div = document.createElement('div');
    div.className = 'msg-block msg-action action-rejected';
    div.innerHTML = `
      <div class="msg-label"><span class="action-icon">⛔</span> Turn Aborted
        <span style="font-weight:400;font-size:10px;color:var(--text-muted);margin-left:auto">${formatTimeBrief(ts)}</span>
      </div>
      <div class="action-body">Reason: <strong>${escapeHtml(details.reason || 'unknown')}</strong></div>
    `;
    conversation.appendChild(div);
    return;
  }

  // Thread rolled back
  if (kind === 'thread_rolled_back') {
    const div = document.createElement('div');
    div.className = 'msg-block msg-action action-rollback';
    div.innerHTML = `
      <div class="msg-label"><span class="action-icon">↩️</span> Thread Rolled Back
        <span style="font-weight:400;font-size:10px;color:var(--text-muted);margin-left:auto">${formatTimeBrief(ts)}</span>
      </div>
      <div class="action-body">Rolled back <strong>${escapeHtml(String(details.num_turns || '?'))}</strong> turn(s)</div>
    `;
    conversation.appendChild(div);
    return;
  }

  // LLM request
  if (kind === 'llm_request') {
    const model = details.model || 'unknown';
    const dur = details.duration_ms ? `${details.duration_ms}ms` : '';
    const div = document.createElement('div');
    div.className = 'msg-event';
    div.innerHTML = `<span class="event-pill">LLM: ${escapeHtml(model)} · ${formatTimeBrief(ts)}${dur ? ' · ' + dur : ''}${details.input_tokens ? ' · in=' + details.input_tokens : ''}${details.output_tokens ? ' out=' + details.output_tokens : ''}${details.ttft_ms ? ' · ttft=' + details.ttft_ms + 'ms' : ''}</span>`;
    conversation.appendChild(div);
    return;
  }

  // Error
  if (kind === 'error') {
    const div = document.createElement('div');
    div.className = 'msg-block msg-tool-error';
    div.innerHTML = `<div class="msg-label">❌ Error</div><div class="msg-body">${escapeHtml(event.label || '')}</div>`;
    conversation.appendChild(div);
    return;
  }

  // Default: generic event pill
  const label = event.label || kind.replace(/_/g, ' ');
  const div = document.createElement('div');
  div.className = 'msg-event';
  div.innerHTML = `<span class="event-pill">${escapeHtml(label)} · ${formatTimeBrief(ts)}</span>`;
  conversation.appendChild(div);
}

// ── Helpers ──────────────────────────────────────────────

function addCollapsible(block, title, fullText, startClosed = false) {
  const id = genId();
  const wrapper = document.createElement('div');
  wrapper.style.padding = '0 16px 12px';
  wrapper.innerHTML = `
    <div class="collapse-toggle" data-target="${id}" style="font-size:11px;color:var(--accent);cursor:pointer;margin-top:6px">${escapeHtml(title)}</div>
    <div class="collapsible-content ${startClosed ? '' : 'open'}" id="${id}">
      <pre class="tool-cmd" style="margin-top:6px;max-height:500px">${escapeHtml(fullText)}</pre>
    </div>
  `;
  setupCollapse(wrapper);
  block.appendChild(wrapper);
}
