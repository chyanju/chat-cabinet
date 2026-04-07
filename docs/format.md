# Chat Cabinet Unified Format Specification

**Version:** 1  
**Status:** Draft  
**Last Updated:** 2026-04-07

## Overview

Chat Cabinet uses a unified JSON format to represent AI coding assistant
conversations from any source. Raw session logs from different tools (Codex CLI,
VS Code Copilot, Claude Code, Cursor, etc.) are converted into this format at
load time. The frontend renders only this format, ensuring a consistent UI
regardless of the original source.

```
Raw JSONL ──→ Converter (per source) ──→ Chat Cabinet JSON ──→ Unified Renderer
```

## Top-Level Structure

```jsonc
{
  "version": 1,
  "session_id": "uuid",
  "source": { ... },
  "created_at": "ISO-8601",
  "title": "string | null",
  "workspace": { ... },
  "model": { ... },
  "config": { ... },
  "turns": [ ... ]
}
```

### `source`

Identifies where the session came from.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `tool` | string | yes | Source tool identifier. One of: `codex`, `vscode-copilot`, `vscode-chat`, `claude-code`, `cursor` |
| `tool_version` | string | no | Version of the source tool |
| `format` | string | yes | Original file format identifier |
| `file_path` | string | yes | Path to the original session file |

### `workspace`

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `cwd` | string | no | Working directory |
| `git_branch` | string | no | Git branch (Claude Code) |
| `remote_uri` | string | no | VS Code remote URI |

### `model`

Session-level default model. Individual turns may override.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | string | no | Model identifier (e.g. `claude-opus-4-6`) |
| `provider` | string | no | Provider (e.g. `copilot`, `anthropic`) |
| `name` | string | no | Display name |

### `config`

Optional session-level configuration.

| Field | Type | Description |
|-------|------|-------------|
| `approval_policy` | string | `on-request`, `auto-approve` (Codex) |
| `sandbox` | object | `{ type, network_access }` (Codex) |
| `effort` | string | Reasoning effort level (Codex, Claude) |
| `permission_mode` | string | `default`, `acceptEdits`, `plan` (Claude, VS Code) |
| `personality` | string | Agent personality (Codex) |
| `agent_mode` | string | `agent`, `edit`, `ask` (VS Code) |
| `editor_version` | string | Editor version string (VS Code debug-logs) |

---

## Turns

A turn represents one user→assistant exchange cycle.

```jsonc
{
  "turn_id": "string",
  "started_at": "ISO-8601 | null",
  "ended_at": "ISO-8601 | null",
  "model": { "id": "...", "provider": "...", "name": "..." },
  "token_usage": { "input": 0, "output": 0, "cache_read": 0, "cache_write": 0 },
  "duration_ms": 0,
  "events": [ ... ]
}
```

All fields except `events` are optional. Sources without explicit turn
boundaries (Claude Code, Cursor) are split into turns by pairing each user
message with the assistant response that follows.

---

## Events

Every item in `events[]` has a common envelope:

```jsonc
{
  "type": "message | tool_call | thinking | file_edit | status",
  "timestamp": "ISO-8601 | null"
}
```

### `message`

A user, assistant, or system message.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `type` | `"message"` | yes | |
| `timestamp` | string | no | |
| `role` | string | yes | `user`, `assistant`, `system` |
| `content` | string | yes | Markdown text |
| `model` | string | no | Model that generated this (assistant only) |
| `agent` | object | no | `{ id, name }` — VS Code agent info |
| `attachments` | array | no | `[{ type, uri, name }]` |
| `is_command` | boolean | no | Claude Code slash commands |

### `tool_call`

A tool invocation with input, output, and user confirmation state.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `type` | `"tool_call"` | yes | |
| `timestamp` | string | no | |
| `tool_id` | string | yes | Normalized tool name |
| `call_id` | string | no | Original call ID for correlation |
| `status` | string | no | `ok`, `error` |
| `input` | object | no | See Input below |
| `output` | object | no | See Output below |
| `confirmation` | object | no | See Confirmation below |
| `duration_ms` | number | no | |
| `subagent` | object | no | `{ agent_name, prompt, result }` |

#### `input`

