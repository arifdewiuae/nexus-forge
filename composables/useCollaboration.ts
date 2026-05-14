import type { Canvas } from 'fabric'
import type { PresenceUser } from '~/lib/ai/types'

// Phase 3: Yjs + y-websocket real-time collaboration
export function useCollaboration(_boardId: string, _canvas: Canvas | null) {
  const store = useBoardStore()

  // TODO Phase 3:
  // 1. Init Y.Doc
  // 2. Connect WebsocketProvider to NUXT_PUBLIC_WS_SERVER_URL/boardId
  // 3. Bind Yjs Y.Map ↔ Fabric.js objects via fabricYjsBinding.ts
  // 4. Set up awareness for cursor presence → store.presenceUsers

  const isConnected = ref(false)
  const localUser = ref<PresenceUser>({
    clientId: Math.floor(Math.random() * 1_000_000),
    color: '#7c3aed',
    name: 'You',
  })

  onUnmounted(() => {
    // TODO Phase 3: disconnect WebsocketProvider and destroy Y.Doc
  })

  return { isConnected, localUser }
}
