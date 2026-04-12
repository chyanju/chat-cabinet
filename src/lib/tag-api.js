/**
 * Tag API client — CRUD operations for tags.
 */

const _portParam = new URLSearchParams(window.location.search).get('_port');
const _apiBase = _portParam && /^\d{1,5}$/.test(_portParam) && parseInt(_portParam) <= 65535
  ? `http://localhost:${_portParam}` : '';

function apiUrl(path) {
  return _apiBase + path;
}

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

export async function createTag(name, color) {
  const url = apiUrl('/api/tags');
  let res;
  try {
    res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, color }),
    });
  } catch (e) {
    throw new Error(`Cannot reach backend at ${url}: ${e.message}`);
  }
  if (!res.ok) throw new Error(`POST ${url} failed: HTTP ${res.status}`);
  return await res.json();
}

export async function deleteTag(id) {
  const url = apiUrl('/api/tags/delete');
  let res;
  try {
    res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    });
  } catch (e) {
    throw new Error(`Cannot reach backend at ${url}: ${e.message}`);
  }
  if (!res.ok) throw new Error(`POST ${url} failed: HTTP ${res.status}`);
  return await res.json();
}

export async function assignTag(tagId, sessionId) {
  const url = apiUrl('/api/tags/assign');
  let res;
  try {
    res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tag_id: tagId, session_id: sessionId }),
    });
  } catch (e) {
    throw new Error(`Cannot reach backend at ${url}: ${e.message}`);
  }
  if (!res.ok) throw new Error(`POST ${url} failed: HTTP ${res.status}`);
  return await res.json();
}

export async function unassignTag(tagId, sessionId) {
  const url = apiUrl('/api/tags/unassign');
  let res;
  try {
    res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tag_id: tagId, session_id: sessionId }),
    });
  } catch (e) {
    throw new Error(`Cannot reach backend at ${url}: ${e.message}`);
  }
  if (!res.ok) throw new Error(`POST ${url} failed: HTTP ${res.status}`);
  return await res.json();
}

export async function updateTag(id, updates) {
  const url = apiUrl('/api/tags/update');
  let res;
  try {
    res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, ...updates }),
    });
  } catch (e) {
    throw new Error(`Cannot reach backend at ${url}: ${e.message}`);
  }
  if (!res.ok) throw new Error(`POST ${url} failed: HTTP ${res.status}`);
  return await res.json();
}
