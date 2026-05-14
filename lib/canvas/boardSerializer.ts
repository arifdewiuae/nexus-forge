import {
  type FabricObject,
  IText,
  Textbox,
  Group,
} from 'fabric'
import type { SerializedBoard, SerializedObject } from '~/lib/ai/types'

function resolveType(obj: FabricObject): SerializedObject['type'] {
  if (obj.data?.type) return obj.data.type
  if (obj instanceof Group) return 'group'
  if (obj instanceof IText || obj instanceof Textbox) return 'text'
  if (obj.type === 'rect') return 'rect'
  if (obj.type === 'ellipse' || obj.type === 'circle') return 'ellipse'
  if (obj.type === 'line') return 'arrow'
  if (obj.type === 'path') return 'freehand'
  return 'unknown'
}

function extractText(obj: FabricObject): string | undefined {
  if (obj instanceof IText || obj instanceof Textbox) {
    return obj.text?.trim().slice(0, 500) || undefined
  }
  return undefined
}

function serializeObject(obj: FabricObject): SerializedObject {
  const bounds = obj.getBoundingRect()

  const result: SerializedObject = {
    id: obj.id,
    type: resolveType(obj),
    x: Math.round(bounds.left),
    y: Math.round(bounds.top),
    width: Math.round(bounds.width),
    height: Math.round(bounds.height),
  }

  const text = extractText(obj)
  if (text) result.text = text

  const fill = obj.fill
  if (typeof fill === 'string' && fill && fill !== 'transparent') result.fill = fill

  const stroke = obj.stroke
  if (typeof stroke === 'string' && stroke) result.stroke = stroke

  if (obj instanceof Group) {
    result.children = obj.getObjects().map(child => child.id)
  }

  return result
}

export function serializeBoard(objects: FabricObject[], boardId: string): SerializedBoard {
  const meaningful = objects.filter((obj) => {
    const bounds = obj.getBoundingRect()
    return bounds.width > 4 && bounds.height > 4
  })

  return {
    boardId,
    objectCount: meaningful.length,
    objects: meaningful.map(serializeObject),
    timestamp: new Date().toISOString(),
  }
}
