# Chat Cabinet

A local web-based viewer for browsing AI coding assistant session logs. It aggregates and displays conversation histories from **OpenAI Codex CLI** and **VS Code Copilot Chat** in a unified interface.

## Features

- **Multi-source aggregation** — automatically discovers session logs from:
  - Codex CLI (`~/.codex/sessions/` and `~/.codex/archived_sessions/`)
  - VS Code Insiders Copilot Chat debug logs
  - VS Code Stable Copilot Chat debug logs
- **Search & filter** — full-text search across sessions with source-based filter chips
- **Detailed conversation view** — renders user messages, assistant replies, tool calls, reasoning traces, and more
- **Markdown rendering** — assistant messages are rendered with full Markdown support via [marked](https://github.com/markedjs/marked)
- **Export** — download sessions as `.md` or `.txt` with configurable content (messages, tool calls, reasoning, system prompts, etc.)

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (v18+)

### Install & Run

```bash
npm install
npm start
```

The server starts at **http://localhost:3456**. Open it in your browser to browse sessions.

## Project Structure

```
chat-cabinet/
├── server.js          # HTTP server & session discovery logic
├── public/
│   ├── index.html     # Main HTML page
│   ├── app.js         # Frontend application logic
│   └── style.css      # Styles (dark theme)
├── package.json
└── LICENSE
```

## License

[MIT](LICENSE)