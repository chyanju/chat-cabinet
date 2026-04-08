<template>
  <div class="statusbar">
    <div class="statusbar-left">
      <span class="statusbar-item">{{ sessionsStore.sessions.length }} sessions</span>
      <span class="statusbar-item">{{ tagsStore.tags.length }} tags</span>
      <span class="statusbar-item">{{ tabsStore.openTabs.length }} tab{{ tabsStore.openTabs.length !== 1 ? 's' : '' }} open</span>
    </div>
    <div class="statusbar-right">
      <span v-if="sourceLabel" class="statusbar-item">{{ sourceLabel }}</span>
      <span v-if="modelLabel" class="statusbar-item">{{ modelLabel }}</span>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue';
import { useSessionsStore } from '../../stores/sessions.js';
import { useTabsStore } from '../../stores/tabs.js';
import { useTagsStore } from '../../stores/tags.js';
import { SOURCE_LABELS } from '../../lib/sources.js';

const sessionsStore = useSessionsStore();
const tabsStore = useTabsStore();
const tagsStore = useTagsStore();

const sourceLabel = computed(() => {
  const meta = tabsStore.activeMeta;
  if (!meta) return '';
  return SOURCE_LABELS[meta.source_key] || meta.source_key || '';
});

const modelLabel = computed(() => {
  const meta = tabsStore.activeMeta;
  const session = tabsStore.activeSession;
  if (!meta) return '';
  const model = session?.model?.id || meta.model_provider || '';
  return model && model !== 'unknown' ? model : '';
});
</script>

<style scoped>
.statusbar {
  grid-area: statusbar;
  background: var(--statusbar-bg);
  border-top: 1px solid var(--border);
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 12px;
  font-size: 11px;
  color: var(--text-muted);
}

.statusbar-left,
.statusbar-right {
  display: flex;
  align-items: center;
  gap: 12px;
}

.statusbar-item {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  white-space: nowrap;
}
</style>
