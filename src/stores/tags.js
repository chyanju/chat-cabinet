import { defineStore } from 'pinia';
import { fetchTags as apiFetchTags, createTag as apiCreateTag, deleteTag as apiDeleteTag, assignTag as apiAssignTag, unassignTag as apiUnassignTag, updateTag as apiUpdateTag } from '../lib/tag-api.js';

export const useTagsStore = defineStore('tags', {
  state: () => ({
    tags: [],
    assignments: [],
    error: null,
  }),
  getters: {
    getTagsForSession: (state) => (sessionId) => {
      const tagIds = state.assignments
        .filter(a => a.session_id === sessionId)
        .map(a => a.tag_id);
      return state.tags.filter(t => tagIds.includes(t.id));
    },
  },
  actions: {
    async refresh() {
      this.error = null;
      try {
        const data = await apiFetchTags();
        this.tags = data.tags || [];
        this.assignments = data.assignments || [];
      } catch (e) {
        this.tags = [];
        this.assignments = [];
        this.error = e.message || String(e);
        console.error('[tags.refresh]', e);
      }
    },
    async create(name, color) {
      const tag = await apiCreateTag(name, color);
      await this.refresh();
      return tag;
    },
    async update(id, updates) {
      await apiUpdateTag(id, updates);
      await this.refresh();
    },
    async remove(id) {
      await apiDeleteTag(id);
      await this.refresh();
    },
    async assign(tagId, sessionId) {
      await apiAssignTag(tagId, sessionId);
      await this.refresh();
    },
    async unassign(tagId, sessionId) {
      await apiUnassignTag(tagId, sessionId);
      await this.refresh();
    },
  },
});
