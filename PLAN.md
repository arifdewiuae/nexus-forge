# Nexus Forge — AI Mind Map
## Project Plan & Vision

---

## What Is This Project?

**Nexus Forge** is a portfolio/demo project showcasing practical AI engineering + frontend depth.
It is an infinite-canvas mind-map where users build a node graph and a fleet of AI agents analyzes
the structure, streams their reasoning, and suggests (or auto-applies) improvements.

Think: a whiteboard assistant where you pick your AI analyst's *personality* and watch it think out loud.

---

## Why This Is a Strong Portfolio Demo

Most AI portfolio projects are just chat interfaces. Nexus Forge is different because it combines three
things that are hard to do together:

1. **Custom SVG canvas** — infinite pan/zoom, drag nodes, draw edges, undo/redo, radial layout
2. **Multi-agent AI pipeline** — 4 distinct agent personas powered by LangGraph + Fireworks.ai streaming
3. **Structured AI → canvas actions** — the AI emits typed `MindMapAction` objects that are applied
   back onto the live graph, not just text suggestions

The **agent selector** (AXIOM-9 / VERN / ORACLE-3 / PATCH) and the **live trace panel** showing the
AI's personality-driven reasoning are the portfolio differentiator. The "Apply" flow — where the AI
physically restructures the graph — is the wow moment.

