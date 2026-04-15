# Changelog

All notable changes to Chat Cabinet are documented in this file.

## [0.3.6] - 2026-04-15

### Added
- **Consent tooltips** — hovering over consent badges shows a Shoelace tooltip explaining the state (e.g. "User explicitly clicked Accept to approve this tool call"); uses same Shoelace style as the Storage help icon
- **Cabinet version in JSON export** — exported Cabinet JSON now includes `cabinet_version` (from package.json) at the top level for format compatibility tracking
- **New consent states** — `setting` (pre-approved via user rule, purple badge), `skipped` (user chose to skip, gray badge), `passed` (executed but consent unknown, amber badge) for finer-grained consent tracking

### Changed
- **VS Code session priority** — chatSessions (with consent data) are now preferred over debug-logs when both exist for the same session, preserving consent fidelity
- **Consent mapping overhaul** — fixed `mapConfirmation` to match actual VS Code `ToolConfirmKind` enum values; types 2/3 now map to `setting` instead of `auto`, type 5 maps to `skipped` instead of `rejected`; legacy boolean `isConfirmed` handled separately
- Sources without consent data (debug-logs, Codex, Claude Code, Cursor, LM Studio) now use `passed` for completed tool calls instead of `unknown`

### Fixed
- **VS Code chatSession tool call dedup** — same tool call appearing in multiple requests (with partial then final consent state) is now deduplicated by `call_id`, keeping only the last (richest) occurrence
- VS Code hidden wrapper tools (e.g. `copilot_fetchWebPage` wrapping `vscode_fetchWebPage_internal`) with `presentation: "hiddenAfterComplete"` are now filtered in addition to `"hidden"`

## [0.3.5] - 2026-04-15

### Added
- **Native Save As dialog** — export now opens a platform-native file picker (via `tauri-plugin-dialog` + `tauri-plugin-fs`) instead of auto-saving to Downloads; browser mode falls back to blob download
- **Session alias** — editable alias field for sessions with display priority (alias > title > timestamp fallback); click-to-edit inline UI with confirm/cancel, stored in SQLite

### Changed
- **Export: agent info** — user messages now include VS Code Copilot agent target (e.g. `USER → agent-name`) matching the conversation renderer
- **Export: tool call duration** — tool call headers now include execution duration in seconds
- **Export: output.urls** — fetched URLs from tool calls are now included in exported text
- **Export: standalone exit_code** — terminal tool calls with no stdout but an exit code are now exported (previously silently dropped)
- **Export: thinking blocks** — removed aggressive 500-char truncation (now exports full content); added model tag and encrypted-content indicator
- **Export: attachment field** — fixed field name mismatch (`att.size` → `att.size_bytes`) so file sizes are properly included
- **Export: attachment type** — generic `file` type is now suppressed to reduce noise; only non-default types shown
- About dialog now lists all 6 supported sources (was missing LM Studio)

### Fixed
- `extractContent` → `extractContentAndAttachments` rename was incomplete in LM Studio converter's singleStep branch (would crash at runtime)

## [0.3.4] - 2026-04-12

### Added
- **File attachment display** — user messages with file attachments (images, documents, etc.) now show a pill with icon, filename, size, and type; currently sourced from LM Studio conversations
- **Confirmation badge redesign** — tool call consent state (`Auto-approved`, `Accepted`, `Rejected`, `Allow All`, `Pending`) is now rendered as color-coded uppercase pill badges (green/blue/red/gray) instead of plain `[Auto]` text, making them visually distinct from tool names

