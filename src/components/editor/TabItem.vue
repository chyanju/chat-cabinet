<template>
  <div
    class="tab-item"
    :class="{ active, preview: tab.isPreview }"
    @click="emit('activate')"
    @dblclick="emit('pin')"
    @auxclick.middle.prevent="emit('close')"
  >
    <span class="tab-icon" :style="{ color: iconColor }" v-html="iconSvg"></span>
    <span class="tab-label" :title="tab.sessionMeta?.cwd || tab.sessionMeta?.id || ''">{{ label }}</span>
    <button class="tab-close" title="Close" @click.stop="emit('close')">&times;</button>
  </div>
</template>

<script setup>
import { computed } from 'vue';
import { formatTabDate } from '../../lib/format.js';
import { SOURCE_ICONS, SOURCE_COLORS, getSourceKey } from '../../lib/sources.js';

const props = defineProps({
  tab: { type: Object, required: true },
  active: { type: Boolean, default: false },
});

const emit = defineEmits(['activate', 'close', 'pin']);

const meta = computed(() => props.tab.sessionMeta || {});
const srcKey = computed(() => getSourceKey(meta.value));
const iconSvg = computed(() => SOURCE_ICONS[srcKey.value] || '');
const iconColor = computed(() => SOURCE_COLORS[srcKey.value] || '');
const label = computed(() => {
  return meta.value.title || formatTabDate(meta.value.timestamp) || meta.value.id?.slice(0, 8) || 'Session';
});
</script>

<style scoped>
.tab-item {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 0 12px;
  font-size: 12px;
  color: var(--text-muted);
  background: var(--surface);
  border-right: 1px solid var(--border);
  cursor: pointer;
  white-space: nowrap;
  max-width: 200px;
  min-width: 0;
  transition: background 0.1s;
  user-select: none;
}
.tab-item:hover {
  background: var(--surface-hover);
}
.tab-item.active {
  background: var(--bg);
  color: var(--text);
  border-bottom: 1px solid var(--bg);
  margin-bottom: -1px;
}
.tab-item.preview .tab-label {
  font-style: italic;
}
.tab-icon {
  display: flex;
  align-items: center;
  flex-shrink: 0;
}
.tab-icon :deep(svg) {
  width: 14px;
  height: 14px;
  fill: currentColor;
}
.tab-label {
  overflow: hidden;
  text-overflow: ellipsis;
}
.tab-close {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 18px;
  height: 18px;
  border-radius: 4px;
  border: none;
  background: none;
  color: var(--text-muted);
  cursor: pointer;
  font-size: 14px;
  opacity: 0;
  flex-shrink: 0;
  transition: opacity 0.1s, background 0.1s;
}
.tab-item:hover .tab-close,
.tab-item.active .tab-close {
  opacity: 1;
}
.tab-close:hover {
  background: var(--surface-hover);
  color: var(--text);
}
</style>
