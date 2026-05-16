import React, { useEffect } from 'react'
import TopBar from '../components/layout/TopBar'
import { LeftToolbar } from '../components/layout/LeftToolbar'
import { StageCanvas } from '../components/canvas/StageCanvas'
import { RightPanels } from '../components/layout/RightPanels'
import { initAutosave, tryRestoreAutosave } from '../engine/persist/autosave'
import { useStudioStore } from '../engine/store/useStudioStore'

export default function Studio(){
  useEffect(()=>{
    initAutosave()
    const saved = tryRestoreAutosave()
    if (saved){
      try {
        (useStudioStore as any).setState({ project: saved.project })
      } catch {}
    }
  }, [])

  return (
    <div className="w-full h-full flex flex-col bg-gray-950 text-gray-100">
      <TopBar />
      <div className="flex-1 flex min-h-0">
        <LeftToolbar />
        <StageCanvas />
        <RightPanels />
      </div>
    </div>
  )
}
