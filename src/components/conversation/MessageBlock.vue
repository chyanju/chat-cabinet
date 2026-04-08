<template>
  <div v-if="shouldRender" class="msg-block" :class="cssClass">
    <div class="msg-label">
      {{ label }}
      <span v-if="event.timestamp" class="msg-ts">{{ formatTimeBrief(event.timestamp) }}</span>
    </div>
    <div v-if="isSystem" class="msg-body">
      {{ (event.content || '').slice(0, 200) }}{{ (event.content || '').length > 200 ? '...' : '' }}
    </div>
    <div v-if="isSystem">
      <sl-details summary="Full system prompt" class="system-details">
        <div class="msg-body" v-html="renderedContent"></div>
      </sl-details>
    </div>
    <div v-else class="msg-body" v-html="renderedContent"></div>
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

const role = computed(() => props.event.role || 'unknown');
const isSystem = computed(() => role.value === 'system');
const isUser = computed(() => role.value === 'user');
const isAssistant = computed(() => role.value === 'assistant');

const shouldRender = computed(() => {
  if (props.event.is_command) return false;
  if (!(props.event.content || '').trim()) return false;
  return true;
});

const cssClass = computed(() => {
  if (isUser.value) return 'msg-user';
  if (isAssistant.value) return 'msg-assistant';
  if (isSystem.value) return 'msg-developer';
  return 'msg-developer';
});

const label = computed(() => {
  if (isSystem.value) return 'SYSTEM';
  if (isUser.value) {
    let l = 'USER';
    if (props.event.agent) {
      const name = props.event.agent.name || props.event.agent.id || '';
      if (name) l = `USER \u2192 ${name.replace('github.copilot.', '')}`;
    }
    return l;
  }
  return 'ASSISTANT';
});

const renderedContent = computed(() => {
  return renderMarkdown(props.event.content || '');
});
</script>

<style scoped>
.msg-user {
  border-left: 3px solid var(--accent);
  background: var(--user-bg);
}
.msg-user .msg-label { color: var(--accent); }

.msg-assistant {
  border-left: 3px solid var(--green);
  background: var(--assistant-bg);
}
.msg-assistant .msg-label { color: var(--green); }

.msg-developer {
  border-left: 3px solid var(--text-muted);
  background: var(--surface);
}
.msg-developer .msg-label { color: var(--text-muted); }

.system-details {
  margin: 0 14px 10px;
}
</style>
