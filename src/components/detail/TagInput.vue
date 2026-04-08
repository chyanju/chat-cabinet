<template>
  <div class="dp-tag-input-wrap" ref="wrapEl">
    <sl-input
      ref="inputEl"
      size="small"
      placeholder="Type tag name..."
      :value="query"
      @sl-input="onInput"
      @keydown.enter="onEnter"
      @keydown.escape="emit('close')"
    />
    <div v-if="query && suggestions.length > 0" class="dp-tag-suggestions">
      <div
        v-for="item in suggestions"
        :key="item.id || item.name"
        class="dp-tag-suggestion"
        :class="{ new: item.isNew }"
        @click="onSuggestionClick(item)"
      >
        <span v-if="!item.isNew" class="dp-tag-dot" :style="{ background: item.color }"></span>
        <template v-if="item.isNew">Create "{{ item.name }}"</template>
        <template v-else>{{ item.name }}</template>
      </div>
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

onMounted(() => {
  nextTick(() => inputEl.value?.focus());
  document.addEventListener('click', onOutsideClick);
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
}

const suggestions = computed(() => {
  const q = query.value.toLowerCase().trim();
  if (!q) return [];

  const filtered = props.allTags.filter(
    t => !props.assignedIds.has(t.id) && t.name.toLowerCase().includes(q)
  ).slice(0, 5);

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
.dp-tag-suggestion:hover {
  background: var(--accent-dim);
  color: var(--accent);
}
.dp-tag-suggestion.new {
  color: var(--green);
  font-style: italic;
}
.dp-tag-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  flex-shrink: 0;
}
</style>
