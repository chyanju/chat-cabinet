<template>
  <div class="dp-section dp-metadata">
    <div v-if="!session" class="dp-empty">No session selected</div>
    <template v-else>
      <div v-if="title" class="dp-field">
        <span class="dp-field-label">Title</span>
        <span class="dp-field-value dp-field-title">{{ title }}</span>
      </div>
      <div class="dp-field">
        <span class="dp-field-label">Source</span>
        <span class="dp-field-value">{{ srcLabel }}</span>
      </div>
      <div class="dp-field">
        <span class="dp-field-label">Model</span>
        <span class="dp-field-value">{{ model }}</span>
      </div>
      <div class="dp-field">
        <span class="dp-field-label">Time</span>
        <span class="dp-field-value">{{ formatTime(session.created_at || meta?.timestamp) }}</span>
      </div>
      <div class="dp-field">
        <span class="dp-field-label">CWD</span>
        <span class="dp-field-value dp-field-mono">{{ cwd }}</span>
      </div>
      <div class="dp-field">
        <span class="dp-field-label">ID</span>
        <span class="dp-field-value dp-field-mono">{{ session.session_id || meta?.id }}</span>
      </div>
      <div class="dp-field">
        <span class="dp-field-label">Turns</span>
        <span class="dp-field-value">{{ session.turns?.length || 0 }}</span>
      </div>
    </template>
  </div>
</template>

<script setup>
import { computed } from 'vue';
import { useTabsStore } from '../../stores/tabs.js';
import { formatTime } from '../../lib/format.js';
import { SOURCE_LABELS } from '../../lib/sources.js';

const tabsStore = useTabsStore();

const session = computed(() => tabsStore.activeSession);
const meta = computed(() => tabsStore.activeMeta);

const title = computed(() => session.value?.title || meta.value?.title || '');

const srcLabel = computed(() => {
  const srcTool = session.value?.source?.tool || meta.value?.source_key || '';
  return SOURCE_LABELS[meta.value?.source_key] || SOURCE_LABELS[srcTool] || srcTool;
});

const model = computed(() => {
  return session.value?.model?.name || session.value?.model?.id || meta.value?.model_provider || 'unknown';
});

const cwd = computed(() => {
  const raw = session.value?.workspace?.cwd || meta.value?.cwd || '';
  return raw.replace(/^\/Users\/[^/]+/, '~').replace(/^\/home\/[^/]+/, '~');
});
</script>

<style scoped>
.dp-section {
  padding: 10px 12px;
  border-bottom: 1px solid var(--border);
}
.dp-empty {
  font-size: 12px;
  color: var(--text-muted);
  text-align: center;
  padding: 16px;
}
.dp-field {
  display: flex;
  flex-direction: column;
  gap: 2px;
  margin-bottom: 8px;
}
.dp-field:last-child { margin-bottom: 0; }
.dp-field-label {
  font-size: 10px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.3px;
  color: var(--text-muted);
}
.dp-field-value {
  font-size: 12px;
  color: var(--text);
  word-break: break-all;
}
.dp-field-mono {
  font-family: 'SF Mono', Menlo, Consolas, monospace;
  font-size: 11px;
}
.dp-field-title {
  color: var(--accent);
}
</style>
