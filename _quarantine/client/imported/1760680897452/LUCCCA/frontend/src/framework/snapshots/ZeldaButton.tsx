import React, { useMemo, useState } from "react";
import { SnapshotManager } from "./SnapshotManager";

export function ZeldaButton<T>({ getState, onLoad }:{ getState:()=>T; onLoad:(s:T)=>void; }){
  const mgr = useMemo(()=> new SnapshotManager<T>(), []);
  const [open, setOpen] = useState(false);
  const list = mgr.list();
  return (
    <div className="fixed bottom-4 left-4 z-[1200]">
      <button className="px-3 py-2 rounded-lg bg-white/6 border border-white/12" onClick={()=>setOpen(v=>!v)}>Snapshots</button>
      {open && (
        <div className="mt-2 w-[300px] rounded-xl border border-white/12 bg-[rgba(13,18,29,.98)] p-2">
          <button className="w-full px-2 py-1 rounded bg-white/6 hover:bg-white/8 mb-2"
            onClick={()=>{ mgr.save(new Date().toLocaleString(), getState()); window.setTimeout(()=>location.reload(), 10); }}>
            Save snapshot
          </button>
          <div className="max-h-64 overflow-auto space-y-1">
            {list.map(s => (
              <button key={s.id} className="w-full text-left px-2 py-1 rounded hover:bg-white/6" onClick={()=>{ onLoad(s.payload as any); setOpen(false); }}>
                <div className="text-sm">{s.name}</div>
                <div className="text-[11px] opacity-70">{new Date(s.at).toLocaleString()}</div>
              </button>
            ))}
            {list.length===0 && <div className="text-sm opacity-70 px-1 py-2">No snapshots yet.</div>}
          </div>
        </div>
      )}
    </div>
  );
}
