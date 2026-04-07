import { fetchSessions, fetchSession } from './js/api.js';
import { escapeHtml, formatTime } from './js/utils.js';
import { SOURCE_LABELS, getSourceKey } from './js/sources.js';
import { renderSourceChips, renderSessionList } from './js/sidebar.js';
import { renderCodexSession } from './js/renderers/codex.js';
import { renderVSCodeSession } from './js/renderers/vscode-copilot.js';
import { renderVSCodeChatSession } from './js/renderers/vscode-chat.js';
import { renderClaudeCodeSession } from './js/renderers/claude.js';
import { renderCursorSession } from './js/renderers/cursor.js';
import { entriesToText, downloadFile } from './js/export.js';

// ── State ────────────────────────────────────────────────
let sessions = [];
let currentPath = null;
let currentEntries = null;
let currentMeta = null;
const activeSourceFilters = new Set();

// ── DOM refs ─────────────────────────────────────────────
const sessionListEl = document.getElementById('sessionList');
const searchBox = document.getElementById('searchBox');
const refreshBtn = document.getElementById('refreshBtn');
const placeholder = document.getElementById('placeholder');
const sessionDetail = document.getElementById('sessionDetail');
const sessionHeader = document.getElementById('sessionHeader');
const conversation = document.getElementById('conversation');
const exportBar = document.getElementById('exportBar');
const exportCfgBtn = document.getElementById('exportCfgBtn');
const exportPanel = document.getElementById('exportPanel');
const exportMdBtn = document.getElementById('exportMd');
const exportTxtBtn = document.getElementById('exportTxt');
const sourceChipsEl = document.getElementById('sourceChips');

// ── Helpers ──────────────────────────────────────────────
function refreshUI() {
  renderSourceChips(sessions, activeSourceFilters, { sourceChipsEl, onFilterChange: refreshUI });
  renderSessionList(sessions, {
    filter: searchBox.value,
    activeSourceFilters,
    currentPath,
    sessionListEl,
    onSelect: openSession,
  });
}

async function loadSessions() {
  sessions = await fetchSessions();
  refreshUI();
}

async function openSession(s) {
  currentPath = s.filePath;
  refreshUI();

  placeholder.classList.add('hidden');
  sessionDetail.classList.remove('hidden');
  conversation.innerHTML = '<div class="loading"><div class="spinner"></div>Loading session…</div>';
  sessionHeader.innerHTML = '';

  const entries = await fetchSession(s.filePath);
  currentEntries = entries;
  currentMeta = s;
  exportBar.classList.remove('hidden');
  renderDetail(entries, s);
}

function renderDetail(entries, meta) {
  const srcKey = getSourceKey(meta);
  const srcLabel = SOURCE_LABELS[srcKey] || srcKey;
  sessionHeader.innerHTML = `
    <span class="meta-chip"><strong>ID</strong> ${meta.id}</span>
    <span class="meta-chip"><strong>Time</strong> ${formatTime(meta.timestamp)}</span>
    <span class="meta-chip"><strong>Model</strong> ${escapeHtml(meta.model_provider || 'unknown')}</span>
    <span class="meta-chip"><strong>Source</strong> ${escapeHtml(srcLabel)}</span>
    <span class="meta-chip"><strong>CWD</strong> ${escapeHtml((meta.cwd || '').replace(/^\/Users\/[^/]+/, '~'))}</span>
    ${meta.title ? `<span class="meta-chip"><strong>Title</strong> ${escapeHtml(meta.title)}</span>` : ''}
    ${meta.cli_version && meta.cli_version !== srcLabel ? `<span class="meta-chip"><strong>CLI</strong> ${escapeHtml(meta.cli_version)}</span>` : ''}
  `;

  conversation.innerHTML = '';

  const renderers = {
    'codex':               renderCodexSession,
    'vscode-copilot':      renderVSCodeSession,
    'vscode-chat-session': renderVSCodeChatSession,
    'claude-code':         renderClaudeCodeSession,
    'cursor':              renderCursorSession,
  };

  const render = renderers[meta.format] || renderCodexSession;
  render(conversation, entries);
}

// ── Events ───────────────────────────────────────────────
searchBox.addEventListener('input', refreshUI);
refreshBtn.addEventListener('click', loadSessions);

exportCfgBtn.addEventListener('click', () => exportPanel.classList.toggle('hidden'));

exportMdBtn.addEventListener('click', () => {
  if (!currentEntries || !currentMeta) return;
  const text = entriesToText(currentEntries, currentMeta, 'md');
  const ts = (currentMeta.timestamp || '').replace(/[:.]/g, '-').slice(0, 19);
  downloadFile(`codex-session-${ts}.md`, text);
  exportPanel.classList.add('hidden');
});

exportTxtBtn.addEventListener('click', () => {
  if (!currentEntries || !currentMeta) return;
  const text = entriesToText(currentEntries, currentMeta, 'txt');
  const ts = (currentMeta.timestamp || '').replace(/[:.]/g, '-').slice(0, 19);
  downloadFile(`codex-session-${ts}.txt`, text);
  exportPanel.classList.add('hidden');
});

// ── Init ─────────────────────────────────────────────────
loadSessions();
