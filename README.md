# Nexus Forge — AI Mind Map

An infinite-canvas mind-map with four distinct AI personalities that analyze your thinking, stream their reasoning live, and restructure your map with a click.

> **Portfolio demo** — AI Engineering + Frontend  
> Stack: Nuxt 3 · LangGraph.js · Fireworks.ai · Custom SVG Canvas · Pinia · Vitest

---

## Demo

**Live:** [nexus-forge-virid.vercel.app](https://nexus-forge-virid.vercel.app/)

**The core loop:** Build a messy mind-map → pick a personality → watch it stream dry, clinical reasoning → click Apply → nodes restructure themselves.

---

## Quickstart

```bash
# 1 — clone and install
git clone https://github.com/arifdewiuae/nexus-forge.git
npm install

# 2 — configure environment
cp .env.local.example .env.local
# edit .env.local — add your FIREWORKS_API_KEY

# 3 — run dev server
npm run dev
# → http://localhost:3000
```

**No API key?** Get one free at [fireworks.ai](https://fireworks.ai) → Settings → API Keys.  
Or enter it directly in the app via **⚙ Settings** — it is stored only in your browser.

---

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `FIREWORKS_API_KEY` | Yes (server) | Fireworks.ai key — never exposed to browser |
| `DEMO_KEYS_ENABLED` | No | `"true"` to use the server key when visitors haven't added their own |
| `NUXT_PUBLIC_DEMO_KEYS_ENABLED` | No | Exposes the flag to the browser (boolean only — key value stays server-side) |
| `UPSTASH_REDIS_REST_URL` | No | Upstash Redis for persistent rate limiting in production |
| `UPSTASH_REDIS_REST_TOKEN` | No | Upstash Redis token |

---

## Architecture

```
pages/index.vue
  └─ MindMapCanvas.vue      ← Custom SVG canvas, pan/zoom/drag/undo
  └─ MindMapToolbar.vue     ← Tool chips + agent selector
  └─ MindMapSideNote.vue    ← Selected-node details panel (bottom sheet on mobile)
  └─ AIPanel.vue            ← AI trace panel + suggestion cards (floating / bottom sheet)
  └─ MindMapModal.vue       ← Export / Import / Settings / Help

stores/mindMapStore.ts      ← All reactive graph state (Pinia)

composables/
  useAIAnalysis.ts          ← SSE stream consumer, AbortController
  useApiKeys.ts             ← localStorage key management + demo-key flag

server/api/ai/analyze.post.ts  ← SSE streaming endpoint (Nuxt server route)
  └─ lib/ai/graph.ts           ← LangGraph workflow (2 nodes)
       ├─ analyzerNode.ts       ← Streams "thinking" text
       └─ suggesterNode.ts      ← Emits typed MindMapAction[]

lib/mindmap/
  serializer.ts   ← nodes → SerializedGraph (sent to LLM)
  layout.ts       ← radial layout algorithm
  applier.ts      ← MindMapAction[] → store mutations
```

### AI Request Flow

```
User clicks "Analyze"
  → serializeGraph()               [lib/mindmap/serializer.ts]
  → POST /api/ai/analyze           { graph, agent, userPrompt }
      ↓ resolve API key (header || server demo key)
      ↓ rate-limit check (in-memory; Upstash Redis in prod)
      ↓ validate: 50 KB cap, no null bytes, non-empty graph
      ↓ runMindMapAnalysis() → LangGraph
           analyzerNode → streams "thinking" as SSE
           suggesterNode → emits MindMapAction[] as SSE
           → { type: 'done', latencyMs, tokens, costUsd }
  ← SSE reader in useAIAnalysis
      thinking   → trace panel updates live
      suggestion → suggestion card appended
      done       → analysis complete
User clicks "Apply"
  → applier.ts mutates mindMapStore (add nodes, relabel, tidy layout, etc.)
```

### AI Types

```ts
// Every SSE event from the server
type BoardStreamEvent =
  | { type: 'thinking';   text: string }
  | { type: 'suggestion'; action: MindMapAction }
  | { type: 'done';       latencyMs: number; tokens: number; costUsd: number }
  | { type: 'error';      message: string }

// Every action the AI can apply to the graph
type MindMapAction =
  | { kind: 'add_node';      label: string; parentId: string }
  | { kind: 'link_nodes';    fromId: string; toId: string }
  | { kind: 'relabel';       nodeId: string; label: string }
  | { kind: 'highlight';     nodeIds: string[]; reason: string }
  | { kind: 'expand_branch'; parentId: string; children: { label: string }[] }
  | { kind: 'tidy_layout' }
```

---

## AI Personalities

Four distinct personalities, each with a different reasoning style:

| Agent | Personality | Voice |
|---|---|---|
| **AXIOM-9** | Cold, precise analyst | "I have analyzed your graph. Here is what the data shows:" |
| **VERN** | Blue-collar maintenance bot | Short sentences. Blue-collar metaphors. Grudging respect. |
| **ORACLE-3** | Ancient AI that watched empires fall | Philosophical asides. Dark humor about entropy. |
| **PATCH** | Chaotic repair droid | Genuine excitement. Tangents in parentheses. "OH!" |

---

## Commands

```bash
npm run dev          # Start dev server (localhost:3000)
npm run build        # Production build
npm run preview      # Preview production build
npm test             # Vitest — single pass
npm run test:watch   # Vitest — watch mode
```

---

## Deploy to Vercel

```bash
# Install Vercel CLI
npm i -g vercel

# Link and deploy
vercel

# Set required environment variables
vercel env add FIREWORKS_API_KEY        # your fw_... key
vercel env add DEMO_KEYS_ENABLED        # "true" for public demo
vercel env add NUXT_PUBLIC_DEMO_KEYS_ENABLED  # "true"

# Redeploy to pick up env vars
vercel --prod
```

Nuxt 3 is auto-detected by Vercel. No custom build settings needed.  
`vercel.json` adds security headers (`X-Frame-Options`, `X-Content-Type-Options`, etc.).

---

## Cost

Model: `accounts/fireworks/models/minimax-m2p7` via Fireworks.ai  
~$0.60 / 1M tokens · Typical analysis: ~1,000 tokens → **~$0.001 per run**

---

## Future Work

- Version history + AI diff view
- Voice input for node labels
- Template gallery with AI seeding
