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
    return folder.replace(/^file:\/\//, '').replace(/^\/\//, '');
  } catch {
    return '';
  }
}

/**
 * Decode a Claude Code / Cursor project directory name back to a filesystem path.
 *
 * Claude encodes /Users/joseph/foo-bar as -Users-joseph-foo-bar.
 * We try all possible splits and pick the one where the most path segments
 * actually exist on disk.
 */
function decodeProjectDir(encoded) {
  const raw = encoded.replace(/^-/, '');
  const parts = raw.split('-');

  function resolve(idx, prefix) {
    if (idx >= parts.length) return prefix;

    let accumulated = parts[idx];
    for (let end = idx; end < parts.length; end++) {
      if (end > idx) accumulated += '-' + parts[end];
      const candidate = prefix + '/' + accumulated;

      if (end === parts.length - 1) {
        if (fs.existsSync(candidate)) return candidate;
      } else if (fs.existsSync(candidate)) {
        const result = resolve(end + 1, candidate);
        if (result) return result;
      }
    }

    const fallback = prefix + '/' + parts[idx];
    return resolve(idx + 1, fallback);
  }

  return resolve(0, '');
}

module.exports = { findJsonlFiles, readWorkspaceFolder, decodeProjectDir };
