import { formatTime, formatTimeBrief } from './format.js';
import { redact } from './redact.js';

/**
 * Apply redaction if privacy mode is active.
 */
function r(text) {
  return redact(text) || '';
}

/**
 * Convert a Chat Cabinet session to text.
 * @param {object} session - Unified session data
 * @param {object} meta - Session metadata
 * @param {string} format - 'md' or 'txt'
 * @param {object} cfg - Export config
 */
export function entriesToText(session, meta, format, cfg) {
  const lines = [];
  const isMd = format === 'md';
  const divider = isMd ? '\n---\n' : '\n' + '\u2500'.repeat(60) + '\n';

  if (cfg.metadata !== false) {
    const model = session.model?.name || session.model?.id || meta.model_provider || 'unknown';
    const cwd = r(session.workspace?.cwd || meta.cwd || '?');
    const source = session.source?.tool || meta.source || '?';
    const sid = session.session_id || meta.id;

    if (isMd) {
      lines.push('# Chat Cabinet Session ' + sid + '\n');
      lines.push('- **Time:** ' + formatTime(session.created_at || meta.timestamp));
      lines.push('- **Model:** ' + model);
      lines.push('- **CWD:** ' + cwd);
      lines.push('- **Source:** ' + source);
      if (session.title) lines.push('- **Title:** ' + r(session.title));
    } else {
      lines.push('Chat Cabinet Session ' + sid);
      lines.push('Time:   ' + formatTime(session.created_at || meta.timestamp));
      lines.push('Model:  ' + model);
      lines.push('CWD:    ' + cwd);
      lines.push('Source: ' + source);
      if (session.title) lines.push('Title:  ' + r(session.title));
    }
    lines.push(divider);
  }

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
        lines.push(r(event.content || ''));
        lines.push('');
      } else if (event.type === 'tool_call') {
        if (!cfg.toolCalls) continue;
        const name = event.tool_id || 'unknown';
        const conf = event.confirmation?.state || '';
        const confStr = conf && conf !== 'unknown' ? ' [' + conf + ']' : '';
        if (isMd) {
          lines.push('#### Tool: `' + name + '`' + confStr + (tsStr ? '  \n*' + tsStr + '*' : '') + '\n');
          if (event.input?.command) lines.push('```\n' + r(event.input.command) + '\n```');
          else if (event.input?.file_path) lines.push('File: `' + r(event.input.file_path) + '`');
          else if (event.input?.urls?.length) lines.push('URLs:\n' + event.input.urls.map(u => '- ' + r(u)).join('\n'));
          else if (event.input?.raw) lines.push('```\n' + r(event.input.raw.slice(0, 2000)) + '\n```');
          if (cfg.toolOutput && event.output?.text) lines.push('**Output:**\n```\n' + r(event.output.text.slice(0, 3000)) + '\n```');
          if (event.output?.error) lines.push('**Error:** ' + r(event.output.error));
          if (cfg.subagents && event.subagent?.prompt) lines.push('**Subagent prompt:**\n```\n' + r(event.subagent.prompt.slice(0, 2000)) + '\n```');
          if (cfg.subagents && event.subagent?.result) {
            const res = typeof event.subagent.result === 'string' ? event.subagent.result : JSON.stringify(event.subagent.result, null, 2);
            lines.push('**Subagent result:**\n```\n' + r(res.slice(0, 3000)) + '\n```');
          }
        } else {
          lines.push('[TOOL: ' + name + ']' + confStr + (tsStr ? ' (' + tsStr + ')' : ''));
          if (event.input?.command) lines.push(r(event.input.command));
          else if (event.input?.file_path) lines.push('File: ' + r(event.input.file_path));
          else if (event.input?.urls?.length) lines.push('URLs: ' + event.input.urls.map(u => r(u)).join(', '));
          else if (event.input?.raw) lines.push(r(event.input.raw.slice(0, 2000)));
          if (cfg.toolOutput && event.output?.text) { lines.push('Output:'); lines.push(r(event.output.text.slice(0, 3000))); }
          if (event.output?.error) lines.push('Error: ' + r(event.output.error));
          if (cfg.subagents && event.subagent?.prompt) { lines.push('Subagent prompt:'); lines.push(r(event.subagent.prompt.slice(0, 2000))); }
          if (cfg.subagents && event.subagent?.result) {
            const res = typeof event.subagent.result === 'string' ? event.subagent.result : JSON.stringify(event.subagent.result, null, 2);
            lines.push('Subagent result:'); lines.push(r(res.slice(0, 3000)));
          }
        }
        lines.push('');
      } else if (event.type === 'thinking') {
        if (!cfg.reasoning) continue;
        if (event.content) {
          const snippet = r(event.content.trim().slice(0, 500));
          if (isMd) lines.push('> *Thinking:* ' + snippet + '\n');
          else lines.push('[THINKING] ' + snippet + '\n');
        }
      } else if (event.type === 'file_edit') {
        if (!cfg.fileEdits) continue;
        const action = event.action || 'modify';
        const uri = r(event.uri || '');
        if (isMd) lines.push('> *File ' + action + ':* `' + uri + '`' + (tsStr ? ' \u00b7 ' + tsStr : '') + '\n');
        else lines.push('[FILE ' + action.toUpperCase() + '] ' + uri + (tsStr ? ' \u00b7 ' + tsStr : '') + '\n');
      } else if (event.type === 'status') {
        if (!cfg.events) continue;
        const label = event.label || event.kind || '';
        if (isMd) lines.push('> *' + label + (tsStr ? ' \u00b7 ' + tsStr : '') + '*\n');
        else lines.push('--- ' + label + (tsStr ? ' \u00b7 ' + tsStr : '') + ' ---\n');
      }
    }
  }

  return lines.join('\n');
}

export function downloadFile(filename, content, type = 'text/plain;charset=utf-8') {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function sessionToJson(session) {
  return JSON.stringify(session, null, 2);
}
