const http = require('http');
const fs = require('fs');
const path = require('path');
const { listAllSessions, loadSession } = require('./server/sessions');
const { listTags, createTag, deleteTag, assignTag, unassignTag, updateTag } = require('./server/tags');
const { ensureCabinetDir } = require('./server/storage');

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

function jsonResponse(res, status, data) {
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(data));
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const method = req.method;

  // ── Session API ──────────────────────────────────────
  if (url.pathname === '/api/sessions' && method === 'GET') {
    jsonResponse(res, 200, listAllSessions());
    return;
  }

  if (url.pathname === '/api/session' && method === 'GET') {
    const fp = url.searchParams.get('path');
    if (!fp) {
      jsonResponse(res, 400, { error: 'Missing path parameter' });
      return;
    }
    try {
      const allSessions = listAllSessions();
      const meta = allSessions.find(s => s.filePath === fp) || null;
      const session = loadSession(fp, meta);
      jsonResponse(res, 200, session);
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
      assignTag(body.tag_id, body.session_path);
      jsonResponse(res, 200, { ok: true });
    } catch (e) {
      jsonResponse(res, 400, { error: e.message });
    }
    return;
  }

  if (url.pathname === '/api/tags/unassign' && method === 'POST') {
    try {
      const body = await parseBody(req);
      unassignTag(body.tag_id, body.session_path);
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
  ensureCabinetDir();
  return new Promise((resolve, reject) => {
    server.on('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        reject(new Error(`Port ${port} is already in use.`));
      } else {
        reject(err);
      }
    });
    server.listen(port, () => {
      const actualPort = server.address().port;
      const url = `http://localhost:${actualPort}`;
      console.log(`Chat Cabinet running at ${url}`);
      resolve({ server, port: actualPort, url });
    });
  });
}

module.exports = { startServer };

function parseArgs(argv) {
  const opts = { port: DEFAULT_PORT, help: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--help' || a === '-h') {
      opts.help = true;
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
  startServer({ port: opts.port }).catch(err => {
    console.error(err.message);
    process.exit(1);
  });
}
