<template>
  <div class="statusbar">
    <div class="statusbar-left">
      <span class="statusbar-item">{{ sessionsStore.sessions.length }} sessions</span>
      <span class="statusbar-item">{{ tagsStore.tags.length }} tags</span>
      <span class="statusbar-item">{{ tabsStore.openTabs.length }} tab{{ tabsStore.openTabs.length !== 1 ? 's' : '' }} open</span>
    </div>
    <div class="statusbar-right">
      <span v-if="storageLabel" class="statusbar-item" :class="storageClass">{{ storageLabel }}</span>
      <span v-if="sourceLabel" class="statusbar-item">{{ sourceLabel }}</span>
      <span v-if="modelLabel" class="statusbar-item">{{ modelLabel }}</span>
      <div v-if="uiStore.serverInfo" class="server-wrapper" @mouseenter="showPopup = true" @mouseleave="showPopup = false">
        <span class="statusbar-item server-icon" :class="{ 'is-dev': uiStore.serverInfo.dev }">
          <sl-icon name="hdd-stack" style="font-size: 13px;"></sl-icon>
          <span v-if="uiStore.serverInfo.dev" class="dev-dot"></span>
        </span>
        <div v-if="showPopup" class="server-popup">
          <div class="server-popup-header">
            <sl-icon name="hdd-stack" style="font-size: 14px;"></sl-icon>
            <span>Server Info</span>
            <span v-if="uiStore.serverInfo.dev" class="dev-badge">Dev</span>
          </div>
          <div class="server-popup-rows">
            <div class="server-popup-row">
              <span class="server-popup-label">Mode</span>
              <span class="server-popup-value">{{ uiStore.serverInfo.dev ? 'Development' : 'Production' }}</span>
            </div>
            <div class="server-popup-row">
              <span class="server-popup-label">Port</span>
              <span class="server-popup-value">{{ uiStore.serverInfo.port }}</span>
            </div>
            <div class="server-popup-row">
              <span class="server-popup-label">Data</span>
              <span class="server-popup-value server-popup-path">{{ uiStore.serverInfo.dataDir }}</span>
              <span class="server-popup-open" title="Open data folder" @click="revealDataDir">
                <sl-icon name="box-arrow-up-right" style="font-size: 11px;"></sl-icon>
              </span>
            </div>
            <div class="server-popup-row">
              <span class="server-popup-label">URL</span>
              <a class="server-popup-link" :href="uiStore.serverInfo.url" target="_blank" rel="noopener">{{ uiStore.serverInfo.url }}</a>
              <a class="server-popup-open" :href="uiStore.serverInfo.url" target="_blank" rel="noopener" title="Open in browser">
                <sl-icon name="box-arrow-up-right" style="font-size: 11px;"></sl-icon>
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue';
import { useSessionsStore } from '../../stores/sessions.js';
import { useTabsStore } from '../../stores/tabs.js';
import { useTagsStore } from '../../stores/tags.js';
import { useUiStore } from '../../stores/ui.js';
import { SOURCE_LABELS } from '../../lib/sources.js';
import { revealDir } from '../../lib/api.js';

const sessionsStore = useSessionsStore();
const tabsStore = useTabsStore();
const tagsStore = useTagsStore();
const uiStore = useUiStore();

const showPopup = ref(false);

async function revealDataDir() {
  const info = uiStore.serverInfo;
  if (!info?.dataDir) return;
  try { await revealDir(info.dataDir); } catch {}
}

const sourceLabel = computed(() => {
  const meta = tabsStore.activeMeta;
  if (!meta) return '';
  return SOURCE_LABELS[meta.source_key] || meta.source_key || '';
});

const storageLabel = computed(() => {
  const meta = tabsStore.activeMeta;
  if (!meta) return '';
  if (meta.id?.startsWith('welcome-') || meta.id?.startsWith('import-') || meta.id?.startsWith('view-')) return '';
  if (meta.filePath?.startsWith('view-')) return '';
  return meta.has_data ? 'Saved' : 'Linked';
});

const storageClass = computed(() => {
  const meta = tabsStore.activeMeta;
  if (!meta) return '';
  return meta.has_data ? 'storage-saved' : 'storage-linked';
});

const modelLabel = computed(() => {
  const meta = tabsStore.activeMeta;
  const session = tabsStore.activeSession;
  if (!meta) return '';
  const model = session?.model?.id || meta.model_provider || '';
  return model && model !== 'unknown' ? model : '';
});
</script>

<style scoped>
.statusbar {
  grid-area: statusbar;
  background: var(--statusbar-bg);
  border-top: 1px solid var(--border);
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 12px;
  font-size: 11px;
  color: var(--text-muted);
  z-index: 60;
}

.statusbar-left,
.statusbar-right {
  display: flex;
  align-items: center;
  gap: 12px;
}

.statusbar-item {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  white-space: nowrap;
}
.storage-linked {
  color: var(--text-muted);
}
.storage-saved {
  color: var(--accent);
}

/* Server icon + popup wrapper */
.server-wrapper {
  position: relative;
  display: inline-flex;
  align-items: center;
}
.server-icon {
  cursor: pointer;
  opacity: 0.7;
  display: inline-flex;
  align-items: center;
  position: relative;
}
.server-icon:hover {
  opacity: 1;
}
.server-icon.is-dev {
  opacity: 1;
  color: #d97706;
}
.dev-dot {
  position: absolute;
  top: -2px;
  right: -4px;
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #d97706;
}

/* Popup */
.server-popup {
  position: absolute;
  bottom: calc(100% + 8px);
  right: -8px;
  width: 260px;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 6px;
  box-shadow: 0 4px 16px rgba(0,0,0,0.4);
  padding: 10px 12px;
  z-index: 200;
  font-size: 11px;
}
/* Invisible bridge to cover the gap between icon and popup */
.server-popup::after {
  content: '';
  position: absolute;
  bottom: -10px;
  right: 0;
  width: 100%;
  height: 10px;
}
.server-popup-header {
  display: flex;
  align-items: center;
  gap: 6px;
  padding-bottom: 8px;
  border-bottom: 1px solid var(--border);
  margin-bottom: 8px;
  font-size: 12px;
  font-weight: 600;
  color: var(--text);
}
.dev-badge {
  background: #d97706;
  color: #fff;
  padding: 1px 5px;
  border-radius: 3px;
  font-weight: 600;
  font-size: 9px;
  letter-spacing: 0.3px;
  margin-left: auto;
}
.server-popup-rows {
  display: flex;
  flex-direction: column;
  gap: 5px;
}
.server-popup-row {
  display: flex;
  align-items: baseline;
  gap: 8px;
}
.server-popup-label {
  color: var(--text-muted);
  min-width: 36px;
  flex-shrink: 0;
}
.server-popup-value {
  color: var(--text);
  flex: 1;
  min-width: 0;
}
.server-popup-path {
  font-family: var(--font-mono, monospace);
  font-size: 10px;
  word-break: break-all;
}
.server-popup-link {
  color: var(--accent);
  text-decoration: none;
  font-family: var(--font-mono, monospace);
  font-size: 10px;
  flex: 1;
  min-width: 0;
  word-break: break-all;
}
.server-popup-link:hover {
  text-decoration: underline;
}
.server-popup-open {
  display: inline-flex;
  align-items: center;
  flex-shrink: 0;
  color: var(--text-muted);
  cursor: pointer;
  opacity: 0.6;
  text-decoration: none;
}
.server-popup-open:hover {
  color: var(--accent);
  opacity: 1;
}
</style>
