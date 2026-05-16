
// src/components/AvatarChooser.jsx
import React, { useRef } from "react";

const DEFAULTS = [
  { id: "echo_a", src: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?q=80&w=256&auto=format&fit=facearea&facepad=3&h=256" },
  { id: "echo_b", src: "https://images.unsplash.com/photo-1544723795-3fb6469f5b39?q=80&w=256&auto=format&fit=facearea&facepad=3&h=256" },
  { id: "echo_c", src: "https://images.unsplash.com/photo-1541534401786-2077eed87a72?q=80&w=256&auto=format&fit=facearea&facepad=3&h=256" },
  { id: "echo_d", src: "https://images.unsplash.com/photo-1544005316-04ce98b8e8d5?q=80&w=256&auto=format&fit=facearea&facepad=3&h=256" },
];

export default function AvatarChooser({ value, onChange }){
  const inputRef = useRef(null);

  const setCustom = (file) => {
    if(!file) return;
    const reader = new FileReader();
    reader.onload = () => onChange?.({ id: "custom", src: reader.result });
    reader.readAsDataURL(file);
  };

  const selected = value?.src ? value : DEFAULTS[0];

  return (
    <div className="vstack" style={{ gap: 16 }}>
      <div className="hstack" style={{ gap: 14 }}>
        <img src={selected.src} alt="Selected avatar" width={96} height={96}
             className="panel" style={{ borderRadius: 20, objectFit:"cover" }} />
        <div className="vstack">
          <div className="section-title">Avatar</div>
          <div className="muted small">Choose one of the presets or upload your own image.</div>
          <div className="hstack">
            <button className="btn" onClick={()=>inputRef.current?.click()}>Upload…</button>
            <input ref={inputRef} type="file" accept="image/*" hidden onChange={(e)=>setCustom(e.target.files?.[0])}/>
          </div>
        </div>
      </div>

      <div className="grid-4" style={{ display:"grid", gridTemplateColumns:"repeat(4,96px)", gap: 14 }}>
        {DEFAULTS.map(a => (
          <button key={a.id} onClick={()=>onChange?.(a)}
                  style={{ padding:0, border:"none", background:"transparent", cursor:"pointer" }}>
            <img src={a.src} alt="" width={96} height={96}
                 className="panel" style={{ borderRadius: 20, objectFit:"cover", outline: selected.id===a.id?'2px solid var(--accent)':'none', outlineOffset: 2 }} />
          </button>
        ))}
      </div>
    </div>
  );
}
