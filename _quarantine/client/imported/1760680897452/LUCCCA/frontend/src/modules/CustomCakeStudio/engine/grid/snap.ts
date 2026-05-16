import type Konva from 'konva'
import { computeGridPoints, snapToNearest } from './compute'
import type { GridSettings } from './types'

export function snapNodeToGrid(node: Konva.Node, canvas:{width:number;height:number;dpi:number}, grid: GridSettings){
  const pts = computeGridPoints(canvas.width, canvas.height, canvas.dpi, grid)
  const pos = snapToNearest(node.x(), node.y(), pts)
  node.position(pos as any)
}

export default snapNodeToGrid;
