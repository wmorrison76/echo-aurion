/**
 * PanelManager
 * Manages panel state and operations (open, close, minimize, etc.)
 * This will eventually be integrated with Zustand store
 */

import { useCallback } from "react";
import type { PanelId, PanelState } from "./types";
import type { PanelKey } from "@/lib/panel-registry";

export interface PanelManager {
  openPanel: (
    id: PanelId,
    tab?: string,
    panelProps?: Record<string, any>
  ) => Promise<void>;
  closePanel: (id: PanelId) => void;
  minimizePanel: (id: PanelId) => void;
  focusPanel: (id: PanelId) => void;
  resizePanel: (id: PanelId, size: { width: number; height: number }) => void;
  movePanel: (id: PanelId, position: { x: number; y: number }) => void;
  toggleExpand: (id: PanelId) => void;
  getPanel: (id: PanelId) => PanelState | undefined;
  getAllPanels: () => PanelState[];
}

// This will be replaced with Zustand store integration
// For now, this is a placeholder interface
export function createPanelManager(): PanelManager {
  return {
    openPanel: async () => {
      throw new Error("Not implemented - use Zustand store");
    },
    closePanel: () => {
      throw new Error("Not implemented - use Zustand store");
    },
    minimizePanel: () => {
      throw new Error("Not implemented - use Zustand store");
    },
    focusPanel: () => {
      throw new Error("Not implemented - use Zustand store");
    },
    resizePanel: () => {
      throw new Error("Not implemented - use Zustand store");
    },
    movePanel: () => {
      throw new Error("Not implemented - use Zustand store");
    },
    toggleExpand: () => {
      throw new Error("Not implemented - use Zustand store");
    },
    getPanel: () => undefined,
    getAllPanels: () => [],
  };
}
