import React, { useEffect, useMemo, useRef, useState } from "react";
import { all, find } from "./commands";

export function CommandPalette(){
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const inputRef = useRef<HTMLInputElement|null>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const isMac = navigator.platform.toUpperCase().includes("MAC");
      if ((isMac ? e.metaKey : e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault(); setOpen(v => !v);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => { if (open) setTimeout(()=>inputRef.current?.focus(), 0); else setQ(""); }, [open]);

  const items = useMemo(() => (q ? find(q) : all()), [q]);
  const run = (fn: Function) => { setOpen(false); Promise.resolve().then(()=>fn()); };

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[1600] bg-black/50" onClick={()=>setOpen(false)}>
      <div className="mx-auto mt-24 w-[min(720px,calc(100vw-40px))] rounded-xl overflow-hidden"
           style={{ background:"rgba(13,18,29,.96)", border:"1px solid rgba(255,255,255,.08)", boxShadow:"0 40px 120px rgba(0,0,0,.5)" }}
           onClick={(e)=>e.stopPropagation()}>
        <div className="p-2 border-b border-white/10">
          <input ref={inputRef} value={q} onChange={e=>setQ(e.target.value)} placeholder="Search commands…"
                 className="w-full bg-transparent outline-none text-[15px] px-2 py-2"/>
        </div>
        <div className="max-h-[50vh] overflow-auto">
          {items.length===0 && <div className="p-3 text-sm opacity-70">No commands.</div>}
          {items.map(c => (
            <button key={c.id} className="w-full text-left px-3 py-2 hover:bg-white/5 text-[15px]" onClick={()=>run(c.run)}>
              <div className="font-medium">{c.title}</div>
              {c.group && <div className="text-xs opacity-60">{c.group}</div>}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
