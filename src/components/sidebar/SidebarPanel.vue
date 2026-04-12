<template>
  <div class="sidebar">
    <div class="search-wrap">
      <sl-input
        class="search-box"
        placeholder="Search sessions..."
        size="small"
        clearable
        :value="uiStore.searchQuery"
        @sl-input="uiStore.searchQuery = $event.target.value"
        @sl-clear="uiStore.searchQuery = ''"
      >
        <sl-icon name="search" slot="prefix"></sl-icon>
      </sl-input>
      <sl-icon-button
        name="arrow-clockwise"
        label="Refresh"
        class="refresh-btn"
        :class="{ spinning: sessionsStore.loading }"
        @click="onRefresh"
      />
    </div>

    <template v-if="uiStore.activeView === 'source'">
      <StorageChips />
      <SourceChips />
      <ModelChips />
      <TagChips />
      <div class="filter-count" v-if="showCount">
        {{ sessionsStore.filteredSessions.length }} of {{ sessionsStore.sessions.length }} sessions
      </div>
      <div v-if="sessionsStore.loading && sessionsStore.sessions.length === 0" class="sidebar-loading">
        <sl-spinner class="sidebar-spinner"></sl-spinner>
        <span>Loading sessions...</span>
      </div>
      <div v-else-if="sessionsStore.error" class="sidebar-error">
        <strong>Failed to load sessions</strong>
        <div class="sidebar-error-msg">{{ sessionsStore.error }}</div>
        <button class="sidebar-error-retry" @click="onRefresh">Retry</button>
      </div>
      <div
        v-else-if="!sessionsStore.loading && sessionsStore.sessions.length === 0"
        class="sidebar-empty"
      >
        No sessions found.
      </div>
      <ul class="session-list">
        <SessionItem
          v-for="s in sessionsStore.filteredSessions"
          :key="s.id"
          :session="s"
          :active="s.id === currentPath"
          @select="tabsStore.open(s, true)"
          @pin="tabsStore.open(s, false)"
        />
      </ul>
    </template>
    <template v-else-if="uiStore.activeView === 'tag'">
      <TagView />
    </template>
    <div class="sb-resize-handle" @mousedown="startResize"></div>
  </div>
</template>

<script setup>
import { computed } from 'vue';
import { useUiStore } from '../../stores/ui.js';
import { useSessionsStore } from '../../stores/sessions.js';
import { useTabsStore } from '../../stores/tabs.js';
import { useTagsStore } from '../../stores/tags.js';
import StorageChips from './StorageChips.vue';
import SourceChips from './SourceChips.vue';
import ModelChips from './ModelChips.vue';
import TagChips from './TagChips.vue';
import SessionItem from './SessionItem.vue';
import TagView from './TagView.vue';

import '@shoelace-style/shoelace/dist/components/input/input.js';
import '@shoelace-style/shoelace/dist/components/icon/icon.js';
import '@shoelace-style/shoelace/dist/components/icon-button/icon-button.js';
import '@shoelace-style/shoelace/dist/components/spinner/spinner.js';

const uiStore = useUiStore();
const sessionsStore = useSessionsStore();
const tabsStore = useTabsStore();
const tagsStore = useTagsStore();

const currentPath = computed(() => tabsStore.activeTab?.sessionPath || null);
const showCount = computed(() =>
  uiStore.searchQuery ||
  uiStore.activeSourceFilters.size > 0 ||
  uiStore.activeModelFilters.size > 0 ||
  uiStore.activeTagFilters.size > 0 ||
  uiStore.storageFilter !== 'all'
);

async function onRefresh() {
  await Promise.all([sessionsStore.refresh(), tagsStore.refresh()]);
}

function startResize(e) {
  e.preventDefault();
  document.body.style.cursor = 'col-resize';
  document.body.style.userSelect = 'none';

  const appEl = document.getElementById('app-root');
  if (!appEl) return;
  const activityEl = appEl.querySelector('.activity-bar');
  const activityRight = activityEl ? activityEl.getBoundingClientRect().right : appEl.getBoundingClientRect().left + 40;
  let lastWidth = uiStore.sidebarWidth;

  const onMove = (ev) => {
    const raw = ev.clientX - activityRight;
    const clamped = Math.max(200, Math.min(450, raw));
    if (clamped === lastWidth) return;
    lastWidth = clamped;
    // Direct DOM update — bypasses Vue reactivity for smooth dragging
    appEl.style.setProperty('--sidebar-w', clamped + 'px');
  };

  const onUp = () => {
    document.body.style.cursor = '';
    document.body.style.userSelect = '';
    document.removeEventListener('mousemove', onMove);
    document.removeEventListener('mouseup', onUp);
    // Commit final value to Pinia (single reactive update)
    uiStore.setSidebarWidth(lastWidth);
  };

  document.addEventListener('mousemove', onMove);
  document.addEventListener('mouseup', onUp);
}
</script>

<style scoped>
.sidebar {
  grid-area: sidebar;
  position: relative;
  background: var(--surface);
  border-right: 1px solid var(--border);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.sb-resize-handle {
  position: absolute;
  top: 0;
  right: -4px;
  width: 8px;
  height: 100%;
  cursor: col-resize;
  z-index: 10;
  transition: background 0.15s;
}
.sb-resize-handle:hover,
.sb-resize-handle:active {
  background: var(--accent-dim);
}

.search-wrap {
  display: flex;
  align-items: center;
  gap: 6px;
  margin: 8px 10px;
}

.search-box {
  flex: 1;
  min-width: 0;
}

.search-box::part(base) {
  background: var(--bg);
  border-color: var(--border);
  font-size: 12px;
  height: 28px;
}
.search-box::part(base):focus-within {
  border-color: var(--accent);
  box-shadow: none;
}
.search-box::part(prefix) {
  display: flex;
  align-items: center;
  padding-left: 8px;
  color: var(--text-muted);
  font-size: 13px;
}
.search-box::part(input) {
  color: var(--text);
  font-size: 12px;
}

.refresh-btn::part(base) {
  color: var(--text-muted);
  font-size: 14px;
  padding: 4px;
  border-radius: 6px;
}
.refresh-btn::part(base):hover {
  color: var(--text);
  background: var(--surface-hover);
}
.refresh-btn.spinning::part(base) {
  animation: spin 0.8s linear infinite;
}
@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.sidebar-loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 10px;
  padding: 40px 14px;
  color: var(--text-muted);
  font-size: 12px;
}
.sidebar-spinner {
  font-size: 24px;
  --indicator-color: var(--accent);
  --track-color: var(--border);
}

.filter-count {
  padding: 4px 14px;
  font-size: 11px;
  color: var(--text-muted);
}
.sidebar-error {
  margin: 6px 10px;
  padding: 8px 10px;
  border: 1px solid var(--error, #f38ba8);
  border-radius: 6px;
  background: rgba(243, 139, 168, 0.08);
  font-size: 11px;
  color: var(--text);
}
.sidebar-error-msg {
  margin-top: 4px;
  color: var(--text-muted);
  word-break: break-word;
}
.sidebar-error-retry {
  margin-top: 6px;
  background: transparent;
  border: 1px solid var(--border);
  color: var(--text);
  font-size: 11px;
  padding: 3px 10px;
  border-radius: 4px;
  cursor: pointer;
}
.sidebar-error-retry:hover {
  background: var(--surface-hover);
}
.sidebar-empty {
  padding: 8px 14px;
  font-size: 11px;
  color: var(--text-muted);
}
.session-list {
  list-style: none;
  overflow-y: auto;
  flex: 1;
  padding: 4px 6px;
}
</style>
