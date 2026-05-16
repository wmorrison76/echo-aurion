// src/settings/SettingsSuite.jsx
import React, { useEffect, useMemo, useState } from "react";

// central theme engine (relative path confirmed)
import {
  registerTheme,
  listThemes,
  selectTheme,
  setTweaks,
  getTweaks,
  getSelectedThemeId,
  applyTheme,
} from "../lib/theme";

// Avatar presets (your working paths)
import EchoF from "../assets/Echo_F.png";
import EchoB from "../assets/Echo_B.png";
import EchoM from "../assets/Echo_M.png";
import EchoR from "../assets/Echo_R.png";

/* ----------------------------------------------------------------------------
   Register extra pro themes with full chrome variables
----------------------------------------------------------------------------- */
const EXTRA_THEMES = {
  aurora: {
    mode: "dark",
    "--bg":"#0b0f17",
    "--panel":"linear-gradient(180deg, rgba(25,35,55,.85), rgba(15,22,38,.92))",
    "--text":"rgba(235,245,255,.96)",
    "--muted":"rgba(215,230,255,.72)",
    "--accent":"#8be9fd",
    "--ring":"rgba(139,233,253,.45)",
    "--shadow":"0 40px 120px rgba(0,0,0,.55)",
    "--panel-border-color":"rgba(255,255,255,.15)",
    "--panel-border-width":"1px",
    "--base-size":"14px",
    "--title-size":"18px",
    "--sidebar-bg":"rgba(14,20,32,.96)",
    "--sidebar-text":"rgba(235,245,255,.94)",
    "--header-bg":"rgba(12,18,28,.96)",
    "--header-text":"rgba(240,246,255,.96)",
  },
  obsidian: {
    mode: "dark",
    "--bg":"#121212",
    "--panel":"rgba(28,28,28,.95)",
    "--text":"rgba(245,245,245,.95)",
    "--muted":"rgba(200,200,200,.70)",
    "--accent":"#bb86fc",
    "--ring":"rgba(187,134,252,.40)",
    "--shadow":"0 32px 100px rgba(0,0,0,.70)",
    "--panel-border-color":"rgba(255,255,255,.16)",
    "--panel-border-width":"1px",
    "--base-size":"14px",
    "--title-size":"18px",
    "--sidebar-bg":"rgba(20,20,20,.96)",
    "--sidebar-text":"rgba(245,245,245,.94)",
    "--header-bg":"rgba(20,20,20,.96)",
    "--header-text":"rgba(250,250,250,.96)",
  },
  horizon: {
    mode: "dark",
    "--bg":"#1c1e26",
    "--panel":"linear-gradient(180deg, rgba(35,39,55,.88), rgba(28,32,48,.95))",
    "--text":"#f5f5f5",
    "--muted":"rgba(240,240,240,.70)",
    "--accent":"#ff6e6e",
    "--ring":"rgba(255,110,110,.40)",
    "--shadow":"0 36px 110px rgba(0,0,0,.60)",
    "--panel-border-color":"rgba(255,255,255,.18)",
    "--panel-border-width":"1px",
    "--base-size":"14px",
    "--title-size":"18px",
    "--sidebar-bg":"rgba(22,25,36,.96)",
    "--sidebar-text":"rgba(245,245,245,.94)",
    "--header-bg":"rgba(22,25,36,.96)",
    "--header-text":"#f5f5f5",
  },
  glacier: {
    mode: "dark",
    "--bg":"#0e141b",
    "--panel":"linear-gradient(160deg, rgba(24,34,48,.92), rgba(16,24,36,.96))",
    "--text":"rgba(235,245,255,.96)",
    "--muted":"rgba(200,220,240,.70)",
    "--accent":"#4fd1c5",
    "--ring":"rgba(79,209,197,.40)",
    "--shadow":"0 30px 90px rgba(0,0,0,.55)",
    "--panel-border-color":"rgba(255,255,255,.16)",
    "--panel-border-width":"1px",
    "--base-size":"14px",
    "--title-size":"18px",
    "--sidebar-bg":"rgba(14,20,30,.96)",
    "--sidebar-text":"rgba(235,245,255,.94)",
    "--header-bg":"rgba(14,20,30,.96)",
    "--header-text":"rgba(240,246,255,.96)",
  },
  midnightGold: {
    mode: "dark",
    "--bg":"#101010",
    "--panel":"rgba(22,22,22,.94)",
    "--text":"rgba(250,250,250,.94)",
    "--muted":"rgba(230,230,230,.70)",
    "--accent":"#fcbf49",
    "--ring":"rgba(252,191,73,.42)",
    "--shadow":"0 40px 120px rgba(0,0,0,.70)",
    "--panel-border-color":"rgba(252,191,73,.34)",
    "--panel-border-width":"2px",
    "--base-size":"14px",
    "--title-size":"18px",
    "--sidebar-bg":"rgba(16,16,16,.96)",
    "--sidebar-text":"rgba(250,250,250,.94)",
    "--header-bg":"rgba(16,16,16,.96)",
    "--header-text":"rgba(255,255,255,.96)",
  },
};
Object.entries(EXTRA_THEMES).forEach(([id, vars]) => registerTheme(id, vars));

