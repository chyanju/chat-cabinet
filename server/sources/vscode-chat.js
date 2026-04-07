const fs = require('fs');
const path = require('path');
const { readWorkspaceFolder } = require('../utils');

/**
 * Parse a VS Code chatSessions JSONL file (key-value store format).
 * Only reads the first 8KB for fast metadata extraction.
 */
function parseVSCodeChatSession(filePath, sourceLabel, sourceKey) {
  try {
    const fd = fs.openSync(filePath, 'r');
    const buf = Buffer.alloc(8192);
    const bytesRead = fs.readSync(fd, buf, 0, 8192, 0);
    fs.closeSync(fd);
    if (bytesRead === 0) return null;

    const raw = buf.toString('utf-8', 0, bytesRead);
    const lines = raw.split('\n').filter(l => l.trim());
    if (lines.length === 0) return null;

    let sessionId = '';
    let creationDate = '';
    let customTitle = '';
    let model = '';
    let hasRequests = false;

    for (const line of lines) {
      try {
        const d = JSON.parse(line);
        const kind = d.kind;
        const k = d.k;
        const v = d.v;

        if (kind === 0 && v && typeof v === 'object') {
          sessionId = v.sessionId || '';
          creationDate = v.creationDate || '';
        }
        if (kind === 1 && Array.isArray(k)) {
          if (k.length === 1 && k[0] === 'customTitle' && v) {
            customTitle = String(v);
          }
          if (k.length === 2 && k[0] === 'inputState' && k[1] === 'selectedModel' && v) {
            const id = v.identifier || '';
            if (id) model = id;
          }
        }
        if (kind === 2 && Array.isArray(k) && k.length === 1 && k[0] === 'requests') {
          hasRequests = true;
        }
      } catch {
        // Partial line at end of buffer — ignore
      }
    }

    if (!sessionId) {
      sessionId = path.basename(filePath, '.jsonl');
    }

    const stat = fs.statSync(filePath);
    if (!hasRequests && stat.size <= 8192) return null;

    const parts = filePath.split(path.sep);
    const wsIdx = parts.indexOf('workspaceStorage');
    let cwd = '';
    if (wsIdx >= 0 && wsIdx + 1 < parts.length) {
      const wsHashDir = parts.slice(0, wsIdx + 2).join(path.sep);
      cwd = readWorkspaceFolder(wsHashDir);
    }

    return {
      id: sessionId,
      timestamp: creationDate ? new Date(creationDate).toISOString() : '',
      cwd,
      source: sourceLabel,
      source_key: sourceKey,
      model_provider: model || 'unknown',
      cli_version: sourceLabel,
      originator: sourceKey,
      filePath,
      archived: false,
      entry_count: stat.size,
      title: customTitle,
      format: 'vscode-chat-session',
    };
  } catch {
    return null;
  }
}

/**
 * Discover VS Code chatSessions across all workspace storage dirs.
 * Skips sessions already found via debug-logs (by sessionId).
 */
function discoverVSCodeChatSessions(vscodeDirs, skipSessionIds) {
  const sessions = [];

  for (const vsc of vscodeDirs) {
    if (!fs.existsSync(vsc.base)) continue;
    try {
      for (const wsHash of fs.readdirSync(vsc.base)) {
        const chatSessionsDir = path.join(vsc.base, wsHash, 'chatSessions');
        if (!fs.existsSync(chatSessionsDir)) continue;
        try {
          for (const sessionFile of fs.readdirSync(chatSessionsDir)) {
            if (!sessionFile.endsWith('.jsonl')) continue;
            const sessionId = path.basename(sessionFile, '.jsonl');
            if (skipSessionIds.has(sessionId)) continue;
            const fp = path.join(chatSessionsDir, sessionFile);
            const meta = parseVSCodeChatSession(fp, vsc.label, vsc.source);
            if (meta) sessions.push(meta);
          }
        } catch {}
      }
    } catch {}
  }

  return sessions;
}

module.exports = { discoverVSCodeChatSessions };
