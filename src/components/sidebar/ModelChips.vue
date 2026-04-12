<template>
  <div class="model-filter">
    <div class="filter-header" @click="collapsed = !collapsed">
      <span class="filter-label">Models</span>
      <span class="filter-active-count" v-if="collapsed && uiStore.activeModelFilters.size > 0">
        {{ uiStore.activeModelFilters.size }} active
      </span>
      <svg class="filter-chevron" :class="{ collapsed }" viewBox="0 0 12 12" width="12" height="12">
        <path d="M2 4 L6 8 L10 4" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
    </div>
    <div v-show="!collapsed" class="filter-chips">
      <button
        class="filter-chip"
        :class="{ active: uiStore.activeModelFilters.size === 0 }"
        @click="uiStore.clearModelFilters()"
      >
        All ({{ sessionsStore.sessions.length }})
      </button>
      <button
        v-for="[model, count] in modelCounts"
        :key="model"
        class="filter-chip"
        :class="{ active: uiStore.activeModelFilters.has(model) }"
        @click="uiStore.toggleModel(model)"
      >
        {{ model }} ({{ count }})
      </button>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue';
import { useUiStore } from '../../stores/ui.js';
import { useSessionsStore } from '../../stores/sessions.js';

const uiStore = useUiStore();
const sessionsStore = useSessionsStore();
const collapsed = ref(true);

const modelCounts = computed(() => {
  const map = new Map();
  for (const s of sessionsStore.sessions) {
    const model = s.model_provider || 'unknown';
    map.set(model, (map.get(model) || 0) + 1);
  }
  // Sort by count descending
  return [...map.entries()].sort((a, b) => b[1] - a[1]);
});
</script>

<style scoped>
.model-filter {
  padding: 6px 10px 4px;
}
.filter-header {
  display: flex;
  align-items: center;
  cursor: pointer;
  margin-bottom: 4px;
  user-select: none;
}
.filter-label {
  font-size: 10px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: var(--text-muted);
}
.filter-active-count {
  margin-left: 6px;
  font-size: 9px;
  color: var(--accent);
}
.filter-chevron {
  margin-left: auto;
  color: var(--text-muted);
  transition: transform 0.15s;
  flex-shrink: 0;
}
.filter-header:hover .filter-chevron {
  color: var(--text);
}
.filter-chevron.collapsed {
  transform: rotate(-90deg);
}
.filter-chips {
  max-height: 72px;
  overflow-y: auto;
  padding-right: 2px;
}
.filter-chips::-webkit-scrollbar {
  width: 6px;
}
.filter-chips::-webkit-scrollbar-thumb {
  background: var(--border);
  border-radius: 3px;
}
.filter-chips::-webkit-scrollbar-thumb:hover {
  background: var(--text-muted);
}
.filter-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 3px;
  align-content: flex-start;
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
  transition: all 0.12s;
  white-space: nowrap;
}
.filter-chip:hover {
  border-color: var(--text-muted);
  color: var(--text);
}
.filter-chip.active {
  background: var(--accent-dim, rgba(56, 139, 253, 0.15));
  border-color: var(--accent);
  color: var(--accent);
  font-weight: 600;
}
</style>
