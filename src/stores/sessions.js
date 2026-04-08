import { defineStore } from 'pinia';
import { fetchSessions as apiFetchSessions } from '../lib/api.js';
import { getSourceKey } from '../lib/sources.js';

export const useSessionsStore = defineStore('sessions', {
  state: () => ({
    sessions: [],
    loading: false,
  }),
  getters: {
    filteredSessions(state) {
      const ui = useUiStore();
      let list = state.sessions;

      // Search filter
      if (ui.searchQuery) {
        const q = ui.searchQuery.toLowerCase();
        list = list.filter(s => {
          const searchable = `${s.id} ${s.cwd || ''} ${s.timestamp || ''} ${s.model_provider || ''} ${s.source || ''} ${s.source_key || ''} ${s.title || ''}`.toLowerCase();
          return searchable.includes(q);
        });
      }

      // Source filter
      if (ui.activeSourceFilters.size > 0) {
        list = list.filter(s => ui.activeSourceFilters.has(getSourceKey(s)));
      }

      // Tag filter
      if (ui.activeTagFilters.size > 0) {
        const tagsStore = useTagsStore();
        const taggedPaths = new Set(
          tagsStore.assignments
            .filter(a => ui.activeTagFilters.has(a.tag_id))
            .map(a => a.session_path)
        );
        list = list.filter(s => taggedPaths.has(s.filePath));
      }

      return list;
    },
  },
  actions: {
    async refresh() {
      this.loading = true;
      try {
        this.sessions = await apiFetchSessions();
      } finally {
        this.loading = false;
      }
    },
  },
});

// Lazy imports to avoid circular deps
import { useUiStore } from './ui.js';
import { useTagsStore } from './tags.js';
