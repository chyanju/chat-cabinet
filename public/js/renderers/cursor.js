import { renderMarkdown, createBlock } from '../utils.js';
import { renderClaudeToolUse, renderClaudeToolResult, renderThinking } from './blocks.js';

export function renderCursorSession(conversation, entries) {
  for (const entry of entries) {
    const role = entry.role || '';
    const msg = entry.message || {};
    const content = msg.content;

    if (role === 'user') {
      if (typeof content === 'string') {
        let text = content.replace(/<user_query>\s*/g, '').replace(/\s*<\/user_query>/g, '').trim();
        if (!text) continue;
        const block = createBlock('msg-user', 'USER', '');
        block.querySelector('.msg-body').innerHTML = renderMarkdown(text);
        conversation.appendChild(block);
      } else if (Array.isArray(content)) {
        for (const c of content) {
          if (!c || typeof c !== 'object') continue;
          if (c.type === 'text') {
            let text = (c.text || '').replace(/<user_query>\s*/g, '').replace(/\s*<\/user_query>/g, '').trim();
            if (!text) continue;
            const block = createBlock('msg-user', 'USER', '');
            block.querySelector('.msg-body').innerHTML = renderMarkdown(text);
            conversation.appendChild(block);
          } else if (c.type === 'tool_result') {
            renderClaudeToolResult(conversation, c, '');
          }
        }
      }
    } else if (role === 'assistant') {
      if (typeof content === 'string') {
        if (!content.trim()) continue;
        const block = createBlock('msg-assistant', 'ASSISTANT', '');
        block.querySelector('.msg-body').innerHTML = renderMarkdown(content);
        conversation.appendChild(block);
      } else if (Array.isArray(content)) {
        for (const c of content) {
          if (!c || typeof c !== 'object') continue;
          if (c.type === 'text') {
            if (!(c.text || '').trim()) continue;
            const block = createBlock('msg-assistant', 'ASSISTANT', '');
            block.querySelector('.msg-body').innerHTML = renderMarkdown(c.text);
            conversation.appendChild(block);
          } else if (c.type === 'tool_use') {
            renderClaudeToolUse(conversation, c, '');
          } else if (c.type === 'thinking') {
            renderThinking(conversation, c.thinking || '', '');
          }
        }
      }
    }
  }
}
