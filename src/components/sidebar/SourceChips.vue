<template>
  <div class="source-filter">
    <div class="filter-label">Sources</div>
    <div class="filter-chips">
      <button
        class="filter-chip"
        :class="{ active: uiStore.activeSourceFilters.size === 0 }"
        @click="uiStore.clearSourceFilters()"
      >
        All ({{ sessionsStore.sessions.length }})
      </button>
      <button
        v-for="[key, count] in sourceCounts"
        :key="key"
        class="filter-chip"
        :class="{ active: uiStore.activeSourceFilters.has(key) }"
        @click="uiStore.toggleSource(key)"
      >
        <span class="chip-dot" :style="{ background: SOURCE_COLORS[key] || '#8b949e' }"></span>
        {{ SOURCE_LABELS[key] || key }} ({{ count }})
      </button>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue';
import { useUiStore } from '../../stores/ui.js';
import { useSessionsStore } from '../../stores/sessions.js';
import { SOURCE_LABELS, SOURCE_COLORS, getSourceKey } from '../../lib/sources.js';

const uiStore = useUiStore();
const sessionsStore = useSessionsStore();

const sourceCounts = computed(() => {
  const map = new Map();
  for (const s of sessionsStore.sessions) {
    const key = getSourceKey(s);
    map.set(key, (map.get(key) || 0) + 1);
  }
  return [...map.entries()];
});
</script>

<style scoped>
.source-filter {
  padding: 6px 10px 4px;
}
.filter-label {
  font-size: 10px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: var(--text-muted);
  margin-bottom: 4px;
}
.filter-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 3px;
}
.filter-chip {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  background: var(--bg);
  border: 1px solid var(--border);
  border-radius: 12px;
  padding: 2px 8px;
  font-size: 10px;
  color: var(--text-muted);
  cursor: pointer;
  transition: all 0.15s;
  white-space: nowrap;
}
.filter-chip:hover {
  background: var(--surface-hover);
  color: var(--text);
  border-color: var(--text-muted);
}
.filter-chip.active {
  background: var(--accent-dim);
  border-color: var(--accent);
  color: var(--accent);
}
.chip-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  flex-shrink: 0;
}
</style>
