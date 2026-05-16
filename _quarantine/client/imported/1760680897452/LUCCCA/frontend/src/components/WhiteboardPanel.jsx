import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Hand, Pencil, Eraser, Square, Circle, Type, Undo2, Redo2,
  Download, Trash2, StickyNote, Pin, PinOff, Users, ChevronDown
} from "lucide-react";

/**
 * WhiteboardPanel
 * - Immersive full-bleed surface
 * - Top toolbar (pin / auto-collapse)
 * - Left vertical tool rail (auto-hide unless pinned)
 * - Minimal sticky-notes tray (MVP)
 * 
 * NOTE: This is UI/UX scaffolding. Hook real drawing actions later.
 */
export default function WhiteboardPanel() {
  // --- Top bar state ---------------------------------------------------------
  const [topPinned, setTopPinned] = useState(true);
  const [topCollapsed, setTopCollapsed] = useState(false);

  // --- Left rail state -------------------------------------------------------
  const [railPinned, setRailPinned] = useState(true);
  const [brush, setBrush] = useState(6);
  const [color, setColor] = useState("#d7f6ff");

  // --- Sticky notes tray -----------------------------------------------------
  const [showNotes, setShowNotes] = useState(false);
  const [notes, setNotes] = useState([
    { id: crypto.randomUUID(), text: "Double-click to edit", x: 32, y: 32 }
  ]);

  // Auto-collapse top bar when mouse leaves (if not pinned)
  const onTopLeave = () => {
    if (!topPinned) setTopCollapsed(true);
  };
  const onTopEnter = () => setTopCollapsed(false);

  // Left rail hover reveal (CSS handles most of it; pinned keeps it visible)

  // Dummy actions (wire to Excalidraw later)
  const addNote = () => {
    setShowNotes(true);
    setNotes((ns) => ns.concat([{ id: crypto.randomUUID(), text: "New note", x: 40 + ns.length * 12, y: 40 + ns.length * 12 }]));
  };

  return (
    <div className="wb-root">
      {/* Top toolbar (inside panel, draggable feel is not needed here) */}
      <div
        className={[
          "wb-topbar",
          topPinned ? "is-pinned" : "",
          topCollapsed ? "is-collapsed" : "",
        ].join(" ")}
        onMouseEnter={onTopEnter}
        onMouseLeave={onTopLeave}
      >
        <div className="wb-topbar-shell">
          <div className="wb-topbar-left">
            <div className="wb-topbar-title">Whiteboard</div>
          </div>
          <div className="wb-topbar-actions">
            <button className="wb-btn" title="Sticky notes" onClick={() => setShowNotes((v) => !v)}>
              <StickyNote size={16} />
            </button>
            <div className="wb-sep" />
            <button
              className={"wb-btn " + (topPinned ? "is-on" : "")}
              title={topPinned ? "Unpin toolbar" : "Pin toolbar"}
              onClick={() => setTopPinned((v) => !v)}
            >
              {topPinned ? <Pin size={16} /> : <PinOff size={16} />}
            </button>
            <button
              className="wb-btn"
              title={topCollapsed ? "Expand toolbar" : "Collapse toolbar"}
              onClick={() => setTopCollapsed((v) => !v)}
            >
              <ChevronDown size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* Left tool rail (auto-hide unless pinned) */}
      <aside className={["wb-rail", railPinned ? "is-pinned" : ""].join(" ")}>
        <div className="wb-rail-shell">
          <div className="wb-rail-group">
            <button className="wb-rail-btn" title="Pan (hand)">
              <Hand size={18} />
            </button>
            <button className="wb-rail-btn is-on" title="Pencil">
              <Pencil size={18} />
            </button>
            <button className="wb-rail-btn" title="Eraser">
              <Eraser size={18} />
            </button>
            <button className="wb-rail-btn" title="Rectangle">
              <Square size={18} />
            </button>
            <button className="wb-rail-btn" title="Ellipse">
              <Circle size={18} />
            </button>
            <button className="wb-rail-btn" title="Text">
              <Type size={18} />
            </button>
          </div>

          <div className="wb-rail-group">
            <div className="wb-input-row">
              <input
                className="wb-color"
                type="color"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                title="Stroke color"
              />
              <input
                className="wb-range"
                type="range"
                min={1}
                max={30}
                value={brush}
                onChange={(e) => setBrush(parseInt(e.target.value, 10))}
                title="Brush size"
              />
            </div>
          </div>

          <div className="wb-rail-group">
            <button className="wb-rail-btn" title="Undo">
              <Undo2 size={18} />
            </button>
            <button className="wb-rail-btn" title="Redo">
              <Redo2 size={18} />
            </button>
            <button className="wb-rail-btn" title="Export / download">
              <Download size={18} />
            </button>
            <button className="wb-rail-btn" title="Delete">
              <Trash2 size={18} />
            </button>
          </div>

          <div className="wb-rail-foot">
            <button
              className={"wb-rail-pin " + (railPinned ? "is-on" : "")}
              title={railPinned ? "Unpin tool rail" : "Pin tool rail"}
              onClick={() => setRailPinned((v) => !v)}
            >
              {railPinned ? <Pin size={16} /> : <PinOff size={16} />}
            </button>
          </div>
        </div>
      </aside>

      {/* Right side (members placeholder, for later) */}
      <aside className="wb-right-rail">
        <button className="wb-right-chip" title="Members (coming soon)">
          <Users size={16} /> <span>Members</span>
        </button>
      </aside>

      {/* Canvas zone (your real drawing surface goes here) */}
      <div className="wb-canvas">
        {/* placeholder */}
        <div className="wb-marquee" />
      </div>

      {/* Sticky notes tray */}
      {showNotes && (
        <div className="wb-notes-tray">
          <div className="wb-notes-head">
            <div className="t">Sticky Notes</div>
            <button className="wb-btn" onClick={addNote} title="New note">
              <StickyNote size={16} />
            </button>
          </div>
          <div className="wb-notes-grid">
            {notes.map((n) => (
              <textarea
                key={n.id}
                defaultValue={n.text}
                className="wb-note"
                spellCheck={false}
              />
            ))}
          </div>
        </div>
      )}

      {/* Local-scoped styles so you don’t need to hunt CSS files */}
      <style>{`
        .wb-root{
          position:relative; inset:0; width:100%; height:100%;
          background: radial-gradient(1200px 600px at 50% -10%, rgba(255,255,255,.06), transparent 60%),
                      radial-gradient(600px 600px at 110% 0%, rgba(127,255,212,.08), transparent 60%),
                      #0c121b;
          border-radius: 18px;
          overflow: hidden;
        }

        /* Top bar */
        .wb-topbar{ position:absolute; top:8px; left:8px; right:8px; z-index:20; transition: transform .25s ease, opacity .25s ease, filter .25s ease; }
        .wb-topbar-shell{
          display:flex; align-items:center; justify-content:space-between;
          padding:6px 8px; border-radius:14px; backdrop-filter: blur(10px);
          background: rgba(10,16,28,.78);
          border:1px solid rgba(22,224,255,.25);
          box-shadow: 0 18px 60px rgba(0,0,0,.45), inset 0 0 0 1px rgba(255,255,255,.05);
        }
        .wb-topbar.is-collapsed .wb-topbar-shell{
          background: rgba(255,160,60,.25);
          border-color: rgba(255,160,60,.45);
          box-shadow: 0 18px 60px rgba(255,160,60,.18), inset 0 0 0 1px rgba(255,255,255,.04);
        }
        .wb-topbar.is-collapsed{ transform: translateY(-8px); opacity:.92; }
        .wb-topbar-title{ font-size:14px; font-weight:700; letter-spacing:.2px; color:#eaf7fb; }
        .wb-topbar-actions{ display:flex; align-items:center; gap:6px; }

        /* Left rail */
        .wb-rail{ position:absolute; top:58px; bottom:14px; left:10px; width:54px; z-index:18;
          transition: transform .25s ease, opacity .25s ease;
        }
        .wb-rail-shell{
          height:100%; padding:8px; border-radius:14px; backdrop-filter: blur(10px);
          background: rgba(10,16,28,.72);
          border:1px solid rgba(22,224,255,.25);
          box-shadow: 0 18px 60px rgba(0,0,0,.45), inset 0 0 0 1px rgba(255,255,255,.05);
          display:flex; flex-direction:column; gap:8px;
        }
        /* auto-hide (leave a small nub) */
        .wb-rail:not(.is-pinned){ transform: translateX(calc(-100% + 16px)); opacity:.95; }
        .wb-ail, .wb-rail * { pointer-events:auto; }
        .wb-rail:not(.is-pinned):hover{ transform: translateX(0); }

        .wb-rail-group{ display:grid; gap:6px; }
        .wb-rail-btn{
          width:38px; height:38px; border-radius:10px; border:1px solid rgba(22,224,255,.22);
          background: rgba(255,255,255,.04); color:#d7f6ff; display:grid; place-items:center;
        }
        .wb-rail-btn:hover{ background: rgba(255,255,255,.08); }
        .wb-rail-btn.is-on{ outline: 2px solid rgba(22,224,255,.55); }

        .wb-input-row{ display:grid; gap:6px; }
        .wb-color{ width:100%; height:38px; border-radius:10px; border:1px solid rgba(22,224,255,.22); padding:0; background:transparent; }
        .wb-range{ width:100%; }

        .wb-rail-foot{ margin-top:auto; display:grid; place-items:center; }
        .wb-rail-pin{
          width:38px; height:38px; border-radius:10px; border:1px solid rgba(22,224,255,.22);
          background: rgba(255,255,255,.04); color:#d7f6ff; display:grid; place-items:center;
        }
        .wb-rail-pin.is-on{ outline:2px solid rgba(22,224,255,.55); }

        /* Right chips */
        .wb-right-rail{ position:absolute; top:64px; right:14px; z-index:18; }
        .wb-right-chip{
          display:inline-flex; align-items:center; gap:6px; height:32px; padding:0 10px;
          border-radius:10px; border:1px solid rgba(22,224,255,.22); background: rgba(255,255,255,.04);
          color:#d7f6ff; font-size:12px;
        }

        /* Canvas */
        .wb-canvas{ position:absolute; inset:0; padding:56px 16px 16px 70px; }
        .wb-marquee{
          position:absolute; left:70px; right:24px; top:56px; bottom:20px;
          border-radius:16px; background: linear-gradient(180deg, rgba(255,255,255,.04), rgba(255,255,255,.02));
          box-shadow: inset 0 0 0 1px rgba(255,255,255,.06);
        }

        /* Notes tray */
        .wb-notes-tray{
          position:absolute; right:16px; bottom:16px; width:320px; max-height:50%;
          display:flex; flex-direction:column; gap:8px; z-index:22;
        }
        .wb-notes-head{
          display:flex; align-items:center; justify-content:space-between;
          padding:8px 10px; border-radius:12px; background:rgba(10,16,28,.78);
          border:1px solid rgba(22,224,255,.25); color:#eaf7fb; font-weight:600;
        }
        .wb-notes-grid{
          flex:1; overflow:auto; display:grid; grid-template-columns: 1fr 1fr; gap:8px;
          padding:8px; border-radius:12px; background:rgba(10,16,28,.72); border:1px solid rgba(22,224,255,.22);
        }
        .wb-note{
          min-height:94px; padding:8px; border-radius:10px; resize:vertical; background:#1a2638; color:#eaf7fb;
          border:1px solid rgba(255,255,255,.12); outline:none;
        }

        /* Shared bits */
        .wb-btn{
          height:28px; min-width:28px; padding:0 6px; border-radius:8px;
          border:1px solid rgba(22,224,255,.25); background:rgba(255,255,255,.04); color:#d7f6ff;
        }
        .wb-btn:hover{ background:rgba(255,255,255,.08); }
        .wb-btn.is-on{ outline:2px solid rgba(22,224,255,.55); }
        .wb-sep{ width:1px; height:20px; background:rgba(255,255,255,.14); margin:0 6px; }
      `}</style>
    </div>
  );
}