<template>
  <li class="session-item" :class="{ active }" @click="onClick" @dblclick="onDblClick">
    <div class="session-item-time">
      <sl-icon v-if="!session.has_data" name="box-arrow-up-right" class="session-item-type-icon" title="Linked"></sl-icon>
      {{ timeStr }}
      <span class="session-item-badge" :style="badgeStyle">{{ srcLabel }}</span>
      <span v-if="session.archived" class="session-item-badge badge-archived">archived</span>
    </div>
    <div v-if="session.title" class="session-item-title">{{ redact(session.title) }}</div>
    <div class="session-item-cwd">{{ redact(shortCwd) }}</div>
    <div class="session-item-id">{{ session.id }}</div>
  </li>
</template>

<script setup>
import { computed, onUnmounted } from 'vue';
import { formatTime } from '../../lib/format.js';
import { SOURCE_LABELS, SOURCE_COLORS, getSourceKey } from '../../lib/sources.js';
import { redact } from '../../lib/redact.js';

import '@shoelace-style/shoelace/dist/components/icon/icon.js';

const props = defineProps({
  session: { type: Object, required: true },
  active: { type: Boolean, default: false },
});

const emit = defineEmits(['select', 'pin']);

const srcKey = computed(() => getSourceKey(props.session));
const srcLabel = computed(() => SOURCE_LABELS[srcKey.value] || srcKey.value);
const srcColor = computed(() => SOURCE_COLORS[srcKey.value] || '#8b949e');
const badgeStyle = computed(() => ({
  background: srcColor.value + '22',
  color: srcColor.value,
}));

const timeStr = computed(() => {
  return props.session.timestamp ? formatTime(props.session.timestamp) : 'Unknown time';
});

const shortCwd = computed(() => {
  const cwd = props.session.cwd || '';
  return cwd.replace(/^\/Users\/[^/]+/, '~').replace(/^\/home\/[^/]+/, '~');
});

let clickTimer = null;

onUnmounted(() => { if (clickTimer) clearTimeout(clickTimer); });

function onClick() {
  if (clickTimer) clearTimeout(clickTimer);
  clickTimer = setTimeout(() => emit('select'), 200);
}

function onDblClick() {
  if (clickTimer) clearTimeout(clickTimer);
  emit('pin');
}
</script>

<style scoped>
.session-item {
  padding: 8px 10px;
  border-radius: var(--radius);
  cursor: pointer;
  margin-bottom: 2px;
  transition: background 0.12s;
}
.session-item:hover {
  background: var(--surface-hover);
}
.session-item.active {
  background: var(--accent-dim);
  border: 1px solid var(--accent);
}

.session-item-id {
  font-size: 10px;
  color: var(--text-muted);
  font-family: 'SF Mono', Menlo, monospace;
}
.session-item-time {
  font-size: 12px;
  font-weight: 500;
  display: flex;
  align-items: center;
  gap: 4px;
}
.session-item-type-icon {
  font-size: 11px;
  color: var(--text-muted);
  flex-shrink: 0;
}
.session-item-cwd {
  font-size: 10px;
  color: var(--text-muted);
  margin-top: 2px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.session-item-title {
  font-size: 11px;
  color: var(--accent);
  margin-top: 2px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.session-item-badge {
  display: inline-block;
  font-size: 9px;
  padding: 1px 5px;
  border-radius: 4px;
  margin-left: 5px;
  vertical-align: middle;
}
.badge-archived {
  background: var(--orange-dim);
  color: var(--orange);
}
</style>
