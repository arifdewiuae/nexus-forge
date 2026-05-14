# Nexus Forge — Collaborative AI Whiteboard
## Project Plan & Vision

---

## What Is This Project?

**Nexus Forge** is a portfolio/demo project showcasing heavy frontend engineering + practical AI.
It's an infinite-canvas whiteboard where multiple users collaborate in real-time and an AI agent
analyzes the board and suggests (or auto-applies) structural improvements.

Think: Figma mini — but with an AI that watches your board and helps organize it.

---

## Why This Is a Strong Portfolio Demo

Most AI portfolio projects are just chat interfaces — "type a message, see a response." Nexus Forge
is genuinely different because it combines three things that are hard to do together:

1. **Real-time collaboration** — live multi-cursor sync with CRDT conflict resolution (complex WebSocket engineering)
2. **Complex canvas engineering** — custom Fabric.js whiteboard with tools, drag/zoom/pan, sticky notes
3. **AI that understands visual/spatial structure** — not just text, but positions, groupings, clusters

The **trace view** showing the AI's reasoning step-by-step is a portfolio differentiator that signals
engineering maturity. And the "Apply Suggestion" feature (AI physically reorganizing the canvas) is a
wow moment that's hard to forget.

**The sweetest demo:** Drop 10–15 sticky notes of jumbled user research insights, hit "Analyze Board",
watch the AI stream its reasoning, click Apply — and see it reorganize everything into labeled theme
clusters with arrows. That's a 30-second demo that makes people ask "how did you build that?"

---

## Real-World Use Cases

| Use Case | What Happens |
|---|---|
| **Team brainstorming** | Drop sticky notes of ideas → AI clusters by theme, labels groups |
| **Project retrospective** | Team adds "what went wrong" stickies → AI finds patterns, suggests action items |
| **System design** | Draw rough architecture boxes → AI suggests missing components, connection labels |
| **UX wireframing** | Sketch screen layouts → AI suggests hierarchy and flow improvements |
| **Mind mapping** | Messy idea dump → AI structures into a labeled hierarchy |
| **Workshop facilitation** | Facilitator uses AI to synthesize group outputs live in real-time |
| **User research synthesis** | Research notes → AI identifies themes, quotes, and key insights |

---

## Final Tech Stack

| Layer             | Technology                                              |
|-------------------|---------------------------------------------------------|
| Framework         | Nuxt 3 (Vue 3 + SSR + server routes)                   |
| Canvas            | Fabric.js 6 + TypeScript                               |
| Collaboration     | Yjs + y-websocket                                       |
| AI Orchestration  | LangGraph.js                                            |
| LLM               | `accounts/fireworks/models/minimax-m2p7` via Fireworks  |
| UI                | shadcn-vue + Tailwind CSS + Lucide icons                |
| State             | Pinia + Yjs shared doc                                  |
| Auth              | None — anonymous share-link boards                      |
| Deploy            | Vercel (Nuxt) + Fly.io (y-websocket server)            |

### Key Architecture Decisions

**Why Nuxt 3 (not plain Vite + Vue):**
- Server routes keep `FIREWORKS_API_KEY` server-side only — never exposed to the browser
- Native Vercel deployment with zero extra config
- SSR for better Lighthouse / Core Web Vitals scores
- Server-side streaming SSE maps cleanly to Nuxt's `sendStream` API

**What Yjs / CRDT means in plain English:**
When two users drag the same shape at the same time, Yjs figures out how to merge both moves without
conflicts — like Google Docs magic. `y-websocket` is the tiny relay server that routes those changes
between users. The board ID in the URL doubles as the collaboration room ID.

**Why Fly.io (not Render) for the WebSocket server:**
Render's free tier sleeps after 15 minutes of inactivity — terrible for demos. Fly.io's free tier
stays always-on globally. The y-websocket server is ~15 lines of Node.js.

**Why Fabric.js (not tldraw):**
More custom code = more visible portfolio engineering. tldraw is beautiful out-of-the-box but shows
less skill. Fabric.js lets you wire up everything: custom serialization, Yjs binding, event handling.

---

## Project Structure

