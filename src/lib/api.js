function apiUrl(path) {
  const apiBase = new URLSearchParams(window.location.search).get('apiBase') || '';
  return `${apiBase}${path}`;
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

export async function fetchSession(filePath) {
  const url = apiUrl(`/api/session?path=${encodeURIComponent(filePath)}`);
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
