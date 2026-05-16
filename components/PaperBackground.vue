<template>
  <svg class="paper-bg" :width="size.w" :height="size.h" :viewBox="`0 0 ${size.w} ${size.h}`">
    <filter id="paperGrain">
      <feTurbulence baseFrequency="0.72" numOctaves="2" seed="7"/>
      <feColorMatrix values="0 0 0 0 0.35  0 0 0 0 0.28  0 0 0 0 0.18  0 0 0 0.18 0"/>
    </filter>
    <rect :width="size.w" :height="size.h" filter="url(#paperGrain)"/>
    <radialGradient id="paperVignette" cx="50%" cy="50%" r="70%">
      <stop offset="60%" stop-color="rgba(0,0,0,0)"/>
      <stop offset="100%" stop-color="rgba(139,107,67,0.08)"/>
    </radialGradient>
    <rect :width="size.w" :height="size.h" fill="url(#paperVignette)"/>
  </svg>
  <svg class="paper-rules" :width="size.w" :height="size.h" :viewBox="`0 0 ${size.w} ${size.h}`">
    <g opacity="0.18">
      <line v-for="y in lines" :key="y" x1="0" :y1="y" :x2="size.w" :y2="y" stroke="#3a5a8a" stroke-width="0.6"/>
    </g>
    <line x1="84" y1="0" x2="84" :y2="size.h" stroke="var(--accent)" stroke-width="0.9" opacity="0.45"/>
  </svg>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'

const size = ref({ w: 1280, h: 800 })
function update() { size.value = { w: window.innerWidth, h: window.innerHeight } }
onMounted(() => { update(); window.addEventListener('resize', update) })
onBeforeUnmount(() => window.removeEventListener('resize', update))

const lines = computed(() => {
  const arr: number[] = []
  for (let y = 30; y < size.value.h; y += 30) arr.push(y)
  return arr
})
</script>
