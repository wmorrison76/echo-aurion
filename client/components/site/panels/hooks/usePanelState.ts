/**
 * usePanelState Hook
 * Hook for accessing and managing panel state
 * Integrates with Zustand store
 */

import { useEffect } from "react";
import { usePanelStoreEnhanced } from "@/lib/stores/panel-store-enhanced";
import type { PanelId } from "../types";

export function usePanelState(panelId?: PanelId) {
  const store = usePanelStoreEnhanced();

  // Initialize store on mount
  useEffect(() => {
    if (!store.isInitialized) {
      store.initialize();
    }
  }, [store]);

  const panel = panelId ? store.getPanel(panelId) : undefined;

  return {
    panel,
    panels: store.panels,
    openPanels: store.getOpenPanels(),
    addPanel: store.addPanel,
    removePanel: store.removePanel,
    updatePanel: store.updatePanel,
    minimizePanel: store.minimizePanel,
    expandPanel: store.expandPanel,
    focusPanel: store.focusPanel,
    setPanelPosition: store.setPanelPosition,
    setPanelSize: store.setPanelSize,
    toggleExpand: store.toggleExpand,
    getMaxZIndex: store.getMaxZIndex,
    getNextZIndex: store.getNextZIndex,
    isInitialized: store.isInitialized,
  };
}
