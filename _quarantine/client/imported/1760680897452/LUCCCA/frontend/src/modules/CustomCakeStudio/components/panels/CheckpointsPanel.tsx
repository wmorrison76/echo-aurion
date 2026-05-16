import React, { useState } from 'react'
import { useStudioStore } from '../../engine/store/useStudioStore'

function fmt(ts:number){ const d=new Date(ts); return d.toLocaleString() }

export function CheckpointsPanel(){
  const cps = useStudioStore(s=>s.checkpoints)
  const add = useStudioStore(s=>s.addCheckpoint)
  const ren = useStudioStore(s=>s.renameCheckpoint)
  const del = useStudioStore(s=>s.deleteCheckpoint)
  const restore = useStudioStore(s=>s.restoreCheckpoint)

  const [label, setLabel] = useState('Checkpoint')

  return (
    <div className="p-2 text-xs space-y-2">
      <div className="flex items-center justify-between">
        <div className="font-semibold opacity-80">Checkpoints</div>
        <div className="flex items-center gap-2">
          <input className="bg-gray-800 rounded px-2 py-1 w-36" value={label} onChange={(e)=>setLabel(e.target.value)} />
          <button className="px-2 py-1 bg-emerald-800 rounded hover:bg-emerald-700" onClick={()=>add(label.trim()||'Checkpoint')}>Create</button>
        </div>
      </div>

      <div className="space-y-2">
        {cps.map(c => (
          <div key={c.id} className="border border-gray-800 rounded overflow-hidden">
            <div className="flex items-center">
              <img src={c.thumb} alt="" className="w-24 h-24 object-cover bg-black/40 border-r border-gray-800" />
              <div className="flex-1 p-2">
                <input className="bg-gray-800 rounded px-2 py-1 w-full mb-1" value={c.label} onChange={(e)=>ren(c.id, e.target.value)} />
                <div className="opacity-60 text-[10px]">{fmt(c.ts)}</div>
                <div className="mt-2 flex items-center gap-2">
                  <button className="px-2 py-1 bg-gray-800 rounded hover:bg-gray-700" onClick={()=>restore(c.id)}>Restore</button>
                  <button className="px-2 py-1 bg-red-900 rounded hover:bg-red-800" onClick={()=>del(c.id)}>Delete</button>
                </div>
              </div>
            </div>
          </div>
        ))}
        {cps.length===0 && <div className="opacity-60">No checkpoints yet. Create one before a risky edit.</div>}
      </div>
    </div>
  )
}

export default CheckpointsPanel;