```
nexus-forge/
├── server/
│   └── api/
│       └── ai/
│           └── analyze.post.ts      # Fireworks SSE streaming endpoint
├── components/
│   ├── Whiteboard.vue               # Fabric.js canvas wrapper
│   ├── Toolbar.vue                  # Drawing tools sidebar
│   ├── AITracePanel.vue             # Live AI reasoning + suggestion cards
│   ├── CollabPresence.vue           # Multi-cursor / user color avatars
│   └── SuggestionCard.vue           # Individual suggestion + Apply button
├── composables/
│   ├── useCanvas.ts                 # Fabric.js setup, tool management
│   ├── useCollaboration.ts          # Yjs doc + y-websocket binding
│   └── useAIAnalysis.ts             # SSE stream consumer + AbortController
├── lib/
│   ├── config.ts                    # All constants (keys, colors, limits)
│   ├── utils.ts                     # cn() utility for Tailwind class merging
│   ├── canvas/
│   │   ├── boardSerializer.ts       # Canvas objects → LLM-friendly JSON
│   │   ├── suggestionApplier.ts     # BoardAction[] → Fabric.js mutations
│   │   └── fabricYjsBinding.ts      # Yjs shared map ↔ Fabric.js objects
│   └── ai/
│       ├── graph.ts                 # LangGraph workflow definition
│       ├── types.ts                 # Discriminated unions: BoardStreamEvent, BoardAction
│       └── nodes/
│           ├── analyzerNode.ts      # Board pattern / cluster detection
│           └── suggesterNode.ts     # Typed BoardAction[] output
├── stores/
│   └── boardStore.ts                # Pinia: active tool, presence, AI state
├── pages/
│   ├── index.vue                    # Landing — generate board ID, redirect
│   └── board/
│       └── [id].vue                 # Main whiteboard page
├── ws-server/
│   ├── index.ts                     # y-websocket server (~15 lines)
│   ├── package.json
│   └── fly.toml                     # Fly.io deploy config
├── nuxt.config.ts
├── tailwind.config.ts
├── .env.local.example
└── package.json
```

---

## Development Phases

### Phase 1 — Foundation (Days 1–3)
**Checkpoint: can draw shapes, add stickies, board lives at a URL**

1. `npx nuxi init` — Nuxt 3 + TypeScript
2. Install shadcn-vue, Tailwind CSS, Lucide Vue, Fabric.js 6, Pinia
3. `pages/index.vue` — generate nanoid board ID, redirect to `/board/[id]`
4. `pages/board/[id].vue` — layout: Toolbar (left) + Canvas (center) + AITracePanel (right)
5. `components/Whiteboard.vue` + `composables/useCanvas.ts`
   - Init Fabric.Canvas on `onMounted` (client-only page, no SSR issues)
   - Tools: select, freehand draw, rectangle, ellipse, sticky note (IText), text, arrow
   - Space+drag to pan, Ctrl+Scroll to zoom
   - Delete key to remove selected objects
6. `lib/canvas/boardSerializer.ts` — serialize canvas to typed JSON for LLM
7. `stores/boardStore.ts` — activeTool, isAnalyzing, suggestions, presenceUsers

### Phase 2 — AI Core (Days 4–6)
**Checkpoint: Analyze Board → streaming AI reasoning → Apply reorganizes canvas**

1. `lib/ai/types.ts` — discriminated union types for SSE events and board actions
2. `lib/ai/graph.ts` — LangGraph workflow: analyzerNode → suggesterNode → stream
3. `server/api/ai/analyze.post.ts` — Nuxt server route
   - Reads `FIREWORKS_API_KEY` from `useRuntimeConfig()` (server-only)
   - Accepts `{ boardJson, boardId }` in request body
   - Streams `BoardStreamEvent` as SSE
4. `composables/useAIAnalysis.ts` — SSE consumer, AbortController on unmount/new request
5. `components/AITracePanel.vue` — streams thinking text + renders SuggestionCard list
6. `lib/canvas/suggestionApplier.ts` — maps `BoardAction` → Fabric.js mutations

### Phase 3 — Collaboration (Days 7–9)
**Checkpoint: same URL in 2 tabs → draw in one, see it live in the other**

1. `ws-server/index.ts` — y-websocket server, room = board ID from URL
2. `fly.toml` — Fly.io deploy config, single machine, port 1234
3. `lib/canvas/fabricYjsBinding.ts`
   - Yjs `Y.Map` keyed by `fabric.Object.id`
   - Fabric events → update Y.Map; Y.Map observe → update Fabric canvas
