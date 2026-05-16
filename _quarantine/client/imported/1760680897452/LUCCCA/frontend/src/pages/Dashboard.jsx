// src/board/Board.jsx
import React, {
  useCallback, useEffect, useMemo, useRef, useState, Suspense,
} from "react";

// react-rnd (ESM/CJS safe)
import * as RND_NS from "react-rnd";
const Rnd = RND_NS.Rnd ?? RND_NS.default ?? RND_NS;

import {
  RefreshCcw, SquareStack, LayoutDashboard,
  ChevronUp, ChevronRight, ChevronDown, ChevronLeft,
  Sun, Moon, X, Minus, Maximize2, Pin, PinOff, MoveDiagonal, Magnet,
  StickyNote, Image as ImageIcon,
  ExternalLink, Home, Settings as Cog,
} from "lucide-react";

// Lazy panels
const KitchenLibraryTabs = React.lazy(() => import("../components/KitchenLibraryTabs.jsx"));
const PastryLibrary      = React.lazy(() => import("../components/PastryLibrary/PastryLibrary.jsx.bak_scan/index.js"));
const Mixology           = React.lazy(() => import("../components/MixologyTabs.jsx"));
const WhiteboardPanel    = React.lazy(() => import("../components/WhiteboardPanel.jsx"));

/**
 * Dashboard: try to load ../components/Dashboard.jsx.
 * If it's missing, gracefully fall back to the Whiteboard panel
 * so you don't get a build-time error.
 */
const DashboardPanel = React.lazy(async () => {
  try {
    const mod = await import("../components/Dashboard.jsx");
    return mod;
  } catch {
    const fallback = await import("../components/WhiteboardPanel.jsx");
    return fallback;
  }
});

// Dock icons
import kitchenIcon  from "../assets/culinary_library.png";
import pastryIcon   from "../assets/baking-&-Pastry.png";
import mixologyIcon from "../assets/mixology.png";

const PANEL_REGISTRY = {
  dashboard: { title: "Dashboard",       Component: DashboardPanel,  icon: null },
  culinary:  { title: "Kitchen Library", Component: KitchenLibraryTabs, icon: kitchenIcon },
  pastry:    { title: "Baking & Pastry", Component: PastryLibrary,      icon: pastryIcon },
  mixology:  { title: "Mixology",        Component: Mixology,           icon: mixologyIcon },
  whiteboard:{ title: "Whiteboard",      Component: WhiteboardPanel,    icon: null },
};

let zCounter = 10;

/* ---------------- small util ---------------- */
const genToken = () =>
  Math.random().toString(36).slice(2) + "-" + Date.now().toString(36);

/* ---------------- Dock ---------------- */
function PanelDockBar({ items, onRestore, position = "left" }) {
  if (!items.length) return null;

  const base = "panel-dock fixed z-[1100] rounded-xl backdrop-blur-md border shadow-xl pointer-events-auto";
  const axisClass = position === "left" || position === "right" ? "flex-col" : "flex-row";

  // Fixed offsets as requested: 53px from the left
  const posStyle =
    position === "bottom"
      ? { left: "50%", transform: "translateX(-50%)", bottom: "16px" }
      : position === "top"
      ? { left: "50%", transform: "translateX(-50%)", top: "16px" }
      : position === "left"
      ? { left: "53px", top: "50%", transform: "translateY(-50%)" }
      : { right: "16px", top: "50%", transform: "translateY(-50%)" };

  return (
    <div className={`${base} panel-dock--skin flex ${axisClass} items-center gap-2 px-2 py-1`} style={posStyle}>
      {items.map(({ id, title, icon }) => (
        <button key={id} className="panel-dock__item" title={`Restore ${title}`} onClick={() => onRestore(id)}>
          <img src={icon || "/favicon.ico"} alt="" />
        </button>
      ))}
    </div>
  );
}

const LS_KEYS = {
  autoDock: "lu:autoDock",
  dockPos: "lu:dockPos",
  allowOffscreen: "lu:allowOffscreen",
  toolbarPinned: "lu:toolbarPinned",
};

