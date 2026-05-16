import React, { useEffect, useState } from "react";

const KEY = "lu:connections:v1";
const PROVIDERS = [
  { id:"toast",    name:"Toast POS" },
  { id:"square",   name:"Square for Restaurants" },
  { id:"lightspeed", name:"Lightspeed Restaurant" },
  { id:"touchbistro", name:"TouchBistro" },
  { id:"clover",   name:"Clover" },
  { id:"revel",    name:"Revel Systems" },
  { id:"eposnow",  name:"Epos Now" },
  { id:"lavu",     name:"Lavu" },
  { id:"spoton",   name:"SpotOn" },
  { id:"shopify",  name:"Shopify POS" },
];

export default function AdminConnections({ onClose }) {
  const [list, setList] = useState(()=> {
    try { return JSON.parse(localStorage.getItem(KEY) || "[]"); } catch { return []; }
  });
  const [draft, setDraft] = useState({ provider:"toast", label:"Main Outlet", apiKey:"", locationId:"" });

  useEffect(()=>{ localStorage.setItem(KEY, JSON.stringify(list)); }, [list]);

  const add = () => {
    if (!draft.apiKey.trim()) return alert("API Key required");
    const id = `${draft.provider}:${(draft.label||"").trim() || "Default"}`;
    const item = { id, ...draft };
    setList(arr => {
      const exists = arr.some(x=>x.id===id);
      return exists ? arr.map(x=>x.id===id?item:x) : arr.concat(item);
    });
    alert("Saved. Widgets can now use this connection.");
  };

  const test = async () => {
    // dry-run “ping” simulation (replace with real tiny fetch when integrating)
    await new Promise(r=>setTimeout(r, 400));
    alert("Connection looks good (simulated).");
  };

  return (
    <div style={{
      position:"absolute", inset:0, display:"grid", placeItems:"center", zIndex:1500,
      background:"rgba(0,0,0,.45)", backdropFilter:"blur(3px)"
    }}>
      <div style={{
        width:600, borderRadius:16, padding:16,
        background:"linear-gradient(180deg, rgba(10,16,28,.96), rgba(10,16,28,.9))",
        border:"1px solid rgba(22,224,255,.28)",
        boxShadow:"0 30px 100px rgba(0,0,0,.5), 0 0 22px rgba(22,224,255,.16), inset 0 0 0 1px rgba(255,255,255,.05)"
      }}>
        <div className="flex items-center justify-between mb-2">
          <div style={{fontWeight:900, fontSize:18}}>Admin · Connections</div>
          <button onClick={onClose} className="dw-btn px-2 py-1 rounded">Close</button>
        </div>

        <div className="grid" style={{gridTemplateColumns:"1fr 1fr", gap:12}}>
          <label className="flex flex-col gap-1">
            <span className="text-sm opacity-80">Provider</span>
            <select className="dw-input" value={draft.provider} onChange={e=>setDraft({...draft,provider:e.target.value})}>
              {PROVIDERS.map(p=> <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-sm opacity-80">Label</span>
            <input className="dw-input" value={draft.label} onChange={e=>setDraft({...draft,label:e.target.value})}/>
          </label>
          <label className="flex flex-col gap-1" style={{gridColumn:"1/-1"}}>
            <span className="text-sm opacity-80">API Key / Token</span>
            <input className="dw-input" value={draft.apiKey} onChange={e=>setDraft({...draft,apiKey:e.target.value})}/>
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-sm opacity-80">Location / Store ID</span>
            <input className="dw-input" value={draft.locationId} onChange={e=>setDraft({...draft,locationId:e.target.value})}/>
          </label>
          <div className="flex items-end gap-2">
            <button className="dw-btn px-3 py-1 rounded" onClick={test}>Test</button>
            <button className="dw-btn dw-btn--primary px-3 py-1 rounded" onClick={add}>Save</button>
          </div>
        </div>

        <div className="mt-4">
          <div className="opacity-80 text-sm mb-1">Saved connections</div>
          <div className="flex flex-col gap-2">
            {list.length === 0 && <div className="opacity-60 text-sm">None yet.</div>}
            {list.map(x=>(
              <div key={x.id} className="flex items-center justify-between"
                   style={{padding:"8px 10px", border:"1px solid rgba(22,224,255,.2)", borderRadius:10}}>
                <div className="text-sm">
                  <b>{x.label}</b> · {x.provider} · <span className="opacity-80">{x.locationId || "—"}</span>
                </div>
                <button className="dw-btn px-2 py-1 rounded"
                  onClick={()=> setList(arr=>arr.filter(i=>i.id!==x.id))}>Remove</button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
