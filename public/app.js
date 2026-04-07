import { fetchSessions, fetchSession } from './js/api.js';
import { escapeHtml } from './js/utils.js';
import { SOURCE_LABELS } from './js/sources.js';
import { renderSourceChips, renderSessionList } from './js/sidebar.js';
import { renderSession } from './js/renderers/unified.js';
import { entriesToText, downloadFile } from './js/export.js';
import { initMenuBar } from './js/menubar.js';
import { initActivityBar } from './js/activity-bar.js';
import { openTab, closeTab, pinTab, renderTabBar } from './js/tabs.js';
import { initDetailPanel, renderDetailPanel, renderDetailTags } from './js/detail-panel.js';
import { fetchTags, createTag as apiCreateTag, assignTag as apiAssignTag, unassignTag as apiUnassignTag } from './js/tag-api.js';

// ── Tag color palette ────────────────────────────────────
const TAG_COLORS = ['#58a6ff', '#3fb950', '#d29922', '#f85149', '#a78bfa', '#f778ba', '#79c0ff', '#d4a574'];

// ── State ────────────────────────────────────────────────
let sessions = [];
let activeView = 'source';
const activeSourceFilters = new Set();
const activeTagFilters = new Set();

// Tab state
let openTabs = [];
let activeTabIndex = -1;

// Tag cache
let tagCache = { tags: [], assignments: [] };

// ── DOM refs ─────────────────────────────────────────────
const sessionListEl = document.getElementById('sessionList');
const searchBox = document.getElementById('searchBox');
const refreshBtn = document.getElementById('refreshBtn');
const placeholder = document.getElementById('placeholder');
const sessionDetail = document.getElementById('sessionDetail');
const conversation = document.getElementById('conversation');
const sourceChipsEl = document.getElementById('sourceChips');
const sourceFilterEl = document.getElementById('sourceFilter');
const tabBarEl = document.getElementById('tab-bar');
const editorContent = document.getElementById('editor-content');
const statusbarEl = document.getElementById('statusbar');

// ── Init components ──────────────────────────────────────
initMenuBar(document.getElementById('menubar'));
initActivityBar(document.getElementById('activity-bar'), {
  onViewChange: (view) => {
    activeView = view;
    refreshSidebar();
  },
});
initDetailPanel(document.getElementById('detail-panel'), {
  onToggle: () => {},
});

// ── Tag helpers ──────────────────────────────────────────
function getTagsForSession(sessionPath) {
  const tagIds = tagCache.assignments
    .filter(a => a.session_path === sessionPath)
    .map(a => a.tag_id);
  return tagCache.tags.filter(t => tagIds.includes(t.id));
}

async function refreshTags() {
  tagCache = await fetchTags();
}

// ── Active tab helpers ───────────────────────────────────
function getActiveTab() {
  return activeTabIndex >= 0 ? openTabs[activeTabIndex] : null;
}

function getActiveSession() {
  return getActiveTab()?.sessionData || null;
}

function getActiveMeta() {
  return getActiveTab()?.sessionMeta || null;
}

// ── Sidebar ──────────────────────────────────────────────
function refreshSidebar() {
  const currentPath = getActiveTab()?.sessionPath || null;

  if (activeView === 'source') {
    sourceFilterEl.classList.remove('hidden');
    sessionListEl.classList.remove('hidden');
    renderSourceChips(sessions, activeSourceFilters, { sourceChipsEl, onFilterChange: refreshSidebar });
    renderSessionList(sessions, {
      filter: searchBox.value,
      activeSourceFilters,
      currentPath,
      sessionListEl,
      onSelect: selectSession,
    });
    // Show filter count when filtering is active
    const hasFilter = searchBox.value || activeSourceFilters.size > 0;
    if (hasFilter) {
      const shown = sessionListEl.querySelectorAll('li').length;
      const countEl = document.createElement('div');
      countEl.className = 'filter-count';
      countEl.textContent = `${shown} of ${sessions.length} sessions`;
      sessionListEl.insertBefore(countEl, sessionListEl.firstChild);
    }
  } else if (activeView === 'tag') {
    sourceFilterEl.classList.add('hidden');
    renderTagView();
  }
}

