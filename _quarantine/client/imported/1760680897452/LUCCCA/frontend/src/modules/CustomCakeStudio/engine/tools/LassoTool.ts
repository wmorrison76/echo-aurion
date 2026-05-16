import { Tool } from './Tool'
import type Konva from 'konva'
import { useStudioStore } from '../store/useStudioStore'
import type { Polygon } from '../selection/SelectionManager'

export class LassoTool extends Tool {
  private path: Polygon | null = null
  constructor(){ super('lasso') }

  onPointerDown(e: Konva.KonvaEventObject<MouseEvent>){
    const pos = e.target.getStage()?.getPointerPosition(); if(!pos) return
    this.path = [{x:pos.x, y:pos.y}]
  }
  onPointerMove(e: Konva.KonvaEventObject<MouseEvent>){
    if(!this.path) return
    const pos = e.target.getStage()?.getPointerPosition(); if(!pos) return
    this.path.push({x:pos.x, y:pos.y})
  }
  onPointerUp(e: Konva.KonvaEventObject<MouseEvent>){
    if(!this.path) return
    const store = useStudioStore.getState()
    if (e.evt.shiftKey) store.addSelection(this.path)
    else if (e.evt.altKey) store.subtractSelection(this.path)
    else store.replaceSelection(this.path)
    this.path = null
  }
}
