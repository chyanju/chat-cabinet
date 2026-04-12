import { apiUrl, postJson } from './api-base.js';

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
    throw new Error(`Cannot reach backend at ${url}: ${e.message}`);
  }
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `HTTP ${res.status}`);
  }
  return await res.json();
}

// ── POST helpers ──────────────────────────────────────────

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
