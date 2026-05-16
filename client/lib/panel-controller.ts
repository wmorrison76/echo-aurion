/**
 * Panel Controller - Handles dock bar actions and panel management
 */

export type DockAction =
  | "close-all"
  | "stack-grid"
  | "stack-cascade"
  | "minimize-all"
  | "echo-ai-toggle";

export interface PanelPosition {
  x: number;
  y: number;
}

export interface PanelLayout {
  type: "grid" | "cascade";
  positions: Record<string, PanelPosition>;
  sizes?: Record<string, { width: number; height: number }>;
}

/**
 * Calculate grid layout for panels
 * Shrinks panels based on the number of open panels
 */
export function calculateGridLayout(
  panelIds: string[],
  containerWidth: number,
  containerHeight: number,
  panelWidths: Record<string, number>,
  panelHeights: Record<string, number>,
): PanelLayout {
  if (panelIds.length === 0) {
    return { type: "grid", positions: {} };
  }

  const positions: Record<string, PanelPosition> = {};

  // Sidebar width is 16rem = 256px
  const sidebarWidth = 256;
  const titleBarHeight = 48;

  const padding = 12;
  const availWidth = containerWidth - sidebarWidth - padding * 2;
  const availHeight = containerHeight - titleBarHeight - padding * 2;

  // Calculate grid dimensions based on number of panels
  const numPanels = panelIds.length;
  const cols = Math.ceil(Math.sqrt(numPanels));
  const rows = Math.ceil(numPanels / cols);

  // Calculate cell dimensions with slight gap
  const gap = 8;
  const cellWidth = (availWidth - gap * (cols - 1)) / cols;
  const cellHeight = (availHeight - gap * (rows - 1)) / rows;

  // Shrink individual panel sizes to fit grid
  const scaledPanelWidths: Record<string, number> = {};
  const scaledPanelHeights: Record<string, number> = {};

  panelIds.forEach((id) => {
    // Scale panel to fit within cell with some margin
    const cellMargin = 6;
    scaledPanelWidths[id] = Math.min(
      cellWidth - cellMargin * 2,
      panelWidths[id],
    );
    scaledPanelHeights[id] = Math.min(
      cellHeight - cellMargin * 2,
      panelHeights[id],
    );
  });

  panelIds.forEach((id, index) => {
    const col = index % cols;
    const row = Math.floor(index / cols);

    // Calculate position with sidebar offset
    const cellX = sidebarWidth + padding + col * (cellWidth + gap);
    const cellY = titleBarHeight + padding + row * (cellHeight + gap);

    // Center panel within cell
    const x = cellX + (cellWidth - scaledPanelWidths[id]) / 2;
    const y = cellY + (cellHeight - scaledPanelHeights[id]) / 2;

    positions[id] = {
      x: Math.max(
        sidebarWidth + padding,
        Math.min(x, containerWidth - scaledPanelWidths[id] - padding),
      ),
      y: Math.max(
        titleBarHeight + padding,
        Math.min(y, containerHeight - scaledPanelHeights[id] - padding),
      ),
    };
  });

  return {
    type: "grid",
    positions,
    // Include scaled dimensions for the handler to use
    sizes: Object.fromEntries(
      panelIds.map((id) => [
        id,
        { width: scaledPanelWidths[id], height: scaledPanelHeights[id] },
      ]),
    ),
  };
}

/**
 * Calculate cascade layout for panels
 * Accounts for sidebar width and ensures title bars are visible
 * Panels cascade diagonally with tighter spacing for better visual flow
 */
export function calculateCascadeLayout(
  panelIds: string[],
  containerWidth: number,
  containerHeight: number,
): PanelLayout {
  if (panelIds.length === 0) {
    return { type: "cascade", positions: {} };
  }

  const positions: Record<string, PanelPosition> = {};

  // Sidebar width is 16rem = 256px
  const sidebarWidth = 256;
  // Title bar height to avoid covering
  const titleBarHeight = 48;
  // Tighter cascade offset - reduced from 45px to 28px for better visual density
  const cascadeOffset = 28;
  const minPadding = 8;

  // Minimum panel dimensions to ensure usability
  const minWidth = 350;
  const minHeight = 250;

  panelIds.forEach((id, index) => {
    // Start position accounts for sidebar and title bar
    let x = sidebarWidth + minPadding + index * cascadeOffset;
    // Small vertical offset to show title bars (prevent them from being covered)
    let y = titleBarHeight + minPadding + index * cascadeOffset;

    // Ensure panels stay within bounds without aggressive clamping
    // Allow panels to cascade off-screen slightly if necessary to maintain cascade pattern
    const maxX = Math.max(
      sidebarWidth + minPadding,
      containerWidth - minWidth - minPadding,
    );
    const maxY = Math.max(
      titleBarHeight + minPadding,
      containerHeight - minHeight - minPadding,
    );

    positions[id] = {
      x: Math.min(x, maxX),
      y: Math.min(y, maxY),
    };
  });

  return { type: "cascade", positions };
}

/**
 * Dispatch dock action event
 */
export function dispatchDockAction(
  action: DockAction,
  payload?: Record<string, any>,
) {
  window.dispatchEvent(
    new CustomEvent("dock-action", {
      detail: { action, payload },
    }),
  );
}

/**
 * Dispatch open panel event
 */
export function dispatchOpenPanel(panelId: string) {
  window.dispatchEvent(
    new CustomEvent("open-panel", {
      detail: { id: panelId },
    }),
  );
}

/**
 * Handle panel layout updates
 */
export function applyPanelLayout(
  layout: PanelLayout,
  callback: (panelId: string, position: PanelPosition) => void,
) {
  Object.entries(layout.positions).forEach(([panelId, position]) => {
    callback(panelId, position);
  });
}
