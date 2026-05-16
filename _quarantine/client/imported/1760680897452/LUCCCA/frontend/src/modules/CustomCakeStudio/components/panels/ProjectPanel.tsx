import React, { useRef, useState } from 'react'
import { useStudioStore } from '../../engine/store/useStudioStore'
import { serializeProject } from '../../engine/persist/serialize'
import { downloadTextFile } from '../../engine/persist/download'
import { deserializeProjectFile } from '../../engine/persist/deserialize'
import type { ProjectFile } from '../../engine/persist/types'

export function ProjectPanel(){
  const s = useStudioStore()
  const fileRef = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)
  const [lastInfo, setLastInfo] = useState<string | null>(null)
  const [lastError, setLastError] = useState<string | null>(null)

  const save = async () => {
    setBusy(true); setLastError(null); setLastInfo(null)
    try {
      const pf = await serializeProject(s.project)
      const name = `CustomCakeStudio_${new Date().toISOString().replace(/[:.]/g,'-')}.ccs.json`
      downloadTextFile(name, JSON.stringify(pf, null, 2))
      setLastInfo('Project saved to your downloads.')
    } catch (e:any) {
      setLastError(e?.message || 'Save failed')
    } finally {
      setBusy(false)
    }
  }

  const open = () => fileRef.current?.click()
  const onPicked: React.ChangeEventHandler<HTMLInputElement> = async (e) => {
    const f = e.target.files?.[0]; e.currentTarget.value = ''
    if (!f) return
    setBusy(true); setLastError(null); setLastInfo(null)
    try {
      const text = await f.text()
      const parsed = JSON.parse(text) as ProjectFile
      const proj = deserializeProjectFile(parsed)
      ;(useStudioStore as any).setState({ project: proj })
      setLastInfo('Project loaded.')
    } catch (err:any){
      setLastError(err?.message || 'Load failed')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="p-2 text-xs space-y-2">
      <div className="mb-1 font-semibold opacity-80">Project</div>
      <div className="flex items-center gap-2 flex-wrap">
        <button className={"px-2 py-1 rounded " + (!busy ? "bg-emerald-800 hover:bg-emerald-700" : "bg-emerald-800/40")} onClick={save} disabled={busy}>
          Save Project (.ccs.json)
        </button>
        <input ref={fileRef} className="hidden" type="file" accept=".json,application/json" onChange={onPicked} />
        <button className="px-2 py-1 bg-gray-800 rounded hover:bg-gray-700" onClick={open} disabled={busy}>
          Load Project…
        </button>
      </div>
      {lastInfo && <div className="text-emerald-300">{lastInfo}</div>}
      {lastError && <div className="text-red-400">{lastError}</div>}
      <div className="opacity-60 text-[10px]">
        Saving embeds image layers as data URLs so the file is portable. Future versions may dedupe assets.
      </div>
    </div>
  )
}

export default ProjectPanel;
