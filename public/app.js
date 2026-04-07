// ── State ────────────────────────────────────────────────
let sessions = [];
let currentPath = null;
let currentEntries = null;
let currentMeta = null;
let activeSourceFilters = new Set(); // empty = show all

// ── DOM refs ─────────────────────────────────────────────
const sessionListEl = document.getElementById('sessionList');
const searchBox = document.getElementById('searchBox');
const refreshBtn = document.getElementById('refreshBtn');
const placeholder = document.getElementById('placeholder');
const sessionDetail = document.getElementById('sessionDetail');
const sessionHeader = document.getElementById('sessionHeader');
const conversation = document.getElementById('conversation');
const exportBar = document.getElementById('exportBar');
const exportCfgBtn = document.getElementById('exportCfgBtn');
const exportPanel = document.getElementById('exportPanel');
const exportMdBtn = document.getElementById('exportMd');
const exportTxtBtn = document.getElementById('exportTxt');
const sourceChipsEl = document.getElementById('sourceChips');

// ── Fetch helpers ────────────────────────────────────────
async function fetchSessions() {
  const res = await fetch('/api/sessions');
  sessions = await res.json();
  renderSourceChips();
  renderSessionList();
}

async function fetchSession(filePath) {
  const res = await fetch(`/api/session?path=${encodeURIComponent(filePath)}`);
  return await res.json();
}

// ── Render source filter chips ───────────────────────────
const SOURCE_LABELS = {
  'vscode': 'Codex (VS Code)',
  'codex': 'Codex (CLI)',
  'codex_vscode': 'Codex (VS Code)',
  'vscode-insiders': 'VS Code Insiders',
  'vscode-stable': 'VS Code',
};
const SOURCE_COLORS = {
  'vscode': '#58a6ff',
  'codex': '#58a6ff',
  'codex_vscode': '#58a6ff',
  'vscode-insiders': '#3fb950',
  'vscode-stable': '#d29922',
};

function getSourceKey(s) {
  return s.source_key || s.source || s.originator || 'codex';
}

function renderSourceChips() {
  const sources = new Map();
  for (const s of sessions) {
    const key = getSourceKey(s);
    if (!sources.has(key)) {
      sources.set(key, 0);
    }
    sources.set(key, sources.get(key) + 1);
  }

  sourceChipsEl.innerHTML = '';

  // "All" chip
  const allChip = document.createElement('button');
  allChip.className = 'filter-chip' + (activeSourceFilters.size === 0 ? ' active' : '');
  allChip.textContent = `All (${sessions.length})`;
  allChip.addEventListener('click', () => {
    activeSourceFilters.clear();
    renderSourceChips();
    renderSessionList(searchBox.value);
  });
  sourceChipsEl.appendChild(allChip);

  for (const [key, count] of sources) {
    const chip = document.createElement('button');
    const isActive = activeSourceFilters.has(key);
    chip.className = 'filter-chip' + (isActive ? ' active' : '');
    const color = SOURCE_COLORS[key] || '#8b949e';
    chip.style.setProperty('--chip-color', color);
    chip.innerHTML = `<span class="chip-dot" style="background:${color}"></span>${escapeHtml(SOURCE_LABELS[key] || key)} (${count})`;
    chip.addEventListener('click', () => {
      if (activeSourceFilters.has(key)) {
        activeSourceFilters.delete(key);
      } else {
        activeSourceFilters.add(key);
      }
      renderSourceChips();
      renderSessionList(searchBox.value);
    });
    sourceChipsEl.appendChild(chip);
  }
}

