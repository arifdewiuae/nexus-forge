/* =========================================================
   stores/mindMapStore.ts — reactive graph store (TypeScript
   port of design/mindmap-app/graph.js) + AI analysis state
   ========================================================= */
import { defineStore, skipHydrate } from 'pinia'
import type { MindMapNode, CrossLink, MindMapAction, AnalysisResult, AgentPersona } from '~/lib/ai/types'
import { AGENTS } from '~/lib/ai/types'

const STORAGE_KEY = 'handwritten-mindmap-v1'
const HISTORY_LIMIT = 80

const SEED: { title: string; nextId: number; nodes: MindMapNode[] } = {
  title: 'ideas',
  nextId: 100,
  nodes: [
    { id: 'root', x:    0, y:    0, label: 'central idea',    parent: null },
    { id: 'r',    x: -300, y: -150, label: 'Research',        parent: 'root' },
    { id: 'd',    x:  300, y: -150, label: 'Design',          parent: 'root' },
    { id: 'e',    x:  300, y:  150, label: 'Engineering',     parent: 'root' },
    { id: 'm',    x: -300, y:  150, label: 'Marketing',       parent: 'root' },
    { id: 'r1',   x: -500, y: -250, label: 'User interviews', parent: 'r' },
    { id: 'r2',   x: -520, y: -150, label: 'Competitors',     parent: 'r' },
    { id: 'r3',   x: -460, y:  -50, label: 'Pricing study',   parent: 'r' },
    { id: 'd1',   x:  500, y: -250, label: 'Wireframes',      parent: 'd' },
    { id: 'd2',   x:  520, y: -150, label: 'Brand refresh',   parent: 'd' },
    { id: 'd3',   x:  460, y:  -50, label: 'Hi-fi prototype', parent: 'd' },
    { id: 'e1',   x:  460, y:   50, label: 'API v2',          parent: 'e' },
    { id: 'e2',   x:  520, y:  150, label: 'Frontend',        parent: 'e' },
    { id: 'e3',   x:  500, y:  250, label: 'QA + release',    parent: 'e' },
    { id: 'm1',   x: -460, y:   50, label: 'Press kit',       parent: 'm' },
    { id: 'm2',   x: -520, y:  150, label: 'Launch video',    parent: 'm' },
    { id: 'm3',   x: -500, y:  250, label: 'Social teaser',   parent: 'm' },
  ],
}

function clone<T>(o: T): T {
  return JSON.parse(JSON.stringify(o)) as T
}

function loadInitial(): { title: string; nextId: number; nodes: MindMapNode[] } {
  if (import.meta.client) {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (raw) {
        const p = JSON.parse(raw)
        if (p && Array.isArray(p.nodes) && p.nodes.length) {
          if (typeof p.title !== 'string') p.title = 'untitled'
          if (typeof p.nextId !== 'number') p.nextId = 100
          return p
        }
      }
    } catch { /* fallthrough */ }
  }
  return clone(SEED)
}

const BRANCH_HUES = ['#c4604a', '#3a6a8a', '#5a7a3a', '#8a5a3a', '#7a4a7a', '#8a4a4a']

