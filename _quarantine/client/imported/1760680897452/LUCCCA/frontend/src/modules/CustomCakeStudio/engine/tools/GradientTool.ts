import { Tool } from './Tool'
import type Konva from 'konva'
import { useStudioStore } from '../store/useStudioStore'
import { getSurfaceForLayer } from '../raster/RasterSurface'
import type { RasterLayer } from '../types'

export class GradientTool extends Tool {
  private start: {x:number;y:number} | null = null
  constructor(){ super('gradient') }

  onPointerDown(e: Konva.KonvaEventObject<MouseEvent>){
    const pos = e.target.getStage()?.getPointerPosition(); if(!pos) return
    this.start = { x: pos.x, y: pos.y }
  }

  onPointerUp(e: Konva.KonvaEventObject<MouseEvent>){
    if(!this.start) return
    const pos = e.target.getStage()?.getPointerPosition(); if(!pos) return
    const store = useStudioStore.getState()
    const id = store.activeLayerId; if(!id) return
    const layer = store.project.layers.find(l=>l.id===id)
    if(!layer || layer.type!=='raster' || layer.locked) return
    const R = layer as RasterLayer
    const surf = getSurfaceForLayer(R, store.project)
    const ctx = surf.getContext('2d')!
    // Create gradient across the whole canvas in the user direction
    const g = ctx.createLinearGradient(this.start.x - R.transform.x, this.start.y - R.transform.y, pos.x - R.transform.x, pos.y - R.transform.y)
    g.addColorStop(0, store.primaryColor)
    g.addColorStop(1, '#00000000') // fade to transparent
    ctx.save()
    ctx.globalCompositeOperation = 'source-over'
    ctx.fillStyle = g
    ctx.fillRect(0, 0, surf.width, surf.height)
    ctx.restore()
    this.start = null
  }
}
