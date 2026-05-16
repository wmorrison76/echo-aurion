import React, { useEffect, useRef, useState } from "react";

const LS_FLOAT = "lu:dock.float"; // {x,y,side}

export default function PanelDockBar({ items, onRestore }) {
  const wrapRef = useRef(null);
  const [pos, setPos] = useState(() => {
    try { return JSON.parse(localStorage.getItem(LS_FLOAT) || "null") ?? { x: 24, y: 80, side: "left" }; }
    catch { return { x: 24, y: 80, side: "left" }; }
  });
  useEffect(() => { localStorage.setItem(LS_FLOAT, JSON.stringify(pos)); }, [pos]);

  // drag
  useEffect(() => {
    const el = wrapRef.current; if (!el) return;
    let dragging=false, sx=0, sy=0, startX=0, startY=0;
    const down = (e) => {
      if (!e.target.closest?.(".dock-grip")) return;
      dragging=true; sx=pos.x; sy=pos.y; startX=e.clientX; startY=e.clientY; e.preventDefault();
      window.addEventListener("mousemove", move); window.addEventListener("mouseup", up);
    };
    const move = (e) => { if (!dragging) return; setPos(p => ({ ...p, x: sx + (e.clientX - startX), y: sy + (e.clientY - startY) })); };
    const up   = () => {
      dragging=false; window.removeEventListener("mousemove", move); window.removeEventListener("mouseup", up);
      const W = window.innerWidth, H = window.innerHeight;
      const leftDist = pos.x, rightDist = W - (pos.x + 60);
      const topDist = pos.y, bottomDist = H - (pos.y + 60);
      const min = Math.min(leftDist, rightDist, topDist, bottomDist);
      let side = pos.side;
      if (min === leftDist) side = "left";
      if (min === rightDist) side = "right";
      if (min === topDist) side = "top";
      if (min === bottomDist) side = "bottom";
      const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
      if (side === "left")    setPos(p => ({ ...p, x: 16, y: clamp(p.y, 16, H-76), side }));
      if (side === "right")   setPos(p => ({ ...p, x: W-76, y: clamp(p.y, 16, H-76), side }));
      if (side === "top")     setPos(p => ({ ...p, y: 16, x: clamp(p.x, 16, W-76), side }));
      if (side === "bottom")  setPos(p => ({ ...p, y: H-76, x: clamp(p.x, 16, W-76), side }));
    };
    el.addEventListener("mousedown", down);
    return () => el.removeEventListener("mousedown", down);
  }, [pos.x, pos.y, pos.side]);

  if (!items.length) return null;

  const axis = (pos.side === "left" || pos.side === "right") ? "col" : "row";
  const style = { position:"fixed", left:pos.x, top:pos.y, zIndex:1100 };

  return (
    <div ref={wrapRef} style={style} className="dock-wrap pointer-events-auto">
      <div className={`dock glass ${axis}`}>
        <button className="dock-grip" title="Drag dock" aria-label="Drag dock">
          <svg width="14" height="14" viewBox="0 0 24 24"><path fill="currentColor" d="M7 3h2v4H7V3m8 0h2v4h-2V3M7 10h2v4H7v-4m8 0h2v4h-2v-4M7 17h2v4H7v-4m8 0h2v4h-2v-4"/></svg>
        </button>
        {items.map(({ id, title, icon }) => (
          <button key={id} className="dock-item" title={`Restore ${title}`} onClick={() => onRestore(id)}>
            {icon ? <img alt="" src={icon} /> : (
              <svg width="16" height="16" viewBox="0 0 24 24"><path fill="currentColor" d="M4 4h16v12H4zM8 18h8v2H8z"/></svg>
            )}
          </button>
        ))}
      </div>
      <style>{`
        .glass{background:rgba(10,16,28,.6);border:1px solid rgba(22,224,255,.25);backdrop-filter:blur(8px);box-shadow:0 14px 40px rgba(0,0,0,.45), inset 0 0 1px rgba(255,255,255,.06);border-radius:14px;padding:8px;display:flex;gap:8px;align-items:center;justify-content:center}
        .col{flex-direction:column}.row{flex-direction:row}
        .dock-grip{width:28px;height:28px;display:grid;place-items:center;border-radius:8px;border:1px solid rgba(22,224,255,.25);background:rgba(22,224,255,.08);color:#d7f6ff;cursor:grab}
        .dock-item{width:32px;height:32px;display:grid;place-items:center;border-radius:9px;border:1px solid rgba(22,224,255,.22);background:rgba(255,255,255,.04);color:#d7f6ff;cursor:pointer;box-shadow:inset 0 0 0 1px rgba(255,255,255,.04)}
        .dock-item img{width:18px;height:18px;display:block}
        .dock-item:hover{box-shadow:0 6px 18px rgba(22,224,255,.18);transform:translateY(-1px)}
      `}</style>
    </div>
  );
}
