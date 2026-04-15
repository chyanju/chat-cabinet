/**
 * Convert VS Code Copilot debug-log entries into Chat Cabinet unified format.
 */
function convertVSCodeDebugLog(entries, meta) {
  const session = {
    version: 1,
    session_id: meta.id,
    source: { tool: 'vscode-copilot', format: 'vscode-copilot', file_path: meta.filePath },
    created_at: meta.timestamp || null,
    title: null,
    workspace: { cwd: meta.cwd || null },
    model: { id: meta.model_provider || null, provider: 'copilot' },
    config: {},
    turns: [],
  };

  let currentTurn = null;

  function ensureTurn(ts) {
    if (!currentTurn) {
      currentTurn = { turn_id: String(session.turns.length), started_at: ts, ended_at: null, events: [] };
      session.turns.push(currentTurn);
    }
    return currentTurn;
  }

  for (const e of entries) {
    const ts = e.ts ? new Date(e.ts).toISOString() : null;
    const attrs = e.attrs || {};

    switch (e.type) {
      case 'session_start':
        session.source.tool_version = attrs.copilotVersion || null;
        session.config.editor_version = attrs.vscodeVersion || null;
        ensureTurn(ts).events.push({
          type: 'status', timestamp: ts, kind: 'session_start',
          details: { tool_version: attrs.copilotVersion, editor_version: attrs.vscodeVersion },
        });
        break;

      case 'user_message':
        if (attrs.content) {
          ensureTurn(ts).events.push({ type: 'message', timestamp: ts, role: 'user', content: attrs.content });
        }
        break;

      case 'turn_start': {
        const turnId = attrs.turnId || String(session.turns.length);
        currentTurn = { turn_id: turnId, started_at: ts, ended_at: null, events: [] };
        session.turns.push(currentTurn);
        currentTurn.events.push({ type: 'status', timestamp: ts, kind: 'turn_start', details: { turn_id: turnId } });
        break;
      }

      case 'turn_end': {
        const turn = ensureTurn(ts);
        turn.ended_at = ts;
        turn.events.push({ type: 'status', timestamp: ts, kind: 'turn_end', details: { turn_id: attrs.turnId } });
        currentTurn = null;
        break;
      }

      case 'discovery':
        ensureTurn(ts).events.push({
          type: 'status', timestamp: ts, kind: 'discovery',
          label: e.name || 'discovery',
          details: { description: attrs.details, category: attrs.category },
        });
        break;

      case 'llm_request':
        ensureTurn(ts).events.push({
          type: 'status', timestamp: ts, kind: 'llm_request',
          details: {
            model: attrs.model, input_tokens: attrs.inputTokens, output_tokens: attrs.outputTokens,
            ttft_ms: attrs.ttft, duration_ms: e.dur,
          },
        });
        if (attrs.model) session.model.id = attrs.model;
        break;

      case 'tool_call': {
        let input = {};
        if (attrs.args) {
          try {
            const parsed = JSON.parse(attrs.args);
            input = { command: parsed.command || parsed.cmd || null, file_path: parsed.filePath || null, query: parsed.query || null, raw: attrs.args };
          } catch { input = { raw: attrs.args }; }
        }
        let output = {};
        if (attrs.result) output.text = typeof attrs.result === 'string' ? attrs.result : JSON.stringify(attrs.result);
        if (attrs.error) output.error = attrs.error;

        // Debug-logs have no consent data; only mark execution status.
        const toolStatus = e.status || null;
        const confirmation = toolStatus === 'ok'
          ? { state: 'passed', required: null, user_action: null }
          : { state: 'unknown', required: null, user_action: null };

        ensureTurn(ts).events.push({
          type: 'tool_call', timestamp: ts, tool_id: e.name || 'unknown',
          status: toolStatus, input, output,
          confirmation,
          duration_ms: e.dur || null,
        });
        break;
      }

      case 'agent_response': {
        let text = '';
        if (attrs.response) {
          try {
            const parsed = JSON.parse(attrs.response);
            if (Array.isArray(parsed)) {
              for (const msg of parsed) {
                if (msg.parts) {
                  for (const part of msg.parts) {
                    if (part.type === 'text' && part.content) text += part.content + '\n';
                  }
                }
              }
            }
          } catch { text = attrs.response; }
        }
        if (text.trim()) {
          ensureTurn(ts).events.push({ type: 'message', timestamp: ts, role: 'assistant', content: text.trim() });
        }
        break;
      }
    }
  }

  return session;
}

module.exports = { convertVSCodeDebugLog };
