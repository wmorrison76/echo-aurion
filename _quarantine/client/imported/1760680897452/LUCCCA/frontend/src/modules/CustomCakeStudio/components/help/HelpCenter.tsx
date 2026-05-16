import React from 'react'
import { useHelpStore } from '../../engine/store/useHelpStore'
import { searchArticles } from '../../engine/help/articles'

export function HelpCenter(){
  const open = useHelpStore(s=>s.open)
  const setOpen = useHelpStore(s=>s.setOpen)
  const q = useHelpStore(s=>s.query)
  const setQ = useHelpStore(s=>s.setQuery)
  if (!open) return null

  const results = searchArticles(q)

  return (
    <div className="absolute right-3 top-10 w-[540px] max-h-[70vh] overflow-auto bg-gray-900 border border-gray-800 rounded shadow-2xl z-50">
      <div className="p-2 border-b border-gray-800 flex items-center gap-2">
        <input autoFocus className="flex-1 bg-gray-800 rounded px-2 py-1 text-xs" placeholder="Search help…"
          value={q} onChange={(e)=>setQ(e.target.value)} />
        <button className="px-2 py-1 bg-gray-800 rounded hover:bg-gray-700 text-xs" onClick={()=>setOpen(false)}>Close</button>
      </div>
      <div className="p-2 text-xs space-y-3">
        {results.map(a => (
          <div key={a.id} className="p-2 rounded border border-gray-800">
            <div className="font-semibold mb-1">{a.title}</div>
            <pre className="whitespace-pre-wrap text-[11px] opacity-80">{a.body.trim()}</pre>
          </div>
        ))}
        {!results.length && <div className="opacity-60 p-2">No results.</div>}
      </div>
    </div>
  )
}

export default HelpCenter;
