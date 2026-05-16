import React from 'react'
import { useRetouchStore } from '../../engine/store/useRetouchStore'
import { useStudioStore } from '../../engine/store/useStudioStore'

export function RetouchPanel(){
  const r = useRetouchStore()
  const setTool = useStudioStore(s=>s.setTool)

  return (
    <div className="p-2 text-xs space-y-2">
      <div className="mb-1 font-semibold opacity-80">Retouch</div>
      <div className="grid grid-cols-3 gap-2 items-center">
        <label>Brush Size</label>
        <input type="range" min={4} max={256} step={1} value={r.brushSize} onChange={(e)=>r.set({ brushSize: Number(e.target.value) })} />
        <div className="text-right">{r.brushSize}px</div>

        <label>Hardness</label>
        <input type="range" min={0} max={1} step={0.01} value={r.brushHardness} onChange={(e)=>r.set({ brushHardness: Number(e.target.value) })} />
        <div className="text-right">{Math.round(r.brushHardness*100)}%</div>

        <label>Clone Aligned</label>
        <input type="checkbox" checked={r.cloneAligned} onChange={(e)=>r.set({ cloneAligned: e.currentTarget.checked })} />
        <span className="opacity-60 col-span-1">relative movement</span>

        <label>Sample All Layers</label>
        <input type="checkbox" checked={r.sampleAllLayers} onChange={(e)=>r.set({ sampleAllLayers: e.currentTarget.checked })} />
        <span />
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        <button className="px-2 py-1 bg-gray-800 rounded hover:bg-gray-700" onClick={()=>setTool('clone' as any)}>Clone Stamp (S)</button>
        <button className="px-2 py-1 bg-gray-800 rounded hover:bg-gray-700" onClick={()=>setTool('spothealing' as any)}>Spot Heal (J)</button>
        <button className="px-2 py-1 bg-gray-800 rounded hover:bg-gray-700" onClick={()=>setTool('patch' as any)}>Patch</button>
      </div>

      <div className="opacity-60 text-[10px]">
        Clone: <b>Alt/Option‑click</b> sets source. Spot Heal: paint to auto‑blend. Patch: create a selection, then drag to choose source offset.
      </div>
    </div>
  )
}

export default RetouchPanel;
