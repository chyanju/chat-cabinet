<template>
  <div class="detail-panel" v-show="!uiStore.detailCollapsed">
    <div class="dp-resize-handle" @mousedown="startResize"></div>
    <div class="dp-header">
      <span class="dp-title">Details</span>
    </div>
    <div class="dp-content">
      <DetailMetadata />
      <DetailTags />
      <ExportSection />
    </div>
  </div>
</template>

<script setup>
import { useUiStore } from '../../stores/ui.js';
import DetailMetadata from './DetailMetadata.vue';
import DetailTags from './DetailTags.vue';
import ExportSection from './ExportSection.vue';

const uiStore = useUiStore();

function startResize(e) {
  e.preventDefault();
  document.body.style.cursor = 'col-resize';
  document.body.style.userSelect = 'none';

  const onMove = (e) => {
    const appEl = document.getElementById('app-root') || document.getElementById('app');
    if (!appEl) return;
    const appRect = appEl.getBoundingClientRect();
    const newWidth = appRect.right - e.clientX;
    uiStore.setDetailWidth(newWidth);
  };

  const onUp = () => {
    document.body.style.cursor = '';
    document.body.style.userSelect = '';
    document.removeEventListener('mousemove', onMove);
    document.removeEventListener('mouseup', onUp);
  };

  document.addEventListener('mousemove', onMove);
  document.addEventListener('mouseup', onUp);
}
</script>

<style scoped>
.detail-panel {
  grid-area: detailpanel;
  background: var(--surface);
  border-left: 1px solid var(--border);
  overflow-y: auto;
  overflow-x: hidden;
  position: relative;
}
.dp-resize-handle {
  position: absolute;
  top: 0;
  left: -4px;
  width: 8px;
  height: 100%;
  cursor: col-resize;
  z-index: 10;
}
.dp-resize-handle::after {
  content: '';
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 2px;
  height: 24px;
  background: var(--border);
  border-radius: 1px;
  opacity: 0;
  transition: opacity 0.15s;
}
.dp-resize-handle:hover {
  background: var(--accent);
  opacity: 0.3;
}
.dp-resize-handle:hover::after {
  opacity: 1;
}

.dp-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 12px;
  border-bottom: 1px solid var(--border);
  position: sticky;
  top: 0;
  background: var(--surface);
  z-index: 5;
}
.dp-title {
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: var(--text-muted);
}
.dp-content {
  padding: 0;
}
</style>
