<script setup lang="ts">
import { nanoid } from 'nanoid'

const boardId = nanoid(10)
await navigateTo(`/board/${boardId}`, { replace: true })
</script>

<template>
  <div class="flex items-center justify-center h-screen bg-slate-950">
    <div class="flex items-center gap-3 text-slate-500">
      <div class="w-4 h-4 rounded-full bg-violet-600 animate-pulse" />
      <span class="text-sm">Creating board…</span>
    </div>
  </div>
</template>
