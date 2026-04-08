<template>
  <div class="editor-area">
    <!-- Tab bar -->
    <div class="tab-bar">
      <TabItem
        v-for="(tab, i) in tabsStore.openTabs"
        :key="tab.sessionPath"
        :tab="tab"
        :active="i === tabsStore.activeTabIndex"
        @activate="tabsStore.activate(i)"
        @close="tabsStore.close(i)"
        @pin="tabsStore.pin(i)"
      />
    </div>

    <div class="editor-content" ref="editorContentEl">
      <!-- Placeholder when no tab is active -->
      <div v-if="!tabsStore.activeTab" class="placeholder">
        <div class="placeholder-icon">&#128193;</div>
        <div>Select a session to view</div>
      </div>

      <!-- Loading -->
      <div v-else-if="tabsStore.activeTab.loading" class="loading">
        <sl-spinner></sl-spinner>
        Loading session...
      </div>

      <!-- Error -->
      <div v-else-if="tabsStore.activeTab.error" class="loading">
        {{ tabsStore.activeTab.error }}
      </div>

      <!-- Conversation -->
      <div v-else-if="tabsStore.activeSession" class="conversation">
        <ConversationView :session="tabsStore.activeSession" />
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, watch, nextTick } from 'vue';
import { useTabsStore } from '../../stores/tabs.js';
import TabItem from './TabItem.vue';
import ConversationView from '../conversation/ConversationView.vue';

import '@shoelace-style/shoelace/dist/components/spinner/spinner.js';

const tabsStore = useTabsStore();
const editorContentEl = ref(null);

// Save/restore scroll position on tab switch
watch(() => tabsStore.activeTabIndex, (newIdx, oldIdx) => {
  if (oldIdx >= 0 && oldIdx < tabsStore.openTabs.length) {
    const el = editorContentEl.value;
    if (el) tabsStore.openTabs[oldIdx].scrollPos = el.scrollTop;
  }

  nextTick(() => {
    const el = editorContentEl.value;
    const tab = tabsStore.activeTab;
    if (el && tab) el.scrollTop = tab.scrollPos || 0;
  });
});
</script>

<style scoped>
.editor-area {
  grid-area: editor;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  min-width: 0;
}
.tab-bar {
  height: var(--tab-bar-h);
  min-height: var(--tab-bar-h);
  background: var(--surface);
  border-bottom: 1px solid var(--border);
  display: flex;
  align-items: stretch;
  overflow-x: auto;
  overflow-y: hidden;
}
.tab-bar::-webkit-scrollbar { height: 0; }

.editor-content {
  flex: 1;
  overflow-y: auto;
  position: relative;
}
.placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: var(--text-muted);
}
.placeholder-icon {
  font-size: 48px;
  margin-bottom: 12px;
  opacity: 0.5;
}
.loading {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  padding: 40px;
  color: var(--text-muted);
}
.conversation {
  padding: 16px 20px 80px;
}
</style>
