 
// src/components/DockHost.jsx
import React, { useEffect, useState } from "react";
import { onDock } from "@/lib/dockBus.js";

export function DockHost(){
  const [items, setItems] = useState([]);
  useEffect(() => onDock(evt => {
    if(evt?.type === "add"){ setItems(x => [...x, evt.item]); }
    if(evt?.type === "remove"){ setItems(x => x.filter(i => i.id !== evt.id)); }
  }), []);

  return (
    <div style={{
      position:"fixed", bottom:16, left: "50%", transform:"translateX(-50%)",
      display:"flex", gap:10, padding:"10px 14px", borderRadius:20,
      background:"var(--bg-elev)", border:"1px solid var(--panel-border)", 
      boxShadow:"var(--shadow-elev)", zIndex: 999
    }}>
      {items.map(i => (
        <button key={i.id} className="btn" onClick={i.onClick} title={i.label}>
          {i.icon ?? "◻"} <span className="small">{i.label}</span>
        </button>
      ))}
    </div>
  );
}
