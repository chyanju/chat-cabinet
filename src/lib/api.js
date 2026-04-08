export async function fetchSessions() {
  const res = await fetch('/api/sessions');
  return await res.json();
}

export async function fetchSession(filePath) {
  const res = await fetch(`/api/session?path=${encodeURIComponent(filePath)}`);
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    return { error: body.error || `HTTP ${res.status}` };
  }
  return await res.json();
}
