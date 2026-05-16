import React, { useEffect, useMemo, useState, Suspense } from "react";
import DoubleTabs from "../shared/DoubleTabs.jsx";
import "../shared/DoubleTabs.css";

/* ---------------- Small, reusable fallback ---------------- */
function Placeholder({ title = "Not Implemented" }) {
  return (
    <div className="p-4">
      <h3 className="text-white/95 text-xl font-semibold mb-2">{title}</h3>
      <p className="text-white/80">
        This module hasn’t been wired yet. It’s safe to keep exploring tabs —
        nothing will crash, and you can add this file later.
      </p>
    </div>
  );
}

/* ---------------- Safe lazy helpers (no missing-file crashes) ----------------
   We predeclare literal glob maps so Vite can analyze them without errors.
   Then we decide at runtime whether the target file exists and pick a fallback.
----------------------------------------------------------------------------- */
const UP_ONE_JSX   = import.meta.glob("../*.jsx");                // siblings one level up
const HERE_JSX     = import.meta.glob("./*.jsx");                 // same folder
const PAGES_ANY    = import.meta.glob("../../pages/*.{tsx,jsx}"); // pages (tsx or jsx)
const MODULE_PAGES = import.meta.glob("../../modules/CustomCakeStudio/pages/*.{tsx,jsx}"); // EchoCanvas Studio

// Helper: safely lazy-load a component from a map key, else a placeholder.
function lazyFrom(map, key, fallbackTitle) {
  const importer = map[key];
  if (importer) {
    return React.lazy(importer);
  }
  return React.lazy(() =>
    Promise.resolve({ default: () => <Placeholder title={fallbackTitle} /> })
  );
}

// Helper: pick first existing key from list in a given map
function pickLazy(map, keys, fallbackTitle){
  for (const k of keys){
    if (map[k]) return React.lazy(map[k]);
  }
  return React.lazy(() => Promise.resolve({ default: () => <Placeholder title={fallbackTitle} /> }));
}

/* ---------------- Pages/components (all safe) ---------------- */

// Recipe input page (TSX/JSX) — try .tsx then .jsx
const PastryRecipeInputPage =
  PAGES_ANY["../../pages/PastryRecipeInputPage.tsx"]
    ? React.lazy(PAGES_ANY["../../pages/PastryRecipeInputPage.tsx"])
    : lazyFrom(PAGES_ANY, "../../pages/PastryRecipeInputPage.jsx", "New Recipe");

// Photo Gallery (fits panel). Lives in this folder.
const PastryGallery = lazyFrom(HERE_JSX, "./PastryGallery.jsx", "Photo Gallery");

// Optional modules (graceful placeholders if the files don’t exist)
const CakeBuilder = lazyFrom(UP_ONE_JSX, "../CakeBuilder.jsx", "Cake Builder");

// “Cake Orders” — you said the file is CustomCakeOrders.jsx in THIS folder.
// If not present, fall back to placeholder.
const CakeOrders =
  HERE_JSX["./CustomCakeOrders.jsx"]
    ? React.lazy(HERE_JSX["./CustomCakeOrders.jsx"])
    : React.lazy(() =>
        Promise.resolve({ default: () => <Placeholder title="Cake Orders" /> })
      );

// EchoCanvas — now wired to the Studio page inside CustomCakeStudio, with safe fallbacks.
// Tries Studio.tsx → Studio.jsx → index.tsx → index.jsx → (legacy ../EchoCanvas.jsx) → Placeholder.
const EchoCanvas = pickLazy(
  MODULE_PAGES,
  [
    "../../modules/CustomCakeStudio/pages/Studio.tsx",
    "../../modules/CustomCakeStudio/pages/Studio.jsx",
    "../../modules/CustomCakeStudio/pages/index.tsx",
    "../../modules/CustomCakeStudio/pages/index.jsx",
  ],
  "EchoCanvas"
) || (UP_ONE_JSX["../EchoCanvas.jsx"] ? React.lazy(UP_ONE_JSX["../EchoCanvas.jsx"]) : React.lazy(() => Promise.resolve({ default: () => <Placeholder title="EchoCanvas" /> })));

