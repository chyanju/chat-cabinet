const _portParam = new URLSearchParams(window.location.search).get('_port');
const _apiBase = _portParam && /^\d{1,5}$/.test(_portParam) && parseInt(_portParam) <= 65535
  ? `http://localhost:${_portParam}` : '';

function apiUrl(path) {
  return _apiBase + path;
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

export function revealDir(dir) {
  return postJson('/api/reveal-dir', { dir });
}

export function syncSessions() {
  return postJson('/api/sync', {});
}

export async function fetchInfo() {
  const url = apiUrl('/api/info');
  let res;
  try {
    res = await fetch(url);
  } catch (e) {
    return null;
  }
  if (!res.ok) return null;
  return await res.json();
}
