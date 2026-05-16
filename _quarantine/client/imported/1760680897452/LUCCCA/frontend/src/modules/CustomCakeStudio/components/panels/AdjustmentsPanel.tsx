import React from 'react'
import { useStudioStore } from '../../engine/store/useStudioStore'

function Slider({ label, value, min, max, step, onChange }:{ label:string, value:number, min:number, max:number, step:number, onChange:(n:number)=>void }){
  return (
    <div className="grid grid-cols-3 gap-2 items-center">
      <label>{label}</label>
      <input type="range" min={min} max={max} step={step} value={value} onChange={(e)=>onChange(Number(e.target.value))} />
      <span className="text-right">{value}</span>
    </div>
  )
}

export function AdjustmentsPanel(){
  const activeId = useStudioStore(s=>s.activeLayerId)
  const active = useStudioStore(s=>s.project.layers.find(l=>l.id===s.activeLayerId))
  const setAdj = useStudioStore(s=>s.setLayerAdjust)
  const reset = useStudioStore(s=>s.resetLayerAdjust)

  if (!active || active.type!=='raster'){
    return <div className="p-2 text-xs opacity-60">Select a raster layer to adjust.</div>
  }
  const adj = active.adjust || { brightness:0, contrast:0, saturation:0, hue:0, invert:false }
  return (
    <div className="p-2 text-xs space-y-2">
      <div className="mb-1 font-semibold opacity-80">Adjustments</div>
      <Slider label="Brightness" value={Number((adj.brightness||0).toFixed(2))} min={-1} max={1} step={0.01} onChange={(n)=>setAdj(activeId!, { brightness:n })} />
      <Slider label="Contrast" value={Number((adj.contrast||0).toFixed(2))} min={-1} max={1} step={0.01} onChange={(n)=>setAdj(activeId!, { contrast:n })} />
      <Slider label="Saturation" value={Number((adj.saturation||0).toFixed(2))} min={-1} max={1} step={0.01} onChange={(n)=>setAdj(activeId!, { saturation:n })} />
      <div className="grid grid-cols-3 gap-2 items-center">
        <label>Hue</label>
        <input type="range" min={-180} max={180} step={1} value={Math.round(adj.hue||0)} onChange={(e)=>setAdj(activeId!, { hue: Number(e.target.value) })} />
        <span className="text-right">{Math.round(adj.hue||0)}°</span>
      </div>
      <div className="flex items-center gap-2">
        <label>Invert</label>
        <input type="checkbox" checked={!!adj.invert} onChange={(e)=>setAdj(activeId!, { invert: e.target.checked })} />
        <button className="ml-auto px-2 py-1 bg-gray-800 rounded hover:bg-gray-700" onClick={()=>reset(activeId!)}>Reset</button>
      </div>
    </div>
  )
}

export default AdjustmentsPanel;
