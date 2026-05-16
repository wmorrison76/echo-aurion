import React, { useEffect, useMemo, useRef } from 'react'
import { usePanels } from '../../state/usePanels'
import GlowDesk from '../../panels/GlowDesk'
import WhiteboardPanel from '../../panels/WhiteboardPanel'
import WidgetStudioPanel from '../../panels/WidgetStudioPanel'
import VideoCallPanel from '../../panels/VideoCallPanel'
import ChatPanel from '../../panels/ChatPanel'
const REGISTRY = { dashboard: GlowDesk, whiteboard: WhiteboardPanel, studio: WidgetStudioPanel, videocall: VideoCallPanel, chat: ChatPanel }
export function PanelHost(){
  const { panels, close, minimize, focus, move, resize } = usePanels()
  return (<>{panels.sort((a,b)=>a.z-b.z).map(p => {
    const Comp = REGISTRY[p.id] || (()=> <div style={{padding:16}}>Unknown panel {p.id}</div>)
    return (
      <PanelFrame key={p.title+String(p.x)+String(p.y)} panel={p}
        onClose={()=> close(p.id)} onMinimize={()=> minimize(p.id,true)} onFocus={()=> focus(p.id)}
        onMove={(x,y)=> move(p.id, x,y)} onResize={(w,h)=> resize(p.id, w,h)}>
        <Comp {...(p.props||{})}/>
      </PanelFrame>
    )
  })}</>)
}
function PanelFrame({ panel, children, onClose, onMinimize, onFocus, onMove, onResize }){
  const ref = useRef(null); const dragRef = useRef(null)
  React.useEffect(()=>{
    const el = dragRef.current; if (!el) return
    let startX=0, startY=0, baseX=panel.x, baseY=panel.y, dragging=false
    const down = (e)=>{ dragging=true; startX=e.clientX; startY=e.clientY; window.addEventListener('mousemove', move); window.addEventListener('mouseup', up) }
    const move = (e)=>{ if (!dragging) return; onMove(baseX + (e.clientX-startX), baseY + (e.clientY-startY)) }
    const up = ()=>{ dragging=false; window.removeEventListener('mousemove', move); window.removeEventListener('mouseup', up) }
    el.addEventListener('mousedown', down); return ()=> el.removeEventListener('mousedown', down)
  }, [panel.x, panel.y])
  React.useEffect(()=>{
    const el = ref.current; if (!el) return
    const handle = document.createElement('div')
    handle.style.cssText = 'position:absolute;right:6px;bottom:6px;width:14px;height:14px;cursor:nwse-resize;background:rgba(255,255,255,.08);border-radius:4px;'
    el.appendChild(handle)
    let startX=0, startY=0, baseW=panel.w, baseH=panel.h, dragging=false
    const down=(e)=>{ dragging=true; startX=e.clientX; startY=e.clientY; window.addEventListener('mousemove', move); window.addEventListener('mouseup', up) }
    const move=(e)=>{ if (!dragging) return; onResize(Math.max(360, baseW + (e.clientX-startX)), Math.max(240, baseH + (e.clientY-startY))) }
    const up=()=>{ dragging=false; window.removeEventListener('mousemove', move); window.removeEventListener('mouseup', up) }
    handle.addEventListener('mousedown', down); return ()=> handle.removeEventListener('mousedown', down)
  }, [panel.w, panel.h])
  if (panel.minimized) return null
  return (
    <div ref={ref} className="panel" style={{ left: panel.x, top: panel.y, width: panel.w, height: panel.h, zIndex: panel.z }} onMouseDown={onFocus}>
      <div ref={dragRef} className="panel-header">
        <div className="traffic-dots"><div className="dot red" onClick={onClose}/><div className="dot yellow" onClick={onMinimize}/><div className="dot green"/></div>
        <div style={{fontWeight:600}}>{panel.title}</div>
      </div>
      <div style={{position:'absolute', inset: '48px 0 0 0', overflow:'hidden'}}>{children}</div>
    </div>
  )
}

export default PanelHost;
