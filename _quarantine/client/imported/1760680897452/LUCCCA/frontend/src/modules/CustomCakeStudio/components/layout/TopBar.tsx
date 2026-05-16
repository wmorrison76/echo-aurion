import React, { useRef, useState } from 'react'
import { useStudioStore } from '../../engine/store/useStudioStore'
import { ExportManager } from '../../engine/print/ExportManager'
import { ImageImporter } from '../../engine/assets/ImageImporter'
import { useHelpStore } from '../../engine/store/useHelpStore'
import { HelpCenter } from '../help/HelpCenter'
import { useGridStore } from '../../engine/store/useGridStore'
import { ExportPDFMulti } from '../../engine/print/ExportPDFMulti'
import { CommandPalette } from '../help/CommandPalette'

export default function TopBar(){
  const tool = useStudioStore(s=>s.activeTool)
  const setTool = useStudioStore(s=>s.setTool)
  const project = useStudioStore(s=>s.project)
  const rotate = useStudioStore(s=>s.rotateActiveLayer)
  const flip = useStudioStore(s=>s.flipActiveLayerX)
  const undo = useStudioStore(s=>s.undo)
  const redo = useStudioStore(s=>s.redo)
  const canUndo = useStudioStore(s=>s.historyCanUndo)
  const canRedo = useStudioStore(s=>s.historyCanRedo)

  const fileRef = useRef<HTMLInputElement>(null)
  const [url, setUrl] = useState('')
  const openHelp = useHelpStore(s=>s.setOpen)
  const gridToggle = useGridStore(s=>s.toggle)
  const grid = useGridStore(s=>s.grid)

  const pick = () => fileRef.current?.click()
  const onPicked: React.ChangeEventHandler<HTMLInputElement> = async (e) => {
    const files = e.target.files
    if (!files || !files.length) return
    for (const f of Array.from(files)){
      if (f.type.startsWith('image/')) await ImageImporter.importFile(f)
    }
    e.currentTarget.value = ''
  }
  const onImportUrl = async () => {
    if (!url.trim()) return
    await ImageImporter.importUrl(url.trim())
    setUrl('')
  }

  return (
    <div className="h-10 bg-gray-900 border-b border-gray-800 flex items-center justify-between px-3 text-xs relative">
      {/* Left controls */}
      <div className="flex items-center gap-2">
        <button className={"px-2 py-1 rounded " + (canUndo ? "bg-gray-800 hover:bg-gray-700" : "bg-gray-800/40")}
          onClick={()=>canUndo && undo()}>Undo</button>
        <button className={"px-2 py-1 rounded " + (canRedo ? "bg-gray-800 hover:bg-gray-700" : "bg-gray-800/40")}
          onClick={()=>canRedo && redo()}>Redo</button>

        <span className="opacity-70 ml-3">Tool:</span>
        <select className="bg-gray-800 rounded px-2 py-1"
          value={tool} onChange={(e)=>setTool(e.target.value as any)}>
          <option value="move">Move (V)</option>
          <option value="hand">Hand (H)</option>
          <option value="brush">Brush (B)</option>
          <option value="eraser">Eraser (E)</option>
          <option value="maskbrush">Mask Brush (K)</option>
          <option value="eyedropper">Eyedropper (I)</option>
          <option value="text">Text (T)</option>
          <option value="marquee">Marquee (M)</option>
          <option value="lasso">Lasso (L)</option>
          <option value="wand">Magic Wand (W)</option>
          <option value="quick">Quick Select (A)</option>
          <option value="bucket">Bucket (P)</option>
          <option value="gradient">Gradient (G)</option>
          <option value="clone">Clone Stamp (S)</option>
          <option value="spothealing">Spot Healing (J)</option>
          <option value="patch">Patch</option>
          <option value="shape">Shape</option>
          <option value="pen">Pen</option>
        </select>

        <div className="ml-3 flex items-center gap-2">
          <button className="px-2 py-1 bg-gray-800 rounded hover:bg-gray-700" onClick={()=>rotate(-90)}>⟲ 90°</button>
          <button className="px-2 py-1 bg-gray-800 rounded hover:bg-gray-700" onClick={()=>rotate(90)}>⟳ 90°</button>
          <button className="px-2 py-1 bg-gray-800 rounded hover:bg-gray-700" onClick={flip}>Flip</button>
        </div>

        <button className={"ml-3 px-2 py-1 rounded " + (grid.enabled ? "bg-violet-800 hover:bg-violet-700" : "bg-gray-800 hover:bg-gray-700")} onClick={()=>gridToggle()}>
          {grid.enabled ? "Grid: On" : "Grid: Off"}
        </button>
      </div>

      {/* Right controls */}
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-1">
          <input ref={fileRef} type="file" multiple accept="image/*" className="hidden" onChange={onPicked} />
          <button className="px-2 py-1 bg-gray-800 rounded hover:bg-gray-700" onClick={pick}>Import Image…</button>
          <input className="bg-gray-800 rounded px-2 py-1 w-48" placeholder="Paste URL + Enter"
            value={url} onChange={(e)=>setUrl(e.target.value)}
            onKeyDown={(e)=>{ if(e.key==='Enter') onImportUrl() }} />
          <button className="px-2 py-1 bg-gray-800 rounded hover:bg-gray-700" onClick={onImportUrl}>Add</button>
        </div>
        <button className="px-2 py-1 bg-gray-800 rounded hover:bg-gray-700"
          onClick={()=>ExportManager.exportPNG(project, 'CustomCakeStudio.png')}>Export PNG</button>
        <button className="px-2 py-1 bg-gray-800 rounded hover:bg-gray-700"
          onClick={()=>ExportManager.exportJPEG(project, 0.92, 'CustomCakeStudio.jpg')}>Export JPG</button>
        <button className="px-2 py-1 bg-gray-800 rounded hover:bg-gray-700"
          onClick={()=>ExportPDFMulti.preview([project], { title: 'CustomCake PDF' })}>PDF Preview</button>

        <button title="Command Palette (Cmd/Ctrl+K)" className="px-2 py-1 bg-sky-800 rounded hover:bg-sky-700">⌘K</button>
        <button className="px-2 py-1 bg-emerald-800 rounded hover:bg-emerald-700" onClick={()=>useHelpStore.getState().setOpen(true)}>Help ▾</button>
      </div>

      <HelpCenter />
      <CommandPalette />
    </div>
  )
}
