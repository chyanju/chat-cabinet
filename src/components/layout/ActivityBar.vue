<template>
  <div class="activity-bar">
    <sl-tooltip v-for="view in VIEWS" :key="view.id" :content="view.label" placement="right">
      <button
        class="activity-btn"
        :class="{ active: uiStore.activeView === view.id }"
        @click="uiStore.setView(view.id)"
        v-html="view.icon"
      />
    </sl-tooltip>
  </div>
</template>

<script setup>
import { useUiStore } from '../../stores/ui.js';
import '@shoelace-style/shoelace/dist/components/tooltip/tooltip.js';

const uiStore = useUiStore();

const VIEWS = [
  {
    id: 'source',
    label: 'Local Cabinet',
    icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"/></svg>`,
  },
  {
    id: 'tag',
    label: 'Tag Management',
    icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82z"/><circle cx="7" cy="7" r="1.5" fill="currentColor"/></svg>`,
  },
];
</script>

<style scoped>
.activity-bar {
  grid-area: activity;
  background: var(--bg);
  border-right: 1px solid var(--border);
  display: flex;
  flex-direction: column;
  align-items: center;
  padding-top: 8px;
  gap: 2px;
}

.activity-btn {
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  background: none;
  color: var(--text-muted);
  cursor: pointer;
  border-radius: 6px;
  border-left: 2px solid transparent;
  transition: all 0.15s;
}
.activity-btn:hover {
  color: var(--text);
  background: var(--surface-hover);
}
.activity-btn.active {
  color: var(--text);
  border-left-color: var(--accent);
}
.activity-btn :deep(svg) {
  width: 22px;
  height: 22px;
}
</style>