// ── Render session list ──────────────────────────────────
function renderSessionList(filter = '') {
  const q = filter.toLowerCase();
  sessionListEl.innerHTML = '';

  for (const s of sessions) {
    const searchable = `${s.id} ${s.cwd || ''} ${s.timestamp || ''} ${s.model_provider || ''} ${s.cli_version || ''} ${s.source || ''} ${s.source_key || ''}`.toLowerCase();
    if (q && !searchable.includes(q)) continue;

    // Source filter
    const srcKey = getSourceKey(s);
    if (activeSourceFilters.size > 0 && !activeSourceFilters.has(srcKey)) continue;

    const li = document.createElement('li');
    if (s.filePath === currentPath) li.classList.add('active');

    const ts = s.timestamp ? formatTime(s.timestamp) : 'Unknown time';
    const shortCwd = s.cwd ? s.cwd.replace(/^\/Users\/[^/]+/, '~') : '';

    // Source badge
    const srcLabel = SOURCE_LABELS[srcKey] || srcKey;
    const srcColor = SOURCE_COLORS[srcKey] || '#8b949e';
    let badge = '';
    if (s.archived) {
      badge = '<span class="session-item-badge badge-archived">archived</span>';
    }
    const sourceBadge = `<span class="session-item-badge" style="background:${srcColor}22;color:${srcColor}">${escapeHtml(srcLabel)}</span>`;

    li.innerHTML = `
      <div class="session-item-time">${ts} ${sourceBadge}${badge}</div>
      <div class="session-item-cwd">${escapeHtml(shortCwd)}</div>
      <div class="session-item-id">${s.id}</div>
    `;

    li.addEventListener('click', () => openSession(s));
    sessionListEl.appendChild(li);
  }
}

// ── Open session detail ──────────────────────────────────
async function openSession(s) {
  currentPath = s.filePath;
  renderSessionList(searchBox.value);

  placeholder.classList.add('hidden');
  sessionDetail.classList.remove('hidden');

  conversation.innerHTML = '<div class="loading"><div class="spinner"></div>Loading session…</div>';
  sessionHeader.innerHTML = '';

  const entries = await fetchSession(s.filePath);
  currentEntries = entries;
  currentMeta = s;
  exportBar.classList.remove('hidden');
  renderSessionDetail(entries, s);
}

function renderSessionDetail(entries, meta) {
  // Header
  const srcKey = getSourceKey(meta);
  const srcLabel = SOURCE_LABELS[srcKey] || srcKey;
  sessionHeader.innerHTML = `
    <span class="meta-chip"><strong>ID</strong> ${meta.id}</span>
    <span class="meta-chip"><strong>Time</strong> ${formatTime(meta.timestamp)}</span>
    <span class="meta-chip"><strong>Model</strong> ${escapeHtml(meta.model_provider || 'unknown')}</span>
    <span class="meta-chip"><strong>Source</strong> ${escapeHtml(srcLabel)}</span>
    <span class="meta-chip"><strong>CWD</strong> ${escapeHtml((meta.cwd || '').replace(/^\/Users\/[^/]+/, '~'))}</span>
    ${meta.cli_version && meta.cli_version !== srcLabel ? `<span class="meta-chip"><strong>CLI</strong> ${escapeHtml(meta.cli_version)}</span>` : ''}
  `;

  conversation.innerHTML = '';

  // Detect format
  const isVSCodeFormat = meta.format === 'vscode-copilot';

  if (isVSCodeFormat) {
    renderVSCodeSession(entries);
  } else {
    renderCodexSession(entries);
  }
}

// ── Render Codex-format session ──────────────────────────
function renderCodexSession(entries) {
  // Collect function_call entries keyed by call_id for pairing
  const callMap = new Map();
  // Collect exec_command_end and patch_apply_end keyed by call_id
  const execEndMap = new Map();
  const patchEndMap = new Map();
  for (const entry of entries) {
    if (entry.type === 'response_item') {
      const p = entry.payload;
      if (p.type === 'function_call') {
        callMap.set(p.call_id, { call: p, output: null });
      } else if (p.type === 'function_call_output') {
        const existing = callMap.get(p.call_id);
        if (existing) existing.output = p;
        else callMap.set(p.call_id, { call: null, output: p });
      }
    } else if (entry.type === 'event_msg') {
      const p = entry.payload;
      if (p.type === 'exec_command_end') {
        execEndMap.set(p.call_id, p);
      } else if (p.type === 'patch_apply_end') {
        patchEndMap.set(p.call_id, p);
      }
    }
  }

  const rendered = new Set();

  for (const entry of entries) {
    const ts = entry.timestamp;

    if (entry.type === 'turn_context') {
      renderTurnContext(entry.payload, ts);
    } else if (entry.type === 'response_item') {
      const p = entry.payload;

      if (p.type === 'message') {
        renderMessage(p, ts);
      } else if (p.type === 'function_call') {
        if (rendered.has(p.call_id)) continue;
        rendered.add(p.call_id);
        const pair = callMap.get(p.call_id);
        const execEnd = execEndMap.get(p.call_id);
        const patchEnd = patchEndMap.get(p.call_id);
        renderToolCall(pair, ts, execEnd, patchEnd);
      } else if (p.type === 'function_call_output') {
        if (rendered.has(p.call_id)) continue;
        rendered.add(p.call_id);
        renderToolCall({ call: null, output: p }, ts);
      } else if (p.type === 'custom_tool_call') {
        if (rendered.has(p.call_id)) continue;
        rendered.add(p.call_id);
        renderCustomToolCall(p, ts, patchEndMap.get(p.call_id));
      } else if (p.type === 'custom_tool_call_output') {
        // rendered with its call
      } else if (p.type === 'reasoning') {
        renderReasoning(p, ts);
      }
    } else if (entry.type === 'event_msg') {
      renderEvent(entry.payload, ts);
    }
  }
}

