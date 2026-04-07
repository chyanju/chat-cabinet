/**
 * Tag CRUD logic backed by ~/.cabinet/tags.json.
 */
const crypto = require('crypto');
const { readTagsFile, writeTagsFile } = require('./storage');

function listTags() {
  return readTagsFile();
}

function createTag(name, color) {
  const data = readTagsFile();
  const tag = {
    id: crypto.randomUUID(),
    name: name.trim(),
    color: color || '#58a6ff',
    created_at: new Date().toISOString(),
  };
  data.tags.push(tag);
  writeTagsFile(data);
  return tag;
}

function deleteTag(id) {
  const data = readTagsFile();
  data.tags = data.tags.filter(t => t.id !== id);
  data.assignments = data.assignments.filter(a => a.tag_id !== id);
  writeTagsFile(data);
}

function assignTag(tagId, sessionPath) {
  const data = readTagsFile();
  const exists = data.assignments.some(a => a.tag_id === tagId && a.session_path === sessionPath);
  if (!exists) {
    data.assignments.push({ tag_id: tagId, session_path: sessionPath });
    writeTagsFile(data);
  }
}

function unassignTag(tagId, sessionPath) {
  const data = readTagsFile();
  data.assignments = data.assignments.filter(
    a => !(a.tag_id === tagId && a.session_path === sessionPath)
  );
  writeTagsFile(data);
}

function updateTag(id, updates) {
  const data = readTagsFile();
  const tag = data.tags.find(t => t.id === id);
  if (!tag) return null;
  if (updates.name !== undefined) tag.name = updates.name.trim();
  if (updates.color !== undefined) tag.color = updates.color;
  writeTagsFile(data);
  return tag;
}

module.exports = { listTags, createTag, deleteTag, assignTag, unassignTag, updateTag };
