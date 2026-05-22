import type { MindMapNode } from '~/lib/ai/types'

// Approximate character width ratio for Kalam / Caveat handwriting fonts
const CHAR_W = 0.52

export interface NodeSize {
  w: number
  h: number
  fontSize: number
  radius: number
}

export function nodeSize(node: MindMapNode, level: number): NodeSize {
  const label = node.label || ''
  const len = Math.max(1, label.length)
  if (level === 0) {
    const w = Math.max(240, Math.min(400, Math.round(len * 14 + 60)))
    const fontSize = Math.min(42, Math.max(18, Math.floor((w - 40) / (len * CHAR_W))))
    return { w, h: 96, fontSize, radius: 30 }
  }
  if (level === 1) {
    const w = Math.max(160, Math.min(320, Math.round(len * 18 + 40)))
    const fontSize = Math.min(30, Math.max(14, Math.floor((w - 34) / (len * CHAR_W))))
    return { w, h: 60, fontSize, radius: 22 }
  }
  const w = Math.max(130, Math.min(280, Math.round(len * 14 + 34)))
  const fontSize = Math.min(22, Math.max(12, Math.floor((w - 28) / (len * CHAR_W))))
  return { w, h: 48, fontSize, radius: 18 }
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
