import { formatTime, formatTimeBrief } from './utils.js';

export function getExportConfig() {
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

/**
 * Export a Chat Cabinet unified session to text.
 */
export function entriesToText(session, meta, format) {
  const cfg = getExportConfig();
  const lines = [];
  const isMd = format === 'md';
  const divider = isMd ? '\n---\n' : '\n' + String.fromCharCode(9472).repeat(60) + '\n';

  const model = session.model?.name || session.model?.id || meta.model_provider || 'unknown';
  const cwd = session.workspace?.cwd || meta.cwd || '?';
  const source = session.source?.tool || meta.source || '?';
  const sid = session.session_id || meta.id;

  if (isMd) {
    lines.push('# Chat Cabinet Session ' + sid + '\n');
    lines.push('- **Time:** ' + formatTime(session.created_at || meta.timestamp));
    lines.push('- **Model:** ' + model);
    lines.push('- **CWD:** ' + cwd);
    lines.push('- **Source:** ' + source);
    if (session.title) lines.push('- **Title:** ' + session.title);
  } else {
    lines.push('Chat Cabinet Session ' + sid);
    lines.push('Time:   ' + formatTime(session.created_at || meta.timestamp));
    lines.push('Model:  ' + model);
    lines.push('CWD:    ' + cwd);
    lines.push('Source: ' + source);
    if (session.title) lines.push('Title:  ' + session.title);
  }
  lines.push(divider);

  for (const turn of (session.turns || [])) {
    for (const event of (turn.events || [])) {
      const tsStr = cfg.timestamps ? formatTimeBrief(event.timestamp) : '';

      if (event.type === 'message') {
        const role = event.role || 'unknown';
        if (role === 'system' && !cfg.systemPrompt) continue;
        if (role === 'user' && !cfg.userMsg) continue;
        if (role === 'assistant' && !cfg.assistantMsg) continue;
        if (event.is_command) continue;
        const label = role.toUpperCase();
        if (isMd) {
          lines.push('### ' + label + (tsStr ? '  \n*' + tsStr + '*' : '') + '\n');
        } else {
          lines.push('[' + label + ']' + (tsStr ? ' (' + tsStr + ')' : ''));
        }
        lines.push(event.content || '');
        lines.push('');
      } else if (event.type === 'tool_call') {
        if (!cfg.toolCalls) continue;
        const name = event.tool_id || 'unknown';
        const conf = event.confirmation?.state || '';
        const confStr = conf && conf !== 'unknown' ? ' [' + conf + ']' : '';
        if (isMd) {
          lines.push('#### Tool: `' + name + '`' + confStr + (tsStr ? '  \n*' + tsStr + '*' : '') + '\n');
          if (event.input?.command) lines.push('```\n' + event.input.command + '\n```');
          else if (event.input?.raw) lines.push('```\n' + event.input.raw.slice(0, 2000) + '\n```');
          if (cfg.toolOutput && event.output?.text) lines.push('**Output:**\n```\n' + event.output.text.slice(0, 2000) + '\n```');
          if (event.output?.error) lines.push('**Error:** ' + event.output.error);
        } else {
          lines.push('[TOOL: ' + name + ']' + confStr + (tsStr ? ' (' + tsStr + ')' : ''));
          if (event.input?.command) lines.push(event.input.command);
          else if (event.input?.raw) lines.push(event.input.raw.slice(0, 2000));
          if (cfg.toolOutput && event.output?.text) { lines.push('Output:'); lines.push(event.output.text.slice(0, 2000)); }
          if (event.output?.error) lines.push('Error: ' + event.output.error);
        }
        lines.push('');
      } else if (event.type === 'thinking') {
        if (!cfg.reasoning) continue;
        if (event.content) {
          const snippet = event.content.trim().slice(0, 500);
          if (isMd) lines.push('> *Thinking:* ' + snippet + '\n');
          else lines.push('[THINKING] ' + snippet + '\n');
        }
      } else if (event.type === 'status') {
        if (!cfg.events) continue;
        const label = event.label || event.kind || '';
        if (isMd) lines.push('> *' + label + (tsStr ? ' · ' + tsStr : '') + '*\n');
        else lines.push('--- ' + label + (tsStr ? ' · ' + tsStr : '') + ' ---\n');
      }
    }
  }

  return lines.join('\n');
}

export function downloadFile(filename, content) {
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

