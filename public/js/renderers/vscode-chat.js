import { escapeHtml, formatTimeBrief, renderMarkdown, genId, setupCollapse, createBlock } from '../utils.js';

export function renderVSCodeChatSession(conversation, entries) {
  const session = {};

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

  for (const entry of entries) {
    const { kind, k, v } = entry;
    if (kind === 0 && v && typeof v === 'object') Object.assign(session, v);
    else if (kind === 1 && Array.isArray(k) && k.length > 0) setAtPath(session, k, v);
    else if (kind === 2 && Array.isArray(k) && k.length > 0) appendAtPath(session, k, v);
  }

  // Session start pill
  const div = document.createElement('div');
  div.className = 'msg-event';
  const title = session.customTitle || '';
  div.innerHTML = `<span class="event-pill session-start-pill">Session${title ? ': ' + escapeHtml(title) : ''} · ${formatTimeBrief(session.creationDate ? new Date(session.creationDate).toISOString() : '')}</span>`;
  conversation.appendChild(div);

  // Render each request
  for (const req of (session.requests || [])) {
    if (!req || typeof req !== 'object') continue;

    const msg = req.message || {};
    const text = msg.text || '';
    const ts = req.timestamp ? new Date(req.timestamp).toISOString() : '';
    const agent = req.agent || {};
    const agentId = agent.id || '';

    if (text.trim()) {
      const label = agentId ? `USER → ${agentId.replace('github.copilot.', '')}` : 'USER';
      const block = createBlock('msg-user', label, ts);
      block.querySelector('.msg-body').innerHTML = renderMarkdown(text);
      conversation.appendChild(block);
    }

    let markdownBuffer = '';
    for (const item of (req.response || [])) {
      if (!item || typeof item !== 'object') continue;
      const ik = item.kind;

      if (ik === 'markdownContent') {
        const content = item.content || {};
        markdownBuffer += (typeof content === 'object' ? content.value : content) || '';
      } else if (ik === 'toolInvocationSerialized') {
        if (markdownBuffer.trim()) {
          const block = createBlock('msg-assistant', 'ASSISTANT', ts);
          block.querySelector('.msg-body').innerHTML = renderMarkdown(markdownBuffer);
          conversation.appendChild(block);
          markdownBuffer = '';
        }
        renderToolInvocation(conversation, item, ts);
      } else if (ik === 'thinking') {
        const thinkItems = item.value || [];
        let thinkText = '';
        if (Array.isArray(thinkItems)) {
          for (const t of thinkItems) {
            if (t && typeof t === 'object' && t.value) thinkText += t.value + '\n';
          }
        }
        if (thinkText.trim()) {
          const block = document.createElement('div');
          block.className = 'msg-block msg-reasoning';
          const id = genId();
          block.innerHTML = `
            <div class="msg-label collapse-toggle" data-target="${id}">
              🧠 Thinking
              <span style="font-weight:400;font-size:10px;color:var(--text-muted);margin-left:auto">${formatTimeBrief(ts)}</span>
            </div>
            <div class="collapsible-content" id="${id}">
              <div class="msg-body" style="font-size:12px;opacity:0.8">${renderMarkdown(thinkText)}</div>
            </div>
          `;
          setupCollapse(block);
          conversation.appendChild(block);
        }
      } else if (ik === 'textEditGroup') {
        const uri = item.uri || {};
        const filePath = (uri.path || uri.fsPath || '').replace(/^\/Users\/[^/]+/, '~');
        if (filePath) {
          const evDiv = document.createElement('div');
          evDiv.className = 'msg-event';
          evDiv.innerHTML = `<span class="event-pill">✏️ Edited ${escapeHtml(filePath)}</span>`;
          conversation.appendChild(evDiv);
        }
      } else if (ik === 'progressTaskSerialized') {
        const label = item.title || item.content || '';
        if (label) {
          const evDiv = document.createElement('div');
          evDiv.className = 'msg-event';
          evDiv.innerHTML = `<span class="event-pill">⏳ ${escapeHtml(label)}</span>`;
          conversation.appendChild(evDiv);
        }
      }
    }

    if (markdownBuffer.trim()) {
      const block = createBlock('msg-assistant', 'ASSISTANT', ts);
      block.querySelector('.msg-body').innerHTML = renderMarkdown(markdownBuffer);
      conversation.appendChild(block);
    }

    const result = req.result || {};
    if (result && typeof result === 'object' && result.timings) {
      const elapsed = result.timings.totalElapsed;
      if (elapsed) {
        const evDiv = document.createElement('div');
        evDiv.className = 'msg-event';
        evDiv.innerHTML = `<span class="event-pill">⏱ Turn completed in ${(elapsed / 1000).toFixed(1)}s</span>`;
        conversation.appendChild(evDiv);
      }
    }
  }
}

