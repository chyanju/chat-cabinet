/**
 * Import Chat Cabinet JSON sessions.
 * All client-side — no server calls, no persistence.
 */

export function validateSession(data) {
  if (!data || typeof data !== 'object') return { valid: false, error: 'Not a valid JSON object' };
  if (data.version == null) return { valid: false, error: 'Missing "version" field' };
  if (!data.session_id) return { valid: false, error: 'Missing "session_id" field' };
  if (!Array.isArray(data.turns)) return { valid: false, error: 'Missing or invalid "turns" array' };
  return { valid: true };
}

export function importSessionFromFile(file) {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(reader.result);
        const check = validateSession(data);
        if (!check.valid) {
          resolve({ error: check.error });
        } else {
          resolve({ data });
        }
      } catch {
        resolve({ error: 'Invalid JSON: failed to parse file' });
      }
    };
    reader.onerror = () => resolve({ error: 'Failed to read file' });
    reader.readAsText(file);
  });
}

/**
 * Open a native file picker for .json files, import, and open as a viewed tab.
 * @param {Function} openViewed - The tabs store's openViewed action.
 */
export function browseForFile(openViewed) {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = '.json';
  input.onchange = async () => {
    const file = input.files?.[0];
    if (!file) return;
    const result = await importSessionFromFile(file);
    if (result.error) {
      console.error('[open-file]', result.error);
      return;
    }
    openViewed(result.data);
  };
  input.click();
}