/* ---------------- Board ---------------- */
export default function Board() {
  const layerRef = useRef(null);

  /** Window: {id,title,icon,x,y,width,height,z,minimized,maximized,prevRect?,props?} */
  const [windows, setWindows] = useState([]);
  const [activeId, setActiveId] = useState(null);

  // prefs
  const [autoDock, setAutoDock] = useState(() =>
    localStorage.getItem(LS_KEYS.autoDock)?.toLowerCase() === "true"
  );
  const [dockPos, setDockPos] = useState(() =>
    localStorage.getItem(LS_KEYS.dockPos) || "left"
  );
  const [allowOffscreen, setAllowOffscreen] = useState(() =>
    (localStorage.getItem(LS_KEYS.allowOffscreen) ?? "true").toLowerCase() !== "false"
  );
  const [toolbarPinned, setToolbarPinned] = useState(() =>
    localStorage.getItem(LS_KEYS.toolbarPinned)?.toLowerCase() === "true"
  );
  const [toolbarVisible, setToolbarVisible] = useState(true);

  useEffect(() => localStorage.setItem(LS_KEYS.autoDock, String(autoDock)), [autoDock]);
  useEffect(() => localStorage.setItem(LS_KEYS.dockPos, dockPos), [dockPos]);
  useEffect(() => localStorage.setItem(LS_KEYS.allowOffscreen, String(allowOffscreen)), [allowOffscreen]);
  useEffect(() => localStorage.setItem(LS_KEYS.toolbarPinned, String(toolbarPinned)), [toolbarPinned]);

  // dark/light badge
  const [isDark, setIsDark] = useState(document.documentElement.classList.contains("dark"));
  useEffect(() => {
    const m = new MutationObserver(() => setIsDark(document.documentElement.classList.contains("dark")));
    m.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    return () => m.disconnect();
  }, []);

  /* ---------- z-index / focus ---------- */
  const bringToFront = useCallback((id) => {
    zCounter += 1;
    setActiveId(id);
    setWindows((w) => w.map((win) => (win.id === id ? { ...win, z: zCounter } : win)));
  }, []);

  /* ---------- window controls ---------- */
  const closeWindow = useCallback((id) => {
    setWindows((w) => w.filter((p) => p.id !== id));
    setActiveId((aid) => (aid === id ? null : aid));
  }, []);

  const toggleMinimize = useCallback((id) => {
    setWindows((w) => w.map((p) => (p.id === id ? { ...p, minimized: !p.minimized, maximized: false } : p)));
  }, []);

  const toggleMaximize = useCallback((id) => {
    setWindows((w) =>
      w.map((p) => {
        if (p.id !== id) return p;
        if (!p.maximized) {
          const rect = layerRef.current?.getBoundingClientRect?.();
          const W = Math.max(rect?.width ?? 0, window.innerWidth);
          const H = Math.max(rect?.height ?? 0, window.innerHeight);
          const marginX = 90, marginY = 76;
          return {
            ...p,
            prevRect: { x: p.x, y: p.y, width: p.width, height: p.height },
            x: Math.max(8, marginX),
            y: Math.max(8, marginY),
            width: Math.max(640, W - marginX * 2),
            height: Math.max(400, H - marginY * 2),
            maximized: true,
            minimized: false,
          };
        }
        const r = p.prevRect ?? { x: 120, y: 80, width: 720, height: 520 };
        return { ...p, ...r, maximized: false, prevRect: undefined };
      })
    );
  }, []);

  /* ---------- open / cascade ---------- */
  const cascadePos = useMemo(() => {
    let n = 0;
    return () => {
      const gap = 32;
      const x = 120 + ((n * gap) % 280);
      const y =  80 + ((n * gap) % 220);
      n += 1;
      return { x, y };
    };
  }, []);

  const genWinId = (panelId, allowDuplicate) =>
    allowDuplicate
      ? `${panelId}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2,6)}`
      : panelId;

  /**
   * openPanelById(panelId, { title?, props?, allowDuplicate? })
   */
  const openPanelById = useCallback(
    (panelId, opts = {}) => {
      const reg = PANEL_REGISTRY[panelId];
      if (!reg) return;

      const allowDuplicate = !!opts.allowDuplicate;
      const newIdCandidate = genWinId(panelId, allowDuplicate);

      setWindows((w) => {
        const found = w.find((p) => p.id === panelId);
        if (found && !allowDuplicate) {
          zCounter += 1;
          return w.map((p) =>
            p.id === panelId ? { ...p, minimized: false, z: zCounter } : p
          );
        }

        const { x, y } = cascadePos();
        zCounter += 1;
        const winToken = genToken();

        return w.concat([{
          id: newIdCandidate,
          title: opts.title || reg.title,
          icon: reg.icon ?? null,
          z: zCounter,
          x, y,
          width: 840,
          height: 560,
          minimized: false,      // <- do NOT auto-dock new panels
          maximized: false,
          props: { ...(opts.props || {}), winToken },
        }]);
      });

      setActiveId(newIdCandidate);
    },
    [cascadePos]
  );

  // Accept open-panel events
  useEffect(() => {
    const handler = (e) => {
      const d = e.detail || {};
      if (!d.id) return;
      openPanelById(d.id, { title: d.title, props: d.props, allowDuplicate: d.allowDuplicate });
    };
    window.addEventListener("open-panel", handler);
    return () => window.removeEventListener("open-panel", handler);
  }, [openPanelById]);

  // Close-by-token helper
  useEffect(() => {
    const closeByToken = (e) => {
      const tok = e.detail?.token;
      if (!tok) return;
      setWindows((w) => w.filter((p) => p.props?.winToken !== tok));
    };
    window.addEventListener("board-close-by-token", closeByToken);
    return () => window.removeEventListener("board-close-by-token", closeByToken);
  }, []);

  /* ---------- dock helpers ---------- */
  const dockAll = useCallback(() => {
    setWindows((w) => w.map((p) => ({ ...p, minimized: true, maximized: false })));
  }, []);
  const restoreAll = useCallback(() => {
    setWindows((w) => w.map((p) => ({ ...p, minimized: false })));
  }, []);
  const resetLayout = useCallback(() => {
    setWindows([]); setActiveId(null);
  }, []);

  // keyboard helpers
  useEffect(() => {
    const onKey = (e) => {
      const tag = (e.target?.tagName || "").toLowerCase();
      if (tag === "input" || tag === "textarea" || e.target?.isContentEditable) return;
      const isMac = navigator.platform.toUpperCase().includes("MAC");
      const cmd = isMac ? e.metaKey : e.ctrlKey;
      const k = e.key.toLowerCase();
      if (cmd && e.shiftKey && k === "h") { e.preventDefault(); dockAll(); }
      if (cmd && e.shiftKey && k === "r") { e.preventDefault(); restoreAll(); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [dockAll, restoreAll]);

  const dockItems = windows
    .filter((w) => w.minimized)
    .map((w) => ({ id: w.id, title: w.title, icon: w.icon }));

  const bringToFrontAndRestore = useCallback((id) => {
    setWindows((w) => w.map((p) => (p.id === id ? { ...p, minimized: false } : p)));
    bringToFront(id);
  }, [bringToFront]);

  // toolbar auto-hide
  useEffect(() => {
    if (toolbarPinned) { setToolbarVisible(true); return; }
    let timer;
    const hide = () => { if (!toolbarPinned) setToolbarVisible(false); };
    const show = () => { setToolbarVisible(true); clearTimeout(timer); timer = setTimeout(hide, 1800); };
    const onMove = (e) => {
      const y = e.clientY, x = e.clientX, vw = window.innerWidth;
      if (y <= 60 && Math.abs(x - vw / 2) <= 260) show();
    };
    window.addEventListener("mousemove", onMove);
    timer = setTimeout(hide, 1200);
    return () => { window.removeEventListener("mousemove", onMove); clearTimeout(timer); };
  }, [toolbarPinned]);

  /* ---------- STARTUP: open Dashboard on load ---------- */
  useEffect(() => {
    openPanelById("dashboard", { allowDuplicate: false });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className={`relative w-full h-full ${allowOffscreen ? "overflow-visible" : "overflow-hidden"} fluid-root`}>
      {/* Always-visible tiny handle (top center) to reveal toolbar on hover */}
      {!toolbarPinned && (
        <button
          className={[
            "fixed top-1 left-1/2 -translate-x-1/2 z-[200000]",
            "w-[22px] h-[22px] rounded-full grid place-items-center border transition",
            toolbarVisible ? "opacity-0 pointer-events-none" : "opacity-90 pointer-events-auto",
            isDark
              ? "bg-[rgba(10,16,28,.85)] text-cyan-200 border-cyan-300/30 shadow-[0_6px_18px_rgba(0,0,0,.45),0_0_12px_rgba(22,224,255,.25)]"
              : "bg-[rgba(255,255,255,.85)] text-slate-800 border-black/10 shadow-[0_4px_12px_rgba(0,0,0,.18)]",
          ].join(" ")}
          aria-label="Show toolbar"
          title="Show toolbar"
          onMouseEnter={() => setToolbarVisible(true)}
        >
          <svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true">
            <path fill="currentColor" d="M3 7h18v2H3zm0 4h18v2H3zm0 4h18v2H3z"/>
          </svg>
        </button>
      )}

      {/* Optional hot zone to reveal toolbar by moving near the top center */}
      {!toolbarPinned && (
        <div
          className="fixed top-0 left-1/2 -translate-x-1/2 h-[12px] w-[300px] z-[999]"
          onMouseEnter={() => setToolbarVisible(true)}
        />
      )}

      {/* ===== Toolbar ===== */}
      <div
        className={[
          "board-toolbar board-toolbar--icons pointer-events-auto fixed top-4 left-1/2 -translate-x-1/2 z-[1200] transition-all duration-200",
          toolbarVisible ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-3 pointer-events-none",
        ].join(" ")}
        onMouseEnter={() => setToolbarVisible(true)}
        onMouseLeave={() => { if (!toolbarPinned) setToolbarVisible(false); }}
      >
        <div className="echo-toolbar relative flex items-center gap-2 px-2">
          {/* Layout */}
          <button className="etb-btn" title="Reset layout" onClick={resetLayout}><RefreshCcw size={16} /></button>
          <button className="etb-btn" title="Dock all (⌘/Ctrl+⇧+H)" onClick={dockAll}><SquareStack size={16} /></button>
          <button className="etb-btn" title="Restore docked (⌘/Ctrl+⇧+R)" onClick={restoreAll}><LayoutDashboard size={16} /></button>

          {/* Prefs */}
          <button className={`etb-btn ${autoDock ? "etb-active" : ""}`} title={`Auto-dock: ${autoDock ? "On" : "Off"}`} onClick={() => setAutoDock(v => !v)} aria-pressed={autoDock}><Magnet size={16} /></button>
          <button className={`etb-btn ${allowOffscreen ? "etb-active" : ""}`} title={`Off-screen drag: ${allowOffscreen ? "On" : "Off"}`} onClick={() => setAllowOffscreen(v => !v)} aria-pressed={allowOffscreen}><MoveDiagonal size={16} /></button>

          {/* Dock position */}
          <div className="etb-btn etb-seg" title="Dock position">
            <button className={dockPos==="top"    ? "seg-on" : ""} onClick={() => setDockPos("top")}   aria-label="Dock top"><ChevronUp size={14}/></button>
            <button className={dockPos==="right"  ? "seg-on" : ""} onClick={() => setDockPos("right")} aria-label="Dock right"><ChevronRight size={14}/></button>
            <button className={dockPos==="bottom" ? "seg-on" : ""} onClick={() => setDockPos("bottom")}aria-label="Dock bottom"><ChevronDown size={14}/></button>
            <button className={dockPos==="left"   ? "seg-on" : ""} onClick={() => setDockPos("left")}  aria-label="Dock left"><ChevronLeft size={14}/></button>
          </div>

          {/* Whiteboard helpers */}
          <button
            className="etb-btn"
            title="Add sticky note to open Whiteboard(s)"
            onClick={() => window.dispatchEvent(new CustomEvent("whiteboard-add-sticky"))}
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
            className={`etb-btn ${toolbarPinned ? "etb-active" : ""}`}
            title={toolbarPinned ? "Unpin toolbar (auto-hide)" : "Pin toolbar (always show)"}
            onClick={() => setToolbarPinned(v => !v)}
            aria-pressed={toolbarPinned}
          >
            {toolbarPinned ? <Pin size={16}/> : <PinOff size={16}/>}
          </button>

          {/* Mode badge */}
          <div className="etb-badge" title={isDark ? "Dark" : "Light"}>{isDark ? <Moon size={14}/> : <Sun size={14}/>}</div>

          {/* Little hanging grip (inside the toolbar) */}
          <button
            className="tb-grip"
            title={toolbarPinned ? "Toolbar pinned" : "Show toolbar"}
            onClick={() => setToolbarVisible(true)}
            aria-label="Show toolbar"
          >
            <svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true">
              <path fill="currentColor" d="M3 7h18v2H3zm0 4h18v2H3zm0 4h18v2H3z"/>
            </svg>
          </button>
        </div>
      </div>

      {/* ===== Panel layer ===== */}
      <div
        ref={layerRef}
        className="pane-layer absolute inset-0"
        style={{ overflow: allowOffscreen ? "visible" : "hidden" }}
      >
        {windows.map((win) => {
          const baseKey = (win.id.includes("-") ? win.id.split("-")[0] : win.id);
          const entry = PANEL_REGISTRY[baseKey];
          if (!entry) return null;
          const Component = entry.Component;

          return (
            <Rnd
              key={win.id}
              position={{ x: win.x, y: win.y }}
              size={{ width: win.width, height: win.height }}
              bounds={allowOffscreen ? undefined : ".pane-layer"}
              minWidth={420}
              minHeight={280}
              dragHandleClassName="panel-header"
              onDragStart={() => bringToFront(win.id)}
              onResizeStart={() => bringToFront(win.id)}
              onDragStop={(_, d) => {
                setWindows((w) => w.map((p) => (p.id === win.id ? { ...p, x: d.x, y: d.y } : p)));
              }}
              onResizeStop={(_, __, ref, _delta, pos) => {
                setWindows((w) =>
                  w.map((p) =>
                    p.id === win.id
                      ? { ...p, width: ref.offsetWidth, height: ref.offsetHeight, x: pos.x, y: pos.y }
                      : p
                  )
                );
              }}
              enableResizing={!win.maximized && !win.minimized}
              disableDragging={win.minimized}
              style={{ zIndex: win.z, display: win.minimized ? "none" : "block" }}
              className={[
                "panel-window resize-panel",
                activeId === win.id ? "is-focused" : "",
                win.minimized ? "is-min" : "",
                win.maximized ? "is-max" : "",
              ].join(" ")}
            >
              <div className="h-full flex flex-col" onMouseDownCapture={() => bringToFront(win.id)}>
                {/* Header */}
                <div className="panel-header flex items-center justify-between select-none" title="Drag to move">
                  <div className="flex items-center gap-2">
                    <button className="dot dot-close"   title="Close" onClick={() => closeWindow(win.id)}><X size={10} /></button>
                    <button className="dot dot-min"     title={win.minimized ? "Restore" : "Minimize to dock"} onClick={() => toggleMinimize(win.id)}><Minus size={10} /></button>
                    <button className="dot dot-restore" title={win.maximized ? "Restore size" : "Maximize"}     onClick={() => toggleMaximize(win.id)}><Maximize2 size={10} /></button>
                    <div className="panel-title ml-1">{win.title}</div>
                  </div>

                  {/* tiny right-corner actions (only for Pastry) */}
                  { (baseKey === "pastry") && (
                    <div className="flex items-center gap-1 pr-1">
                      <button
                        className="inline-flex items-center justify-center w-[26px] h-[26px] rounded-md border border-white/15 dark:border-cyan-300/30 text-white/80 hover:text-white hover:bg-white/5"
                        title="Tear out current tab"
                        onClick={() => window.dispatchEvent(new CustomEvent("pastry-tear-out"))}
                      >
                        <ExternalLink size={14} />
                      </button>
                      <button
                        className="inline-flex items-center justify-center w-[26px] h-[26px] rounded-md border border-white/15 dark:border-cyan-300/30 text-white/80 hover:text-white hover:bg-white/5"
                        title="Pastry Home"
                        onClick={() => window.dispatchEvent(new CustomEvent("pastry-home"))}
                      >
                        <Home size={14} />
                      </button>
                      <button
                        className="inline-flex items-center justify-center w-[26px] h-[26px] rounded-md border border-white/15 dark:border-cyan-300/30 text-white/80 hover:text-white hover:bg-white/5"
                        title="Settings (⇧ toggles colors)"
                        onClick={(e) => {
                          const detail = { toggleColors: e.shiftKey === true };
                          window.dispatchEvent(new CustomEvent("pastry-open-settings", { detail }));
                        }}
                      >
                        <Cog size={14} />
                      </button>
                    </div>
                  )}
                </div>

                {/* Body */}
                <div className="panel-body grow overflow-auto">
                  <Suspense fallback={<div className="p-3 text-xs text-gray-500">Loading…</div>}>
                    <Component {...(win.props || {})} />
                  </Suspense>
                </div>
              </div>
            </Rnd>
          );
        })}
      </div>

      {/* Dock */}
      <PanelDockBar items={dockItems} onRestore={bringToFrontAndRestore} position={dockPos} />
    </div>
  );
}
