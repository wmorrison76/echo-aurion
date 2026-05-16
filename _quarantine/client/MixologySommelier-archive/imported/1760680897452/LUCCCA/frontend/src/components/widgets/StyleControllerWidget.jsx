import React, { useEffect, useState } from "react";

/**
 * StyleControllerWidget
 * - Writes CSS variables to :root so every panel can use consistent tokens
 * - Preview dark/light/auto before applying (local live preview)
 * - Persists to localStorage and broadcasts "lu:design:updated"
 *
 * Usage in your CSS/Tailwind:
 *   box-shadow: var(--panel-shadow);
 *   border-radius: var(--panel-radius);
 *   --tab-active-color, --tab-border, etc.
 */

const KEY = "lu:design:vars";

const DEFAULTS = {
  "--panel-radius": "16px",
  "--panel-ring": "0 0 0 1px rgba(255,255,255,.06)",
  "--panel-shadow": "0 22px 80px rgba(0,0,0,.45), 0 0 22px rgba(22,224,255,.16)",
  "--panel-bg": "rgba(15,19,28,0.9)",
  "--panel-bg-subtle": "rgba(255,255,255,0.05)",
  "--accent": "#16E0FF",
  "--tab-height": "36px",
  "--tab-radius": "10px",
  "--tab-active-bg": "rgba(255,255,255,0.10)",
  "--tab-border": "1px solid rgba(255,255,255,0.12)",
  "--mode": "dark", // dark | light | auto
};

export default function StyleControllerWidget(){
  const [vars, setVars] = useState(()=> {
    try { return { ...DEFAULTS, ...(JSON.parse(localStorage.getItem(KEY) || "{}")) }; }
    catch { return DEFAULTS; }
  });

  // live-apply to :root
  useEffect(()=> {
    const root = document.documentElement;
    Object.entries(vars).forEach(([k,v]) => root.style.setProperty(k, v));
  }, [vars]);

  const save = () => {
    localStorage.setItem(KEY, JSON.stringify(vars));
    window.dispatchEvent(new CustomEvent("lu:design:updated", { detail: vars }));
  };

  const set = (k) => (e) => setVars(v => ({ ...v, [k]: e.target.value }));

  return (
    <div className="rounded-2xl p-3 border border-white/12 bg-white/5">
      <div className="font-semibold mb-2">Style Controller</div>

      <div className="grid gap-3" style={{gridTemplateColumns:"1fr 1fr"}}>
        <label className="flex flex-col gap-1">
          <span className="text-xs opacity-80">Accent</span>
          <input type="text" className="settings-input" value={vars["--accent"]} onChange={set("--accent")} />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs opacity-80">Panel radius</span>
          <input type="text" className="settings-input" value={vars["--panel-radius"]} onChange={set("--panel-radius")} />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs opacity-80">Tab height</span>
          <input type="text" className="settings-input" value={vars["--tab-height"]} onChange={set("--tab-height")} />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs opacity-80">Tab active bg</span>
          <input type="text" className="settings-input" value={vars["--tab-active-bg"]} onChange={set("--tab-active-bg")} />
        </label>
      </div>

      <div className="grid gap-3 mt-3" style={{gridTemplateColumns:"1fr 1fr"}}>
        <label className="flex flex-col gap-1">
          <span className="text-xs opacity-80">Mode</span>
          <select className="settings-input" value={vars["--mode"]} onChange={set("--mode")}>
            <option value="dark">Dark</option>
            <option value="light">Light</option>
            <option value="auto">Auto</option>
          </select>
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs opacity-80">Panel bg</span>
          <input type="text" className="settings-input" value={vars["--panel-bg"]} onChange={set("--panel-bg")} />
        </label>
      </div>

      <div className="flex gap-2 mt-3">
        <button className="dw-btn dw-btn--primary px-3 py-1 rounded" onClick={save}>Apply</button>
        <button className="dw-btn px-3 py-1 rounded" onClick={()=>setVars(DEFAULTS)}>Reset</button>
      </div>
    </div>
  );
}
