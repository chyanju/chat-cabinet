const fs = require('fs');
const path = require('path');
const os = require('os');
const { decodeProjectDir } = require('../utils');

// macOS/Linux: ~/.claude/projects  |  Windows: %APPDATA%\Claude\projects
// macOS/Linux: ~/.claude/projects  |  Windows: %APPDATA%\Claude\projects
const CLAUDE_PROJECTS_DIRS = [
  path.join(os.homedir(), '.claude', 'projects'),
  ...(process.env.APPDATA ? [path.join(process.env.APPDATA, 'Claude', 'projects')] : []),
];

function parseClaudeCodeSession(filePath, projectDir) {
  try {
    const raw = fs.readFileSync(filePath, 'utf-8');
    const lines = raw.split('\n').filter(l => l.trim());
    if (lines.length === 0) return null;

    let sessionId = '';
    let firstTs = '';
    const models = new Set();
    let toolCount = 0;

    for (const line of lines) {
      try {
        const d = JSON.parse(line);
        if (d.type === 'permission-mode' && d.sessionId) {
          sessionId = d.sessionId;
        }
        if (d.type === 'user' && d.timestamp && !firstTs) {
          firstTs = d.timestamp;
        }
        if (d.type === 'assistant') {
          const msg = d.message || {};
          if (msg.model) models.add(msg.model);
          const content = msg.content || [];
          if (Array.isArray(content)) {
            for (const c of content) {
              if (c && c.type === 'tool_use') toolCount++;
            }
          }
        }
      } catch {}
    }

    if (!sessionId) {
      sessionId = path.basename(filePath, '.jsonl');
    }

    const cwd = decodeProjectDir(projectDir);

    return {
      id: sessionId,
      timestamp: firstTs ? new Date(firstTs).toISOString() : '',
      cwd,
      source: 'Claude Code',
      source_key: 'claude-code',
      model_provider: [...models].join(', ') || 'unknown',
      cli_version: 'Claude Code',
      originator: 'claude-code',
      filePath,
      archived: false,
      entry_count: lines.length,
      tool_count: toolCount,
      format: 'claude-code',
    };
  } catch {
    return null;
  }
}

function discoverClaudeSessions() {
  const sessions = [];
  for (const dir of CLAUDE_PROJECTS_DIRS) {
    if (!fs.existsSync(dir)) continue;
    try {
      for (const projectDir of fs.readdirSync(dir)) {
        const projectPath = path.join(dir, projectDir);
        if (!fs.statSync(projectPath).isDirectory()) continue;
        for (const sessionFile of fs.readdirSync(projectPath)) {
          if (!sessionFile.endsWith('.jsonl')) continue;
          const fp = path.join(projectPath, sessionFile);
          const meta = parseClaudeCodeSession(fp, projectDir);
          if (meta) sessions.push(meta);
        }
      }
    } catch {}
  }
  return sessions;
}

module.exports = { discoverClaudeSessions, CLAUDE_PROJECTS_DIRS };