// These may not exist yet — render placeholders if missing:
const Chocolates  = lazyFrom(UP_ONE_JSX, "../Chocolates.jsx",  "Chocolates & Candies");
const Breads      = lazyFrom(UP_ONE_JSX, "../Breads.jsx",      "Breads & Doughs");
const Inventory   = lazyFrom(UP_ONE_JSX, "../Inventory.jsx",   "Inventory");
const Recipes     = lazyFrom(UP_ONE_JSX, "../Recipes.jsx",     "Recipes");
const Production  = lazyFrom(UP_ONE_JSX, "../Production.jsx",  "Production");

/* ---------------- Tabs registry ---------------- */
const ALL_TABS = [
  { id: "cake-builder", label: "Cake Builder",             color: "#E2A23B" },
  { id: "cake-orders",  label: "Cake Orders",              color: "#27B463" },
  { id: "echocanvas",   label: "EchoCanvas Studio",        color: "#1FB5C9" }, // marketing-friendly label
  { id: "choco",        label: "Chocolates & Candies",     color: "#D35F86" },
  { id: "breads",       label: "Breads & Doughs",          color: "#7F67E9" },
  { id: "inventory",    label: "Inventory",                color: "#DA9A27" },
  { id: "recipes",      label: "Recipes",                  color: "#23B06A" },
  { id: "new-recipe",   label: "New Recipe",               color: "#2C89E7" },
  { id: "gallery",      label: "Photo Gallery",            color: "#5561D6" },
  { id: "production",   label: "Production",               color: "#DD5B7A" },
];

const DEF_BACK  = ["cake-builder","cake-orders","echocanvas","choco","breads"];
const DEF_FRONT = ["inventory","recipes","new-recipe","gallery","production"];

const byId = Object.fromEntries(ALL_TABS.map(t => [t.id, t]));
const getLabel = (id) => byId[id]?.label || id;
const getDefaultColor = (id) => byId[id]?.color || "#63A3FF";

