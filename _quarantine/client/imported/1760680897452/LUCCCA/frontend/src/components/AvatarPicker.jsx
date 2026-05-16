import React, { useEffect, useMemo, useRef, useState } from "react";

export const AVATAR_KEY = "lu:echo:avatar:v1";

/**
 * Provide 4 avatar URLs via props. If omitted, we’ll auto-discover
 * the first four Echo* assets under /src/assets and use those.
 */
export default function AvatarPicker({ choices }) {
  const discovered = useMemo(() => {
    if (choices?.length) return choices.slice(0, 4);
    const found = import.meta.glob("../assets/**/Echo*.{png,jpg,jpeg,webp,svg}", { eager: true });
    const items = Object.entries(found).map(([p, m]) => ({ path: p, url: m.default }));
    // prefer _F, _M, _B, _R ordering
    const order = ["_F", "_M", "_B", "_R"];
    items.sort((a, b) => {
      const ai = order.findIndex(t => a.path.includes(t));
      const bi = order.findIndex(t => b.path.includes(t));
      return (ai < 0 ? 99 : ai) - (bi < 0 ? 99 : bi);
    });
    return items.slice(0, 4).map(i => i.url);
  }, [choices]);

  const initial = () =>
    localStorage.getItem(AVATAR_KEY) || discovered[0] || "";

  const [current, setCurrent] = useState(initial);
  useEffect(() => {
    if (!current) return;
    try { localStorage.setItem(AVATAR_KEY, current); } catch {}
    window.dispatchEvent(new CustomEvent("echo-avatar-changed", { detail: { url: current } }));
  }, [current]);

  // file upload → data URL
  const fileRef = useRef(null);
  const pickFile = () => fileRef.current?.click();
  const onFile = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    const reader = new FileReader();
    reader.onload = () => setCurrent(String(reader.result || ""));
    reader.readAsDataURL(f);
  };

  // a11y: radio group semantics
  const onKey = (i) => (e) => {
    const idx = discovered.indexOf(current);
    if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
      e.preventDefault();
      const ni = (idx <= 0 ? discovered.length - 1 : idx - 1);
      setCurrent(discovered[ni]);
    }
    if (e.key === "ArrowRight" || e.key === "ArrowDown") {
      e.preventDefault();
      const ni = (idx >= discovered.length - 1 ? 0 : idx + 1);
      setCurrent(discovered[ni]);
    }
    if (e.key === " " || e.key === "Enter") {
      e.preventDefault();
      setCurrent(discovered[i]);
    }
  };

  return (
    <div>
      {/* preview */}
      <div className="flex items-center gap-3 mb-3">
        <img
          src={current || discovered[0]}
          alt=""
          className="h-12 w-12 rounded-lg ring-1 ring-white/15 object-cover"
        />
        <div className="text-sm opacity-80">
          {current?.startsWith("data:") ? "Custom avatar" : "Echo avatar"}
        </div>
      </div>

      {/* 4 choices + upload */}
      <div
        role="radiogroup"
        aria-label="Choose your profile avatar"
        className="grid gap-3"
        style={{ gridTemplateColumns: "repeat(4, minmax(0, 1fr))" }}
      >
        {discovered.map((url, i) => {
          const selected = current === url;
          return (
            <button
              key={url}
              role="radio"
              aria-checked={selected}
              title="Choose avatar"
              onClick={() => setCurrent(url)}
              onKeyDown={onKey(i)}
              className={"h-16 w-16 rounded-xl overflow-hidden ring-1 focus:outline-none " +
                (selected ? "ring-cyan-300 shadow-[0_0_0_2px_rgba(22,224,255,.6)]"
                          : "ring-white/12 hover:ring-white/25")}
            >
              <img src={url} alt="" className="h-full w-full object-cover" />
            </button>
          );
        })}

        <button
          type="button"
          title="Upload your own"
          onClick={pickFile}
          className="h-16 w-16 rounded-xl ring-1 ring-white/12 hover:ring-white/25 bg-white/5 text-[11px]"
        >
          Upload
        </button>
        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={onFile} />
      </div>
    </div>
  );
}