function renderToolInvocation(conversation, item, ts) {
  const block = document.createElement('div');
  block.className = 'msg-block msg-tool';

  const invMsg = item.invocationMessage || {};
  const invText = (typeof invMsg === 'object' ? invMsg.value : invMsg) || '';
  const resultMsg = item.resultMessage || {};
  const resultText = (typeof resultMsg === 'object' ? resultMsg.value : resultMsg) || '';
  const toolName = item.toolId || item.name || '';
  const isConfirmed = item.isConfirmed;
  const tsd = item.toolSpecificData || {};

  let displayName = toolName;
  if (!displayName && invText) {
    const match = invText.match(/^(\w+)/);
    if (match) displayName = match[1];
  }

  // Extract rich data from toolSpecificData
  let argsHtml = '';
  let outputHtml = '';

  if (tsd.kind === 'terminal') {
    // Terminal tool: show command and output
    const cmd = tsd.commandLine || {};
    const cmdLine = (typeof cmd === 'object' ? cmd.original : cmd) || '';
    if (cmdLine) {
      argsHtml = `<div style="font-size:11px;color:var(--text-muted);margin-bottom:4px">Command:</div><div class="tool-cmd">${escapeHtml(cmdLine)}</div>`;
    }
    const termOutput = tsd.terminalCommandOutput || {};
    const outputText = (typeof termOutput === 'object' ? termOutput.text : termOutput) || '';
    const state = tsd.terminalCommandState || {};
    const exitCode = typeof state === 'object' ? state.exitCode : null;
    if (outputText) {
      const shortOut = outputText.length > 3000 ? outputText.slice(0, 3000) + '...' : outputText;
      const exitBadge = exitCode === 0 ? '<span class="tool-status-ok">✅ exit 0</span>'
        : exitCode != null ? `<span class="tool-status-fail">exit ${exitCode}</span>` : '';
      outputHtml = `<div style="font-size:11px;color:var(--text-muted);margin:8px 0 4px">Output: ${exitBadge}</div><div class="tool-output">${escapeHtml(shortOut)}</div>`;
    } else if (exitCode != null) {
      outputHtml = `<div class="tool-exec-result ${exitCode === 0 ? 'exec-ok' : 'exec-fail'}">${exitCode === 0 ? '✅' : '❌'} exit ${exitCode}</div>`;
    }
  } else if (tsd.kind === 'subagent') {
    // Subagent tool: show description, agent, prompt, result
    const desc = tsd.description || '';
    const agent = tsd.agentName || '';
    const prompt = tsd.prompt || '';
    const result = tsd.result || '';
    if (desc || agent) {
      argsHtml = `<div style="font-size:11px;color:var(--text-muted);margin-bottom:4px">${agent ? 'Agent: ' + escapeHtml(agent) : ''}${desc ? (agent ? ' · ' : '') + escapeHtml(desc) : ''}</div>`;
    }
    if (prompt) {
      argsHtml += `<div style="font-size:11px;color:var(--text-muted);margin-bottom:4px">Prompt:</div><div class="tool-cmd">${escapeHtml(prompt.slice(0, 2000))}</div>`;
    }
    if (result) {
      const resultStr = typeof result === 'string' ? result : JSON.stringify(result, null, 2);
      outputHtml = `<div style="font-size:11px;color:var(--text-muted);margin:8px 0 4px">Result:</div><div class="tool-output">${escapeHtml(resultStr.slice(0, 3000))}</div>`;
    }
  }

  // Fallback to invocationMessage / resultMessage if no toolSpecificData
  if (!argsHtml && invText) {
    argsHtml = `<div class="tool-cmd">${renderMarkdown(invText)}</div>`;
  }
  if (!outputHtml && resultText) {
    outputHtml = `<div style="font-size:11px;color:var(--text-muted);margin:8px 0 4px">Result:</div><div class="tool-output">${renderMarkdown(resultText)}</div>`;
  }

  const id = genId();
  const confirmed = typeof isConfirmed === 'object' ? isConfirmed.type : isConfirmed;
  const statusBadge = confirmed === false || confirmed === 2 ? '<span class="tool-status-fail">❌ Rejected</span>'
    : confirmed === true || confirmed === 0 ? '<span class="tool-status-ok">✅</span>' : '';

  block.innerHTML = `
    <div class="msg-label collapse-toggle" data-target="${id}">
      🔧 ${escapeHtml(displayName || 'Tool')} ${statusBadge}
      <span style="font-weight:400;font-size:10px;color:var(--text-muted);margin-left:auto">${formatTimeBrief(ts)}</span>
    </div>
    <div class="collapsible-content open" id="${id}">
      <div class="tool-detail">
        ${argsHtml}
        ${outputHtml}
      </div>
    </div>
  `;
  setupCollapse(block);
  conversation.appendChild(block);
}
