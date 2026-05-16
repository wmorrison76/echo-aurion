// src/components/WidgetSettingsPanel.jsx
import React, { useEffect, useMemo, useRef, useState, Suspense } from "react";
import { Cog, Monitor, Bell, User, Info, Boxes, Paintbrush, ChevronDown } from "lucide-react";
import { setupThemeBoot } from "../lib/theme.js";

// Persist keys
const AVATAR_KEY = "lu:echo:avatar:v1";
const SECTION_KEY = "lu:settings:section:v1";

/* Discover your Echo_* avatars exactly where your screenshot shows them:
   /src/assets/Echo_F.png, Echo_M.png, Echo_B.png, Echo_R.png, Echo_A.png, Echo.png
   No hard-coded import paths; Vite will include whatever exists. */
function useAvatars() {
  return useMemo(() => {
    const found = import.meta.glob("../assets/**/Echo*.{png,jpg,jpeg,webp,svg}", { eager: true, import: "default" });
    let items = Object.entries(found).map(([path, url]) => ({ path, url }));
    if (!items.length) return items;

    // ensure deterministic ordering F → M → B → R → A → Echo.png
    const order = ["_F", "_M", "_B", "_R", "_A", "ECHO.PNG"];
    items.sort((a,b)=>{
      const A=(a.path.split("/").pop()||"").toUpperCase();
      const B=(b.path.split("/").pop()||"").toUpperCase();
      const ia=order.findIndex(t=>A.includes(t));
      const ib=order.findIndex(t=>B.includes(t));
      return (ia<0?99:ia)-(ib<0?99:ib);
    });
    // de-dup by URL
    const seen=new Set(); items = items.filter(x=>!seen.has(x.url) && seen.add(x.url));
    return items;
  }, []);
}

/* Lazy settings sections */
const SECTION_MODULES = import.meta.glob("./settings/sections/*.jsx");
const SECTIONS = {
  appearance:    { label:"Appearance",    icon: Paintbrush, loader: SECTION_MODULES["./settings/sections/Appearance.jsx"] },
  whiteboard:    { label:"Whiteboard",    icon: Monitor,    loader: SECTION_MODULES["./settings/sections/Whiteboard.jsx"] },
  widgets:       { label:"Widgets",       icon: Boxes,      loader: SECTION_MODULES["./settings/sections/Widgets.jsx"] },
  notifications: { label:"Notifications", icon: Bell,       loader: SECTION_MODULES["./settings/sections/Notifications.jsx"] },
  av:            { label:"Audio & Video", icon: Monitor,    loader: SECTION_MODULES["./settings/sections/AV.jsx"] },
  accounts:      { label:"Accounts",      icon: User,       loader: SECTION_MODULES["./settings/sections/Accounts.jsx"] },
  general:       { label:"General",       icon: Cog,        loader: SECTION_MODULES["./settings/sections/General.jsx"] },
  about:         { label:"About",         icon: Info,       loader: SECTION_MODULES["./settings/sections/About.jsx"] },
};
const Lazy = Object.fromEntries(
  Object.entries(SECTIONS).map(([k,v])=>[
    k,
    React.lazy(v.loader ?? (async()=>({default:()=> <div className="text-sm opacity-70">Coming soon…</div>})))
  ])
);

// Widget discovery for the Settings→Widgets list
const WIDGET_MODULES = import.meta.glob("./widgets/**/*.{jsx,tsx,js,ts}", { import: "default" });

export default function WidgetSettingsPanel(){
  const avatars = useAvatars();
  const [avatar, setAvatar]   = useState(()=>localStorage.getItem(AVATAR_KEY) || avatars[0]?.url || "");
  const [section, setSection] = useState(()=>localStorage.getItem(SECTION_KEY) || "appearance");

  // Theme boot once, in case Settings panel is opened directly
  useEffect(() => { setupThemeBoot(); }, []);

  // persist avatar + broadcast for any listeners
  useEffect(()=>{
    try{ localStorage.setItem(AVATAR_KEY, avatar); }catch{}
    window.dispatchEvent(new CustomEvent("echo-avatar-changed", { detail:{ url: avatar }}));
  },[avatar]);
  useEffect(()=>{ try{ localStorage.setItem(SECTION_KEY, section);}catch{}; },[section]);

  const widgets = useMemo(()=> Object.keys(WIDGET_MODULES)
    .map(p=>({ id:p, name:p.split("/").pop().replace(/\.(jsx?|tsx?)$/,"") }))
    .sort((a,b)=>a.name.localeCompare(b.name)), []);

  return (
    <div
      className="h-full w-full overflow-hidden rounded-2xl border border-white/10 relative"
      style={{
        background: "linear-gradient(180deg, rgba(10,14,22,0.88), rgba(10,14,22,0.92))",
        boxShadow: "0 30px 100px rgba(0,0,0,.55), inset 0 0 0 1px rgba(255,255,255,.045)"
      }}
    >
      <div className="absolute inset-0 pointer-events-none" style={{backdropFilter:"blur(6px)"}}/>
      <div className="relative grid h-full" style={{gridTemplateColumns:"280px 1fr"}}>
        {/* LEFT NAV */}
        <aside className="h-full overflow-auto border-r border-white/10 p-3">
          <AvatarHeader avatars={avatars} value={avatar} onChange={setAvatar}/>
          <Nav section={section} setSection={setSection}/>
        </aside>

        {/* RIGHT PANE */}
        <main className="h-full overflow-auto p-6">
          <Suspense fallback={<div className="text-sm opacity-70">Loading…</div>}>
            {section==="appearance"     && <Lazy.appearance/>}
            {section==="whiteboard"     && <Lazy.whiteboard/>}
            {section==="widgets"        && <Lazy.widgets widgets={widgets}/>}
            {section==="notifications"  && <Lazy.notifications/>}
            {section==="av"             && <Lazy.av/>}
            {section==="accounts"       && <Lazy.accounts/>}
            {section==="general"        && <Lazy.general/>}
            {section==="about"          && <Lazy.about/>}
          </Suspense>
        </main>
      </div>
    </div>
  );
}

