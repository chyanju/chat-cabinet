# Chat Cabinet

A local web-based viewer for browsing AI coding assistant session logs. It aggregates and displays conversation histories from **Codex CLI**, **VS Code Copilot Chat**, **Claude Code**, and **Cursor** in a unified interface.

## Features

- **Multi-source aggregation** — automatically discovers session logs from:
  - Codex CLI (`~/.codex/sessions/` and `~/.codex/archived_sessions/`)
  - VS Code Insiders Copilot Chat debug logs
  - VS Code Stable Copilot Chat debug logs
  - Claude Code (`~/.claude/projects/`)
  - Cursor agent transcripts (`~/.cursor/projects/*/agent-transcripts/`)
- **Search & filter** — full-text search across sessions with source-based filter chips
- **Tag system** — organize sessions with custom color-coded tags
- **Tab interface** — VS Code-style preview/pinned tabs with keyboard shortcuts
- **Detailed conversation view** — renders user messages, assistant replies, tool calls, reasoning traces, and more
- **Markdown rendering** — assistant messages rendered with full Markdown support
- **Export** — download sessions as `.md` or `.txt` with configurable content options

## Tech Stack

- **Frontend:** Vue 3 (Composition API) + Pinia + Shoelace (Web Components) + Vite
- **Backend:** Node.js HTTP server (zero dependencies)

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (v18+)

### Install & Run

```bash
npm install
npm run build
npm start
```

Open **http://localhost:3456** in your browser.

### Development

```bash
npm run dev
```

This starts both the API server (:3456) and Vite dev server (:5173) with HMR. Open **http://localhost:5173** during development.

## Project Structure

```
chat-cabinet/
├── server.js                  # HTTP server (API + static files)
├── server/
│   ├── sessions.js            # Session discovery & loader
│   ├── storage.js             # Persistent storage (~/.cabinet/)
│   ├── tags.js                # Tag CRUD & assignments
│   ├── utils.js               # Shared helpers
│   ├── sources/               # Session discovery adapters
│   │   ├── codex.js
│   │   ├── vscode-copilot.js
│   │   ├── vscode-chat.js
│   │   ├── claude.js
│   │   └── cursor.js
│   └── convert/               # Raw → unified format converters
│       ├── codex.js
│       ├── vscode-copilot.js
│       ├── vscode-chat.js
│       ├── claude.js
│       └── cursor.js
├── src/
│   ├── main.js                # Vue app entry
│   ├── App.vue                # Root component (CSS Grid layout)
│   ├── assets/style.css       # Global CSS variables & shared styles
│   ├── stores/                # Pinia state management
│   │   ├── sessions.js
│   │   ├── tabs.js
│   │   ├── tags.js
│   │   └── ui.js
│   ├── lib/                   # Pure logic (no Vue dependency)
│   │   ├── api.js
│   │   ├── tag-api.js
│   │   ├── sources.js
│   │   ├── format.js
│   │   ├── markdown.js
│   │   └── export.js
│   └── components/
│       ├── layout/            # MenuBar, ActivityBar, StatusBar
│       ├── sidebar/           # SidebarPanel, SessionItem, SourceChips, TagView
│       ├── editor/            # TabItem, EditorArea
│       ├── conversation/      # ConversationView, MessageBlock, ToolCallBlock, etc.
│       └── detail/            # DetailPanel, DetailMetadata, DetailTags, ExportSection
├── index.html                 # Vite entry point
├── vite.config.js
├── docs/
│   └── format.md              # Chat Cabinet format specification
├── package.json
└── LICENSE
```

## License

[MIT](LICENSE)
