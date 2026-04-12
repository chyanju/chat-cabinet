import { defineStore } from 'pinia';

export const useUiStore = defineStore('ui', {
  state: () => ({
    activeView: 'source',
    activeSourceFilters: new Set(),
    activeTagFilters: new Set(),
    searchQuery: '',
    detailCollapsed: false,
    detailWidth: 280,
    sidebarWidth: 300,
    redactionToggles: {},
  }),
  actions: {
    setView(view) {
      this.activeView = view;
    },
    toggleSource(key) {
      if (this.activeSourceFilters.has(key)) {
        this.activeSourceFilters.delete(key);
      } else {
        this.activeSourceFilters.add(key);
      }
    },
    clearSourceFilters() {
      this.activeSourceFilters.clear();
    },
    toggleTag(id) {
      if (this.activeTagFilters.has(id)) {
        this.activeTagFilters.delete(id);
      } else {
        this.activeTagFilters.add(id);
      }
    },
    clearTagFilters() {
      this.activeTagFilters.clear();
    },
    toggleDetail() {
      this.detailCollapsed = !this.detailCollapsed;
    },
    setSidebarWidth(w) {
      this.sidebarWidth = Math.max(200, Math.min(450, w));
    },
    setDetailWidth(w) {
      this.detailWidth = Math.max(200, Math.min(400, w));
    },
    toggleRedaction(ruleId) {
      this.redactionToggles[ruleId] = !this.redactionToggles[ruleId];
    },
    resetRedactions() {
      this.redactionToggles = {};
    },
    selectAllRedactions(ruleIds) {
      const obj = {};
      for (const id of ruleIds) obj[id] = true;
      this.redactionToggles = obj;
    },
  },
});
