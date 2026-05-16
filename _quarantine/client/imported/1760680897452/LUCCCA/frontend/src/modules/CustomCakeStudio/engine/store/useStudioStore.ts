import { create } from 'zustand'
import { immer } from 'zustand/middleware/immer'
import { nanoid } from 'nanoid'
import type { Project, RasterLayer, TextLayer, Layer, BlendMode, LayerAdjust } from '../types'
import { History } from '../commands/History'
import type { Unit } from '../print/units'
import { captureCheckpoint, type Checkpoint } from '../checkpoints/Checkpoints'
import { degNorm, clamp } from '../transform'

export type ToolId =
  | 'move'|'brush'|'eraser'|'marquee'|'lasso'|'wand'|'quick'|'eyedropper'|'text'|'shape'|'hand'|'zoom'|'crop'|'clone'|'bucket'|'gradient'|'spothealing'|'maskbrush'

export interface PrintSettings {
  units: Unit
  dpi: number
  bleed: number
  margin: number
  showMarks: boolean
  exportScale: number
  softProofOn?: boolean
  presetId?: string
}

interface StudioState {
  project: Project
  activeLayerId: string | null
  activeTool: ToolId
  historyVersion: number
  historyCanUndo: boolean
  historyCanRedo: boolean
  primaryColor: string
  brushSize: number
  maskBrushSize: number

  selection: Array<Array<{x:number;y:number}>>

  print: PrintSettings

  // checkpoints
  checkpoints: Checkpoint[]
  addCheckpoint: (label?: string) => void
  renameCheckpoint: (id: string, label: string) => void
  deleteCheckpoint: (id: string) => void
  restoreCheckpoint: (id: string) => void

  // history
  historyMark: (label?: string) => void
  undo: () => void
  redo: () => void

  // tool & project
  setTool: (t: ToolId) => void
  newProject: (w:number,h:number,dpi:number) => void
  setCanvasSizePx: (w:number,h:number) => void

  // layer CRUD (subset to keep bundle focused)
  addRasterLayer: (name?:string, src?:string) => void
  addTextLayer: (text:string, x:number, y:number) => void
  setActiveLayer: (id:string) => void
  updateActiveLayerTransform: (t: Partial<{x:number;y:number;rotation:number;scale:number}>) => void
  setLayerOpacity: (id:string, alpha:number) => void
  setLayerBlendMode: (id:string, mode: BlendMode) => void
}

const emptyProject = (): Project => ({
  id: nanoid(),
  canvas: { width: 1024, height: 1024, dpi: 300, background: 'transparent' },
  layers: [],
  assets: {}
})

const hist = new History(100)

export const useStudioStore = create<StudioState>()(immer((set, get) => ({
  project: emptyProject(),
  activeLayerId: null,
  activeTool: 'move',
  historyVersion: 0,
  historyCanUndo: false,
  historyCanRedo: false,
  primaryColor: '#2b94ff',
  brushSize: 12,
  maskBrushSize: 48,

  selection: [],

  print: { units: 'px', dpi: 300, bleed: 0, margin: 0, showMarks: true, exportScale: 1 },

  checkpoints: [],

  historyMark: (_label) => {
    const json = JSON.stringify(get().project)
    hist.mark(json)
    set(s => { s.historyVersion++; s.historyCanUndo = hist.canUndo(); s.historyCanRedo = hist.canRedo() })
  },
  undo: () => {
    const now = JSON.stringify(get().project)
    const prev = hist.stepUndo(now); if (!prev) return
    set(s => { s.project = JSON.parse(prev); s.historyVersion++; s.historyCanUndo = hist.canUndo(); s.historyCanRedo = hist.canRedo() })
  },
  redo: () => {
    const now = JSON.stringify(get().project)
    const next = hist.stepRedo(now); if (!next) return
    set(s => { s.project = JSON.parse(next); s.historyVersion++; s.historyCanUndo = hist.canUndo(); s.historyCanRedo = hist.canRedo() })
  },

  addCheckpoint: (label) => set(s => {
    const { state, thumb } = captureCheckpoint(s.project, label)
    s.checkpoints.unshift({ id: nanoid(), label: label || 'Checkpoint', ts: Date.now(), state, thumb })
  }),
  renameCheckpoint: (id, label) => set(s => { const c = s.checkpoints.find(c=>c.id===id); if(c) c.label = label }),
  deleteCheckpoint: (id) => set(s => { s.checkpoints = s.checkpoints.filter(c=>c.id!==id) }),
  restoreCheckpoint: (id) => set(s => {
    const c = s.checkpoints.find(c=>c.id===id); if(!c) return
    try { s.project = JSON.parse(c.state) } catch {}
  }),

  setTool: (t) => set(s => { s.activeTool = t }),

  newProject: (w,h,dpi) => set(s => { s.project = { ...emptyProject(), canvas: { width:w, height:h, dpi, background:'transparent' } } }),

  setCanvasSizePx: (w,h) => set(s => { s.project.canvas.width = Math.max(1, Math.floor(w)); s.project.canvas.height = Math.max(1, Math.floor(h)) }),

  addRasterLayer: (name='Raster Layer', src) => set(s => {
    const id = nanoid()
    s.project.layers.unshift({
      id, name, type:'raster', visible:true, locked:false, opacity:1, blendMode:'normal',
      transform:{ x:0, y:0, scale:1, rotation:0 }, src
    } as RasterLayer)
    s.activeLayerId = id
  }),

  addTextLayer: (text, x, y) => set(s => {
    const id = nanoid()
    s.project.layers.unshift({
      id, name:'Text', type:'text', visible:true, locked:false, opacity:1, blendMode:'normal',
      transform:{ x, y, scale:1, rotation:0 }, text, font:'Inter, system-ui, sans-serif', size:24, weight:600, align:'left'
    } as TextLayer)
    s.activeLayerId = id
  }),

  setActiveLayer: (id) => set(s => { s.activeLayerId = id }),

  updateActiveLayerTransform: (t) => set(s => {
    const id = s.activeLayerId; if(!id) return
    const L = s.project.layers.find(l => l.id === id); if(!L || L.locked) return
    if (typeof t.x === 'number') L.transform.x = t.x
    if (typeof t.y === 'number') L.transform.y = t.y
    if (typeof t.rotation === 'number') L.transform.rotation = degNorm(t.rotation)
    if (typeof t.scale === 'number') L.transform.scale = clamp(t.scale, -10, 10)
  }),

  setLayerOpacity: (id, a) => set(s => { const L = s.project.layers.find(l=>l.id===id); if(L) L.opacity = Math.max(0, Math.min(1, a)) }),
  setLayerBlendMode: (id, m) => set(s => { const L:any = s.project.layers.find(l=>l.id===id); if(L){ L.blendMode = m } }),
})))

export default useStudioStore;
