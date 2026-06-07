# CLAUDE.md

This file provides guidance to AI coding agents when working with this repository.

## Commands

Package manager is **pnpm** (pinned via `packageManager` in package.json; Node 24). Run `corepack enable` once.

```bash
# Development
pnpm dev        # Start Nuxt dev server (localhost:3000)
pnpm build      # Production build
pnpm preview    # Preview production build (node .output/server/index.mjs)

# Quality gates (same as CI)
pnpm typecheck  # nuxt typecheck (vue-tsc) — must be clean
pnpm test       # vitest run — unit + component (single pass)
pnpm test:watch # vitest watch mode
pnpm test:e2e   # Playwright golden-path E2E (mocked SSE; builds + serves prod)
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

1. User opens the AI panel and clicks "analyze" → `pages/index.vue` (`handleForceAnalyze`) calls `useAIAnalysis().analyze()`
2. `useAIAnalysis` POSTs `SerializedGraph` to `/api/ai/analyze` (Fireworks key in the `x-fireworks-key` **header**)
3. `server/api/ai/analyze.post.ts` runs the policy pipeline: **resolve key → rate-limit (two-tier) → validate (Zod, 50 KB, null-byte) → moderation (`lib/ai/moderation.ts`, fail-open)**, then streams SSE
4. The server runs `runMindMapAnalysis()` from `lib/ai/graph.ts` — a two-node LangGraph workflow: `analyzerNode` → `suggesterNode`
5. Each node calls Fireworks.ai via the OpenAI-compatible SDK (`baseURL: https://api.fireworks.ai/inference/v1`)
6. SSE events (`BoardStreamEvent` discriminated union) stream back through the fetch reader in `useAIAnalysis`
7. Events update `useAIStore`: `thinking` text appends, `suggestion` pushes to `suggestions`, `done` finalises `analysisResult` (carries `truncated`)
8. `AIPanel.vue` reactively renders the thinking text and `AISuggestionCard` components
9. User clicks "Apply" → `lib/mindmap/applier.ts` (`applyAction(graph, ai, action)`) mutates the graph store (add nodes, relabel, tidy layout, etc.)

### State: three focused Pinia stores

State is split by concern; components import only what they need (there is **no** `mindMapStore` facade). All refs are wrapped in `skipHydrate()` to prevent SSR serialization errors (the page is SPA / `ssr: false`).

- `stores/useGraphStore.ts` — nodes, cross-links, selection, current tool, undo/redo history, debounced `localStorage` persistence
- `stores/useAIStore.ts` — streaming reasoning, suggestions, highlights, active agent, cached result
- `stores/useSettingsStore.ts` — accent colour (persisted, pushed to a CSS var)

### Canvas

- `components/MindMapCanvas.vue` renders the SVG canvas; pan/zoom, node drag, and label editing live in focused composables (`useViewport`, `useNodeDrag`, `useLabelEditor`), with touch via `useTouchGestures`
- `composables/useAIAnalysis.ts` manages the SSE stream + AbortController
- `lib/mindmap/serializer.ts` converts `MindMapNode[]` → `SerializedGraph` (the JSON sent to the LLM)

### Key type contracts

`lib/ai/types.ts` defines two discriminated unions:
- `BoardStreamEvent` — SSE wire format (`thinking` / `suggestion` / `done` / `error`)
- `MindMapAction` — what the AI can do to the canvas (`add_node` / `link_nodes` / `relabel` / `highlight` / `expand_branch` / `tidy_layout`)

All AI constants (model ID, temperature, pricing, rate limits, `SECURITY_HEADERS`) live in `lib/config.ts`. Types are derived from the Zod schemas in `lib/ai/schemas.ts` (single source of truth); `lib/ai/types.ts` re-exports them and holds the `AGENTS` array.

### Security & moderation

