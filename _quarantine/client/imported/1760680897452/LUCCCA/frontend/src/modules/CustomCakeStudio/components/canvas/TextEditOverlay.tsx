import React, { useEffect, useRef, useState } from 'react'
import { useTextEditStore } from '../../engine/store/useTextEditStore'
import { useStudioStore } from '../../engine/store/useStudioStore'
import { endTextEdit } from '../../engine/store/textOps'

export function TextEditOverlay(){
  const editingId = useTextEditStore(s=>s.editingId)
  const s = useStudioStore()
  const taRef = useRef<HTMLTextAreaElement>(null)
  const [rect, setRect] = useState<{x:number;y:number;w:number;h:number}|null>(null)
  const L:any = (editingId && s.project.layers.find(l=>l.id===editingId)) || null

  useEffect(()=>{
    if (!L) return
    const w = Math.max(200, (L.text?.length||1) * (L.size||24) * 0.6)
    const h = Math.max(40, (L.size||24) * 1.6)
    setRect({ x: L.transform.x, y: L.transform.y - (L.size||24), w, h })
    setTimeout(()=> taRef.current?.focus(), 0)
  }, [editingId])

  if (!L || !rect) return null

  const onKeyDown: React.KeyboardEventHandler<HTMLTextAreaElement> = (e) => {
    if (e.key === 'Escape') { endTextEdit(); e.preventDefault() }
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) { endTextEdit(); e.preventDefault() }
  }
  const onChange: React.ChangeEventHandler<HTMLTextAreaElement> = (e) => {
    L.text = e.target.value
    s.historyMark('Type')
  }

  return (
    <div className="pointer-events-none absolute inset-0">
      <textarea
        ref={taRef}
        className="pointer-events-auto absolute bg-transparent text-white outline-none resize-none"
        style={{
          left: rect.x, top: rect.y, width: rect.w, height: rect.h,
          fontFamily: L.font || 'Inter, system-ui, sans-serif',
          fontSize: (L.size||24),
          lineHeight: 1.2,
        }}
        defaultValue={L.text || ''}
        onChange={onChange}
        onKeyDown={onKeyDown}
        onBlur={()=>endTextEdit()}
      />
    </div>
  )
}

export default TextEditOverlay;
