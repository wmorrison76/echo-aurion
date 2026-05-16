import React from 'react'
import { useStudioStore } from '../../engine/store/useStudioStore'

export function TransformPanel(){
  const s = useStudioStore()
  const id = s.activeLayerId
  const L = s.project.layers.find(l=>l.id===id)
  if (!L){
    return <div className="p-2 text-xs opacity-60">Select a layer to transform.</div>
  }
  const t = L.transform
  const upd = (patch: Partial<typeof t>) => s.updateActiveLayerTransform(patch)

  return (
    <div className="p-2 text-xs space-y-2">
      <div className="mb-1 font-semibold opacity-80">Transform</div>

      <div className="grid grid-cols-3 gap-2 items-center">
        <label>X</label>
        <input className="bg-gray-800 rounded px-2 py-1" value={Math.round(t.x)} onChange={(e)=>upd({ x: Number(e.target.value)||0 })} />
        <span className="opacity-60">px</span>

        <label>Y</label>
        <input className="bg-gray-800 rounded px-2 py-1" value={Math.round(t.y)} onChange={(e)=>upd({ y: Number(e.target.value)||0 })} />
        <span className="opacity-60">px</span>

        <label>Scale</label>
        <input className="bg-gray-800 rounded px-2 py-1" value={Number((t.scale||1).toFixed(3))} onChange={(e)=>upd({ scale: Number(e.target.value)||1 })} />
        <span className="opacity-60">×</span>

        <label>Rotation</label>
        <input className="bg-gray-800 rounded px-2 py-1" value={Math.round(t.rotation||0)} onChange={(e)=>upd({ rotation: Number(e.target.value)||0 })} />
        <span className="opacity-60">°</span>
      </div>

      <div className="grid grid-cols-2 gap-2 items-center">
        <label className="flex items-center gap-2">
          <input type="checkbox" checked={s.transformSnapAngle} onChange={()=>s.toggleSnapAngle()} />
          Angle Snap (15°)
        </label>
        <span />
        <label className="flex items-center gap-2">
          <input type="checkbox" checked={s.transformKeepAspectByDefault} onChange={(e)=>s.setTransformKeepAspect(e.target.checked)} />
          Keep Aspect (Shift)
        </label>
        <label className="flex items-center gap-2">
          <input type="checkbox" checked={s.transformCenteredByDefault} onChange={(e)=>s.setTransformCentered(e.target.checked)} />
          Centered Scale (Alt)
        </label>
      </div>
      <div className="opacity-60 text-[10px] mt-1">Tip: , and . rotate ±1° (Cmd/Ctrl for ±15°).</div>
    </div>
  )
}

export default TransformPanel;
