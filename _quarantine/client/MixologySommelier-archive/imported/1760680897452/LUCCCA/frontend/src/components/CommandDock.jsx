// frontend/src/components/EchoCommandDock.jsx
// EchoCommandDock.jsx
// A floating command dock with magnification and core whiteboard tools.
// Works with or without external state management (e.g. Fluid).
// Uses lucide-react for icons (https://lucide.dev) and react-icons for one
// from FontAwesome (https://react-icons.github.io/react-icons).

import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Settings, HelpCircle, Lock, MoreHorizontal, Sun, Moon,
  MousePointer2, Pencil, Eraser, Shapes, Type, Hand,
  Undo2, Redo2, ZoomIn, ZoomOut, LocateFixed, RotateCcw,
  StickyNote
} from "lucide-react";
import { FaCompressArrowsAlt } from "react-icons/fa";

/* -----------------------------------------------------------
   Public constants so the rest of your app can reuse them
----------------------------------------------------------- */
export const WHITEBOARD_TOOLS = {
  SELECT: "select",
  PEN: "pen",
  ERASER: "eraser",
  SHAPES: "shapes",
  TEXT: "text",
  HAND: "hand", // pan
};

/* -----------------------------------------------------------
   Tiny dock magnifier (no extra CSS needed; uses your classes)
----------------------------------------------------------- */
function DockMagnifier({ children, maxScale = 1.85, radius = 130, disabled = false }) {
  const host = useRef(null);
  const items = useMemo(() => React.Children.toArray(children), [children]);
  const [scales, setScales] = useState(() => items.map(() => 1));

  const reset = () => setScales(items.map(() => 1));
  const bump = (x) => {
    if (disabled || !host.current) return reset();
    const nodes = [...host.current.querySelectorAll(".dock-item-wrapper")];
    setScales(nodes.map((n) => {
      const r = n.getBoundingClientRect();
      const c = r.left + r.width / 2;
      const t = Math.max(0, 1 - Math.abs(c - x) / radius);
      return 1 + (maxScale - 1) * (t * t);
    }));
  };

  useEffect(() => reset(), [items.length]); // keep length in sync

  return (
    <div
      ref={host}
      className="echo-dock"
      onMouseMove={(e) => bump(e.clientX)}
      onMouseLeave={reset}
      onTouchMove={(e) => bump(e.touches?.[0]?.clientX ?? 0)}
      onTouchEnd={reset}
    >
      {items.map((child, i) => (
        <div
          key={i}
          className="dock-item-wrapper"
          style={{ transform: `scale(${scales[i] ?? 1})`, transformOrigin: "50% 100%" }}
        >
          <div className="dock-item">{child}</div>
        </div>
      ))}
    </div>
  );
}

/* -----------------------------------------------------------
   Button primitive (reuses your .btn styles)
----------------------------------------------------------- */
function Btn({ title, ariaLabel, active, onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`btn ${active ? "ring-2 ring-cyan-400" : ""}`}
      title={title}
      aria-label={ariaLabel || title}
      aria-pressed={!!active}
    >
      {children}
    </button>
  );
}

/* -----------------------------------------------------------
   Simple popover for “More” without extra libs
----------------------------------------------------------- */
function Popover({ anchorRef, open, onClose, children }) {
  useEffect(() => {
    if (!open) return;
    const onDoc = (e) => {
      if (!anchorRef?.current) return onClose();
      if (!anchorRef.current.contains(e.target)) onClose();
    };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("touchstart", onDoc, { passive: true });
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("touchstart", onDoc);
    };
  }, [open, onClose, anchorRef]);

  if (!open) return null;
  return (
    <div
      className="absolute left-0 top-[110%] z-[2000] rounded-xl border bg-white/90 dark:bg-zinc-900/90
                 backdrop-blur-md shadow-xl dark:border-cyan-900/40 p-1 min-w-[200px]"
      role="menu"
    >
      {children}
    </div>
  );
}

