/**
 * Enhanced Panel Store (Zustand)
 * Complete implementation with IndexedDB persistence
 * Phase 1 + Phase 2 integration
 */

import { create } from "zustand";
import { devtools, persist } from "zustand/middleware";
import type { PanelId, PanelState, PanelEntry } from "@/components/site/panels/types";
import {
  savePanelState,
  loadPanelStates,
  deletePanelState,
  clearPanelStates,
  migrateFromLocalStorage,
} from "./panel-storage";
import type { PanelKey } from "@/lib/panel-registry";
import { RESTORATION_PHASES, getPanelPhase, getPanelPriority } from "@/lib/panel-restoration-phases";

interface PanelStoreState {
  // State
  panels: Record<PanelId, PanelState>;
  nextZIndex: number;
  isInitialized: boolean;
  isRestoringPanels: boolean;
  restorationPhase: number;

  // Actions
  initialize: () => Promise<void>;
  addPanel: (id: PanelId, state: Omit<PanelState, "zIndex">) => Promise<void>;
  removePanel: (id: PanelId) => Promise<void>;
  updatePanel: (id: PanelId, updates: Partial<PanelState>) => Promise<void>;
  minimizePanel: (id: PanelId) => Promise<void>;
  expandPanel: (id: PanelId) => Promise<void>;
  focusPanel: (id: PanelId) => void;
  setPanelPosition: (id: PanelId, position: { x: number; y: number }) => Promise<void>;
  setPanelSize: (id: PanelId, size: { width: number; height: number }) => Promise<void>;
  toggleExpand: (id: PanelId) => Promise<void>;
  clearAll: () => Promise<void>;
  setRestorationPhase: (phase: number) => void;

  // Getters
  getPanel: (id: PanelId) => PanelState | undefined;
  getOpenPanels: () => PanelState[];
  getMaxZIndex: () => number;
  getNextZIndex: () => number;
}

const INITIAL_Z_INDEX = 20010;

// ─── Viewport-aware panel clamping (iter165) ────────────────────────────────
// Ensures every panel position + size stays inside the visible viewport.
// Leaves a small edge margin so the panel header + controls are always reachable.
const VIEWPORT_EDGE_MARGIN = 12;
const LEFT_SIDEBAR_WIDTH = 56;   // matches default collapsed sidebar
const TOP_BAR_HEIGHT = 8;
const MIN_PANEL_WIDTH = 320;
const MIN_PANEL_HEIGHT = 220;

function getViewport(): { width: number; height: number } {
  if (typeof window === "undefined") return { width: 1440, height: 900 };
  return { width: window.innerWidth, height: window.innerHeight };
}

function clampSize(size?: { width: number; height: number }): { width: number; height: number } {
  const vp = getViewport();
  const maxW = Math.max(MIN_PANEL_WIDTH, vp.width - LEFT_SIDEBAR_WIDTH - VIEWPORT_EDGE_MARGIN);
  const maxH = Math.max(MIN_PANEL_HEIGHT, vp.height - TOP_BAR_HEIGHT - VIEWPORT_EDGE_MARGIN);
  const w = size?.width ?? 900;
  const h = size?.height ?? 600;
  return {
    width: Math.min(Math.max(MIN_PANEL_WIDTH, w), maxW),
    height: Math.min(Math.max(MIN_PANEL_HEIGHT, h), maxH),
  };
}

function clampPosition(
  pos: { x: number; y: number } | undefined,
  size: { width: number; height: number },
): { x: number; y: number } {
  const vp = getViewport();
  // iter266.4 · Match Panel.tsx drag clamp — keep ≥60px visible on each side
  // so users can always grab the panel back. The previous bounds prevented
  // wide panels (>= viewport - sidebar) from dragging in X at all because
  // maxX ≤ LEFT_SIDEBAR_WIDTH was the only legal x.
  const MIN_VISIBLE = 60;
  const x = pos?.x ?? LEFT_SIDEBAR_WIDTH + 24;
  const y = pos?.y ?? TOP_BAR_HEIGHT + 24;
  const minX = -(size.width - MIN_VISIBLE);
  const maxX = vp.width - MIN_VISIBLE;
  const minY = 0;
  const maxY = vp.height - MIN_VISIBLE;
  return {
    x: Math.min(Math.max(minX, x), maxX),
    y: Math.min(Math.max(minY, y), maxY),
  };
}

