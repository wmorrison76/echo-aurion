import React, { useEffect, useRef, useState } from 'react'
import { useToolbar } from '../state/useToolbar'
import { usePanels } from '../state/usePanels'
const useDrag = (onMove) => {
  const ref = useRef(null)
  useEffect(()=>{
    const el = ref.current; if (!el) return
    let startX=0, startY=0, baseX=0, baseY=0, dragging=false
    const down = (e) => { dragging=true; startX = e.clientX; startY = e.clientY; const { left, top } = el.getBoundingClientRect(); baseX = left; baseY = top; window.addEventListener('mousemove', move); window.addEventListener('mouseup', up) }
    const move = (e) => { if (!dragging) return; onMove(baseX + (e.clientX-startX), baseY + (e.clientY-startY)) }
    const up = () => { dragging=false; window.removeEventListener('mousemove', move); window.removeEventListener('mouseup', up) }
    el.addEventListener('mousedown', down); return () => { el.removeEventListener('mousedown', down) }
  }, [onMove])
  return ref
}
export default function Toolbar(){
  const { pos, setPos, dockChips } = useToolbar()
  const open = usePanels(s => s.open)
  const [ghost, setGhost] = useState(false)
  const ref = useDrag((x,y)=> setPos(x,y))
  useEffect(()=>{
    const onOpen = (e) => open(e.detail.id, { title: e.detail.id, allowDuplicate: !!e.detail.allowDuplicate })
    window.addEventListener('open-panel', onOpen)
    return () => window.removeEventListener('open-panel', onOpen)
  },[])
  return (
    <div className="toolbar" style={{ left: pos.x, top: pos.y }}>
      <div ref={ref} className="handle">{'≡'}</div>
      <div className="orb" title="Echo Orb"/>
      <div className="dock">
        <div className="chip" onClick={()=> open('whiteboard', { title: 'Whiteboard', w: 980, h: 640 })}>Whiteboard</div>
        <div className="chip" onClick={()=> open('studio', { title: 'Widget Studio', w: 720, h: 540 })}>Widget Studio</div>
        <div className={"chip"+(ghost?' ghost':'')} onClick={()=> setGhost(v=>!v)} title="Ghost opacity toggle">Ghost</div>
        {dockChips.map((c,i)=>(<div key={i} className="chip" onClick={c.onClick}>{c.title}</div>))}
      </div>
    </div>
  )
}
