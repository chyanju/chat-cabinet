const fs = require('fs');
const path = require('path');
const os = require('os');
const crypto = require('crypto');

const { getDb } = require('./db');

const { CODEX_HOME } = require('./sources/codex');
const { CLAUDE_PROJECTS_DIR } = require('./sources/claude');
const { CURSOR_PROJECTS_DIR } = require('./sources/cursor');
const { discoverCodexSessions } = require('./sources/codex');
const { discoverVSCodeDebugLogs } = require('./sources/vscode-copilot');
const { discoverVSCodeChatSessions } = require('./sources/vscode-chat');
const { discoverClaudeSessions } = require('./sources/claude');
const { discoverCursorSessions } = require('./sources/cursor');

// Converters: raw entries → Chat Cabinet unified format
const { convertCodexSession } = require('./convert/codex');
const { convertVSCodeDebugLog } = require('./convert/vscode-copilot');
const { convertVSCodeChatSession } = require('./convert/vscode-chat');
const { convertClaudeCodeSession } = require('./convert/claude');
const { convertCursorSession } = require('./convert/cursor');

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

// ── Filesystem discovery (internal) ───────────────────────

/** Discover all sessions from every source on disk. */
function discoverAll() {
  const sessions = [];
  sessions.push(...discoverCodexSessions());
  const { sessions: debugLogSessions, sessionIds: debugLogIds } = discoverVSCodeDebugLogs(VSCODE_DIRS);
  sessions.push(...debugLogSessions);
  sessions.push(...discoverVSCodeChatSessions(VSCODE_DIRS, debugLogIds));
  sessions.push(...discoverClaudeSessions());
  sessions.push(...discoverCursorSessions());
  return sessions;
}

// ── Sync (reconciliation) ─────────────────────────────────

/**
 * Synchronise DB with filesystem.
 * Returns { added, removed, updated } counts.
 */
function syncSessions() {
  const db = getDb();
  const now = new Date().toISOString();
  const discovered = discoverAll();

  // Build a Set of discovered paths for reverse-check
  const discoveredPaths = new Set(discovered.map(s => s.filePath));

  // Existing source_path → {id, has_data} map
  const existingRows = db.prepare(
    'SELECT id, source_path, (data IS NOT NULL) AS has_data FROM sessions WHERE source_path IS NOT NULL'
  ).all();
  const existingByPath = new Map(existingRows.map(r => [r.source_path, { id: r.id, hasData: !!r.has_data }]));

  const insertStmt = db.prepare(`
    INSERT INTO sessions (id, source_path, source, format, title, timestamp, model, cwd, data, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, NULL, ?, ?)
  `);
  const updateStmt = db.prepare(`
    UPDATE sessions SET title = ?, timestamp = ?, model = ?, cwd = ?, updated_at = ?
    WHERE id = ?
  `);
  const deleteStmt = db.prepare(
    'DELETE FROM sessions WHERE id = ?'
  );

  let added = 0, updated = 0, removed = 0;

  const syncAll = db.transaction(() => {
    // Forward: disk → DB
    for (const s of discovered) {
      const existing = existingByPath.get(s.filePath);
      if (!existing) {
        insertStmt.run(
          crypto.randomUUID(),
          s.filePath,
          s.source_key || s.source || null,
          s.format || null,
          s.title || null,
          s.timestamp || null,
          s.model_provider || null,
          s.cwd || null,
          now, now,
        );
        added++;
      } else if (!existing.hasData) {
        // Only update metadata for Linked (shortcut) sessions, not Saved ones
        updateStmt.run(
          s.title || null,
          s.timestamp || null,
          s.model_provider || null,
          s.cwd || null,
          now,
          existing.id,
        );
        updated++;
      }
    }

    // Reverse: prune shortcuts whose source_path no longer exists on disk
    for (const [srcPath, entry] of existingByPath) {
      if (!discoveredPaths.has(srcPath)) {
        // Only delete if it's a pure shortcut (no data)
        if (!entry.hasData) {
          deleteStmt.run(entry.id);
          removed++;
        }
      }
    }
  });
  syncAll();

  return { added, removed, updated };
}

// ── List / Load ───────────────────────────────────────────

/**
 * List all sessions from DB, sorted newest-first.
 */
function listAllSessions() {
  const db = getDb();
  const rows = db.prepare(`
    SELECT id, source_path, source, format, title, timestamp, model, cwd,
           (data IS NOT NULL) AS has_data, created_at, updated_at
    FROM sessions ORDER BY timestamp DESC
  `).all();

  return rows.map(r => ({
    id: r.id,
    source_path: r.source_path,
    source: r.source,
    source_key: r.source,
    format: r.format,
    title: r.title,
    timestamp: r.timestamp,
    model_provider: r.model,
    cwd: r.cwd,
    has_data: !!r.has_data,
  }));
}

/**
 * Load a session by DB id.
 * Entity sessions return stored data; shortcuts read & convert from source_path.
 */
