<template>
  <div class="menubar">
    <div class="menubar-brand">
      <img src="/logo.png" alt="" class="menubar-brand-icon">
      <span>Chat Cabinet</span>
    </div>

    <sl-dropdown ref="fileDropdown" @sl-show="openMenu = 'file'" @sl-hide="onHide('file')">
      <div slot="trigger" class="menubar-item" :class="{ open: openMenu === 'file' }"
           @mouseenter="onHover('file')">File</div>
      <sl-menu @sl-select="onFileSelect">
        <sl-menu-item value="open-file">
          Open Session from File
          <span slot="suffix" class="menubar-shortcut">Ctrl+O</span>
        </sl-menu-item>
        <sl-divider></sl-divider>
        <sl-menu-item value="close-tab">
          Close Tab
          <span slot="suffix" class="menubar-shortcut">Ctrl+W</span>
        </sl-menu-item>
      </sl-menu>
    </sl-dropdown>

    <sl-dropdown ref="helpDropdown" @sl-show="openMenu = 'help'" @sl-hide="onHide('help')">
      <div slot="trigger" class="menubar-item" :class="{ open: openMenu === 'help' }"
           @mouseenter="onHover('help')">Help</div>
      <sl-menu @sl-select="onHelpSelect">
        <sl-menu-item value="github">View on GitHub</sl-menu-item>
        <sl-divider></sl-divider>
        <sl-menu-item value="about">About Chat Cabinet</sl-menu-item>
      </sl-menu>
    </sl-dropdown>

    <div class="menubar-right">
      <!-- Export -->
      <div class="popover-wrapper" @mouseenter="showExport = true" @mouseleave="showExport = false">
        <button class="menubar-icon-btn" title="Export">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/>
            <polyline points="7 10 12 15 17 10"/>
            <line x1="12" y1="15" x2="12" y2="3"/>
          </svg>
        </button>
        <Transition name="fade">
          <div v-show="showExport" class="menubar-popover export-popover">
            <div class="popover-header">Export</div>
            <div class="popover-options">
              <sl-checkbox :checked="exportCfg.userMsg" @sl-change="exportCfg.userMsg = $event.target.checked">User messages</sl-checkbox>
              <sl-checkbox :checked="exportCfg.assistantMsg" @sl-change="exportCfg.assistantMsg = $event.target.checked">Assistant messages</sl-checkbox>
              <sl-checkbox :checked="exportCfg.toolCalls" @sl-change="exportCfg.toolCalls = $event.target.checked">Tool calls</sl-checkbox>
              <sl-checkbox :checked="exportCfg.toolOutput" @sl-change="exportCfg.toolOutput = $event.target.checked">Tool output</sl-checkbox>
              <sl-checkbox :checked="exportCfg.reasoning" @sl-change="exportCfg.reasoning = $event.target.checked">Reasoning / thinking</sl-checkbox>
              <sl-checkbox :checked="exportCfg.systemPrompt" @sl-change="exportCfg.systemPrompt = $event.target.checked">System prompt</sl-checkbox>
              <sl-checkbox :checked="exportCfg.fileEdits" @sl-change="exportCfg.fileEdits = $event.target.checked">File edits</sl-checkbox>
              <sl-checkbox :checked="exportCfg.subagents" @sl-change="exportCfg.subagents = $event.target.checked">Subagent prompts & results</sl-checkbox>
              <sl-checkbox :checked="exportCfg.events" @sl-change="exportCfg.events = $event.target.checked">Status events</sl-checkbox>
              <sl-checkbox :checked="exportCfg.metadata" @sl-change="exportCfg.metadata = $event.target.checked">Session metadata header</sl-checkbox>
              <sl-checkbox :checked="exportCfg.timestamps" @sl-change="exportCfg.timestamps = $event.target.checked">Timestamps</sl-checkbox>
            </div>
            <div class="export-hint">Exports respect Privacy Mode — redacted content stays redacted.</div>
            <div class="export-actions">
              <button class="export-btn export-btn-primary" @click="doExport('md')">.md</button>
              <button class="export-btn export-btn-primary" @click="doExport('txt')">.txt</button>
            </div>
            <div class="export-actions export-actions-json">
              <button class="export-btn export-btn-json" @click="doExportJson()">Cabinet JSON (all fields)</button>
            </div>
          </div>
        </Transition>
      </div>

      <!-- Privacy Mode -->
      <div class="popover-wrapper" @mouseenter="showPrivacy = true" @mouseleave="showPrivacy = false">
        <button class="menubar-icon-btn" :class="{ active: uiStore.privacyEnabled }" title="Privacy Mode" @click="togglePrivacy">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
          </svg>
        </button>
        <Transition name="fade">
          <div v-show="showPrivacy" class="menubar-popover privacy-popover">
            <div class="popover-header privacy-header-row">
              <span>Privacy Mode</span>
              <sl-switch
                size="small"
                :checked="uiStore.privacyEnabled"
                :disabled="!hasAnyPreset"
                @sl-change="uiStore.setPrivacyEnabled($event.target.checked)"
              ></sl-switch>
            </div>
            <div class="popover-options">
              <sl-checkbox
                v-for="rule in rules"
                :key="rule.id"
                :checked="!!uiStore.privacyPresets[rule.id]"
                @sl-change="uiStore.togglePrivacyPreset(rule.id)"
              >
                <span class="option-label">{{ rule.label }}</span>
                <span class="option-desc">{{ rule.description }}</span>
              </sl-checkbox>
            </div>
            <div class="popover-actions">
              <button class="popover-btn" @click="selectAllPresets">Select All</button>
              <button class="popover-btn" @click="uiStore.resetPrivacyPresets()">Reset</button>
            </div>
          </div>
        </Transition>
      </div>

      <!-- Panel Toggle -->
      <button class="menubar-icon-btn" title="Toggle Detail Panel" @click="uiStore.toggleDetail()">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <rect x="3" y="3" width="18" height="18" rx="2"/>
          <line x1="15" y1="3" x2="15" y2="21"/>
        </svg>
      </button>
    </div>
  </div>

  <!-- About Modal -->
  <Teleport to="body">
    <Transition name="fade">
      <div v-if="showAbout" class="about-overlay" @click.self="showAbout = false">
        <div class="about-modal">
          <div class="about-header">
            <img src="/logo.png" alt="" class="about-logo">
            <span class="about-title">Chat Cabinet</span>
          </div>
          <div class="about-version">v0.3.2</div>
          <p class="about-desc">A local viewer for browsing AI coding assistant session logs from Codex CLI, VS Code Copilot Chat, Claude Code, and Cursor.</p>
          <div class="about-footer">
            <button class="about-close-btn" @click="showAbout = false">Close</button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup>
