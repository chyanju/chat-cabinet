<template>
  <div v-if="tabsStore.activeSession" class="dp-section dp-redaction">
    <div class="dp-section-title">Redaction</div>
    <div class="dp-redaction-options">
      <sl-checkbox
        v-for="rule in rules"
        :key="rule.id"
        :checked="!!uiStore.redactionToggles[rule.id]"
        @sl-change="uiStore.toggleRedaction(rule.id)"
      >
        <span class="redact-label">{{ rule.label }}</span>
        <span class="redact-desc">{{ rule.description }}</span>
      </sl-checkbox>
    </div>
    <div v-if="activeCount > 0" class="dp-redaction-footer">
      <sl-button size="small" variant="default" outline @click="uiStore.resetRedactions()">
        Reset All
      </sl-button>
      <span class="redact-count">{{ activeCount }} active</span>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue';
import { useUiStore } from '../../stores/ui.js';
import { useTabsStore } from '../../stores/tabs.js';
import { REDACTION_RULES } from '../../lib/redact.js';

import '@shoelace-style/shoelace/dist/components/checkbox/checkbox.js';
import '@shoelace-style/shoelace/dist/components/button/button.js';

const uiStore = useUiStore();
const tabsStore = useTabsStore();

const rules = REDACTION_RULES;

const activeCount = computed(() => {
  return Object.values(uiStore.redactionToggles).filter(Boolean).length;
});
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
.dp-redaction-options {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
sl-checkbox::part(base) {
  font-size: 11px;
  color: var(--text-muted);
  align-items: flex-start;
}
sl-checkbox::part(control) {
  width: 14px;
  height: 14px;
  margin-top: 1px;
}
.redact-label {
  color: var(--text);
}
.redact-desc {
  display: block;
  font-size: 10px;
  color: var(--text-muted);
  margin-top: 1px;
}
.dp-redaction-footer {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 10px;
  padding-top: 8px;
  border-top: 1px solid var(--border);
}
sl-button::part(base) {
  font-size: 11px;
}
.redact-count {
  font-size: 10px;
  color: var(--text-muted);
  margin-left: auto;
}
</style>
