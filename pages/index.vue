<script setup lang="ts">
import { nanoid } from 'nanoid'

definePageMeta({ ssr: false })

const boardId = nanoid(10)
await navigateTo(`/board/${boardId}`, { replace: true })
</script>

<template>
  <div style="display:flex;align-items:center;justify-content:center;height:100vh;background:var(--paper)">
    <span style="font-family:'Caveat',cursive;font-size:28px;color:var(--muted)">opening your map…</span>
  </div>
</template>
