import React, { useState } from 'react'
import { useStudioStore } from '../../engine/store/useStudioStore'
import type { Layer } from '../../engine/types'

const BLENDS = ['normal','multiply','screen','overlay','darken','lighten','difference','exclusion','soft-light','hard-light'] as const

function LayerRow({ layer, idx }: { layer: Layer; idx: number }){
  const activeId = useStudioStore(s=>s.activeLayerId)
  const setActive = useStudioStore(s=>s.setActiveLayer)
  const toggleVis = useStudioStore(s=>s.toggleLayerVisibility)
  const toggleLock = useStudioStore(s=>s.toggleLayerLock)
  const rename = useStudioStore(s=>s.renameLayer)
  const opacity = useStudioStore(s=>s.setLayerOpacity)
  const blend = useStudioStore(s=>s.setLayerBlendMode)
  const move = useStudioStore(s=>s.moveLayer)
  const dup = useStudioStore(s=>s.duplicateLayer)
  const del = useStudioStore(s=>s.deleteLayer)

  const [editing, setEditing] = useState(false)
  const [name, setName] = useState(layer.name)

  const saveName = () => { setEditing(false); rename(layer.id, name || layer.name) }

  const isActive = activeId === layer.id

  return (
    <div className={"px-2 py-1 border-b border-gray-800 " + (isActive ? "bg-gray-800/60" : "hover:bg-gray-800/30")}
      onClick={()=>setActive(layer.id)}>
      <div className="flex items-center gap-2">
        <button title={layer.visible ? 'Hide' : 'Show'} className="px-1 text-xs bg-gray-800 rounded"
          onClick={(e)=>{e.stopPropagation(); toggleVis(layer.id)}}>
          {layer.visible ? '👁' : '🚫'}
        </button>
        <button title={layer.locked ? 'Unlock' : 'Lock'} className="px-1 text-xs bg-gray-800 rounded"
          onClick={(e)=>{e.stopPropagation(); toggleLock(layer.id)}}>
          {layer.locked ? '🔒' : '🔓'}
        </button>

        {editing ? (
          <input className="flex-1 bg-gray-900 rounded px-2 py-1 text-xs" autoFocus
            value={name} onChange={(e)=>setName(e.target.value)}
            onBlur={saveName} onKeyDown={(e)=>{ if(e.key==='Enter') saveName() }}/>
        ) : (
          <div className="flex-1 text-xs truncate" onDoubleClick={()=>setEditing(true)}>{layer.name}</div>
        )}

        <div className="flex items-center gap-1">
          <button title="Move Up" className="px-1 text-xs bg-gray-800 rounded" onClick={(e)=>{e.stopPropagation(); move(layer.id,'up')}}>↑</button>
          <button title="Move Down" className="px-1 text-xs bg-gray-800 rounded" onClick={(e)=>{e.stopPropagation(); move(layer.id,'down')}}>↓</button>
          <button title="Duplicate" className="px-1 text-xs bg-gray-800 rounded" onClick={(e)=>{e.stopPropagation(); dup(layer.id)}}>⧉</button>
          <button title="Delete" className="px-1 text-xs bg-red-900/60 rounded" onClick={(e)=>{e.stopPropagation(); del(layer.id)}}>✕</button>
        </div>
      </div>

      <div className="flex items-center gap-2 mt-1">
        <label className="opacity-60 text-[10px]">Opacity</label>
        <input type="range" min={0} max={100} value={Math.round((layer.opacity||1)*100)}
          onChange={(e)=>opacity(layer.id, Number(e.target.value)/100)} className="flex-1"/>
        <span className="w-8 text-right text-[10px]">{Math.round((layer.opacity||1)*100)}%</span>
        <select className="bg-gray-800 rounded px-1 py-0.5 text-[10px]"
          value={layer.blendMode} onChange={(e)=>blend(layer.id, e.target.value as any)}>
          {BLENDS.map(b=>(<option key={b} value={b}>{b}</option>))}
        </select>
      </div>
    </div>
  )
}

export function LayersPanel(){
  const layers = useStudioStore(s=>s.project.layers)
  const addRaster = useStudioStore(s=>s.addRasterLayer)
  const addText = useStudioStore(s=>s.addTextLayer)

  return (
    <div className="p-2 text-xs">
      <div className="mb-1 font-semibold opacity-80 flex items-center justify-between">
        <span>Layers</span>
        <div className="flex items-center gap-2">
          <button className="px-2 py-1 bg-gray-800 rounded hover:bg-gray-700" onClick={()=>addRaster('Raster Layer')}>
            + Raster
          </button>
          <button className="px-2 py-1 bg-gray-800 rounded hover:bg-gray-700" onClick={()=>addText('Text', 100, 100)}>
            + Text
          </button>
        </div>
      </div>

      <div className="border border-gray-800 rounded overflow-hidden">
        {layers.length===0 && <div className="p-3 opacity-60">No layers yet.</div>}
        {layers.map((l, i)=>(<LayerRow key={l.id} layer={l as any} idx={i}/>))}
      </div>
    </div>
  )
}

export default LayersPanel;
