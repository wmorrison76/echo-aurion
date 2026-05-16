import React, { useEffect, useState } from 'react';
const KEY = 'wb.overlays';
const getStage = () => document.getElementById('whiteboard-stage') || document.body;
const defaultState = { grid:true, rulers:true, snap:true, density: 16 };
export default function CanvasOverlays(){
  const [ov, setOv] = useState(()=>{ try { return {...defaultState, ...(JSON.parse(localStorage.getItem(KEY)||'{}'))}; } catch { return defaultState; } });
  useEffect(()=>{
    const stage = getStage(); if(!stage) return;
    stage.classList.toggle('wb-grid', !!ov.grid);
    stage.classList.toggle('wb-rulers', !!ov.rulers);
    stage.classList.toggle('wb-snap', !!ov.snap);
    stage.style.setProperty('--wb-grid', `${ov.density}px`);
    localStorage.setItem(KEY, JSON.stringify(ov));
  }, [ov]);
  return (
    <div className="wb-overlay-toolbar" role="region" aria-label="Overlays">
      <label><input type="checkbox" checked={ov.grid} onChange={e=>setOv(v=>({...v,grid:e.target.checked}))}/> Grid</label>
      <label><input type="checkbox" checked={ov.rulers} onChange={e=>setOv(v=>({...v,rulers:e.target.checked}))}/> Rulers</label>
      <label><input type="checkbox" checked={ov.snap} onChange={e=>setOv(v=>({...v,snap:e.target.checked}))}/> Snap</label>
      <input type="range" min="8" max="64" step="1" value={ov.density} onChange={e=>setOv(v=>({...v,density:Number(e.target.value)}))} />
      <span className="wb-overlay-density">{ov.density}px</span>
    </div>
  );
}
