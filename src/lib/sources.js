import claudeSvg from 'simple-icons/icons/claude.svg?raw';
import cursorSvg from 'simple-icons/icons/cursor.svg?raw';

export const TAG_COLORS = ['#58a6ff', '#3fb950', '#d29922', '#f85149', '#a78bfa', '#f778ba', '#79c0ff', '#d4a574'];

export const SOURCE_LABELS = {
  'vscode': 'Codex (VS Code)',
  'codex': 'Codex (CLI)',
  'codex_vscode': 'Codex (VS Code)',
  'vscode-insiders': 'VS Code Insiders',
  'vscode-stable': 'VS Code',
  'claude-code': 'Claude Code',
  'cursor': 'Cursor',
};

export const SOURCE_COLORS = {
  'vscode': '#58a6ff',
  'codex': '#58a6ff',
  'codex_vscode': '#58a6ff',
  'vscode-insiders': '#3fb950',
  'vscode-stable': '#d29922',
  'claude-code': '#d4a574',
  'cursor': '#a78bfa',
};

// Icons from simple-icons (claude, cursor); hand-drawn for VS Code / Codex (not in simple-icons)
const _codexIcon = `<svg viewBox="0 0 16 16" fill="currentColor"><path d="M1.5 2A1.5 1.5 0 0 1 3 .5h10A1.5 1.5 0 0 1 14.5 2v12a1.5 1.5 0 0 1-1.5 1.5H3A1.5 1.5 0 0 1 1.5 14V2ZM3 1.5a.5.5 0 0 0-.5.5v12a.5.5 0 0 0 .5.5h10a.5.5 0 0 0 .5-.5V2a.5.5 0 0 0-.5-.5H3Zm2 3a.5.5 0 0 1 .5-.5h5a.5.5 0 0 1 0 1h-5A.5.5 0 0 1 5 4.5Zm0 3a.5.5 0 0 1 .5-.5h5a.5.5 0 0 1 0 1h-5A.5.5 0 0 1 5 7.5Zm0 3a.5.5 0 0 1 .5-.5h3a.5.5 0 0 1 0 1h-3a.5.5 0 0 1-.5-.5Z"/></svg>`;
const _vscodeIcon = `<svg viewBox="0 0 16 16" fill="currentColor"><path d="M11.34 1.13a.5.5 0 0 1 .54.04l2.5 2a.5.5 0 0 1 .12.6L8.83 8l5.67 4.23a.5.5 0 0 1-.12.6l-2.5 2a.5.5 0 0 1-.63.02L4.5 9.67V13.5a.5.5 0 0 1-.82.38l-2.5-2.07a.5.5 0 0 1-.18-.38V4.57a.5.5 0 0 1 .18-.38l2.5-2.07A.5.5 0 0 1 4.5 2.5v3.83l6.75-5.18a.5.5 0 0 1 .09-.02ZM5.5 7.16 3.19 5.38 2 6.37v3.26l1.19.99L5.5 8.84V7.16Zm6.34-4.6L6.83 6.5 11.84 10.44l2.57-1.92v-1.04l-2.57-1.92Z"/></svg>`;

export const SOURCE_ICONS = {
  'vscode': _codexIcon,
  'codex': _codexIcon,
  'codex_vscode': _codexIcon,
  'vscode-insiders': _vscodeIcon,
  'vscode-stable': _vscodeIcon,
  'claude-code': claudeSvg,
  'cursor': cursorSvg,
};

export function getSourceKey(s) {
  return s.source_key || s.source || s.originator || 'codex';
}
