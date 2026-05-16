import React from 'react'
import { useStudioStore } from '../../engine/store/useStudioStore'

export function SelectionRefinePanel(){
  const s = useStudioStore()
  const id = s.activeLayerId
  const hasSelection = s.selection && s.selection.length>0 && s.selection[0]?.length>0

  const fast = async (reveal:boolean) => {
    if (!hasSelection || !id) return
    await s.applyRefinedSelectionToMaskFast(id, reveal)
  }

  return (
    <div className="p-2 text-xs space-y-2">
      <div className="mb-1 font-semibold opacity-80">Selection Refinement</div>
      {!hasSelection && <div className="opacity-60">Make a selection with Marquee/Lasso/Wand/Quick Select.</div>}
      <div className="grid grid-cols-3 gap-2 items-center">
        <label>Feather</label>
        <input type="range" min={0} max={50} step={1} value={s.selectionFeather} onChange={(e)=>s.setSelectionFeather(Number(e.target.value))} />
        <span className="text-right">{s.selectionFeather}px</span>

        <label>Expand/Contract</label>
        <input type="range" min={-50} max={50} step={1} value={s.selectionExpand} onChange={(e)=>s.setSelectionExpand(Number(e.target.value))} />
        <span className="text-right">{s.selectionExpand}px</span>
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        <button disabled={!hasSelection} className={"px-2 py-1 rounded " + (hasSelection?"bg-gray-800 hover:bg-gray-700":"bg-gray-800/40")}
          onClick={()=>s.applyRefinedSelectionToMask(id!, true)}>Apply → Mask (Reveal)</button>
        <button disabled={!hasSelection} className={"px-2 py-1 rounded " + (hasSelection?"bg-gray-800 hover:bg-gray-700":"bg-gray-800/40")}
          onClick={()=>s.applyRefinedSelectionToMask(id!, false)}>Apply → Mask (Hide)</button>
        <button disabled={!hasSelection} className={"px-2 py-1 rounded " + (hasSelection?"bg-emerald-800 hover:bg-emerald-700":"bg-gray-800/40")}
          onClick={()=>fast(true)}>Fast (Worker) → Reveal</button>
        <button disabled={!hasSelection} className={"px-2 py-1 rounded " + (hasSelection?"bg-emerald-800 hover:bg-emerald-700":"bg-gray-800/40")}
          onClick={()=>fast(false)}>Fast (Worker) → Hide</button>
      </div>

      <div className="opacity-60 text-[10px] mt-1">
        The <b>Fast (Worker)</b> buttons run refine off the main thread for smoother UI on big images.
      </div>
    </div>
  )
}

export default SelectionRefinePanel;
