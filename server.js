const http = require('http');
const fs = require('fs');
const path = require('path');
const { initDb, closeDb, isDev, getCabinetDir } = require('./server/db');
const { syncSessions, listAllSessions, loadSession, saveSession, unsaveSession, pullSession } = require('./server/sessions');
const { listTags, createTag, deleteTag, assignTag, unassignTag, updateTag } = require('./server/tags');

const DEFAULT_PORT = 3456;

function parseBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => {
      body += chunk;
      if (body.length > 1e6) { req.destroy(); reject(new Error('Body too large')); }
    });
    req.on('end', () => {
      try { resolve(JSON.parse(body)); }
      catch { reject(new Error('Invalid JSON')); }
    });
    req.on('error', reject);
  });
}

function corsOrigin() {
  if (isDev()) return '*';
  const addr = server.address();
  return addr ? `http://localhost:${addr.port}` : 'http://localhost';
}

function jsonResponse(res, status, data) {
  res.writeHead(status, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': corsOrigin(),
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  });
  res.end(JSON.stringify(data));
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const method = req.method;

  if (method === 'OPTIONS' && url.pathname.startsWith('/api/')) {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': corsOrigin(),
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    });
    res.end();
    return;
  }

  // ── Info API ──────────────────────────────────────────
  if (url.pathname === '/api/info' && method === 'GET') {
    const addr = server.address();
    const port = addr ? addr.port : null;
    let appUrl = port ? `http://localhost:${port}` : null;
    // In dev mode the frontend is served by Vite on 5173, not by the backend
    if (isDev() && port) {
      appUrl = `http://localhost:5173/?_port=${port}`;
    }
    jsonResponse(res, 200, {
      dev: isDev(),
      port,
      url: appUrl,
      dataDir: getCabinetDir(),
    });
    return;
  }

  // ── Session API ──────────────────────────────────────
  if (url.pathname === '/api/sessions' && method === 'GET') {
    jsonResponse(res, 200, listAllSessions());
    return;
  }

  if (url.pathname === '/api/session' && method === 'GET') {
    const id = url.searchParams.get('id');
    if (!id) {
      jsonResponse(res, 400, { error: 'Missing id parameter' });
      return;
    }
    try {
      const session = loadSession(id);
      jsonResponse(res, 200, session);
    } catch (e) {
      jsonResponse(res, 400, { error: e.message });
    }
    return;
  }

  if (url.pathname === '/api/sync' && method === 'POST') {
    try {
      const result = syncSessions();
      jsonResponse(res, 200, result);
    } catch (e) {
      jsonResponse(res, 400, { error: e.message });
    }
    return;
  }

  if (url.pathname === '/api/session/save' && method === 'POST') {
    try {
      const body = await parseBody(req);
      const result = saveSession(body.id);
      jsonResponse(res, 200, result);
    } catch (e) {
      jsonResponse(res, 400, { error: e.message });
    }
    return;
  }

  if (url.pathname === '/api/session/unsave' && method === 'POST') {
    try {
      const body = await parseBody(req);
      const result = unsaveSession(body.id);
      jsonResponse(res, 200, result);
    } catch (e) {
      jsonResponse(res, 400, { error: e.message });
    }
    return;
  }

  if (url.pathname === '/api/session/pull' && method === 'POST') {
    try {
      const body = await parseBody(req);
      const result = pullSession(body.id);
      jsonResponse(res, 200, result);
    } catch (e) {
      jsonResponse(res, 400, { error: e.message });
    }
    return;
  }

  if (url.pathname === '/api/session/reveal' && method === 'POST') {
    try {
      const body = await parseBody(req);
      const { getDb } = require('./server/db');
      const row = getDb().prepare('SELECT source_path FROM sessions WHERE id = ?').get(body.id);
      if (!row || !row.source_path) {
        jsonResponse(res, 400, { error: 'No source path for this session' });
        return;
      }
      const dir = path.dirname(row.source_path);
      const { spawn } = require('child_process');
      if (process.platform === 'darwin') spawn('open', [dir]);
      else if (process.platform === 'win32') spawn('explorer', [dir]);
      else spawn('xdg-open', [dir]);
      jsonResponse(res, 200, { ok: true, dir });
    } catch (e) {
      jsonResponse(res, 400, { error: e.message });
    }
    return;
  }

  if (url.pathname === '/api/reveal-dir' && method === 'POST') {
    try {
      const body = await parseBody(req);
      if (!body.dir) {
        jsonResponse(res, 400, { error: 'Missing dir parameter' });
        return;
      }
      const resolved = path.resolve(body.dir);
      if (!fs.existsSync(resolved) || !fs.statSync(resolved).isDirectory()) {
        jsonResponse(res, 400, { error: 'Invalid directory' });
        return;
      }
      const { spawn } = require('child_process');
      if (process.platform === 'darwin') spawn('open', [resolved]);
      else if (process.platform === 'win32') spawn('explorer', [resolved]);
      else spawn('xdg-open', [resolved]);
      jsonResponse(res, 200, { ok: true });
    } catch (e) {
      jsonResponse(res, 400, { error: e.message });
    }
    return;
  }

  // ── Tag API ──────────────────────────────────────────
  if (url.pathname === '/api/tags' && method === 'GET') {
    jsonResponse(res, 200, listTags());
    return;
  }

  if (url.pathname === '/api/tags' && method === 'POST') {
    try {
      const body = await parseBody(req);
      const tag = createTag(body.name, body.color);
      jsonResponse(res, 201, tag);
    } catch (e) {
      jsonResponse(res, 400, { error: e.message });
    }
    return;
  }

  if (url.pathname === '/api/tags/update' && method === 'POST') {
    try {
      const body = await parseBody(req);
      const tag = updateTag(body.id, body);
      if (!tag) { jsonResponse(res, 404, { error: 'Tag not found' }); return; }
      jsonResponse(res, 200, tag);
    } catch (e) {
      jsonResponse(res, 400, { error: e.message });
    }
    return;
  }

  if (url.pathname === '/api/tags/delete' && method === 'POST') {
    try {
      const body = await parseBody(req);
      deleteTag(body.id);
      jsonResponse(res, 200, { ok: true });
    } catch (e) {
      jsonResponse(res, 400, { error: e.message });
    }
    return;
  }

  if (url.pathname === '/api/tags/assign' && method === 'POST') {
    try {
      const body = await parseBody(req);
      assignTag(body.tag_id, body.session_id);
      jsonResponse(res, 200, { ok: true });
    } catch (e) {
      jsonResponse(res, 400, { error: e.message });
    }
    return;
  }

  if (url.pathname === '/api/tags/unassign' && method === 'POST') {
    try {
      const body = await parseBody(req);
      unassignTag(body.tag_id, body.session_id);
      jsonResponse(res, 200, { ok: true });
    } catch (e) {
      jsonResponse(res, 400, { error: e.message });
    }
    return;
  }

  // ── Static files from dist/ (Vite build) ──────────────
  let filePath = path.join(__dirname, 'dist', url.pathname === '/' ? 'index.html' : url.pathname);
  filePath = path.resolve(filePath);

  if (!filePath.startsWith(path.join(__dirname, 'dist'))) {
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

/**
 * Start the Chat Cabinet server.
 * @param {object} [opts]
 * @param {number} [opts.port=3456] - Port to listen on (0 = random available port)
 * @returns {Promise<{server: http.Server, port: number, url: string}>}
 */
function startServer(opts = {}) {
  const port = opts.port ?? DEFAULT_PORT;
  initDb({ dev: !!opts.dev });
  try {
    console.log('Syncing sessions...');
    const syncResult = syncSessions();
    console.log(`Sync complete: ${syncResult.added} added, ${syncResult.removed} removed, ${syncResult.updated} updated`);
  } catch (e) {
    console.error('Sync failed (continuing with existing data):', e.message);
  }
  return new Promise((resolve, reject) => {
    function onError(err) {
      if (err.code === 'EADDRINUSE' && port !== 0) {
        console.log(`Port ${port} in use — falling back to a random available port...`);
        server.once('error', (e) => reject(e));
        server.listen(0, onListening);
      } else {
        reject(err);
      }
    }
    function onListening() {
      const actualPort = server.address().port;
      const url = `http://localhost:${actualPort}`;
      console.log(`Chat Cabinet running at ${url}`);
      resolve({ server, port: actualPort, url });
    }
    server.once('error', onError);
    server.listen(port, onListening);
  });
}

// Graceful shutdown
function cleanup() {
  closeDb();
  process.exit(0);
}
process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);

