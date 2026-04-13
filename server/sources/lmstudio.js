const fs = require('fs');
const path = require('path');
const os = require('os');

const LMSTUDIO_CONVERSATIONS_DIR = path.join(os.homedir(), '.lmstudio', 'conversations');

function parseLmStudioConversation(filePath) {
  try {
    const raw = fs.readFileSync(filePath, 'utf-8');
    const data = JSON.parse(raw);

    const messages = data.messages || [];
    if (messages.length === 0) return null;

    // Extract model from lastUsedModel or from assistant senderInfo; count tools
    let model = '';
    let toolCount = 0;
    if (data.lastUsedModel?.identifier) {
      model = data.lastUsedModel.identifier;
    }
    for (const msg of messages) {
      const ver = (msg.versions || [])[msg.currentlySelected || 0];
      if (!ver) continue;
      if (!model && ver.role === 'assistant') {
        if (ver.senderInfo?.senderName) model = ver.senderInfo.senderName;
      }
      if (ver.type === 'multiStep') {
        for (const step of (ver.steps || [])) {
          if (!model && step.genInfo?.identifier) model = step.genInfo.identifier;
          if (step.type === 'toolCall') toolCount++;
        }
      }
    }

    const timestamp = data.createdAt ? new Date(data.createdAt).toISOString() : '';
    const basename = path.basename(filePath, '.conversation.json');

    return {
      id: basename,
      timestamp,
      cwd: '',
      source: 'LM Studio',
      source_key: 'lmstudio',
      model_provider: model || 'unknown',
      cli_version: 'LM Studio',
      originator: 'lmstudio',
      filePath,
      archived: false,
      entry_count: messages.length,
      tool_count: toolCount,
      format: 'lmstudio',
      title: data.name || null,
    };
  } catch {
    return null;
  }
}

function discoverLmStudioSessions() {
  const sessions = [];
  if (!fs.existsSync(LMSTUDIO_CONVERSATIONS_DIR)) return sessions;

  try {
    for (const file of fs.readdirSync(LMSTUDIO_CONVERSATIONS_DIR)) {
      if (!file.endsWith('.conversation.json')) continue;
      const fp = path.join(LMSTUDIO_CONVERSATIONS_DIR, file);
      const meta = parseLmStudioConversation(fp);
      if (meta) sessions.push(meta);
    }
  } catch {}

  return sessions;
}

module.exports = { discoverLmStudioSessions, LMSTUDIO_CONVERSATIONS_DIR };
