<template>
  <div class="storage-filter">
    <div class="filter-header" @click="collapsed = !collapsed">
      <span class="filter-label">Storage</span>
      <span class="filter-active-count" v-if="collapsed && uiStore.storageFilter !== 'all'">
        1 active
      </span>
      <svg class="filter-chevron" :class="{ collapsed }" viewBox="0 0 12 12" width="12" height="12">
        <path d="M2 4 L6 8 L10 4" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
    </div>
    <div v-show="!collapsed" class="filter-chips">
      <button
        class="filter-chip"
        :class="{ active: uiStore.storageFilter === 'all' }"
        @click="uiStore.setStorageFilter('all')"
      >
        All ({{ sessionsStore.sessions.length }})
      </button>
      <button
        class="filter-chip"
        :class="{ active: uiStore.storageFilter === 'linked' }"
        @click="uiStore.setStorageFilter('linked')"
      >
        Linked ({{ linkedCount }})
      </button>
      <button
        class="filter-chip"
        :class="{ active: uiStore.storageFilter === 'saved' }"
        @click="uiStore.setStorageFilter('saved')"
      >
        Saved ({{ savedCount }})
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
const collapsed = ref(false);

const linkedCount = computed(() => sessionsStore.sessions.filter(s => !s.has_data).length);
const savedCount = computed(() => sessionsStore.sessions.filter(s => !!s.has_data).length);
</script>

<style scoped>
.storage-filter {
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
</style>
