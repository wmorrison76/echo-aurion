import { Tool, ToolContext } from './Tool'
import type Konva from 'konva'
import { useStudioStore } from '../store/useStudioStore'
import { rectToPolygon } from '../selection/SelectionManager'

export class MarqueeTool extends Tool {
  private start?: { x:number; y:number }
  constructor(){ super('marquee') }

  onPointerDown(e: Konva.KonvaEventObject<MouseEvent>){
    const pos = e.target.getStage()?.getPointerPosition(); if(!pos) return
    this.start = { x: pos.x, y: pos.y }
  }

  onPointerUp(e: Konva.KonvaEventObject<MouseEvent>){
    if(!this.start) return
    const pos = e.target.getStage()?.getPointerPosition(); if(!pos) return
    const poly = rectToPolygon(this.start.x, this.start.y, pos.x, pos.y)
    const store = useStudioStore.getState()
    if (e.evt.shiftKey) store.addSelection(poly)
    else if (e.evt.altKey) store.subtractSelection(poly)
    else store.replaceSelection(poly)
    this.start = undefined
  }
}