/* ----------------------------------------------------------------------------
   UI chrome
----------------------------------------------------------------------------- */
const SECTIONS = [
  { id: "general",      icon: "⚙️", label: "General" },
  { id: "appearance",   icon: "🎨", label: "Appearance" },
  { id: "notifications",icon: "🔔", label: "Notifications" },
  { id: "accounts",     icon: "👤", label: "Accounts" },
  { id: "advanced",     icon: "🧪", label: "Advanced" },
  { id: "zaro",         icon: "🛡️", label: "Super Admin (ZARO)" },
];

const PRESET_AVATARS = [
  { id: "echo-f", url: EchoF },
  { id: "echo-b", url: EchoB },
  { id: "echo-m", url: EchoM },
  { id: "echo-r", url: EchoR },
];

const labelFromId = (id) =>
  ({
    nightfall: "Nightfall",
    glasslight: "Glasslight",
    neonwave: "Neonwave",
    highContrast: "High contrast",
    colorblindSafe: "Colorblind safe",
    aurora: "Aurora",
    obsidian: "Obsidian",
    horizon: "Horizon",
    glacier: "Glacier",
    midnightGold: "Midnight Gold",
  }[id] || id.replace(/([a-z])([A-Z])/g, "$1 $2").replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()));

function SectionCard({ title, children }) {
  return (
    <section className="panel rounded-2xl p-4">
      <div className="text-lg font-semibold mb-3">{title}</div>
      {children}
    </section>
  );
}

function LabeledInput({ label, value, onChange, placeholder }) {
  return (
    <label className="text-[13px] grid gap-1">
      <span className="opacity-80">{label}</span>
      <input
        className="h-9 px-3 rounded-lg bg-white/5 border border-white/12 focus:outline-none focus:border-cyan-300/60"
        value={value}
        onChange={(e)=>onChange(e.target.value)}
        placeholder={placeholder}
      />
    </label>
  );
}

