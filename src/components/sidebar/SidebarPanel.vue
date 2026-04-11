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
        @click="onRefresh"
      />
    </div>

    <template v-if="uiStore.activeView === 'source'">
      <SourceChips />
      <div class="filter-count" v-if="showCount">
        {{ sessionsStore.filteredSessions.length }} of {{ sessionsStore.sessions.length }} sessions
      </div>
      <div v-if="sessionsStore.error" class="sidebar-error">
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
          :key="s.filePath"
          :session="s"
          :active="s.filePath === currentPath"
          @select="tabsStore.open(s, true)"
          @pin="tabsStore.open(s, false)"
        />
      </ul>
    </template>
    <template v-else-if="uiStore.activeView === 'tag'">
      <TagView />
    </template>
  </div>
</template>

<script setup>
import { computed } from 'vue';
import { useUiStore } from '../../stores/ui.js';
import { useSessionsStore } from '../../stores/sessions.js';
import { useTabsStore } from '../../stores/tabs.js';
import { useTagsStore } from '../../stores/tags.js';
import SourceChips from './SourceChips.vue';
import SessionItem from './SessionItem.vue';
import TagView from './TagView.vue';

import '@shoelace-style/shoelace/dist/components/input/input.js';
import '@shoelace-style/shoelace/dist/components/icon/icon.js';
import '@shoelace-style/shoelace/dist/components/icon-button/icon-button.js';

const uiStore = useUiStore();
const sessionsStore = useSessionsStore();
const tabsStore = useTabsStore();
const tagsStore = useTagsStore();

const currentPath = computed(() => tabsStore.activeTab?.sessionPath || null);
const showCount = computed(() => uiStore.searchQuery || uiStore.activeSourceFilters.size > 0);

async function onRefresh() {
  await Promise.all([sessionsStore.refresh(), tagsStore.refresh()]);
}
</script>

<style scoped>
.sidebar {
  grid-area: sidebar;
  background: var(--surface);
  border-right: 1px solid var(--border);
  display: flex;
  flex-direction: column;
  overflow: hidden;
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
