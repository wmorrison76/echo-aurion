// src/components/settings/sections/General.jsx
import React, { useEffect, useState } from "react";
import { applyTheme, getSelectedThemeId, setTweaks } from "@/lib/theme";

export default function General(){
  const [compact, setCompact] = useState(() => localStorage.getItem("lu:ui:compact")==="1");
  const [motion, setMotion]   = useState(() => localStorage.getItem("lu:ui:reduceMotion")==="1");

  useEffect(()=>{
    document.documentElement.classList.toggle("compact", compact);
    try { localStorage.setItem("lu:ui:compact", compact ? "1" : "0"); } catch {}
  },[compact]);

  useEffect(()=>{
    document.documentElement.classList.toggle("reduce-motion", motion);
    try { localStorage.setItem("lu:ui:reduceMotion", motion ? "1" : "0"); } catch {}
  },[motion]);

  const resetTheme = ()=>{
    setTweaks({});              // clear overrides
    applyTheme(getSelectedThemeId()); // re-apply current preset
  };

  return (
    <div className="space-y-6">
      <section className="dw-panel p-4">
        <div className="text-xl font-semibold mb-3">General</div>
        <label className="flex items-center gap-3">
          <input type="checkbox" className="settings-switch" checked={compact} onChange={e=>setCompact(e.target.checked)} />
          <span>Compact density</span>
        </label>
        <label className="flex items-center gap-3 mt-3">
          <input type="checkbox" className="settings-switch" checked={motion} onChange={e=>setMotion(e.target.checked)} />
          <span>Reduce motion</span>
        </label>

        <div className="mt-6">
          <button className="px-3 h-9 rounded-lg border border-white/20 hover:border-white/35"
                  onClick={resetTheme}>
            Reset theme tweaks
          </button>
        </div>
      </section>
    </div>
  );
}
