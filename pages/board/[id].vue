<script setup lang="ts">
import { Sparkles, Download, Link2, Check, Square } from 'lucide-vue-next'
import Whiteboard from '~/components/Whiteboard.vue'
import type { BoardAction } from '~/lib/ai/types'

definePageMeta({ ssr: false })

const route    = useRoute()
const boardId  = computed(() => route.params.id as string)
const store    = useBoardStore()

const whiteboardRef = ref<InstanceType<typeof Whiteboard> | null>(null)
const justCopied    = ref(false)

const { analyze, abort } = useAIAnalysis()

// ── Analyze ──────────────────────────────────────────────────────────────────

async function handleAnalyze(): Promise<void> {
  const board = whiteboardRef.value?.getSerializedBoard()
  if (!board || board.objectCount === 0) return
  await analyze(board)
}

function handleStop(): void {
  abort()
}

// ── Apply AI suggestion ──────────────────────────────────────────────────────

async function handleApplyAction(action: BoardAction): Promise<void> {
  await whiteboardRef.value?.applyBoardAction(action)
}

// ── Export ───────────────────────────────────────────────────────────────────

function handleExportPNG(): void {
  const dataUrl = whiteboardRef.value?.exportPNG()
  if (!dataUrl) return
  triggerDownload(dataUrl, `nexus-forge-${boardId.value}.png`)
}

function handleExportJSON(): void {
  const json = whiteboardRef.value?.exportJSON()
  if (!json) return
  const blob = new Blob([json], { type: 'application/json' })
  const url  = URL.createObjectURL(blob)
  triggerDownload(url, `nexus-forge-${boardId.value}.json`)
  URL.revokeObjectURL(url)
}

function triggerDownload(href: string, filename: string): void {
  const a = document.createElement('a')
  a.href = href
  a.download = filename
  a.click()
}

// ── Share link ────────────────────────────────────────────────────────────────

async function copyBoardLink(): Promise<void> {
  await navigator.clipboard.writeText(window.location.href)
  justCopied.value = true
  setTimeout(() => { justCopied.value = false }, 2000)
}

// ── Canvas ────────────────────────────────────────────────────────────────────

function handleClear(): void     { whiteboardRef.value?.clearBoard() }
function handleResetZoom(): void { whiteboardRef.value?.resetZoom() }
</script>

<template>
  <div class="flex flex-col h-screen bg-slate-950 overflow-hidden">

    <!-- ── Header ──────────────────────────────────────────────────────────── -->
    <header class="flex items-center gap-3 px-4 h-12 border-b border-slate-800 shrink-0 bg-slate-950 z-20">

      <!-- Logo -->
      <div class="flex items-center gap-2 mr-2">
        <div class="w-6 h-6 rounded bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center">
          <span class="text-white text-[10px] font-bold select-none">NF</span>
        </div>
        <span class="text-sm font-semibold text-slate-200 tracking-tight">Nexus Forge</span>
      </div>

      <!-- Board ID / share link -->
      <button
        :aria-label="justCopied ? 'Link copied!' : 'Copy board link'"
        :title="justCopied ? 'Copied!' : 'Copy board link'"
        class="flex items-center gap-1.5 px-2 py-1 rounded text-xs text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors font-mono"
        @click="copyBoardLink"
      >
        <component :is="justCopied ? Check : Link2" :size="12" :class="justCopied ? 'text-green-400' : ''" />
        {{ boardId }}
      </button>

      <div class="flex-1" />

      <!-- Presence — Phase 3 placeholder -->
      <div class="flex items-center gap-1 mr-2" aria-label="Active collaborators">
        <div class="w-6 h-6 rounded-full bg-violet-600 ring-2 ring-slate-950 text-[9px] text-white flex items-center justify-center font-medium select-none">
          You
        </div>
      </div>

      <!-- Analyze / Stop button -->
      <button
        :aria-label="store.isAnalyzing ? 'Stop analysis' : 'Analyze board with AI'"
        :class="[
          'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-all',
          store.isAnalyzing
            ? 'bg-slate-700 hover:bg-slate-600 text-slate-300'
            : 'bg-violet-600 hover:bg-violet-500 text-white shadow-lg shadow-violet-900/30',
        ]"
        @click="store.isAnalyzing ? handleStop() : handleAnalyze()"
      >
        <component
          :is="store.isAnalyzing ? Square : Sparkles"
          :size="14"
          :class="store.isAnalyzing ? '' : ''"
        />
        {{ store.isAnalyzing ? 'Stop' : 'Analyze Board' }}
      </button>

      <!-- Export dropdown -->
      <div class="relative group">
        <button
          aria-label="Export board"
          class="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
        >
          <Download :size="14" />
          Export
        </button>
        <div class="absolute right-0 top-full mt-1 w-36 bg-slate-800 border border-slate-700 rounded-lg shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-30">
          <button
            class="w-full px-3 py-2 text-left text-sm text-slate-300 hover:bg-slate-700 hover:text-white rounded-t-lg transition-colors"
            @click="handleExportPNG"
          >
            Export as PNG
          </button>
          <button
            class="w-full px-3 py-2 text-left text-sm text-slate-300 hover:bg-slate-700 hover:text-white rounded-b-lg transition-colors"
            @click="handleExportJSON"
          >
            Export as JSON
          </button>
        </div>
      </div>
    </header>

    <!-- ── Main ────────────────────────────────────────────────────────────── -->
    <div class="flex flex-1 overflow-hidden">

      <Toolbar :on-clear="handleClear" :on-reset-zoom="handleResetZoom" />

      <main class="flex-1 relative overflow-hidden">
        <Whiteboard ref="whiteboardRef" :board-id="boardId" class="w-full h-full" />

        <!-- Empty state hint -->
        <Transition name="fade">
          <div
            v-if="store.zoom === 1 && !store.hasUnsavedChanges"
            class="pointer-events-none absolute inset-0 flex items-center justify-center"
          >
            <div class="text-center space-y-1.5">
              <p class="text-slate-700 text-sm">Pick a tool and start drawing</p>
              <p class="text-slate-800 text-xs">Space+drag to pan · Ctrl+Scroll to zoom</p>
            </div>
          </div>
        </Transition>
      </main>

      <AITracePanel :on-apply-action="handleApplyAction" />
    </div>
  </div>
</template>

<style scoped>
.fade-enter-active, .fade-leave-active { transition: opacity 0.4s ease; }
.fade-enter-from, .fade-leave-to       { opacity: 0; }
</style>