/* ---------------- Component ---------------- */
export default function PastryLibrary({ onlyTabId = null, winToken = null }) {
  const [placement, setPlacement] = useState(() => {
    const p = {};
    DEF_BACK.forEach((id)  => { p[id] = "back";  });
    DEF_FRONT.forEach((id) => { p[id] = "front"; });
    ALL_TABS.forEach(({ id }) => { if (!p[id]) p[id] = "hidden"; });
    return p;
  });

  const [colors, setColors]     = useState({});
  const [activeId, setActiveId] = useState(onlyTabId || "recipes");
  const [colored, setColored]   = useState(true);
  const [showSettings, setShowSettings] = useState(false);

  const back  = useMemo(() =>
    ALL_TABS.filter(t => placement[t.id] === "back")
            .map(t => ({ id:t.id, label:t.label, color: colors[t.id] || getDefaultColor(t.id) }))
  , [placement, colors]);

  const mid   = useMemo(() =>
    ALL_TABS.filter(t => placement[t.id] === "mid")
            .map(t => ({ id:t.id, label:t.label, color: colors[t.id] || getDefaultColor(t.id) }))
  , [placement, colors]);

  const front = useMemo(() =>
    ALL_TABS.filter(t => placement[t.id] === "front")
            .map(t => ({ id:t.id, label:t.label, color: colors[t.id] || getDefaultColor(t.id) }))
  , [placement, colors]);

  const current = useMemo(() => {
    const t = byId[activeId];
    return t ? { id: t.id, label: t.label } : null;
  }, [activeId]);

  const onReorder = ({ from, to }) => {
    const rowList = (row) => (row === "back" ? back : row === "mid" ? mid : front).map(t => t.id);
    const fromIds = rowList(from.row);
    const toIds   = from.row === to.row ? fromIds : rowList(to.row);

    const [moved] = fromIds.splice(from.index, 1);
    const insertAt = Math.max(0, Math.min(to.index, toIds.length));
    toIds.splice(insertAt, 0, moved);

    setPlacement(prev => {
      const next = { ...prev };
      fromIds.forEach(id => { next[id] = from.row; });
      toIds.forEach(id   => { next[id] = to.row;   });
      return next;
    });
  };

  const setTabPlacement = (id, row) => setPlacement(p => ({ ...p, [id]: row }));
  const setTabColor     = (id, hex) => setColors(c => ({ ...c, [id]: hex }));

  const reset = () => {
    const p = {};
    DEF_BACK.forEach((id)  => { p[id] = "back";  });
    DEF_FRONT.forEach((id) => { p[id] = "front"; });
    ALL_TABS.forEach(({ id }) => { if (!p[id]) p[id] = "hidden"; });
    setPlacement(p);
    setColors({});
    setActiveId("recipes");
    setColored(true);
  };

  const tearOutCurrentTab = () => {
    if (!current) return;
    window.dispatchEvent(
      new CustomEvent("open-panel", {
        detail: {
          id: "pastry",
          title: `${current.label}`,
          allowDuplicate: true,
          props: { onlyTabId: current.id }, // just this tab in a new window
        },
      })
    );
  };

  useEffect(() => {
    const onTear = () => tearOutCurrentTab();
    const onHome = () => {
      window.dispatchEvent(new CustomEvent("pastry-go-home"));
      if (onlyTabId && winToken) {
        window.dispatchEvent(new CustomEvent("board-close-by-token", { detail: { token: winToken } }));
      } else {
        setActiveId("recipes");
      }
    };
    const onSettings = (e) => {
      const toggle = e?.detail?.toggleColors === true;
      if (toggle) setColored(v => !v);
      else setShowSettings(true);
    };

    window.addEventListener("pastry-tear-out", onTear);
    window.addEventListener("pastry-home", onHome);
    window.addEventListener("pastry-open-settings", onSettings);
    return () => {
      window.removeEventListener("pastry-tear-out", onTear);
      window.removeEventListener("pastry-home", onHome);
      window.removeEventListener("pastry-open-settings", onSettings);
    };
  }, [onlyTabId, winToken, current]);

  useEffect(() => {
    const goHome = () => setActiveId("recipes");
    window.addEventListener("pastry-go-home", goHome);
    return () => window.removeEventListener("pastry-go-home", goHome);
  }, []);

  /* -------- Torn-out single-tab window -------- */
  if (onlyTabId) {
    const title = getLabel(onlyTabId);
    return (
      <div className="p-3 h-full overflow-auto">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-white/95">{title}</h2>
        </div>
        <div
          className="mt-2 rounded-xl p-0 overflow-hidden"
          style={{
            border: "1px solid rgba(34,211,238,.35)",
            boxShadow: "0 28px 120px rgba(0,255,240,.08), inset 0 0 0 1px rgba(0,0,0,.35)",
            background: "rgba(4,10,22,.78)",
          }}
        >
          <Suspense fallback={<div className="p-4 text-white/85">Loading…</div>}>
            {renderTab(onlyTabId)}
          </Suspense>
        </div>
      </div>
    );
  }

  /* ---------------- Main panel ---------------- */
  return (
    <div className="p-3 h-full overflow-auto">
      <DoubleTabs
        backRow={back}
        midRow={mid}
        frontRow={front}
        activeId={activeId}
        colored={colored}
        onChange={setActiveId}
        onReorder={onReorder}
        size="md"
      />

      <div
        className="mt-3 rounded-xl p-0 overflow-hidden"
        style={{
          border: "1px solid rgba(34,211,238,.35)",
          boxShadow: "0 28px 120px rgba(0,255,240,.08), inset 0 0 0 1px rgba(0,0,0,.35)",
          background: "rgba(4,10,22,.78)",
        }}
      >
        <Suspense fallback={<div className="p-4 text-white/85">Loading…</div>}>
          {renderTab(activeId)}
        </Suspense>
      </div>

      {/* Settings modal */}
      {showSettings && (
        <div
          className="fixed inset-0 z-[9999] bg-black/45 backdrop-blur-sm flex items-center justify-center"
          onClick={() => setShowSettings(false)}
        >
          <div
            className="w-[760px] max-w-[95vw] rounded-2xl"
            onClick={(e) => e.stopPropagation()}
            style={{
              border: "1px solid rgba(34,211,238,.28)",
              background: "linear-gradient(180deg, rgba(4,10,22,.96), rgba(4,10,22,.92))",
              boxShadow: "0 40px 120px rgba(0,0,0,.55)",
            }}
          >
            <div className="p-5">
              <h4 className="text-white/95 text-lg font-semibold mb-3">
                Pastry Tabs — Settings
              </h4>

              <div className="mb-4">
                <label className="inline-flex items-center gap-2 text-white/85 text-sm">
                  <input
                    type="checkbox"
                    checked={colored}
                    onChange={(e) => setColored(e.target.checked)}
                  />
                  <span>Use per-tab colors</span>
                </label>
              </div>

              <div className="max-h-[50vh] overflow-auto pr-1 space-y-2">
                {ALL_TABS.map((t) => {
                  const where = placement[t.id] || "hidden";
                  const value = colors[t.id] || getDefaultColor(t.id);
                  return (
                    <div
                      key={t.id}
                      className="flex items-center justify-between gap-3 rounded-lg px-3 py-2"
                      style={{
                        background: "rgba(255,255,255,.04)",
                        border: "1px solid rgba(255,255,255,.06)",
                      }}
                    >
                      <div className="min-w-0">
                        <div className="text-white/90 font-medium">{t.label}</div>
                        <div className="text-white/50 text-xs">id: {t.id}</div>
                      </div>

                      <div className="flex items-center gap-3">
                        <label className="flex items-center gap-2 text-white/80 text-sm">
                          <span>Color</span>
                          <input
                            type="color"
                            value={value}
                            onChange={(e) => setTabColor(t.id, e.target.value)}
                            className="h-7 w-10 p-0 bg-transparent border rounded cursor-pointer"
                          />
                        </label>
                        <label className="flex items-center gap-2 text-white/80 text-sm">
                          <span>Row</span>
                          <select
                            value={where}
                            onChange={(e) => setTabPlacement(t.id, e.target.value)}
                            className="bg-slate-800/70 text-white/90 text-sm rounded px-2 py-1 border border-white/10"
                          >
                            <option value="hidden">Hidden</option>
                            <option value="back">Top (Back)</option>
                            <option value="mid">Middle</option>
                            <option value="front">Bottom (Front)</option>
                          </select>
                        </label>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="mt-5 flex items-center justify-end gap-2">
                <button className="px-3 py-1 rounded-md bg-slate-700 text-white hover:brightness-110" onClick={reset}>
                  Reset
                </button>
                <button
                  className="px-3 py-1 rounded-md bg-cyan-600 text-white hover:brightness-110"
                  onClick={() => setShowSettings(false)}
                >
                  Done
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ---------------- Tab renderer ---------------- */
function renderTab(id) {
  switch (id) {
    case "cake-builder":   return <CakeBuilder />;
    case "cake-orders":    return <CakeOrders />;
    case "echocanvas":     return <EchoCanvas />;   // now wired to Studio
    case "choco":          return <Chocolates />;   // placeholder until built
    case "breads":         return <Breads />;       // placeholder until built
    case "inventory":      return <Inventory />;    // placeholder until built
    case "recipes":        return <Recipes />;
    case "new-recipe":     return <PastryRecipeInputPage />;
    case "gallery":        return <PastryGallery />;
    case "production":     return <Production />;
    default:
      return (
        <div className="p-4">
          <h3 className="text-white/95 text-xl font-semibold mb-2">{getLabel(id)}</h3>
          <p className="text-white/80">
            Unknown tab id: <code>{id}</code>
          </p>
        </div>
      );
  }
}
