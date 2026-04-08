<template>
  <div
    class="welcome"
    :class="{ 'drag-over': dragging }"
    @dragenter.prevent="onDragEnter"
    @dragover.prevent="onDragOver"
    @dragleave.prevent="onDragLeave"
    @drop.prevent="onDrop"
  >
    <div class="welcome-inner">
      <div class="welcome-icon">📂</div>
      <div class="welcome-title">Drop a JSON file here</div>
      <div class="welcome-sub">or</div>
      <button class="welcome-browse" @click="onBrowse">Browse for file…</button>
      <div class="welcome-hint">Accepts Chat Cabinet format (.json)</div>
    </div>
    <div v-if="error" class="welcome-error">{{ error }}</div>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import { useTabsStore } from '../../stores/tabs.js';
import { importSessionFromFile } from '../../lib/import.js';

const tabsStore = useTabsStore();
const dragging = ref(false);
const error = ref(null);
let dragCounter = 0;

function onDragEnter() {
  dragCounter++;
  dragging.value = true;
}
function onDragOver() {
  dragging.value = true;
}
function onDragLeave() {
  dragCounter--;
  if (dragCounter <= 0) {
    dragCounter = 0;
    dragging.value = false;
  }
}

async function handleFile(file) {
  if (!file) return;
  error.value = null;
  const result = await importSessionFromFile(file);
  if (result.error) {
    error.value = `Import failed: ${result.error}`;
  } else {
    // Replace the current welcome tab with the imported session
    tabsStore.replaceActiveWithImported(result.data);
  }
}

async function onDrop(e) {
  dragging.value = false;
  dragCounter = 0;
  const file = e.dataTransfer?.files?.[0];
  await handleFile(file);
}

function onBrowse() {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = '.json';
  input.onchange = async () => {
    const file = input.files?.[0];
    await handleFile(file);
  };
  input.click();
}
</script>

<style scoped>
.welcome {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  transition: background 0.2s;
}
.welcome.drag-over {
  background: var(--accent-dim, rgba(0, 120, 212, 0.08));
  outline: 2px dashed var(--accent);
  outline-offset: -12px;
  border-radius: 8px;
}
.welcome-inner {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  color: var(--text-muted);
}
.welcome-icon {
  font-size: 48px;
  margin-bottom: 4px;
  opacity: 0.5;
}
.welcome-title {
  font-size: 14px;
  font-weight: 500;
  color: var(--text);
}
.welcome-sub {
  font-size: 12px;
  color: var(--text-muted);
}
.welcome-browse {
  margin-top: 4px;
  background: none;
  border: 1px solid var(--border);
  color: var(--accent);
  padding: 6px 16px;
  border-radius: 6px;
  cursor: pointer;
  font-size: 12px;
  transition: all 0.15s;
}
.welcome-browse:hover {
  background: var(--accent-dim);
  border-color: var(--accent);
}
.welcome-hint {
  margin-top: 8px;
  font-size: 11px;
  color: var(--text-muted);
  opacity: 0.6;
}
.welcome-error {
  margin-top: 16px;
  padding: 8px 14px;
  background: rgba(220, 50, 50, 0.1);
  border: 1px solid rgba(220, 50, 50, 0.3);
  border-radius: 6px;
  color: #f44;
  font-size: 12px;
}
</style>