import { ref, reactive, computed } from 'vue';
import { useUiStore } from '../../stores/ui.js';
import { useTabsStore } from '../../stores/tabs.js';
import { REDACTION_RULES } from '../../lib/redact.js';
import { entriesToText, downloadFile, sessionToJson } from '../../lib/export.js';
import { browseForFile } from '../../lib/import.js';

import '@shoelace-style/shoelace/dist/components/dropdown/dropdown.js';
import '@shoelace-style/shoelace/dist/components/menu/menu.js';
import '@shoelace-style/shoelace/dist/components/menu-item/menu-item.js';
import '@shoelace-style/shoelace/dist/components/divider/divider.js';
import '@shoelace-style/shoelace/dist/components/checkbox/checkbox.js';
import '@shoelace-style/shoelace/dist/components/switch/switch.js';

const uiStore = useUiStore();
const tabsStore = useTabsStore();

const openMenu = ref(null);
const fileDropdown = ref(null);
const helpDropdown = ref(null);
const showPrivacy = ref(false);
const showExport = ref(false);

const rules = REDACTION_RULES;

const exportCfg = reactive({
  userMsg: true,
  assistantMsg: true,
  toolCalls: true,
  toolOutput: false,
  reasoning: false,
  systemPrompt: false,
  fileEdits: true,
  subagents: false,
  events: false,
  metadata: true,
  timestamps: true,
});

