import React, { useEffect, useMemo, useState } from 'react'
import { useStudioStore } from '../../engine/store/useStudioStore'
import { searchArticles } from '../../engine/help/articles'
import { useHelpStore } from '../../engine/store/useHelpStore'

type Cmd = { id:string; title:string; run:()=>void }

export function CommandPalette(){
  const [open, setOpen] = useState(false)
  const [q, setQ] = useState('')
  const s = useStudioStore()
  const help = useHelpStore()

  useEffect(()=>{
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault(); setOpen(o=>!o)
      }
    }
    window.addEventListener('keydown', onKey)
    return ()=>window.removeEventListener('keydown', onKey)
  }, [])

  const cmds: Cmd[] = useMemo(()=>[
    { id: 'tool-move', title: 'Tool: Move (V)', run: ()=>s.setTool('move' as any) },
    { id: 'tool-brush', title: 'Tool: Brush (B)', run: ()=>s.setTool('brush' as any) },
    { id: 'tool-text', title: 'Tool: Text (T)', run: ()=>s.setTool('text' as any) },
    { id: 'tool-shape', title: 'Tool: Shape', run: ()=>s.setTool('shape' as any) },
    { id: 'tool-pen', title: 'Tool: Pen', run: ()=>s.setTool('pen' as any) },
    { id: 'export-png', title: 'Export PNG', run: ()=>import('../../engine/print/ExportManager').then(m=>m.ExportManager.exportPNG(s.project, 'CustomCakeStudio.png')) },
    { id: 'export-jpg', title: 'Export JPG', run: ()=>import('../../engine/print/ExportManager').then(m=>m.ExportManager.exportJPEG(s.project, 0.92, 'CustomCakeStudio.jpg')) },
    { id: 'help-open', title: 'Open Help Center', run: ()=>help.setOpen(true) },
  ], [s, help])

  const helpHits = searchArticles(q).slice(0,5).map(a => ({
    id: 'help:'+a.id,
    title: 'Help: ' + a.title,
    run: ()=>{ help.setOpen(true); help.setQuery(a.title) }
  }))

  const items = (q.trim()? [...helpHits, ...cmds] : cmds).filter(x => x.title.toLowerCase().includes(q.toLowerCase()))

  if (!open) return null

  return (
    <div className="absolute inset-0 z-50 flex items-start justify-center pt-20 bg-black/30">
      <div className="w-[560px] bg-gray-900 border border-gray-800 rounded shadow-2xl">
        <div className="p-2 border-b border-gray-800">
          <input autoFocus className="w-full bg-gray-800 rounded px-2 py-1 text-sm" placeholder="Type a command or search help…"
            value={q} onChange={(e)=>setQ(e.target.value)} onKeyDown={(e)=>{
              if (e.key==='Escape'){ setOpen(false) }
              if (e.key==='Enter' && items[0]){ items[0].run(); setOpen(false) }
            }} />
        </div>
        <div className="max-h-[50vh] overflow-auto text-xs">
          {items.map(it => (
            <div key={it.id} className="px-3 py-2 hover:bg-gray-800 cursor-pointer" onClick={()=>{ it.run(); setOpen(false) }}>
              {it.title}
            </div>
          ))}
          {!items.length && <div className="px-3 py-2 opacity-60">No matches.</div>}
        </div>
      </div>
    </div>
  )
}

export default CommandPalette;