function loadSession(sessionId) {
  const db = getDb();
  const row = db.prepare('SELECT * FROM sessions WHERE id = ?').get(sessionId);
  if (!row) throw new Error('Session not found');

  // Entity: return stored unified JSON
  if (row.data) {
    return JSON.parse(row.data);
  }

  // Shortcut: read from source_path
  if (!row.source_path) throw new Error('Session has no data and no source path');

  const resolved = path.resolve(row.source_path);
  const allowed = getAllowedPrefixes();
  if (!allowed.some(prefix => resolved.startsWith(prefix))) {
    throw new Error('Invalid path');
  }
  if (!fs.existsSync(resolved)) {
    throw new Error('Source file no longer exists');
  }

  const raw = fs.readFileSync(resolved, 'utf-8');
  const entries = [];
  for (const line of raw.split('\n')) {
    if (!line.trim()) continue;
    try { entries.push(JSON.parse(line)); } catch {}
  }

  const format = row.format || detectFormat(entries);
  const meta = {
    id: row.id,
    filePath: row.source_path,
    source: row.source,
    source_key: row.source,
    format: row.format,
    title: row.title,
    timestamp: row.timestamp,
    model_provider: row.model,
    cwd: row.cwd,
  };

  const converters = {
    'codex':               convertCodexSession,
    'vscode-copilot':      convertVSCodeDebugLog,
    'vscode-chat-session': convertVSCodeChatSession,
    'claude-code':         convertClaudeCodeSession,
    'cursor':              convertCursorSession,
  };
  const convert = converters[format];
  if (convert) {
    return convert(entries, meta);
  }
  return { version: 1, session_id: null, source: { format }, turns: [{ turn_id: '0', events: [] }] };
}

/** Best-effort format detection from raw entries. */
function detectFormat(entries) {
  if (!entries.length) return 'unknown';
  const first = entries[0];
  if (first.type === 'session_meta') return 'codex';
  if (first.kind != null) return 'vscode-chat-session';
  if (first.sid && first.type) return 'vscode-copilot';
  if (first.type === 'permission-mode' || first.type === 'user' || first.type === 'assistant') return 'claude-code';
  if (first.role) return 'cursor';
  return 'unknown';
}

module.exports = { syncSessions, listAllSessions, loadSession, saveSession, unsaveSession, pullSession };

// ── Save / Unsave / Pull ─────────────────────────────────

/**
 * Save a linked session: read from source_path, convert, store unified JSON in DB.
 * Turns a shortcut into an entity (with source_path retained for pull).
 */
function saveSession(sessionId) {
  const db = getDb();
  const row = db.prepare('SELECT * FROM sessions WHERE id = ?').get(sessionId);
  if (!row) throw new Error('Session not found');
  if (row.data) throw new Error('Session is already saved');
  if (!row.source_path) throw new Error('Session has no source path');

  // Load & convert
  const unified = loadSession(sessionId);

  // Store unified JSON into data column
  const now = new Date().toISOString();
  db.prepare('UPDATE sessions SET data = ?, updated_at = ? WHERE id = ?').run(
    JSON.stringify(unified), now, sessionId,
  );
  return { ok: true, id: sessionId };
}

/**
 * Unsave a session: clear the data column, reverting to shortcut.
 * Only allowed if source_path exists (otherwise the entry would violate the CHECK).
 */
function unsaveSession(sessionId) {
  const db = getDb();
  const row = db.prepare('SELECT * FROM sessions WHERE id = ?').get(sessionId);
  if (!row) throw new Error('Session not found');
  if (!row.data) throw new Error('Session is not saved');
  if (!row.source_path) throw new Error('Cannot unsave: no source path to fall back to');

  const now = new Date().toISOString();
  db.prepare('UPDATE sessions SET data = NULL, updated_at = ? WHERE id = ?').run(now, sessionId);
  return { ok: true, id: sessionId };
}

/**
 * Pull: re-read from source_path, convert, and overwrite stored data.
 * Only for entities that have a source_path.
 */
function pullSession(sessionId) {
  const db = getDb();
  const row = db.prepare('SELECT * FROM sessions WHERE id = ?').get(sessionId);
  if (!row) throw new Error('Session not found');
  if (!row.data) throw new Error('Session is not saved — save it first');
  if (!row.source_path) throw new Error('No source path to pull from');

  // Temporarily clear data so loadSession reads from source_path
  const origData = row.data;
  db.prepare('UPDATE sessions SET data = NULL WHERE id = ?').run(sessionId);

  let unified;
  try {
    unified = loadSession(sessionId);
  } catch (e) {
    // Restore on failure
    db.prepare('UPDATE sessions SET data = ? WHERE id = ?').run(origData, sessionId);
    throw e;
  }

  const now = new Date().toISOString();
  db.prepare('UPDATE sessions SET data = ?, updated_at = ? WHERE id = ?').run(
    JSON.stringify(unified), now, sessionId,
  );
  return { ok: true, id: sessionId };
}