// ── Render VS Code Copilot-format session ────────────────
function renderVSCodeSession(entries) {
  for (const entry of entries) {
    const ts = entry.ts ? new Date(entry.ts).toISOString() : '';

    if (entry.type === 'session_start') {
      renderVSCodeSessionStart(entry, ts);
    } else if (entry.type === 'user_message') {
      renderVSCodeUserMessage(entry, ts);
    } else if (entry.type === 'turn_start') {
      renderVSCodeTurnBoundary(entry, ts, 'start');
    } else if (entry.type === 'turn_end') {
      renderVSCodeTurnBoundary(entry, ts, 'end');
    } else if (entry.type === 'discovery') {
      renderVSCodeDiscovery(entry, ts);
    } else if (entry.type === 'tool_call') {
      renderVSCodeToolCall(entry, ts);
    } else if (entry.type === 'llm_request') {
      renderVSCodeLLMRequest(entry, ts);
    } else if (entry.type === 'agent_response') {
      renderVSCodeAgentResponse(entry, ts);
    }
  }
}

function renderVSCodeSessionStart(entry, ts) {
  const attrs = entry.attrs || {};
  const div = document.createElement('div');
  div.className = 'msg-event';
  div.innerHTML = `<span class="event-pill session-start-pill">Session started · Copilot ${escapeHtml(attrs.copilotVersion || '?')} · VS Code ${escapeHtml(attrs.vscodeVersion || '?')} · ${formatTimeBrief(ts)}</span>`;
  conversation.appendChild(div);
}

function renderVSCodeUserMessage(entry, ts) {
  const text = entry.attrs && entry.attrs.content ? entry.attrs.content : '';
  if (!text) return;
  const block = createBlock('msg-user', 'USER', ts);
  const bodyEl = block.querySelector('.msg-body');
  bodyEl.innerHTML = renderMarkdown(text);
  conversation.appendChild(block);
}

function renderVSCodeTurnBoundary(entry, ts, kind) {
  const turnId = entry.attrs && entry.attrs.turnId != null ? entry.attrs.turnId : '?';
  const div = document.createElement('div');
  div.className = 'turn-boundary';
  if (kind === 'start') {
    div.innerHTML = `<span class="turn-marker turn-start">Turn ${escapeHtml(String(turnId))} started · ${formatTimeBrief(ts)}</span>`;
  } else {
    div.innerHTML = `<span class="turn-marker turn-end">Turn ${escapeHtml(String(turnId))} ended · ${formatTimeBrief(ts)}</span>`;
  }
  conversation.appendChild(div);
}

function renderVSCodeDiscovery(entry, ts) {
  const div = document.createElement('div');
  div.className = 'msg-event';
  const details = entry.attrs && entry.attrs.details ? entry.attrs.details : '';
  const shortDetails = details.length > 120 ? details.slice(0, 120) + '...' : details;
  div.innerHTML = `<span class="event-pill">${escapeHtml(entry.name || 'discovery')} · ${formatTimeBrief(ts)}</span>`;
  if (shortDetails) {
    const detailEl = document.createElement('div');
    detailEl.className = 'discovery-detail';
    detailEl.textContent = shortDetails;
    div.appendChild(detailEl);
  }
  conversation.appendChild(div);
}

