/**
 * Unified Panel Store
 * Phase 3: Unify mini panels with main panel system
 * 
 * This store unifies both main panels and mini panels into a single system
 */

import { create } from "zustand";
import { devtools } from "zustand/middleware";
import { usePanelStoreEnhanced } from "./panel-store-enhanced";
import type { PanelId } from "@/components/site/panels/types";
import type { MiniPanelConfig } from "@/lib/mini-panel-storage";

interface UnifiedPanelStore {
  // Main panels (from enhanced store)
  mainPanels: ReturnType<typeof usePanelStoreEnhanced>["panels"];
  
  // Mini panels (unified)
  miniPanels: Record<string, MiniPanelConfig & { type: "mini" }>;
  
  // Unified actions
  createMiniPanel: (
    panelId: string,
    title: string,
    width?: number,
    height?: number
  ) => void;
  removeMiniPanel: (id: string) => void;
  updateMiniPanel: (id: string, updates: Partial<MiniPanelConfig>) => void;
  
  // Unified getters
  getAllPanels: () => Array<{ type: "main" | "mini"; id: string; config: any }>;
}

/**
 * Unified panel store that combines main panels and mini panels
 * This allows mini panels to use the same infrastructure as main panels
 */
export const useUnifiedPanelStore = create<UnifiedPanelStore>()(
  devtools(
    (set, get) => ({
      mainPanels: {},
      miniPanels: {},

      createMiniPanel: (panelId, title, width = 400, height = 300) => {
        const id = `mini-${panelId}-${Date.now()}`;
        const miniPanel: MiniPanelConfig & { type: "mini" } = {
          id,
          title,
          panelId,
          type: "mini",
          position: { x: 100, y: 100 },
          size: { width, height },
          isMinimized: false,
          isPinned: false,
          isFloating: true,
          createdAt: Date.now(),
          order: Object.keys(get().miniPanels).length,
        };

        set(
          (prev) => ({
            miniPanels: {
              ...prev.miniPanels,
              [id]: miniPanel,
            },
          }),
          false,
          `createMiniPanel/${id}`
        );
      },

      removeMiniPanel: (id) => {
        set(
          (prev) => {
            const newPanels = { ...prev.miniPanels };
            delete newPanels[id];
            return { miniPanels: newPanels };
          },
          false,
          `removeMiniPanel/${id}`
        );
      },

      updateMiniPanel: (id, updates) => {
        set(
          (prev) => {
            const panel = prev.miniPanels[id];
            if (!panel) return prev;
            return {
              miniPanels: {
                ...prev.miniPanels,
                [id]: { ...panel, ...updates },
              },
            };
          },
          false,
          `updateMiniPanel/${id}`
        );
      },

      getAllPanels: () => {
        const main = Object.values(get().mainPanels).map((panel) => ({
          type: "main" as const,
          id: panel.entry.id as string,
          config: panel,
        }));

        const mini = Object.values(get().miniPanels).map((panel) => ({
          type: "mini" as const,
          id: panel.id,
          config: panel,
        }));

        return [...main, ...mini];
      },
    }),
    { name: "UnifiedPanelStore" }
  )
);
