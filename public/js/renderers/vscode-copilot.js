import { escapeHtml, formatTimeBrief, renderMarkdown, genId, setupCollapse, createBlock } from '../utils.js';

export function renderVSCodeSession(conversation, entries) {
  for (const entry of entries) {
    const ts = entry.ts ? new Date(entry.ts).toISOString() : '';

    if (entry.type === 'session_start') {
      const attrs = entry.attrs || {};
      const div = document.createElement('div');
      div.className = 'msg-event';
      div.innerHTML = `<span class="event-pill session-start-pill">Session started · Copilot ${escapeHtml(attrs.copilotVersion || '?')} · VS Code ${escapeHtml(attrs.vscodeVersion || '?')} · ${formatTimeBrief(ts)}</span>`;
      conversation.appendChild(div);
    } else if (entry.type === 'user_message') {
      const text = entry.attrs && entry.attrs.content ? entry.attrs.content : '';
      if (!text) continue;
      const block = createBlock('msg-user', 'USER', ts);
      block.querySelector('.msg-body').innerHTML = renderMarkdown(text);
      conversation.appendChild(block);
    } else if (entry.type === 'turn_start' || entry.type === 'turn_end') {
      const turnId = entry.attrs && entry.attrs.turnId != null ? entry.attrs.turnId : '?';
      const kind = entry.type === 'turn_start' ? 'start' : 'end';
      const div = document.createElement('div');
      div.className = 'turn-boundary';
      div.innerHTML = `<span class="turn-marker turn-${kind}">Turn ${escapeHtml(String(turnId))} ${kind === 'start' ? 'started' : 'ended'} · ${formatTimeBrief(ts)}</span>`;
      conversation.appendChild(div);
    } else if (entry.type === 'discovery') {
      const details = entry.attrs && entry.attrs.details ? entry.attrs.details : '';
      const div = document.createElement('div');
      div.className = 'msg-event';
      div.innerHTML = `<span class="event-pill">${escapeHtml(entry.name || 'discovery')} · ${formatTimeBrief(ts)}</span>`;
      if (details) {
        const detailEl = document.createElement('div');
        detailEl.className = 'discovery-detail';
        detailEl.textContent = details.length > 120 ? details.slice(0, 120) + '...' : details;
        div.appendChild(detailEl);
      }
      conversation.appendChild(div);
    } else if (entry.type === 'tool_call') {
      renderVSCodeToolCall(conversation, entry, ts);
    } else if (entry.type === 'llm_request') {
      const attrs = entry.attrs || {};
      const model = attrs.model || 'unknown';
      const dur = entry.dur != null ? `${entry.dur}ms` : '';
      const div = document.createElement('div');
      div.className = 'msg-event';
      div.innerHTML = `<span class="event-pill">LLM: ${escapeHtml(model)} · ${formatTimeBrief(ts)}${dur ? ' · ' + dur : ''}${attrs.inputTokens ? ' · in=' + attrs.inputTokens : ''}${attrs.outputTokens ? ' out=' + attrs.outputTokens : ''}${attrs.ttft != null ? ' · ttft=' + attrs.ttft + 'ms' : ''}</span>`;
      conversation.appendChild(div);
    } else if (entry.type === 'agent_response') {
      const attrs = entry.attrs || {};
      let responseText = '';
      if (attrs.response) {
        try {
          const parsed = JSON.parse(attrs.response);
          if (Array.isArray(parsed)) {
            for (const msg of parsed) {
              if (msg.parts) {
                for (const part of msg.parts) {
                  if (part.type === 'text' && part.content) responseText += part.content + '\n';
                }
              }
            }
          }
        } catch { responseText = attrs.response; }
      }
      if (!responseText.trim()) continue;
      const block = createBlock('msg-assistant', 'ASSISTANT', ts);
      block.querySelector('.msg-body').innerHTML = renderMarkdown(responseText.trim());
      conversation.appendChild(block);
    }
  }
}

function renderVSCodeToolCall(conversation, entry, ts) {
  const block = document.createElement('div');
  const isError = entry.status === 'error';
  block.className = 'msg-block ' + (isError ? 'msg-tool-error' : 'msg-tool');

  const name = entry.name || 'unknown_tool';
  const status = entry.status || '';
  const dur = entry.dur != null ? `${entry.dur}ms` : '';
  let args = '', result = '', errorMsg = '';
  if (entry.attrs) {
    if (entry.attrs.args) {
      try { args = JSON.stringify(JSON.parse(entry.attrs.args), null, 2); } catch { args = entry.attrs.args; }
    }
    if (entry.attrs.result) result = typeof entry.attrs.result === 'string' ? entry.attrs.result : JSON.stringify(entry.attrs.result, null, 2);
    if (entry.attrs.error) errorMsg = entry.attrs.error;
  }

  const id = genId();
  const statusBadge = status === 'ok' ? '<span class="tool-status-ok">✅ OK</span>' : status === 'error' ? '<span class="tool-status-fail">❌ Error</span>' : '';
  let errorHtml = errorMsg ? `<div class="tool-exec-result exec-fail" style="margin-top:8px">❌ ${escapeHtml(errorMsg)}</div>` : '';

  block.innerHTML = `
    <div class="msg-label collapse-toggle" data-target="${id}">
      🔧 ${escapeHtml(name)} ${statusBadge}
      <span style="font-weight:400;font-size:10px;color:var(--text-muted);margin-left:auto">${dur ? dur + ' · ' : ''}${formatTimeBrief(ts)}</span>
    </div>
    <div class="collapsible-content open" id="${id}">
      <div class="tool-detail">
        ${args ? `<div style="font-size:11px;color:var(--text-muted);margin-bottom:4px">Arguments:</div><div class="tool-cmd">${escapeHtml(args)}</div>` : ''}
        ${errorHtml}
        ${result && !errorMsg ? `<div style="font-size:11px;color:var(--text-muted);margin:8px 0 4px">Result:</div><div class="tool-output">${escapeHtml(result.slice(0, 3000))}</div>` : ''}
      </div>
    </div>
  `;
  setupCollapse(block);
  conversation.appendChild(block);
}