### Changed
- LM Studio system prompts are now emitted as a `role: 'system'` message event in the first turn (instead of `config.system_prompt`)
- LM Studio `token_usage` fields normalized to `{ input, output }` (was using non-spec `total` field)
- `file_edit` URI path shortening now handles Linux (`/home/`) and Windows (`C:\Users\`) paths in addition to macOS

### Fixed
- LM Studio converter was silently dropping file attachment content blocks (`type: 'file'`); now extracted as `attachments[]` on message events
- Format spec (`docs/format.md`) updated to include `lmstudio` as a valid `source.tool` value

## [0.3.3] - 2026-04-12

### Added
- **LM Studio support** — discover and view LM Studio conversations from `~/.lmstudio/conversations/`, with full converter supporting singleStep/multiStep (thinking blocks) and tool calls
- **Linux path support** — VS Code workspace storage paths now scan both macOS (`~/Library/Application Support/`) and Linux (`~/.config/`) locations; all other sources (Codex, Claude Code, Cursor, LM Studio) use `$HOME`-relative paths that work cross-platform
- **Windows path support** — added Windows-specific search paths for all sources: VS Code (`%APPDATA%/Code/`), Codex (`%USERPROFILE%/.codex/`), Claude Code (`%APPDATA%/Claude/projects/`), Cursor (`%APPDATA%/Cursor/projects/`), LM Studio (`%USERPROFILE%/.lmstudio/`)

### Changed
- **ActivityBar layout** — split into top section (cabinet views, stacked downward) and bottom section (settings/management like Tag Management, stacked upward) with `justify-content: space-between`
- Tag color validation now enforces `#rrggbb` hex format on create and update
- View-only tabs no longer show Tags section or Storage toggle (prevents FK constraint errors)
- `readAndConvert()` handles single-JSON format (LM Studio) alongside JSONL
- `openDir()` helper now supports Windows (`explorer`) in addition to macOS (`open`) and Linux (`xdg-open`)

### Fixed
- Removed stale `data.error` check in `refreshActiveSession()` — `fetchSession` now throws consistently
- Removed duplicate `// POST helpers` comment in `api.js`

### Refactored
- Extracted `readAndConvert(row)` shared helper in `sessions.js` — eliminates ~30 lines of duplicated read/parse/convert logic between `loadSession` and `pullSession`

## [0.3.2] - 2026-04-12

### Added
- Shared `src/lib/api-base.js` module (`apiUrl()`, `postJson()`) — eliminates duplication between `api.js` and `tag-api.js`
- Shared `browseForFile()` utility in `import.js` — extracted from 3 duplicate implementations
- Unknown API route 404 catch-all before static file handler
- Complete MIME types for static serving: `.png`, `.ico`, `.gif`, `.webp`, `.woff`, `.woff2`
- Empty tag name validation in `createTag()` and `updateTag()`
- Tag delete confirmation dialog when tag has assignments
- `aria-label` on ActivityBar buttons for screen reader accessibility
- Background thread in Rust to drain Node stdout (prevents pipe blocking)

### Changed
- `fetchSession()` now throws on error (was returning `{error}` object) for consistency; `tabs.js:loadActive` updated to use try/catch
- `tag-api.js` rewritten to use shared `postJson` — fixes swallowed error details
- `pullSession()` is now transactional — reads/converts directly from source without intermediate NULL state
- `module.exports` moved to end of `sessions.js`
- `spawn` errors no longer silently swallowed (`.on('error', ...)`)
- Inline `require`s moved to top-level in `server.js`; extracted `openDir()` helper
- StatusBar guards against view-tab IDs for storage label display
- Tauri CSP set from `null` to restrictive policy (allows jsdelivr CDN for Shoelace)
- Rust `.expect()` replaced with proper error handling (`match` + `eprintln` + `process::exit`)

### Removed
- Dead `.tab-icon-welcome` CSS class in `TabItem.vue`

## [0.3.1] - 2026-04-12

### Added
- Server Info popup in status bar with port, data directory, and mode display
- `/api/info` endpoint returning server metadata
- `/api/reveal-dir` endpoint with path validation
- Reveal source file location button in detail panel
- `syncSessions()` called from frontend refresh action
- URI decoding fix for session paths

### Fixed
- CORS restricted to `localhost:{port}` in production mode
- Port parameter validation (regex + range check ≤ 65535)
- `closeDb()` shutdown handler on SIGINT/SIGTERM
- Timer cleanup on component unmount

### Removed
- Dead `redactMarkdown` function

## [0.3.0] - 2026-04-11

### Added
- **Tauri v2 desktop shell** — native macOS app wrapping the Vue + Node stack
- **Privacy mode** with configurable redaction rules (file paths, emails, IPs, API keys, git URLs)
- **Export system** — configurable Markdown/TXT export with privacy mode integration, plus Cabinet JSON export
- **File import** — drag-and-drop and Ctrl+O file picker for viewing standalone session JSON
- **Model filter chips** in sidebar
- **Storage filter** (Linked / Saved toggle)

### Changed
- Migrated from pure web app to Tauri desktop application
- Shoelace upgraded to 2.20.1

## [0.2.0] - 2026-04-07

### Added
- Welcome tab with drag-and-drop import
- JSON export button in export section
- Tag management system (CRUD, assignment, filter chips)
- Detail panel with metadata, tags, and toggle
- Session list sidebar with source/tag filtering

## [0.1.0] - 2026-04-07

### Added
- Initial release
- Session discovery for Codex CLI, VS Code Copilot, VS Code Chat, Claude Code, and Cursor
- Converters to Chat Cabinet unified JSON format
- Raw HTTP server with SQLite storage (better-sqlite3, WAL mode)
- Vue 3 + Pinia frontend with conversation renderer
- Tab-based session viewer with scroll position preservation
- Confirmation badge display for tool calls
