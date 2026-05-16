// src/components/settings/sections/Appearance.jsx
import React, { useEffect, useMemo, useState } from "react";
import { setPreset, applyThemeVars } from "../settingsBus.js";
// Small input control
function Field({ label, value, onChange, placeholder, className }) {
  return (
    <label className={`block ${className || ""}`}>
      <div className="text-sm opacity-75 mb-1">{label}</div>
      <input
        className="settings-input"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </label>
  );
}

export default function Appearance() {
  const [t, setT] = useState(() => getTweaks());

  // apply live as user types
  useEffect(() => saveTweaks(t), [t]);

  const presets = useMemo(() => ([
    { id: "nightfall",      label: "Nightfall" },
    { id: "glasslight",     label: "Glasslight" },
    { id: "neonwave",       label: "Neonwave" },
    { id: "colorblindSafe", label: "Colorblind safe" },
  ]), []);

  return (
    <div className="space-y-6">
      {/* Presets */}
      <section className="rounded-xl p-5 border border-white/10 bg-[var(--panel-bg)] shadow-[var(--panel-glow)]">
        <h3 className="text-xl font-semibold mb-3">Theme presets</h3>
        <div className="flex flex-wrap gap-2">
          {presets.map((p) => (
            <button key={p.id}
              onClick={() => { setPreset(p.id); setT(getTweaks()); }}
              className={`px-3 h-9 rounded-lg border ${t.preset===p.id
                ? "border-[var(--ring)] bg-[color-mix(in_srgb,var(--ring) 10%,transparent)]"
                : "border-white/15 hover:bg-white/5"}`}>
              {p.label}
            </button>
          ))}
        </div>
        <p className="text-sm opacity-70 mt-3">
          Presets are starting points; you can still tweak details below. “Colorblind safe” uses blue/orange accents and higher luminance contrast.
        </p>
      </section>

      {/* Panel chrome */}
      <section className="rounded-xl p-5 border border-white/10 bg-[var(--panel-bg)] shadow-[var(--panel-glow)]">
        <h3 className="text-xl font-semibold mb-4">Panel chrome</h3>
        <div className="grid md:grid-cols-4 gap-4">
          <Field label="Border width" placeholder="e.g. 1px or 2px"
            value={t.borderWidth} onChange={(v)=>setT({ ...t, borderWidth: v })}/>
          <Field label="Border color" placeholder="rgba(...)"
            value={t.borderColor} onChange={(v)=>setT({ ...t, borderColor: v })}/>
          <Field label="Glow (shadow px)" placeholder="24"
            value={t.glowPx} onChange={(v)=>setT({ ...t, glowPx: v })}/>
          <Field label="Header height" placeholder="44px"
            value={t.headerHeight} onChange={(v)=>setT({ ...t, headerHeight: v })}/>
        </div>
      </section>

      {/* Typography */}
      <section className="rounded-xl p-5 border border-white/10 bg-[var(--panel-bg)] shadow-[var(--panel-glow)]">
        <h3 className="text-xl font-semibold mb-4">Typography</h3>
        <div className="grid md:grid-cols-3 gap-4">
          <Field label="Base size"  placeholder="14px"
            value={t.baseSize}  onChange={(v)=>setT({ ...t, baseSize: v })}/>
          <Field label="Title size" placeholder="18px"
            value={t.titleSize} onChange={(v)=>setT({ ...t, titleSize: v })}/>
          <Field label="Accent color" placeholder="#46e6ff"
            value={t.accent}    onChange={(v)=>setT({ ...t, accent: v })}/>
        </div>
      </section>
    </div>
  );
}

/* Notes:
   - The settings-input class is added by WidgetSettingsPanel.jsx (tiny tokens).
   - Any change auto-saves via saveTweaks(t) and applies across the app.
*/
