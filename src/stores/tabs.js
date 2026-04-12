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
      const id = meta.id;

      // Already open? Activate it (and pin if requested).
      const existingIdx = this.openTabs.findIndex(t => t.sessionPath === id);
      if (existingIdx >= 0) {
        if (!isPreview) this.openTabs[existingIdx].isPreview = false;
        this.activeTabIndex = existingIdx;
        this.loadActive();
        return;
      }

      const newTab = {
        sessionPath: id,
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

    /** Open a file dropped onto the window as a view-only tab (no DB persistence). */
    openViewed(sessionData) {
      const id = `view-${Date.now()}`;
      const meta = {
        filePath: id,
        id: sessionData.session_id || id,
        timestamp: sessionData.created_at || null,
        source: sessionData.source?.tool || 'view',
        title: sessionData.title || 'Viewed Session',
      };
      const newTab = {
        sessionPath: id,
        sessionMeta: meta,
        sessionData,
        isPreview: false,
        scrollPos: 0,
        loading: false,
        error: null,
      };
      const insertIdx = this.activeTabIndex >= 0 ? this.activeTabIndex + 1 : this.openTabs.length;
      this.openTabs.splice(insertIdx, 0, newTab);
      this.activeTabIndex = insertIdx;
    },

    moveTab(fromIndex, toIndex) {
      if (fromIndex === toIndex) return;
      if (fromIndex < 0 || toIndex < 0) return;
      if (fromIndex >= this.openTabs.length || toIndex >= this.openTabs.length) return;
      const [tab] = this.openTabs.splice(fromIndex, 1);
      this.openTabs.splice(toIndex, 0, tab);
      // Keep active tab tracking correct
      if (this.activeTabIndex === fromIndex) {
        this.activeTabIndex = toIndex;
      } else if (fromIndex < this.activeTabIndex && toIndex >= this.activeTabIndex) {
        this.activeTabIndex--;
      } else if (fromIndex > this.activeTabIndex && toIndex <= this.activeTabIndex) {
        this.activeTabIndex++;
      }
    },

    async loadActive() {
      const tab = this.activeTab;
      if (!tab || tab.sessionData) return;

      tab.loading = true;
      try {
        tab.sessionData = await fetchSession(tab.sessionPath);
      } catch (e) {
        tab.error = e.message || String(e);
      } finally {
        tab.loading = false;
      }
    },
  },
});
