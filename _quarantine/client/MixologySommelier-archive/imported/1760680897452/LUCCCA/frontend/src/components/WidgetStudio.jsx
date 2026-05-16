// Apple-style Settings panel
// - Left: categories (General, Appearance, Whiteboard, Widgets, Notifications, Audio/Video, Accounts, About)
// - Right: section content (lazy-loaded)
// - Avatar header with Echo_* discovery + persistence
// - Auto-discovery for new settings sections under ./settings/sections/*.jsx
// - Auto-discovery for Widgets (so “Widgets” section lists everything you’ve built)
//
// Tailwind required. No TS types in .jsx.

import React, { useEffect, useMemo, useState, Suspense } from "react";
import {
  Cog, Monitor, PenSquare, Webcam, Bell, User, Info, Boxes, Paintbrush
} from "lucide-react";

const AVATAR_KEY = "lu:echo:avatar:v1";
const SECTION_KEY = "lu:settings:section:v1";

// ---- Discover Echo_* avatars in /src/assets
function useAvatars() {
  return useMemo(() => {
    const found = import.meta.glob("../assets/**/Echo*.{png,jpg,jpeg,webp,svg}", { eager: true });
    const items = Object.entries(found).map(([path, mod]) => ({ path, url: mod.default }));
    const order = ["_F", "_M", "_B", "_R"];
    items.sort((a,b)=>{
      const ai = order.findIndex(t=>a.path.includes(t)); const bi = order.findIndex(t=>b.path.includes(t));
      return (ai<0?99:ai) - (bi<0?99:bi);
    });
    return items;
  }, []);
}

// ---- Discover settings sections in ./settings/sections
// Each file should default-export a React component.
const SECTION_MODULES = import.meta.glob("./settings/sections/*.jsx");

// map slug -> lazy component
const SECTIONS = {
  general:      { label: "General",      icon: Cog,        loader: SECTION_MODULES["./settings/sections/General.jsx"] },
  appearance:   { label: "Appearance",   icon: Paintbrush, loader: SECTION_MODULES["./settings/sections/Appearance.jsx"] },
  whiteboard:   { label: "Whiteboard",   icon: Monitor,    loader: SECTION_MODULES["./settings/sections/Whiteboard.jsx"] },
  widgets:      { label: "Widgets",      icon: Boxes,      loader: SECTION_MODULES["./settings/sections/Widgets.jsx"] },
  notifications:{ label: "Notifications",icon: Bell,       loader: SECTION_MODULES["./settings/sections/Notifications.jsx"] },
  av:           { label: "Audio & Video",icon: Webcam,     loader: SECTION_MODULES["./settings/sections/AV.jsx"] },
  accounts:     { label: "Accounts",     icon: User,       loader: SECTION_MODULES["./settings/sections/Accounts.jsx"] },
  about:        { label: "About",        icon: Info,       loader: SECTION_MODULES["./settings/sections/About.jsx"] },
};

// lazy wrappers
const LazySection = Object.fromEntries(
  Object.entries(SECTIONS).map(([k, v]) => [k, React.lazy(v.loader ?? (async()=>({ default: () => <div className="text-sm opacity-75">Coming soon…</div> })))])
);

// ---- Discover widgets (cards/components) under ./widgets/** (anything with default export)
const WIDGET_MODULES = import.meta.glob("./widgets/**/*.{jsx,tsx,js,ts}", { import: "default" });

