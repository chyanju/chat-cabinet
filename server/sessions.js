const fs = require('fs');
const path = require('path');
const os = require('os');

const { CODEX_HOME } = require('./sources/codex');
const { CLAUDE_PROJECTS_DIR } = require('./sources/claude');
const { CURSOR_PROJECTS_DIR } = require('./sources/cursor');
const { discoverCodexSessions } = require('./sources/codex');
const { discoverVSCodeDebugLogs } = require('./sources/vscode-copilot');
const { discoverVSCodeChatSessions } = require('./sources/vscode-chat');
const { discoverClaudeSessions } = require('./sources/claude');
const { discoverCursorSessions } = require('./sources/cursor');

/** VS Code workspace storage directories to scan. */
const VSCODE_DIRS = [
  {
    label: 'VS Code Insiders',
    source: 'vscode-insiders',
    base: path.join(os.homedir(), 'Library', 'Application Support', 'Code - Insiders', 'User', 'workspaceStorage'),
  },
  {
    label: 'VS Code',
    source: 'vscode-stable',
    base: path.join(os.homedir(), 'Library', 'Application Support', 'Code', 'User', 'workspaceStorage'),
  },
];

/** Allowed path prefixes for loadSession (security). */
function getAllowedPrefixes() {
  const prefixes = [CODEX_HOME, CLAUDE_PROJECTS_DIR, CURSOR_PROJECTS_DIR];
  for (const vsc of VSCODE_DIRS) {
    if (fs.existsSync(vsc.base)) prefixes.push(vsc.base);
  }
  return prefixes;
}

/**
 * Discover all sessions from every source, sorted newest-first.
 */
function listAllSessions() {
  const sessions = [];

  sessions.push(...discoverCodexSessions());

  const { sessions: debugLogSessions, sessionIds: debugLogIds } = discoverVSCodeDebugLogs(VSCODE_DIRS);
  sessions.push(...debugLogSessions);

  sessions.push(...discoverVSCodeChatSessions(VSCODE_DIRS, debugLogIds));
  sessions.push(...discoverClaudeSessions());
  sessions.push(...discoverCursorSessions());

  sessions.sort((a, b) => (b.timestamp || '').localeCompare(a.timestamp || ''));
  return sessions;
}

/**
 * Load the raw JSONL entries for a single session file.
 * Validates the path is under an allowed prefix.
 */
function loadSession(filePath) {
  const resolved = path.resolve(filePath);
  const allowed = getAllowedPrefixes();
  if (!allowed.some(prefix => resolved.startsWith(prefix))) {
    throw new Error('Invalid path');
  }
  const raw = fs.readFileSync(resolved, 'utf-8');
  const entries = [];
  for (const line of raw.split('\n')) {
    if (!line.trim()) continue;
    try {
      entries.push(JSON.parse(line));
    } catch {}
  }
  return entries;
}

module.exports = { listAllSessions, loadSession };
