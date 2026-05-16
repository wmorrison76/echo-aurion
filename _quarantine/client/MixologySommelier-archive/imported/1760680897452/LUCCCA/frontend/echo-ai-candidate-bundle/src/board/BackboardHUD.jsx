// frontend/src/board/BackboardHUD.jsx
import React, { useEffect, useState } from "react";
import { DEFAULT_WIDGETS } from "../components/widgets/registry";

const LSK = "lu:hud:widgets:v1";

export default function BackboardHUD() {
  const [widgets, setWidgets] = useState(() => {
    try { return JSON.parse(localStorage.getItem(LSK) || "null") ?? DEFAULT_WIDGETS; }
    catch { return DEFAULT_WIDGETS; }
  });

  useEffect(() => { localStorage.setItem(LSK, JSON.stringify(widgets)); }, [widgets]);

  // receive saves from Widget Studio
  useEffect(() => {
    const onAdd = (e) => {
      const w = e.detail;
      if (!w || !w.id) return;
      setWidgets((arr) => {
        const exists = arr.some(x => x.id === w.id);
        return exists ? arr.map(x => x.id === w.id ? w : x) : arr.concat(w);
      });
    };
    window.addEventListener("hud-add-widget", onAdd);
    return () => window.removeEventListener("hud-add-widget", onAdd);
  }, []);

  return (
    <div className="pointer-events-none absolute inset-0 z-[2]" aria-hidden style={{ padding: "76px 24px 24px 24px" }}>
      <div className="grid gap-14" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", maxWidth: 1600, margin: "0 auto" }}>
        {widgets.map(w => <HUDCard key={w.id} w={w} />)}
      </div>
    </div>
  );
}

function HUDCard({ w }) {
  const [value, setValue] = useState(null);
  const [trend, setTrend] = useState([]);

  useEffect(() => {
    let alive = true;
    const gen = () => {
      const v = Math.round((w.sim?.base ?? 1000) * (0.9 + Math.random()*0.2));
      const t = Array.from({length: 24}, ()=> Math.round(v*(0.95+Math.random()*0.1)));
      if (alive){ setValue(v); setTrend(t); }
    };
    gen();
    const id = setInterval(gen, w.refreshMs ?? 8000);
    return () => { alive = false; clearInterval(id); };
  }, [w.refreshMs, w.sim?.base]);

  return (
    <div className="pointer-events-auto"
      style={{
        borderRadius: 16,
        border: "1px solid rgba(22,224,255,.28)",
        background: "linear-gradient(180deg, rgba(10,16,28,.82), rgba(10,16,28,.72))",
        boxShadow: "0 22px 80px rgba(0,0,0,.45), 0 0 22px rgba(22,224,255,.16), inset 0 0 0 1px rgba(255,255,255,.05)",
        padding: 16,
      }}>
      <div className="flex items-start justify-between">
        <div>
          <div style={{opacity:.7, fontSize:12, marginBottom:2}}>{w.category}</div>
          <div style={{fontSize:18, fontWeight:800}}>{w.title}</div>
          {w.subtitle && <div style={{opacity:.75, fontSize:13}}>{w.subtitle}</div>}
        </div>
        <button title="Remove from HUD" onClick={() => {
          const arr = JSON.parse(localStorage.getItem(LSK) || "[]");
          const out = arr.filter(x => x.id !== w.id);
          localStorage.setItem(LSK, JSON.stringify(out));
          window.dispatchEvent(new CustomEvent("hud-add-widget", { detail: {} })); // trigger refresh
        }}
          style={{ borderRadius:8, width:28, height:28, border:"1px solid rgba(22,224,255,.28)", background:"rgba(255,255,255,.04)", color:"#d7f6ff" }}>✕</button>
      </div>

      <div style={{display:"flex", alignItems:"baseline", gap:10, marginTop:14}}>
        <div style={{fontSize:36, fontWeight:900}}>
          {value == null ? "—" : w.formatValue ? w.formatValue(value) : value.toLocaleString()}
        </div>
        {w.unit && <div style={{opacity:.8, fontWeight:700}}>{w.unit}</div>}
      </div>

      <div style={{height:56, marginTop:10, position:"relative"}}>
        <svg viewBox="0 0 100 30" preserveAspectRatio="none" style={{position:"absolute", inset:0}}>
          <polyline fill="none" stroke="currentColor" strokeWidth="2"
            points={trend.map((v,i,arr)=>{
              const x = (i/(arr.length-1))*100;
              const y = 30 - ((v - Math.min(...arr)) / (Math.max(...arr)-Math.min(...arr)+1e-6)) * 28 - 1;
              return `${x},${y}`;
            }).join(" ")}
          />
        </svg>
      </div>

      {w.help && <div style={{opacity:.75, fontSize:12, marginTop:10}}>{w.help}</div>}
    </div>
  );
}
m