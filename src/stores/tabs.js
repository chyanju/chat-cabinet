import { defineStore } from 'pinia';
import { fetchSession } from '../lib/api.js';

export const useTabsStore = defineStore('tabs', {
  state: () => ({
    openTabs: [],
    activeTabIndex: -1,
  }),
  getters: {
    activeTab(state) {
      return state.activeTabIndex >= 0 ? state.openTabs[state.activeTabIndex] : null;
    },
    activeSession() {
      return this.activeTab?.sessionData || null;
    },
    activeMeta() {
      return this.activeTab?.sessionMeta || null;
    },
  },
  actions: {
    open(meta, isPreview) {
      const path = meta.filePath;

      // Already open? Activate it (and pin if requested).
      const existingIdx = this.openTabs.findIndex(t => t.sessionPath === path);
      if (existingIdx >= 0) {
        if (!isPreview) this.openTabs[existingIdx].isPreview = false;
        this.activeTabIndex = existingIdx;
        this.loadActive();
        return;
      }

      const newTab = {
        sessionPath: path,
        sessionMeta: meta,
        sessionData: null,
        isPreview,
        scrollPos: 0,
        loading: false,
        error: null,
      };

      // If preview, replace existing preview tab
      if (isPreview) {
        const previewIdx = this.openTabs.findIndex(t => t.isPreview);
        if (previewIdx >= 0) {
          this.openTabs[previewIdx] = newTab;
          this.activeTabIndex = previewIdx;
          this.loadActive();
          return;
        }
      }

      // Insert after active tab
      const insertIdx = this.activeTabIndex >= 0 ? this.activeTabIndex + 1 : this.openTabs.length;
      this.openTabs.splice(insertIdx, 0, newTab);
      this.activeTabIndex = insertIdx;
      this.loadActive();
    },

    close(index) {
      this.openTabs.splice(index, 1);

      if (this.openTabs.length === 0) {
        this.activeTabIndex = -1;
      } else if (index === this.activeTabIndex) {
        this.activeTabIndex = Math.min(index, this.openTabs.length - 1);
      } else if (index < this.activeTabIndex) {
        this.activeTabIndex--;
      }
    },

    pin(index) {
      if (index >= 0 && index < this.openTabs.length) {
        this.openTabs[index].isPreview = false;
      }
    },

    activate(index) {
      if (index === this.activeTabIndex) return;
      this.activeTabIndex = index;
    },

    async loadActive() {
      const tab = this.activeTab;
      if (!tab || tab.sessionData) return;

      tab.loading = true;
      const session = await fetchSession(tab.sessionPath);
      tab.loading = false;

      if (!session.error) {
        tab.sessionData = session;
      } else {
        tab.error = session.error;
      }
    },
  },
});
