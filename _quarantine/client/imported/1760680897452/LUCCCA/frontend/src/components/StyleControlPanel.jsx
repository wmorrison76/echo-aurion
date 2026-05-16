import React,{useEffect,useState} from "react";
import { initTheme, previewTheme, commitTheme, resetTheme } from "@/lib/themeEngine";
export default function StyleControlPanel({ extraControls=false }){
  const [draft,setDraft]=useState(()=>initTheme());
  const [preview,setPreview]=useState(false);
  useEffect(()=>{ if(preview) previewTheme(draft); },[draft,preview]);
  const F=[["mode","Mode","select",["auto","dark","light"]],["--accent","Accent","text"],["--font-xs","XS","text"],["--font-sm","SM","text"],["--font-md","MD","text"],["--font-lg","LG","text"],["--font-xl","XL","text"]];
  const on=(k)=>(e)=>setDraft(d=>({...d,[k]:e.target.value}));
  return(<div className="space-y-3">
    <ThemePacks draft={draft} setDraft={setDraft}/>
    <ExportImport draft={draft} setDraft={setDraft}/>

    {extraControls && <A11yBlock/>}

    <div className="text-lg font-semibold">Appearance</div>
    <div className="grid gap-3" style={{gridTemplateColumns:"repeat(4,minmax(0,1fr))"}}>
      {F.map(([k,l,t,opts])=> <label key={k} className="flex flex-col gap-1"><span className="text-sm opacity-80">{l}</span>
        {t==="select"?<select className="dw-input" value={draft[k]} onChange={on(k)}>{opts.map(o=><option key={o}>{o}</option>)}</select>:<input className="dw-input" value={draft[k]} onChange={on(k)}/>}
      </label>)}
    </div>
    <div className="flex gap-2">
      {!preview && <button className="dw-btn dw-btn--primary px-3 py-1 rounded" onClick={()=>{setPreview(true);previewTheme(draft);}}>Preview</button>}
      {preview && <>
        <button className="dw-btn dw-btn--primary px-3 py-1 rounded" onClick={()=>{commitTheme(draft);setPreview(false);}}>Apply</button>
        <button className="dw-btn px-3 py-1 rounded" onClick={()=>{initTheme();setPreview(false);}}>Cancel</button>
      </>}
      <button className="dw-btn px-3 py-1 rounded" onClick={()=>{resetTheme();setDraft(initTheme());}}>Reset</button>
    </div>
  </div>);}


function A11yBlock(){
  const doc = document.documentElement;
  const setContrast = (on)=>{ doc.setAttribute("data-a11y-contrast", on?"high":"normal"); };
  const applyPalette = (p)=>{
    for (const [k,v] of Object.entries(p)) doc.style.setProperty(k, v);
  };
  const presets = {
    Deuteranopia: { "--accent":"#0072B2", "--text-strong":"#ffffff", "--bg-panel":"#0f141a" },
    Protanopia:   { "--accent":"#009E73", "--text-strong":"#ffffff", "--bg-panel":"#0f141a" },
    Tritanopia:   { "--accent":"#D55E00", "--text-strong":"#ffffff", "--bg-panel":"#0f141a" },
  };
  return (
    <div className="dw-panel p-3 space-y-2">
      <div className="text-md font-semibold">Accessibility</div>
      <div className="flex gap-2 items-center">
        <button className="dw-btn px-3 py-1 rounded" onClick={()=>setContrast(true)}>High Contrast On</button>
        <button className="dw-btn px-3 py-1 rounded" onClick={()=>setContrast(false)}>High Contrast Off</button>
      </div>
      <div className="flex gap-2 items-center">
        {Object.keys(presets).map(k=>(
          <button key={k} className="dw-btn px-3 py-1 rounded" onClick={()=>applyPalette(presets[k])}>
            {k} palette
          </button>
        ))}
      </div>
    </div>
  );
}


function ThemePacks({draft,setDraft}){
  const packs = {
    Night: {"mode":"dark","--accent":"#16E0FF","--bg-panel":"rgba(10,14,20,.92)","--text-strong":"#EAF7FB"},
    Daylight: {"mode":"light","--accent":"#0F73FF","--bg-panel":"rgba(246,248,250,.92)","--text-strong":"#0b2230"},
    Champagne: {"mode":"light","--accent":"#C5A572","--bg-panel":"rgba(250,247,240,.92)","--text-strong":"#2a251d"}
  };
  const apply=(k)=>setDraft(d=>({...d,...packs[k]}));
  return (
    <div className="dw-panel p-3 space-y-2">
      <div className="text-md font-semibold">Theme Packs</div>
      <div className="flex gap-2 flex-wrap">
        {Object.keys(packs).map(k=>(
          <button key={k} className="dw-btn px-3 py-1 rounded" onClick={()=>apply(k)}>{k}</button>
        ))}
      </div>
    </div>
  );
}

function ExportImport({draft,setDraft}){
  const exportJson=()=>{
    const blob=new Blob([JSON.stringify(draft,null,2)],{type:"application/json"});
    const a=document.createElement("a");
    a.href=URL.createObjectURL(blob);
    a.download="luccca-theme.json";
    a.click();
    URL.revokeObjectURL(a.href);
  };
  const importJson=(file)=>{
    const r=new FileReader();
    r.onload=()=>{ try{ const obj=JSON.parse(r.result); setDraft(d=>({...d,...obj})); }catch(e){ alert("Invalid theme JSON"); } };
    r.readAsText(file);
  };
  return (
    <div className="dw-panel p-3 space-y-2">
      <div className="text-md font-semibold">Export / Import</div>
      <div className="flex items-center gap-2">
        <button className="dw-btn px-3 py-1 rounded" onClick={exportJson}>Export JSON</button>
        <label className="dw-btn px-3 py-1 rounded cursor-pointer">Import…
          <input type="file" accept="application/json" className="hidden" onChange={e=>e.target.files?.[0]&&importJson(e.target.files[0])}/>
        </label>
      </div>
    </div>
  );
}
