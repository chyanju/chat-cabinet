import { renderTurnContext, renderMessage, renderToolCall, renderCustomToolCall, renderReasoning, renderEvent } from './blocks.js';

export function renderCodexSession(conversation, entries) {
  const callMap = new Map();
  const execEndMap = new Map();
  const patchEndMap = new Map();

  for (const entry of entries) {
    if (entry.type === 'response_item') {
      const p = entry.payload;
      if (p.type === 'function_call') callMap.set(p.call_id, { call: p, output: null });
      else if (p.type === 'function_call_output') {
        const existing = callMap.get(p.call_id);
        if (existing) existing.output = p;
        else callMap.set(p.call_id, { call: null, output: p });
      }
    } else if (entry.type === 'event_msg') {
      const p = entry.payload;
      if (p.type === 'exec_command_end') execEndMap.set(p.call_id, p);
      else if (p.type === 'patch_apply_end') patchEndMap.set(p.call_id, p);
    }
  }

  const rendered = new Set();

  for (const entry of entries) {
    const ts = entry.timestamp;

    if (entry.type === 'turn_context') {
      renderTurnContext(conversation, entry.payload, ts);
    } else if (entry.type === 'response_item') {
      const p = entry.payload;
      if (p.type === 'message') {
        renderMessage(conversation, p, ts);
      } else if (p.type === 'function_call') {
        if (rendered.has(p.call_id)) continue;
        rendered.add(p.call_id);
        renderToolCall(conversation, callMap.get(p.call_id), ts, execEndMap.get(p.call_id), patchEndMap.get(p.call_id));
      } else if (p.type === 'function_call_output') {
        if (rendered.has(p.call_id)) continue;
        rendered.add(p.call_id);
        renderToolCall(conversation, { call: null, output: p }, ts);
      } else if (p.type === 'custom_tool_call') {
        if (rendered.has(p.call_id)) continue;
        rendered.add(p.call_id);
        renderCustomToolCall(conversation, p, ts, patchEndMap.get(p.call_id));
      } else if (p.type === 'reasoning') {
        renderReasoning(conversation, p, ts);
      }
    } else if (entry.type === 'event_msg') {
      renderEvent(conversation, entry.payload, ts);
    }
  }
}