export default function SettingsSuite() {
  const [section, setSection] = useState("appearance");

  const [themeId, setThemeId] = useState(() => getSelectedThemeId?.() || "nightfall");
  const [tweaks, setTweaksState] = useState(() => getTweaks() || {});
  const [avatar, setAvatar] = useState(() => {
    try { return JSON.parse(localStorage.getItem("lu:avatar") || "null") || PRESET_AVATARS[0]; }
    catch { return PRESET_AVATARS[0]; }
  });
  const [avatarPickerOpen, setAvatarPickerOpen] = useState(false);
  const [zaroUrl, setZaroUrl] = useState(() => localStorage.getItem("lu:zaro:url") || "/admin/zaro");

  const themeIds = useMemo(() => listThemes(), []);

  useEffect(() => { selectTheme(themeId); }, [themeId]);
  useEffect(() => { setTweaks(tweaks); }, [tweaks]);
  useEffect(() => {
    window.dispatchEvent(new CustomEvent("lu:settings:apply", { detail: { vars: tweaks, avatar } }));
  }, [tweaks, avatar]);

  // avatar ops
  const onUpload = (file) => {
    if (!file) return;
    const r = new FileReader();
    r.onload = () => {
      const custom = { id: "custom", url: r.result };
      setAvatar(custom);
      localStorage.setItem("lu:avatar", JSON.stringify(custom));
      setAvatarPickerOpen(false);
    };
    r.readAsDataURL(file);
  };
  const usePresetAvatar = (a) => {
    setAvatar(a);
    localStorage.setItem("lu:avatar", JSON.stringify(a));
    setAvatarPickerOpen(false);
  };

  const setTweakVar = (name, value) => setTweaksState(prev => ({ ...prev, [name]: value }));

  const saveZaroUrl = () => localStorage.setItem("lu:zaro:url", zaroUrl || "/admin/zaro");

  return (
    <div className="h-full w-full grid" style={{ gridTemplateColumns: "280px 1fr" }}>
      {/* Sidebar */}
      <aside className="sidebar border-r border-white/10 p-4 overflow-y-auto">
        <div className="text-xl font-semibold mb-3">Settings</div>
        <nav className="grid gap-1">
          {SECTIONS.map(s => (
            <button
              key={s.id}
              onClick={() => setSection(s.id)}
              className={`flex items-center gap-2 px-3 h-9 rounded-lg text-left
                ${section===s.id ? "bg-white/10 ring-1 ring-white/20" : "hover:bg-white/5"}`}
            >
              <span className="w-5 text-center">{s.icon}</span>
              <span>{s.label}</span>
            </button>
          ))}
        </nav>
      </aside>

      {/* Content */}
      <main className="p-6 overflow-y-auto">
        {section === "general" && (
          <SectionCard title="Profile">
            <div className="flex items-center gap-4">
              <img src={avatar?.url} alt="" className="h-16 w-16 rounded-xl object-cover ring-1 ring-white/15"/>
              <div className="grid gap-2">
                <div className="text-sm opacity-80">Avatar</div>
                <div className="flex gap-2">
                  <button className="px-3 h-9 rounded-lg border border-white/20 hover:border-white/35"
                          onClick={() => setAvatarPickerOpen(true)}>
                    Edit…
                  </button>
                  {avatar?.id==="custom" && (
                    <button className="px-3 h-9 rounded-lg border border-white/20 hover:border-white/35"
                            onClick={() => usePresetAvatar(PRESET_AVATARS[0])}>
                      Remove upload
                    </button>
                  )}
                </div>
              </div>
            </div>
          </SectionCard>
        )}

        {section === "appearance" && (
          <div className="grid gap-6 md:grid-cols-3">
            <SectionCard title="Theme">
              <div className="grid gap-2">
                {themeIds.map(id => (
                  <button
                    key={id}
                    onClick={() => setThemeId(id)}
                    className={`text-left px-3 py-2 rounded-lg border bg-white/5
                      ${themeId===id ? "border-cyan-400/60 outline outline-2 outline-cyan-300/50"
                                      : "border-white/12 hover:border-white/25"}`}
                  >
                    {labelFromId(id)}
                  </button>
                ))}
              </div>
              <p className="text-[11px] opacity-70 mt-2">
                Themes are starting points; tweak details on the right.
              </p>
            </SectionCard>

            <SectionCard title="Panel chrome">
              <div className="grid gap-3">
                <LabeledInput label="Border width"  value={tweaks["--panel-border-width"] ?? ""} onChange={v=>setTweakVar("--panel-border-width", v)} placeholder="e.g. 1px or 2px"/>
                <LabeledInput label="Border color"  value={tweaks["--panel-border-color"] ?? ""} onChange={v=>setTweakVar("--panel-border-color", v)} placeholder="rgba(...)"/>
                <LabeledInput label="Glow (shadow px)" value={tweaks["--shadow"] ?? ""} onChange={v=>setTweakVar("--shadow", v)} placeholder="0 0 24px rgba(...)"/>
                <LabeledInput label="Header (title) size" value={tweaks["--title-size"] ?? ""} onChange={v=>setTweakVar("--title-size", v)} placeholder="44px"/>
              </div>
            </SectionCard>

            <SectionCard title="Typography">
              <div className="grid gap-3">
                <LabeledInput label="Base size"  value={tweaks["--base-size"] ?? ""} onChange={v=>setTweakVar("--base-size", v)} placeholder="14px"/>
                <LabeledInput label="Title size" value={tweaks["--title-size"] ?? ""} onChange={v=>setTweakVar("--title-size", v)} placeholder="18px"/>
              </div>
              <div className="mt-6">
                <button className="px-3 h-9 rounded-lg border border-white/20 hover:border-white/35"
                        onClick={() => { setTweaksState({}); setTweaks({}); applyTheme(themeId); }}>
                  Reset theme tweaks
                </button>
              </div>
            </SectionCard>
          </div>
        )}

        {section === "notifications" && (
          <SectionCard title="Notifications">
            <p className="opacity-80 text-sm">(stub) Configure toast sounds, DND schedule, and message previews here.</p>
          </SectionCard>
        )}

        {section === "accounts" && (
          <SectionCard title="Accounts">
            <p className="opacity-80 text-sm">(stub) Sign-in methods and connected services.</p>
          </SectionCard>
        )}

        {section === "advanced" && (
          <SectionCard title="Advanced">
            <p className="opacity-80 text-sm">(stub) Experimental flags and developer options.</p>
          </SectionCard>
        )}

        {section === "zaro" && (
          <SectionCard title="Super Admin (ZARO)">
            <div className="grid gap-3">
              <p className="opacity-80 text-sm">
                Open the ZARO console to manage org-wide settings and elevated tasks.
              </p>
              <LabeledInput
                label="ZARO URL"
                value={zaroUrl}
                onChange={setZaroUrl}
                placeholder="/admin/zaro or https://admin.example.com/zaro"
              />
              <div className="flex gap-2">
                <button className="px-3 h-9 rounded-lg border border-white/20 hover:border-white/35" onClick={saveZaroUrl}>
                  Save
                </button>
                <a href={zaroUrl || "/admin/zaro"} className="px-3 h-9 inline-grid place-items-center rounded-lg border border-white/20 hover:border-white/35">
                  Open ZARO
                </a>
              </div>
            </div>
          </SectionCard>
        )}
      </main>

      {/* Avatar picker modal */}
      {avatarPickerOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm grid place-items-center z-50">
          <div className="w-[520px] max-w-[92vw] rounded-2xl border border-white/15 bg-[rgba(18,24,36,.92)] p-4">
            <div className="text-sm font-semibold mb-3">Choose avatar</div>
            <div className="grid grid-cols-4 gap-3">
              {PRESET_AVATARS.map(a => (
                <button
                  key={a.id}
                  onClick={() => usePresetAvatar(a)}
                  className={`h-20 w-full rounded-xl overflow-hidden ring-1
                    ${avatar?.url===a.url ? "ring-cyan-300/60" : "ring-white/12 hover:ring-white/30"}`}
                >
                  <img src={a.url} alt="" className="h-full w-full object-cover"/>
                </button>
              ))}
              <label className="h-20 w-full rounded-xl border border-dashed border-white/20 hover:border-white/35 grid place-items-center cursor-pointer text-sm">
                Upload…
                <input type="file" accept="image/*" className="hidden" onChange={(e)=>onUpload(e.target.files?.[0])}/>
              </label>
            </div>
            <div className="mt-4 flex justify-end">
              <button className="px-3 h-9 rounded-lg border border-white/20 hover:border-white/35"
                      onClick={()=>setAvatarPickerOpen(false)}>
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
