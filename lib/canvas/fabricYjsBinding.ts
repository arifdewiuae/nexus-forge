import type { Canvas } from 'fabric'

// Phase 3: bidirectional sync between Yjs Y.Map and Fabric.js canvas
// Y.Map<string, SerializedObject> keyed by object.id
// - Fabric events  → update Y.Map  (local changes out)
// - Y.Map observe  → update Fabric  (remote changes in, guarded against echo)

export function bindFabricToYjs(
  _canvas: Canvas,
  // _yMap: Y.Map<SerializedObject>,  // uncomment in Phase 3
): () => void {
  // TODO Phase 3
  const unbind = () => { /* noop until Phase 3 */ }
  return unbind
}
