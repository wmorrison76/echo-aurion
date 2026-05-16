import { useEffect } from 'react'
import { useStudioStore } from '../engine/store/useStudioStore'

/**
 * Hotkeys:
 *  - Hold Shift: keep aspect while dragging anchors
 *  - Hold Alt/Option: centered scaling while dragging anchors
 *  - , (comma) rotate -1°, . (dot) rotate +1°
 *  - Ctrl/Cmd + ,/. rotate ±15°
 */
export function useTransformHotkeys(){
  useEffect(()=>{
    const down = (e: KeyboardEvent) => {
      const s = useStudioStore.getState()
      if (e.key === 'Shift') s.setTransformKeepAspect(true)
      if (e.key === 'Alt') s.setTransformCentered(true)

      if (e.key === ',' || e.key === '.'){
        e.preventDefault()
        const step = (e.metaKey || e.ctrlKey) ? 15 : 1
        useStudioStore.getState().rotateActiveLayer(e.key === ',' ? -step : step)
      }
    }
    const up = (e: KeyboardEvent) => {
      const s = useStudioStore.getState()
      if (e.key === 'Shift') s.setTransformKeepAspect(false)
      if (e.key === 'Alt') s.setTransformCentered(false)
    }
    window.addEventListener('keydown', down)
    window.addEventListener('keyup', up)
    return ()=>{ window.removeEventListener('keydown', down); window.removeEventListener('keyup', up) }
  }, [])
}

export default useTransformHotkeys;