const hasAnyPreset = computed(() => {
  return Object.values(uiStore.privacyPresets).some(Boolean);
});

function togglePrivacy() {
  if (!hasAnyPreset.value) return;
  uiStore.setPrivacyEnabled(!uiStore.privacyEnabled);
}

function selectAllPresets() {
  uiStore.selectAllPrivacyPresets(rules.map((r) => r.id));
}

function doExport(format) {
  const session = tabsStore.activeSession;
  const meta = tabsStore.activeMeta;
  if (!session || !meta) return;
  const text = entriesToText(session, meta, format, exportCfg);
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

function onHide(which) {
  if (openMenu.value === which) openMenu.value = null;
}

function onHover(which) {
  if (openMenu.value && openMenu.value !== which) {
    // Close current, open hovered
    const refs = { file: fileDropdown, help: helpDropdown };
    refs[openMenu.value].value?.hide();
    refs[which].value?.show();
  }
}

function onFileSelect(e) {
  const val = e.detail.item.value;
  if (val === 'open-file') {
    browseForFile(tabsStore.openViewed.bind(tabsStore));
  } else if (val === 'close-tab') {
    if (tabsStore.activeTabIndex >= 0) tabsStore.close(tabsStore.activeTabIndex);
  }
}

const showAbout = ref(false);

function onHelpSelect(e) {
  const val = e.detail.item.value;
  if (val === 'github') window.open('https://github.com/chyanju/chat-cabinet', '_blank');
  else if (val === 'about') showAbout.value = true;
}
</script>

<style scoped>
.menubar {
  grid-area: menubar;
  background: var(--surface);
  border-bottom: 1px solid var(--border);
  display: flex;
  align-items: center;
  padding: 0 12px;
  font-size: 12px;
  color: var(--text-muted);
  z-index: 50;
}

.menubar-brand {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-right: 16px;
  color: var(--text);
  font-weight: 600;
  font-size: 12px;
  user-select: none;
}
.menubar-brand-icon {
  width: 16px;
  height: 16px;
}

.menubar-item {
  display: inline-flex;
  align-items: center;
  padding: 0 8px;
  height: 100%;
  cursor: pointer;
  user-select: none;
  font-size: 12px;
  color: var(--text-muted);
  transition: background 0.1s;
}
.menubar-item:hover,
.menubar-item.open {
  background: var(--surface-hover);
  color: var(--text);
}

.menubar-shortcut {
  font-size: 11px;
  color: var(--text-muted);
}

.menubar-right {
  margin-left: auto;
  display: flex;
  align-items: center;
  gap: 4px;
}

.menubar-icon-btn {
  background: none;
  border: none;
  color: var(--text-muted);
  cursor: pointer;
  padding: 3px 5px;
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.1s;
}
.menubar-icon-btn:hover {
  background: var(--surface-hover);
  color: var(--text);
}
.menubar-icon-btn.active {
  color: var(--accent);
}
.menubar-icon-btn svg {
  width: 16px;
  height: 16px;
}

/* Popover wrappers */
.popover-wrapper {
  position: relative;
  display: flex;
  align-items: center;
}
.menubar-popover {
  position: absolute;
  top: calc(100% + 6px);
  right: 0;
  width: 240px;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 8px;
  box-shadow: 0 8px 24px rgba(0,0,0,0.4);
  padding: 10px 12px;
  z-index: 100;
}
.popover-header {
  font-size: 10px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: var(--text-muted);
  margin-bottom: 8px;
}
.privacy-header-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.privacy-header-row sl-switch {
  --height: 16px;
  --width: 30px;
  --thumb-size: 12px;
}
.privacy-header-row sl-switch::part(label) {
  display: none;
}
.popover-options {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.popover-options sl-checkbox::part(base) {
  font-size: 11px;
  color: var(--text-muted);
  align-items: flex-start;
}
.popover-options sl-checkbox::part(control) {
  width: 14px;
  height: 14px;
  margin-top: 1px;
}
.option-label {
  color: var(--text);
}
.option-desc {
  display: block;
  font-size: 10px;
  color: var(--text-muted);
  margin-top: 1px;
}
.popover-actions {
  display: flex;
  gap: 6px;
  margin-top: 10px;
  padding-top: 8px;
  border-top: 1px solid var(--border);
}
.popover-btn {
  flex: 1;
  background: none;
  border: 1px solid var(--border);
  border-radius: 4px;
  color: var(--text-muted);
  font-size: 11px;
  padding: 4px 0;
  cursor: pointer;
  transition: all 0.1s;
}
.popover-btn:hover {
  background: var(--surface-hover);
  color: var(--text);
}

/* Privacy popover */
.privacy-popover {
  width: 280px;
}

/* Export popover */
.export-popover {
  width: 260px;
}
.export-hint {
  font-size: 10px;
  color: var(--text-muted);
  margin-top: 8px;
  padding-top: 6px;
  border-top: 1px solid var(--border);
  line-height: 1.4;
}
.export-actions {
  display: flex;
  gap: 6px;
  margin-top: 10px;
  padding-top: 8px;
  border-top: 1px solid var(--border);
}
.export-actions-json {
  border-top: none;
  padding-top: 0;
  margin-top: 6px;
}
.export-btn {
  flex: 1;
  background: none;
  border-radius: 4px;
  font-size: 11px;
  padding: 4px 0;
  cursor: pointer;
  transition: all 0.1s;
}
.export-btn-primary {
  border: 1px solid var(--accent);
  color: var(--accent);
}
.export-btn-primary:hover {
  background: var(--accent-dim);
}
.export-btn-json {
  border: 1px solid var(--orange);
  color: var(--orange);
}
.export-btn-json:hover {
  background: var(--orange-dim);
}

/* Transition */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.15s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

/* Shoelace dropdown overrides */
sl-dropdown::part(panel) {
  min-width: 180px;
  width: max-content;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 6px;
  box-shadow: 0 8px 24px rgba(0,0,0,0.4);
}
sl-menu {
  background: var(--surface);
  border: none;
}
sl-menu-item::part(base) {
  font-size: 12px;
  color: var(--text);
  padding: 5px 14px;
}
sl-menu-item::part(suffix) {
  margin-left: 24px;
}
sl-menu-item::part(base):hover {
  background: var(--accent-dim);
  color: var(--accent);
}
sl-divider {
  --color: var(--border);
}

/* About Modal */
.about-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
}
.about-modal {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 10px;
  box-shadow: 0 12px 40px rgba(0, 0, 0, 0.6);
  padding: 24px 28px;
  width: 320px;
  text-align: center;
}
.about-header {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  margin-bottom: 4px;
}
.about-logo {
  width: 28px;
  height: 28px;
}
.about-title {
  font-size: 16px;
  font-weight: 700;
  color: var(--text);
}
.about-version {
  font-size: 11px;
  color: var(--text-muted);
  margin-bottom: 12px;
}
.about-desc {
  font-size: 12px;
  color: var(--text-muted);
  line-height: 1.5;
  margin-bottom: 16px;
}
.about-footer {
  border-top: 1px solid var(--border);
  padding-top: 12px;
}
.about-close-btn {
  background: none;
  border: 1px solid var(--border);
  border-radius: 6px;
  color: var(--text);
  font-size: 12px;
  padding: 5px 20px;
  cursor: pointer;
  transition: all 0.1s;
}
.about-close-btn:hover {
  background: var(--surface-hover);
  border-color: var(--text-muted);
}
</style>
