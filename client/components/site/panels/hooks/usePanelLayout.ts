/**
 * usePanelLayout Hook
 * Hook for layout calculations (can use Web Workers in Phase 3)
 */

import { useMemo } from "react";
import { getGridLayout, getCascadeLayout } from "../PanelLayout";
import type { PanelId } from "../types";

interface UsePanelLayoutProps {
  panelIds: PanelId[];
  layoutType: "grid" | "cascade";
  panelSizes: Record<PanelId, { width: number; height: number }>;
}

export function usePanelLayout({
  panelIds,
  layoutType,
  panelSizes,
}: UsePanelLayoutProps) {
  return useMemo(() => {
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    if (layoutType === "grid") {
      return getGridLayout(panelIds, viewportWidth, viewportHeight, panelSizes);
    } else {
      return getCascadeLayout(panelIds, viewportWidth, viewportHeight);
    }
  }, [panelIds, layoutType, panelSizes]);
}