/* -----------------------------------------------------------
   EchoCommandDock — panel-agnostic, works across the board
   - If you pass store callbacks, it controls your real canvas.
   - If you don't, it still works visually using internal state.
----------------------------------------------------------- */
export default function EchoCommandDock({
  /* Visual */
  theme = "light",
  isOnline = true,
  magnifyEnabled = true,

  /* Whiteboard control (optional but recommended) */
  activeTool,           // string from WHITEBOARD_TOOLS
  setTool,              // fn(toolId)
  undo, redo,           // fn()
  zoomIn, zoomOut, zoomReset, // fn()

  /* Panels / layout control (optional) */
  onResetLayout = () => {},
  onDockAll = () => {},          // “Compact mode” / minimize all
  onRestoreDocked = () => {},    // restore all

  /* Notes & misc (optional) */
  onNewStickyNote = () => {},
  onToggleTheme = () => {},
  onSettings = () => {},
  onHelp = () => {},
  onToggleMemory = () => {},     // receives boolean enabled
  onAskEcho = () => {},          // open Echo overlay / command palette
}) {
  // Internal tool state if no external store is provided.
  const [localTool, setLocalTool] = useState(WHITEBOARD_TOOLS.SELECT);
  const tool = activeTool ?? localTool;
  const applyTool = setTool ?? setLocalTool;

  const [memory, setMemory] = useState(true);
  const IconTheme = theme === "dark" ? Moon : Sun;

  // --- Hotkeys ---
  useEffect(() => {
    const h = (e) => {
      const tag = (e.target?.tagName || "").toLowerCase();
      if (tag === "input" || tag === "textarea" || e.target?.isContentEditable) return;
      const isMac = navigator.platform.toUpperCase().includes("MAC");
      const cmd = isMac ? e.metaKey : e.ctrlKey;
      const shift = e.shiftKey;
      const k = e.key.toLowerCase();

      if (!cmd) {
        if (k === "v") applyTool(WHITEBOARD_TOOLS.SELECT);
        else if (k === "p") applyTool(WHITEBOARD_TOOLS.PEN);
        else if (k === "e") applyTool(WHITEBOARD_TOOLS.ERASER);
        else if (k === "s") applyTool(WHITEBOARD_TOOLS.SHAPES);
        else if (k === "t") applyTool(WHITEBOARD_TOOLS.TEXT);
        else if (k === "h") applyTool(WHITEBOARD_TOOLS.HAND);
      }
      if (cmd && k === "z" && !shift) { e.preventDefault(); undo?.(); }
      if (cmd && (k === "y" || (k === "z" && shift))) { e.preventDefault(); redo?.(); }
      if (cmd && (k === "=" || k === "+")) { e.preventDefault(); zoomIn?.(); }
      if (cmd && k === "-") { e.preventDefault(); zoomOut?.(); }
      if (cmd && k === "0") { e.preventDefault(); zoomReset?.(); }
      if (cmd && k === "j") { e.preventDefault(); onToggleTheme?.(); }
      if (cmd && k === "k") { e.preventDefault(); onAskEcho?.(); } // command palette / Echo
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [applyTool, undo, redo, zoomIn, zoomOut, zoomReset, onToggleTheme, onAskEcho]);

  // “More” popover
  const moreRef = useRef(null);
  const [moreOpen, setMoreOpen] = useState(false);

  return (
    <div className="echo-toolbar relative px-2 py-2" role="toolbar" aria-label="Echo Command Dock">
      <DockMagnifier disabled={!magnifyEnabled}>
        {/* Theme + Memory */}
        <Btn title="Toggle theme (⌘/Ctrl+J)" onClick={onToggleTheme}><IconTheme className="w-4 h-4" /></Btn>
        <Btn
          title={`Echo memory ${memory ? "on" : "off"}`}
          onClick={() => { const n = !memory; setMemory(n); onToggleMemory?.(n); }}
          active={memory}
        >
          {/* simple dot to indicate learning state */}
          <div className={`w-3 h-3 rounded-full ${memory ? "bg-green-500" : "bg-red-500"}`} />
        </Btn>

        {/* Core tools — panel-agnostic */}
        <Btn title="Select (V)" onClick={() => applyTool(WHITEBOARD_TOOLS.SELECT)} active={tool===WHITEBOARD_TOOLS.SELECT}><MousePointer2 className="w-4 h-4" /></Btn>
        <Btn title="Pen (P)"    onClick={() => applyTool(WHITEBOARD_TOOLS.PEN)}    active={tool===WHITEBOARD_TOOLS.PEN}><Pencil className="w-4 h-4" /></Btn>
        <Btn title="Eraser (E)" onClick={() => applyTool(WHITEBOARD_TOOLS.ERASER)} active={tool===WHITEBOARD_TOOLS.ERASER}><Eraser className="w-4 h-4" /></Btn>
        <Btn title="Shapes (S)" onClick={() => applyTool(WHITEBOARD_TOOLS.SHAPES)} active={tool===WHITEBOARD_TOOLS.SHAPES}><Shapes className="w-4 h-4" /></Btn>
        <Btn title="Text (T)"   onClick={() => applyTool(WHITEBOARD_TOOLS.TEXT)}   active={tool===WHITEBOARD_TOOLS.TEXT}><Type className="w-4 h-4" /></Btn>
        <Btn title="Hand / Pan (H)" onClick={() => applyTool(WHITEBOARD_TOOLS.HAND)} active={tool===WHITEBOARD_TOOLS.HAND}><Hand className="w-4 h-4" /></Btn>

        {/* Notes + Undo/Redo + Zoom */}
        <Btn title="New Sticky Note (⌘/Ctrl+⇧+N)" onClick={onNewStickyNote}><StickyNote className="w-4 h-4" /></Btn>
        <Btn title="Undo (⌘/Ctrl+Z)" onClick={undo}><Undo2 className="w-4 h-4" /></Btn>
        <Btn title="Redo (⌘/Ctrl+Y or ⌘/Ctrl+⇧+Z)" onClick={redo}><Redo2 className="w-4 h-4" /></Btn>
        <Btn title="Zoom out (⌘/Ctrl+-)" onClick={zoomOut}><ZoomOut className="w-4 h-4" /></Btn>
        <Btn title="Zoom in (⌘/Ctrl+=)" onClick={zoomIn}><ZoomIn className="w-4 h-4" /></Btn>
        <Btn title="Reset zoom (⌘/Ctrl+0)" onClick={zoomReset}><LocateFixed className="w-4 h-4" /></Btn>

        {/* Layout / panel lifecycle */}
        <Btn title="Reset Layout" onClick={onResetLayout}><RotateCcw className="w-4 h-4" /></Btn>
        <Btn title="Dock all panels" onClick={onDockAll}><FaCompressArrowsAlt className="text-base" /></Btn>
        <Btn title="Restore docked panels" onClick={onRestoreDocked}><Lock className="w-4 h-4" /></Btn>

        {/* Status indicator */}
        <div
          className="status-dot"
          title={`Status: ${isOnline ? "Online" : "Offline"}`}
          aria-label={`System ${isOnline ? "online" : "offline"}`}
          style={{ background: isOnline ? "#22c55e" : "#ef4444" }}
        />

        {/* Settings / Help */}
        <Btn title="Settings" onClick={onSettings}><Settings className="w-4 h-4" /></Btn>
        <Btn title="Help" onClick={onHelp}><HelpCircle className="w-4 h-4" /></Btn>

        {/* More (popover with useful commands) */}
        <div className="relative" ref={moreRef}>
          <Btn title="More tools" onClick={() => setMoreOpen((v) => !v)} ariaLabel="More tools">
            <MoreHorizontal className="w-4 h-4" />
          </Btn>
          <Popover anchorRef={moreRef} open={moreOpen} onClose={() => setMoreOpen(false)}>
            <button
              className="w-full text-left px-3 py-2 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 flex items-center gap-2"
              onClick={() => { setMoreOpen(false); onAskEcho?.(); }}
              role="menuitem"
            >
              {/* Echo command palette / Q&A */}
              🤖 Ask Echo (⌘/Ctrl+K)
            </button>
            <button
              className="w-full text-left px-3 py-2 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 flex items-center gap-2"
              onClick={() => { setMoreOpen(false); onResetLayout?.(); }}
              role="menuitem"
            >
              <RotateCcw className="w-4 h-4" /> Reset Layout
            </button>
            <button
              className="w-full text-left px-3 py-2 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 flex items-center gap-2"
              onClick={() => { setMoreOpen(false); onDockAll?.(); }}
              role="menuitem"
            >
              <FaCompressArrowsAlt className="text-base" /> Dock All Panels
            </button>
            <button
              className="w-full text-left px-3 py-2 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 flex items-center gap-2"
              onClick={() => { setMoreOpen(false); onRestoreDocked?.(); }}
              role="menuitem"
            >
              <Lock className="w-4 h-4" /> Restore Docked Panels
            </button>
          </Popover>
        </div>
      </DockMagnifier>
    </div>
  );
}
