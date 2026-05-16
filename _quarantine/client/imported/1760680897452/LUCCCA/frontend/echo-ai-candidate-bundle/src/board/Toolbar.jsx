// src/board/Toolbar.jsx
import React from "react";
import {
  RefreshCcw, SquareStack, LayoutDashboard,
  ChevronUp, ChevronRight, ChevronDown, ChevronLeft,
  Sun, Moon, Pin, PinOff, MoveDiagonal, Magnet,
  StickyNote, Image as ImageIcon,
} from "lucide-react";

export default function Toolbar({
  // visibility
  visible, pinned, setPinned, onHoverShow,
  // prefs
  autoDock, setAutoDock,
  allowOffscreen, setAllowOffscreen,
  dockPos, setDockPos,
  // actions
  onResetLayout, onDockAll, onRestoreAll,
  // theme badge
  isDark,
}) {
  return (
    <div
      className={[
        "board-toolbar board-toolbar--icons pointer-events-auto fixed top-4 left-1/2 -translate-x-1/2 z-[1200] transition-all duration-200",
        visible ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-3 pointer-events-none",
      ].join(" ")}
      onMouseEnter={onHoverShow}
      onMouseLeave={() => { if (!pinned) onHoverShow(false); }}
    >
      <div className="echo-toolbar relative flex items-center gap-2 px-2">
        {/* Layout */}
        <button className="etb-btn" title="Reset layout" onClick={onResetLayout}><RefreshCcw size={16} /></button>
        <button className="etb-btn" title="Dock all (⌘/Ctrl+⇧+H)" onClick={onDockAll}><SquareStack size={16} /></button>
        <button className="etb-btn" title="Restore docked (⌘/Ctrl+⇧+R)" onClick={onRestoreAll}><LayoutDashboard size={16} /></button>

        {/* Prefs */}
        <button
          className={`etb-btn ${autoDock ? "etb-active" : ""}`}
          title={`Auto-dock: ${autoDock ? "On" : "Off"}`}
          onClick={() => setAutoDock(v => !v)}
          aria-pressed={autoDock}
        >
          <Magnet size={16} />
        </button>

        <button
          className={`etb-btn ${allowOffscreen ? "etb-active" : ""}`}
          title={`Off-screen drag: ${allowOffscreen ? "On" : "Off"}`}
          onClick={() => setAllowOffscreen(v => !v)}
          aria-pressed={allowOffscreen}
        >
          <MoveDiagonal size={16} />
        </button>

        {/* Dock position */}
        <div className="etb-btn etb-seg" title="Dock position">
          <button className={dockPos==="top"    ? "seg-on" : ""} onClick={() => setDockPos("top")}   aria-label="Dock top"><ChevronUp size={14}/></button>
          <button className={dockPos==="right"  ? "seg-on" : ""} onClick={() => setDockPos("right")} aria-label="Dock right"><ChevronRight size={14}/></button>
          <button className={dockPos==="bottom" ? "seg-on" : ""} onClick={() => setDockPos("bottom")}aria-label="Dock bottom"><ChevronDown size={14}/></button>
          <button className={dockPos==="left"   ? "seg-on" : ""} onClick={() => setDockPos("left")}  aria-label="Dock left"><ChevronLeft size={14}/></button>
        </div>

        {/* Backboard sticky + Whiteboard */}
        <button
          className="etb-btn"
          title="Drop a backboard sticky note"
          onClick={() => window.dispatchEvent(new CustomEvent("backboard-add-sticky"))}
        >
          <StickyNote size={16}/>
        </button>

        <button
          className="etb-btn"
          title="Open Whiteboard"
          onClick={() => window.dispatchEvent(new CustomEvent("open-panel", { detail: { id: "whiteboard", allowDuplicate: true } }))}
        >
          <ImageIcon size={16}/>
        </button>

        {/* Pin */}
        <button
          className={`etb-btn ${pinned ? "etb-active" : ""}`}
          title={pinned ? "Unpin toolbar (auto-hide)" : "Pin toolbar (always show)"}
          onClick={() => setPinned(v => !v)}
          aria-pressed={pinned}
        >
          {pinned ? <Pin size={16}/> : <PinOff size={16}/>}
        </button>

        {/* Mode badge */}
        <div className="etb-badge" title={isDark ? "Dark" : "Light"}>
          {isDark ? <Moon size={14}/> : <Sun size={14}/>}
        </div>

        {/* little grip */}
        <button
          className="tb-grip"
          title={pinned ? "Toolbar pinned" : "Show toolbar"}
          onClick={onHoverShow}
          aria-label="Show toolbar"
        >
          <svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true">
            <path fill="currentColor" d="M3 7h18v2H3zm0 4h18v2H3zm0 4h18v2H3z"/>
          </svg>
        </button>
      </div>
    </div>
  );
}
