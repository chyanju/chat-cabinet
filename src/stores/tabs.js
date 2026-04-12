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

    openImported(sessionData) {
      const id = `import-${Date.now()}`;
      const meta = {
        filePath: id,
        id: sessionData.session_id || id,
        timestamp: sessionData.created_at || null,
        source: sessionData.source?.tool || 'import',
        title: sessionData.title || 'Imported Session',
      };
      const newTab = {
        sessionPath: id,
        sessionMeta: meta,
        sessionData,
        isPreview: false,
        isWelcome: false,
        scrollPos: 0,
        loading: false,
        error: null,
      };
      const insertIdx = this.activeTabIndex >= 0 ? this.activeTabIndex + 1 : this.openTabs.length;
      this.openTabs.splice(insertIdx, 0, newTab);
      this.activeTabIndex = insertIdx;
    },

    /** Replace the current active welcome tab in-place with imported session data */
    replaceActiveWithImported(sessionData) {
      const tab = this.activeTab;
      if (!tab) return;
      const id = `import-${Date.now()}`;
      tab.sessionPath = id;
      tab.sessionMeta = {
        filePath: id,
        id: sessionData.session_id || id,
        timestamp: sessionData.created_at || null,
        source: sessionData.source?.tool || 'import',
        title: sessionData.title || 'Imported Session',
      };
      tab.sessionData = sessionData;
      tab.isWelcome = false;
      tab.loading = false;
      tab.error = null;
    },

    openWelcome() {
      const id = `welcome-${Date.now()}`;
      const newTab = {
        sessionPath: id,
        sessionMeta: { filePath: id, id, title: 'New Tab' },
        sessionData: null,
        isPreview: false,
        isWelcome: true,
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
      if (!tab || tab.sessionData || tab.isWelcome) return;

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
