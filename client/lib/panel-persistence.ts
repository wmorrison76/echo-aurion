/**
 * Panel State Persistence
 * Manages saving and restoring panel positions, sizes, and open/closed states
 */

import { PanelState, PanelId } from "@/components/site/panels/types";

const STORAGE_KEY = "panel-host-state";
const PANEL_OPEN_KEY = "panel-open-panels";
const PANEL_POSITIONS_KEY = "panel-positions";
const PANEL_SIZES_KEY = "panel-sizes";

export interface PersistedPanelState {
  positions: Record<string, { x: number; y: number }>;
  sizes: Record<string, { width: number; height: number }>;
  openPanels: string[];
  lastActivePanel?: string;
  panelFrequency: Record<string, number>; // How often each panel is opened
}

/**
 * Load persisted panel state from localStorage
 */
export function loadPersistedPanelState(): PersistedPanelState {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (err) {
    console.warn("[PanelPersistence] Failed to load persisted state:", err);
  }

  return {
    positions: {},
    sizes: {},
    openPanels: [],
    panelFrequency: {},
  };
}

/**
 * Save panel state to localStorage
 */
export function savePersistedPanelState(state: PersistedPanelState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (err) {
    console.warn("[PanelPersistence] Failed to save persisted state:", err);
  }
}

/**
 * Record a panel being opened (for frequency tracking)
 */
export function recordPanelOpen(panelKey: string): void {
  try {
    const state = loadPersistedPanelState();
    state.panelFrequency[panelKey] =
      (state.panelFrequency[panelKey] ?? 0) + 1;
    state.lastActivePanel = panelKey;
    savePersistedPanelState(state);
  } catch (err) {
    console.warn("[PanelPersistence] Failed to record panel open:", err);
  }
}

/**
 * Record a panel being closed
 */
export function recordPanelClose(panelId: PanelId, panelKey?: string): void {
  try {
    const state = loadPersistedPanelState();
    state.openPanels = state.openPanels.filter((id) => id !== panelId);
    savePersistedPanelState(state);
  } catch (err) {
    console.warn("[PanelPersistence] Failed to record panel close:", err);
  }
}

/**
 * Save panel position and size
 */
export function savePanelLayout(
  panelId: PanelId,
  position: { x: number; y: number },
  size: { width: number; height: number }
): void {
  try {
    const state = loadPersistedPanelState();
    state.positions[panelId] = position;
    state.sizes[panelId] = size;
    savePersistedPanelState(state);
  } catch (err) {
    console.warn("[PanelPersistence] Failed to save panel layout:", err);
  }
}

/**
 * Get saved position for a panel
 */
export function getSavedPosition(
  panelId: PanelId,
  defaultPosition: { x: number; y: number }
): { x: number; y: number } {
  try {
    const state = loadPersistedPanelState();
    return state.positions[panelId] ?? defaultPosition;
  } catch {
    return defaultPosition;
  }
}

/**
 * Get saved size for a panel
 */
export function getSavedSize(
  panelId: PanelId,
  defaultSize: { width: number; height: number }
): { width: number; height: number } {
  try {
    const state = loadPersistedPanelState();
    return state.sizes[panelId] ?? defaultSize;
  } catch {
    return defaultSize;
  }
}

/**
 * Get panels sorted by frequency and last active (for lazy loading priority)
 */
export function getPanelLoadingPriority(): string[] {
  try {
    const state = loadPersistedPanelState();

    // Sort by frequency (descending) and then by last active
    const panels = Object.entries(state.panelFrequency)
      .sort(([, freqA], [, freqB]) => freqB - freqA)
      .map(([panelKey]) => panelKey);

    // If lastActivePanel exists and is not in the list, add it to the front
    if (
      state.lastActivePanel &&
      !panels.includes(state.lastActivePanel)
    ) {
      panels.unshift(state.lastActivePanel);
    }

    return panels;
  } catch (err) {
    console.warn(
      "[PanelPersistence] Failed to get panel loading priority:",
      err
    );
    return [];
  }
}

/**
 * Clear all persisted panel state
 */
export function clearPersistedPanelState(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(PANEL_OPEN_KEY);
    localStorage.removeItem(PANEL_POSITIONS_KEY);
    localStorage.removeItem(PANEL_SIZES_KEY);
  } catch (err) {
    console.warn("[PanelPersistence] Failed to clear persisted state:", err);
  }
}

/**
 * Clear EVERY persistence layer used by the panel host.
 *
 * Two layers are in play and both must be wiped at profile-switch /
 * logout boundaries so the next signed-in user doesn't inherit the prior
 * user's open panels, positions, sizes, or sticky notes:
 *
 *   1) localStorage  — STORAGE_KEY ("panel-host-state") + the three legacy
 *      open/positions/sizes keys (already cleared by clearPersistedPanelState).
 *   2) IndexedDB     — database "luccca-panel-storage", object stores
 *      "panel-state" and "sticky-notes-positions".
 *
 * The IndexedDB wipe is best-effort: if the browser blocks the delete
 * (e.g. another tab still has the DB open) we resolve anyway after a
 * short timeout so the caller's redirect/reload isn't held up.
 */
export async function clearAllPanelPersistence(): Promise<void> {
  // Layer 1 — localStorage
  clearPersistedPanelState();
  // Belt-and-braces: also drop the sticky-notes-positions companion key if it
  // was ever mirrored into localStorage by an older build.
  try { localStorage.removeItem("sticky-notes-positions"); } catch { /* ignore */ }

  // Layer 2 — IndexedDB. Use a hard 1.5s timeout so we never hang the redirect.
  if (typeof indexedDB === "undefined") return;
  const STORES = ["panel-state", "sticky-notes-positions"];
  const DB_NAME = "luccca-panel-storage";
  await new Promise<void>((resolve) => {
    let done = false;
    const finish = () => { if (!done) { done = true; resolve(); } };
    const t = window.setTimeout(finish, 1500);
    try {
      const openReq = indexedDB.open(DB_NAME);
      openReq.onerror = () => { window.clearTimeout(t); finish(); };
      openReq.onsuccess = () => {
        const db = openReq.result;
        const present = STORES.filter((s) => db.objectStoreNames.contains(s));
        if (present.length === 0) {
          try { db.close(); } catch { /* ignore */ }
          window.clearTimeout(t); finish();
          return;
        }
        let tx: IDBTransaction;
        try {
          tx = db.transaction(present, "readwrite");
        } catch (err) {
          console.warn("[PanelPersistence] IDB transaction failed:", err);
          try { db.close(); } catch { /* ignore */ }
          window.clearTimeout(t); finish();
          return;
        }
        for (const name of present) {
          try { tx.objectStore(name).clear(); } catch { /* ignore */ }
        }
        tx.oncomplete = () => {
          try { db.close(); } catch { /* ignore */ }
          window.clearTimeout(t); finish();
        };
        tx.onerror = () => {
          try { db.close(); } catch { /* ignore */ }
          window.clearTimeout(t); finish();
        };
        tx.onabort = () => {
          try { db.close(); } catch { /* ignore */ }
          window.clearTimeout(t); finish();
        };
      };
    } catch (err) {
      console.warn("[PanelPersistence] IDB open failed:", err);
      window.clearTimeout(t); finish();
    }
  });
}
