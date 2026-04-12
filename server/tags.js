/**
 * Tag CRUD logic backed by SQLite (cabinet.db).
 */
const crypto = require('crypto');
const { getDb } = require('./db');

function listTags() {
  const db = getDb();
  const tags = db.prepare('SELECT * FROM tags ORDER BY created_at').all();
  const assignments = db.prepare('SELECT * FROM tag_assignments').all();
  return { tags, assignments };
}

function createTag(name, color) {
  const db = getDb();
  const tag = {
    id: crypto.randomUUID(),
    name: name.trim(),
    color: color || '#58a6ff',
    created_at: new Date().toISOString(),
  };
  db.prepare('INSERT INTO tags (id, name, color, created_at) VALUES (?, ?, ?, ?)').run(
    tag.id, tag.name, tag.color, tag.created_at,
  );
  return tag;
}

function deleteTag(id) {
  const db = getDb();
  db.prepare('DELETE FROM tags WHERE id = ?').run(id);
}

function assignTag(tagId, sessionId) {
  const db = getDb();
  db.prepare('INSERT OR IGNORE INTO tag_assignments (tag_id, session_id) VALUES (?, ?)').run(tagId, sessionId);
}

function unassignTag(tagId, sessionId) {
  const db = getDb();
  db.prepare('DELETE FROM tag_assignments WHERE tag_id = ? AND session_id = ?').run(tagId, sessionId);
}

function updateTag(id, updates) {
  const db = getDb();
  const tag = db.prepare('SELECT * FROM tags WHERE id = ?').get(id);
  if (!tag) return null;
  const name = updates.name !== undefined ? updates.name.trim() : tag.name;
  const color = updates.color !== undefined ? updates.color : tag.color;
  db.prepare('UPDATE tags SET name = ?, color = ? WHERE id = ?').run(name, color, id);
  return { ...tag, name, color };
}

module.exports = { listTags, createTag, deleteTag, assignTag, unassignTag, updateTag };
