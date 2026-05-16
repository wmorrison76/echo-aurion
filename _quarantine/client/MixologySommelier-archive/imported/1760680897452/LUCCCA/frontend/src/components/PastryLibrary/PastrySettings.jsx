import React, { useEffect, useMemo, useState } from "react";

/**
 * PastrySettings
 * - Dual list (Available ⇄ Active)
 * - Reorder, assign row (front/back)
 * - Per-row limits
 * - Save to localStorage and notify PastryLibrary to refresh
 */

const STORAGE_KEY = "tabs:pastry@v1";

// Master list (the "universe"). Edit labels/colors here as needed.
const UNIVERSE = [
  { id: "cake-builder",  label: "Cake Builder",         color: "#E2A23B" },
  { id: "cake-orders",   label: "Cake Orders",          color: "#D97A6D" },
  { id: "echocanvas",    label: "EchoCanvas",           color: "#5AAAE0" }, // renamed from "EchoCanva"
  { id: "chocolates",    label: "Chocolates & Candies", color: "#8B5CF6" },
  { id: "breads",        label: "Breads & Doughs",      color: "#B7791F" },
  { id: "inventory",     label: "Inventory",            color: "#06B6D4" },
  { id: "recipes",       label: "Recipes",              color: "#0EA5E9" },
  { id: "new-recipe",    label: "New Recipe",           color: "#22C55E" },
  { id: "gallery",       label: "Photo Gallery",        color: "#F97316" },
  { id: "production",    label: "Production",           color: "#64748B" },
];

const byId = Object.fromEntries(UNIVERSE.map(t => [t.id, t]));

// Default layout (matches what you’ve been using)
const DEFAULT_CONFIG = {
  back:  [
    "cake-builder",
    "cake-orders",
    "echocanvas",
    "chocolates",
    "breads",
  ],
  front: [
    "inventory",
    "recipes",
    "new-recipe",
    "gallery",
    "production",
  ],
  maxBack:  99,   // per-row soft limits
  maxFront: 99,
};

function loadConfig() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_CONFIG;
    const parsed = JSON.parse(raw);
    // keep defaults for any missing fields
    return {
      ...DEFAULT_CONFIG,
      ...parsed,
      back:  Array.isArray(parsed?.back)  ? parsed.back  : DEFAULT_CONFIG.back,
      front: Array.isArray(parsed?.front) ? parsed.front : DEFAULT_CONFIG.front,
    };
  } catch {
    return DEFAULT_CONFIG;
  }
}

function saveConfig(cfg) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(cfg));
  // Let consumers update immediately
  window.dispatchEvent(new CustomEvent("pastry-tabs-changed"));
}

function listMinus(all, ids) {
  const set = new Set(ids);
  return all.filter((t) => !set.has(t.id));
}

