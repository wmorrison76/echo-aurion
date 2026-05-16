import React, { useRef } from 'react'
import { activeTextLayer, setActiveTextProps } from '../../engine/store/textOps'
import { listFonts, ensureLoaded, registerDefaultFonts } from '../../engine/text'
import { FontImporter } from '../../engine/assets/FontImporter'
import { useStudioStore } from '../../engine/store/useStudioStore'

registerDefaultFonts()

export function TextPanel(){
  const s = useStudioStore()
  const L:any = activeTextLayer()
  const fileRef = useRef<HTMLInputElement>(null)
  const fonts = listFonts()

  const pick = () => fileRef.current?.click()
  const onPicked: React.ChangeEventHandler<HTMLInputElement> = async (e) => {
    const f = e.target.files?.[0]; e.currentTarget.value=''
    if (!f) return
    const res = await FontImporter.importFile(f)
    await ensureLoaded(res.name)
  }

  if (!L) return <div className="p-2 text-xs opacity-60">Select a text layer to edit its styles.</div>

  return (
    <div className="p-2 text-xs space-y-2">
      <div className="mb-1 font-semibold opacity-80">Text</div>

      <div className="grid grid-cols-3 gap-2 items-center">
        <label>Font</label>
        <select className="col-span-2 bg-gray-800 rounded px-2 py-1" value={L.font||'Inter'} onChange={async (e)=>{
          const name = e.target.value; await ensureLoaded(name); setActiveTextProps({ font: name })
        }}>
          {fonts.map(f => <option key={f.id} value={f.name}>{f.name}</option>)}
        </select>

        <label>Size</label>
        <input className="bg-gray-800 rounded px-2 py-1" value={L.size||24} onChange={(e)=>setActiveTextProps({ size: Number(e.target.value)||12 })} />
        <label>Weight</label>
        <select className="bg-gray-800 rounded px-2 py-1" value={L.weight||400} onChange={(e)=>setActiveTextProps({ weight: Number(e.target.value)||400 })}>
          {[200,300,400,500,600,700,800,900].map(w => <option key={w} value={w}>{w}</option>)}
        </select>

        <label>Line</label>
        <input className="bg-gray-800 rounded px-2 py-1" value={L.lineHeight||1.2} onChange={(e)=>setActiveTextProps({ lineHeight: Number(e.target.value)||1.2 })} />
        <label>Letter</label>
        <input className="bg-gray-800 rounded px-2 py-1" value={L.letterSpacing||0} onChange={(e)=>setActiveTextProps({ letterSpacing: Number(e.target.value)||0 })} />

        <label>Align</label>
        <select className="bg-gray-800 rounded px-2 py-1" value={L.align||'left'} onChange={(e)=>setActiveTextProps({ align: e.target.value })}>
          <option value="left">Left</option><option value="center">Center</option><option value="right">Right</option>
        </select>
        <label>Color</label>
        <input type="color" className="bg-gray-800 rounded px-1 py-1" value={L.fill||'#ffffff'} onChange={(e)=>setActiveTextProps({ fill: e.target.value })} />
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        <input ref={fileRef} type="file" className="hidden" accept=".ttf,.otf,.woff,.woff2" onChange={onPicked} />
        <button className="px-2 py-1 bg-gray-800 rounded hover:bg-gray-700" onClick={pick}>Import Font…</button>
        <button className="px-2 py-1 bg-gray-800 rounded hover:bg-gray-700" onClick={async ()=>{
          const name = L.font || 'Inter'; await ensureLoaded(name); setActiveTextProps({ font: name })
        }}>Reload Font</button>
      </div>

      <div className="opacity-60 text-[10px]">
        Tip: Double‑click a text layer on canvas to edit inline. Import .ttf/.otf/.woff/.woff2.
      </div>
    </div>
  )
}

export default TextPanel;
