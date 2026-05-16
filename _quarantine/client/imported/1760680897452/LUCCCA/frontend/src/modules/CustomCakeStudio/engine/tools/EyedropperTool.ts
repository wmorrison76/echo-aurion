import { Tool, ToolContext } from './Tool'
import type Konva from 'konva'
import { useStudioStore } from '../store/useStudioStore'
import { sampleColorAt } from '../raster/RasterSurface'

export class EyedropperTool extends Tool {
  constructor(){ super('eyedropper') }
  onPointerDown(e: Konva.KonvaEventObject<MouseEvent>, _ctx: ToolContext){
    const store = useStudioStore.getState()
    const pos = e.target.getStage()?.getPointerPosition(); if(!pos) return
    const rgba = sampleColorAt(store.project, pos.x, pos.y)
    if (!rgba) return
    const [r,g,b,a] = rgba
    const hex = '#' + [r,g,b].map(v => v.toString(16).padStart(2,'0')).join('')
    useStudioStore.getState().setPrimaryColor(hex)
  }
}
