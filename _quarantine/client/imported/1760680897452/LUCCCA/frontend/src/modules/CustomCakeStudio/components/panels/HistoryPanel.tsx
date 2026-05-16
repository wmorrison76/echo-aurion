import React, { useState } from 'react'
import { useStudioStore } from '../../engine/store/useStudioStore'
import { useHistoryMarks } from '../../engine/store/useHistoryMarks'

export function HistoryPanel(){
  const canUndo = useStudioStore(s=>s.historyCanUndo)
  const canRedo = useStudioStore(s=>s.historyCanRedo)
  const undo = useStudioStore(s=>s.undo)
  const redo = useStudioStore(s=>s.redo)
  const mark = useStudioStore(s=>s.historyMark) // existing mark action (still works for undo stack)

  const marks = useHistoryMarks(s=>s.marks)
  const addMark = useHistoryMarks(s=>s.addMark)
  const ren = useHistoryMarks(s=>s.renameMark)
  const del = useHistoryMarks(s=>s.deleteMark)
  const restore = useHistoryMarks(s=>s.restoreMark)

  const [label, setLabel] = useState('Edit point')

  return (
    <div className="p-2 text-xs space-y-3">
      <div className="flex items-center justify-between">
        <div className="font-semibold opacity-80">History</div>
        <div className="flex items-center gap-2">
          <button className={"px-2 py-1 rounded " + (canUndo ? "bg-gray-800 hover:bg-gray-700":"bg-gray-800/40")} onClick={()=>canUndo && undo()}>Undo</button>
          <button className={"px-2 py-1 rounded " + (canRedo ? "bg-gray-800 hover:bg-gray-700":"bg-gray-800/40")} onClick={()=>canRedo && redo()}>Redo</button>
          <button className="px-2 py-1 bg-gray-800 rounded hover:bg-gray-700" onClick={()=>mark('Manual mark')}>Mark</button>
        </div>
      </div>

      <div className="border-t border-gray-800 pt-2">
        <div className="flex items-center justify-between mb-2">
          <div className="font-semibold opacity-80">Named Marks</div>
          <div className="flex items-center gap-2">
            <input className="bg-gray-800 rounded px-2 py-1 w-36" value={label} onChange={(e)=>setLabel(e.target.value)} />
            <button className="px-2 py-1 bg-emerald-800 rounded hover:bg-emerald-700" onClick={()=>addMark(label.trim()||'Edit point')}>Add</button>
          </div>
        </div>

        <div className="space-y-2">
          {marks.map(m => (
            <div key={m.id} className="border border-gray-800 rounded overflow-hidden">
              <div className="flex items-center">
                {m.thumb ? <img src={m.thumb} alt="" className="w-24 h-24 object-cover bg-black/40 border-r border-gray-800" />
                         : <div className="w-24 h-24 bg-black/40 border-r border-gray-800" />}
                <div className="flex-1 p-2">
                  <input className="bg-gray-800 rounded px-2 py-1 w-full mb-1" value={m.label} onChange={(e)=>ren(m.id, e.target.value)} />
                  <div className="opacity-60 text-[10px]">{new Date(m.ts).toLocaleString()}</div>
                  <div className="mt-2 flex items-center gap-2">
                    <button className="px-2 py-1 bg-gray-800 rounded hover:bg-gray-700" onClick={()=>restore(m.id)}>Restore</button>
                    <button className="px-2 py-1 bg-red-900 rounded hover:bg-red-800" onClick={()=>del(m.id)}>Delete</button>
                  </div>
                </div>
              </div>
            </div>
          ))}
          {marks.length === 0 && <div className="opacity-60">No named marks yet. Use them to label key milestones.</div>}
        </div>
      </div>
    </div>
  )
}

export default HistoryPanel;
