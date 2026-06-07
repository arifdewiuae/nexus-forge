# Nexus Forge — AI Mind Map

An infinite-canvas mind-map with four distinct AI personalities that analyze your thinking, stream their reasoning live, and restructure your map with a click.

> **Portfolio demo** — AI Engineering + Frontend  
> Stack: Nuxt 3 · LangGraph.js · Fireworks.ai · Custom SVG Canvas · Pinia · Vitest · Playwright

---

## Demo

**Live:** [nexus-forge-virid.vercel.app](https://nexus-forge-virid.vercel.app/)

**How it works under the hood:** [`docs/how-it-works.html`](docs/how-it-works.html) — a single-page technical deep-dive (layers, request flow, SSE protocol, guardrails).

**The core loop:** Build a messy mind-map → pick a personality → watch it stream dry, clinical reasoning → click Apply → nodes restructure themselves.

---

## Quickstart

```bash
# 1 — clone and install (pnpm; Node 24)
git clone https://github.com/arifdewiuae/nexus-forge.git
corepack enable          # provisions the pnpm version pinned in package.json
pnpm install

# 2 — configure environment
cp .env.local.example .env.local
# edit .env.local — add your FIREWORKS_API_KEY

# 3 — run dev server
pnpm dev
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
| `OPENAI_API_KEY` | No | Enables the optional OpenAI Moderation pass (jailbreak regex always runs) |

---

## Architecture

Four layers, one-way dependencies: **UI → API → AI**, and everything → **Data**.

```
UI    components/                  ← SVG canvas, toolbar, side note, AI panel
        MindMapCanvas.vue          ← pan/zoom/drag/undo (viewport/drag/label-edit composables)
        AIPanel.vue                ← AI trace + AISuggestionCard.vue (extracted per-suggestion card)
      pages/index.vue              ← layout, keyboard shortcuts, modal state

API   server/api/ai/analyze.post.ts ← SSE route: key → rate-limit → moderation → stream
      server/middleware/            ← cors (exact-origin) + securityHeaders (CSP/HSTS)
      server/utils/rateLimit.ts     ← in-memory (dev) / Upstash Redis (prod), two-tier
      composables/useAIAnalysis.ts  ← SSE stream consumer + AbortController

AI    lib/ai/graph.ts              ← LangGraph workflow (analyzer → suggester)
        nodes/analyzerNode.ts      ← streams "thinking" text
        nodes/suggesterNode.ts     ← emits typed MindMapAction[]
      lib/ai/schemas.ts            ← Zod schemas — single source of truth for types
      lib/ai/moderation.ts         ← jailbreak regex + optional OpenAI moderation (fail-open)

Data  stores/  useGraphStore       ← nodes, cross-links, tool, undo/redo, persistence
               useAIStore          ← streaming state, suggestions, agent, highlights
               useSettingsStore    ← accent colour
      lib/mindmap/  serializer · layout (radial) · applier (actions → store mutations)
      lib/config.ts                ← all constants (model, pricing, limits, security headers)
```

### AI Request Flow

```
User clicks "Analyze"
  → serializeGraph()               [lib/mindmap/serializer.ts]
  → POST /api/ai/analyze           { graph, agent, userPrompt }   (key in header)
      ↓ resolve API key (header || server demo key) → 401 if none
      ↓ rate-limit (two-tier: demo 20/hr, own key 100/hr) → 429 + Retry-After
      ↓ validate: 50 KB cap, no null bytes, Zod, non-empty graph
      ↓ moderation: jailbreak regex + optional OpenAI (fail-open) → SSE error if blocked
      ↓ runMindMapAnalysis() → LangGraph
           analyzerNode → streams "thinking" as SSE
           suggesterNode → emits MindMapAction[] as SSE
           → { type: 'done', latencyMs, tokens, costUsd, truncated? }
  ← SSE reader in useAIAnalysis
      thinking   → trace panel updates live
      suggestion → suggestion card appended
      done       → analysis complete
User clicks "Apply"
  → applier.ts mutates the graph store (add nodes, relabel, tidy layout, …)
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
pnpm dev          # Start dev server (localhost:3000)
pnpm build        # Production build
pnpm preview      # Preview production build
pnpm typecheck    # nuxt typecheck (vue-tsc)
pnpm test         # Vitest — unit + component, single pass
pnpm test:watch   # Vitest — watch mode
pnpm test:e2e     # Playwright golden-path E2E (mocked SSE)
```

---

## Testing

A full pyramid, all green in CI (`.github/workflows/ci.yml` — typecheck → unit/component → build → E2E):

- **Unit** (`vitest`, happy-dom): pure utilities (serializer, layout, geometry, applier, markdown),
  Zod schemas, the LangGraph orchestration (mocked nodes), rate limiting (fake timers, two tiers),
  and moderation — including the **fail-open** branch.
- **Component** (`@vue/test-utils`): `AISuggestionCard`, `MindMapToolbar` (tool select, emits, disabled states).
- **E2E** (`playwright`): the golden path — analyze with a **mocked** SSE stream → watch the reasoning
  stream → Apply a suggestion → assert the node lands on the canvas. Never hits a real LLM.

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
Security headers (CSP, HSTS, `X-Frame-Options`, `Permissions-Policy`, …) are set in **both**
`server/middleware/securityHeaders.ts` (so `pnpm preview` and Functions carry them) and `vercel.json`
(so the CDN sets them on static assets) — single-sourced from `SECURITY_HEADERS` in `lib/config.ts`.

---

## Cost

Model: `accounts/fireworks/models/minimax-m2p7` via Fireworks.ai  
~$0.60 / 1M tokens · Typical analysis: ~1,000 tokens → **~$0.001 per run**

---

## Future Work

- Version history + AI diff view
- Voice input for node labels
- Template gallery with AI seeding
