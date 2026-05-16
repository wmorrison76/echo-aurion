import { create } from 'zustand'

type Pt = { x:number; y:number }

export interface RetouchState {
  brushSize: number
  brushHardness: number
  cloneSource: Pt | null
  cloneAligned: boolean
  sampleAllLayers: boolean

  set: (patch: Partial<RetouchState>) => void
  setCloneSource: (x:number, y:number) => void
}

export const useRetouchStore = create<RetouchState>((set)=> ({
  brushSize: 32,
  brushHardness: 0.8,
  cloneSource: null,
  cloneAligned: true,
  sampleAllLayers: false,

  set: (patch) => set(s => ({ ...s, ...patch })),
  setCloneSource: (x, y) => set({ cloneSource: { x, y } }),
}))

export default useRetouchStore;
