<template>
  <component :is="'div'" v-if="shouldRender">
    <!-- Turn boundaries -->
    <div v-if="isTurnBoundary" class="turn-boundary">
      <span class="turn-marker" :class="kind === 'turn_start' ? 'turn-start' : 'turn-end'">
        Turn {{ details.turn_id || '' }} {{ kind === 'turn_start' ? 'started' : 'ended' }}{{ durStr }} &middot; {{ formatTimeBrief(event.timestamp) }}
      </span>
    </div>

    <!-- Turn aborted -->
    <div v-else-if="kind === 'turn_aborted'" class="msg-block msg-action action-rejected">
      <div class="msg-label">
        <span class="action-icon">&#9940;</span> Turn Aborted
        <span class="msg-ts">{{ formatTimeBrief(event.timestamp) }}</span>
      </div>
      <div class="action-body">Reason: <strong>{{ details.reason || 'unknown' }}</strong></div>
    </div>

    <!-- Thread rolled back -->
    <div v-else-if="kind === 'thread_rolled_back'" class="msg-block msg-action action-rollback">
      <div class="msg-label">
        <span class="action-icon">&#8617;&#65039;</span> Thread Rolled Back
        <span class="msg-ts">{{ formatTimeBrief(event.timestamp) }}</span>
      </div>
      <div class="action-body">Rolled back <strong>{{ details.num_turns || '?' }}</strong> turn(s)</div>
    </div>

    <!-- LLM request -->
    <div v-else-if="kind === 'llm_request'" class="msg-event">
      <span class="event-pill">
        LLM: {{ details.model || 'unknown' }} &middot; {{ formatTimeBrief(event.timestamp) }}{{ llmMeta }}
      </span>
    </div>

    <!-- Error -->
    <div v-else-if="kind === 'error'" class="msg-block msg-tool-error">
      <div class="msg-label">Error</div>
      <div class="msg-body">{{ event.label || '' }}</div>
    </div>

    <!-- Generic pill -->
    <div v-else class="msg-event">
      <span class="event-pill">{{ displayLabel }} &middot; {{ formatTimeBrief(event.timestamp) }}</span>
    </div>
  </component>
</template>

<script setup>
import { computed } from 'vue';
import { formatTimeBrief } from '../../lib/format.js';

const props = defineProps({
  event: { type: Object, required: true },
});

const kind = computed(() => props.event.kind || '');
const details = computed(() => props.event.details || {});
const isTurnBoundary = computed(() => kind.value === 'turn_start' || kind.value === 'turn_end');

const shouldRender = computed(() => {
  return kind.value !== 'token_count';
});

const durStr = computed(() => {
  return details.value.duration_ms ? ` \u00b7 ${(details.value.duration_ms / 1000).toFixed(1)}s` : '';
});

const llmMeta = computed(() => {
  const d = details.value;
  let s = '';
  if (d.duration_ms) s += ` \u00b7 ${d.duration_ms}ms`;
  if (d.input_tokens) s += ` \u00b7 in=${d.input_tokens}`;
  if (d.output_tokens) s += ` out=${d.output_tokens}`;
  if (d.ttft_ms) s += ` \u00b7 ttft=${d.ttft_ms}ms`;
  return s;
});

const displayLabel = computed(() => {
  return props.event.label || kind.value.replace(/_/g, ' ');
});
</script>

<style scoped>
.turn-boundary {
  text-align: center;
  padding: 3px 0;
  margin: 10px 0 3px;
}
.turn-marker {
  display: inline-block;
  font-size: 10px;
  padding: 2px 10px;
  border-radius: 10px;
  letter-spacing: 0.3px;
}
.turn-start { background: var(--accent-dim); color: var(--accent); border: 1px solid var(--accent-border-dim); }
.turn-end { background: var(--surface); color: var(--text-muted); border: 1px solid var(--border); }

.action-icon { font-size: 13px; }
.action-body {
  padding: 6px 14px 10px;
  font-size: 12px;
  line-height: 1.5;
}

.action-rejected {
  border-left: 3px solid var(--red);
  background: var(--red-dim);
}
.action-rejected .msg-label { color: var(--red); }
.action-rollback {
  border-left: 3px solid var(--orange);
  background: var(--orange-dim);
}
.action-rollback .msg-label { color: var(--orange); }

.msg-tool-error {
  border-left: 3px solid var(--red);
  background: var(--red-dimmer);
}
.msg-tool-error .msg-label { color: var(--red); }
</style>