module.exports = { startServer };

function parseArgs(argv) {
  const opts = { port: DEFAULT_PORT, help: false, dev: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--help' || a === '-h') {
      opts.help = true;
    } else if (a === '--dev') {
      opts.dev = true;
    } else if (a === '--port' || a === '-p') {
      const v = parseInt(argv[++i], 10);
      if (Number.isNaN(v) || v < 0 || v > 65535) {
        throw new Error(`Invalid port: ${argv[i]}`);
      }
      opts.port = v;
    } else if (a.startsWith('--port=')) {
      const v = parseInt(a.slice(7), 10);
      if (Number.isNaN(v) || v < 0 || v > 65535) {
        throw new Error(`Invalid port: ${a}`);
      }
      opts.port = v;
    } else {
      throw new Error(`Unknown argument: ${a}`);
    }
  }
  return opts;
}

function printHelp() {
  console.log(`Chat Cabinet — headless server mode

Usage:
  node server.js [options]

Options:
  -p, --port <n>   Port to listen on (default: ${DEFAULT_PORT}, use 0 for random)
  --dev            Dev mode (uses ~/.cabinet-dev for data)
  -h, --help       Show this help

In headless mode, open the printed URL in a browser to use the UI.
For the desktop GUI, run the bundled Chat Cabinet app instead.`);
}

// Direct execution: node server.js
if (require.main === module) {
  let opts;
  try {
    opts = parseArgs(process.argv.slice(2));
  } catch (e) {
    console.error(e.message);
    console.error('Run with --help for usage.');
    process.exit(2);
  }
  if (opts.help) {
    printHelp();
    process.exit(0);
  }
  startServer({ port: opts.port, dev: opts.dev }).catch(err => {
    console.error(err.message);
    process.exit(1);
  });
}
