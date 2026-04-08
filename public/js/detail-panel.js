/**
 * Detail Panel — right sidebar showing session metadata and tag management.
 */
import { escapeHtml, formatTime } from './utils.js';
import { SOURCE_LABELS } from './sources.js';

let panelEl = null;
let isCollapsed = false;
let resizing = false;
let onToggleCb = null;

export function toggleDetailPanel() {
  if (!panelEl) return;
  isCollapsed = !isCollapsed;
  document.getElementById('app').classList.toggle('detail-collapsed', isCollapsed);
  if (onToggleCb) onToggleCb(isCollapsed);
}

export function initDetailPanel(el, { onToggle }) {
  panelEl = el;
  onToggleCb = onToggle;

  // Build panel structure
  el.innerHTML = `
    <div class="dp-header">
      <span class="dp-title">Details</span>
    </div>
    <div class="dp-content">
      <div class="dp-section dp-metadata"></div>
      <div class="dp-section dp-tags">
        <div class="dp-section-title">Tags</div>
        <div class="dp-tags-list"></div>
        <div class="dp-tag-add">
          <button class="dp-tag-add-btn" title="Add tag">+</button>
        </div>
      </div>
      <div class="dp-section dp-export hidden">
        <div class="dp-section-title">Export</div>
        <div class="dp-export-options">
          <label><input type="checkbox" id="expUserMsg" checked> User messages</label>
          <label><input type="checkbox" id="expAssistantMsg" checked> Assistant messages</label>
          <label><input type="checkbox" id="expToolCalls" checked> Tool calls</label>
          <label><input type="checkbox" id="expToolOutput"> Tool output</label>
          <label><input type="checkbox" id="expReasoning"> Reasoning</label>
          <label><input type="checkbox" id="expSystemPrompt"> System prompt</label>
          <label><input type="checkbox" id="expEvents"> Events</label>
          <label><input type="checkbox" id="expTimestamps" checked> Timestamps</label>
        </div>
        <div class="dp-export-actions">
          <button id="exportMd">Export .md</button>
          <button id="exportTxt">Export .txt</button>
        </div>
      </div>
    </div>
    <div class="dp-resize-handle"></div>
  `;

  // Resize handle
  const handle = el.querySelector('.dp-resize-handle');
  handle.addEventListener('mousedown', (e) => {
    e.preventDefault();
    resizing = true;
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';

    const onMove = (e) => {
      const appRect = document.getElementById('app').getBoundingClientRect();
      const newWidth = appRect.right - e.clientX;
      const clamped = Math.max(200, Math.min(400, newWidth));
      document.documentElement.style.setProperty('--detail-panel-w', clamped + 'px');
    };

    const onUp = () => {
      resizing = false;
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
    };

    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  });
}

export function renderDetailPanel(session, meta) {
  if (!panelEl) return;
  const metaEl = panelEl.querySelector('.dp-metadata');
  if (!metaEl) return;

  if (!session || !meta) {
    metaEl.innerHTML = '<div class="dp-empty">No session selected</div>';
    panelEl.querySelector('.dp-tags-list').innerHTML = '';
    const exportEl = panelEl.querySelector('.dp-export');
    if (exportEl) exportEl.classList.add('hidden');
    return;
  }

  const exportEl = panelEl.querySelector('.dp-export');
  if (exportEl) exportEl.classList.remove('hidden');

  const srcTool = session.source?.tool || meta.source_key || '';
  const srcLabel = SOURCE_LABELS[meta.source_key] || SOURCE_LABELS[srcTool] || srcTool;
  const model = session.model?.name || session.model?.id || meta.model_provider || 'unknown';
  const cwd = (session.workspace?.cwd || meta.cwd || '').replace(/^\/Users\/[^/]+/, '~').replace(/^\/home\/[^/]+/, '~');
  const title = session.title || meta.title || '';
  const turnCount = session.turns?.length || 0;

  metaEl.innerHTML = `
    ${title ? `<div class="dp-field"><span class="dp-field-label">Title</span><span class="dp-field-value dp-field-title">${escapeHtml(title)}</span></div>` : ''}
    <div class="dp-field"><span class="dp-field-label">Source</span><span class="dp-field-value">${escapeHtml(srcLabel)}</span></div>
    <div class="dp-field"><span class="dp-field-label">Model</span><span class="dp-field-value">${escapeHtml(model)}</span></div>
    <div class="dp-field"><span class="dp-field-label">Time</span><span class="dp-field-value">${formatTime(session.created_at || meta.timestamp)}</span></div>
    <div class="dp-field"><span class="dp-field-label">CWD</span><span class="dp-field-value dp-field-mono">${escapeHtml(cwd)}</span></div>
    <div class="dp-field"><span class="dp-field-label">ID</span><span class="dp-field-value dp-field-mono">${escapeHtml(session.session_id || meta.id)}</span></div>
    <div class="dp-field"><span class="dp-field-label">Turns</span><span class="dp-field-value">${turnCount}</span></div>
  `;
}

