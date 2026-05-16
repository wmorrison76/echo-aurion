import { Tool, ToolContext } from './Tool'
import type Konva from 'konva'
import { useStudioStore } from '../store/useStudioStore'
import { getSurfaceForLayer } from '../raster/RasterSurface'
import type { RasterLayer } from '../types'
import { applySelectionClip, restoreClip } from '../selection/clip'

export class EraserTool extends Tool {
  private last?: { x:number; y:number }
  private marked = false
  constructor(){ super('eraser') }

  onPointerDown(e: Konva.KonvaEventObject<MouseEvent>, _ctx: ToolContext){
    const store = useStudioStore.getState()
    store.historyMark('Erase Stroke')
    this.marked = true
    const id = store.activeLayerId
    if(!id) return
    const layer = store.project.layers.find(l=>l.id===id)
    if(!layer || layer.type!=='raster' || layer.locked) return
    const pos = e.target.getStage()?.getPointerPosition(); if(!pos) return
    const r = layer as RasterLayer
    const { brushSize, selection } = store
    const surf = getSurfaceForLayer(r, store.project)
    const ctx = surf.getContext('2d')!
    const x = pos.x - r.transform.x, y = pos.y - r.transform.y
    applySelectionClip(ctx, selection, r.transform.x, r.transform.y)
    ctx.save()
    ctx.globalCompositeOperation = 'destination-out'
    ctx.lineCap = 'round'; ctx.lineJoin = 'round'
    ctx.lineWidth = brushSize
    ctx.beginPath(); ctx.moveTo(x,y); ctx.lineTo(x+0.01,y+0.01); ctx.stroke()
    ctx.restore()
    restoreClip(ctx)
    this.last = { x, y }
  }

  onPointerMove(e: Konva.KonvaEventObject<MouseEvent>, _ctx: ToolContext){
    if(!this.last) return
    const store = useStudioStore.getState()
    const id = store.activeLayerId
    if(!id) return
    const layer = store.project.layers.find(l=>l.id===id)
    if(!layer || layer.type!=='raster' || layer.locked) return
    const pos = e.target.getStage()?.getPointerPosition(); if(!pos) return
    const r = layer as RasterLayer
    const { brushSize, selection } = store
    const surf = getSurfaceForLayer(r, store.project)
    const ctx = surf.getContext('2d')!
    const x = pos.x - r.transform.x, y = pos.y - r.transform.y
    applySelectionClip(ctx, selection, r.transform.x, r.transform.y)
    ctx.save()
    ctx.globalCompositeOperation = 'destination-out'
    ctx.lineCap = 'round'; ctx.lineJoin = 'round'
    ctx.lineWidth = brushSize
    ctx.beginPath(); ctx.moveTo(this.last.x, this.last.y); ctx.lineTo(x,y); ctx.stroke()
    ctx.restore()
    restoreClip(ctx)
    this.last = { x, y }
  }

  onPointerUp(){ this.last = undefined; this.marked = false }
}
