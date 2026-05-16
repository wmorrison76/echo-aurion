import React, { useEffect, useState } from 'react';
const KEY='wb.snapshots.v1';
const get = ()=>{ try { return JSON.parse(localStorage.getItem(KEY)||'[]'); } catch { return []; } };
const put = (arr)=> localStorage.setItem(KEY, JSON.stringify(arr));
const grabCanvas = ()=> document.querySelector('canvas.excalidraw__canvas, #whiteboard-stage canvas');
export default function SnapshotsPanel(){
  const [shots,setShots]=useState(get());
  useEffect(()=>{ put(shots); },[shots]);
  const capture=async()=>{
    const canvas = grabCanvas(); if(!canvas){ alert('No canvas found'); return; }
    const blob = await new Promise(res=>canvas.toBlob(res,'image/png',1));
    if(!blob){ alert('Capture failed'); return; }
    const url = URL.createObjectURL(blob);
    const entry = { id:Date.now(), url, at:new Date().toISOString() };
    setShots(s=>[entry, ...s].slice(0,50));
  };
  const download = (s)=>{
    const a=document.createElement('a'); a.href=s.url; a.download=`snapshot-${s.id}.png`; document.body.appendChild(a); a.click(); a.remove();
  };
  const remove = (id)=> setShots(s=>s.filter(x=>x.id!==id));
  return (
    <section className="wb-snapshots" aria-label="Snapshots">
      <header><strong>Snapshots</strong><button onClick={capture}>Capture</button></header>
      <div className="wb-snap-grid">
        {shots.map(s=>(
          <figure key={s.id} className="wb-shot">
            <img src={s.url} alt={`Snapshot ${new Date(s.id).toLocaleString()}`} />
            <figcaption>
              <time>{new Date(s.id).toLocaleTimeString()}</time>
              <div className="wb-shot-actions">
                <button onClick={()=>download(s)}>Download</button>
                <button onClick={()=>remove(s.id)}>Delete</button>
              </div>
            </figcaption>
          </figure>
        ))}
      </div>
    </section>
  );
}
