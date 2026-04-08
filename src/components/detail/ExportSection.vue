<template>
  <div v-if="tabsStore.activeSession" class="dp-section dp-export">
    <div class="dp-section-title">Export</div>
    <div class="dp-export-options">
      <sl-checkbox :checked="cfg.userMsg" @sl-change="cfg.userMsg = $event.target.checked">User messages</sl-checkbox>
      <sl-checkbox :checked="cfg.assistantMsg" @sl-change="cfg.assistantMsg = $event.target.checked">Assistant messages</sl-checkbox>
      <sl-checkbox :checked="cfg.toolCalls" @sl-change="cfg.toolCalls = $event.target.checked">Tool calls</sl-checkbox>
      <sl-checkbox :checked="cfg.toolOutput" @sl-change="cfg.toolOutput = $event.target.checked">Tool output</sl-checkbox>
      <sl-checkbox :checked="cfg.reasoning" @sl-change="cfg.reasoning = $event.target.checked">Reasoning</sl-checkbox>
      <sl-checkbox :checked="cfg.systemPrompt" @sl-change="cfg.systemPrompt = $event.target.checked">System prompt</sl-checkbox>
      <sl-checkbox :checked="cfg.events" @sl-change="cfg.events = $event.target.checked">Events</sl-checkbox>
      <sl-checkbox :checked="cfg.timestamps" @sl-change="cfg.timestamps = $event.target.checked">Timestamps</sl-checkbox>
    </div>
    <div class="dp-export-actions">
      <sl-button size="small" variant="primary" outline @click="doExport('md')">.md</sl-button>
      <sl-button size="small" variant="primary" outline @click="doExport('txt')">.txt</sl-button>
    </div>
    <div class="dp-export-json">
      <sl-button size="small" variant="default" outline @click="doExportJson()">Export Cabinet JSON</sl-button>
    </div>
  </div>
</template>

<script setup>
import { reactive } from 'vue';
import { useTabsStore } from '../../stores/tabs.js';
import { entriesToText, downloadFile, sessionToJson } from '../../lib/export.js';

import '@shoelace-style/shoelace/dist/components/checkbox/checkbox.js';
import '@shoelace-style/shoelace/dist/components/button/button.js';

const tabsStore = useTabsStore();

const cfg = reactive({
  userMsg: true,
  assistantMsg: true,
  toolCalls: true,
  toolOutput: false,
  reasoning: false,
  systemPrompt: false,
  events: false,
  timestamps: true,
});

function doExport(format) {
  const session = tabsStore.activeSession;
  const meta = tabsStore.activeMeta;
  if (!session || !meta) return;
  const text = entriesToText(session, meta, format, cfg);
  const ts = (meta.timestamp || new Date().toISOString()).replace(/[:.]/g, '-').slice(0, 19);
  downloadFile(`session-${ts}.${format}`, text);
}

function doExportJson() {
  const session = tabsStore.activeSession;
  const meta = tabsStore.activeMeta;
  if (!session || !meta) return;
  const json = sessionToJson(session);
  const ts = (meta.timestamp || new Date().toISOString()).replace(/[:.]/g, '-').slice(0, 19);
  downloadFile(`session-${ts}.json`, json, 'application/json;charset=utf-8');
}
</script>

<style scoped>
.dp-section {
  padding: 10px 12px;
  border-bottom: 1px solid var(--border);
}
.dp-section-title {
  font-size: 10px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: var(--text-muted);
  margin-bottom: 8px;
}
.dp-export-options {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
/* Shoelace checkbox overrides */
sl-checkbox::part(base) {
  font-size: 11px;
  color: var(--text-muted);
}
sl-checkbox::part(control) {
  width: 14px;
  height: 14px;
}

.dp-export-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 10px;
}
.dp-export-actions sl-button {
  flex: 1 1 0;
  min-width: 0;
}
sl-button::part(base) {
  font-size: 11px;
  width: 100%;
}
.dp-export-json {
  margin-top: 10px;
  padding-top: 10px;
  border-top: 1px solid var(--border);
}
</style>