/* ---------- Avatar header with Upload ---------- */
function AvatarHeader({ avatars, value, onChange }){
  const [open, setOpen] = useState(false);
  const pop = useRef(null);

  useEffect(()=>{
    const onDoc = (e)=>{ if(open && pop.current && !pop.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", onDoc);
    return ()=>document.removeEventListener("mousedown", onDoc);
  },[open]);

  return (
    <div className="rounded-2xl p-3 mb-3 border border-white/10 bg-gradient-to-b from-white/6 to-transparent">
      <div className="flex items-center gap-3 relative">
        <button
          className="relative h-14 w-14 rounded-2xl ring-1 ring-white/20 overflow-hidden shadow"
          onClick={()=>setOpen(v=>!v)}
          title="Change avatar"
        >
          <img src={value} alt="Avatar" className="h-full w-full object-cover"/>
          <span className="absolute -bottom-2 right-1 h-6 w-6 rounded-full grid place-items-center
                           bg-black/60 ring-1 ring-white/30">
            <ChevronDown size={14}/>
          </span>
        </button>
        <div>
          <div className="font-semibold leading-tight">Echo</div>
          <div className="text-xs opacity-70">Choose your profile avatar</div>
        </div>

        {open && (
          <div ref={pop}
            className="absolute z-50 top-16 left-0 rounded-xl border border-white/12 p-2"
            style={{
              background:"rgba(15,20,28,.96)",
              boxShadow:"0 18px 60px rgba(0,0,0,.5), inset 0 0 0 1px rgba(255,255,255,.04)"
            }}
          >
            {/* Presets from /src/assets */}
            <div className="grid gap-2"
                 style={{gridTemplateColumns:"repeat(2,64px)", maxHeight:148, overflowY:"auto"}}>
              {avatars.map(a=>(
                <button key={a.path}
                  className={`rounded-lg ring-1 overflow-hidden ${value===a.url ? "ring-cyan-300/60" : "ring-white/12 hover:ring-white/30"}`}
                  onClick={()=>{ onChange(a.url); setOpen(false); }}
                  title={a.path.split("/").pop()}
                >
                  <img src={a.url} alt="" className="h-16 w-16 object-cover"/>
                </button>
              ))}
            </div>

            {/* Upload / Remove */}
            <div className="flex items-center gap-2 mt-2">
              <label className="inline-flex items-center gap-2 h-8 px-2 rounded-lg border border-white/15 bg-white/5 hover:bg-white/10 cursor-pointer">
                Upload…
                <input type="file" accept="image/*" className="hidden"
                  onChange={(e)=>{
                    const f = e.target.files?.[0]; if(!f) return;
                    const reader = new FileReader();
                    reader.onload = ()=>{ if(typeof reader.result==="string") onChange(reader.result); setOpen(false); };
                    reader.readAsDataURL(f);
                  }}/>
              </label>
              {value?.startsWith?.("data:") && (
                <button className="h-8 px-2 rounded-lg border border-white/15 bg-white/5 hover:bg-white/10"
                        onClick={()=>onChange(avatars[0]?.url || value)}>
                  Remove upload
                </button>
              )}
            </div>

            <style>{`.grid::-webkit-scrollbar{display:none}`}</style>
          </div>
        )}
      </div>
    </div>
  );
}

function Nav({ section, setSection }){
  const items = [
    ["appearance",    Paintbrush, "Appearance"],
    ["whiteboard",    Monitor,    "Whiteboard"],
    ["widgets",       Boxes,      "Widgets"],
    ["notifications", Bell,       "Notifications"],
    ["av",            Monitor,    "Audio & Video"],
    ["accounts",      User,       "Accounts"],
    ["general",       Cog,        "General"],
    ["about",         Info,       "About"],
  ];
  return (
    <ul className="space-y-1">
      {items.map(([id,Icon,label])=>(
        <li key={id}>
          <button onClick={()=>setSection(id)}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-left
                        ${section===id ? "bg-white/10 ring-1 ring-white/15" : "hover:bg-white/5"}`}>
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

/* Tiny input/switch styles for the settings UI */
const style = document.createElement("style");
style.innerHTML = `
.settings-input{display:block;width:100%;border-radius:10px;border:1px solid rgba(255,255,255,.12);
  background:rgba(255,255,255,.06); color:#e8f7ff; padding:.55rem .7rem;}
.settings-switch{appearance:none;width:36px;height:20px;border-radius:999px;background:rgba(255,255,255,.2);
  position:relative;outline:none;border:1px solid rgba(255,255,255,.12)}
.settings-switch:checked{background:rgba(22,224,255,.55)}
.settings-switch::after{content:'';position:absolute;top:2px;left:2px;width:16px;height:16px;background:white;border-radius:999px;transition:transform .18s ease}
.settings-switch:checked::after{transform:translateX(16px)}
`;
document.head.appendChild(style);
