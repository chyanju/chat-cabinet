import { defineStore } from 'pinia';
import { fetchSessions as apiFetchSessions, syncSessions as apiSync } from '../lib/api.js';
import { getSourceKey } from '../lib/sources.js';

export const useSessionsStore = defineStore('sessions', {
  state: () => ({
    sessions: [],
    loading: false,
    error: null,
  }),
  getters: {
    filteredSessions(state) {
      const ui = useUiStore();
      let list = state.sessions;

      // Search filter
      if (ui.searchQuery) {
        const q = ui.searchQuery.toLowerCase();
        list = list.filter(s => {
          const searchable = `${s.id} ${s.cwd || ''} ${s.timestamp || ''} ${s.model_provider || ''} ${s.source || ''} ${s.source_key || ''} ${s.title || ''} ${s.alias || ''}`.toLowerCase();
          return searchable.includes(q);
        });
      }

      // Source filter
      if (ui.activeSourceFilters.size > 0) {
        list = list.filter(s => ui.activeSourceFilters.has(getSourceKey(s)));
      }

      // Model filter
      if (ui.activeModelFilters.size > 0) {
        list = list.filter(s => ui.activeModelFilters.has(s.model_provider || 'unknown'));
      }

      // Storage filter
      if (ui.storageFilter === 'linked') {
        list = list.filter(s => !s.has_data);
      } else if (ui.storageFilter === 'saved') {
        list = list.filter(s => !!s.has_data);
      }

      // Tag filter
      if (ui.activeTagFilters.size > 0) {
        const tagsStore = useTagsStore();
        const taggedIds = new Set(
          tagsStore.assignments
            .filter(a => ui.activeTagFilters.has(a.tag_id))
            .map(a => a.session_id)
        );
        list = list.filter(s => taggedIds.has(s.id));
      }

      return list;
    },
  },
  actions: {
    async refresh() {
      this.loading = true;
      this.error = null;
      try {
        await apiSync();
        this.sessions = await apiFetchSessions();
      } catch (e) {
        this.sessions = [];
        this.error = e.message || String(e);
        console.error('[sessions.refresh]', e);
      } finally {
        this.loading = false;
      }
    },
  },
});

// Lazy imports to avoid circular deps
import { useUiStore } from './ui.js';
import { useTagsStore } from './tags.js';
