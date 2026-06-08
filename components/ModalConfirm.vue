<template>
  <div>
    <h2>clear the board?</h2>
    <p>this will erase everything and start fresh. undo won't work after this.</p>
    <div class="modal-actions">
      <button class="modal-action" @click="emit('close')">cancel</button>
      <button class="modal-action danger" @click="emit('confirm'); emit('close')">yes, clear it</button>
    </div>
  </div>
</template>

<script setup lang="ts">
const emit = defineEmits<{ close: []; confirm: [] }>()
</script>
