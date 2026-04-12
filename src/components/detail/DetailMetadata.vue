<template>
  <div class="dp-section dp-metadata">
    <div v-if="!session" class="dp-empty">No session selected</div>
    <template v-else>
      <div v-if="title" class="dp-field">
        <span class="dp-field-label">Title</span>
        <span class="dp-field-value dp-field-title">{{ redact(title) }}</span>
      </div>
      <div class="dp-field">
        <span class="dp-field-label">Source</span>
        <span class="dp-field-value">{{ srcLabel }}</span>
      </div>
      <div class="dp-field">
        <span class="dp-field-label">Model</span>
        <span class="dp-field-value">{{ model }}</span>
      </div>
      <div class="dp-field">
        <span class="dp-field-label">Time</span>
        <span class="dp-field-value">{{ formatTime(session.created_at || meta?.timestamp) }}</span>
      </div>
      <div class="dp-field">
        <span class="dp-field-label">CWD</span>
        <span class="dp-field-value dp-field-mono">{{ redact(cwd) }}</span>
      </div>
      <div class="dp-field">
        <span class="dp-field-label">ID</span>
        <span class="dp-field-value dp-field-mono">{{ session.session_id || meta?.id }}</span>
      </div>
      <div class="dp-field">
        <span class="dp-field-label">Turns</span>
        <span class="dp-field-value">{{ session.turns?.length || 0 }}</span>
      </div>
      <div class="dp-field dp-storage-field">
        <span class="dp-field-label">
          Storage
          <sl-tooltip class="dp-storage-tip">
            <div slot="content" class="dp-tip-text">Linked: reads live from source file.<br>Saved: snapshot stored in local database.</div>
            <sl-icon name="question-circle" class="dp-help-icon"></sl-icon>
          </sl-tooltip>
        </span>
        <div class="dp-storage-row">
          <span class="dp-toggle-label" :class="{ active: !isEntity }">Linked</span>
          <sl-switch
            size="small"
            class="dp-storage-toggle"
            :checked="isEntity"
            :disabled="busy || (!isEntity && !hasSourcePath)"
            @sl-change="onToggleStorage($event.target.checked)"
          ></sl-switch>
          <span class="dp-toggle-label" :class="{ active: isEntity }">Saved</span>
          <sl-tooltip v-if="hasSourcePath" class="dp-btn-tip" hoist>
            <div slot="content" class="dp-tip-text">Pull latest version from source</div>
            <button
              class="dp-pull-btn"
              :class="{ success: pullSuccess }"
              :disabled="busy"
              @click="onPull"
            >
              <sl-icon :name="pullSuccess ? 'check-circle' : 'arrow-down-circle'" class="dp-pull-icon"></sl-icon>
              {{ pullSuccess ? 'Done' : 'Pull' }}
            </button>
          </sl-tooltip>
          <sl-tooltip v-if="hasSourcePath" class="dp-btn-tip" hoist>
            <div slot="content" class="dp-tip-text">Open source location</div>
            <button
              class="dp-open-btn"
              @click="onOpenFolder"
            >
              <sl-icon name="folder2-open" class="dp-open-icon"></sl-icon>
              Open
            </button>
          </sl-tooltip>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue';
import { useTabsStore } from '../../stores/tabs.js';
import { useSessionsStore } from '../../stores/sessions.js';
import { formatTime } from '../../lib/format.js';
import { SOURCE_LABELS } from '../../lib/sources.js';
import { redact } from '../../lib/redact.js';
import { saveSession, unsaveSession, pullSession, fetchSession, revealFolder } from '../../lib/api.js';

import '@shoelace-style/shoelace/dist/components/icon/icon.js';
import '@shoelace-style/shoelace/dist/components/switch/switch.js';
import '@shoelace-style/shoelace/dist/components/tooltip/tooltip.js';

const tabsStore = useTabsStore();
const sessionsStore = useSessionsStore();

const session = computed(() => tabsStore.activeSession);
const meta = computed(() => tabsStore.activeMeta);

const title = computed(() => session.value?.title || meta.value?.title || '');

const srcLabel = computed(() => {
  const srcTool = session.value?.source?.tool || meta.value?.source_key || '';
  return SOURCE_LABELS[meta.value?.source_key] || SOURCE_LABELS[srcTool] || srcTool;
});

const model = computed(() => {
  return session.value?.model?.name || session.value?.model?.id || meta.value?.model_provider || 'unknown';
});

const cwd = computed(() => {
  const raw = session.value?.workspace?.cwd || meta.value?.cwd || '';
  return raw.replace(/^\/Users\/[^/]+/, '~').replace(/^\/home\/[^/]+/, '~');
});

const isEntity = computed(() => !!meta.value?.has_data);
const hasSourcePath = computed(() => !!meta.value?.source_path);
const busy = ref(false);
const pullSuccess = ref(false);
let pullTimer = null;

