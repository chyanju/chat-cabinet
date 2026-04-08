<template>
  <div>
    <!-- Session start pill -->
    <div class="msg-event">
      <span class="event-pill session-start-pill">
        Session{{ session.title ? ': ' + session.title : '' }}{{ sourceTool ? ' &middot; ' + sourceTool : '' }} &middot; {{ formatTimeBrief(session.created_at) }}
      </span>
    </div>

    <template v-for="(turn, ti) in (session.turns || [])" :key="ti">
      <template v-for="(event, ei) in (turn.events || [])" :key="ti + '-' + ei">
        <MessageBlock v-if="event.type === 'message'" :event="event" />
        <ToolCallBlock v-else-if="event.type === 'tool_call'" :event="event" />
        <ThinkingBlock v-else-if="event.type === 'thinking'" :event="event" />
        <StatusEvent v-else-if="event.type === 'status'" :event="event" />
        <div v-else-if="event.type === 'file_edit' && event.uri" class="msg-event">
          <span class="event-pill">
            {{ event.action === 'create' ? '\uD83D\uDCC4' : event.action === 'delete' ? '\uD83D\uDDD1\uFE0F' : '\u270F\uFE0F' }}
            {{ event.action || 'modify' }}
            {{ (event.uri || '').replace(/^\/Users\/[^/]+/, '~') }}
          </span>
        </div>
      </template>
    </template>
  </div>
</template>

<script setup>
import { computed } from 'vue';
import { formatTimeBrief } from '../../lib/format.js';
import MessageBlock from './MessageBlock.vue';
import ToolCallBlock from './ToolCallBlock.vue';
import ThinkingBlock from './ThinkingBlock.vue';
import StatusEvent from './StatusEvent.vue';

const props = defineProps({
  session: { type: Object, required: true },
});

const sourceTool = computed(() => props.session.source?.tool || '');
</script>
