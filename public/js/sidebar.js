import { escapeHtml, formatTime } from './utils.js';
import { SOURCE_LABELS, SOURCE_COLORS, getSourceKey } from './sources.js';

/**
 * Render source filter chips into the sidebar.
 */
export function renderSourceChips(sessions, activeSourceFilters, { sourceChipsEl, onFilterChange }) {
  const sources = new Map();
  for (const s of sessions) {
    const key = getSourceKey(s);
    sources.set(key, (sources.get(key) || 0) + 1);
  }

  sourceChipsEl.innerHTML = '';

  const allChip = document.createElement('button');
  allChip.className = 'filter-chip' + (activeSourceFilters.size === 0 ? ' active' : '');
  allChip.textContent = `All (${sessions.length})`;
  allChip.addEventListener('click', () => {
    activeSourceFilters.clear();
    onFilterChange();
  });
  sourceChipsEl.appendChild(allChip);

  for (const [key, count] of sources) {
    const chip = document.createElement('button');
    const isActive = activeSourceFilters.has(key);
    chip.className = 'filter-chip' + (isActive ? ' active' : '');
    const color = SOURCE_COLORS[key] || '#8b949e';
    chip.style.setProperty('--chip-color', color);
    chip.innerHTML = `<span class="chip-dot" style="background:${color}"></span>${escapeHtml(SOURCE_LABELS[key] || key)} (${count})`;
    chip.addEventListener('click', () => {
      if (activeSourceFilters.has(key)) activeSourceFilters.delete(key);
      else activeSourceFilters.add(key);
      onFilterChange();
    });
    sourceChipsEl.appendChild(chip);
  }
}

/**
 * Render the session list in the sidebar.
 */
export function renderSessionList(sessions, { filter = '', activeSourceFilters, currentPath, sessionListEl, onSelect }) {
  const q = filter.toLowerCase();
  sessionListEl.innerHTML = '';

  for (const s of sessions) {
    const searchable = `${s.id} ${s.cwd || ''} ${s.timestamp || ''} ${s.model_provider || ''} ${s.cli_version || ''} ${s.source || ''} ${s.source_key || ''} ${s.title || ''}`.toLowerCase();
    if (q && !searchable.includes(q)) continue;

    const srcKey = getSourceKey(s);
    if (activeSourceFilters.size > 0 && !activeSourceFilters.has(srcKey)) continue;

    const li = document.createElement('li');
    if (s.filePath === currentPath) li.classList.add('active');

    const ts = s.timestamp ? formatTime(s.timestamp) : 'Unknown time';
    const shortCwd = s.cwd ? s.cwd.replace(/^\/Users\/[^/]+/, '~') : '';
    const srcLabel = SOURCE_LABELS[srcKey] || srcKey;
    const srcColor = SOURCE_COLORS[srcKey] || '#8b949e';
    let badge = '';
    if (s.archived) {
      badge = '<span class="session-item-badge badge-archived">archived</span>';
    }
    const sourceBadge = `<span class="session-item-badge" style="background:${srcColor}22;color:${srcColor}">${escapeHtml(srcLabel)}</span>`;
    const title = s.title || '';

    li.innerHTML = `
      <div class="session-item-time">${ts} ${sourceBadge}${badge}</div>
      ${title ? `<div class="session-item-title">${escapeHtml(title)}</div>` : ''}
      <div class="session-item-cwd">${escapeHtml(shortCwd)}</div>
      <div class="session-item-id">${s.id}</div>
    `;

    li.addEventListener('click', () => onSelect(s));
    sessionListEl.appendChild(li);
  }
}
