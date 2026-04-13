<template>
  <div class="msg-block" :class="isError ? 'msg-tool-error' : 'msg-tool'">
    <sl-details :open="true">
      <div slot="summary" class="tool-summary">
        <span class="tool-name">&#128295; {{ toolId }}</span>
        <span v-if="confirmState && confirmState !== 'unknown'" class="conf-badge" :class="'conf-' + confirmState">{{ confirmLabel }}</span>
        <span class="tool-meta">{{ durStr }}{{ formatTimeBrief(event.timestamp) }}</span>
      </div>

      <div class="tool-detail">
        <!-- Subagent info -->
        <template v-if="event.subagent">
          <div v-if="event.subagent.agent_name" class="tool-sub-label">Agent: {{ event.subagent.agent_name }}</div>
        </template>

        <!-- Input -->
        <template v-if="input.command">
          <div class="tool-sub-label">Command:</div>
          <div class="tool-cmd">{{ redact(input.command) }}</div>
        </template>
        <template v-else-if="input.file_path && !input.raw">
          <div class="tool-cmd">{{ redact(input.file_path) }}</div>
        </template>
        <template v-else-if="input.urls && input.urls.length">
          <div class="tool-cmd">{{ redact(input.urls.join('\n')) }}</div>
        </template>
        <template v-else-if="input.raw">
          <div class="tool-cmd">{{ redact(formattedRaw) }}</div>
        </template>

        <!-- Subagent prompt -->
        <template v-if="event.subagent?.prompt">
          <div class="tool-sub-label">Prompt:</div>
          <div class="tool-cmd">{{ redact(event.subagent.prompt.slice(0, 2000)) }}</div>
        </template>

        <!-- Output -->
        <template v-if="output.error">
          <div class="tool-exec-result exec-fail">{{ redact(output.error) }}</div>
        </template>
        <template v-if="output.text">
          <div class="tool-sub-label">Output: {{ exitBadge }}</div>
          <div class="tool-output">{{ redact(output.text.slice(0, 3000)) }}</div>
        </template>
        <template v-else-if="output.exit_code != null">
          <div class="tool-exec-result" :class="output.exit_code === 0 ? 'exec-ok' : 'exec-fail'">
            exit {{ output.exit_code }}
          </div>
        </template>
        <template v-if="output.urls && output.urls.length">
          <div class="tool-sub-label">URLs:</div>
          <div class="tool-output">{{ redact(output.urls.join('\n')) }}</div>
        </template>

        <!-- Subagent result -->
        <template v-if="event.subagent?.result">
          <div class="tool-sub-label">Result:</div>
          <div class="tool-output">{{ redact(formattedResult) }}</div>
        </template>
      </div>
    </sl-details>
  </div>
</template>

<script setup>
import { computed } from 'vue';
import { formatTimeBrief } from '../../lib/format.js';
import { redact } from '../../lib/redact.js';

import '@shoelace-style/shoelace/dist/components/details/details.js';

const CONFIRMATION_LABELS = {
  'auto': 'Auto-approved',
  'accepted': 'Accepted',
  'rejected': 'Rejected',
  'allow_all': 'Allow All',
  'pending': 'Pending',
};

const props = defineProps({
  event: { type: Object, required: true },
});

const toolId = computed(() => props.event.tool_id || 'unknown');
const isError = computed(() => props.event.status === 'error');
const input = computed(() => props.event.input || {});
const output = computed(() => props.event.output || {});

const confirmState = computed(() => props.event.confirmation?.state || '');
const confirmLabel = computed(() => CONFIRMATION_LABELS[confirmState.value] || '');

const durStr = computed(() => {
  return props.event.duration_ms ? `${(props.event.duration_ms / 1000).toFixed(1)}s \u00b7 ` : '';
});

const exitBadge = computed(() => {
  if (output.value.exit_code == null) return '';
  return output.value.exit_code === 0 ? 'exit 0' : `exit ${output.value.exit_code}`;
});

const formattedRaw = computed(() => {
  const raw = input.value.raw || '';
  try {
    return JSON.stringify(JSON.parse(raw), null, 2).slice(0, 2000);
  } catch {
    return raw.slice(0, 2000);
  }
});

const formattedResult = computed(() => {
  const r = props.event.subagent?.result;
  if (!r) return '';
  const str = typeof r === 'string' ? r : JSON.stringify(r, null, 2);
  return str.slice(0, 3000);
});
</script>

<style scoped>
.msg-tool {
  border-left: 3px solid var(--orange);
  background: var(--tool-bg);
}
.msg-tool-error {
  border-left: 3px solid var(--red);
  background: var(--red-dimmer);
}

sl-details::part(base) {
  border: none;
  background: transparent;
}
sl-details::part(header) {
  padding: 7px 14px;
  font-size: 11px;
  font-weight: 600;
  color: var(--orange);
}
.msg-tool-error sl-details::part(header) {
  color: var(--red);
}
sl-details::part(content) {
  padding: 0;
}

.tool-summary {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
}
.tool-name {
  white-space: nowrap;
}
.tool-meta {
  font-weight: 400;
  font-size: 10px;
  color: var(--text-muted);
  margin-left: auto;
  white-space: nowrap;
}

/* Confirmation badges — colored pills similar to the Dev badge */
.conf-badge {
  display: inline-block;
  padding: 1px 6px;
  border-radius: 3px;
  font-size: 9px;
  font-weight: 600;
  letter-spacing: 0.3px;
  text-transform: uppercase;
  white-space: nowrap;
  flex-shrink: 0;
}
.conf-auto {
  background: #3fb950;
  color: #fff;
}
.conf-accepted {
  background: #58a6ff;
  color: #fff;
}
.conf-allow_all {
  background: #58a6ff;
  color: #fff;
}
.conf-rejected {
  background: #f85149;
  color: #fff;
}
.conf-pending {
  background: #8b949e;
  color: #fff;
}

.tool-detail {
  padding: 0 14px 10px;
  font-size: 12px;
}
.tool-sub-label {
  font-size: 11px;
  color: var(--text-muted);
  margin: 8px 0 4px;
}
.tool-cmd {
  background: var(--bg);
  border: 1px solid var(--border);
  border-radius: 6px;
  padding: 8px 12px;
  font-family: 'SF Mono', Menlo, Consolas, monospace;
  font-size: 11px;
  white-space: pre-wrap;
  word-break: break-all;
  max-height: 400px;
  overflow-y: auto;
  margin-top: 6px;
}
.tool-output {
  background: var(--tool-output-bg);
  border: 1px solid var(--border);
  border-radius: 6px;
  padding: 8px 12px;
  font-family: 'SF Mono', Menlo, Consolas, monospace;
  font-size: 10px;
  white-space: pre-wrap;
  word-break: break-all;
  max-height: 300px;
  overflow-y: auto;
  margin-top: 6px;
  color: var(--text-muted);
}
.tool-exec-result {
  font-size: 11px;
  padding: 5px 8px;
  border-radius: 4px;
  margin-top: 6px;
}
.exec-ok { background: var(--green-dim); color: var(--green); }
.exec-fail { background: var(--red-dim); color: var(--red); }
</style>
