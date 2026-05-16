import React from 'react'
import { useStudioStore } from '../../engine/store/useStudioStore'

export function MaskPanel(){
  const s = useStudioStore()
  const id = s.activeLayerId
  const L = s.project.layers.find(l=>l.id===id && l.type==='raster') as any

  if (!L){
    return <div className="p-2 text-xs opacity-60">Select a raster layer to edit mask.</div>
  }

  return (
    <div className="p-2 text-xs space-y-2">
      <div className="mb-1 font-semibold opacity-80">Layer Mask</div>
      <div className="flex items-center gap-2">
        <label>Enabled</label>
        <input type="checkbox" checked={!!L.maskEnabled} onChange={(e)=>s.setLayerMaskEnabled(id!, e.target.checked)} />
        <label className="ml-3">Invert</label>
        <input type="checkbox" checked={!!L.maskInverted} onChange={()=>s.invertLayerMask(id!)} />
        <button className="ml-auto px-2 py-1 bg-gray-800 rounded hover:bg-gray-700" onClick={()=>s.fillLayerMask(id!, true)}>Reveal All</button>
        <button className="px-2 py-1 bg-gray-800 rounded hover:bg-gray-700" onClick={()=>s.fillLayerMask(id!, false)}>Hide All</button>
      </div>
      <div className="grid grid-cols-3 gap-2 items-center">
        <label>Brush Size</label>
        <input type="range" min={1} max={256} step={1} value={s.maskBrushSize} onChange={(e)=>s.setMaskBrushSize(Number(e.target.value))} />
        <span className="text-right">{s.maskBrushSize}px</span>
      </div>
      <div className="flex items-center gap-2">
        <button className="px-2 py-1 bg-gray-800 rounded hover:bg-gray-700" onClick={()=>s.applySelectionToMask(id!, true)}>Reveal Selection</button>
        <button className="px-2 py-1 bg-gray-800 rounded hover:bg-gray-700" onClick={()=>s.applySelectionToMask(id!, false)}>Hide Selection</button>
      </div>
      <div className="opacity-60 text-[10px] mt-1">
        Tip: Use the <b>Mask Brush (K)</b>. Paint to <b>Reveal</b>; hold <b>Alt</b> or right‑click to <b>Hide</b>.
      </div>
    </div>
  )
}

export default MaskPanel;
