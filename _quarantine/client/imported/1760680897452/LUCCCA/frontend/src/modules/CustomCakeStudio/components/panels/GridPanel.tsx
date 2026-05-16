import React from 'react'
import { useGridStore } from '../../engine/store/useGridStore'
import { GRID_PRESETS } from '../../engine/grid/presets'

export function GridPanel(){
  const g = useGridStore(s=>s.grid)
  const set = useGridStore(s=>s.setGrid)
  const apply = useGridStore(s=>s.applyPreset)
  const toggle = useGridStore(s=>s.toggle)
  const toggleSnap = useGridStore(s=>s.toggleSnap)

  return (
    <div className="p-2 text-xs space-y-2">
      <div className="mb-1 font-semibold opacity-80">Topper Grids</div>
      <div className="flex items-center gap-2 flex-wrap">
        <label className="flex items-center gap-2">
          <input type="checkbox" checked={g.enabled} onChange={()=>toggle()} />
          Show Grid
        </label>
        <label className="flex items-center gap-2">
          <input type="checkbox" checked={g.snapEnabled} onChange={()=>toggleSnap()} />
          Snap to Grid
        </label>
        <label className="flex items-center gap-2">
          <input type="checkbox" checked={g.showCutGuides} onChange={(e)=>set({ showCutGuides: e.currentTarget.checked })} />
          Cut Guides
        </label>
        <label className="flex items-center gap-2">
          <input type="checkbox" checked={g.showCenters} onChange={(e)=>set({ showCenters: e.currentTarget.checked })} />
          Center Marks
        </label>
      </div>

      <div className="grid grid-cols-3 gap-2 items-center">
        <label>Preset</label>
        <select className="bg-gray-800 rounded px-2 py-1 col-span-2" value={g.presetId||''} onChange={(e)=>apply(e.target.value)}>
          {GRID_PRESETS.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>

        <label>Units</label>
        <select className="bg-gray-800 rounded px-2 py-1" value={g.units} onChange={(e)=>set({ units: e.target.value as any })}>
          <option value="in">in</option><option value="mm">mm</option><option value="cm">cm</option><option value="px">px</option>
        </select>
        <label>Shape</label>
        <select className="bg-gray-800 rounded px-2 py-1" value={g.shape} onChange={(e)=>set({ shape: e.target.value as any })}>
          <option value="circle">Circle</option><option value="rect">Rectangle</option>
        </select>

        <label>Item W</label>
        <input className="bg-gray-800 rounded px-2 py-1" value={g.itemWidth} onChange={(e)=>set({ itemWidth: Number(e.target.value)||0 })} />
        <label>Item H</label>
        <input className="bg-gray-800 rounded px-2 py-1" value={g.itemHeight} onChange={(e)=>set({ itemHeight: Number(e.target.value)||0 })} />

        <label>Spacing X</label>
        <input className="bg-gray-800 rounded px-2 py-1" value={g.spacingX} onChange={(e)=>set({ spacingX: Number(e.target.value)||0 })} />
        <label>Spacing Y</label>
        <input className="bg-gray-800 rounded px-2 py-1" value={g.spacingY} onChange={(e)=>set({ spacingY: Number(e.target.value)||0 })} />

        <label>Margin X</label>
        <input className="bg-gray-800 rounded px-2 py-1" value={g.marginX} onChange={(e)=>set({ marginX: Number(e.target.value)||0 })} />
        <label>Margin Y</label>
        <input className="bg-gray-800 rounded px-2 py-1" value={g.marginY} onChange={(e)=>set({ marginY: Number(e.target.value)||0 })} />

        <label>Rows</label>
        <input className="bg-gray-800 rounded px-2 py-1" placeholder="auto" value={g.rows ?? ''} onChange={(e)=>set({ rows: e.target.value===''? undefined : Number(e.target.value)||1 })} />
        <label>Cols</label>
        <input className="bg-gray-800 rounded px-2 py-1" placeholder="auto" value={g.cols ?? ''} onChange={(e)=>set({ cols: e.target.value===''? undefined : Number(e.target.value)||1 })} />
      </div>
    </div>
  )
}

export default GridPanel;
