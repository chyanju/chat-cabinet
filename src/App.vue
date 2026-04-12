<template>
  <div id="app-root" :class="{ 'detail-collapsed': uiStore.detailCollapsed }"
       :style="{ '--sidebar-w': uiStore.sidebarWidth + 'px', '--detail-panel-w': uiStore.detailWidth + 'px' }">
    <MenuBar />
    <ActivityBar />
    <SidebarPanel />
    <EditorArea />
    <DetailPanel />
    <StatusBar />
  </div>
</template>

<script setup>
import { onMounted, onUnmounted } from 'vue';
import { useUiStore } from './stores/ui.js';
import { useSessionsStore } from './stores/sessions.js';
import { useTabsStore } from './stores/tabs.js';
import { useTagsStore } from './stores/tags.js';
import { importSessionFromFile } from './lib/import.js';
import MenuBar from './components/layout/MenuBar.vue';
import ActivityBar from './components/layout/ActivityBar.vue';
import StatusBar from './components/layout/StatusBar.vue';
import SidebarPanel from './components/sidebar/SidebarPanel.vue';
import EditorArea from './components/editor/EditorArea.vue';
import DetailPanel from './components/detail/DetailPanel.vue';

const uiStore = useUiStore();
const sessionsStore = useSessionsStore();
const tabsStore = useTabsStore();
const tagsStore = useTagsStore();

function onKeydown(e) {
  // Ctrl+O — open file
  if (e.ctrlKey && e.key === 'o') {
    e.preventDefault();
    browseForFile();
  }
  // Ctrl+W — close tab
  if (e.ctrlKey && e.key === 'w') {
    e.preventDefault();
    if (tabsStore.activeTabIndex >= 0) tabsStore.close(tabsStore.activeTabIndex);
  }
  // Ctrl+Tab — next/prev tab
  if (e.ctrlKey && e.key === 'Tab') {
    e.preventDefault();
    if (tabsStore.openTabs.length > 1) {
      const next = e.shiftKey
        ? (tabsStore.activeTabIndex - 1 + tabsStore.openTabs.length) % tabsStore.openTabs.length
        : (tabsStore.activeTabIndex + 1) % tabsStore.openTabs.length;
      tabsStore.activate(next);
    }
  }
}

function browseForFile() {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = '.json';
  input.onchange = async () => {
    const file = input.files?.[0];
    if (!file) return;
    const result = await importSessionFromFile(file);
    if (result.error) {
      console.error('[open-file]', result.error);
      return;
    }
    tabsStore.openViewed(result.data);
  };
  input.click();
}

function onDragOver(e) {
  e.preventDefault();
  e.dataTransfer.dropEffect = 'copy';
}

async function onDrop(e) {
  e.preventDefault();
  const file = e.dataTransfer?.files?.[0];
  if (!file || !file.name.endsWith('.json')) return;
  const result = await importSessionFromFile(file);
  if (result.error) {
    console.error('[drop]', result.error);
    return;
  }
  tabsStore.openViewed(result.data);
}

onMounted(async () => {
  document.addEventListener('keydown', onKeydown);
  document.addEventListener('dragover', onDragOver);
  document.addEventListener('drop', onDrop);
  await Promise.all([sessionsStore.refresh(), tagsStore.refresh(), uiStore.loadServerInfo()]);
});

onUnmounted(() => {
  document.removeEventListener('keydown', onKeydown);
  document.removeEventListener('dragover', onDragOver);
  document.removeEventListener('drop', onDrop);
});
</script>

<style scoped>
#app-root {
  display: grid;
  height: 100vh;
  grid-template-rows: var(--menubar-h) 1fr var(--statusbar-h);
  grid-template-columns: var(--activity-bar-w) var(--sidebar-w) 1fr var(--detail-panel-w);
  grid-template-areas:
    "menubar   menubar   menubar      menubar"
    "activity  sidebar   editor       detailpanel"
    "statusbar statusbar statusbar    statusbar";
}
#app-root.detail-collapsed {
  grid-template-columns: var(--activity-bar-w) var(--sidebar-w) 1fr 0px;
}
</style>