export default function PastrySettings() {
  const [cfg, setCfg] = useState(loadConfig);

  // active objects (with row assignment) and available
  const activeBack  = useMemo(() => cfg.back.map(id => byId[id]).filter(Boolean), [cfg.back]);
  const activeFront = useMemo(() => cfg.front.map(id => byId[id]).filter(Boolean), [cfg.front]);

  const activeIDs   = useMemo(() => new Set([...cfg.back, ...cfg.front]), [cfg.back, cfg.front]);
  const available   = useMemo(() => UNIVERSE.filter(t => !activeIDs.has(t.id)), [activeIDs]);

  // selections for each list
  const [selAvail,  setSelAvail]  = useState([]);
  const [selActive, setSelActive] = useState([]); // store ids with row info: "front:id" or "back:id"

  // helpers
  const addToRow = (row) => {
    if (!selAvail.length) return;
    const ids = selAvail;
    setCfg((c) => {
      const next = { ...c, back: [...c.back], front: [...c.front] };
      ids.forEach((id) => {
        // remove from both rows if present
        next.back  = next.back.filter(x => x !== id);
        next.front = next.front.filter(x => x !== id);
        // add to target row at end
        if (row === "back")  next.back.push(id);
        else                 next.front.push(id);
      });
      return next;
    });
    setSelAvail([]);
  };

  const removeSelectedActive = () => {
    if (!selActive.length) return;
    const pairs = selActive.map(tok => tok.split(":")); // [row, id]
    setCfg((c) => {
      const next = { ...c, back: [...c.back], front: [...c.front] };
      pairs.forEach(([row, id]) => {
        if (row === "back")  next.back  = next.back.filter(x => x !== id);
        if (row === "front") next.front = next.front.filter(x => x !== id);
      });
      return next;
    });
    setSelActive([]);
  };

  const moveRowOfSelected = (targetRow) => {
    if (!selActive.length) return;
    const pairs = selActive.map(tok => tok.split(":")); // [row, id]
    setCfg((c) => {
      const next = { ...c, back: [...c.back], front: [...c.front] };
      pairs.forEach(([row, id]) => {
        // remove from original
        if (row === "back")  next.back  = next.back.filter(x => x !== id);
        if (row === "front") next.front = next.front.filter(x => x !== id);
        // add to target
        if (targetRow === "back") next.back.push(id);
        else                      next.front.push(id);
      });
      return next;
    });
    // flip tokens to new row
    setSelActive(prev => prev.map(tok => {
      const [, id] = tok.split(":");
      return `${targetRow}:${id}`;
    }));
  };

  const reorder = (row, dir) => {
    if (!selActive.length) return;
    const selIdsInRow = selActive
      .filter(tok => tok.startsWith(row + ":"))
      .map(tok => tok.split(":")[1]);
    if (!selIdsInRow.length) return;

    setCfg((c) => {
      const arr = [...(row === "back" ? c.back : c.front)];
      // Reorder each selected id one step (maintain relative order)
      const step = dir === "up" ? -1 : 1;
      const indexes = selIdsInRow.map(id => arr.indexOf(id)).filter(i => i >= 0).sort((a,b)=>a-b);
      const canMove = dir === "up"
        ? indexes[0] > 0
        : indexes[indexes.length - 1] < arr.length - 1;
      if (!canMove) return c;

      const swap = (i, j) => { const t = arr[i]; arr[i] = arr[j]; arr[j] = t; };

      if (dir === "up") {
        indexes.forEach(i => swap(i, i - 1));
      } else {
        indexes.slice().reverse().forEach(i => swap(i, i + 1));
      }

      return row === "back" ? { ...c, back: arr } : { ...c, front: arr };
    });
  };

  const onSave = () => saveConfig(cfg);
  const onReset = () => {
    setCfg(DEFAULT_CONFIG);
  };

  // Render helpers
  const renderOption = (t) => (
    <option key={t.id} value={t.id}>
      {t.label}
    </option>
  );

  const renderActiveOption = (row, id) => {
    const t = byId[id];
    if (!t) return null;
    return (
      <option key={row + ":" + id} value={row + ":" + id}>
        [{row === "front" ? "bottom" : "top"}] {t.label}
      </option>
    );
  };

  return (
    <div className="p-4 sm:p-6 text-sm">
      <h2 className="text-lg font-semibold mb-4">Baking &amp; Pastry — Tabs Settings</h2>

      {/* Limits */}
      <div className="mb-4 flex flex-wrap items-end gap-6">
        <div>
          <label className="block text-xs mb-1">Max tabs (Top row)</label>
          <input
            type="number"
            min={1}
            className="border rounded px-2 py-1 w-28 bg-white dark:bg-slate-900"
            value={cfg.maxBack}
            onChange={(e) => setCfg({ ...cfg, maxBack: Math.max(1, Number(e.target.value || 1)) })}
          />
        </div>
        <div>
          <label className="block text-xs mb-1">Max tabs (Bottom row)</label>
          <input
            type="number"
            min={1}
            className="border rounded px-2 py-1 w-28 bg-white dark:bg-slate-900"
            value={cfg.maxFront}
            onChange={(e) => setCfg({ ...cfg, maxFront: Math.max(1, Number(e.target.value || 1)) })}
          />
        </div>

        <div className="ml-auto flex gap-2">
          <button onClick={onReset} className="px-3 py-1.5 rounded border hover:bg-black/5 dark:hover:bg-white/5">
            Reset to defaults
          </button>
          <button onClick={onSave} className="px-3 py-1.5 rounded bg-cyan-500 text-white hover:brightness-110">
            Save
          </button>
        </div>
      </div>

      {/* Dual list */}
      <div className="grid grid-cols-1 md:grid-cols-[1fr_auto_1fr] gap-4">
        {/* Available */}
        <div>
          <div className="font-medium mb-1">Available ({available.length})</div>
          <select
            multiple
            size={12}
            className="w-full border rounded p-2 bg-white dark:bg-slate-900"
            value={selAvail}
            onChange={(e) => {
              const vals = Array.from(e.target.selectedOptions).map(o => o.value);
              setSelAvail(vals);
            }}
          >
            {listMinus(UNIVERSE, [...cfg.back, ...cfg.front]).map(renderOption)}
          </select>
        </div>

        {/* arrows */}
        <div className="flex flex-col items-center justify-center gap-2">
          <button
            className="px-3 py-1.5 rounded border hover:bg-black/5 dark:hover:bg-white/5"
            onClick={() => addToRow("back")}
            title="Add to TOP row"
          >
            ↑ add top
          </button>
          <button
            className="px-3 py-1.5 rounded border hover:bg-black/5 dark:hover:bg.white/5 dark:hover:bg-white/5"
            onClick={() => addToRow("front")}
            title="Add to BOTTOM row"
          >
            add bottom ↓
          </button>
          <button
            className="mt-2 px-3 py-1.5 rounded border hover:bg-black/5 dark:hover:bg-white/5"
            onClick={removeSelectedActive}
            title="Remove from active"
          >
            remove ◀
          </button>
        </div>

        {/* Active */}
        <div className="grid grid-rows-[auto_auto_1fr] gap-2">
          <div className="font-medium">Active ({cfg.back.length + cfg.front.length})</div>

          {/* Row move */}
          <div className="flex flex-wrap gap-2">
            <button
              className="px-3 py-1.5 rounded border hover:bg-black/5 dark:hover:bg-white/5"
              onClick={() => moveRowOfSelected("back")}
              title="Move selection to TOP row"
            >
              to top row
            </button>
            <button
              className="px-3 py-1.5 rounded border hover:bg-black/5 dark:hover:bg-white/5"
              onClick={() => moveRowOfSelected("front")}
              title="Move selection to BOTTOM row"
            >
              to bottom row
            </button>

            {/* Reorder within a row */}
            <span className="ml-auto" />
            <button
              className="px-3 py-1.5 rounded border hover:bg-black/5 dark:hover:bg-white/5"
              onClick={() => reorder("back", "up")}
              title="Top row: move up"
            >
              ⬆ top
            </button>
            <button
              className="px-3 py-1.5 rounded border hover:bg-black/5 dark:hover:bg.white/5 dark:hover:bg-white/5"
              onClick={() => reorder("back", "down")}
              title="Top row: move down"
            >
              ⬇ top
            </button>
            <button
              className="px-3 py-1.5 rounded border hover:bg-black/5 dark:hover:bg-white/5"
              onClick={() => reorder("front", "up")}
              title="Bottom row: move up"
            >
              ⬆ bottom
            </button>
            <button
              className="px-3 py-1.5 rounded border hover:bg-black/5 dark:hover:bg-white/5"
              onClick={() => reorder("front", "down")}
              title="Bottom row: move down"
            >
              ⬇ bottom
            </button>
          </div>

          <select
            multiple
            size={12}
            className="w-full border rounded p-2 bg-white dark:bg-slate-900"
            value={selActive}
            onChange={(e) => {
              const vals = Array.from(e.target.selectedOptions).map(o => o.value);
              setSelActive(vals);
            }}
          >
            {/* show top row first, then bottom */}
            {cfg.back.map(id => renderActiveOption("back", id))}
            {cfg.front.map(id => renderActiveOption("front", id))}
          </select>
        </div>
      </div>
    </div>
  );
}
