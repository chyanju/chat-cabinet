<template>
  <div class="tag-view">
    <div class="tag-list-header">
      <span class="tag-list-title">Tag Management</span>
      <sl-icon-button name="plus-lg" label="Create tag" class="tag-create-btn" @click="showCreate = true" />
    </div>

    <!-- Empty state -->
    <div v-if="tagsStore.tags.length === 0" class="tag-empty">
      <p>No tags yet</p>
      <p class="tag-empty-hint">Create your first tag to organize sessions</p>
    </div>

    <!-- Tag items -->
    <div
      v-for="tag in tagsStore.tags"
      :key="tag.id"
      class="tag-list-item"
      @contextmenu.prevent="openContextMenu($event, tag)"
    >
      <!-- Inline rename mode -->
      <template v-if="renamingTag?.id === tag.id">
        <span class="tag-dot" :style="{ background: tag.color }"></span>
        <input
          ref="renameInputEl"
          class="tag-rename-input"
          :value="renameValue"
          @input="renameValue = $event.target.value"
          @keydown.enter="doRename"
          @keydown.escape="renamingTag = null"
          @blur="doRename"
        />
      </template>
      <template v-else>
        <span class="tag-dot" :style="{ background: tag.color }"></span>
        <span class="tag-name">{{ tag.name }}</span>
        <span class="tag-count">{{ getCount(tag.id) }}</span>
        <sl-icon-button
          name="pencil"
          label="Rename"
          class="tag-action-btn"
          @click.stop="startRenameDirect(tag)"
        />
        <sl-icon-button
          name="trash"
          label="Delete"
          class="tag-action-btn tag-action-danger"
          @click.stop="doDeleteDirect(tag)"
        />
      </template>
    </div>

    <!-- Context menu -->
    <div
      v-if="contextMenu"
      class="tag-context-menu"
      :style="{ top: contextMenu.y + 'px', left: contextMenu.x + 'px' }"
      ref="contextMenuEl"
    >
      <div class="tag-ctx-item" @click="startRename">
        <sl-icon name="pencil" class="tag-ctx-icon"></sl-icon>
        Rename
      </div>
      <div class="tag-ctx-item tag-ctx-danger" @click="doDelete">
        <sl-icon name="trash" class="tag-ctx-icon"></sl-icon>
        Delete
      </div>
    </div>

    <!-- Create tag dialog -->
    <sl-dialog :open="showCreate" label="Create Tag" @sl-request-close="showCreate = false">
      <sl-input
        ref="tagNameInput"
        label="Tag name"
        placeholder="Enter tag name..."
        :value="newTagName"
        @sl-input="newTagName = $event.target.value"
        @keydown.enter="doCreate"
      />
      <sl-button slot="footer" variant="primary" @click="doCreate" :disabled="!newTagName.trim()">
        Create
      </sl-button>
    </sl-dialog>
  </div>
</template>

<script setup>
import { ref, nextTick, onMounted, onUnmounted } from 'vue';
import { useTagsStore } from '../../stores/tags.js';
import { TAG_COLORS } from '../../lib/sources.js';

import '@shoelace-style/shoelace/dist/components/icon-button/icon-button.js';
import '@shoelace-style/shoelace/dist/components/icon/icon.js';
import '@shoelace-style/shoelace/dist/components/dialog/dialog.js';
import '@shoelace-style/shoelace/dist/components/input/input.js';
import '@shoelace-style/shoelace/dist/components/button/button.js';

const tagsStore = useTagsStore();

const showCreate = ref(false);
const newTagName = ref('');
const contextMenu = ref(null);
const contextMenuEl = ref(null);
const renamingTag = ref(null);
const renameValue = ref('');
const renameInputEl = ref(null);

function getCount(tagId) {
  return tagsStore.assignments.filter(a => a.tag_id === tagId).length;
}

// --- Create ---
async function doCreate() {
  const name = newTagName.value.trim();
  if (!name) return;
  const color = TAG_COLORS[tagsStore.tags.length % TAG_COLORS.length];
  await tagsStore.create(name, color);
  newTagName.value = '';
  showCreate.value = false;
}

// --- Context menu ---
function openContextMenu(e, tag) {
  contextMenu.value = { x: e.clientX, y: e.clientY, tag };
}

function closeContextMenu() {
  contextMenu.value = null;
}

function onDocClick(e) {
  if (contextMenuEl.value && !contextMenuEl.value.contains(e.target)) {
    closeContextMenu();
  }
}

