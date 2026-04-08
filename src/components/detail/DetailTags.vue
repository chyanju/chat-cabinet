<template>
  <div v-if="tabsStore.activeTab" class="dp-section dp-tags">
    <div class="dp-section-title">Tags</div>

    <!-- Assigned tags -->
    <div class="dp-tags-list">
      <sl-tag
        v-for="tag in sessionTags"
        :key="tag.id"
        size="small"
        removable
        @sl-remove="onUnassign(tag.id)"
      >
        <span class="dp-tag-dot" :style="{ background: tag.color }" slot="prefix"></span>
        {{ tag.name }}
      </sl-tag>
    </div>

    <!-- Tag input -->
    <div class="dp-tag-add">
      <template v-if="!showInput">
        <sl-icon-button name="plus-lg" label="Add tag" class="dp-tag-add-btn" @click="showInput = true" />
      </template>
      <TagInput
        v-else
        :all-tags="tagsStore.tags"
        :assigned-ids="assignedIds"
        @assign="onAssign"
        @create="onCreate"
        @close="showInput = false"
      />
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue';
import { useTabsStore } from '../../stores/tabs.js';
import { useTagsStore } from '../../stores/tags.js';
import { TAG_COLORS } from '../../lib/sources.js';
import TagInput from './TagInput.vue';

import '@shoelace-style/shoelace/dist/components/tag/tag.js';
import '@shoelace-style/shoelace/dist/components/icon-button/icon-button.js';

const tabsStore = useTabsStore();
const tagsStore = useTagsStore();
const showInput = ref(false);

const sessionPath = computed(() => tabsStore.activeTab?.sessionPath || '');
const sessionTags = computed(() => tagsStore.getTagsForSession(sessionPath.value));
const assignedIds = computed(() => new Set(sessionTags.value.map(t => t.id)));

// Reset input when tab changes
watch(sessionPath, () => { showInput.value = false; });

async function onAssign(tagId) {
  await tagsStore.assign(tagId, sessionPath.value);
  showInput.value = false;
}

async function onUnassign(tagId) {
  await tagsStore.unassign(tagId, sessionPath.value);
}

async function onCreate(name) {
  const color = TAG_COLORS[tagsStore.tags.length % TAG_COLORS.length];
  const tag = await tagsStore.create(name, color);
  await tagsStore.assign(tag.id, sessionPath.value);
  showInput.value = false;
}
</script>

<style scoped>
.dp-section {
  padding: 10px 12px;
  border-bottom: 1px solid var(--border);
}
.dp-section-title {
  font-size: 10px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: var(--text-muted);
  margin-bottom: 8px;
}
.dp-tags-list {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  margin-bottom: 8px;
}
.dp-tag-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  display: inline-block;
}
.dp-tag-add {
  margin-top: 4px;
}
.dp-tag-add-btn::part(base) {
  color: var(--text-muted);
  font-size: 14px;
  padding: 2px;
  border: 1px solid var(--border);
  border-radius: 4px;
}
.dp-tag-add-btn::part(base):hover {
  color: var(--accent);
  background: var(--accent-dim);
  border-color: var(--accent);
}

/* Shoelace tag overrides */
sl-tag::part(base) {
  background: var(--bg);
  border: 1px solid var(--border);
  color: var(--text);
  font-size: 11px;
}
sl-tag::part(remove-button) {
  color: var(--text-muted);
}
sl-tag::part(remove-button):hover {
  color: var(--red);
}
</style>
