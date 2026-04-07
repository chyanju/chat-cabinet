export async function fetchSessions() {
  const res = await fetch('/api/sessions');
  return await res.json();
}

export async function fetchSession(filePath) {
  const res = await fetch(`/api/session?path=${encodeURIComponent(filePath)}`);
  return await res.json();
}
