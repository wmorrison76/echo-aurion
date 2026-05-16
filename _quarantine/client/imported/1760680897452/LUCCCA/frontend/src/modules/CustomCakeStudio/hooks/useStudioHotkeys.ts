import { useEffect } from 'react'
import { useStudioStore } from '../engine/store/useStudioStore'

export function useStudioHotkeys(){
  const setTool = useStudioStore(s=>s.setTool)
  const undo = useStudioStore(s=>s.undo)
  const redo = useStudioStore(s=>s.redo)
  const dup = useStudioStore(s=>s.duplicateLayer)
  const del = useStudioStore(s=>s.deleteLayer)
  const move = useStudioStore(s=>s.moveLayer)
  const activeId = useStudioStore(s=>s.activeLayerId)

  useEffect(()=>{
    const onKey = (e: KeyboardEvent) => {
      // Undo / Redo
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'z'){
        e.preventDefault()
        if (e.shiftKey) redo(); else undo()
        return
      }
      // Duplicate (Cmd/Ctrl+D)
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'd' && activeId){
        e.preventDefault(); dup(activeId); return
      }
      // Delete (Backspace/Delete)
      if ((e.key === 'Backspace' || e.key === 'Delete') && activeId){
        e.preventDefault(); del(activeId); return
      }
      // Reorder (Cmd/Ctrl+], Cmd/Ctrl+[)
      if ((e.metaKey || e.ctrlKey) && activeId && (e.key === ']' || e.key === '[')){
        e.preventDefault(); move(activeId, e.key === ']' ? 'up' : 'down'); return
      }

      const k = e.key.toLowerCase()
      const handled = new Set(['v','h','b','e','m','l','w','a','i','t','p','g','s','j'])
      if (handled.has(k)) e.preventDefault()
      switch(k){
        case 'v': setTool('move'); break
        case 'h': setTool('hand'); break
        case 'b': setTool('brush'); break
        case 'e': setTool('eraser'); break
        case 'm': setTool('marquee'); break
        case 'l': setTool('lasso'); break
        case 'w': setTool('wand'); break
        case 'a': setTool('quick'); break
        case 'i': setTool('eyedropper'); break
        case 't': setTool('text'); break
        case 'p': setTool('bucket'); break
        case 'g': setTool('gradient'); break
        case 's': setTool('clone'); break
        case 'j': setTool('spothealing'); break
      }
    }
    window.addEventListener('keydown', onKey)
    return ()=> window.removeEventListener('keydown', onKey)
  }, [setTool, undo, redo, dup, del, move, activeId])
}

export default useStudioHotkeys;
