const fs = require('fs');
const path = require('path');
const { readWorkspaceFolder } = require('../utils');

/**
 * Parse a VS Code Copilot debug-log main.jsonl to extract session metadata.
 */
function parseVSCodeDebugLog(filePath, sourceLabel, sourceKey) {
  try {
    const raw = fs.readFileSync(filePath, 'utf-8');
    const lines = raw.split('\n').filter(l => l.trim());
    if (lines.length === 0) return null;

    const first = JSON.parse(lines[0]);
    const sid = first.sid;
    const firstTs = first.ts;

    const parts = filePath.split(path.sep);
    const wsIdx = parts.indexOf('workspaceStorage');
    let cwd = '';
    if (wsIdx >= 0 && wsIdx + 1 < parts.length) {
      const wsHashDir = parts.slice(0, wsIdx + 2).join(path.sep);
      cwd = readWorkspaceFolder(wsHashDir);
    }

    const models = new Set();
    let toolCount = 0;
    for (const line of lines) {
      try {
        const d = JSON.parse(line);
        if (d.type === 'llm_request' && d.attrs && d.attrs.model) {
          models.add(d.attrs.model);
        }
        if (d.type === 'tool_call') toolCount++;
      } catch {}
    }

    return {
      id: sid,
      timestamp: new Date(firstTs).toISOString(),
      cwd,
      source: sourceLabel,
      source_key: sourceKey,
      model_provider: [...models].join(', ') || 'unknown',
      cli_version: sourceLabel,
      originator: sourceKey,
      filePath,
      archived: false,
      entry_count: lines.length,
      tool_count: toolCount,
      format: 'vscode-copilot',
    };
  } catch {
    return null;
  }
}

/**
 * Discover VS Code Copilot debug-log sessions across all workspace storage dirs.
 * Returns { sessions, sessionIds } where sessionIds is a Set for dedup.
 */
function discoverVSCodeDebugLogs(vscodeDirs) {
  const sessions = [];
  const sessionIds = new Set();

  for (const vsc of vscodeDirs) {
    if (!fs.existsSync(vsc.base)) continue;
    try {
      for (const wsHash of fs.readdirSync(vsc.base)) {
        const debugLogsDir = path.join(vsc.base, wsHash, 'GitHub.copilot-chat', 'debug-logs');
        if (!fs.existsSync(debugLogsDir)) continue;
        try {
          for (const sessionDir of fs.readdirSync(debugLogsDir)) {
            const mainJsonl = path.join(debugLogsDir, sessionDir, 'main.jsonl');
            if (!fs.existsSync(mainJsonl)) continue;
            const meta = parseVSCodeDebugLog(mainJsonl, vsc.label, vsc.source);
            if (meta) {
              sessions.push(meta);
              sessionIds.add(meta.id);
            }
          }
        } catch {}
      }
    } catch {}
  }

  return { sessions, sessionIds };
}

module.exports = { discoverVSCodeDebugLogs };
