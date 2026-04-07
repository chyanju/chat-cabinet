/**
 * Tag API client — CRUD operations for tags.
 */

export async function fetchTags() {
  const res = await fetch('/api/tags');
  return await res.json();
}

export async function createTag(name, color) {
  const res = await fetch('/api/tags', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, color }),
  });
  return await res.json();
}

export async function deleteTag(id) {
  const res = await fetch('/api/tags/delete', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id }),
  });
  return await res.json();
}

export async function assignTag(tagId, sessionPath) {
  const res = await fetch('/api/tags/assign', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ tag_id: tagId, session_path: sessionPath }),
  });
  return await res.json();
}

export async function unassignTag(tagId, sessionPath) {
  const res = await fetch('/api/tags/unassign', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ tag_id: tagId, session_path: sessionPath }),
  });
  return await res.json();
}
