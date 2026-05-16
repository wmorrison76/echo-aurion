import { create } from 'zustand'
import type { GridSettings } from '../grid/types'
import { GRID_PRESETS } from '../grid/presets'

const defaults: GridSettings = {
  enabled: false,
  snapEnabled: true,
  showCenters: false,
  showCutGuides: true,
  units: 'in',
  shape: 'circle',
  itemWidth: 2.0,
  itemHeight: 2.0,
  spacingX: 0.25,
  spacingY: 0.25,
  marginX: 0.5,
  marginY: 0.5,
  rows: undefined,
  cols: undefined,
  presetId: 'cupcake-2in-letter'
}

interface GridState {
  grid: GridSettings
  setGrid: (g: Partial<GridSettings>) => void
  applyPreset: (id: string) => void
  toggle: (on?: boolean) => void
  toggleSnap: (on?: boolean) => void
}

export const useGridStore = create<GridState>((set, get)=> ({
  grid: defaults,
  setGrid: (g) => set(s => ({ grid: { ...s.grid, ...g } })),
  applyPreset: (id) => set(s => {
    const p = GRID_PRESETS.find(p=>p.id===id)
    if (!p) return s
    return { grid: { ...s.grid, ...p.settings, presetId: id, enabled: true } }
  }),
  toggle: (on) => set(s => ({ grid: { ...s.grid, enabled: typeof on==='boolean' ? on : !s.grid.enabled } })),
  toggleSnap: (on) => set(s => ({ grid: { ...s.grid, snapEnabled: typeof on==='boolean' ? on : !s.grid.snapEnabled } })),
}))

export default useGridStore;
