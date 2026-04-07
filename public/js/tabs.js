/**
 * Tab System — VS Code-style preview/pinned tabs.
 *
 * State is managed externally (in app.js). This module provides pure functions
 * that take state in and return new state out, plus a DOM renderer.
 */
import { escapeHtml, formatTimeBrief } from './utils.js';

/**
 * Open or activate a tab.
 * @returns {{ openTabs, activeTabIndex }}
 */
export function openTab(openTabs, activeTabIndex, meta, isPreview) {
  const path = meta.filePath;

  // Already open? Activate it (and pin if requested).
  const existingIdx = openTabs.findIndex(t => t.sessionPath === path);
  if (existingIdx >= 0) {
    if (!isPreview) openTabs[existingIdx].isPreview = false;
    return { openTabs: [...openTabs], activeTabIndex: existingIdx };
  }

  const newTab = {
    sessionPath: path,
    sessionMeta: meta,
    sessionData: null,
    isPreview,
    scrollPos: 0,
  };

  // If preview, replace existing preview tab
  if (isPreview) {
    const previewIdx = openTabs.findIndex(t => t.isPreview);
    if (previewIdx >= 0) {
      const updated = [...openTabs];
      updated[previewIdx] = newTab;
      return { openTabs: updated, activeTabIndex: previewIdx };
    }
  }

  // Insert after active tab
  const insertIdx = activeTabIndex >= 0 ? activeTabIndex + 1 : openTabs.length;
  const updated = [...openTabs];
  updated.splice(insertIdx, 0, newTab);
  return { openTabs: updated, activeTabIndex: insertIdx };
}

/**
 * Close a tab.
 * @returns {{ openTabs, activeTabIndex }}
 */
export function closeTab(openTabs, activeTabIndex, index) {
  const updated = openTabs.filter((_, i) => i !== index);
  let newActive = activeTabIndex;

  if (updated.length === 0) {
    newActive = -1;
  } else if (index === activeTabIndex) {
    // Activate the tab to the right, or the last tab
    newActive = Math.min(index, updated.length - 1);
  } else if (index < activeTabIndex) {
    newActive = activeTabIndex - 1;
  }

  return { openTabs: updated, activeTabIndex: newActive };
}

/**
 * Pin a preview tab.
 */
export function pinTab(openTabs, index) {
  if (index >= 0 && index < openTabs.length) {
    openTabs[index].isPreview = false;
  }
  return [...openTabs];
}

/**
 * Render the tab bar.
 */
export function renderTabBar(tabBarEl, openTabs, activeTabIndex, { onActivate, onClose, onPin }) {
  tabBarEl.innerHTML = '';

  for (let i = 0; i < openTabs.length; i++) {
    const tab = openTabs[i];
    const div = document.createElement('div');
    div.className = 'tab-item' + (i === activeTabIndex ? ' active' : '') + (tab.isPreview ? ' preview' : '');

    // Tab label: use title, or formatted timestamp, or session ID
    const meta = tab.sessionMeta;
    const label = meta.title || (meta.timestamp ? formatTimeBrief(meta.timestamp) : null) || meta.id?.slice(0, 8) || 'Session';

    const dot = tab.isPreview ? '<span class="tab-preview-dot" title="Preview">&#x25CF;</span>' : '';
    div.innerHTML = `
      ${dot}<span class="tab-label" title="${escapeHtml(meta.cwd || meta.id || '')}">${escapeHtml(label)}</span>
      <button class="tab-close" title="Close">&times;</button>
    `;

    // Click to activate
    div.addEventListener('click', (e) => {
      if (e.target.closest('.tab-close')) return;
      onActivate(i);
    });

    // Double-click to pin
    div.addEventListener('dblclick', (e) => {
      if (e.target.closest('.tab-close')) return;
      onPin(i);
    });

    // Close button
    div.querySelector('.tab-close').addEventListener('click', (e) => {
      e.stopPropagation();
      onClose(i);
    });

    // Middle-click to close
    div.addEventListener('auxclick', (e) => {
      if (e.button === 1) {
        e.preventDefault();
        onClose(i);
      }
    });

    tabBarEl.appendChild(div);
  }
}
