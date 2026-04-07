import { fetchSessions, fetchSession } from './js/api.js';
import { escapeHtml, formatTime } from './js/utils.js';
import { SOURCE_LABELS } from './js/sources.js';
import { renderSourceChips, renderSessionList } from './js/sidebar.js';
import { renderSession } from './js/renderers/unified.js';
import { entriesToText, downloadFile } from './js/export.js';

// ── State ────────────────────────────────────────────────
let sessions = [];
let currentPath = null;
let currentSession = null;
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
  currentMeta = s;
  refreshUI();

  placeholder.classList.add('hidden');
  sessionDetail.classList.remove('hidden');
  conversation.innerHTML = '<div class="loading"><div class="spinner"></div>Loading session\u2026</div>';
  sessionHeader.innerHTML = '';

  const session = await fetchSession(s.filePath);
  if (session.error) {
    conversation.innerHTML = `<div class="loading">${escapeHtml(session.error)}</div>`;
    return;
  }
  currentSession = session;
  exportBar.classList.remove('hidden');
  renderDetail(session, s);
}

function renderDetail(session, meta) {
  const srcTool = session.source?.tool || meta.source_key || '';
  const srcLabel = SOURCE_LABELS[meta.source_key] || SOURCE_LABELS[srcTool] || srcTool;
  const model = session.model?.name || session.model?.id || meta.model_provider || 'unknown';
  const cwd = (session.workspace?.cwd || meta.cwd || '').replace(/^\/Users\/[^/]+/, '~');
  const title = session.title || meta.title || '';

  sessionHeader.innerHTML = `
    <span class="meta-chip"><strong>ID</strong> ${escapeHtml(session.session_id || meta.id)}</span>
    <span class="meta-chip"><strong>Time</strong> ${formatTime(session.created_at || meta.timestamp)}</span>
    <span class="meta-chip"><strong>Model</strong> ${escapeHtml(model)}</span>
    <span class="meta-chip"><strong>Source</strong> ${escapeHtml(srcLabel)}</span>
    <span class="meta-chip"><strong>CWD</strong> ${escapeHtml(cwd)}</span>
    ${title ? `<span class="meta-chip"><strong>Title</strong> ${escapeHtml(title)}</span>` : ''}
  `;

  conversation.innerHTML = '';
  renderSession(conversation, session);
}

// ── Events ───────────────────────────────────────────────
searchBox.addEventListener('input', refreshUI);
refreshBtn.addEventListener('click', loadSessions);
exportCfgBtn.addEventListener('click', () => exportPanel.classList.toggle('hidden'));

exportMdBtn.addEventListener('click', () => {
  if (!currentSession || !currentMeta) return;
  const text = entriesToText(currentSession, currentMeta, 'md');
  const ts = (currentMeta.timestamp || '').replace(/[:.]/g, '-').slice(0, 19);
  downloadFile(`session-${ts}.md`, text);
  exportPanel.classList.add('hidden');
});

exportTxtBtn.addEventListener('click', () => {
  if (!currentSession || !currentMeta) return;
  const text = entriesToText(currentSession, currentMeta, 'txt');
  const ts = (currentMeta.timestamp || '').replace(/[:.]/g, '-').slice(0, 19);
  downloadFile(`session-${ts}.txt`, text);
  exportPanel.classList.add('hidden');
});

// ── Init ─────────────────────────────────────────────────
loadSessions();
