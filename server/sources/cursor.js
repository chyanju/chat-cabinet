const fs = require('fs');
const path = require('path');
const os = require('os');
const { decodeProjectDir } = require('../utils');

const CURSOR_PROJECTS_DIR = path.join(os.homedir(), '.cursor', 'projects');

function parseCursorSession(filePath, projectDir, sessionDir) {
  try {
    const raw = fs.readFileSync(filePath, 'utf-8');
    const lines = raw.split('\n').filter(l => l.trim());
    if (lines.length === 0) return null;

    let toolCount = 0;

    for (const line of lines) {
      try {
        const d = JSON.parse(line);
        const msg = d.message || {};
        if (d.role === 'assistant' && Array.isArray(msg.content)) {
          for (const c of msg.content) {
            if (c && c.type === 'tool_use') toolCount++;
          }
        }
      } catch {}
    }

    const stat = fs.statSync(filePath);
    const timestamp = stat.mtime.toISOString();
    // Cursor encodes paths without leading dash, unlike Claude
    const cwd = decodeProjectDir('-' + projectDir);

    return {
      id: sessionDir,
      timestamp,
      cwd,
      source: 'Cursor',
      source_key: 'cursor',
      model_provider: 'unknown',
      cli_version: 'Cursor',
      originator: 'cursor',
      filePath,
      archived: false,
      entry_count: lines.length,
      tool_count: toolCount,
      format: 'cursor',
    };
  } catch {
    return null;
  }
}

function discoverCursorSessions() {
  const sessions = [];
  if (!fs.existsSync(CURSOR_PROJECTS_DIR)) return sessions;

  try {
    for (const projectDir of fs.readdirSync(CURSOR_PROJECTS_DIR)) {
      const transcriptsDir = path.join(CURSOR_PROJECTS_DIR, projectDir, 'agent-transcripts');
      if (!fs.existsSync(transcriptsDir)) continue;
      try {
        for (const sessionDir of fs.readdirSync(transcriptsDir)) {
          const sessionJsonl = path.join(transcriptsDir, sessionDir, `${sessionDir}.jsonl`);
          if (!fs.existsSync(sessionJsonl)) continue;
          const meta = parseCursorSession(sessionJsonl, projectDir, sessionDir);
          if (meta) sessions.push(meta);
        }
      } catch {}
    }
  } catch {}

  return sessions;
}

module.exports = { discoverCursorSessions, CURSOR_PROJECTS_DIR };