- Headers (CSP, HSTS, `X-Frame-Options`, `Permissions-Policy` with `microphone=(self)`) are single-sourced in `SECURITY_HEADERS` and applied by `server/middleware/securityHeaders.ts`; `vercel.json` mirrors them for the CDN. Keep the two in sync.
- `server/middleware/cors.ts` is exact-origin (not substring).
- `lib/ai/moderation.ts` runs after rate-limit, before the LLM: always-on jailbreak regex + optional OpenAI Moderation (`OPENAI_API_KEY`), **fail-open**. **Trade-off decision: input-filtering only** — output is not buffered/scanned, to preserve streaming latency. Blocks return as an SSE `error` frame.

### Routing

- `pages/index.vue` — the entire app; SSR disabled; single-board, state persisted in `localStorage`

## Project Structure

Test files (`*.test.ts`) sit next to the code they cover; E2E lives in `e2e/*.e2e.ts`.

```
pages/index.vue                   ← App entry; all state, keyboard shortcuts, layout
components/
  MindMapCanvas.vue               ← SVG canvas (~410 lines; viewport/drag/label in composables)
  MindMapToolbar.vue              ← Tool chips + overflow popover (mobile-responsive)
  MindMapSideNote.vue             ← Selected-node detail panel (bottom sheet on mobile)
  AIPanel.vue                     ← AI trace + tabs (renders AISuggestionCard list)
  AISuggestionCard.vue            ← One suggestion: kind label, description, apply/undo/reject
  MindMapHeader.vue · MindMapModal.vue · AgentSelector.vue · PaperBackground.vue

stores/
  useGraphStore.ts                ← nodes, cross-links, tool, undo/redo, persistence
  useAIStore.ts                   ← streaming state, suggestions, agent, highlights
  useSettingsStore.ts             ← accent colour

composables/
  useAIAnalysis.ts                ← SSE consumer + abort
  useApiKeys.ts                   ← localStorage key management + demo-key flag
  useViewport · useNodeDrag · useLabelEditor · useTouchGestures   ← canvas interaction
  useSuggestionState · useDraggable · useSpeechRecognition

lib/
  config.ts                       ← All constants (model, pricing, limits, SECURITY_HEADERS)
  ai/
    schemas.ts                    ← Zod schemas — single source of truth for types
    types.ts                      ← re-exports schema types + AGENTS array
    graph.ts                      ← LangGraph workflow
    moderation.ts                 ← jailbreak regex + optional OpenAI moderation (fail-open)
    nodes/ analyzerNode.ts · suggesterNode.ts
  mindmap/  serializer.ts · layout.ts · applier.ts · geometry.ts · exportPng.ts
  markdown/ safeInline.ts         ← XSS-safe inline markdown for the trace

server/
  api/ai/ analyze.post.ts (SSE) · layout.post.ts
  middleware/ cors.ts (exact-origin) · securityHeaders.ts (CSP/HSTS)
  utils/rateLimit.ts              ← in-memory (dev) / Upstash Redis (prod), two-tier

e2e/golden-path.e2e.ts            ← Playwright: mocked SSE → apply suggestion adds a node
.github/workflows/ci.yml          ← typecheck → test → build → e2e (SHA-pinned actions)
docs/how-it-works.html            ← single-page technical deep-dive (project design)
```

## Cleanup history

**Senior cleanup (Jun 2026):** migrated npm → pnpm (overrides + `allowBuilds` in `pnpm-workspace.yaml`);
finished the Pinia store split and deleted the `mindMapStore` facade; wired the dead viewport/drag/
label composables into the canvas and extracted `AISuggestionCard`; removed an unused 10-package UI
dependency cluster (shadcn-nuxt, radix-vue, tailwind, color-mode, lucide, clsx, cva, tailwind-merge,
tailwindcss-animate, nanoid) plus `tailwind.config.ts`, `lib/utils.ts`, `public/sw.js`; added CSP/HSTS,
exact-origin CORS, `Retry-After`, two-tier rate limits, and content moderation; built the full test
pyramid (vitest unit + component, Playwright E2E) and GitHub Actions CI.

**Earlier cleanup (May 2026):** removed `ws-server/` (y-websocket relay), `y-websocket`/`yjs`, the Vite
`stub-ws-for-browser` shim, `lib/ai/nodes/layoutNode.ts`, dead `lib/config.ts` exports, `branchHueOf`/
`BRANCH_HUES`, and the empty `types/` and `design/` folders.
