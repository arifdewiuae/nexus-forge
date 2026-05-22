# CLAUDE.md

This file provides guidance to AI coding agents when working with this repository.

## Commands

```bash
# Development
npm run dev      # Start Nuxt dev server (localhost:3000)
npm run build    # Production build
npm run preview  # Preview production build

# Tests
npm test             # vitest run (single pass)
npm run test:watch   # vitest watch mode
```

## Environment Setup

Copy `.env.local.example` to `.env.local` and fill in:

```
FIREWORKS_API_KEY=fw_...              # Required — server-only, never NUXT_PUBLIC_*
DEMO_KEYS_ENABLED=true                # Optional — use server key as fallback for demo
NUXT_PUBLIC_DEMO_KEYS_ENABLED=true    # Optional — exposes flag to browser (not the key)
UPSTASH_REDIS_REST_URL=               # Optional — Upstash Redis for prod rate limiting
UPSTASH_REDIS_REST_TOKEN=             # Optional
```

`FIREWORKS_API_KEY` maps to `runtimeConfig.fireworksApiKey` (server-side only).

## Architecture

### Request flow for AI analysis

1. User clicks "ask AI" → `pages/index.vue` calls `useAIAnalysis().analyze()`
2. `useAIAnalysis` POSTs `SerializedGraph` to `/api/ai/analyze`
3. `server/api/ai/analyze.post.ts` reads `FIREWORKS_API_KEY`, validates the payload, then streams SSE
4. The server runs `runMindMapAnalysis()` from `lib/ai/graph.ts` — a two-node LangGraph workflow: `analyzerNode` → `suggesterNode`
5. Each node calls Fireworks.ai via the OpenAI-compatible SDK (`baseURL: https://api.fireworks.ai/inference/v1`)
6. SSE events (`BoardStreamEvent` discriminated union) stream back through the fetch reader in `useAIAnalysis`
7. Events update `mindMapStore`: `thinking` text appends, `suggestion` pushes to `store.suggestions`, `done` finalises `store.analysisResult`
8. `AIPanel.vue` reactively renders the thinking text and suggestion cards
9. User clicks "Apply" → `lib/mindmap/applier.ts` mutates the store (add nodes, relabel, tidy layout, etc.)

### Canvas state

- `components/MindMapCanvas.vue` owns the SVG canvas, pan/zoom, node drag, label editor, PNG export (SSR disabled via `definePageMeta({ ssr: false })`)
- `composables/useAIAnalysis.ts` manages the SSE stream + AbortController
- `lib/mindmap/serializer.ts` converts `MindMapNode[]` → `SerializedGraph` (the JSON sent to the LLM)
- `stores/mindMapStore.ts` (Pinia) holds all reactive state: graph nodes, cross-links, undo/redo history, AI streaming state, theme. All refs wrapped in `skipHydrate()` to prevent SSR serialization errors

### Key type contracts

`lib/ai/types.ts` defines two discriminated unions:
- `BoardStreamEvent` — SSE wire format (`thinking` / `suggestion` / `done` / `error`)
- `MindMapAction` — what the AI can do to the canvas (`add_node` / `link_nodes` / `relabel` / `highlight` / `expand_branch` / `tidy_layout`)

All AI constants (model ID, temperature, pricing, rate limits) live in `lib/config.ts`.

### Routing

- `pages/index.vue` — the entire app; SSR disabled; single-board, state persisted in `localStorage`

### shadcn-vue components

UI primitives are in `components/ui/` (shadcn prefix is empty string — import as `<Button>` not `<ShadcnButton>`). Class merging uses `cn()` from `lib/utils.ts`.

## Project Structure

```
pages/index.vue                   ← App entry; all state, keyboard shortcuts, layout
components/
  MindMapCanvas.vue               ← SVG canvas (633 lines — split planned in Phase 4)
  MindMapToolbar.vue              ← Tool chips + overflow popover (mobile-responsive)
  MindMapSideNote.vue             ← Selected-node detail panel (bottom sheet on mobile)
  AIPanel.vue                     ← AI trace + suggestion cards (floating / bottom sheet)
  MindMapHeader.vue               ← Title + date + meta
  MindMapModal.vue                ← Export / Import / Help / Confirm / Settings modals
  AgentSelector.vue               ← AI personality picker
  PaperBackground.vue             ← Ruled paper SVG texture

stores/
  mindMapStore.ts                 ← All Pinia state (split into 3 stores planned Phase 4)

composables/
  useAIAnalysis.ts                ← SSE consumer + abort
  useApiKeys.ts                   ← localStorage key management + demo-key flag

lib/
  config.ts                       ← All constants (model, pricing, rate limit, keys)
  utils.ts                        ← cn() helper
  ai/
    types.ts                      ← All shared types + AGENTS array
    graph.ts                      ← LangGraph workflow
    nodes/
      analyzerNode.ts             ← Streams reasoning text
      suggesterNode.ts            ← Emits MindMapAction[]
  mindmap/
    serializer.ts                 ← nodes → SerializedGraph
    layout.ts                     ← radial layout algorithm
    applier.ts                    ← MindMapAction[] → store mutations

server/
  api/ai/
    analyze.post.ts               ← SSE endpoint
    layout.post.ts                ← Layout-only endpoint
  middleware/cors.ts
  utils/rateLimit.ts              ← In-memory rate limit (Upstash planned Phase 3)
```

## Removed in cleanup (May 2026)

- `ws-server/` — y-websocket relay (never wired to client)
- `y-websocket`, `yjs` npm dependencies
- Vite `stub-ws-for-browser` shim in `nuxt.config.ts`
- `lib/ai/nodes/layoutNode.ts` — trivial 1-line re-export
- Dead exports from `lib/config.ts`: `STORAGE_KEYS`, `CANVAS_DEFAULTS`, `STICKY_COLORS`, `WS_ROOM_PREFIX`, `PRESENCE_COLORS`
- `branchHueOf` / `BRANCH_HUES` in store (unused)
- `types/` folder (empty)
- `design/` folder (static mockup references)
