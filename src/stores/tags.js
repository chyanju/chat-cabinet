import { defineStore } from 'pinia';
import { fetchTags as apiFetchTags, createTag as apiCreateTag, deleteTag as apiDeleteTag, assignTag as apiAssignTag, unassignTag as apiUnassignTag } from '../lib/tag-api.js';

export const useTagsStore = defineStore('tags', {
  state: () => ({
    tags: [],
    assignments: [],
    error: null,
  }),
  getters: {
    getTagsForSession: (state) => (sessionPath) => {
      const tagIds = state.assignments
        .filter(a => a.session_path === sessionPath)
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
    async remove(id) {
      await apiDeleteTag(id);
      await this.refresh();
    },
    async assign(tagId, sessionPath) {
      await apiAssignTag(tagId, sessionPath);
      await this.refresh();
    },
    async unassign(tagId, sessionPath) {
      await apiUnassignTag(tagId, sessionPath);
      await this.refresh();
    },
  },
});
