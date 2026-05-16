import { Tool, ToolContext } from './Tool'
import type Konva from 'konva'
import { useStudioStore } from '../store/useStudioStore'
import { getSurfaceForLayer } from '../raster/RasterSurface'
import type { RasterLayer } from '../types'
import { applySelectionClip, restoreClip } from '../selection/clip'

export class BrushTool extends Tool {
  private last?: { x:number; y:number }
  private marked = false
  constructor(){ super('brush') }

  onPointerDown(e: Konva.KonvaEventObject<MouseEvent>, _ctx: ToolContext){
    const store = useStudioStore.getState()
    store.historyMark('Brush Stroke')
    this.marked = true
    const id = store.activeLayerId
    if(!id) return
    const layer = store.project.layers.find(l=>l.id===id)
    if(!layer || layer.type!=='raster' || layer.locked) return
    const pos = e.target.getStage()?.getPointerPosition(); if(!pos) return
    const r = layer as RasterLayer
    const { brushSize, primaryColor, selection } = store
    const [rC,gC,bC] = hexToRgb(primaryColor)
    const surf = getSurfaceForLayer(r, store.project)
    const ctx = surf.getContext('2d')!
    applySelectionClip(ctx, selection, r.transform.x, r.transform.y)
    ctx.save()
    ctx.globalCompositeOperation = 'source-over'
    ctx.lineCap = 'round'; ctx.lineJoin = 'round'
    ctx.strokeStyle = `rgba(${rC},${gC},${bC},1)`
    ctx.lineWidth = brushSize
    const x = pos.x - r.transform.x, y = pos.y - r.transform.y
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
    const { brushSize, primaryColor, selection } = store
    const [rC,gC,bC] = hexToRgb(primaryColor)
    const surf = getSurfaceForLayer(r, store.project)
    const ctx = surf.getContext('2d')!
    const x = pos.x - r.transform.x, y = pos.y - r.transform.y
    applySelectionClip(ctx, selection, r.transform.x, r.transform.y)
    ctx.save()
    ctx.globalCompositeOperation = 'source-over'
    ctx.lineCap = 'round'; ctx.lineJoin = 'round'
    ctx.strokeStyle = `rgba(${rC},${gC},${bC},1)`
    ctx.lineWidth = brushSize
    ctx.beginPath(); ctx.moveTo(this.last.x, this.last.y); ctx.lineTo(x,y); ctx.stroke()
    ctx.restore()
    restoreClip(ctx)
    this.last = { x, y }
  }

  onPointerUp(){ this.last = undefined; this.marked = false }
}

function hexToRgb(hex: string): [number,number,number] {
  const h = hex.replace('#','')
  const bigint = parseInt(h.length===3 ? h.split('').map(c=>c+c).join('') : h, 16)
  return [(bigint>>16)&255, (bigint>>8)&255, bigint&255]
}
