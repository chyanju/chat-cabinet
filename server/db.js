/**
 * SQLite database layer for ~/.cabinet/cabinet.db
 */
const Database = require('better-sqlite3');
const path = require('path');
const os = require('os');
const fs = require('fs');

const CABINET_DIR = path.join(os.homedir(), '.cabinet');
const DB_PATH = path.join(CABINET_DIR, 'cabinet.db');

let db = null;

function getDb() {
  if (!db) throw new Error('Database not initialised — call initDb() first');
  return db;
}

function initDb() {
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

  return db;
}

function closeDb() {
  if (db) {
    db.close();
    db = null;
  }
}

module.exports = { CABINET_DIR, getDb, initDb, closeDb };
