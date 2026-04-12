const _portParam = new URLSearchParams(window.location.search).get('_port');
const _apiBase = _portParam && /^\d{1,5}$/.test(_portParam) && parseInt(_portParam) <= 65535
  ? `http://localhost:${_portParam}` : '';

export function apiUrl(path) {
  return _apiBase + path;
}

export async function postJson(apiPath, body) {
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