4. `composables/useCollaboration.ts` — init Y.Doc, WebsocketProvider, awareness
5. `components/CollabPresence.vue` — overlay remote cursors with user color dot

### Phase 4 — Polish + Checklist (Days 10–12)
**Checkpoint: passes AI_Web_App_Checklist, portfolio-ready**

- `FIREWORKS_API_KEY` only in server runtime config (never `NUXT_PUBLIC_*`)
- Session HTTP-only cookie for rate limiting (20 req/hour, Upstash Redis in prod)
- CORS locked to own origin
- Input validated at route boundary (max board JSON size, no null bytes)
- Analyze button: idle → animated dots → streaming (Stop button) → done
- Export PNG (`canvas.toDataURL()`) and JSON download
- All icon buttons have `aria-label` (Lighthouse accessibility ≥ 95)
- Color contrast ≥ 4.5:1 in dark mode
- Vitest unit tests: `boardSerializer`, `suggestionApplier`, SSE codec

### Phase 5 — Deploy (Day 13)
1. `fly launch` in `ws-server/` — deploy y-websocket to Fly.io
2. Vercel: link repo, set env vars, deploy Nuxt
3. Full smoke test: draw → analyze → apply → open second tab → collab works
4. Record 60s demo GIF for README
5. Update README: one-command quickstart, env var docs, architecture diagram

---

## Environment Variables

```env
# .env.local — never commit
FIREWORKS_API_KEY=fw_...

# .env.local.example — commit this
FIREWORKS_API_KEY=             # fireworks.ai dashboard → API Keys
NUXT_PUBLIC_WS_SERVER_URL=     # wss://your-app.fly.dev (after Phase 5 deploy)

# Optional — Vercel prod rate limiting only
UPSTASH_REDIS_REST_URL=
UPSTASH_REDIS_REST_TOKEN=
```

In `nuxt.config.ts`:
```ts
runtimeConfig: {
  fireworksApiKey: '',          // server-only — never exposed to client
  public: {
    wsServerUrl: 'ws://localhost:1234'  // overridden by NUXT_PUBLIC_WS_SERVER_URL
  }
}
```

---

## AI Analysis Types

```ts
// Every SSE event from the server is one of these (no magic strings)
type BoardStreamEvent =
  | { type: 'thinking'; text: string }
  | { type: 'suggestion'; action: BoardAction }
  | { type: 'done'; latencyMs: number; tokens: number; costUsd: number }
  | { type: 'error'; message: string }

// Every action the AI can suggest on the canvas
type BoardAction =
  | { kind: 'move';    objectId: string; x: number; y: number }
  | { kind: 'group';   objectIds: string[]; label: string; x: number; y: number }
  | { kind: 'label';   objectId: string; text: string }
  | { kind: 'recolor'; objectId: string; fill: string }
  | { kind: 'connect'; fromId: string; toId: string }
```

---

## Cost Estimate

- `accounts/fireworks/models/minimax-m2p7` via Fireworks.ai
- ~$0.03–0.08 per full board analysis
- Typical board: 500–2,000 tokens in, 300–600 tokens out

---

## AI_Web_App_Checklist Coverage

| Checklist Item | Nexus Forge Implementation |
|---|---|
| Model ID from env var | `runtimeConfig.fireworksApiKey` (server-only) |
| SSE discriminated union | `BoardStreamEvent` in `lib/ai/types.ts` |
| AbortController pattern | `useAIAnalysis.ts` composable |
| Rate limiting | Session cookie + Upstash Redis |
| Hydration safety | `ssr: false` on board page + `onMounted` for canvas init |
| Storage keys as constants | `STORAGE_KEYS` in `lib/config.ts` |
| `next/font` → `@nuxt/fonts` | `display: swap`, no third-party CDN |
| Lighthouse targets | LCP <2.5s, CLS <0.1, INP <200ms |
| CI tests | GitHub Actions: `nuxt build` + `vitest run` |
| README quickstart | `cp .env.local.example .env.local && npm run dev` |

---

## Future Enhancements (post-MVP)

- Voice input for board notes
- Version history + AI diff view
- Template gallery with AI seeding
- Mobile touch support (Fabric.js has touch APIs)
- PWA offline shell
- More agent nodes: Critic (reviews suggestions), Executor (applies in batches)

---

*Plan created: 2026-05-14 | Stack: Nuxt 3 + Fabric.js + LangGraph + Fireworks.ai*
