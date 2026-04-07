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

export function getSourceKey(s) {
  return s.source_key || s.source || s.originator || 'codex';
}
