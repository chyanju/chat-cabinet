import { escapeHtml, formatTimeBrief, renderMarkdown, createBlock } from '../utils.js';
import { renderClaudeToolUse, renderClaudeToolResult, renderThinking } from './blocks.js';

export function renderClaudeCodeSession(conversation, entries) {
  for (const entry of entries) {
    const ts = entry.timestamp || '';
    const type = entry.type;

    if (type === 'permission-mode') {
      const div = document.createElement('div');
      div.className = 'msg-event';
      div.innerHTML = `<span class="event-pill session-start-pill">Session started · Claude Code · mode: ${escapeHtml(entry.permissionMode || '?')} · ${formatTimeBrief(ts)}</span>`;
      conversation.appendChild(div);
      continue;
    }

    if (type === 'user') {
      const msg = entry.message || {};
      let content = msg.content || '';
      let text = '';
      if (typeof content === 'string') {
        text = content;
      } else if (Array.isArray(content)) {
        for (const c of content) {
          if (!c || typeof c !== 'object') continue;
          if (c.type === 'text') text += (text ? '\n' : '') + (c.text || '');
          else if (c.type === 'tool_result') renderClaudeToolResult(conversation, c, ts);
        }
      }
      if (text.trim()) {
        if (text.startsWith('<local-command-caveat>') || text.startsWith('<command-name>') || text.startsWith('<local-command-stdout>')) {
          const cleaned = text.replace(/<[^>]+>/g, '').trim();
          if (cleaned) {
            const div = document.createElement('div');
            div.className = 'msg-event';
            div.innerHTML = `<span class="event-pill">${escapeHtml(cleaned.slice(0, 120))} · ${formatTimeBrief(ts)}</span>`;
            conversation.appendChild(div);
          }
          continue;
        }
        const block = createBlock('msg-user', 'USER', ts);
        block.querySelector('.msg-body').innerHTML = renderMarkdown(text);
        conversation.appendChild(block);
      }
      continue;
    }

    if (type === 'assistant') {
      const msg = entry.message || {};
      const content = msg.content || [];
      const model = msg.model || '';

      if (Array.isArray(content)) {
        for (const c of content) {
          if (!c || typeof c !== 'object') continue;
          if (c.type === 'text') {
            const block = createBlock('msg-assistant', 'ASSISTANT', ts);
            block.querySelector('.msg-body').innerHTML = renderMarkdown(c.text || '');
            conversation.appendChild(block);
          } else if (c.type === 'thinking') {
            renderThinking(conversation, c.thinking || '', ts, model);
          } else if (c.type === 'tool_use') {
            renderClaudeToolUse(conversation, c, ts);
          }
        }
      }
      continue;
    }

    // Skip metadata entries
    if (type === 'last-prompt' || type === 'file-history-snapshot') continue;
  }
}
