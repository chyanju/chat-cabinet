const http = require('http');
const fs = require('fs');
const path = require('path');
const os = require('os');

const PORT = 3456;
const CODEX_HOME = path.join(os.homedir(), '.codex');
const SESSIONS_DIR = path.join(CODEX_HOME, 'sessions');
const ARCHIVED_DIR = path.join(CODEX_HOME, 'archived_sessions');

// VS Code Copilot chat debug-log directories
const VSCODE_DIRS = [
  {
    label: 'VS Code Insiders',
    source: 'vscode-insiders',
    base: path.join(os.homedir(), 'Library', 'Application Support', 'Code - Insiders', 'User', 'workspaceStorage'),
  },
  {
    label: 'VS Code',
    source: 'vscode-stable',
    base: path.join(os.homedir(), 'Library', 'Application Support', 'Code', 'User', 'workspaceStorage'),
  },
];

// ── Helpers ──────────────────────────────────────────────

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

function parseSessionMeta(filePath) {
  const firstLine = fs.readFileSync(filePath, 'utf-8').split('\n')[0];
  if (!firstLine) return null;
  try {
    const obj = JSON.parse(firstLine);
    if (obj.type === 'session_meta') {
      return obj.payload;
    }
  } catch {}
  return null;
}

// Read workspace.json next to a workspaceStorage hash folder
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

// Parse a VS Code Copilot debug-log main.jsonl to extract session metadata
function parseVSCodeSession(filePath, sourceLabel, sourceKey) {
  try {
    const raw = fs.readFileSync(filePath, 'utf-8');
    const lines = raw.split('\n').filter(l => l.trim());
    if (lines.length === 0) return null;

    const first = JSON.parse(lines[0]);
    const sid = first.sid;
    const firstTs = first.ts;

    // Derive workspace folder from path structure
    // .../workspaceStorage/<hash>/GitHub.copilot-chat/debug-logs/<sid>/main.jsonl
    const parts = filePath.split(path.sep);
    const wsIdx = parts.indexOf('workspaceStorage');
    let cwd = '';
    if (wsIdx >= 0 && wsIdx + 1 < parts.length) {
      const wsHashDir = parts.slice(0, wsIdx + 2).join(path.sep);
      cwd = readWorkspaceFolder(wsHashDir);
    }

    // Collect models used and entry count
    const models = new Set();
    let toolCount = 0;
    for (const line of lines) {
      try {
        const d = JSON.parse(line);
        if (d.type === 'llm_request' && d.attrs && d.attrs.model) {
          models.add(d.attrs.model);
        }
        if (d.type === 'tool_call') toolCount++;
      } catch {}
    }

    return {
      id: sid,
      timestamp: new Date(firstTs).toISOString(),
      cwd: cwd,
      source: sourceLabel,
      source_key: sourceKey,
      model_provider: [...models].join(', ') || 'unknown',
      cli_version: sourceLabel,
      originator: sourceKey,
      filePath: filePath,
      archived: false,
      entry_count: lines.length,
      tool_count: toolCount,
      format: 'vscode-copilot',
    };
  } catch {
    return null;
  }
}

function listAllSessions() {
  const sessions = [];

  // Codex sessions
  for (const fp of findJsonlFiles(SESSIONS_DIR)) {
    const meta = parseSessionMeta(fp);
    if (meta) {
      sessions.push({
        ...meta,
        filePath: fp,
        archived: false,
        source_key: meta.source || meta.originator || 'codex',
        format: 'codex',
      });
    }
  }
  for (const fp of findJsonlFiles(ARCHIVED_DIR)) {
    const meta = parseSessionMeta(fp);
    if (meta) {
      sessions.push({
        ...meta,
        filePath: fp,
        archived: true,
        source_key: meta.source || meta.originator || 'codex',
        format: 'codex',
      });
    }
  }

  // VS Code Copilot sessions
  for (const vsc of VSCODE_DIRS) {
    if (!fs.existsSync(vsc.base)) continue;
    try {
      for (const wsHash of fs.readdirSync(vsc.base)) {
        const debugLogsDir = path.join(vsc.base, wsHash, 'GitHub.copilot-chat', 'debug-logs');
        if (!fs.existsSync(debugLogsDir)) continue;
        try {
          for (const sessionDir of fs.readdirSync(debugLogsDir)) {
            const mainJsonl = path.join(debugLogsDir, sessionDir, 'main.jsonl');
            if (!fs.existsSync(mainJsonl)) continue;
            const meta = parseVSCodeSession(mainJsonl, vsc.label, vsc.source);
            if (meta) sessions.push(meta);
          }
        } catch {}
      }
    } catch {}
  }

  sessions.sort((a, b) => (b.timestamp || '').localeCompare(a.timestamp || ''));
  return sessions;
}

function loadSession(filePath) {
  // Validate the path is under CODEX_HOME or a known VS Code workspace storage dir
  const resolved = path.resolve(filePath);
  const allowedPrefixes = [CODEX_HOME];
  for (const vsc of VSCODE_DIRS) {
    if (fs.existsSync(vsc.base)) allowedPrefixes.push(vsc.base);
  }
  const isAllowed = allowedPrefixes.some(prefix => resolved.startsWith(prefix));
  if (!isAllowed) {
    throw new Error('Invalid path');
  }
  const raw = fs.readFileSync(resolved, 'utf-8');
  const entries = [];
  for (const line of raw.split('\n')) {
    if (!line.trim()) continue;
    try {
      entries.push(JSON.parse(line));
    } catch {}
  }
  return entries;
}

// ── HTTP Server ──────────────────────────────────────────

const server = http.createServer((req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);

  if (url.pathname === '/api/sessions') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(listAllSessions()));
    return;
  }

  if (url.pathname === '/api/session') {
    const fp = url.searchParams.get('path');
    if (!fp) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Missing path parameter' }));
      return;
    }
    try {
      const entries = loadSession(fp);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(entries));
    } catch (e) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: e.message }));
    }
    return;
  }

  // Serve static files from public/
  let filePath = path.join(__dirname, 'public', url.pathname === '/' ? 'index.html' : url.pathname);
  filePath = path.resolve(filePath);

  // Prevent directory traversal
  if (!filePath.startsWith(path.join(__dirname, 'public'))) {
    res.writeHead(403);
    res.end('Forbidden');
    return;
  }

  const ext = path.extname(filePath);
  const mimeTypes = {
    '.html': 'text/html',
    '.css': 'text/css',
    '.js': 'application/javascript',
    '.json': 'application/json',
    '.svg': 'image/svg+xml',
  };

  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404);
      res.end('Not Found');
      return;
    }
    res.writeHead(200, { 'Content-Type': mimeTypes[ext] || 'application/octet-stream' });
    res.end(data);
  });
});

server.listen(PORT, () => {
  console.log(`Chat Cabinet running at http://localhost:${PORT}`);
});
