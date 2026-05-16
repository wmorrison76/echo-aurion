import { Tool } from './Tool'
import type Konva from 'konva'
import { useStudioStore } from '../store/useStudioStore'
import { getSurfaceForLayer } from '../raster/RasterSurface'
import type { RasterLayer } from '../types'
import { maskToPolygon } from '../selection/MaskUtils'

let _worker: Worker | null = null
function getWorker(){
  if (_worker) return _worker
  _worker = new Worker(new URL('../workers/floodFillWorker.ts', import.meta.url), { type: 'module' })
  return _worker
}

export class MagicWandTool extends Tool {
  constructor(){ super('wand') }
  onPointerDown(e: Konva.KonvaEventObject<MouseEvent>){
    const store = useStudioStore.getState()
    const id = store.activeLayerId; if(!id) return
    const layer = store.project.layers.find(l=>l.id===id)
    if(!layer || layer.type!=='raster' || layer.locked) return
    const R = layer as RasterLayer
    const pos = e.target.getStage()?.getPointerPosition(); if(!pos) return
    const surf = getSurfaceForLayer(R, store.project)
    const ctx = surf.getContext('2d')!
    const img = ctx.getImageData(0,0,surf.width,surf.height)
    const x = Math.floor(pos.x - R.transform.x), y = Math.floor(pos.y - R.transform.y)
    const tol = store.selectionTolerance

    const worker = getWorker()
    worker.onmessage = (evt: MessageEvent) => {
      const { type, mask, width, height } = evt.data as any
      if (type !== 'mask') return
      const arr = new Uint8Array(mask)
      const poly = maskToPolygon(arr, width, height, 2)
      if (poly.length===0) return
      if (e.evt.shiftKey) store.addSelection(poly)
      else if (e.evt.altKey) store.subtractSelection(poly)
      else store.replaceSelection(poly)
    }
    worker.postMessage({ type: 'flood', x, y, tol, width: surf.width, height: surf.height, data: img.data.buffer }, [img.data.buffer])
  }
}
