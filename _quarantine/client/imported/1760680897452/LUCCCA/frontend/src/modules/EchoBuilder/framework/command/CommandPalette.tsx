import React, { useEffect, useMemo, useRef, useState } from "react";
import { all, find } from "./commands";

function useHotkey(key = "k", meta = true) {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((meta ? (e.metaKey || e.ctrlKey) : true) && e.key.toLowerCase() === key && !e.shiftKey && !e.altKey) {
        e.preventDefault(); setOpen(v => !v);
      }
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [key, meta]);
  return { open, setOpen };
}

export function CommandPalette() {
  const { open, setOpen } = useHotkey("k", true);
  const [q, setQ] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 0);
  }, [open]);

  const list = useMemo(() => q ? find(q) : all(), [q]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[2000]" aria-modal>
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setOpen(false)} />
      <div className="absolute left-1/2 top-24 -translate-x-1/2 w-[680px] max-w-[92vw]
                      rounded-2xl border border-white/12 bg-[rgba(13,18,29,.96)]
                      shadow-[0_40px_140px_rgba(0,0,0,.6),inset_0_0_0_1px_rgba(255,255,255,.04)]">
        <div className="p-3 border-b border-white/10">
          <input ref={inputRef} value={q} onChange={(e)=>setQ(e.target.value)}
            className="w-full text-[15px] leading-7 bg-white/6 border border-white/10 rounded-xl px-3 h-9 outline-none"
            placeholder="Type a command… (⌘K)"/>
        </div>
        <div className="max-h-[50vh] overflow-auto">
          {list.length===0 && <div className="p-3 text-sm opacity-70">No commands.</div>}
          {list.map((c) => (
            <button key={c.id}
              onClick={async()=>{ await c.run(); setOpen(false);}}
              className="w-full text-left px-3 py-2 hover:bg-white/6 border-b border-white/5 last:border-0">
              <div className="font-medium">{c.title}</div>
              {c.shortcut && <div className="text-xs opacity-70">{c.shortcut}</div>}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

export default CommandPalette;
