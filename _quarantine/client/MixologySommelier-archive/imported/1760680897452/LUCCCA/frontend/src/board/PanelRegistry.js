// src/board/PanelRegistry.js
// Central registry for all mountable panels in the Board.
// Each entry maps a key -> { title, Component (React.lazy), icon? }

import React from "react";

// ---------- Lazy Panels ----------
const WhiteboardPanel     = React.lazy(() => import("../components/WhiteboardPanel.jsx"));
const KitchenLibraryTabs  = React.lazy(() => import("../components/KitchenLibraryTabs.jsx"));
// NOTE: path preserved from your snippet; keep if the .bak_scan build is intended
const PastryLibrary       = React.lazy(() => import("../components/PastryLibrary/PastryLibrary.jsx.bak_scan/index.js"));
const Mixology            = React.lazy(() => import("../components/MixologyTabs.jsx"));
const SchedulerPanel      = React.lazy(() => import("../modules/scheduling/SchedulerPanel.jsx"));

// New: EchoRecipePro (DoubleTabs-powered)
const EchoRecipeProPanel  = React.lazy(() => import("../components/EchoRecipePro/EchoRecipeProPanel.jsx"));

// ---------- Icons ----------
import kitchenIcon  from "../assets/culinary_library.png";
import pastryIcon   from "../assets/baking-&-Pastry.png";
import mixologyIcon from "../assets/mixology.png";
import scheduleIcon from "../assets/schedule.png";
// You can add a custom EchoRecipePro icon when ready:
// import recipeProIcon from "../assets/recipepro.png";

/**
 * @typedef {Object} PanelEntry
 * @property {string} title
 * @property {React.LazyExoticComponent<React.ComponentType<any>>} Component
 * @property {string | null | undefined} [icon]
 */

/** @type {Record<string, PanelEntry>} */
export const PANEL_REGISTRY = {
  // Core
  dashboard:   { title: "Dashboard",        Component: WhiteboardPanel,    icon: null },
  whiteboard:  { title: "Whiteboard",       Component: WhiteboardPanel,    icon: null },

  // Libraries
  culinary:    { title: "Kitchen Library",  Component: KitchenLibraryTabs, icon: kitchenIcon },
  pastry:      { title: "Baking & Pastry",  Component: PastryLibrary,      icon: pastryIcon },
  mixology:    { title: "Mixology",         Component: Mixology,           icon: mixologyIcon },

  // Schedules
  scheduling:  { title: "Schedules",        Component: SchedulerPanel,     icon: scheduleIcon },

  // Echo Recipe Pro (tabs: Recipe Search, Photos, Add Recipe, Production)
  recipepro:   { title: "EchoRecipePro",    Component: EchoRecipeProPanel, icon: null },
};

// ---------- Helpers ----------

/** Returns the list of valid panel keys (for menus, pickers, etc.) */
export const PANEL_KEYS = Object.freeze(Object.keys(PANEL_REGISTRY));

/**
 * Safely resolve a panel entry by key. Returns `undefined` if not found.
 * @param {string} key
 * @returns {PanelEntry | undefined}
 */
export function getPanel(key) {
  return PANEL_REGISTRY[key];
}

/**
 * Optionally warm up/lazy-preload a set of panels so first open is snappy.
 * Call once after app boot, e.g., in Board mount effect.
 * @param {string[]} keys
 */
export function preloadPanels(keys = []) {
  keys.forEach((k) => {
    const entry = PANEL_REGISTRY[k];
    if (!entry) return;
    // Trigger the dynamic import by briefly rendering the promise.
    // React.lazy caches the module after the first call.
    entry.Component._payload?.then?.(() => void 0);
    // If React internals differ, we can still nudge the import by calling:
    // (entry.Component._init || entry.Component).call(null, entry.Component._payload);
  });
}