export const useMindMapStore = defineStore('mindMap', () => {
  const initial = loadInitial()

  /* ---- graph state ---- */
  const title      = ref(initial.title)
  const nextId     = ref(initial.nextId)
  const nodes      = ref<MindMapNode[]>(initial.nodes)
  const crossLinks = ref<CrossLink[]>([])
  const selectedId = ref<string | null>(initial.nodes.find(n => n.parent === null)?.id ?? initial.nodes[0]?.id ?? null)
  const linkFromId = ref<string | null>(null)
  const tool       = ref<'select' | 'add' | 'link' | 'erase'>('select')
  const editingId  = ref<string | null>(null)
  const saveStatus = ref<'idle' | 'saving' | 'saved'>('saved')

  /* ---- undo / redo ---- */
  const past   = ref<string[]>([])
  const future  = ref<string[]>([])

  function snapshot(): string {
    return JSON.stringify({ title: title.value, nextId: nextId.value, nodes: nodes.value, crossLinks: crossLinks.value })
  }
  function applySnapshot(s: string) {
    const p = JSON.parse(s)
    title.value  = p.title
    nextId.value = p.nextId
    nodes.value.splice(0, nodes.value.length, ...p.nodes)
    crossLinks.value.splice(0, crossLinks.value.length, ...(p.crossLinks ?? []))
  }
  function pushHistory() {
    past.value.push(snapshot())
    if (past.value.length > HISTORY_LIMIT) past.value.shift()
    future.value.length = 0
  }
  function undo() { if (!past.value.length) return; future.value.push(snapshot()); applySnapshot(past.value.pop()!) }
  function redo() { if (!future.value.length) return; past.value.push(snapshot()); applySnapshot(future.value.pop()!) }
  const canUndo = computed(() => past.value.length > 0)
  const canRedo = computed(() => future.value.length > 0)

  /* ---- persistence ---- */
  let saveTimer: ReturnType<typeof setTimeout> | null = null
  watch(
    () => ({ t: title.value, x: nextId.value, n: nodes.value }),
    () => {
      saveStatus.value = 'saving'
      if (saveTimer) clearTimeout(saveTimer)
      saveTimer = setTimeout(() => {
        try {
          if (import.meta.client) localStorage.setItem(STORAGE_KEY, snapshot())
          saveStatus.value = 'saved'
        } catch { saveStatus.value = 'idle' }
      }, 220)
    },
    { deep: true }
  )

  /* ---- helpers ---- */
  function nodeById(id: string): MindMapNode | null {
    return nodes.value.find(n => n.id === id) ?? null
  }
  function rootNode(): MindMapNode | null {
    return nodes.value.find(n => n.parent === null) ?? nodes.value[0] ?? null
  }
  function childrenOf(id: string): MindMapNode[] {
    return nodes.value.filter(n => n.parent === id)
  }
  function ancestorsOf(id: string): MindMapNode[] {
    const out: MindMapNode[] = []
    let n = nodeById(id)
    let guard = 0
    while (n && n.parent && guard++ < 50) {
      const p = nodeById(n.parent)
      if (!p) break
      out.unshift(p)
      n = p
    }
    return out
  }
  function levelOf(id: string): number { return ancestorsOf(id).length }

  function descendantsOf(id: string): string[] {
    const set = new Set([id])
    let grew = true
    while (grew) {
      grew = false
      for (const n of nodes.value) {
        if (!set.has(n.id) && n.parent !== null && set.has(n.parent)) {
          set.add(n.id); grew = true
        }
      }
    }
    set.delete(id)
    return [...set]
  }

  function branchHueOf(id: string): string {
    const a = ancestorsOf(id)
    const lvl1 = a[0] ?? nodeById(id)
    if (!lvl1) return BRANCH_HUES[0]
    let h = 0
    for (const c of lvl1.id) h = (h * 31 + c.charCodeAt(0)) & 0xfffff
    return BRANCH_HUES[h % BRANCH_HUES.length]
  }

  /* ---- mutations ---- */
  function newNodeId(): string { return 'n' + (nextId.value++) }

  function addNodeAt(parentId: string, x: number, y: number, label = 'new idea'): string {
    pushHistory()
    const id = newNodeId()
    nodes.value.push({ id, x, y, label, parent: parentId })
    selectedId.value = id
    editingId.value  = id
    return id
  }

  function addChild(parentId: string, label = 'new idea'): string | null {
    const p = nodeById(parentId)
    if (!p) return null
    const sibs = childrenOf(parentId)
    const refs = [...sibs]
    const par = p.parent ? nodeById(p.parent) : null
    if (par) refs.push(par)
    let bestAngle = 0, bestScore = -Infinity
    const radius = 200
    for (let deg = 0; deg < 360; deg += 12) {
      const rad = deg * Math.PI / 180
      const tx = p.x + Math.cos(rad) * radius
      const ty = p.y + Math.sin(rad) * radius
      let dmin = Infinity
      for (const s of refs) {
        const d2 = (s.x - tx) ** 2 + (s.y - ty) ** 2
        if (d2 < dmin) dmin = d2
      }
      if (dmin > bestScore) { bestScore = dmin; bestAngle = rad }
    }
    return addNodeAt(parentId, p.x + Math.cos(bestAngle) * radius, p.y + Math.sin(bestAngle) * radius, label)
  }

  function deleteSubtree(id: string) {
    const root = rootNode()
    if (!id || id === root?.id) return
    pushHistory()
    const toRemove = new Set([id, ...descendantsOf(id)])
    const next = nodes.value.filter(n => !toRemove.has(n.id))
    nodes.value.splice(0, nodes.value.length, ...next)
    if (toRemove.has(selectedId.value ?? '')) {
      selectedId.value = root?.id ?? null
    }
  }

  function setLabel(id: string, label: string) {
    const n = nodeById(id)
    if (!n) return
    const clean = (label ?? '').toString().slice(0, 200)
    if (n.label === clean) return
    pushHistory()
    n.label = clean || '·'
  }

  function moveNode(id: string, x: number, y: number) {
    const n = nodeById(id)
    if (!n) return
    n.x = x; n.y = y
  }

  let _dragSnapshot: string | null = null
  function beginDrag() { _dragSnapshot = snapshot() }
  function endDrag(committed: boolean) {
    if (committed && _dragSnapshot) {
      past.value.push(_dragSnapshot)
      if (past.value.length > HISTORY_LIMIT) past.value.shift()
      future.value.length = 0
    }
    _dragSnapshot = null
  }

  function reparent(childId: string, newParentId: string): boolean {
    if (!childId || !newParentId || childId === newParentId) return false
    const root = rootNode()
    if (childId === root?.id) return false
    let cur = nodeById(newParentId)
    let guard = 0
    while (cur && guard++ < 100) {
      if (cur.id === childId) return false
      cur = cur.parent ? nodeById(cur.parent) : null
    }
    const c = nodeById(childId)
    if (!c || c.parent === newParentId) return false
    pushHistory()
    c.parent = newParentId
    return true
  }

  function setTitle(t: string) {
    if (title.value === t) return
    pushHistory()
    title.value = (t || '').slice(0, 80)
  }

  function reset() {
    pushHistory()
    const s = clone(SEED)
    title.value  = s.title
    nextId.value = s.nextId
    nodes.value.splice(0, nodes.value.length, ...s.nodes)
    selectedId.value = rootNode()?.id ?? null
    editingId.value  = null
    linkFromId.value = null
    crossLinks.value.splice(0, crossLinks.value.length)
  }

  function exportJSON(): string {
    return JSON.stringify({ version: 1, title: title.value, nextId: nextId.value, nodes: nodes.value }, null, 2)
  }

  function importJSON(json: string): { ok: boolean; error?: string } {
    try {
      const p = JSON.parse(json)
      if (!Array.isArray(p.nodes) || !p.nodes.length) throw new Error('no nodes')
      const ids = new Set(p.nodes.map((n: MindMapNode) => n.id))
      let rootCount = 0
      for (const n of p.nodes) {
        if (n.parent != null && !ids.has(n.parent)) n.parent = null
        if (n.parent == null) rootCount++
        if (typeof n.x !== 'number') n.x = 0
        if (typeof n.y !== 'number') n.y = 0
        if (typeof n.label !== 'string') n.label = '·'
        if (typeof n.id !== 'string') n.id = 'n' + Math.random().toString(36).slice(2, 8)
      }
      if (rootCount === 0) p.nodes[0].parent = null
      pushHistory()
      title.value  = (p.title || 'imported').toString().slice(0, 80)
      nextId.value = typeof p.nextId === 'number'
        ? p.nextId
        : (Math.max(0, ...p.nodes.map((n: MindMapNode) => parseInt((n.id || '').replace(/\D/g, '')) || 0)) + 1)
      nodes.value.splice(0, nodes.value.length, ...p.nodes)
      selectedId.value = rootNode()?.id ?? null
      editingId.value  = null
      linkFromId.value = null
      return { ok: true }
    } catch (e) {
      return { ok: false, error: (e as Error).message || String(e) }
    }
  }

  /* ---- cross-links (non-tree AI-suggested associations) ---- */
  function addCrossLink(fromId: string, toId: string) {
    if (!nodeById(fromId) || !nodeById(toId)) return
    if (crossLinks.value.some(l => l.fromId === fromId && l.toId === toId)) return
    pushHistory()
    crossLinks.value.push({ id: `cl-${fromId}-${toId}`, fromId, toId })
  }

  /* ---- highlighted nodes (from AI suggestions) ---- */
  const highlightedIds = ref<Set<string>>(new Set())
  function setHighlighted(ids: string[]) { highlightedIds.value = new Set(ids) }
  function clearHighlights() { highlightedIds.value = new Set() }

  /* ---- AI analysis state ---- */
  const AI_CACHE_KEY = 'nf:ai:result'

  function loadAnalysisResult(): AnalysisResult | null {
    if (!import.meta.client) return null
    try {
      const raw = localStorage.getItem(AI_CACHE_KEY)
      return raw ? JSON.parse(raw) as AnalysisResult : null
    } catch { return null }
  }

  const isAnalyzing       = ref(false)
  const isAIPanelOpen     = ref(false)
  const userPrompt        = ref('')
  const cachedResult      = loadAnalysisResult()
  const streamingThinking = ref(cachedResult?.thinking ?? '')
  const suggestions       = ref<MindMapAction[]>(cachedResult?.suggestions ?? [])
  const analysisResult    = ref<AnalysisResult | null>(cachedResult)

  function openAIPanel()  { isAIPanelOpen.value = true }
  function closeAIPanel() { isAIPanelOpen.value = false }
  function clearAnalysis() {
    streamingThinking.value = ''
    suggestions.value = []
    analysisResult.value = null
    clearHighlights()
    if (import.meta.client) localStorage.removeItem(AI_CACHE_KEY)
  }
  function appendThinking(text: string) { streamingThinking.value += text }
  function addSuggestion(action: MindMapAction) { suggestions.value.push(action) }

  watch(analysisResult, (result) => {
    if (!import.meta.client) return
    if (result) localStorage.setItem(AI_CACHE_KEY, JSON.stringify(result))
    else localStorage.removeItem(AI_CACHE_KEY)
  })

  /* ---- agent personality state ---- */
  const AGENT_KEY = 'nf:agent:id'
  const agentId = ref<string>(
    import.meta.client ? (localStorage.getItem(AGENT_KEY) ?? '') : ''
  )
  const activeAgent = computed<AgentPersona | null>(
    () => AGENTS.find(a => a.id === agentId.value) ?? null
  )
  function setAgent(id: string) {
    agentId.value = id
    if (import.meta.client) localStorage.setItem(AGENT_KEY, id)
  }

  /* ---- accent / theme color ---- */
  const THEME_KEY = 'nf:theme:accent'
  const accentColor = ref<string>(
    import.meta.client ? (localStorage.getItem(THEME_KEY) ?? '#c4604a') : '#c4604a'
  )
  function setAccent(color: string) {
    accentColor.value = color
    if (import.meta.client) {
      localStorage.setItem(THEME_KEY, color)
      document.documentElement.style.setProperty('--accent', color)
    }
  }

  return {
    /* graph state */
    title:      skipHydrate(title),
    nextId:     skipHydrate(nextId),
    nodes:      skipHydrate(nodes),
    selectedId: skipHydrate(selectedId),
    linkFromId: skipHydrate(linkFromId),
    tool:       skipHydrate(tool),
    editingId:  skipHydrate(editingId),
    saveStatus: skipHydrate(saveStatus),
    canUndo, canRedo, undo, redo,
    /* helpers */
    nodeById, rootNode, childrenOf, ancestorsOf, levelOf, descendantsOf, branchHueOf,
    /* mutations */
    addNodeAt, addChild, deleteSubtree, setLabel, moveNode, beginDrag, endDrag,
    reparent, setTitle, reset, exportJSON, importJSON,
    /* cross-links */
    crossLinks: skipHydrate(crossLinks), addCrossLink,
    /* highlights */
    highlightedIds: skipHydrate(highlightedIds), setHighlighted, clearHighlights,
    /* AI state */
    isAnalyzing:       skipHydrate(isAnalyzing),
    isAIPanelOpen:     skipHydrate(isAIPanelOpen),
    userPrompt:        skipHydrate(userPrompt),
    streamingThinking: skipHydrate(streamingThinking),
    suggestions:       skipHydrate(suggestions),
    analysisResult:    skipHydrate(analysisResult),
    openAIPanel, closeAIPanel, clearAnalysis, appendThinking, addSuggestion,
    /* agent */
    agentId:     skipHydrate(agentId),
    activeAgent,
    setAgent,
    /* theme */
    accentColor: skipHydrate(accentColor),
    setAccent,
  }
})
