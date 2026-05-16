import React from 'react'
import { useStudioStore } from '../../engine/store/useStudioStore'

export function PropertiesPanel(){
  const project = useStudioStore(s=>s.project)
  const color = useStudioStore(s=>s.primaryColor)
  const setColor = useStudioStore(s=>s.setPrimaryColor)
  const size = useStudioStore(s=>s.brushSize)
  const setSize = useStudioStore(s=>s.setBrushSize)
  const feather = useStudioStore(s=>s.selectionFeather)
  const setFeather = useStudioStore(s=>s.setSelectionFeather)
  const tol = useStudioStore(s=>s.selectionTolerance)
  const setTol = useStudioStore(s=>s.setSelectionTolerance)
  const clear = useStudioStore(s=>s.clearSelection)

  const active = useStudioStore(s=>s.project.layers.find(l=>l.id===s.activeLayerId))
  const update = useStudioStore(s=>s.updateActiveLayerTransform)
  const rotate = useStudioStore(s=>s.rotateActiveLayer)
  const flipX = useStudioStore(s=>s.flipActiveLayerX)
  const setOpacity = useStudioStore(s=>s.setLayerOpacity)
  const setBlend = useStudioStore(s=>s.setLayerBlendMode)

  return (
    <div className="p-2 text-xs space-y-3">
      <div>Canvas: {project.canvas.width}×{project.canvas.height} @ {project.canvas.dpi} DPI</div>
      <div>Background: {project.canvas.background}</div>

      {active && (
        <div className="border-t border-gray-800 pt-2">
          <div className="mb-1 font-semibold opacity-80">Layer</div>
          <div className="grid grid-cols-3 gap-2 items-center">
            <label>Opacity</label>
            <input type="range" min={0} max={100} value={Math.round((active.opacity||1)*100)}
              onChange={(e)=>setOpacity(active.id, Number(e.target.value)/100)} className="col-span-2"/>
            <label>Blend</label>
            <select className="bg-gray-800 rounded px-2 py-1 col-span-2"
              value={active.blendMode} onChange={(e)=>setBlend(active.id, e.target.value as any)}>
              <option>normal</option><option>multiply</option><option>screen</option><option>overlay</option>
              <option>darken</option><option>lighten</option><option>difference</option><option>exclusion</option>
              <option>soft-light</option><option>hard-light</option>
            </select>
          </div>
        </div>
      )}

      <div className="border-t border-gray-800 pt-2">
        <div className="mb-1 font-semibold opacity-80">Brush</div>
        <div className="flex items-center gap-2">
          <label className="w-16">Color</label>
          <input type="color" value={color} onChange={(e)=>setColor(e.target.value)} />
          <span className="ml-2 monospace">{color}</span>
        </div>
        <div className="flex items-center gap-2 mt-2">
          <label className="w-16">Size</label>
          <input type="range" min={1} max={128} value={size} onChange={(e)=>setSize(Number(e.target.value))} className="w-full"/>
          <span className="w-8 text-right">{size}</span>
        </div>
      </div>

      <div className="border-t border-gray-800 pt-2">
        <div className="mb-1 font-semibold opacity-80">Selection</div>
        <div className="flex items-center gap-2">
          <label className="w-16">Feather</label>
          <input type="range" min={0} max={50} value={feather} onChange={(e)=>setFeather(Number(e.target.value))} className="w-full"/>
          <span className="w-8 text-right">{feather}</span>
        </div>
        <div className="flex items-center gap-2 mt-2">
          <label className="w-16">Tolerance</label>
          <input type="range" min={0} max={255} value={tol} onChange={(e)=>setTol(Number(e.target.value))} className="w-full"/>
          <span className="w-10 text-right">{tol}</span>
        </div>
        <button className="mt-2 px-2 py-1 bg-gray-800 rounded hover:bg-gray-700" onClick={clear}>Clear Selection</button>
      </div>

      {active && (
        <div className="border-t border-gray-800 pt-2">
          <div className="mb-1 font-semibold opacity-80">Transform</div>
          <div className="grid grid-cols-3 gap-2 items-center">
            <label>X</label>
            <input type="number" className="bg-gray-800 rounded px-2 py-1"
              value={Math.round(active.transform.x)} onChange={(e)=>update({x: Number(e.target.value)})} />
            <span>px</span>

            <label>Y</label>
            <input type="number" className="bg-gray-800 rounded px-2 py-1"
              value={Math.round(active.transform.y)} onChange={(e)=>update({y: Number(e.target.value)})} />
            <span>px</span>

            <label>Rotation</label>
            <input type="number" className="bg-gray-800 rounded px-2 py-1"
              value={Math.round(active.transform.rotation || 0)} onChange={(e)=>update({rotation: Number(e.target.value)})} />
            <span>deg</span>

            <label>Scale</label>
            <input type="number" className="bg-gray-800 rounded px-2 py-1"
              step={0.01} value={active.transform.scale}
              onChange={(e)=>update({scale: Number(e.target.value)})} />
            <span>×</span>
          </div>
          <div className="mt-2 flex items-center gap-2">
            <button className="px-2 py-1 bg-gray-800 rounded hover:bg-gray-700" onClick={()=>rotate(-90)}>Rotate -90°</button>
            <button className="px-2 py-1 bg-gray-800 rounded hover:bg-gray-700" onClick={()=>rotate(90)}>Rotate +90°</button>
            <button className="px-2 py-1 bg-gray-800 rounded hover:bg-gray-700" onClick={flipX}>Flip</button>
          </div>
        </div>
      )}
    </div>
  )
}

export default PropertiesPanel;