onMounted(() => document.addEventListener('click', onDocClick));
onUnmounted(() => document.removeEventListener('click', onDocClick));

// --- Rename (from context menu) ---
function startRename() {
  const tag = contextMenu.value.tag;
  renameValue.value = tag.name;
  renamingTag.value = tag;
  closeContextMenu();
  nextTick(() => {
    const el = renameInputEl.value;
    const input = Array.isArray(el) ? el[0] : el;
    if (input) { input.focus(); input.select(); }
  });
}

// --- Rename (from inline button) ---
function startRenameDirect(tag) {
  renameValue.value = tag.name;
  renamingTag.value = tag;
  nextTick(() => {
    const el = renameInputEl.value;
    const input = Array.isArray(el) ? el[0] : el;
    if (input) { input.focus(); input.select(); }
  });
}

async function doRename() {
  if (!renamingTag.value) return;
  const name = renameValue.value.trim();
  const tag = renamingTag.value;
  renamingTag.value = null;
  if (name && name !== tag.name) {
    await tagsStore.update(tag.id, { name });
  }
}

// --- Delete (from context menu) ---
async function doDelete() {
  const tag = contextMenu.value.tag;
  closeContextMenu();
  const count = getCount(tag.id);
  if (count > 0 && !confirm(`Delete tag "${tag.name}"? This will remove it from ${count} session${count > 1 ? 's' : ''}.`)) return;
  await tagsStore.remove(tag.id);
}

// --- Delete (from inline button) ---
async function doDeleteDirect(tag) {
  const count = getCount(tag.id);
  if (count > 0 && !confirm(`Delete tag "${tag.name}"? This will remove it from ${count} session${count > 1 ? 's' : ''}.`)) return;
  await tagsStore.remove(tag.id);
}
</script>

<style scoped>
.tag-view {
  display: flex;
  flex-direction: column;
  flex: 1;
  overflow-y: auto;
}
.tag-list-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 10px;
}
.tag-list-title {
  font-size: 10px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: var(--text-muted);
}
.tag-create-btn::part(base) {
  color: var(--text-muted);
  font-size: 14px;
  padding: 2px;
}
.tag-create-btn::part(base):hover {
  color: var(--accent);
  background: var(--accent-dim);
}

.tag-empty {
  padding: 24px 14px;
  text-align: center;
  color: var(--text-muted);
}
.tag-empty p { margin: 0 0 4px; }
.tag-empty-hint {
  font-size: 11px;
  opacity: 0.7;
}

.tag-list-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 12px;
  border-radius: 4px;
  margin: 1px 6px;
  font-size: 12px;
  color: var(--text);
  transition: background 0.1s;
}
.tag-list-item:hover {
  background: var(--surface-hover);
}
.tag-list-item:hover .tag-action-btn {
  opacity: 1;
}

.tag-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
}
.tag-name {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.tag-count {
  font-size: 10px;
  color: var(--text-muted);
}

.tag-action-btn {
  opacity: 0;
  transition: opacity 0.15s;
}
.tag-action-btn::part(base) {
  color: var(--text-muted);
  font-size: 12px;
  padding: 2px;
}
.tag-action-btn::part(base):hover {
  color: var(--accent);
}
.tag-action-danger::part(base):hover {
  color: var(--red, #f85149);
}

.tag-rename-input {
  flex: 1;
  min-width: 0;
  background: var(--bg);
  border: 1px solid var(--accent);
  border-radius: 3px;
  color: var(--text);
  font-size: 12px;
  padding: 1px 4px;
  outline: none;
}

/* Context menu */
.tag-context-menu {
  position: fixed;
  z-index: 100;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 6px;
  padding: 4px 0;
  min-width: 140px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.4);
}
.tag-ctx-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 12px;
  font-size: 12px;
  color: var(--text);
  cursor: pointer;
  transition: background 0.1s;
}
.tag-ctx-item:hover {
  background: var(--accent-dim);
  color: var(--accent);
}
.tag-ctx-danger:hover {
  background: rgba(248, 81, 73, 0.1);
  color: var(--red, #f85149);
}
.tag-ctx-icon {
  font-size: 14px;
}

/* Dialog overrides */
sl-dialog::part(panel) {
  background: var(--surface);
  border: 1px solid var(--border);
}
sl-dialog::part(title) {
  color: var(--text);
  font-size: 14px;
}
sl-dialog::part(overlay) {
  background: rgba(0, 0, 0, 0.5);
}
</style>
