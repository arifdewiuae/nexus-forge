import type { MindMapNode } from '~/lib/ai/types'
import { GEOMETRY } from '~/lib/config'

export interface NodeSize {
  w: number
  h: number
  fontSize: number
  radius: number
}

type SizeTier = (typeof GEOMETRY)['ROOT' | 'BRANCH' | 'LEAF']

function sizeFor(len: number, t: SizeTier): NodeSize {
  const w = Math.max(t.wMin, Math.min(t.wMax, Math.round(len * t.wPerChar + t.wPad)))
  const fontSize = Math.min(t.fontMax, Math.max(t.fontMin, Math.floor((w - t.fontPad) / (len * GEOMETRY.CHAR_W))))
  return { w, h: t.h, fontSize, radius: t.radius }
}

export function nodeSize(node: MindMapNode, level: number): NodeSize {
  const len = Math.max(1, (node.label || '').length)
  if (level === 0) return sizeFor(len, GEOMETRY.ROOT)
  if (level === 1) return sizeFor(len, GEOMETRY.BRANCH)
  return sizeFor(len, GEOMETRY.LEAF)
}

export function rotFor(id: string): number {
  let h = 0
  for (const c of String(id)) h = (h * 31 + c.charCodeAt(0)) & 0xfffff
  return ((h % 9) - 4) * 0.7
}

export function underlinePath(w: number, h: number): string {
  const seg = Math.round(Math.max(28, Math.min(48, (w - 20) / 4)))
  const x0 = -(seg * 4) / 2
  const y0 = h / 2 + 9
  return `M ${x0} ${y0} q ${seg * 0.5} -4 ${seg} 1 t ${seg} -1 t ${seg} 1 t ${seg} -1`
}

export function sketchRectPath(x: number, y: number, w: number, h: number, r: number, j: number): string {
  return `M ${x+r+j} ${y-j}
          L ${x+w-r-j} ${y+j}
          Q ${x+w} ${y}, ${x+w+j} ${y+r-j}
          L ${x+w-j} ${y+h-r+j}
          Q ${x+w} ${y+h}, ${x+w-r+j} ${y+h+j}
          L ${x+r-j} ${y+h-j}
          Q ${x} ${y+h}, ${x-j} ${y+h-r+j}
          L ${x+j} ${y+r-j}
          Q ${x} ${y}, ${x+r-j} ${y+j} Z`
}

export function edgePath(a: MindMapNode, b: MindMapNode, dir: number): string {
  const dx = b.x - a.x, dy = b.y - a.y
  const len = Math.hypot(dx, dy) || 1
  const nx = -dy / len, ny = dx / len
  const s = dir
  return `M ${a.x} ${a.y} C ${a.x + dx * 0.35 + nx * 22 * s} ${a.y + dy * 0.35 + ny * 22 * s}, ${a.x + dx * 0.65 + nx * 20 * s} ${a.y + dy * 0.65 + ny * 20 * s}, ${b.x} ${b.y}`
}