export default function WidgetSettingsPanel() {
  const avatars = useAvatars();
  const [currentAvatar, setCurrentAvatar] = useState(() =>
    localStorage.getItem(AVATAR_KEY) || (avatars[0]?.url ?? "")
  );
  const [section, setSection] = useState(() => localStorage.getItem(SECTION_KEY) || "general");

  // persist avatar + broadcast
  useEffect(() => {
    try { localStorage.setItem(AVATAR_KEY, currentAvatar); } catch {}
    window.dispatchEvent(new CustomEvent("echo-avatar-changed", { detail: { url: currentAvatar }}));
  }, [currentAvatar]);

  useEffect(() => {
    try { localStorage.setItem(SECTION_KEY, section); } catch {}
  }, [section]);

  // assemble list of widgets (names from file path)
  const widgets = useMemo(() => {
    return Object.keys(WIDGET_MODULES)
      .map(path => ({ id: path, name: path.split("/").pop().replace(/\.(jsx?|tsx?)$/,"") }))
      .sort((a,b)=>a.name.localeCompare(b.name));
  }, []);

  // macOS Settings layout shell
  return (
    <div className="h-full w-full overflow-hidden rounded-2xl border border-white/10 bg-[rgba(12,14,18,0.6)] shadow-[0_0_0_1px_rgba(255,255,255,.04),0_40px_100px_rgba(0,0,0,.35)] grid"
         style={{ gridTemplateColumns: "280px 1fr" }}>
      {/* LEFT: Nav */}
      <aside className="h-full overflow-auto border-r border-white/10 p-3 backdrop-blur">
        <HeaderAvatar
          current={currentAvatar}
          setCurrent={setCurrentAvatar}
          avatars={avatars}
        />
        <NavList section={section} setSection={setSection} />
      </aside>

      {/* RIGHT: Section detail */}
      <main className="h-full overflow-auto p-6">
        <Suspense fallback={<div className="text-sm opacity-70">Loading…</div>}>
          {section === "general"       && <LazySection.general />}
          {section === "appearance"    && <LazySection.appearance />}
          {section === "whiteboard"    && <LazySection.whiteboard />}
          {section === "widgets"       && <LazySection.widgets widgets={widgets} />}
          {section === "notifications" && <LazySection.notifications />}
          {section === "av"            && <LazySection.av />}
          {section === "accounts"      && <LazySection.accounts />}
          {section === "about"         && <LazySection.about />}
        </Suspense>
      </main>
    </div>
  );
}

/* ---------- pieces ---------- */

function HeaderAvatar({ current, setCurrent, avatars }) {
  return (
    <div className="rounded-2xl p-3 mb-3 border border-white/10 bg-gradient-to-b from-white/5 to-transparent">
      <div className="flex items-center gap-3">
        <img src={current} alt="Avatar" className="h-16 w-16 rounded-2xl object-cover ring-1 ring-white/20 shadow" />
        <div>
          <div className="font-semibold">Echo</div>
          <div className="text-xs opacity-70">Choose your profile avatar</div>
        </div>
      </div>
      <div className="flex flex-wrap gap-3 mt-3">
        {avatars.map(a => (
          <button key={a.path}
            className={`rounded-xl ring-1 overflow-hidden ${current===a.url ? "ring-cyan-300/60" : "ring-white/15 hover:ring-white/30"}`}
            title={a.path.split("/").pop()}
            onClick={()=>setCurrent(a.url)}
          >
            <img src={a.url} alt="" className="h-12 w-12 object-cover" />
          </button>
        ))}
      </div>
    </div>
  );
}

function NavList({ section, setSection }) {
  const items = [
    ["general",       SECTIONS.general.icon,       SECTIONS.general.label],
    ["appearance",    SECTIONS.appearance.icon,    SECTIONS.appearance.label],
    ["whiteboard",    SECTIONS.whiteboard.icon,    SECTIONS.whiteboard.label],
    ["widgets",       SECTIONS.widgets.icon,       SECTIONS.widgets.label],
    ["notifications", SECTIONS.notifications.icon, SECTIONS.notifications.label],
    ["av",            SECTIONS.av.icon,            "Audio & Video"],
    ["accounts",      SECTIONS.accounts.icon,      SECTIONS.accounts.label],
    ["about",         SECTIONS.about.icon,         SECTIONS.about.label],
  ];
  return (
    <ul className="space-y-1">
      {items.map(([id, Icon, label]) => (
        <li key={id}>
          <button
            onClick={()=>setSection(id)}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-left
                        ${section===id ? "bg-white/10 ring-1 ring-white/15" : "hover:bg-white/5"}`}
          >
            <span className="h-7 w-7 grid place-items-center rounded-lg bg-white/8 ring-1 ring-white/10">
              <Icon size={16}/>
            </span>
            <span className="text-[15px]">{label}</span>
          </button>
        </li>
      ))}
    </ul>
  );
}

// tiny design tokens for inputs (matches WidgetStudio “dw-*” look so far)
const style = document.createElement("style");
style.innerHTML = `
.settings-input{display:block;width:100%;border-radius:10px;border:1px solid rgba(255,255,255,.12);
  background:rgba(255,255,255,.04); color:#e8f7ff; padding:.55rem .7rem;}
.settings-switch{appearance:none;width:36px;height:20px;border-radius:999px;background:rgba(255,255,255,.2);position:relative;outline:none;border:1px solid rgba(255,255,255,.12)}
.settings-switch:checked{background:rgba(22,224,255,.55)}
.settings-switch::after{content:'';position:absolute;top:2px;left:2px;width:16px;height:16px;background:white;border-radius:999px;transition:transform .18s ease}
.settings-switch:checked::after{transform:translateX(16px)}
`;
document.head.appendChild(style);
