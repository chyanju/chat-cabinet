<template>
  <div class="menubar">
    <div class="menubar-brand">
      <img src="/cabinet.svg" alt="" class="menubar-brand-icon">
      <span>Chat Cabinet</span>
    </div>

    <sl-dropdown ref="fileDropdown" @sl-show="openMenu = 'file'" @sl-hide="onHide('file')">
      <div slot="trigger" class="menubar-item" :class="{ open: openMenu === 'file' }"
           @mouseenter="onHover('file')">File</div>
      <sl-menu @sl-select="onFileSelect">
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

    <button class="menubar-panel-toggle" title="Toggle Detail Panel" @click="uiStore.toggleDetail()">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <rect x="3" y="3" width="18" height="18" rx="2"/>
        <line x1="15" y1="3" x2="15" y2="21"/>
      </svg>
    </button>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import { useUiStore } from '../../stores/ui.js';
import { useTabsStore } from '../../stores/tabs.js';

import '@shoelace-style/shoelace/dist/components/dropdown/dropdown.js';
import '@shoelace-style/shoelace/dist/components/menu/menu.js';
import '@shoelace-style/shoelace/dist/components/menu-item/menu-item.js';
import '@shoelace-style/shoelace/dist/components/divider/divider.js';

const uiStore = useUiStore();
const tabsStore = useTabsStore();

const openMenu = ref(null);
const fileDropdown = ref(null);
const helpDropdown = ref(null);

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
  if (val === 'close-tab') {
    if (tabsStore.activeTabIndex >= 0) tabsStore.close(tabsStore.activeTabIndex);
  }
}

function onHelpSelect(e) {
  const val = e.detail.item.value;
  if (val === 'github') window.open('https://github.com/chyanju/chat-cabinet', '_blank');
  else if (val === 'about') alert('Chat Cabinet v2.0.0\nA local viewer for AI coding assistant session logs.');
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

.menubar-panel-toggle {
  margin-left: auto;
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
.menubar-panel-toggle:hover {
  background: var(--surface-hover);
  color: var(--text);
}
.menubar-panel-toggle svg {
  width: 16px;
  height: 16px;
}

/* Shoelace dropdown overrides */
sl-dropdown::part(panel) {
  min-width: 220px;
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
sl-menu-item::part(base):hover {
  background: var(--accent-dim);
  color: var(--accent);
}
sl-divider {
  --color: var(--border);
}
</style>