**The sweetest demo:** Build a messy mind-map, pick AXIOM-9 ("Cold analyst. Your diagram is a cry for
help."), hit Analyze, watch it stream dry clinical observations, then click Apply to watch the graph
restructure itself. 30 seconds. Unforgettable.

---

## Real-World Use Cases

| Use Case | What Happens |
|---|---|
| **Brainstorming** | Dump ideas as nodes → AI clusters by theme, labels groups |
| **Project planning** | Map tasks and dependencies → AI spots gaps, suggests missing links |
| **System design** | Sketch rough architecture → AI suggests missing components |
| **Learning** | Build a concept map → AI expands branches with subtopics |
| **Retrospective** | Map what went wrong → AI finds patterns, suggests action items |

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Nuxt 3 (Vue 3 + SSR + server routes) |
| Canvas | Custom SVG mind-map (Vue component) |
| State | Pinia (`mindMapStore`) |
| AI Orchestration | LangGraph.js (2-node pipeline: analyzer → suggester) |
| LLM | `accounts/fireworks/models/minimax-m2p7` via Fireworks.ai |
| UI | Tailwind CSS + Lucide icons |
| Auth | None — anonymous share-link boards |
| Deploy | Vercel (Nuxt) |

### Key Architecture Decisions

**Why Nuxt 3:**
- Server routes keep `FIREWORKS_API_KEY` server-side only — never exposed to the browser
- Native Vercel deployment with zero extra config
- Server-side SSE maps cleanly to Nuxt's `sendStream` API

**Why a custom SVG canvas (not tldraw or Fabric.js):**
Custom canvas = more visible portfolio engineering. You wire everything yourself: node drag,
pan/zoom, edge routing, radial layout, undo/redo stack. That signals more than dropping in a library.

**Dual API key strategy:**
Users supply their own Fireworks key via the Settings modal (stored in `localStorage`). The server
can optionally serve as a demo key fallback when `DEMO_KEYS_ENABLED=true` — so the live portfolio
demo works without requiring visitors to sign up.

---

## Project Structure

```
nexus-forge/
├── server/
│   └── api/
│       └── ai/
│           └── analyze.post.ts      # Fireworks SSE streaming endpoint
├── components/
│   ├── MindMapCanvas.vue            # Custom SVG canvas — nodes, edges, pan/zoom/drag
│   ├── MindMapToolbar.vue           # Drawing tools + agent selector chips
│   ├── MindMapHeader.vue            # Title bar, undo/redo, export/import actions
│   ├── MindMapSideNote.vue          # Collapsible AI trace panel (thinking + suggestions)
│   └── MindMapModal.vue             # Multi-mode modal: export / import / help / settings
├── composables/
│   ├── useAIAnalysis.ts             # SSE stream consumer + AbortController
│   └── useApiKeys.ts                # localStorage key mgmt + demo-key flag
├── lib/
│   ├── config.ts                    # All constants (model ID, rate limits, storage keys)
│   ├── utils.ts                     # cn() utility for Tailwind class merging
│   ├── mindmap/
│   │   ├── serializer.ts            # MindMapNode[] → SerializedGraph (sent to LLM)
│   │   ├── serializer.test.ts
│   │   ├── layout.ts                # Radial layout algorithm (computeRadialLayout)
│   │   ├── layout.test.ts
│   │   ├── applier.ts               # MindMapAction[] → store mutations
│   │   └── applier.test.ts
│   └── ai/
│       ├── graph.ts                 # LangGraph workflow: analyzerNode → suggesterNode
│       ├── types.ts                 # MindMapNode, MindMapAction, BoardStreamEvent, AgentPersona
│       └── nodes/
│           ├── analyzerNode.ts      # Pattern / cluster detection; streams thinking text
│           └── suggesterNode.ts     # Typed MindMapAction[] output
├── stores/
│   └── mindMapStore.ts              # Pinia: nodes, crossLinks, undo/redo, AI state, agent
├── pages/
│   ├── index.vue                    # Landing — generate board ID, redirect to /board/[id]
│   └── board/
│       └── [id].vue                 # Main mind-map page (SSR disabled)
├── ws-server/                       # y-websocket server stub (not deployed — see Future work)
│   ├── index.ts
│   ├── package.json
│   └── fly.toml
├── nuxt.config.ts
├── .env.local.example
└── package.json
```

---

## Request Flow (AI Analysis)

```
pages/board/[id].vue
  → useAIAnalysis().analyze()
    → serializeGraph(nodes, title, crossLinks)   [lib/mindmap/serializer.ts]
    → POST /api/ai/analyze  { graph, agent, userPrompt }
      → server/api/ai/analyze.post.ts
          resolves API key (x-fireworks-key header || FIREWORKS_API_KEY if DEMO_KEYS_ENABLED)
          validates payload (50 KB cap, schema check)
          rate-limits (in-memory; Upstash Redis in prod)
          → runMindMapAnalysis(graph, agent, userPrompt, apiKey, emit)
              → LangGraph: analyzerNode → suggesterNode
                  analyzerNode: streams "thinking" text as SSE
                  suggesterNode: emits typed MindMapAction[] as SSE
              → emits { type: 'done', latencyMs, tokens, costUsd }
    ← SSE reader in useAIAnalysis
        'thinking'   → store.thinkingText appended
        'suggestion' → store.suggestions pushed
        'done'       → store.analysisResult set; store.isAnalyzing = false
  → MindMapSideNote.vue renders thinking text + suggestion cards reactively
  → user clicks "Apply" → applier.ts mutates store (add nodes, link, relabel, tidy layout)
```

---

## Development Phases

### ✅ Phase 1 — Canvas Foundation
**Checkpoint: can build and edit a mind-map**

- Custom SVG canvas with infinite pan (Space+drag), Ctrl+Scroll zoom
- Node CRUD: add, rename, delete, drag
- Edge routing between parent/child nodes and cross-links
- Radial layout algorithm (`computeRadialLayout`)
- Undo/redo stack (80 steps)
- localStorage persistence
- `stores/mindMapStore.ts` — all reactive graph state

### ✅ Phase 2 — AI Core
**Checkpoint: Analyze → streaming reasoning → Apply restructures graph**

- `lib/ai/types.ts` — `MindMapAction`, `BoardStreamEvent`, `AgentPersona`, `AGENTS`
- `lib/ai/graph.ts` — LangGraph 2-node workflow
- `server/api/ai/analyze.post.ts` — server SSE endpoint
- `composables/useAIAnalysis.ts` — SSE consumer, AbortController
- `composables/useApiKeys.ts` — user key via localStorage + demo key fallback
- 4 agent personas with distinct personalities (AXIOM-9, VERN, ORACLE-3, PATCH)
- `lib/mindmap/applier.ts` — maps `MindMapAction` → store mutations
- `MindMapSideNote.vue` — live trace panel + suggestion cards
- `MindMapModal.vue` — export JSON / import JSON / PNG export / settings / help

### Phase 3 — Polish & Checklist *(current)*
**Checkpoint: passes portfolio quality bar, Lighthouse ≥ 95**

- All interactive elements have `aria-label` (Lighthouse accessibility ≥ 95)
- Color contrast ≥ 4.5:1 in dark mode
- CORS locked to own origin
- Input validated at route boundary (50 KB cap, null bytes rejected)
- Vitest tests: `useApiKeys.ts`, `server/api/ai/analyze.post.ts` validation guards
- Existing tests: `serializer.test.ts`, `layout.test.ts`, `applier.test.ts`

### Phase 4 — Deploy
**Checkpoint: live URL, smoke test passes**

1. Vercel: link repo, set `FIREWORKS_API_KEY` + `NUXT_PUBLIC_DEMO_KEYS_ENABLED=true`
2. Full smoke test: build → open → analyze → apply works end-to-end
3. Record 60s demo GIF for README
4. Write `README.md`: one-command quickstart, env var docs, architecture diagram, demo GIF

---

## Environment Variables

```env
# .env.local — never commit
FIREWORKS_API_KEY=fw_...

# .env.local.example — commit this
FIREWORKS_API_KEY=                     # fireworks.ai → Settings → API Keys
DEMO_KEYS_ENABLED=                     # "true" to use server key as demo fallback
NUXT_PUBLIC_DEMO_KEYS_ENABLED=         # exposes the flag to the browser (boolean only)

# Optional — Upstash Redis for rate limiting in production
UPSTASH_REDIS_REST_URL=
UPSTASH_REDIS_REST_TOKEN=
```

In `nuxt.config.ts`:
```ts
runtimeConfig: {
  // FIREWORKS_API_KEY is read directly from process.env in the server route
  public: {
    wsServerUrl: 'ws://localhost:1234',   // unused until collaboration is added
    demoKeysEnabled: false,               // overridden by NUXT_PUBLIC_DEMO_KEYS_ENABLED
  }
}
```

---

## AI Types

```ts
// Every SSE event from the server is one of these
type BoardStreamEvent =
  | { type: 'thinking';   text: string }
  | { type: 'suggestion'; action: MindMapAction }
  | { type: 'done';       latencyMs: number; tokens: number; costUsd: number }
  | { type: 'error';      message: string }

// Every action the AI can suggest on the graph
type MindMapAction =
  | { kind: 'add_node';      label: string; parentId: string; description?: string }
  | { kind: 'link_nodes';    fromId: string; toId: string }
  | { kind: 'relabel';       nodeId: string; label: string }
  | { kind: 'highlight';     nodeIds: string[]; reason: string }
  | { kind: 'expand_branch'; parentId: string; children: { label: string; description?: string }[] }
  | { kind: 'tidy_layout' }

// Agent personality — 4 built-in: AXIOM-9, VERN, ORACLE-3, PATCH
interface AgentPersona {
  id: string
  name: string
  tagline: string
  personality: string
  voiceRules: string
  accentColor: string
}
```

---

## Cost Estimate

- Model: `accounts/fireworks/models/minimax-m2p7` via Fireworks.ai
- ~$0.60 / 1M tokens (input + output)
- Typical board analysis: ~800–2,000 tokens total → **~$0.001–0.002 per analysis**

---

## AI_Web_App_Checklist Coverage

| Checklist Item | Nexus Forge Implementation |
|---|---|
| Model ID from env var | `process.env.FIREWORKS_API_KEY` (server-only) |
| SSE discriminated union | `BoardStreamEvent` in `lib/ai/types.ts` |
| AbortController pattern | `useAIAnalysis.ts` composable |
| Rate limiting | In-memory `RATE_LIMIT` config; Upstash Redis in prod |
| Hydration safety | `ssr: false` on board page + `onMounted` for canvas init |
| Storage keys as constants | `STORAGE_KEYS`, `STORAGE_KEY_API_KEYS` in `lib/config.ts` |
| Font loading | `globals.css` — no third-party CDN font requests |
| Lighthouse targets | Accessibility ≥ 95, LCP < 2.5s, CLS < 0.1 |
| CI tests | `npm test` → vitest run (serializer, layout, applier) |
| README quickstart | `cp .env.local.example .env.local && npm run dev` |

---

## Future Enhancements (post-MVP)

- **Real-time collaboration** — Yjs CRDT + y-websocket (ws-server stub is in `ws-server/`);
  client binding (`composables/useCollaboration.ts`) would sync `mindMapStore` nodes via `Y.Map`
- Voice input for node labels
- Version history + AI diff view
- Template gallery with AI seeding
- Mobile touch support
- More agent nodes: Critic (reviews suggestions), Executor (applies in batches)
- PWA offline shell

---

*Plan updated: 2026-05-19 | Stack: Nuxt 3 + SVG Canvas + LangGraph + Fireworks.ai*
