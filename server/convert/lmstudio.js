/**
 * Convert LM Studio conversation JSON into Chat Cabinet unified format.
 *
 * LM Studio stores conversations as single JSON files with a messages array.
 * Each message has versions (for regenerations) with the currently selected index.
 * Assistant messages can be singleStep or multiStep (with thinking blocks).
 */
function convertLmStudioSession(data, meta) {
  const session = {
    version: 1,
    session_id: meta.id,
    source: { tool: 'lmstudio', format: 'lmstudio', file_path: meta.filePath },
    created_at: data.createdAt ? new Date(data.createdAt).toISOString() : meta.timestamp || null,
    title: data.name || null,
    workspace: { cwd: null },
    model: { id: null, provider: 'lmstudio' },
    config: {},
    turns: [],
  };

  // Extract model from lastUsedModel
  if (data.lastUsedModel?.identifier) {
    session.model.id = data.lastUsedModel.identifier;
  }

  const messages = data.messages || [];

  // Emit system prompt as a system message in the first turn
  const systemPrompt = (data.systemPrompt || '').trim();
  let currentTurn = null;

  function newTurn(ts) {
    currentTurn = { turn_id: String(session.turns.length), started_at: ts, ended_at: null, events: [] };
    session.turns.push(currentTurn);
    return currentTurn;
  }

  function ensureTurn(ts) {
    return currentTurn || newTurn(ts);
  }

  for (const msg of messages) {
    const ver = (msg.versions || [])[msg.currentlySelected || 0];
    if (!ver) continue;

    const role = ver.role;

    if (role === 'user') {
      const ts = null; // LM Studio doesn't store per-message timestamps
      const turn = newTurn(ts);
      // Inject system prompt into the first turn
      if (systemPrompt && session.turns.length === 1) {
        turn.events.push({ type: 'message', timestamp: null, role: 'system', content: systemPrompt });
      }
      const { text, attachments } = extractContentAndAttachments(ver);
      if (text.trim() || attachments.length) {
        const evt = { type: 'message', timestamp: ts, role: 'user', content: text };
        if (attachments.length) evt.attachments = attachments;
        turn.events.push(evt);
      }
    } else if (role === 'assistant') {
      const turn = ensureTurn(null);
      const modelId = ver.senderInfo?.senderName || session.model.id || null;
      if (modelId && !session.model.id) session.model.id = modelId;

      if (ver.type === 'multiStep') {
        // Multi-step: may contain thinking + content blocks
        for (const step of (ver.steps || [])) {
          if (step.type === 'contentBlock') {
            const text = extractStepText(step);
            if (!text.trim()) continue;

            if (step.style?.type === 'thinking') {
              turn.events.push({ type: 'thinking', timestamp: null, content: text, model: modelId });
            } else {
              // Check genInfo for model
              const stepModel = step.genInfo?.identifier || modelId;
              turn.events.push({ type: 'message', timestamp: null, role: 'assistant', content: text, model: stepModel });

              // Extract token usage from genInfo
              if (step.genInfo) {
                const tokensCount = step.content?.reduce((sum, c) => sum + (c.tokensCount || 0), 0) || null;
                if (tokensCount) {
                  turn.token_usage = { input: null, output: tokensCount };
                }
              }
            }
          } else if (step.type === 'toolCall') {
            turn.events.push({
              type: 'tool_call', timestamp: null, tool_id: step.toolName || 'unknown',
              call_id: step.callId || null, status: step.result ? 'ok' : 'pending',
              input: { raw: step.arguments || null },
              output: { text: step.result || null },
              confirmation: { state: step.result ? 'passed' : 'unknown', user_action: null },
            });
          }
        }
      } else {
        // singleStep
        const content = extractContentAndAttachments(ver).text;
        if (content.trim()) {
          turn.events.push({ type: 'message', timestamp: null, role: 'assistant', content, model: modelId });
        }
      }
    }
  }

  // Add token count from top-level if available
  if (data.tokenCount && session.turns.length > 0) {
    const lastTurn = session.turns[session.turns.length - 1];
    if (!lastTurn.token_usage) {
      lastTurn.token_usage = { input: null, output: data.tokenCount };
    }
  }

  return session;
}

function extractContentAndAttachments(ver) {
  const content = ver.content;
  const attachments = [];
  if (!content) return { text: '', attachments };
  if (typeof content === 'string') return { text: content, attachments };
  if (Array.isArray(content)) {
    const textParts = [];
    for (const c of content) {
      if (!c || typeof c !== 'object') continue;
      if (c.type === 'text') {
        textParts.push(c.text || '');
      } else if (c.type === 'file') {
        attachments.push({
          type: c.fileType || 'file',
          name: c.fileIdentifier || 'unknown',
          size_bytes: c.sizeBytes || null,
        });
      }
    }
    return { text: textParts.join('\n'), attachments };
  }
  return { text: '', attachments };
}

function extractStepText(step) {
  const content = step.content;
  if (!Array.isArray(content)) return '';
  return content
    .filter(c => c && c.type === 'text')
    .map(c => c.text || '')
    .join('\n');
}

module.exports = { convertLmStudioSession };
