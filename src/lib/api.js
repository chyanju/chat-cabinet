function apiUrl(path) {
  return path;
}

export async function fetchSessions() {
  const url = apiUrl('/api/sessions');
  let res;
  try {
    res = await fetch(url);
  } catch (e) {
    throw new Error(`Cannot reach backend at ${url}: ${e.message}`);
  }
  if (!res.ok) {
    throw new Error(`GET ${url} failed: HTTP ${res.status}`);
  }
  return await res.json();
}

export async function fetchSession(id) {
  const url = apiUrl(`/api/session?id=${encodeURIComponent(id)}`);
  let res;
  try {
    res = await fetch(url);
  } catch (e) {
    return { error: `Cannot reach backend at ${url}: ${e.message}` };
  }
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    return { error: body.error || `HTTP ${res.status}` };
  }
  return await res.json();
}

// ── POST helpers ──────────────────────────────────────────

async function postJson(apiPath, body) {
  const url = apiUrl(apiPath);
  let res;
  try {
    res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
  } catch (e) {
    throw new Error(`Cannot reach backend at ${url}: ${e.message}`);
  }
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || `POST ${url} failed: HTTP ${res.status}`);
  }
  return await res.json();
}

export function saveSession(id) {
  return postJson('/api/session/save', { id });
}

export function unsaveSession(id) {
  return postJson('/api/session/unsave', { id });
}

export function pullSession(id) {
  return postJson('/api/session/pull', { id });
}

export function revealFolder(id) {
  return postJson('/api/session/reveal', { id });
}
