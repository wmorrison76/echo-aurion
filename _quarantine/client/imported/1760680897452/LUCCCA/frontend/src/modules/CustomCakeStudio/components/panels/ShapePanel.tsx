import React from 'react'
import { useShapeStore } from '../../engine/store/useShapeStore'
import { updateActiveShapeProps } from '../../engine/store/shapeOps'
import { useStudioStore } from '../../engine/store/useStudioStore'

export function ShapePanel(){
  const s = useShapeStore()
  const active = useStudioStore(s2=>s2.activeLayerId)

  return (
    <div className="p-2 text-xs space-y-2">
      <div className="mb-1 font-semibold opacity-80">Shapes</div>
      <div className="grid grid-cols-3 gap-2 items-center">
        <label>Tool</label>
        <select className="bg-gray-800 rounded px-2 py-1" value={s.current} onChange={(e)=>s.set({ current: e.target.value as any })}>
          <option value="rect">Rectangle</option>
          <option value="ellipse">Ellipse</option>
          <option value="polygon">Polygon</option>
        </select>

        <label>Stroke</label>
        <input type="color" className="bg-gray-800 rounded px-1 py-1" value={s.stroke} onChange={(e)=>s.set({ stroke: e.target.value })} />
        <label>Fill</label>
        <input type="color" className="bg-gray-800 rounded px-1 py-1" value={s.fill} onChange={(e)=>s.set({ fill: e.target.value })} />
        <label>Width</label>
        <input className="bg-gray-800 rounded px-2 py-1" value={s.strokeWidth} onChange={(e)=>s.set({ strokeWidth: Number(e.target.value)||1 })} />
      </div>

      {active && (
        <div className="grid grid-cols-3 gap-2 items-center">
          <label>Active Stroke</label>
          <input type="color" className="bg-gray-800 rounded px-1 py-1" onChange={(e)=>updateActiveShapeProps({ stroke: e.target.value })} />
          <label>Active Fill</label>
          <input type="color" className="bg-gray-800 rounded px-1 py-1" onChange={(e)=>updateActiveShapeProps({ fill: e.target.value })} />
          <label>Active Width</label>
          <input className="bg-gray-800 rounded px-2 py-1" onChange={(e)=>updateActiveShapeProps({ strokeWidth: Number(e.target.value)||1 })} />
        </div>
      )}

      <div className="opacity-60 text-[10px]">
        Tip: Choose a shape, then click‑drag on canvas to draw. For Pen, switch tool and click to add points; double‑click to finish.
      </div>
    </div>
  )
}

export default ShapePanel;
