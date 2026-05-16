# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Development
npm run dev          # Start Nuxt dev server (localhost:3000)
npm run build        # Production build
npm run preview      # Preview production build

# WebSocket server (separate process — required for collaboration)
cd ws-server && npm install && npx ts-node index.ts
# Or: node --loader ts-node/esm index.ts

# Tests
npm test             # vitest run (single pass)
npm run test:watch   # vitest watch mode
```

## Environment Setup

Copy `.env.local.example` to `.env.local` and fill in:

```
FIREWORKS_API_KEY=fw_...                    # Required — server-only, never NUXT_PUBLIC_*
NUXT_PUBLIC_WS_SERVER_URL=ws://localhost:1234  # Optional — defaults to localhost:1234
```

`FIREWORKS_API_KEY` maps to `runtimeConfig.fireworksApiKey` (server-side only). The public ws URL maps to `runtimeConfig.public.wsServerUrl`.

## Architecture

### Request flow for AI analysis

1. User clicks "Analyze Board" → `pages/board/[id].vue` calls `useAIAnalysis().analyze(board)`
2. `useAIAnalysis` POSTs `SerializedBoard` to `/api/ai/analyze`
3. `server/api/ai/analyze.post.ts` reads `fireworksApiKey` from server runtime config, validates the payload, then streams SSE
4. The server runs `runBoardAnalysis()` from `lib/ai/graph.ts` — a two-node LangGraph workflow: `analyzerNode` → `suggesterNode`
5. Each node calls Fireworks.ai via the OpenAI-compatible SDK (`baseURL: https://api.fireworks.ai/inference/v1`)
6. SSE events (`BoardStreamEvent` discriminated union) stream back through the fetch reader in `useAIAnalysis`
7. Events update `boardStore`: `thinking` text appends, `suggestion` pushes to `store.suggestions`, `done` finalizes `store.analysisResult`
8. `AITracePanel.vue` reactively renders the thinking text and `SuggestionCard` list
9. User clicks "Apply" → `pages/board/[id].vue` calls `whiteboardRef.applyBoardAction(action)` → `lib/canvas/suggestionApplier.ts`

### Canvas ↔ State

- `components/Whiteboard.vue` owns the Fabric.js `Canvas` instance, initialized in `onMounted` (the page uses `definePageMeta({ ssr: false })` to avoid SSR issues with Fabric)
- `composables/useCanvas.ts` manages tool state, event wiring, and exposes `getSerializedBoard()`, `applyBoardAction()`, `exportPNG()`, `exportJSON()`, `clearBoard()`, `resetZoom()`
- `lib/canvas/boardSerializer.ts` converts `FabricObject[]` → `SerializedBoard` (the JSON sent to the LLM). Type resolution uses `obj.data?.type` first (set at object-creation time for sticky notes / arrows)
- `stores/boardStore.ts` (Pinia) holds UI-only state: `activeTool`, `isAnalyzing`, `suggestions`, `presenceUsers`, `zoom`. All refs are wrapped in `skipHydrate()` to prevent SSR serialization errors

### Collaboration (Phase 3 — stub)

`lib/canvas/fabricYjsBinding.ts` and `composables/useCollaboration.ts` are stubs. The y-websocket server in `ws-server/index.ts` is fully functional — rooms are named `nf:<boardId>`. The binding logic (Fabric events → Yjs Y.Map, Y.Map observe → Fabric canvas) is the next implementation phase.

### Key type contracts

`lib/ai/types.ts` defines the two discriminated unions that connect every layer:
- `BoardStreamEvent` — SSE wire format (thinking / suggestion / done / error)
- `BoardAction` — what the AI can do to the canvas (move / group / label / recolor / connect)

All AI constants (model ID, temperature, pricing, rate limits) live in `lib/config.ts`.

### Routing

- `pages/index.vue` — generates a `nanoid` board ID and redirects to `/board/[id]`
- `pages/board/[id].vue` — the entire app; SSR disabled; the board ID doubles as the Yjs room name

### shadcn-vue components

UI primitives are in `components/ui/` (shadcn prefix is empty string — import as `<Button>` not `<ShadcnButton>`). Class merging uses `cn()` from `lib/utils.ts`.

## Implementation Phases

The project is mid-build. Phases 1 (canvas) and 2 (AI streaming) are complete. Phase 3 (Yjs collaboration binding) is next. See `PLAN.md` for the full phase breakdown.
