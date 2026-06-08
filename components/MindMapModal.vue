<template>
  <div v-if="open" class="modal-backdrop" @click="onBackdrop"
       role="dialog" aria-modal="true"
       :aria-label="modalLabel">
    <div class="modal">
      <ModalExport   v-if="mode === 'export'"       @close="emit('close')" @exportpng="emit('exportpng')" />
      <ModalImport   v-else-if="mode === 'import'"   @close="emit('close')" @fit="emit('fit')" />
      <ModalConfirm  v-else-if="mode === 'confirm'"  @close="emit('close')" @confirm="emit('confirm')" />
      <ModalSettings v-else-if="mode === 'settings'" @close="emit('close')" />
      <ModalHelp     v-else-if="mode === 'help'"     @close="emit('close')" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{ open: boolean; mode: 'export' | 'import' | 'help' | 'confirm' | 'settings' | null }>()
const emit = defineEmits<{ close: []; fit: []; confirm: []; exportpng: [] }>()

const modalLabel = computed(() => {
  switch (props.mode) {
    case 'export':   return 'Export mind map'
    case 'import':   return 'Import mind map'
    case 'confirm':  return 'Confirm clear board'
    case 'settings': return 'API key settings'
    case 'help':     return 'Quick tour'
    default:         return 'Dialog'
  }
})

function onBackdrop(e: MouseEvent) {
  if (e.target === e.currentTarget) emit('close')
}
</script>
