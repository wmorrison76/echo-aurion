import React from 'react'
import { useStudioStore } from '../../engine/store/useStudioStore'
import { PRINT_PRESETS } from '../../engine/print/presets'
import { exportPDF } from '../../engine/print/ExportPDF'

export function PrintPanel(){
  const s = useStudioStore()
  const pr = s.print
  const size = s.project.canvas

  return (
    <div className="p-2 text-xs space-y-2">
      <div className="mb-1 font-semibold opacity-80">Print</div>

      <div className="grid grid-cols-3 gap-2 items-center">
        <label>Preset</label>
        <select className="bg-gray-800 rounded px-2 py-1 col-span-2"
          value={pr.presetId || ''}
          onChange={(e)=>s.applyPrintPreset(e.target.value)}>
          <option value="">—</option>
          {PRINT_PRESETS.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>

        <label>Units</label>
        <select className="bg-gray-800 rounded px-2 py-1" value={pr.units} onChange={(e)=>s.setPrintUnits(e.target.value as any)}>
          <option value="px">px</option>
          <option value="in">in</option>
          <option value="mm">mm</option>
          <option value="cm">cm</option>
        </select>
        <label>DPI</label>
        <input className="bg-gray-800 rounded px-2 py-1" value={pr.dpi} onChange={(e)=>s.setPrintDPI(Number(e.target.value)||300)} />
        <span />

        <label>Bleed</label>
        <input className="bg-gray-800 rounded px-2 py-1" value={pr.bleed} onChange={(e)=>s.setPrintBleed(Number(e.target.value)||0)} />
        <span className="opacity-60">{pr.units}</span>

        <label>Margin</label>
        <input className="bg-gray-800 rounded px-2 py-1" value={pr.margin} onChange={(e)=>s.setPrintMargin(Number(e.target.value)||0)} />
        <span className="opacity-60">{pr.units}</span>
      </div>

      <div className="flex items-center gap-2">
        <label className="flex items-center gap-2">
          <input type="checkbox" checked={pr.showMarks} onChange={()=>s.togglePrintMarks()} />
          Crop Marks
        </label>
        <label className="flex items-center gap-2">
          <input type="checkbox" checked={pr.softProofOn} onChange={()=>s.toggleSoftProof()} />
          Soft‑Proof (CMYK sim)
        </label>
      </div>

      <div className="opacity-60 text-[10px] mt-1">
        Presets set canvas size in px using your DPI. Soft‑Proof is an approximate CMYK preview (screen-only).
      </div>

      <div className="mt-1 opacity-70">
        <div>Canvas: <b>{size.width}×{size.height}px</b> @ <b>{size.dpi} dpi</b></div>
      </div>

      <div className="pt-2 flex items-center gap-2">
        <button className="px-2 py-1 bg-emerald-800 rounded hover:bg-emerald-700"
          onClick={()=>exportPDF(s.project, 'CustomCakeStudio.pdf')}>
          Export PDF (stub)
        </button>
      </div>
    </div>
  )
}

export default PrintPanel;
