<template>
  <div class="dp-tag-input-wrap" ref="wrapEl">
    <sl-input
      ref="inputEl"
      size="small"
      placeholder="Search or create tag..."
      :value="query"
      @sl-input="onInput"
      @keydown.enter="onEnter"
      @keydown.escape="emit('close')"
    />
    <div v-if="suggestions.length > 0" class="dp-tag-suggestions">
      <div
        v-for="(item, i) in suggestions"
        :key="item.id || item.name"
        class="dp-tag-suggestion"
        :class="{ new: item.isNew, highlighted: i === highlightIndex }"
        @click="onSuggestionClick(item)"
        @mouseenter="highlightIndex = i"
      >
        <span v-if="!item.isNew" class="dp-tag-dot" :style="{ background: item.color }"></span>
        <span v-if="item.isNew" class="dp-tag-create-icon">+</span>
        <template v-if="item.isNew">Create "{{ item.name }}"</template>
        <template v-else>{{ item.name }}</template>
      </div>
    </div>
    <div v-else-if="unassignedTags.length === 0 && !query.trim()" class="dp-tag-empty-hint">
      Type to create your first tag
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, nextTick } from 'vue';
import '@shoelace-style/shoelace/dist/components/input/input.js';

const props = defineProps({
  allTags: { type: Array, required: true },
  assignedIds: { type: Set, required: true },
});

const emit = defineEmits(['assign', 'create', 'close']);

const query = ref('');
const wrapEl = ref(null);
const inputEl = ref(null);
const highlightIndex = ref(-1);

const unassignedTags = computed(() =>
  props.allTags.filter(t => !props.assignedIds.has(t.id))
);

onMounted(() => {
  nextTick(() => {
    inputEl.value?.focus();
  });
  setTimeout(() => document.addEventListener('click', onOutsideClick), 0);
});

onUnmounted(() => {
  document.removeEventListener('click', onOutsideClick);
});

function onOutsideClick(e) {
  if (wrapEl.value && !wrapEl.value.contains(e.target)) {
    emit('close');
  }
}

function onInput(e) {
  query.value = e.target.value;
  highlightIndex.value = -1;
}

const suggestions = computed(() => {
  const q = query.value.toLowerCase().trim();

  // No query: show all unassigned tags
  if (!q) return unassignedTags.value.slice(0, 8);

  const filtered = unassignedTags.value
    .filter(t => t.name.toLowerCase().includes(q))
    .slice(0, 8);

  const result = [...filtered];
  const hasExact = props.allTags.some(t => t.name.toLowerCase() === q);
  if (!hasExact) {
    result.push({ isNew: true, name: q });
  }
  return result;
});

function onSuggestionClick(item) {
  if (item.isNew) emit('create', item.name);
  else emit('assign', item.id);
}

function onEnter() {
  // If an item is highlighted, select it
  if (highlightIndex.value >= 0 && highlightIndex.value < suggestions.value.length) {
    onSuggestionClick(suggestions.value[highlightIndex.value]);
    return;
  }
  const q = query.value.trim();
  if (!q) return;
  const exact = props.allTags.find(
    t => t.name.toLowerCase() === q.toLowerCase() && !props.assignedIds.has(t.id)
  );
  if (exact) emit('assign', exact.id);
  else emit('create', q);
}
</script>

<style scoped>
.dp-tag-input-wrap {
  margin: 6px 0;
  position: relative;
}

sl-input::part(base) {
  background: var(--bg);
  border-color: var(--accent);
  font-size: 12px;
}
sl-input::part(input) {
  color: var(--text);
  font-size: 12px;
}

.dp-tag-suggestions {
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 4px;
  margin-top: 2px;
  z-index: 50;
  box-shadow: 0 4px 12px rgba(0,0,0,0.3);
}
.dp-tag-suggestion {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 5px 8px;
  font-size: 12px;
  color: var(--text);
  cursor: pointer;
  transition: background 0.1s;
}
.dp-tag-suggestion:hover,
.dp-tag-suggestion.highlighted {
  background: var(--accent-dim);
  color: var(--accent);
}
.dp-tag-suggestion.new {
  color: var(--green);
  font-style: italic;
}
.dp-tag-create-icon {
  font-weight: 700;
  font-style: normal;
}
.dp-tag-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  flex-shrink: 0;
}
.dp-tag-empty-hint {
  font-size: 11px;
  color: var(--text-muted);
  padding: 6px 2px;
  font-style: italic;
}
</style>