function renderTagView() {
  const currentPath = getActiveTab()?.sessionPath || null;
  sessionListEl.innerHTML = '';

  // Tag list header + create button
  const header = document.createElement('div');
  header.className = 'tag-list-header';
  header.innerHTML = `
    <span class="tag-list-title">Tags</span>
    <button class="tag-create-btn" title="Create tag">+</button>
  `;
  header.querySelector('.tag-create-btn').addEventListener('click', () => {
    const name = prompt('Tag name:');
    if (!name?.trim()) return;
    const color = TAG_COLORS[tagCache.tags.length % TAG_COLORS.length];
    apiCreateTag(name.trim(), color).then(() => refreshTags().then(() => { refreshSidebar(); refreshDetailTags(); }));
  });
  sessionListEl.appendChild(header);

  // Empty state when no tags exist
  if (tagCache.tags.length === 0) {
    const empty = document.createElement('div');
    empty.className = 'tag-empty';
    empty.innerHTML = '<p>No tags yet</p><p class="tag-empty-hint">Create your first tag to organize sessions</p>';
    sessionListEl.appendChild(empty);
    return;
  }

  // "All" item
  const allItem = document.createElement('div');
  allItem.className = 'tag-list-item' + (activeTagFilters.size === 0 ? ' active' : '');
  allItem.innerHTML = `<span>All Sessions</span><span class="tag-count">${sessions.length}</span>`;
  allItem.addEventListener('click', () => { activeTagFilters.clear(); refreshSidebar(); });
  sessionListEl.appendChild(allItem);

  // Each tag
  for (const tag of tagCache.tags) {
    const count = tagCache.assignments.filter(a => a.tag_id === tag.id).length;
    const item = document.createElement('div');
    item.className = 'tag-list-item' + (activeTagFilters.has(tag.id) ? ' active' : '');
    item.innerHTML = `
      <span class="tag-dot" style="background:${tag.color}"></span>
      <span>${escapeHtml(tag.name)}</span>
      <span class="tag-count">${count}</span>
    `;
    item.addEventListener('click', () => {
      if (activeTagFilters.has(tag.id)) activeTagFilters.delete(tag.id);
      else activeTagFilters.add(tag.id);
      refreshSidebar();
    });
    sessionListEl.appendChild(item);
  }

  // Filtered session list below tags
  if (activeTagFilters.size > 0) {
    const taggedPaths = new Set(
      tagCache.assignments
        .filter(a => activeTagFilters.has(a.tag_id))
        .map(a => a.session_path)
    );
    const filtered = sessions.filter(s => taggedPaths.has(s.filePath));

    const sep = document.createElement('div');
    sep.style.cssText = 'border-top:1px solid var(--border);margin:6px 0;';
    sessionListEl.appendChild(sep);

    const list = document.createElement('ul');
    list.style.cssText = 'list-style:none;padding:0 4px;';
    sessionListEl.appendChild(list);

    renderSessionList(filtered, {
      filter: searchBox.value,
      activeSourceFilters: new Set(),
      currentPath,
      sessionListEl: list,
      onSelect: selectSession,
    });
  }
}

function refreshUI() {
  refreshSidebar();
  refreshTabBar();
  refreshStatusBar();
}

// ── Tab management ───────────────────────────────────────
function refreshTabBar() {
  renderTabBar(tabBarEl, openTabs, activeTabIndex, {
    onActivate: activateTab,
    onClose: doCloseTab,
    onPin: doPinTab,
  });
}

function selectSession(meta, opts) {
  const isPreview = opts?.preview !== false;
  const result = openTab(openTabs, activeTabIndex, meta, isPreview);
  openTabs = result.openTabs;
  activeTabIndex = result.activeTabIndex;
  refreshUI();
  loadAndRenderActiveTab();
}

function activateTab(index) {
  if (index === activeTabIndex) return;
  const current = getActiveTab();
  if (current) current.scrollPos = editorContent.scrollTop;

  activeTabIndex = index;
  refreshUI();
  renderActiveTab();
}

function doCloseTab(index) {
  const current = getActiveTab();
  if (current) current.scrollPos = editorContent.scrollTop;

  const result = closeTab(openTabs, activeTabIndex, index);
  openTabs = result.openTabs;
  activeTabIndex = result.activeTabIndex;
  refreshUI();

  if (activeTabIndex >= 0) {
    renderActiveTab();
  } else {
    showPlaceholder();
  }
}

function doPinTab(index) {
  openTabs = pinTab(openTabs, index);
  refreshTabBar();
}

function showPlaceholder() {
  placeholder.classList.remove('hidden');
  sessionDetail.classList.add('hidden');
  conversation.innerHTML = '';
  renderDetailPanel(null, null);
  renderDetailTags([], [], { onAssign: () => {}, onUnassign: () => {}, onCreate: () => {} });
}

async function loadAndRenderActiveTab() {
  const tab = getActiveTab();
  if (!tab) { showPlaceholder(); return; }

  placeholder.classList.add('hidden');
  sessionDetail.classList.remove('hidden');

  if (tab.sessionData) {
    renderTabContent(tab);
    return;
  }

  conversation.innerHTML = '<div class="loading"><div class="spinner"></div>Loading session\u2026</div>';

  const session = await fetchSession(tab.sessionPath);
  if (session.error) {
    conversation.innerHTML = `<div class="loading">${escapeHtml(session.error)}</div>`;
    return;
  }

  tab.sessionData = session;
  if (getActiveTab() === tab) {
    renderTabContent(tab);
  }
}

function renderActiveTab() {
  const tab = getActiveTab();
  if (!tab) { showPlaceholder(); return; }
  if (tab.sessionData) {
    renderTabContent(tab);
  } else {
    loadAndRenderActiveTab();
  }
}

