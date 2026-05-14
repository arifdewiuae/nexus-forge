import type { SerializedObject } from '~/lib/ai/types'

// Augment Fabric.js base type with our custom properties
declare module 'fabric' {
  interface FabricObject {
    id: string
    data: FabricObjectData
  }
}

export interface FabricObjectData {
  type?: SerializedObject['type']
  stickyColor?: string
}
