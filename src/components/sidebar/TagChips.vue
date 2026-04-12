<template>
  <div v-if="tagsStore.tags.length > 0" class="tag-filter">
    <div class="filter-header" @click="collapsed = !collapsed">
      <span class="filter-label">Tags</span>
      <span class="filter-active-count" v-if="collapsed && uiStore.activeTagFilters.size > 0">
        {{ uiStore.activeTagFilters.size }} active
      </span>
      <svg class="filter-chevron" :class="{ collapsed }" viewBox="0 0 12 12" width="12" height="12">
        <path d="M2 4 L6 8 L10 4" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
    </div>
    <div v-show="!collapsed" class="filter-chips">
      <button
        v-for="tag in tagsStore.tags"
        :key="tag.id"
        class="filter-chip"
        :class="{ active: uiStore.activeTagFilters.has(tag.id) }"
        @click="uiStore.toggleTag(tag.id)"
      >
        <span class="chip-dot" :style="{ background: tag.color }"></span>
        {{ tag.name }} ({{ getCount(tag.id) }})
      </button>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import { useUiStore } from '../../stores/ui.js';
import { useTagsStore } from '../../stores/tags.js';

const uiStore = useUiStore();
const tagsStore = useTagsStore();
const collapsed = ref(false);

function getCount(tagId) {
  return tagsStore.assignments.filter(a => a.tag_id === tagId).length;
}
</script>

<style scoped>
.tag-filter {
  padding: 2px 10px 4px;
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
