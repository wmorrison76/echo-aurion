/**
 * Panel Store (Zustand)
 * Centralized state management for panels
 * Replaces useState in PanelHost for better performance and maintainability
 */

import { create } from "zustand";
import { devtools } from "zustand/middleware";
import type { PanelId, PanelState } from "@/components/site/panels/types";

interface PanelStore {
  // State
  panels: Record<PanelId, PanelState>;
  nextZIndex: number;
  
  // Actions
  addPanel: (id: PanelId, state: Omit<PanelState, "zIndex">) => void;
  removePanel: (id: PanelId) => void;
  updatePanel: (id: PanelId, updates: Partial<PanelState>) => void;
  minimizePanel: (id: PanelId) => void;
  expandPanel: (id: PanelId) => void;
  focusPanel: (id: PanelId) => void;
  setPanelPosition: (id: PanelId, position: { x: number; y: number }) => void;
  setPanelSize: (id: PanelId, size: { width: number; height: number }) => void;
  
  // Getters
  getPanel: (id: PanelId) => PanelState | undefined;
  getOpenPanels: () => PanelState[];
  getMaxZIndex: () => number;
  getNextZIndex: () => number;
}

const INITIAL_Z_INDEX = 20010;

export const usePanelStore = create<PanelStore>()(
  devtools(
    (set, get) => ({
      panels: {},
      nextZIndex: 0,

      addPanel: (id, state) => {
        const nextZ = get().getNextZIndex();
        set(
          (prev) => ({
            panels: {
              ...prev.panels,
              [id]: {
                ...state,
                zIndex: nextZ,
              },
            },
            nextZIndex: prev.nextZIndex + 1,
          }),
          false,
          `addPanel/${id}`
        );
      },

      removePanel: (id) => {
        set(
          (prev) => {
            const newPanels = { ...prev.panels };
            delete newPanels[id];
            return { panels: newPanels };
          },
          false,
          `removePanel/${id}`
        );
      },

      updatePanel: (id, updates) => {
        set(
          (prev) => {
            const panel = prev.panels[id];
            if (!panel) return prev;
            return {
              panels: {
                ...prev.panels,
                [id]: { ...panel, ...updates },
              },
            };
          },
          false,
          `updatePanel/${id}`
        );
      },

      minimizePanel: (id) => {
        get().updatePanel(id, { isMinimized: true });
      },

      expandPanel: (id) => {
        get().updatePanel(id, { isMinimized: false });
      },

      focusPanel: (id) => {
        const nextZ = get().getNextZIndex();
        get().updatePanel(id, { zIndex: nextZ });
      },

      setPanelPosition: (id, position) => {
        get().updatePanel(id, { position });
      },

      setPanelSize: (id, size) => {
        get().updatePanel(id, { size });
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
    { name: "PanelStore" }
  )
);
