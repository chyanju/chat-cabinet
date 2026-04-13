const fs = require('fs');
const path = require('path');

/**
 * Recursively find all .jsonl files under a directory.
 */
function findJsonlFiles(dir) {
  const results = [];
  if (!fs.existsSync(dir)) return results;
  const walk = (d) => {
    for (const entry of fs.readdirSync(d, { withFileTypes: true })) {
      const full = path.join(d, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (entry.name.endsWith('.jsonl')) results.push(full);
    }
  };
  walk(dir);
  return results;
}

/**
 * Read workspace.json next to a workspaceStorage hash folder
 * to determine the workspace folder path.
 */
function readWorkspaceFolder(wsHashDir) {
  try {
    const wsJson = path.join(wsHashDir, 'workspace.json');
    const data = JSON.parse(fs.readFileSync(wsJson, 'utf-8'));
    const folder = data.folder || '';
    try {
      let p = decodeURIComponent(new URL(folder).pathname);
      // Windows: new URL('file:///C:/foo').pathname → '/C:/foo'; strip leading slash
      if (process.platform === 'win32' && /^\/[A-Za-z]:/.test(p)) p = p.slice(1);
      return p;
    } catch {
      const raw = folder.replace(/^file:\/\//, '').replace(/^\/\//, '');
      return decodeURIComponent(raw);
    }
  } catch {
    return '';
  }
}

/**
 * Decode a Claude Code / Cursor project directory name back to a filesystem path.
 *
 * Claude encodes /Users/joseph/foo-bar as -Users-joseph-foo-bar.
 * On Windows it encodes C:\Users\joseph\foo as -C-Users-joseph-foo.
 * We try all possible splits and pick the one where the most path segments
 * actually exist on disk.
 */
function decodeProjectDir(encoded) {
  const raw = encoded.replace(/^-/, '');
  const parts = raw.split('-');
  const sep = path.sep;

  // On Windows, the first part may be a drive letter (e.g. 'C')
  let startPrefix = '';
  let startIdx = 0;
  if (process.platform === 'win32' && parts.length >= 1 && /^[A-Za-z]$/.test(parts[0])) {
    startPrefix = parts[0] + ':';
    startIdx = 1;
  }

  function resolve(idx, prefix) {
    if (idx >= parts.length) return prefix;

    let accumulated = parts[idx];
    for (let end = idx; end < parts.length; end++) {
      if (end > idx) accumulated += '-' + parts[end];
      const candidate = prefix + sep + accumulated;

      if (end === parts.length - 1) {
        if (fs.existsSync(candidate)) return candidate;
      } else if (fs.existsSync(candidate)) {
        const result = resolve(end + 1, candidate);
        if (result) return result;
      }
    }

    const fallback = prefix + sep + parts[idx];
    return resolve(idx + 1, fallback);
  }

  return resolve(startIdx, startPrefix);
}

module.exports = { findJsonlFiles, readWorkspaceFolder, decodeProjectDir };
