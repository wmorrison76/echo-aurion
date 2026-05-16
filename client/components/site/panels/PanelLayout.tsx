/**
 * PanelLayout Utilities
 * Layout calculation utilities extracted from panel-controller
 * Can be enhanced with Web Workers later (Phase 3)
 */

import { calculateGridLayout, calculateCascadeLayout } from "@/lib/panel-controller";
import type { PanelId } from "./types";

export interface PanelLayoutResult {
  positions: Record<PanelId, { x: number; y: number }>;
  sizes?: Record<PanelId, { width: number; height: number }>;
}

/**
 * Calculate responsive panel dimensions based on viewport
 */
export function calculateResponsivePanelSize(
  viewportWidth: number,
  viewportHeight: number,
  minWidth: number = 600,
  minHeight: number = 450
): { width: number; height: number } {
  let widthRatio = 0.7;
  if (viewportWidth < 768) widthRatio = 0.9;
  else if (viewportWidth < 1024) widthRatio = 0.85;
  else if (viewportWidth < 1440) widthRatio = 0.65;
  else if (viewportWidth < 1920) widthRatio = 0.7;
  else if (viewportWidth < 2560) widthRatio = 0.75;
  else widthRatio = 0.8;

  let heightRatio = 0.75;
  if (viewportHeight < 720) heightRatio = 0.8;
  else if (viewportHeight < 768) heightRatio = 0.8;
  else if (viewportHeight < 1080) heightRatio = 0.65;
  else if (viewportHeight < 1440) heightRatio = 0.7;
  else heightRatio = 0.75;

  const width = Math.max(
    Math.min(Math.round(viewportWidth * widthRatio), viewportWidth - 40),
    minWidth
  );
  const height = Math.max(
    Math.min(Math.round(viewportHeight * heightRatio), viewportHeight - 40),
    minHeight
  );

  return { width, height };
}

/**
 * Calculate default panel position with cascade
 */
export function calculateDefaultPosition(
  openPanelCount: number,
  panelSize: { width: number; height: number },
  viewportWidth: number,
  viewportHeight: number
): { x: number; y: number } {
  const sidebarWidth = 256;
  const minMargin = 16;
  const cascadeOffsetPerPanel = 32;
  const maxCascadeOffset = 120;

  const defaultX = Math.min(
    sidebarWidth + 50,
    Math.max(
      sidebarWidth + minMargin,
      viewportWidth - panelSize.width - minMargin * 2
    )
  );

  const cascadeY = Math.min(
    openPanelCount * cascadeOffsetPerPanel,
    maxCascadeOffset
  );

  const defaultY = Math.min(
    Math.max(70, 48 + 20) + cascadeY,
    viewportHeight - 250 - 30
  );

  return { x: defaultX, y: defaultY };
}

/**
 * Calculate grid layout for panels (wrapper around existing function)
 */
export function getGridLayout(
  panelIds: PanelId[],
  viewportWidth: number,
  viewportHeight: number,
  panelSizes: Record<PanelId, { width: number; height: number }>
): PanelLayoutResult {
  const layout = calculateGridLayout(
    panelIds.map(String),
    viewportWidth,
    viewportHeight,
    Object.fromEntries(
      panelIds.map((id) => [String(id), panelSizes[id]?.width || 800])
    ),
    Object.fromEntries(
      panelIds.map((id) => [String(id), panelSizes[id]?.height || 600])
    )
  );

  return {
    positions: Object.fromEntries(
      Object.entries(layout.positions).map(([id, pos]) => [
        id as PanelId,
        pos,
      ])
    ) as Record<PanelId, { x: number; y: number }>,
    sizes: layout.sizes
      ? (Object.fromEntries(
          Object.entries(layout.sizes).map(([id, size]) => [
            id as PanelId,
            size,
          ])
        ) as Record<PanelId, { width: number; height: number }>)
      : undefined,
  };
}

/**
 * Calculate cascade layout for panels (wrapper around existing function)
 */
export function getCascadeLayout(
  panelIds: PanelId[],
  viewportWidth: number,
  viewportHeight: number
): PanelLayoutResult {
  const layout = calculateCascadeLayout(
    panelIds.map(String),
    viewportWidth,
    viewportHeight
  );

  return {
    positions: Object.fromEntries(
      Object.entries(layout.positions).map(([id, pos]) => [
        id as PanelId,
        pos,
      ])
    ) as Record<PanelId, { x: number; y: number }>,
  };
}
