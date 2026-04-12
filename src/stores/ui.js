import { defineStore } from 'pinia';
import { fetchInfo } from '../lib/api.js';

export const useUiStore = defineStore('ui', {
  state: () => ({
    activeView: 'source',
    activeSourceFilters: new Set(),
    activeModelFilters: new Set(),
    activeTagFilters: new Set(),
    storageFilter: 'all', // 'all' | 'linked' | 'saved'
    searchQuery: '',
    detailCollapsed: false,
    detailWidth: 280,
    sidebarWidth: 300,
    privacyEnabled: false,
    privacyPresets: {},
    serverInfo: null, // { dev, port, url, dataDir }
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
    toggleModel(key) {
      if (this.activeModelFilters.has(key)) {
        this.activeModelFilters.delete(key);
      } else {
        this.activeModelFilters.add(key);
      }
    },
    clearModelFilters() {
      this.activeModelFilters.clear();
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
    setStorageFilter(val) {
      this.storageFilter = val;
    },
    toggleDetail() {
      this.detailCollapsed = !this.detailCollapsed;
    },
    setSidebarWidth(w) {
      this.sidebarWidth = Math.max(200, Math.min(450, w));
    },
    setDetailWidth(w) {
      this.detailWidth = Math.max(280, Math.min(400, w));
    },
    togglePrivacyPreset(ruleId) {
      this.privacyPresets[ruleId] = !this.privacyPresets[ruleId];
      // Auto-disable master toggle if no presets remain
      if (!Object.values(this.privacyPresets).some(Boolean)) {
        this.privacyEnabled = false;
      }
    },
    resetPrivacyPresets() {
      this.privacyPresets = {};
      this.privacyEnabled = false;
    },
    selectAllPrivacyPresets(ruleIds) {
      const obj = {};
      for (const id of ruleIds) obj[id] = true;
      this.privacyPresets = obj;
    },
    setPrivacyEnabled(val) {
      // Only allow enabling if at least one preset is selected
      if (val && !Object.values(this.privacyPresets).some(Boolean)) return;
      this.privacyEnabled = val;
    },
    async loadServerInfo() {
      this.serverInfo = await fetchInfo();
    },
  },
});
