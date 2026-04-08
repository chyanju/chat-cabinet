<template>
  <div class="tag-view">
    <div class="tag-list-header">
      <span class="tag-list-title">Tags</span>
      <sl-icon-button name="plus-lg" label="Create tag" class="tag-create-btn" @click="showCreate = true" />
    </div>

    <!-- Empty state -->
    <div v-if="tagsStore.tags.length === 0" class="tag-empty">
      <p>No tags yet</p>
      <p class="tag-empty-hint">Create your first tag to organize sessions</p>
    </div>

    <template v-else>
      <!-- All sessions item -->
      <div
        class="tag-list-item"
        :class="{ active: uiStore.activeTagFilters.size === 0 }"
        @click="uiStore.clearTagFilters()"
      >
        <span>All Sessions</span>
        <span class="tag-count">{{ sessionsStore.sessions.length }}</span>
      </div>

      <!-- Tag items -->
      <div
        v-for="tag in tagsStore.tags"
        :key="tag.id"
        class="tag-list-item"
        :class="{ active: uiStore.activeTagFilters.has(tag.id) }"
        @click="uiStore.toggleTag(tag.id)"
      >
        <span class="tag-dot" :style="{ background: tag.color }"></span>
        <span>{{ tag.name }}</span>
        <span class="tag-count">{{ getCount(tag.id) }}</span>
      </div>
    </template>

    <!-- Filtered session list when tags are active -->
    <template v-if="uiStore.activeTagFilters.size > 0">
      <div class="tag-sep"></div>
      <ul class="session-list">
        <SessionItem
          v-for="s in tagFilteredSessions"
          :key="s.filePath"
          :session="s"
          :active="s.filePath === currentPath"
          @select="tabsStore.open(s, true)"
          @pin="tabsStore.open(s, false)"
        />
      </ul>
    </template>

    <!-- Create tag dialog -->
    <sl-dialog :open="showCreate" label="Create Tag" @sl-request-close="showCreate = false">
      <sl-input
        ref="tagNameInput"
        label="Tag name"
        placeholder="Enter tag name..."
        :value="newTagName"
        @sl-input="newTagName = $event.target.value"
        @keydown.enter="doCreate"
      />
      <sl-button slot="footer" variant="primary" @click="doCreate" :disabled="!newTagName.trim()">
        Create
      </sl-button>
    </sl-dialog>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue';
import { useUiStore } from '../../stores/ui.js';
import { useSessionsStore } from '../../stores/sessions.js';
import { useTabsStore } from '../../stores/tabs.js';
import { useTagsStore } from '../../stores/tags.js';
import { TAG_COLORS } from '../../lib/sources.js';
import SessionItem from './SessionItem.vue';

import '@shoelace-style/shoelace/dist/components/icon-button/icon-button.js';
import '@shoelace-style/shoelace/dist/components/dialog/dialog.js';
import '@shoelace-style/shoelace/dist/components/input/input.js';
import '@shoelace-style/shoelace/dist/components/button/button.js';

const uiStore = useUiStore();
const sessionsStore = useSessionsStore();
const tabsStore = useTabsStore();
const tagsStore = useTagsStore();

const showCreate = ref(false);
const newTagName = ref('');

const currentPath = computed(() => tabsStore.activeTab?.sessionPath || null);

const tagFilteredSessions = computed(() => {
  const taggedPaths = new Set(
    tagsStore.assignments
      .filter(a => uiStore.activeTagFilters.has(a.tag_id))
      .map(a => a.session_path)
  );
  return sessionsStore.sessions.filter(s => taggedPaths.has(s.filePath));
});

function getCount(tagId) {
  return tagsStore.assignments.filter(a => a.tag_id === tagId).length;
}

async function doCreate() {
  const name = newTagName.value.trim();
  if (!name) return;
  const color = TAG_COLORS[tagsStore.tags.length % TAG_COLORS.length];
  await tagsStore.create(name, color);
  newTagName.value = '';
  showCreate.value = false;
}
</script>

<style scoped>
.tag-view {
  display: flex;
  flex-direction: column;
  flex: 1;
  overflow-y: auto;
}
.tag-list-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 10px;
}
.tag-list-title {
  font-size: 10px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: var(--text-muted);
}
.tag-create-btn::part(base) {
  color: var(--text-muted);
  font-size: 14px;
  padding: 2px;
}
.tag-create-btn::part(base):hover {
  color: var(--accent);
  background: var(--accent-dim);
}

.tag-empty {
  padding: 24px 14px;
  text-align: center;
  color: var(--text-muted);
}
.tag-empty p { margin: 0 0 4px; }
.tag-empty-hint {
  font-size: 11px;
  opacity: 0.7;
}

.tag-list-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 12px;
  cursor: pointer;
  border-radius: 4px;
  margin: 1px 6px;
  font-size: 12px;
  color: var(--text-muted);
  transition: background 0.1s;
}
.tag-list-item:hover {
  background: var(--surface-hover);
  color: var(--text);
}
.tag-list-item.active {
  background: var(--accent-dim);
  color: var(--accent);
}

.tag-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
}
.tag-count {
  margin-left: auto;
  font-size: 10px;
  color: var(--text-muted);
}

.tag-sep {
  border-top: 1px solid var(--border);
  margin: 6px 0;
}
.session-list {
  list-style: none;
  padding: 0 4px;
  overflow-y: auto;
  flex: 1;
}

/* Dialog overrides */
sl-dialog::part(panel) {
  background: var(--surface);
  border: 1px solid var(--border);
}
sl-dialog::part(title) {
  color: var(--text);
  font-size: 14px;
}
sl-dialog::part(overlay) {
  background: rgba(0, 0, 0, 0.5);
}
</style>