function renderTabContent(tab) {
  const session = tab.sessionData;
  const meta = tab.sessionMeta;

  placeholder.classList.add('hidden');
  sessionDetail.classList.remove('hidden');

  conversation.innerHTML = '';
  renderSession(conversation, session);

  editorContent.scrollTop = tab.scrollPos || 0;

  // Update detail panel
  renderDetailPanel(session, meta);
  refreshDetailTags();
}

function refreshDetailTags() {
  const tab = getActiveTab();
  if (!tab) return;
  const sessionTags = getTagsForSession(tab.sessionPath);

  renderDetailTags(sessionTags, tagCache.tags, {
    onAssign: async (tagId) => {
      await apiAssignTag(tagId, tab.sessionPath);
      await refreshTags();
      refreshDetailTags();
      if (activeView === 'tag') refreshSidebar();
    },
    onUnassign: async (tagId) => {
      await apiUnassignTag(tagId, tab.sessionPath);
      await refreshTags();
      refreshDetailTags();
      if (activeView === 'tag') refreshSidebar();
    },
    onCreate: async (name) => {
      const color = TAG_COLORS[tagCache.tags.length % TAG_COLORS.length];
      const newTag = await apiCreateTag(name, color);
      await apiAssignTag(newTag.id, tab.sessionPath);
      await refreshTags();
      refreshDetailTags();
      if (activeView === 'tag') refreshSidebar();
    },
  });
}

// ── Events ───────────────────────────────────────────────
const searchClear = document.getElementById('searchClear');
searchBox.addEventListener('input', () => {
  searchClear.classList.toggle('hidden', !searchBox.value);
  refreshUI();
});
searchClear.addEventListener('click', () => {
  searchBox.value = '';
  searchClear.classList.add('hidden');
  refreshUI();
});
refreshBtn.addEventListener('click', async () => {
  sessions = await fetchSessions();
  await refreshTags();
  refreshUI();
});

function doExport(format) {
  const session = getActiveSession();
  const meta = getActiveMeta();
  if (!session || !meta) return;
  const text = entriesToText(session, meta, format);
  const ts = (meta.timestamp || '').replace(/[:.]/g, '-').slice(0, 19);
  downloadFile(`session-${ts}.${format}`, text);
}

// Export buttons live in the detail panel; bind after initDetailPanel
document.getElementById('exportMd')?.addEventListener('click', () => doExport('md'));
document.getElementById('exportTxt')?.addEventListener('click', () => doExport('txt'));

// Menu bar events
document.addEventListener('cabinet:close-tab', () => {
  if (activeTabIndex >= 0) doCloseTab(activeTabIndex);
});
document.addEventListener('cabinet:export', (e) => {
  doExport(e.detail?.format || 'md');
});

// Keyboard shortcuts
document.addEventListener('keydown', (e) => {
  // Ctrl+W — close tab
  if (e.ctrlKey && e.key === 'w') {
    e.preventDefault();
    if (activeTabIndex >= 0) doCloseTab(activeTabIndex);
  }
  // Ctrl+Tab — next tab
  if (e.ctrlKey && e.key === 'Tab') {
    e.preventDefault();
    if (openTabs.length > 1) {
      const next = e.shiftKey
        ? (activeTabIndex - 1 + openTabs.length) % openTabs.length
        : (activeTabIndex + 1) % openTabs.length;
      activateTab(next);
    }
  }
  // Ctrl+B — toggle sidebar (not implemented yet, placeholder)
  // Ctrl+Shift+B — toggle detail panel (not implemented yet, placeholder)
});

// ── Status Bar ───────────────────────────────────────────
function refreshStatusBar() {
  const tab = getActiveTab();
  const meta = tab?.sessionMeta;
  const session = tab?.sessionData;

  const leftParts = [];
  leftParts.push(`<span class="statusbar-item">${sessions.length} sessions</span>`);
  leftParts.push(`<span class="statusbar-item">${tagCache.tags.length} tags</span>`);
  leftParts.push(`<span class="statusbar-item">${openTabs.length} tab${openTabs.length !== 1 ? 's' : ''} open</span>`);

  const rightParts = [];
  if (meta) {
    const srcLabel = SOURCE_LABELS[meta.source_key] || meta.source_key || '';
    if (srcLabel) rightParts.push(`<span class="statusbar-item">${escapeHtml(srcLabel)}</span>`);
    const model = session?.model?.id || meta.model_provider || '';
    if (model && model !== 'unknown') rightParts.push(`<span class="statusbar-item">${escapeHtml(model)}</span>`);
  }

  statusbarEl.innerHTML = `
    <div class="statusbar-left">${leftParts.join('')}</div>
    <div class="statusbar-right">${rightParts.join('')}</div>
  `;
}

// ── Init ─────────────────────────────────────────────────
(async () => {
  const [s, t] = await Promise.all([fetchSessions(), fetchTags()]);
  sessions = s;
  tagCache = t;
  refreshUI();
})();