function renderVSCodeToolCall(entry, ts) {
  const block = document.createElement('div');
  const isError = entry.status === 'error';
  block.className = 'msg-block ' + (isError ? 'msg-tool-error' : 'msg-tool');

  const name = entry.name || 'unknown_tool';
  const status = entry.status || '';
  const dur = entry.dur != null ? `${entry.dur}ms` : '';
  let args = '';
  let result = '';
  let errorMsg = '';
  if (entry.attrs) {
    if (entry.attrs.args) {
      try {
        const parsed = JSON.parse(entry.attrs.args);
        args = JSON.stringify(parsed, null, 2);
      } catch {
        args = entry.attrs.args;
      }
    }
    if (entry.attrs.result) {
      result = typeof entry.attrs.result === 'string' ? entry.attrs.result : JSON.stringify(entry.attrs.result, null, 2);
    }
    if (entry.attrs.error) {
      errorMsg = entry.attrs.error;
    }
  }

  const id = genId();
  const statusBadge = status === 'ok'
    ? '<span class="tool-status-ok">✅ OK</span>'
    : status === 'error' ? `<span class="tool-status-fail">❌ Error</span>` : '';

  // Error display
  let errorHtml = '';
  if (errorMsg) {
    errorHtml = `<div class="tool-exec-result exec-fail" style="margin-top:8px">❌ ${escapeHtml(errorMsg)}</div>`;
  }

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

function renderVSCodeLLMRequest(entry, ts) {
  const attrs = entry.attrs || {};
  const model = attrs.model || 'unknown';
  const inputTokens = attrs.inputTokens || '';
  const outputTokens = attrs.outputTokens || '';
  const ttft = attrs.ttft != null ? `${attrs.ttft}ms` : '';
  const dur = entry.dur != null ? `${entry.dur}ms` : '';

  const div = document.createElement('div');
  div.className = 'msg-event';
  div.innerHTML = `<span class="event-pill">LLM: ${escapeHtml(model)} · ${formatTimeBrief(ts)}${dur ? ' · ' + dur : ''}${inputTokens ? ' · in=' + inputTokens : ''}${outputTokens ? ' out=' + outputTokens : ''}${ttft ? ' · ttft=' + ttft : ''}</span>`;
  conversation.appendChild(div);
}

function renderVSCodeAgentResponse(entry, ts) {
  const attrs = entry.attrs || {};
  let responseText = '';
  if (attrs.response) {
    try {
      const parsed = JSON.parse(attrs.response);
      if (Array.isArray(parsed)) {
        for (const msg of parsed) {
          if (msg.parts) {
            for (const part of msg.parts) {
              if (part.type === 'text' && part.content) {
                responseText += part.content + '\n';
              }
            }
          }
        }
      }
    } catch {
      responseText = attrs.response;
    }
  }

  if (!responseText.trim()) return;

  const block = createBlock('msg-assistant', 'ASSISTANT', ts);
  const bodyEl = block.querySelector('.msg-body');
  bodyEl.innerHTML = renderMarkdown(responseText.trim());
  conversation.appendChild(block);
}

// ── Render individual blocks ─────────────────────────────

function renderMessage(payload, ts) {
  const role = payload.role || 'unknown';
  if (role === 'developer') {
    // System/developer messages — show collapsed
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

  if (role === 'assistant') {
    bodyEl.innerHTML = renderMarkdown(text);
  } else {
    bodyEl.innerHTML = renderMarkdown(text);
  }
  conversation.appendChild(block);
}

function renderToolCall(pair, ts, execEnd, patchEnd) {
  const block = document.createElement('div');
  block.className = 'msg-block msg-tool';

  const call = pair?.call;
  const output = pair?.output;

  let name = call?.name || 'unknown_tool';
  let args = '';
  if (call?.arguments) {
    try {
      const parsed = JSON.parse(call.arguments);
      if (parsed.cmd) {
        args = parsed.cmd;
      } else {
        args = JSON.stringify(parsed, null, 2);
      }
    } catch {
      args = call.arguments;
    }
  }

  // Build exec/patch result HTML
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
      if (patchEnd.stdout) {
        execHtml += `<div class="tool-cmd" style="margin-top:4px;font-size:11px">${escapeHtml(patchEnd.stdout)}</div>`;
      }
    } else {
      execHtml += `<div class="tool-exec-result exec-fail">❌ Patch failed</div>`;
      if (patchEnd.stderr) {
        execHtml += `<div class="tool-cmd" style="margin-top:4px;color:var(--red)">${escapeHtml(patchEnd.stderr)}</div>`;
      }
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

function renderReasoning(payload, ts) {
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

function renderEvent(payload, ts) {
  const etype = payload.type;

  // Skip token_count events (too noisy), or render them as token info
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

  // Turn aborted — prominent display
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

  // Thread rolled back
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

  // exec_command_end — show as inline status (already paired with tool call, skip here)
  if (etype === 'exec_command_end' || etype === 'patch_apply_end') {
    return;
  }

  // Agent reasoning
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

  // Agent message (commentary)
  if (etype === 'agent_message') {
    const text = payload.message || '';
    if (!text) return;
    const phase = payload.phase || '';
    const label = phase === 'commentary' ? 'ASSISTANT (commentary)' : 'ASSISTANT';
    const block = createBlock('msg-assistant', label, ts);
    const bodyEl = block.querySelector('.msg-body');
    bodyEl.innerHTML = renderMarkdown(text);
    conversation.appendChild(block);
    return;
  }

  // User message
  if (etype === 'user_message') {
    const text = payload.message || '';
    if (!text) return;
    const block = createBlock('msg-user', 'USER', ts);
    const bodyEl = block.querySelector('.msg-body');
    bodyEl.innerHTML = renderMarkdown(text);
    conversation.appendChild(block);
    return;
  }

  // Task started — show collaboration mode
  if (etype === 'task_started') {
    const mode = payload.collaboration_mode_kind || '';
    const div = document.createElement('div');
    div.className = 'msg-event';
    div.innerHTML = `<span class="event-pill task-start-pill">Task started${mode ? ' · mode: ' + escapeHtml(mode) : ''} · ${formatTimeBrief(ts)}</span>`;
    conversation.appendChild(div);
    return;
  }

  // Task complete
  if (etype === 'task_complete') {
    const div = document.createElement('div');
    div.className = 'msg-event';
    div.innerHTML = `<span class="event-pill task-end-pill">Task complete · ${formatTimeBrief(ts)}</span>`;
    conversation.appendChild(div);
    return;
  }

  // Context compacted
  if (etype === 'context_compacted') {
    const div = document.createElement('div');
    div.className = 'msg-event';
    div.innerHTML = `<span class="event-pill">Context compacted · ${formatTimeBrief(ts)}</span>`;
    conversation.appendChild(div);
    return;
  }

  // Default fallback
  const div = document.createElement('div');
  div.className = 'msg-event';
  const label = etype.replace(/_/g, ' ');
  div.innerHTML = `<span class="event-pill">${escapeHtml(label)} · ${formatTimeBrief(ts)}</span>`;
  conversation.appendChild(div);
}

// ── Utilities ────────────────────────────────────────────

function renderTurnContext(payload, ts) {
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

function renderCustomToolCall(payload, ts, patchEnd) {
  const block = document.createElement('div');
  block.className = 'msg-block msg-tool';

  const name = payload.name || 'unknown_tool';
  const status = payload.status || '';
  const input = payload.input || '';

  // Status badge
  let statusHtml = '';
  if (status === 'completed') {
    statusHtml = '<span class="tool-status-ok">✅ completed</span>';
  } else if (status) {
    statusHtml = `<span class="tool-status-fail">❌ ${escapeHtml(status)}</span>`;
  }

  // Patch result
  let patchHtml = '';
  if (patchEnd) {
    if (patchEnd.success) {
      patchHtml = `<div class="tool-exec-result exec-ok">✅ Patch applied successfully</div>`;
      if (patchEnd.stdout) {
        patchHtml += `<div class="tool-cmd" style="margin-top:4px;font-size:11px">${escapeHtml(patchEnd.stdout)}</div>`;
      }
    } else {
      patchHtml = `<div class="tool-exec-result exec-fail">❌ Patch failed</div>`;
      if (patchEnd.stderr) {
        patchHtml += `<div class="tool-cmd" style="margin-top:4px;color:var(--red)">${escapeHtml(patchEnd.stderr)}</div>`;
      }
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

  if (input.length > 200) {
    addCollapsible(block, 'Full patch content', input, true);
  }

  setupCollapse(block);
  conversation.appendChild(block);
}

function extractText(content) {
  if (!content) return '';
  if (typeof content === 'string') return content;
  if (Array.isArray(content)) {
    return content
      .filter(c => c.type === 'input_text' || c.type === 'output_text' || c.type === 'text')
      .map(c => c.text || '')
      .join('\n');
  }
  return '';
}

function createBlock(cssClass, label, ts) {
  const block = document.createElement('div');
  block.className = `msg-block ${cssClass}`;
  block.innerHTML = `
    <div class="msg-label">
      ${escapeHtml(label)}
      <span style="font-weight:400;font-size:10px;color:var(--text-muted);margin-left:auto">${formatTimeBrief(ts)}</span>
    </div>
    <div class="msg-body"></div>
  `;
  return block;
}

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

function setupCollapse(container) {
  for (const toggle of container.querySelectorAll('.collapse-toggle')) {
    toggle.addEventListener('click', () => {
      const target = document.getElementById(toggle.dataset.target);
      if (target) {
        target.classList.toggle('open');
        toggle.classList.toggle('open');
      }
    });
  }
}

function renderMarkdown(text) {
  if (typeof marked !== 'undefined' && marked.parse) {
    return marked.parse(text, { breaks: true });
  }
  return escapeHtml(text).replace(/\n/g, '<br>');
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function formatTime(ts) {
  if (!ts) return '';
  try {
    const d = new Date(ts);
    return d.toLocaleString('zh-CN', {
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', second: '2-digit',
      hour12: false,
    });
  } catch { return ts; }
}

function formatTimeBrief(ts) {
  if (!ts) return '';
  try {
    const d = new Date(ts);
    return d.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
  } catch { return ''; }
}

let idCounter = 0;
function genId() {
  return `coll-${++idCounter}`;
}

// ── Export ───────────────────────────────────────────────

function getExportConfig() {
  return {
    userMsg:      document.getElementById('expUserMsg').checked,
    assistantMsg: document.getElementById('expAssistantMsg').checked,
    toolCalls:    document.getElementById('expToolCalls').checked,
    toolOutput:   document.getElementById('expToolOutput').checked,
    reasoning:    document.getElementById('expReasoning').checked,
    systemPrompt: document.getElementById('expSystemPrompt').checked,
    events:       document.getElementById('expEvents').checked,
    timestamps:   document.getElementById('expTimestamps').checked,
  };
}

function entriesToText(entries, meta, format) {
  const cfg = getExportConfig();
  const lines = [];
  const isMd = format === 'md';
  const divider = isMd ? '\n---\n' : '\n' + '─'.repeat(60) + '\n';

  // Header
  if (isMd) {
    lines.push(`# Chat Cabinet Session ${meta.id}\n`);
    lines.push(`- **Time:** ${formatTime(meta.timestamp)}`);
    lines.push(`- **Model:** ${meta.model_provider || 'unknown'}`);
    lines.push(`- **CLI:** ${meta.cli_version || '?'}`);
    lines.push(`- **CWD:** ${meta.cwd || '?'}`);
    lines.push(`- **Source:** ${meta.source || meta.originator || '?'}`);
  } else {
    lines.push(`Chat Cabinet Session ${meta.id}`);
    lines.push(`Time:   ${formatTime(meta.timestamp)}`);
    lines.push(`Model:  ${meta.model_provider || 'unknown'}`);
    lines.push(`CLI:    ${meta.cli_version || '?'}`);
    lines.push(`CWD:    ${meta.cwd || '?'}`);
    lines.push(`Source: ${meta.source || meta.originator || '?'}`);
  }
  lines.push(divider);

  // Pair function calls
  const callMap = new Map();
  for (const entry of entries) {
    if (entry.type === 'response_item') {
      const p = entry.payload;
      if (p.type === 'function_call') callMap.set(p.call_id, { call: p, output: null });
      else if (p.type === 'function_call_output') {
        const ex = callMap.get(p.call_id);
        if (ex) ex.output = p;
        else callMap.set(p.call_id, { call: null, output: p });
      }
    }
  }

  const rendered = new Set();

  for (const entry of entries) {
    if (entry.type === 'response_item') {
      const p = entry.payload;

      if (p.type === 'message') {
        const role = p.role || 'unknown';
        const text = extractText(p.content);
        if (!text) continue;
        if (role === 'developer') {
          if (!cfg.systemPrompt) continue;
          if (isMd) lines.push(`### SYSTEM\n\n${text}\n`);
          else lines.push(`[SYSTEM]\n${text}\n`);
          continue;
        }
        if (role === 'user' && !cfg.userMsg) continue;
        if (role === 'assistant' && !cfg.assistantMsg) continue;
        const label = role.toUpperCase();
        const tsStr = cfg.timestamps ? formatTimeBrief(entry.timestamp) : '';
        if (isMd) {
          lines.push(`### ${label}` + (tsStr ? `  \n*${tsStr}*` : '') + '\n');
          lines.push(text);
        } else {
          lines.push(`[${label}]` + (tsStr ? ` (${tsStr})` : ''));
          lines.push(text);
        }
        lines.push('');

      } else if (p.type === 'function_call') {
        if (!cfg.toolCalls) continue;
        if (rendered.has(p.call_id)) continue;
        rendered.add(p.call_id);
        const pair = callMap.get(p.call_id);
        const call = pair?.call;
        const output = pair?.output;
        let name = call?.name || 'unknown_tool';
        let args = '';
        if (call?.arguments) {
          try {
            const parsed = JSON.parse(call.arguments);
            args = parsed.cmd || JSON.stringify(parsed, null, 2);
          } catch { args = call.arguments; }
        }
        const tsStr = cfg.timestamps ? formatTimeBrief(entry.timestamp) : '';
        if (isMd) {
          lines.push(`#### Tool: \`${name}\`` + (tsStr ? `  \n*${tsStr}*` : '') + '\n');
          if (args) lines.push('```\n' + args + '\n```');
          if (cfg.toolOutput && output) lines.push('**Output:**\n```\n' + String(output.output || '').slice(0, 2000) + '\n```');
        } else {
          lines.push(`[TOOL: ${name}]` + (tsStr ? ` (${tsStr})` : ''));
          if (args) lines.push(args);
          if (cfg.toolOutput && output) { lines.push('Output:'); lines.push(String(output.output || '').slice(0, 2000)); }
        }
        lines.push('');

      } else if (p.type === 'function_call_output') {
        if (rendered.has(p.call_id)) continue;
        // orphan output, already covered above normally

      } else if (p.type === 'reasoning') {
        if (!cfg.reasoning) continue;
        let summary = '';
        if (p.content && Array.isArray(p.content)) {
          for (const c of p.content) {
            if (c.type === 'summary_text') summary += c.text + '\n';
          }
        }
        if (summary) {
          if (isMd) lines.push(`> *🧠 Reasoning:* ${summary.trim()}\n`);
          else lines.push(`[REASONING] ${summary.trim()}\n`);
        }
      }

    } else if (entry.type === 'event_msg') {
      if (!cfg.events) continue;
      const etype = entry.payload.type;
      if (etype === 'token_count') continue;
      const tsStr = cfg.timestamps ? ` · ${formatTimeBrief(entry.timestamp)}` : '';
      if (isMd) lines.push(`> *— ${etype.replace(/_/g, ' ')}${tsStr} —*\n`);
      else lines.push(`--- ${etype.replace(/_/g, ' ')}${tsStr} ---\n`);
    }
  }

  return lines.join('\n');
}

function downloadFile(filename, content) {
  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

exportCfgBtn.addEventListener('click', () => {
  exportPanel.classList.toggle('hidden');
});

exportMdBtn.addEventListener('click', () => {
  if (!currentEntries || !currentMeta) return;
  const text = entriesToText(currentEntries, currentMeta, 'md');
  const ts = (currentMeta.timestamp || '').replace(/[:.]/g, '-').slice(0, 19);
  downloadFile(`codex-session-${ts}.md`, text);
  exportPanel.classList.add('hidden');
});

exportTxtBtn.addEventListener('click', () => {
  if (!currentEntries || !currentMeta) return;
  const text = entriesToText(currentEntries, currentMeta, 'txt');
  const ts = (currentMeta.timestamp || '').replace(/[:.]/g, '-').slice(0, 19);
  downloadFile(`codex-session-${ts}.txt`, text);
  exportPanel.classList.add('hidden');
});

// ── Events ───────────────────────────────────────────────
searchBox.addEventListener('input', () => renderSessionList(searchBox.value));
refreshBtn.addEventListener('click', fetchSessions);

// ── Init ─────────────────────────────────────────────────
fetchSessions();
