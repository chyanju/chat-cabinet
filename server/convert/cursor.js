/**
 * Convert Cursor agent transcript entries into Chat Cabinet unified format.
 *
 * Cursor uses a simple {role, message} format similar to Claude's API.
 * No timestamps or confirmation data available.
 */
function convertCursorSession(entries, meta) {
  const session = {
    version: 1,
    session_id: meta.id,
    source: { tool: 'cursor', format: 'cursor', file_path: meta.filePath },
    created_at: meta.timestamp || null,
    title: null,
    workspace: { cwd: meta.cwd || null },
    model: { id: null, provider: 'cursor' },
    config: {},
    turns: [],
  };

  let currentTurn = null;

  function newTurn() {
    currentTurn = { turn_id: String(session.turns.length), started_at: null, ended_at: null, events: [] };
    session.turns.push(currentTurn);
    return currentTurn;
  }

  function ensureTurn() {
    return currentTurn || newTurn();
  }

  for (const e of entries) {
    const role = e.role || '';
    const msg = e.message || {};
    const content = msg.content;

    if (role === 'user') {
      const turn = newTurn();
      if (typeof content === 'string') {
        let text = content.replace(/<user_query>\s*/g, '').replace(/\s*<\/user_query>/g, '').trim();
        if (text) turn.events.push({ type: 'message', timestamp: null, role: 'user', content: text });
      } else if (Array.isArray(content)) {
        for (const c of content) {
          if (!c || typeof c !== 'object') continue;
          if (c.type === 'text') {
            let text = (c.text || '').replace(/<user_query>\s*/g, '').replace(/\s*<\/user_query>/g, '').trim();
            if (text) turn.events.push({ type: 'message', timestamp: null, role: 'user', content: text });
          } else if (c.type === 'tool_result') {
            const resultText = typeof c.content === 'string' ? c.content
              : Array.isArray(c.content) ? c.content.filter(x => x?.type === 'text').map(x => x.text || '').join('\n') : '';
            if (resultText) {
              turn.events.push({
                type: 'tool_call', timestamp: null, tool_id: 'tool_result',
                call_id: c.tool_use_id || null, status: c.is_error ? 'error' : 'ok',
                output: { text: resultText, error: c.is_error ? resultText : null },
                confirmation: { state: 'unknown', user_action: null },
              });
            }
          }
        }
      }
    } else if (role === 'assistant') {
      const turn = ensureTurn();
      if (typeof content === 'string') {
        if (content.trim()) {
          turn.events.push({ type: 'message', timestamp: null, role: 'assistant', content: content });
        }
      } else if (Array.isArray(content)) {
        for (const c of content) {
          if (!c || typeof c !== 'object') continue;
          if (c.type === 'text') {
            if ((c.text || '').trim()) {
              turn.events.push({ type: 'message', timestamp: null, role: 'assistant', content: c.text });
            }
          } else if (c.type === 'tool_use') {
            const input = c.input && typeof c.input === 'object'
              ? { command: c.input.command || null, file_path: c.input.file_path || null, raw: JSON.stringify(c.input) }
              : { raw: JSON.stringify(c.input) };
            turn.events.push({
              type: 'tool_call', timestamp: null, tool_id: c.name || 'unknown',
              call_id: c.id || null, status: null, input, output: {},
              confirmation: { state: 'unknown', user_action: null },
            });
          } else if (c.type === 'thinking') {
            if (c.thinking) {
              turn.events.push({ type: 'thinking', timestamp: null, content: c.thinking });
            }
          }
        }
      }
    }
  }

  return session;
}

module.exports = { convertCursorSession };
