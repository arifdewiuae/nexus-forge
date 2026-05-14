<script setup lang="ts">
import type { PresenceUser } from '~/lib/ai/types'

defineProps<{ users: PresenceUser[] }>()
</script>

<!-- Phase 3: renders remote user cursors overlaid on the canvas -->
<template>
  <div class="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
    <div
      v-for="user in users"
      :key="user.clientId"
      class="absolute transition-transform duration-75"
      :style="{ transform: `translate(${user.cursor?.x ?? -100}px, ${user.cursor?.y ?? -100}px)` }"
    >
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        <path d="M0 0l4 12 2.5-3.5L10 12 16 0z" :fill="user.color" />
      </svg>
      <span
        class="absolute left-4 top-0 text-[10px] font-medium px-1 py-0.5 rounded whitespace-nowrap"
        :style="{ backgroundColor: user.color, color: '#fff' }"
      >
        {{ user.name }}
      </span>
    </div>
  </div>
</template>
