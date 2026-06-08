<template>
  <div>
    <h2>quick tour</h2>
    <p style="font-size:16px;line-height:1.65;color:var(--ink)">
      <strong>click</strong> a thought to select it · <strong>drag</strong> to move ·
      <strong>double-click</strong> to rename.<br/>
      <kbd>tab</kbd> add a child · <kbd>del</kbd> delete · <kbd>enter</kbd> rename.<br/><br/>

      <strong>toolbar tools</strong><br/>
      <em>+ node</em> — place a free-floating thought anywhere on the canvas.<br/>
      <em>↗ branch</em> <kbd>L</kbd> — re-parent: click a node, then click its new parent. Draws a <strong>solid</strong> branch line.<br/>
      <em>⤳ connect</em> <kbd>C</kbd> — draw a loose association between any two nodes. Draws a <strong>dashed</strong> line. Doesn't move anything.<br/>
      <em>✗ erase</em> — click a node to delete it and its subtree.<br/><br/>

      <kbd>scroll</kbd> to pan · <kbd>⌘</kbd>+<kbd>scroll</kbd> to zoom · <kbd>drag</kbd> empty space to pan.<br/>
      <strong>✦ ask AI</strong> — pick a robot, then let it analyze, extend, or rebuild your map.<br/>
      <strong>⊹ tidy</strong> — ask AI to reposition all nodes into a clean radial layout.<br/>
      everything auto-saves in your browser.
    </p>
    <div class="modal-actions">
      <button class="modal-action primary" @click="emit('close')">got it</button>
    </div>
  </div>
</template>

<script setup lang="ts">
const emit = defineEmits<{ close: [] }>()
</script>