/** Apply clamp to both size + position of a panel state. */
function clampPanel<T extends Partial<PanelState>>(state: T): T {
  const clampedSize = clampSize(state.size as any);
  const clampedPos = clampPosition(state.position as any, clampedSize);
  return { ...state, size: clampedSize, position: clampedPos } as T;
}

/**
 * Ask user about panel restoration preference when many panels are persisted
 * Returns "all", "critical-only", or "clear"
 */
async function askPanelRestorationPreference(
  panelCount: number
): Promise<"all" | "critical-only" | "clear"> {
  return new Promise((resolve) => {
    // Use native browser confirm for quick decision
    const message = `You have ${panelCount} panels open. Restoring all panels may be slow.\n\n` +
      'How would you like to proceed?\n\n' +
      '"OK" = Restore all panels\n' +
      '"Cancel" = Restore critical panels only';

    const userChoosesAll = confirm(message);

    if (userChoosesAll) {
      resolve("all");
    } else {
      // Ask if they want to proceed with critical only or start fresh
      const proceedWithCritical = confirm(
        'Restore critical panels only?\n\n' +
        '"OK" = Restore critical panels only\n' +
        '"Cancel" = Start fresh (clear all panels)'
      );

      resolve(proceedWithCritical ? "critical-only" : "clear");
    }
  });
}

/**
 * Restore panels in phases to prevent overwhelming the browser
 * Phases allow user interaction within 500ms while rest loads in background
 */
async function restoreLastSessionPanels(
  states: any[],
  set: any,
  get: any,
): Promise<void> {
  // Group panels by restoration phase
  const panelsByPhase = new Map<number, any[]>();

  states.forEach((panelState) => {
    const panelKey = panelState.entry?.panelKey;
    const phase = panelKey ? getPanelPhase(panelKey) : RESTORATION_PHASES.length - 1;

    if (!panelsByPhase.has(phase)) {
      panelsByPhase.set(phase, []);
    }
    panelsByPhase.get(phase)!.push(panelState);
  });

  // Load each phase sequentially with appropriate delays
  for (const phase of RESTORATION_PHASES) {
    const panelsInPhase = panelsByPhase.get(phase.phaseNumber) || [];

    if (panelsInPhase.length === 0) continue;

    // Wait for phase delay
    if (phase.delayMs > 0) {
      await new Promise((resolve) => setTimeout(resolve, phase.delayMs));
    }

    // Load all panels in this phase
    const panels: Record<PanelId, PanelState> = {};
    panelsInPhase.forEach((p: any) => {
      panels[p.entry.id] = {
        ...p,
        entry: {
          ...p.entry,
        }
      } as any;
    });

    // Merge with existing panels
    set((state: any) => ({
      panels: {
        ...state.panels,
        ...panels,
      }
    }), false, `restore/phase/${phase.phaseNumber}`);

    // Update restoration phase progress
    set({ restorationPhase: phase.phaseNumber }, false, `restoration/phase/${phase.phaseNumber}`);
  }
}

// Use IndexedDB storage adapter for Zustand
const indexedDBStorage = {
  getItem: async (name: string): Promise<string | null> => {
    try {
      const states = await loadPanelStates();
      return JSON.stringify({ state: { panels: states } });
    } catch {
      return null;
    }
  },
  setItem: async (name: string, value: string): Promise<void> => {
    try {
      const parsed = JSON.parse(value);
      if (parsed.state?.panels) {
        // Save each panel state
        for (const panel of parsed.state.panels) {
          await savePanelState(panel);
        }
      }
    } catch (error) {
      console.error("[PanelStore] Failed to persist to IndexedDB:", error);
    }
  },
  removeItem: async (name: string): Promise<void> => {
    await clearPanelStates();
  },
};