| Field | Type | Description |
|-------|------|-------------|
| `command` | string | Shell command (terminal tools) |
| `file_path` | string | Target file (file tools) |
| `query` | string | Search query (search tools) |
| `urls` | string[] | Target URLs (fetch tools) |
| `raw` | string | Raw JSON arguments fallback |

#### `output`

| Field | Type | Description |
|-------|------|-------------|
| `text` | string | Text output |
| `exit_code` | number | Process exit code (terminal tools) |
| `urls` | string[] | Fetched URLs (fetch tools) |
| `error` | string | Error message |
| `truncated` | boolean | Whether output was truncated |

#### `confirmation`

Records whether the user was involved in approving this tool call.

| Field | Type | Description |
|-------|------|-------------|
| `state` | string | One of: `auto`, `accepted`, `rejected`, `allow_all`, `pending`, `unknown` |
| `required` | boolean | Whether user confirmation was required |
| `user_action` | boolean | Whether the user actively participated |
| `message` | string | Confirmation prompt text (if any) |

**State mapping from VS Code `isConfirmed.type`:**

| type | state | user_action | Description |
|------|-------|-------------|-------------|
| 0 | `accepted` | true | User explicitly clicked Accept |
| 1 | `auto` | false | Auto-confirmed, no prompt shown |
| 2 | `rejected` | true | User clicked Reject/Deny |
| 3 | `accepted` | true | User accepted after confirmation dialog |
| 4 | `allow_all` | true | User clicked "Allow All" for the session |
| 5 | `accepted` | true | User explicitly accepted |
| null | `unknown` | null | No confirmation data available |

Sources without confirmation data (Codex CLI, Claude Code, Cursor, VS Code
debug-logs) set `state: "unknown"` and `user_action: null`.

### `thinking`

Model reasoning or chain-of-thought.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `type` | `"thinking"` | yes | |
| `timestamp` | string | no | |
| `content` | string | yes | Thinking text (markdown) |
| `model` | string | no | Model that generated this |
| `summary` | string | no | Summary text (Codex) |
| `encrypted` | boolean | no | Whether content is encrypted (Codex) |

### `file_edit`

A file creation or modification.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `type` | `"file_edit"` | yes | |
| `timestamp` | string | no | |
| `uri` | string | yes | File path |
| `action` | string | no | `create`, `modify`, `delete` |

### `status`

Lifecycle and metadata events.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `type` | `"status"` | yes | |
| `timestamp` | string | no | |
| `kind` | string | yes | Event kind (see below) |
| `label` | string | no | Human-readable label |
| `details` | object | no | Kind-specific data |

**Status kinds:**

| Kind | Description | Details fields |
|------|-------------|----------------|
| `session_start` | Session began | `tool_version`, `editor_version`, `permission_mode` |
| `turn_start` | Turn began | `turn_id`, `approval_policy`, `sandbox`, `model`, `effort` |
| `turn_end` | Turn ended | `turn_id`, `duration_ms` |
| `turn_aborted` | User interrupted | `reason` |
| `task_started` | Task lifecycle | `mode` |
| `task_complete` | Task finished | |
| `llm_request` | LLM API call | `model`, `input_tokens`, `output_tokens`, `ttft_ms`, `duration_ms` |
| `token_count` | Token usage update | `input_tokens`, `output_tokens` |
| `context_compacted` | Context window compacted | |
| `thread_rolled_back` | User rolled back turns | `num_turns` |
| `discovery` | Resource discovery | `category`, `description` |
| `progress` | Progress update | `title` |
| `confirmation` | Continuation prompt | `message`, `used` |
| `elicitation` | Question to user | `state`, `hidden` |
| `error` | Error occurred | `message`, `code`, `isQuotaExceeded`, `isRateLimited` |

---

## Design Principles

1. **No information loss.** If a source provides a field, the converter must
   preserve it. Missing fields are `null` or omitted — never fabricated.

2. **Consistent structure.** All sources produce the same JSON shape. The
   renderer never needs to know which source a session came from.

3. **Graceful degradation.** If a source lacks certain data (e.g. Cursor has no
   timestamps, Codex has no confirmation info), the renderer handles `null`
   values gracefully.

4. **Conversion at load time.** Raw files are converted to Chat Cabinet format
   when the user opens a session. The session list API still returns lightweight
   metadata; only the detail API returns the full converted session.
