<script setup lang="ts">
const props = defineProps<{ boardId: string }>()

const containerRef = ref<HTMLDivElement | null>(null)
const canvasEl     = ref<HTMLCanvasElement | null>(null)
const textareaRef  = ref<HTMLTextAreaElement | null>(null)

const {
  init, stickyEditor, commitStickyEdit, cancelStickyEdit,
  getSerializedBoard, exportPNG, exportJSON, clearBoard, resetZoom,
  applyBoardAction, applyAllBoardActions,
} = useCanvas()

onMounted(() => {
  if (canvasEl.value && containerRef.value) {
    init(canvasEl.value, containerRef.value, props.boardId)
  }
})

watch(() => stickyEditor.active, (active) => {
  if (active) nextTick(() => { textareaRef.value?.focus(); textareaRef.value?.select() })
})

defineExpose({ getSerializedBoard, exportPNG, exportJSON, clearBoard, resetZoom, applyBoardAction, applyAllBoardActions })
</script>

<template>
  <div ref="containerRef" class="relative w-full h-full overflow-hidden canvas-container">
    <canvas ref="canvasEl" />

    <textarea
      v-if="stickyEditor.active"
      ref="textareaRef"
      v-model="stickyEditor.text"
      class="sticky-textarea"
      :style="{
        left:            stickyEditor.x      + 'px',
        top:             stickyEditor.y      + 'px',
        width:           stickyEditor.width  + 'px',
        minHeight:       stickyEditor.height + 'px',
        backgroundColor: stickyEditor.color,
      }"
      @blur="commitStickyEdit(stickyEditor.text)"
      @keydown.esc.prevent="cancelStickyEdit()"
      @keydown.meta.enter.prevent="commitStickyEdit(stickyEditor.text)"
      @keydown.ctrl.enter.prevent="commitStickyEdit(stickyEditor.text)"
    />
  </div>
</template>

<style scoped>
.sticky-textarea {
  position: fixed;
  z-index: 100;
  resize: none;
  border: 2px solid rgba(0, 0, 0, 0.25);
  border-radius: 4px;
  outline: none;
  padding: 8px;
  box-sizing: border-box;
  color: #1e293b;
  font-size: 13px;
  font-family: Inter, system-ui, sans-serif;
  line-height: 1.5;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.25);
  overflow: hidden;
  /* Auto-grow by letting content expand min-height */
  height: auto;
}
</style>