export const usePanelStoreEnhanced = create<PanelStoreState>()(
  devtools(
    (set, get) => ({
      panels: {},
      nextZIndex: 0,
      isInitialized: false,
      isRestoringPanels: false,
      restorationPhase: -1,

      initialize: async () => {
        if (get().isInitialized) return;

        // Use a timeout for initialization to ensure panels render even if storage is slow/failing
        const initTimeout = 1500; // 1.5s
        let timedOut = false;

        const timeoutPromise = new Promise<void>((resolve) => {
          setTimeout(() => {
            timedOut = true;
            console.warn("[PanelStore] Initialization timeout (3s) - continuing with defaults");
            resolve();
          }, initTimeout);
        });

        const workPromise = (async () => {
          try {
            await migrateFromLocalStorage();
            if (timedOut) return;
            const states = await loadPanelStates();
            if (timedOut) return;

            if (states && states.length > 0) {
              // Check if many panels are persisted
              if (states.length > 15) {
                // Ask user for conditional restoration preference
                const choice = await askPanelRestorationPreference(states.length);

                if (choice === "clear") {
                  // Clear all panels - don't restore
                  await clearPanelStates();
                  return;
                } else if (choice === "critical-only") {
                  // Filter to critical panels only
                  const criticalPanels = states.filter(
                    (p) => {
                      const panelKey = p.entry?.panelKey;
                      const priority = getPanelPriority(panelKey);
                      return priority === "critical" || priority === "high";
                    }
                  );
                  if (criticalPanels.length > 0) {
                    set({ isRestoringPanels: true }, false, "initialize/startPhased");
                    await restoreLastSessionPanels(criticalPanels, set, get);
                  }
                  return;
                }
              }

              // Default: restore all panels with phased restoration if more than 1
              if (states.length > 1) {
                set({ isRestoringPanels: true }, false, "initialize/startPhased");
                await restoreLastSessionPanels(states, set, get);
              } else {
                // Single panel - load immediately
                const panels: Record<PanelId, PanelState> = {};
                states.forEach((p) => {
                  panels[p.entry.id] = {
                    ...p,
                    entry: {
                      ...p.entry,
                    }
                  } as any;
                });
                set({ panels }, false, "initialize/loadStates");
              }
            }
          } catch (e) {
            console.warn("[PanelStore] Initialization work failed:", e);
          }
        })();

        await Promise.race([workPromise, timeoutPromise]);
        set({ isInitialized: true, isRestoringPanels: false }, false, "initialize");
      },

      addPanel: async (id, state) => {
        const nextZ = get().getNextZIndex();
        const clamped = clampPanel(state as any);
        const panel: PanelState = {
          ...clamped,
          zIndex: nextZ,
        } as PanelState;

        set(
          (prev) => ({
            panels: {
              ...prev.panels,
              [id]: panel,
            },
            nextZIndex: prev.nextZIndex + 1,
          }),
          false,
          `addPanel/${id}`
        );

        // Persist to IndexedDB
        await savePanelState(panel);
      },

      removePanel: async (id) => {
        // Get the module key before removing panel
        const moduleKey = get().panels[id]?.key;

        set(
          (prev) => {
            const newPanels = { ...prev.panels };
            delete newPanels[id];
            return { panels: newPanels };
          },
          false,
          `removePanel/${id}`
        );

        // Remove from IndexedDB
        await deletePanelState(id);

        // CRITICAL: Unload module when panel is closed
        if (moduleKey && typeof moduleKey === "string") {
          try {
            const { moduleCache } = await import("@/lib/module-cache");
            moduleCache.unloadModule(moduleKey);
          } catch (err) {
            console.debug(`[PanelStore] Failed to unload module ${moduleKey}:`, err);
          }
        }
      },

      updatePanel: async (id, updates) => {
        set(
          (prev) => {
            const panel = prev.panels[id];
            if (!panel) return prev;
            const updated = { ...panel, ...updates };
            return {
              panels: {
                ...prev.panels,
                [id]: updated,
              },
            };
          },
          false,
          `updatePanel/${id}`
        );

        // Persist updated panel
        const panel = get().panels[id];
        if (panel) {
          await savePanelState(panel);
        }
      },

      minimizePanel: async (id) => {
        await get().updatePanel(id, { isMinimized: true });
      },

      expandPanel: async (id) => {
        await get().updatePanel(id, { isMinimized: false });
      },

      focusPanel: (id) => {
        const nextZ = get().getNextZIndex();
        get().updatePanel(id, { zIndex: nextZ });
      },

      setPanelPosition: async (id, position) => {
        const panel = get().panels[id];
        const clampedPos = clampPosition(position, panel?.size || { width: 900, height: 600 });
        await get().updatePanel(id, { position: clampedPos });
      },

      setPanelSize: async (id, size) => {
        const clampedSize = clampSize(size);
        const panel = get().panels[id];
        const clampedPos = clampPosition(panel?.position, clampedSize);
        await get().updatePanel(id, { size: clampedSize, position: clampedPos });
      },

      setRestorationPhase: (phase) => {
        set({ restorationPhase: phase }, false, `setRestorationPhase/${phase}`);
      },

      toggleExpand: async (id) => {
        const panel = get().panels[id];
        if (!panel) return;

        if (panel.isExpanded) {
          // Restore
          await get().updatePanel(id, {
            isExpanded: false,
            position: panel.preExpandedPosition || panel.position,
            size: panel.preExpandedSize || panel.size,
          });
        } else {
          // Expand — leave room for top toolbar (BRIEFING/notif/avatar) and chrome
          const leftPadding = 50;
          const topPadding = 70;  // iter5.5 · was 15; expanded panels now respect the topbar band (top:14 + height:40 + 16px gap).
          const edgePadding = 15;
          const expandedWidth = window.innerWidth - leftPadding - edgePadding;
          const expandedHeight = window.innerHeight - topPadding - edgePadding;
          const expandedX = leftPadding;
          const expandedY = topPadding;

          await get().updatePanel(id, {
            isExpanded: true,
            preExpandedSize: panel.size,
            preExpandedPosition: panel.position,
            size: { width: expandedWidth, height: expandedHeight },
            position: { x: expandedX, y: expandedY },
            isMinimized: false,
          });
        }
      },

      clearAll: async () => {
        set({ panels: {}, nextZIndex: 0 }, false, "clearAll");
        await clearPanelStates();
      },

      getPanel: (id) => {
        return get().panels[id];
      },

      getOpenPanels: () => {
        return Object.values(get().panels);
      },

      getMaxZIndex: () => {
        const panels = get().panels;
        if (Object.keys(panels).length === 0) return INITIAL_Z_INDEX;
        return Math.max(...Object.values(panels).map((p) => p.zIndex));
      },

      getNextZIndex: () => {
        const maxZ = get().getMaxZIndex();
        return maxZ + 1;
      },
    }),
    { name: "PanelStoreEnhanced" }
  )
);

// iter165: Auto re-clamp every panel on window resize so nothing falls off-screen
// when a user moves between monitors / resizes the browser / switches home ↔ work.
if (typeof window !== "undefined") {
  let resizeTimer: any = null;
  window.addEventListener("resize", () => {
    if (resizeTimer) clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      try {
        const store = usePanelStoreEnhanced.getState();
        const panels = store.panels;
        Object.values(panels).forEach((p) => {
          const clampedSize = clampSize(p.size as any);
          const clampedPos = clampPosition(p.position as any, clampedSize);
          const sizeChanged = clampedSize.width !== p.size?.width || clampedSize.height !== p.size?.height;
          const posChanged = clampedPos.x !== p.position?.x || clampedPos.y !== p.position?.y;
          if (sizeChanged || posChanged) {
            store.updatePanel(p.entry.id, { size: clampedSize, position: clampedPos });
          }
        });
      } catch (e) { console.debug("[PanelStore] resize reclamp failed:", e); }
    }, 180);
  });
}
