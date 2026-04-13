/**
 * SQLite database layer for ~/.cabinet/cabinet.db (or ~/.cabinet-dev/ in dev mode)
 */
const Database = require('better-sqlite3');
const path = require('path');
const os = require('os');
const fs = require('fs');

let CABINET_DIR = path.join(os.homedir(), '.cabinet');
let DB_PATH = path.join(CABINET_DIR, 'cabinet.db');
let IS_DEV = false;

let db = null;

function getDb() {
  if (!db) throw new Error('Database not initialised — call initDb() first');
  return db;
}

function isDev() { return IS_DEV; }
function getCabinetDir() { return CABINET_DIR; }

function initDb(opts = {}) {
  IS_DEV = !!opts.dev;
  if (IS_DEV) {
    CABINET_DIR = path.join(os.homedir(), '.cabinet-dev');
    DB_PATH = path.join(CABINET_DIR, 'cabinet.db');
  }
  fs.mkdirSync(CABINET_DIR, { recursive: true });
  db = new Database(DB_PATH);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');

  db.exec(`
    CREATE TABLE IF NOT EXISTS sessions (
      id          TEXT PRIMARY KEY,
      source_path TEXT,
      source      TEXT,
      format      TEXT,
      title       TEXT,
      alias       TEXT,
      timestamp   TEXT,
      model       TEXT,
      cwd         TEXT,
      data        TEXT,
      created_at  TEXT NOT NULL,
      updated_at  TEXT NOT NULL,
      CHECK (source_path IS NOT NULL OR data IS NOT NULL)
    );

    CREATE UNIQUE INDEX IF NOT EXISTS idx_sessions_source_path
      ON sessions(source_path) WHERE source_path IS NOT NULL;

    CREATE TABLE IF NOT EXISTS tags (
      id         TEXT PRIMARY KEY,
      name       TEXT NOT NULL,
      color      TEXT NOT NULL DEFAULT '#58a6ff',
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS tag_assignments (
      tag_id     TEXT NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
      session_id TEXT NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
      PRIMARY KEY (tag_id, session_id)
    );
  `);

  // Migration: add alias column to existing databases
  const cols = db.pragma('table_info(sessions)').map(c => c.name);
  if (!cols.includes('alias')) {
    db.exec('ALTER TABLE sessions ADD COLUMN alias TEXT');
  }

  return db;
}

function closeDb() {
  if (db) {
    db.close();
    db = null;
  }
}

module.exports = { getCabinetDir, getDb, initDb, closeDb, isDev };
