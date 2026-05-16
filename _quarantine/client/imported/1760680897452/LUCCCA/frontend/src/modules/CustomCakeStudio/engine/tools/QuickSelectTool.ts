import { Tool } from './Tool'
import type Konva from 'konva'
import { useStudioStore } from '../store/useStudioStore'
import { circleToPolygon } from '../selection/SelectionManager'

/**
 * QuickSelect (stub v0.1)
 * Creates small circular additions along the drag path; shift adds, alt subtracts.
 */
export class QuickSelectTool extends Tool {
  private last?: { x:number; y:number }
  constructor(){ super('quick') }
  onPointerDown(e: Konva.KonvaEventObject<MouseEvent>){
    const pos = e.target.getStage()?.getPointerPosition(); if(!pos) return
    this.last = { x: pos.x, y: pos.y }
  }
  onPointerMove(e: Konva.KonvaEventObject<MouseEvent>){
    if(!this.last) return
    const store = useStudioStore.getState()
    const pos = e.target.getStage()?.getPointerPosition(); if(!pos) return
    const r = 12
    const poly = circleToPolygon(pos.x, pos.y, r, 18)
    if (e.evt.altKey) { store.subtractSelection(poly) } else { store.addSelection(poly) }
    this.last = { x: pos.x, y: pos.y }
  }
  onPointerUp(){ this.last = undefined }
}
