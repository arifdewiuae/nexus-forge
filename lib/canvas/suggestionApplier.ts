import { type Canvas, type FabricObject, Line, Textbox, Group } from 'fabric'
import { nanoid } from 'nanoid'
import type { BoardAction } from '~/lib/ai/types'

function findById(canvas: Canvas, id: string): FabricObject | undefined {
  return canvas.getObjects().find(obj => obj.id === id)
}

export async function applyAction(canvas: Canvas, action: BoardAction): Promise<void> {
  switch (action.kind) {
    case 'move': {
      const obj = findById(canvas, action.objectId)
      if (!obj) return
      obj.set({ left: action.x, top: action.y })
      obj.setCoords()
      break
    }

    case 'label': {
      const obj = findById(canvas, action.objectId)
      if (!obj) return
      if (obj instanceof Textbox) {
        obj.set({ text: action.text })
      } else {
        // Add a text label underneath the object
        const bounds = obj.getBoundingRect()
        const label = new Textbox(action.text, {
          left: bounds.left,
          top:  bounds.top + bounds.height + 6,
          width: bounds.width,
          fontSize: 12,
          fill: '#94a3b8',
          textAlign: 'center',
          fontFamily: 'Inter, system-ui, sans-serif',
        })
        label.id = nanoid(8)
        canvas.add(label)
      }
      break
    }

    case 'recolor': {
      const obj = findById(canvas, action.objectId)
      if (!obj) return
      // Textbox/sticky: set backgroundColor; shapes: set fill
      if (obj instanceof Textbox) {
        obj.set({ backgroundColor: action.fill })
      } else {
        obj.set({ fill: action.fill })
      }
      break
    }

    case 'connect': {
      const from = findById(canvas, action.fromId)
      const to   = findById(canvas, action.toId)
      if (!from || !to) return

      const fb = from.getBoundingRect()
      const tb = to.getBoundingRect()
      const x1 = fb.left + fb.width  / 2
      const y1 = fb.top  + fb.height / 2
      const x2 = tb.left + tb.width  / 2
      const y2 = tb.top  + tb.height / 2

      const cx = (x1 + x2) / 2
      const cy = (y1 + y2) / 2

      const line = new Line(
        [x1, y1, x2, y2],
        {
          stroke: '#6366f1',
          strokeWidth: 1.5,
          strokeDashArray: [5, 4],
          selectable: true,
          evented: true,
          // Store as absolute coords, then re-center (Fabric.js Line quirk)
          left: cx,
          top:  cy,
          x1: x1 - cx,
          y1: y1 - cy,
          x2: x2 - cx,
          y2: y2 - cy,
        },
      )
      line.id = nanoid(8)
      line.setCoords()
      canvas.add(line)
      break
    }

    case 'group': {
      const members = action.objectIds
        .map(id => findById(canvas, id))
        .filter((obj): obj is FabricObject => obj !== undefined)

      if (members.length < 2) return

      members.forEach(obj => canvas.remove(obj))

      const group = new Group(members, {
        left: action.x,
        top:  action.y,
      })
      group.id = nanoid(8)
      group.data = { type: 'group' }
      canvas.add(group)

      // Add a label below the group
      const bounds = group.getBoundingRect()
      const label = new Textbox(action.label, {
        left:     bounds.left,
        top:      bounds.top + bounds.height + 8,
        width:    bounds.width,
        fontSize: 11,
        fill:     '#a78bfa',
        textAlign: 'center',
        fontFamily: 'Inter, system-ui, sans-serif',
        fontStyle: 'italic',
      })
      label.id = nanoid(8)
      canvas.add(label)
      break
    }
  }

  canvas.requestRenderAll()
}

export async function applyAll(canvas: Canvas, actions: BoardAction[]): Promise<void> {
  for (const action of actions) {
    await applyAction(canvas, action)
  }
}
