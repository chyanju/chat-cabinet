/**
 * Convert Claude Code session JSONL entries into Chat Cabinet unified format.
 *
 * Claude Code has no explicit turn boundaries, so we split turns by pairing
 * each user message with the assistant response(s) that follow.
 */
function convertClaudeCodeSession(entries, meta) {
  const session = {
    version: 1,
    session_id: meta.id,
    source: { tool: 'claude-code', format: 'claude-code', file_path: meta.filePath },
    created_at: meta.timestamp || null,
    title: null,
    workspace: { cwd: meta.cwd || null },
    model: { id: null, provider: 'anthropic' },
    config: {},
    turns: [],
  };

  let currentTurn = null;

  function newTurn(ts) {
    currentTurn = { turn_id: String(session.turns.length), started_at: ts, ended_at: null, events: [] };
    session.turns.push(currentTurn);
    return currentTurn;
  }

  function ensureTurn(ts) {
    return currentTurn || newTurn(ts);
  }

  for (const e of entries) {
    const ts = e.timestamp || null;
    const t = e.type;

    if (t === 'permission-mode') {
      session.config.permission_mode = e.permissionMode || null;
      if (e.sessionId) session.session_id = e.sessionId;
      ensureTurn(ts).events.push({
        type: 'status', timestamp: ts, kind: 'session_start',
        details: { permission_mode: e.permissionMode },
      });
      continue;
    }

    if (t === 'file-history-snapshot' || t === 'last-prompt') continue;

    if (t === 'system') {
      const turn = ensureTurn(ts);
      if (e.subtype === 'turn_duration') {
        turn.duration_ms = e.durationMs || null;
      } else if (e.subtype === 'compact_boundary') {
        turn.events.push({ type: 'status', timestamp: ts, kind: 'context_compacted' });
      }
      continue;
    }

    if (t === 'user') {
      const msg = e.message || {};
      let content = msg.content || '';

      // Start a new turn for each user message
      const turn = newTurn(ts);

      // Extract version/branch metadata
      if (e.version) session.source.tool_version = e.version;
      if (e.gitBranch) session.workspace.git_branch = e.gitBranch;
      if (e.cwd) session.workspace.cwd = e.cwd;

      if (typeof content === 'string') {
        if (content.startsWith('<local-command-caveat>') || content.startsWith('<command-name>') || content.startsWith('<local-command-stdout>')) {
          const cleaned = content.replace(/<[^>]+>/g, '').trim();
          if (cleaned) {
            turn.events.push({ type: 'message', timestamp: ts, role: 'user', content: cleaned, is_command: true });
          }
        } else if (content.trim()) {
          turn.events.push({ type: 'message', timestamp: ts, role: 'user', content: content });
        }
      } else if (Array.isArray(content)) {
        let textParts = '';
        for (const c of content) {
          if (!c || typeof c !== 'object') continue;
          if (c.type === 'text') {
            textParts += (textParts ? '\n' : '') + (c.text || '');
          } else if (c.type === 'tool_result') {
            const resultText = extractToolResultText(c);
            if (resultText) {
              turn.events.push({
                type: 'tool_call', timestamp: ts, tool_id: 'tool_result',
                call_id: c.tool_use_id || null,
                status: c.is_error ? 'error' : 'ok',
                output: { text: resultText, error: c.is_error ? resultText : null },
                confirmation: { state: 'passed', user_action: null },
              });
            }
          }
        }
        if (textParts.trim()) {
          turn.events.push({ type: 'message', timestamp: ts, role: 'user', content: textParts });
        }
      }
      continue;
    }

    if (t === 'assistant') {
      const msg = e.message || {};
      const model = msg.model || '';
      const content = msg.content || [];
      const turn = ensureTurn(ts);

      if (model && !session.model.id) session.model.id = model;

      // Token usage
      if (msg.usage) {
        turn.token_usage = {
          input: msg.usage.input_tokens || null,
          output: msg.usage.output_tokens || null,
          cache_read: msg.usage.cache_read_input_tokens || null,
          cache_write: msg.usage.cache_creation_input_tokens || null,
        };
      }

      if (Array.isArray(content)) {
        for (const c of content) {
          if (!c || typeof c !== 'object') continue;

          if (c.type === 'text') {
            if ((c.text || '').trim()) {
              turn.events.push({ type: 'message', timestamp: ts, role: 'assistant', content: c.text, model });
            }
          } else if (c.type === 'thinking') {
            if (c.thinking) {
              turn.events.push({ type: 'thinking', timestamp: ts, content: c.thinking, model });
            }
          } else if (c.type === 'tool_use') {
            turn.events.push({
              type: 'tool_call', timestamp: ts, tool_id: c.name || 'unknown',
              call_id: c.id || null, status: null,
              input: normalizeToolInput(c.name, c.input),
              output: {},
              confirmation: { state: 'unknown', user_action: null },
            });
          }
        }
      }
      continue;
    }
  }

  return session;
}

function normalizeToolInput(name, input) {
  if (!input || typeof input !== 'object') return { raw: JSON.stringify(input) };
  const result = {};
  // Map common Claude Code tool inputs
  if (input.command) result.command = input.command;
  if (input.file_path) result.file_path = input.file_path;
  if (input.pattern) result.query = input.pattern;
  result.raw = JSON.stringify(input);
  return result;
}

function extractToolResultText(c) {
  const content = c.content || '';
  if (typeof content === 'string') return content;
  if (Array.isArray(content)) {
    return content.filter(x => x && x.type === 'text').map(x => x.text || '').join('\n');
  }
  return '';
}

module.exports = { convertClaudeCodeSession };
