/**
 * Tag API client — CRUD operations for tags.
 */

import { apiUrl, postJson } from './api-base.js';

export async function fetchTags() {
  const url = apiUrl('/api/tags');
  let res;
  try {
    res = await fetch(url);
  } catch (e) {
    throw new Error(`Cannot reach backend at ${url}: ${e.message}`);
  }
  if (!res.ok) throw new Error(`GET ${url} failed: HTTP ${res.status}`);
  return await res.json();
}

export function createTag(name, color) {
  return postJson('/api/tags', { name, color });
}

export function deleteTag(id) {
  return postJson('/api/tags/delete', { id });
}

export function assignTag(tagId, sessionId) {
  return postJson('/api/tags/assign', { tag_id: tagId, session_id: sessionId });
}

export function unassignTag(tagId, sessionId) {
  return postJson('/api/tags/unassign', { tag_id: tagId, session_id: sessionId });
}

export function updateTag(id, updates) {
  return postJson('/api/tags/update', { id, ...updates });
}
