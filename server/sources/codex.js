const fs = require('fs');
const path = require('path');
const os = require('os');
const { findJsonlFiles } = require('../utils');

const CODEX_HOME = path.join(os.homedir(), '.codex');
const SESSIONS_DIR = path.join(CODEX_HOME, 'sessions');
const ARCHIVED_DIR = path.join(CODEX_HOME, 'archived_sessions');

function parseSessionMeta(filePath) {
  const firstLine = fs.readFileSync(filePath, 'utf-8').split('\n')[0];
  if (!firstLine) return null;
  try {
    const obj = JSON.parse(firstLine);
    if (obj.type === 'session_meta') {
      return obj.payload;
    }
  } catch {}
  return null;
}

function discoverCodexSessions() {
  const sessions = [];

  for (const fp of findJsonlFiles(SESSIONS_DIR)) {
    const meta = parseSessionMeta(fp);
    if (meta) {
      sessions.push({
        ...meta,
        filePath: fp,
        archived: false,
        source_key: meta.source || meta.originator || 'codex',
        format: 'codex',
      });
    }
  }
  for (const fp of findJsonlFiles(ARCHIVED_DIR)) {
    const meta = parseSessionMeta(fp);
    if (meta) {
      sessions.push({
        ...meta,
        filePath: fp,
        archived: true,
        source_key: meta.source || meta.originator || 'codex',
        format: 'codex',
      });
    }
  }

  return sessions;
}

module.exports = { discoverCodexSessions, CODEX_HOME };