async function refreshActiveSession() {
  // Refresh session list to get updated has_data
  await sessionsStore.refresh();
  // Update the tab's meta from the refreshed list
  const tab = tabsStore.activeTab;
  if (tab) {
    const updated = sessionsStore.sessions.find(s => s.id === tab.sessionPath);
    if (updated) tab.sessionMeta = updated;
    // Reload session data
    const data = await fetchSession(tab.sessionPath);
    if (!data.error) tab.sessionData = data;
  }
}

async function onToggleStorage(checked) {
  if (busy.value) return;
  busy.value = true;
  try {
    if (checked) {
      // Linked → Saved
      await saveSession(meta.value.id);
    } else {
      // Saved → Linked (only if has source_path)
      if (!hasSourcePath.value) return;
      await unsaveSession(meta.value.id);
    }
    await refreshActiveSession();
  } catch (e) {
    console.error('[storage-toggle]', e);
  } finally {
    busy.value = false;
  }
}

async function onPull() {
  if (busy.value || !hasSourcePath.value) return;
  busy.value = true;
  try {
    if (isEntity.value) {
      // Saved: re-read from source and update DB
      await pullSession(meta.value.id);
    }
    // Both: refresh displayed content from source
    await refreshActiveSession();
    pullSuccess.value = true;
    clearTimeout(pullTimer);
    pullTimer = setTimeout(() => { pullSuccess.value = false; }, 1000);
  } catch (e) {
    console.error('[pull]', e);
  } finally {
    busy.value = false;
  }
}

function onOpenFolder() {
  if (!meta.value?.source_path) return;
  revealFolder(meta.value.id);
}
</script>

<style scoped>
.dp-section {
  padding: 10px 12px;
  border-bottom: 1px solid var(--border);
}
.dp-empty {
  font-size: 12px;
  color: var(--text-muted);
  text-align: center;
  padding: 16px;
}
.dp-field {
  display: flex;
  flex-direction: column;
  gap: 2px;
  margin-bottom: 8px;
}
.dp-field:last-child { margin-bottom: 0; }
.dp-field-label {
  font-size: 10px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.3px;
  color: var(--text-muted);
  display: inline-flex;
  align-items: center;
  gap: 4px;
}
.dp-help-icon {
  font-size: 11px;
  color: var(--text-muted);
  cursor: help;
  opacity: 0.7;
}
.dp-help-icon:hover {
  opacity: 1;
}
.dp-storage-tip {
  --sl-tooltip-font-size: 11px;
  --sl-tooltip-padding: 6px 10px;
}
.dp-btn-tip {
  --sl-tooltip-font-size: 11px;
  --sl-tooltip-padding: 6px 10px;
}
.dp-storage-tip::part(body) {
  text-transform: none;
  font-weight: 400;
  letter-spacing: normal;
}
.dp-tip-text {
  text-transform: none;
  font-size: 11px;
  font-weight: 400;
  letter-spacing: normal;
  line-height: 1.4;
}
.dp-field-value {
  font-size: 12px;
  color: var(--text);
  word-break: break-all;
}
.dp-field-mono {
  font-family: 'SF Mono', Menlo, Consolas, monospace;
  font-size: 11px;
}
.dp-field-title {
  color: var(--accent);
}
.dp-storage-field {
  gap: 4px;
}
.dp-storage-row {
  display: flex;
  align-items: center;
  gap: 6px;
}
.dp-toggle-label {
  font-size: 11px;
  color: var(--text-muted);
  transition: color 0.15s;
  user-select: none;
}
.dp-toggle-label.active {
  color: var(--text);
  font-weight: 600;
}
.dp-storage-toggle {
  --height: 16px;
  --width: 30px;
  --thumb-size: 12px;
}
.dp-storage-toggle::part(label) {
  display: none;
}
.dp-pull-btn {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  padding: 3px 8px;
  border: 1px solid var(--border);
  border-radius: 4px;
  background: var(--bg);
  color: var(--text-muted);
  font-size: 11px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.15s;
  margin-left: auto;
}
.dp-pull-btn:hover:not(:disabled) {
  border-color: #3fb950;
  color: #3fb950;
  background: rgba(63, 185, 80, 0.08);
}
.dp-pull-btn.success {
  border-color: #3fb950;
  color: #3fb950;
  background: rgba(63, 185, 80, 0.08);
  cursor: default;
}
.dp-pull-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}
.dp-pull-icon {
  font-size: 12px;
}
.dp-open-btn {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  padding: 3px 8px;
  border: 1px solid var(--border);
  border-radius: 4px;
  background: var(--bg);
  color: var(--text-muted);
  font-size: 11px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.15s;
}
.dp-open-btn:hover {
  border-color: var(--accent);
  color: var(--accent);
  background: var(--accent-dim);
}
.dp-open-icon {
  font-size: 12px;
}
</style>
