<template>
  <div v-if="shouldRender" class="msg-block" :class="cssClass">
    <div class="msg-label">
      {{ label }}
      <span v-if="event.timestamp" class="msg-ts">{{ formatTimeBrief(event.timestamp) }}</span>
    </div>
    <div v-if="isSystem" class="msg-body">
      {{ redact((event.content || '').slice(0, 200)) }}{{ (event.content || '').length > 200 ? '...' : '' }}
    </div>
    <div v-if="isSystem">
      <sl-details summary="Full system prompt" class="system-details">
        <div class="msg-body" v-html="renderedContent"></div>
      </sl-details>
    </div>
    <div v-else class="msg-body" v-html="renderedContent"></div>

    <!-- File attachments -->
    <div v-if="event.attachments?.length" class="msg-attachments">
      <div v-for="(att, i) in event.attachments" :key="i" class="msg-attachment">
        <span class="att-icon">{{ attIcon(att) }}</span>
        <span class="att-name">{{ att.name || 'file' }}</span>
        <span v-if="att.size_bytes" class="att-size">{{ formatBytes(att.size_bytes) }}</span>
        <span v-if="att.type && att.type !== 'file'" class="att-type">{{ att.type }}</span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue';
import { formatTimeBrief } from '../../lib/format.js';
import { renderMarkdown } from '../../lib/markdown.js';
import { redact } from '../../lib/redact.js';

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
  if (!(props.event.content || '').trim() && !props.event.attachments?.length) return false;
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
  return renderMarkdown(redact(props.event.content || ''));
});

function attIcon(att) {
  const t = (att.type || '').toLowerCase();
  if (t.includes('image')) return '\uD83D\uDDBC\uFE0F';
  if (t.includes('word') || t.includes('doc')) return '\uD83D\uDCC4';
  if (t.includes('pdf')) return '\uD83D\uDCC4';
  if (t.includes('audio')) return '\uD83C\uDFB5';
  if (t.includes('video')) return '\uD83C\uDFAC';
  return '\uD83D\uDCCE';
}

function formatBytes(bytes) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}
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

/* File attachments */
.msg-attachments {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  padding: 6px 14px 10px;
}
.msg-attachment {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  background: var(--bg);
  border: 1px solid var(--border);
  border-radius: 6px;
  padding: 4px 10px;
  font-size: 11px;
  color: var(--text-muted);
}
.att-icon { font-size: 13px; }
.att-name {
  max-width: 200px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: var(--text);
}
.att-size { color: var(--text-muted); font-size: 10px; }
.att-type {
  color: var(--text-muted);
  font-size: 9px;
  background: var(--surface-hover);
  padding: 1px 4px;
  border-radius: 3px;
}
</style>
