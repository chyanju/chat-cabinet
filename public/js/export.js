import { escapeHtml, formatTime, formatTimeBrief, extractText } from './utils.js';

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

export function entriesToText(entries, meta, format) {
  const cfg = getExportConfig();
  const lines = [];
  const isMd = format === 'md';
  const divider = isMd ? '\n---\n' : '\n' + '─'.repeat(60) + '\n';

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
          lines.push(isMd ? `### SYSTEM\n\n${text}\n` : `[SYSTEM]\n${text}\n`);
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
        if (!cfg.toolCalls || rendered.has(p.call_id)) continue;
        rendered.add(p.call_id);
        const pair = callMap.get(p.call_id);
        const call = pair?.call;
        const output = pair?.output;
        let name = call?.name || 'unknown_tool';
        let args = '';
        if (call?.arguments) {
          try { const parsed = JSON.parse(call.arguments); args = parsed.cmd || JSON.stringify(parsed, null, 2); }
          catch { args = call.arguments; }
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

      } else if (p.type === 'reasoning') {
        if (!cfg.reasoning) continue;
        let summary = '';
        if (p.content && Array.isArray(p.content)) {
          for (const c of p.content) { if (c.type === 'summary_text') summary += c.text + '\n'; }
        }
        if (summary) {
          lines.push(isMd ? `> *🧠 Reasoning:* ${summary.trim()}\n` : `[REASONING] ${summary.trim()}\n`);
        }
      }

    } else if (entry.type === 'event_msg') {
      if (!cfg.events) continue;
      const etype = entry.payload.type;
      if (etype === 'token_count') continue;
      const tsStr = cfg.timestamps ? ` · ${formatTimeBrief(entry.timestamp)}` : '';
      lines.push(isMd ? `> *— ${etype.replace(/_/g, ' ')}${tsStr} —*\n` : `--- ${etype.replace(/_/g, ' ')}${tsStr} ---\n`);
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
