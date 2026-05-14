<script setup lang="ts">
const props = defineProps<{ boardId: string }>()

const containerRef = ref<HTMLDivElement | null>(null)
const canvasEl = ref<HTMLCanvasElement | null>(null)

const { init, getSerializedBoard, exportPNG, exportJSON, clearBoard, resetZoom, applyBoardAction, applyAllBoardActions } = useCanvas()

onMounted(() => {
  if (canvasEl.value && containerRef.value) {
    init(canvasEl.value, containerRef.value, props.boardId)
  }
})

defineExpose({ getSerializedBoard, exportPNG, exportJSON, clearBoard, resetZoom, applyBoardAction, applyAllBoardActions })
</script>

<template>
  <div ref="containerRef" class="relative w-full h-full overflow-hidden canvas-container">
    <canvas ref="canvasEl" />
  </div>
</template>
