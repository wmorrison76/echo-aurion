import React, { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import * as RND_NS from "react-rnd";
const Rnd = RND_NS.Rnd ?? RND_NS.default ?? RND_NS;

import EchoBackboard from "./EchoBackboard.jsx";

// === Lazy panels (with safe fallbacks) ===
const DashboardWelcome = React.lazy(async () => {
  try {
    return await import("../components/DashboardWelcome.jsx");
  } catch {
    return { default: () => (
      <div className="p-4 text-sm opacity-80">
        Dashboard panel placeholder. (components/DashboardWelcome.jsx not found)
      </div>
    ) };
  }
});

const WhiteboardPanel = React.lazy(async () => {
  try {
    return await import("../components/WhiteboardPanel.jsx");
  } catch {
    return { default: () => (
      <div className="p-4 text-sm opacity-80">
        Whiteboard placeholder. (components/WhiteboardPanel.jsx not found)
      </div>
    ) };
  }
});

/** 👉 Real Maestro BQT panel (your file). Must export a React component as default. */
const MaestroPanel = React.lazy(async () => {
  try {
    return await import("../modules/Maestro-BQT/nova-lab-App.tsx");
  } catch (e) {
    console.warn("[Board] Could not load Maestro panel:", e);
    return { default: () => (
      <div className="p-4 text-sm opacity-80">
        MaestroBQT module not found / failed to compile.
        Check: <code>src/modules/Maestro-BQT/nova-lab-App.tsx</code> exports a default component.
      </div>
    ) };
  }
});

/** Accept both historical ids and the ones emitted by Sidebar */
const PANEL_REGISTRY = {
  // Dashboard
  home:       { title: "Dashboard",   Component: DashboardWelcome },
  dashboard:  { title: "Dashboard",   Component: DashboardWelcome },

  // Whiteboard
  whiteboard: { title: "Whiteboard",  Component: WhiteboardPanel },

  // Maestro
  maestro:    { title: "Maestro BQT", Component: MaestroPanel },
  maestrobqt: { title: "Maestro BQT", Component: MaestroPanel },
};

let zCounter = 10;
const genToken = () => Math.random().toString(36).slice(2) + "-" + Date.now().toString(36);

export default function Board() {
  const layerRef = useRef(null);
  const [windows, setWindows] = useState([]);
  const [activeId, setActiveId] = useState(null);

  const openPanelById = useCallback((panelId, opts = {}) => {
    const reg = PANEL_REGISTRY[panelId];
    if (!reg || !reg.Component) {
      console.warn("[Board] unknown panel:", panelId);
      return;
    }
    let createdId = null;
    setWindows((w) => {
      if (!opts.allowDuplicate && w.some((p) => p.id === panelId)) {
        zCounter += 1;
        return w.map((p) => (p.id === panelId ? { ...p, minimized: false, z: zCounter } : p));
      }
      const base = {
        x: 120 + ((w.length * 32) % 240),
        y: 84 + ((w.length * 28) % 200),
        width: 980,
        height: 640,
      };
      const rect = {
        x: Number.isFinite(opts.x) ? opts.x : base.x,
        y: Number.isFinite(opts.y) ? opts.y : base.y,
        width:  Number.isFinite(opts.width)  ? opts.width  : base.width,
        height: Number.isFinite(opts.height) ? opts.height : base.height,
      };
      zCounter += 1;
      const newId = opts.allowDuplicate ? `${panelId}-${Date.now().toString(36)}` : panelId;
      createdId = newId;
      const winToken = genToken();
      return w.concat([{
        id: newId,
        title: opts.title || reg.title,
        z: zCounter,
        minimized: false,
        maximized: false,
        ...rect,
        props: { ...(opts.props || {}), winToken },
      }]);
    });
    setActiveId(createdId || panelId);
  }, []);

  useEffect(() => {
    const onOpen = (e) => {
      const d = e?.detail || {};
      if (!d.id) return;
      openPanelById(d.id, d);
    };
    window.addEventListener("open-panel", onOpen);
    return () => window.removeEventListener("open-panel", onOpen);
  }, [openPanelById]);

  // Open Dashboard on boot, centered
  useEffect(() => {
    const W = window.innerWidth, H = window.innerHeight;
    const width = Math.min(1100, W - 180), height = Math.min(680, H - 160);
    const x = Math.max(90, Math.round((W - width) / 2));
    const y = Math.max(76, Math.round((H - height) / 2));
    openPanelById("dashboard", { x, y, width, height });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const bringToFront = useCallback((id) => {
    zCounter += 1;
    setActiveId(id);
    setWindows((w) => w.map((p) => (p.id === id ? { ...p, z: zCounter } : p)));
  }, []);

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
          const marginX = 90, marginY = 76;
          const W = window.innerWidth, H = window.innerHeight;
          return {
            ...p,
            prevRect: { x: p.x, y: p.y, width: p.width, height: p.height },
            x: marginX, y: marginY,
            width: Math.max(640, W - marginX * 2),
            height: Math.max(400, H - marginY * 2),
            maximized: true, minimized: false,
          };
        }
        const r = p.prevRect ?? { x: 120, y: 84, width: 980, height: 640 };
        return { ...p, ...r, maximized: false, prevRect: undefined };
      })
    );
  }, []);

  const dockItems = useMemo(
    () => windows.filter((w) => w.minimized).map((w) => ({ id: w.id, title: w.title })),
    [windows]
  );

  const bringToFrontAndRestore = useCallback((id) => {
    setWindows((w) => w.map((p) => (p.id === id ? { ...p, minimized: false } : p)));
    bringToFront(id);
  }, [bringToFront]);

  const resetLayout = () => { setWindows([]); setActiveId(null); };

  return (
    <div className="relative h-full w-full">
      {/* Backboard behind everything */}
      <EchoBackboard
        onRequestDockAll={() => setWindows((w) => w.map((p) => ({ ...p, minimized: true, maximized: false })))}
        onRequestRestoreAll={() => setWindows((w) => w.map((p) => ({ ...p, minimized: false })))}
      />

      {/* Tiny toolbar */}
      <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[1200] pointer-events-auto">
        <div className="flex items-center gap-2 bg-black/40 text-cyan-200 border border-cyan-400/30 rounded-xl px-2 py-1 backdrop-blur-md">
          <button className="tb" onClick={resetLayout} title="Reset">Reset</button>
          <button className="tb" onClick={() => window.dispatchEvent(new CustomEvent("open-panel", { detail: { id: "whiteboard", allowDuplicate: true } }))}>Whiteboard</button>
          <button className="tb" onClick={() => window.dispatchEvent(new CustomEvent("open-panel", { detail: { id: "maestrobqt", allowDuplicate: true } }))}>Maestro</button>
        </div>
      </div>

      {/* Window layer */}
      <div ref={layerRef} className="absolute inset-0">
        {windows.map((win) => {
          const baseKey = win.id.split("-")[0];
          const entry = PANEL_REGISTRY[baseKey];
          const Component = entry?.Component;
          return (
            <Rnd
              key={win.id}
              position={{ x: win.x, y: win.y }}
              size={{ width: win.width, height: win.height }}
              minWidth={420}
              minHeight={280}
              bounds="window"
              dragHandleClassName="panel-header"
              enableResizing={!win.maximized && !win.minimized}
              disableDragging={win.minimized}
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
              style={{ zIndex: win.z, display: win.minimized ? "none" : "block" }}
              className={["panel-window", activeId === win.id ? "is-focused" : ""].join(" ")}
            >
              <div className="h-full flex flex-col" onMouseDownCapture={() => bringToFront(win.id)}>
                <div className="panel-header flex items-center justify-between px-2 py-1 select-none">
                  <div className="font-semibold">{win.title}</div>
                  <div className="flex items-center gap-1">
                    <button className="dot" title={win.maximized ? "Restore" : "Maximize"} onClick={() => toggleMaximize(win.id)}>▭</button>
                    <button className="dot" title={win.minimized ? "Restore" : "Minimize"} onClick={() => toggleMinimize(win.id)}>—</button>
                    <button className="dot" title="Close" onClick={() => closeWindow(win.id)}>×</button>
                  </div>
                </div>
                <div className="panel-body grow overflow-auto">
                  <Suspense fallback={<div className="p-3 text-xs text-gray-500">Loading…</div>}>
                    {Component ? <Component {...(win.props || {})} /> : null}
                  </Suspense>
                </div>
              </div>
            </Rnd>
          );
        })}
      </div>

      {/* Dock */}
      {dockItems.length > 0 && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[1200] flex gap-2 bg-black/45 text-cyan-100 border border-cyan-400/30 rounded-xl px-2 py-1 backdrop-blur-md pointer-events-auto">
          {dockItems.map((d) => (
            <button key={d.id} className="tb" onClick={() => bringToFrontAndRestore(d.id)} title={d.title}>
              {d.title}
            </button>
          ))}
        </div>
      )}

      <style>{`
        .panel-window{background:rgba(10,16,28,.75);border:1px solid rgba(22,224,255,.28);border-radius:14px;box-shadow:0 22px 80px rgba(0,0,0,.45), inset 0 0 1px rgba(255,255,255,.06)}
        .panel-header{background:rgba(10,16,28,.6);border-bottom:1px solid rgba(22,224,255,.25);border-top-left-radius:14px;border-top-right-radius:14px}
        .panel-body{background:linear-gradient(180deg, rgba(10,16,28,.82), rgba(10,16,28,.72))}
        .dot{width:24px;height:22px;border:1px solid rgba(22,224,255,.35);border-radius:6px;background:rgba(22,224,255,.10);color:#cff;cursor:pointer}
        .tb{height:26px;padding:0 8px;border-radius:8px;border:1px solid rgba(22,224,255,.28);background:rgba(10,16,28,.6);color:#d7f6ff}
      `}</style>
    </div>
  );
}
