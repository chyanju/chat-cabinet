<template>
  <div class="editor-area">
    <!-- Tab bar -->
    <div class="tab-bar" ref="tabBarEl">
      <TabItem
        v-for="(tab, i) in tabsStore.openTabs"
        :key="tab.sessionPath"
        :tab="tab"
        :index="i"
        :active="i === tabsStore.activeTabIndex"
        :isDragOver="dropIndicator === i"
        :isDragOverRight="dropIndicator === tabsStore.openTabs.length && i === tabsStore.openTabs.length - 1"
        @activate="tabsStore.activate(i)"
        @close="tabsStore.close(i)"
        @pin="tabsStore.pin(i)"
        @dragstart="onTabDragStart"
      />
    </div>

    <div class="editor-content" ref="editorContentEl">
      <!-- Placeholder when no tab is active -->
      <div v-if="!tabsStore.activeTab" class="placeholder">
        <div class="placeholder-icon">&#128193;</div>
        <div>Select a session from the sidebar</div>
        <div class="placeholder-hint">or drop a JSON file anywhere to view</div>
        <button class="placeholder-browse" @click="browseForFile(tabsStore.openViewed.bind(tabsStore))">Open Session from File</button>
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
import { ref, watch, nextTick, onUnmounted } from 'vue';
import { useTabsStore } from '../../stores/tabs.js';
import { browseForFile } from '../../lib/import.js';
import TabItem from './TabItem.vue';
import ConversationView from '../conversation/ConversationView.vue';

import '@shoelace-style/shoelace/dist/components/spinner/spinner.js';

const tabsStore = useTabsStore();
const editorContentEl = ref(null);
const tabBarEl = ref(null);

// ── Tab drag-to-reorder (pointer events, VS Code-style) ──────
const dragFromIndex = ref(-1);
const dropIndicator = ref(-1);  // index where the blue line shows (left edge of that tab), or N for after-last
const dragStartX = ref(0);
const isDragging = ref(false);
let ghostEl = null;

function createGhost(sourceTab, startX, startY) {
  const ghost = sourceTab.cloneNode(true);
  const rect = sourceTab.getBoundingClientRect();
  ghost.className = 'tab-drag-ghost';
  ghost.style.cssText = `
    position: fixed;
    top: ${rect.top}px;
    left: ${startX - rect.width / 2}px;
    width: ${rect.width}px;
    height: ${rect.height}px;
    opacity: 0.4;
    pointer-events: none;
    z-index: 9999;
    background: var(--surface-hover);
    border: 1px solid var(--accent);
    border-radius: 4px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.3);
    transition: none;
    display: inline-flex;
    align-items: center;
    font-size: 12px;
    color: var(--text);
    padding: 0 12px;
    gap: 6px;
    white-space: nowrap;
  `;
  // Remove the close button from the ghost
  const closeBtn = ghost.querySelector('.tab-close');
  if (closeBtn) closeBtn.remove();
  document.body.appendChild(ghost);
  return ghost;
}

function onTabDragStart(e, fromIndex) {
  // Only left mouse button, ignore close button clicks
  if (e.button !== 0 || e.target.closest('.tab-close')) return;
  e.preventDefault(); // prevent text selection

  dragFromIndex.value = fromIndex;
  dragStartX.value = e.clientX;
  isDragging.value = false;

  const onMove = (ev) => {
    ev.preventDefault();
    // Only start actual drag after 4px threshold
    if (!isDragging.value && Math.abs(ev.clientX - dragStartX.value) < 4) return;
    if (!isDragging.value) {
      isDragging.value = true;
      document.body.style.cursor = 'grabbing';
      document.body.style.userSelect = 'none';
      // Create ghost from source tab
      const tabs = tabBarEl.value?.querySelectorAll('.tab-item');
      if (tabs && tabs[fromIndex]) {
        ghostEl = createGhost(tabs[fromIndex], ev.clientX, ev.clientY);
      }
    }

    // Move ghost to follow cursor
    if (ghostEl) {
      ghostEl.style.left = (ev.clientX - ghostEl.offsetWidth / 2) + 'px';
    }

    // Find drop position: which gap between tabs the cursor is closest to
    if (!tabBarEl.value) return;
    const tabs = tabBarEl.value.querySelectorAll('.tab-item');
    const count = tabs.length;
    let insertIdx = count; // default: after last tab

    for (let i = 0; i < count; i++) {
      const rect = tabs[i].getBoundingClientRect();
      const midX = rect.left + rect.width / 2;
      if (ev.clientX < midX) {
        insertIdx = i;
        break;
      }
    }

    // Don't show indicator at source position or source+1 (no-op positions)
    const from = dragFromIndex.value;
    if (insertIdx === from || insertIdx === from + 1) {
      dropIndicator.value = -1;
    } else {
      dropIndicator.value = insertIdx;
    }
  };

  const onUp = () => {
    document.removeEventListener('mousemove', onMove);
    document.removeEventListener('mouseup', onUp);
    document.body.style.cursor = '';
    document.body.style.userSelect = '';

    // Remove ghost
    if (ghostEl) {
      ghostEl.remove();
      ghostEl = null;
    }

    if (isDragging.value && dropIndicator.value >= 0) {
      let from = dragFromIndex.value;
      let to = dropIndicator.value;
      // Adjust: if inserting after the source, the effective target index is one less
      // because the source will be removed first
      if (to > from) to--;
      if (from !== to) {
        tabsStore.moveTab(from, to);
      }
    }
    dragFromIndex.value = -1;
    dropIndicator.value = -1;
    isDragging.value = false;
  };

  document.addEventListener('mousemove', onMove);
  document.addEventListener('mouseup', onUp);
}

onUnmounted(() => {
  if (ghostEl) { ghostEl.remove(); ghostEl = null; }
});

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
.placeholder-hint {
  margin-top: 8px;
  font-size: 12px;
  color: var(--text-muted);
  opacity: 0.7;
}
.placeholder-browse {
  margin-top: 14px;
  background: none;
  border: 1px solid var(--border);
  color: var(--accent);
  padding: 6px 14px;
  border-radius: 6px;
  cursor: pointer;
  font-size: 12px;
  transition: all 0.15s;
}
.placeholder-browse:hover {
  background: var(--accent-dim);
  border-color: var(--accent);
}
.loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  padding: 60px 40px;
  color: var(--text-muted);
  font-size: 13px;
}
.loading sl-spinner {
  font-size: 28px;
  --indicator-color: var(--accent);
  --track-color: var(--border);
}
.conversation {
  padding: 16px 20px 80px;
}
</style>
