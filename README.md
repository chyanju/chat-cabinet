<h1><img src="public/logo.png" width="28" height="28" alt="icon" style="vertical-align: middle;" />&nbsp;Chat Cabinet</h1>

A local viewer for browsing AI coding assistant session logs from Codex CLI, VS Code Copilot Chat, Claude Code, and Cursor.

## What It Does

- Automatically discovers local session logs from supported tools
- Lets you search, filter, tag, and inspect conversations in one UI
- **Privacy Mode** — redact sensitive info (file paths, emails, API keys, IPs, etc.) with configurable presets
- **Export** — export sessions to Markdown, plain text, or Cabinet JSON with selectable fields
- Supports both desktop GUI mode and browser/headless mode

## Run It

### Desktop GUI

Requirements:
- Node.js 18+
- Rust toolchain

```bash
npm install
npm run tauri:dev
```

For a production desktop bundle:

```bash
npm run tauri:build
```

The desktop app starts its backend on any available local port automatically.

### Browser / Headless Mode

```bash
npm install
npm run build
node server.js
```

Default URL: `http://localhost:3456`

```bash
node server.js --port 8080
node server.js --help
```

### Browser Dev Mode

```bash
npm run dev
```

This runs:
- API server on `3456`
- Vite dev server on `5173`

Open `http://localhost:5173`

## Stack

- Tauri 2 desktop shell
- Vue 3 + Pinia + Vite frontend
- Node.js backend

## Project Layout

```bash
chat-cabinet/
├── src-tauri/   # Tauri desktop shell
├── server/      # Session discovery, conversion, tag storage
├── src/         # Vue frontend
├── public/      # Static assets
├── server.js    # Headless/browser server entry
└── docs/        # Format notes
```

## License

[MIT](LICENSE)
