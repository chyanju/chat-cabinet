<template>
  <div id="app-root" :class="{ 'detail-collapsed': uiStore.detailCollapsed }"
       :style="{ '--detail-panel-w': uiStore.detailWidth + 'px' }">
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
  // Ctrl+N — new tab
  if (e.ctrlKey && e.key === 'n') {
    e.preventDefault();
    tabsStore.openWelcome();
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

onMounted(async () => {
  document.addEventListener('keydown', onKeydown);
  tabsStore.openWelcome();
  await Promise.all([sessionsStore.refresh(), tagsStore.refresh()]);
});

onUnmounted(() => {
  document.removeEventListener('keydown', onKeydown);
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
