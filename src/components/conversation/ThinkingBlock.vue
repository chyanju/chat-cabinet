<template>
  <div v-if="hasContent" class="msg-block msg-reasoning">
    <sl-details>
      <div slot="summary" class="thinking-summary">
        <span>&#129504; Thinking{{ modelStr }}</span>
        <span class="thinking-ts">{{ formatTimeBrief(event.timestamp) }}</span>
      </div>
      <div class="msg-body" v-html="renderedContent"></div>
    </sl-details>
  </div>
</template>

<script setup>
import { computed } from 'vue';
import { formatTimeBrief } from '../../lib/format.js';
import { renderMarkdown } from '../../lib/markdown.js';

import '@shoelace-style/shoelace/dist/components/details/details.js';

const props = defineProps({
  event: { type: Object, required: true },
});

const hasContent = computed(() => {
  return (props.event.content || '').trim() || props.event.encrypted;
});

const modelStr = computed(() => {
  return props.event.model ? ' \u00b7 ' + props.event.model : '';
});

const renderedContent = computed(() => {
  if (props.event.encrypted && !props.event.content) return '<em>(reasoning content encrypted)</em>';
  return renderMarkdown(props.event.content || '');
});
</script>

<style scoped>
.msg-reasoning {
  border-left: 3px solid var(--reasoning);
  background: var(--reasoning-bg);
  opacity: 0.7;
}

sl-details::part(base) {
  border: none;
  background: transparent;
}
sl-details::part(header) {
  padding: 7px 14px;
  font-size: 11px;
  font-weight: 600;
  color: var(--reasoning);
}
sl-details::part(content) {
  padding: 0;
}

.thinking-summary {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
}
.thinking-ts {
  font-weight: 400;
  font-size: 10px;
  color: var(--text-muted);
  margin-left: auto;
}

.msg-body {
  font-size: 12px;
  opacity: 0.8;
}
</style>
