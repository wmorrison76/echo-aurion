import React, { useMemo, useState } from "react";
import { startOfWeek, isoDate, addDays } from "./utils";

export default function CopyWeekModal({ open, onClose, onCopy, currentWeekISO }) {
  const [sourceISO, setSourceISO] = useState(() => {
    // default to prior week
    const d = new Date(currentWeekISO + "T00:00:00");
    d.setDate(d.getDate() - 7);
    return isoDate(startOfWeek(d, 1));
  });
  const [targetISO, setTargetISO] = useState(currentWeekISO);
  const [keepNotes, setKeepNotes]   = useState(true);
  const [keepLeaves, setKeepLeaves] = useState(true);

  if (!open) return null;
  return (
    <div style={backdrop}>
      <div style={sheet}>
        <div style={{fontWeight:800, fontSize:16, marginBottom:8}}>Copy Schedule</div>
        <div style={{display:"grid", gap:8}}>
          <label>From week (Mon start): <input type="date" value={sourceISO} onChange={e=>setSourceISO(e.target.value)} /></label>
          <label>To week (Mon start): <input type="date" value={targetISO} onChange={e=>setTargetISO(e.target.value)} /></label>
          <label><input type="checkbox" checked={keepNotes} onChange={e=>setKeepNotes(e.target.checked)} /> Keep row notes</label>
          <label><input type="checkbox" checked={keepLeaves} onChange={e=>setKeepLeaves(e.target.checked)} /> Keep leave types</label>
        </div>
        <div style={{display:"flex", gap:8, marginTop:12, justifyContent:"flex-end"}}>
          <button className="btn" onClick={onClose}>Cancel</button>
          <button className="btn primary" onClick={()=>onCopy({ sourceISO, targetISO, keepNotes, keepLeaves })}>Copy</button>
        </div>
      </div>
    </div>
  );
}
const backdrop = { position:"fixed", inset:0, background:"rgba(0,0,0,.35)", display:"grid", placeItems:"center", zIndex:99999 };
const sheet = { background:"#fff", border:"1px solid #e2e8f0", borderRadius:12, padding:16, width:420, boxShadow:"0 20px 48px rgba(0,0,0,.25)" };
