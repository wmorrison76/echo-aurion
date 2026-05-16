import { Tool } from './Tool'
import type Konva from 'konva'
import { useStudioStore } from '../store/useStudioStore'
import { getSurfaceForLayer } from '../raster/RasterSurface'
import { floodFill } from '../raster/floodFill'
import type { RasterLayer } from '../types'

function hexToRgba(hex: string, a=255): [number,number,number,number] {
  const h = hex.replace('#','')
  const full = h.length===3 ? h.split('').map(c=>c+c).join('') : h
  const n = parseInt(full, 16)
  return [(n>>16)&255, (n>>8)&255, n&255, a]
}

export class PaintBucketTool extends Tool {
  constructor(){ super('bucket') }
  onPointerDown(e: Konva.KonvaEventObject<MouseEvent>){
    const store = useStudioStore.getState()
    store.historyMark('Paint Bucket')
    const pos = e.target.getStage()?.getPointerPosition(); if(!pos) return
    const id = store.activeLayerId; if(!id) return
    const layer = store.project.layers.find(l=>l.id===id)
    if(!layer || layer.type!=='raster' || layer.locked) return
    const R = layer as RasterLayer
    const surf = getSurfaceForLayer(R, store.project)
    const x = Math.floor(pos.x - R.transform.x), y = Math.floor(pos.y - R.transform.y)
    floodFill(surf, x, y, hexToRgba(store.primaryColor, 255), store.selectionTolerance)
  }
}