/**
 * Render tags for the current session in the detail panel.
 * @param {Array} sessionTags - tags assigned to this session
 * @param {Array} allTags - all available tags
 * @param {{ onAssign, onUnassign, onCreate }} callbacks
 */
export function renderDetailTags(sessionTags, allTags, { onAssign, onUnassign, onCreate }) {
  if (!panelEl) return;
  const listEl = panelEl.querySelector('.dp-tags-list');
  const addBtn = panelEl.querySelector('.dp-tag-add-btn');
  if (!listEl) return;

  // Render assigned tags
  listEl.innerHTML = '';
  for (const tag of sessionTags) {
    const chip = document.createElement('div');
    chip.className = 'dp-tag-chip';
    chip.innerHTML = `
      <span class="dp-tag-dot" style="background:${tag.color}"></span>
      <span class="dp-tag-name">${escapeHtml(tag.name)}</span>
      <button class="dp-tag-remove" title="Remove tag">&times;</button>
    `;
    chip.querySelector('.dp-tag-remove').addEventListener('click', () => onUnassign(tag.id));
    listEl.appendChild(chip);
  }

  // Add tag button — show input
  const newAddBtn = addBtn.cloneNode(true);
  addBtn.parentNode.replaceChild(newAddBtn, addBtn);

  newAddBtn.addEventListener('click', () => {
    showTagInput(listEl, allTags, sessionTags, { onAssign, onCreate });
  });
}

function showTagInput(listEl, allTags, sessionTags, { onAssign, onCreate }) {
  // Don't show multiple inputs
  if (listEl.parentElement.querySelector('.dp-tag-input-wrap')) return;

  const assignedIds = new Set(sessionTags.map(t => t.id));
  const wrap = document.createElement('div');
  wrap.className = 'dp-tag-input-wrap';
  wrap.innerHTML = `
    <input type="text" class="dp-tag-input" placeholder="Type tag name..." autofocus>
    <div class="dp-tag-suggestions"></div>
  `;

  const input = wrap.querySelector('.dp-tag-input');
  const suggestions = wrap.querySelector('.dp-tag-suggestions');

  function updateSuggestions() {
    const q = input.value.toLowerCase().trim();
    suggestions.innerHTML = '';
    if (!q) { suggestions.style.display = 'none'; return; }

    const filtered = allTags.filter(t => !assignedIds.has(t.id) && t.name.toLowerCase().includes(q));
    if (filtered.length === 0 && q) {
      const item = document.createElement('div');
      item.className = 'dp-tag-suggestion new';
      item.innerHTML = `Create "<strong>${escapeHtml(q)}</strong>"`;
      item.addEventListener('click', () => {
        onCreate(q);
        wrap.remove();
      });
      suggestions.appendChild(item);
    } else {
      for (const tag of filtered.slice(0, 5)) {
        const item = document.createElement('div');
        item.className = 'dp-tag-suggestion';
        item.innerHTML = `<span class="dp-tag-dot" style="background:${tag.color}"></span>${escapeHtml(tag.name)}`;
        item.addEventListener('click', () => {
          onAssign(tag.id);
          wrap.remove();
        });
        suggestions.appendChild(item);
      }
      // Also offer create if no exact match
      if (!allTags.some(t => t.name.toLowerCase() === q)) {
        const item = document.createElement('div');
        item.className = 'dp-tag-suggestion new';
        item.innerHTML = `Create "<strong>${escapeHtml(q)}</strong>"`;
        item.addEventListener('click', () => {
          onCreate(q);
          wrap.remove();
        });
        suggestions.appendChild(item);
      }
    }
    suggestions.style.display = '';
  }

  input.addEventListener('input', updateSuggestions);
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') { wrap.remove(); return; }
    if (e.key === 'Enter') {
      const q = input.value.trim();
      if (!q) return;
      const exact = allTags.find(t => t.name.toLowerCase() === q.toLowerCase() && !assignedIds.has(t.id));
      if (exact) {
        onAssign(exact.id);
      } else {
        onCreate(q);
      }
      wrap.remove();
    }
  });

  // Close on outside click
  setTimeout(() => {
    const handler = (e) => {
      if (!wrap.contains(e.target)) { wrap.remove(); document.removeEventListener('click', handler); }
    };
    document.addEventListener('click', handler);
  }, 0);

  listEl.parentElement.insertBefore(wrap, listEl.parentElement.querySelector('.dp-tag-add'));
  input.focus();
}
