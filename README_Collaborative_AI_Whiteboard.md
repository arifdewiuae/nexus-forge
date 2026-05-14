# Collaborative AI Whiteboard with Agentic Assistant

## Nexus Forge — Collaborative AI Whiteboard

**Realtime multi-user whiteboard powered by heavy frontend + local/open-source AI agent**

A beautiful collaborative infinite canvas where multiple users can draw, add sticky notes, group elements — and an AI agent analyzes the entire board in real-time and suggests improvements, groupings, next steps, and can even auto-apply changes.

## ✨ Live Demo
[Live Demo →](https://your-whiteboard.vercel.app)  
[Demo Video (60s) →](https://www.loom.com/share/...)

## 🎯 Key Features

- Infinite canvas with drawing, sticky notes, shapes, text
- Real-time collaboration (multiple cursors, presence)
- Drag, resize, group, layer management
- **AI Analyze Board** button — launches agentic workflow
- AI suggests: structure, groupings, connections, action items
- One-click "Apply Suggestion" (auto-reorganize)
- Full trace view of AI reasoning
- Export board as JSON / PNG / PDF

## 🛠 Tech Stack

| Layer             | Technology                                      |
|-------------------|-------------------------------------------------|
| **Frontend**      | Vue 3 + TypeScript + Vite + Pinia              |
| **Canvas**        | Fabric.js + custom extensions                   |
| **Collaboration** | Yjs + y-websocket (or Supabase Realtime)       |
| **AI**            | LangGraph.js + Agent Orchestrator               |
| **LLM**           | Qwen3.5-32B or Llama 3.3 70B on Fireworks.ai   |
| **UI**            | shadcn-vue + Tailwind + Lucide                  |
| **Deploy**        | Vercel (frontend) + Render/Fly.io (WS server)  |

## 🚀 Quick Start

### 1. Clone
```bash
git clone https://github.com/yourname/collaborative-ai-whiteboard.git
cd collaborative-ai-whiteboard
```

### 2. Install
```bash
npm install
```

### 3. Environment
```env
FIREWORKS_API_KEY=fw_...
# Optional for collab
SUPABASE_URL=...
SUPABASE_ANON_KEY=...
Y_WEBSOCKET_URL=...
```

### 4. Run
```bash
npm run dev
```

## Architecture

```mermaid
graph TD
    A[Canvas State (Yjs)] --> B[Serialize to JSON]
    B --> C[AI Orchestrator Agent]
    C --> D[Analyzer Node]
    D --> E[Suggester Node]
    E --> F[Structured Actions JSON]
    F --> G[Apply to Canvas or Show Suggestions]
    
    subgraph "Frontend"
    H[Vue + Fabric.js] <--> I[Pinia + Yjs]
    end
```

### Core Files
- `src/lib/ai/graph.ts` — LangGraph agent workflow
- `src/lib/canvas/boardSerializer.ts` — Convert canvas to LLM-friendly JSON
- `src/components/Whiteboard.vue` — Main Fabric.js canvas
- `src/components/AITracePanel.vue` — Live AI reasoning view
- `src/stores/boardStore.ts` — Pinia + Yjs integration

## Why This Project Stands Out

- Heavy Frontend mastery: complex canvas, realtime CRDT sync, advanced state management
- Practical agentic AI that understands visual/spatial data
- Full collaboration features (like Figma mini)
- Transparent AI decision making with trace view
- Works great with cheap open-source models

## Cost
One full AI analysis → **~$0.03 – 0.08** on Fireworks (Qwen3.5-32B)

## Future Enhancements
- Voice input for board
- More advanced agents (Critic, Executor)
- Template gallery with AI
- Version history + AI diff
- Mobile support

## Author
**Arif Dewi** — Heavy Frontend Engineer & AI Engineer  
[LinkedIn](https://www.linkedin.com/in/arifdewi/) | [GitHub](https://github.com/yourname)
