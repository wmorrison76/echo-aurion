import type { DesignerElement } from "../hooks";

const SNAP_THRESHOLD = 10; // pixels within which to snap
const EDGE_SNAP_THRESHOLD = 5;

export interface Guide {
  id: string;
  type: "horizontal" | "vertical";
  position: number;
  name?: string;
}

export interface SnapInfo {
  x?: number;
  y?: number;
  guides?: {
    vertical?: number[];
    horizontal?: number[];
  };
}

export function calculateSnapPoints(element: DesignerElement): {
  left: number;
  centerX: number;
  right: number;
  top: number;
  centerY: number;
  bottom: number;
} {
  return {
    left: element.x,
    centerX: element.x + element.width / 2,
    right: element.x + element.width,
    top: element.y,
    centerY: element.y + element.height / 2,
    bottom: element.y + element.height,
  };
}

export function snapToGrid(
  position: number,
  gridSize: number,
  threshold: number = SNAP_THRESHOLD
): { position: number; snapped: boolean } {
  if (gridSize === 0) return { position, snapped: false };

  const nearestGrid = Math.round(position / gridSize) * gridSize;
  const distance = Math.abs(position - nearestGrid);

  if (distance < threshold) {
    return { position: nearestGrid, snapped: true };
  }

  return { position, snapped: false };
}

export function snapToGuides(
  position: number,
  guides: Guide[],
  threshold: number = SNAP_THRESHOLD
): { position: number; snapped: boolean; guideId?: string } {
  const relevantGuides = guides.filter((g) =>
    g.type === "vertical" ? true : false
  );

  for (const guide of relevantGuides) {
    const distance = Math.abs(position - guide.position);
    if (distance < threshold) {
      return { position: guide.position, snapped: true, guideId: guide.id };
    }
  }

  return { position, snapped: false };
}

export function snapToElements(
  element: DesignerElement,
  allElements: DesignerElement[],
  otherElements: DesignerElement[],
  threshold: number = SNAP_THRESHOLD
): SnapInfo {
  const currentSnaps = calculateSnapPoints(element);
  const result: SnapInfo = {
    guides: {
      vertical: [],
      horizontal: [],
    },
  };

  const snapPointsX: { [key: number]: string[] } = {};
  const snapPointsY: { [key: number]: string[] } = {};

  for (const other of otherElements) {
    if (other.id === element.id) continue;

    const otherSnaps = calculateSnapPoints(other);

    // Check horizontal snap points (X axis)
    const xPoints = {
      [otherSnaps.left]: "left",
      [otherSnaps.centerX]: "centerX",
      [otherSnaps.right]: "right",
    };

    for (const [x, label] of Object.entries(xPoints)) {
      const xPos = parseFloat(x);
      for (const [currentX, currentLabel] of Object.entries({
        [currentSnaps.left]: "left",
        [currentSnaps.centerX]: "centerX",
        [currentSnaps.right]: "right",
      })) {
        const currentXPos = parseFloat(currentX);
        const distance = Math.abs(currentXPos - xPos);

        if (distance < threshold) {
          if (!snapPointsX[xPos]) snapPointsX[xPos] = [];
          snapPointsX[xPos].push(`${currentLabel}→${label}`);
        }
      }
    }

    // Check vertical snap points (Y axis)
    const yPoints = {
      [otherSnaps.top]: "top",
      [otherSnaps.centerY]: "centerY",
      [otherSnaps.bottom]: "bottom",
    };

    for (const [y, label] of Object.entries(yPoints)) {
      const yPos = parseFloat(y);
      for (const [currentY, currentLabel] of Object.entries({
        [currentSnaps.top]: "top",
        [currentSnaps.centerY]: "centerY",
        [currentSnaps.bottom]: "bottom",
      })) {
        const currentYPos = parseFloat(currentY);
        const distance = Math.abs(currentYPos - yPos);

        if (distance < threshold) {
          if (!snapPointsY[yPos]) snapPointsY[yPos] = [];
          snapPointsY[yPos].push(`${currentLabel}→${label}`);
        }
      }
    }
  }

  // Get the snap positions
  const snapXPositions = Object.keys(snapPointsX).map((x) => parseFloat(x));
  const snapYPositions = Object.keys(snapPointsY).map((y) => parseFloat(y));

  if (snapXPositions.length > 0) {
    const closestX = snapXPositions.reduce((closest, x) => {
      const currentDistance = Math.abs(currentSnaps.left - x);
      const closestDistance = Math.abs(currentSnaps.left - closest);
      return currentDistance < closestDistance ? x : closest;
    });
    result.x = closestX - currentSnaps.left + element.x;
    result.guides!.vertical = snapXPositions;
  }

  if (snapYPositions.length > 0) {
    const closestY = snapYPositions.reduce((closest, y) => {
      const currentDistance = Math.abs(currentSnaps.top - y);
      const closestDistance = Math.abs(currentSnaps.top - closest);
      return currentDistance < closestDistance ? y : closest;
    });
    result.y = closestY - currentSnaps.top + element.y;
    result.guides!.horizontal = snapYPositions;
  }

  return result;
}

export function snapToPageEdges(
  element: DesignerElement,
  pageWidth: number,
  pageHeight: number,
  threshold: number = EDGE_SNAP_THRESHOLD
): SnapInfo {
  const result: SnapInfo = {};
  const margin = 0;

  // Snap to left edge
  if (Math.abs(element.x - margin) < threshold) {
    result.x = margin;
  }

  // Snap to right edge
  if (Math.abs(element.x + element.width - (pageWidth - margin)) < threshold) {
    result.x = pageWidth - margin - element.width;
  }

  // Snap to top edge
  if (Math.abs(element.y - margin) < threshold) {
    result.y = margin;
  }

  // Snap to bottom edge
  if (Math.abs(element.y + element.height - (pageHeight - margin)) < threshold) {
    result.y = pageHeight - margin - element.height;
  }

  return result;
}

export function applySnapping(
  element: DesignerElement,
  proposedX: number,
  proposedY: number,
  otherElements: DesignerElement[],
  guides: Guide[],
  pageSize: { width: number; height: number },
  enableSnapToGrid: boolean = false,
  gridSize: number = 16
): { x: number; y: number; activeGuides: Guide[] } {
  let finalX = proposedX;
  let finalY = proposedY;
  const activeGuides: Guide[] = [];
  const tempElement = { ...element, x: proposedX, y: proposedY };

  // Apply snap to elements
  const elementSnaps = snapToElements(
    tempElement,
    otherElements,
    otherElements,
    SNAP_THRESHOLD
  );

  if (elementSnaps.x !== undefined) {
    finalX = elementSnaps.x;
    if (elementSnaps.guides?.vertical) {
      // Track which guides are active
    }
  }

  if (elementSnaps.y !== undefined) {
    finalY = elementSnaps.y;
    if (elementSnaps.guides?.horizontal) {
      // Track which guides are active
    }
  }

  // Apply snap to page edges
  const edgeSnaps = snapToPageEdges(tempElement, pageSize.width, pageSize.height);

  if (edgeSnaps.x !== undefined) {
    finalX = edgeSnaps.x;
  }

  if (edgeSnaps.y !== undefined) {
    finalY = edgeSnaps.y;
  }

  // Apply snap to grid
  if (enableSnapToGrid && gridSize > 0) {
    const gridSnapX = snapToGrid(finalX, gridSize);
    const gridSnapY = snapToGrid(finalY, gridSize);

    if (gridSnapX.snapped) finalX = gridSnapX.position;
    if (gridSnapY.snapped) finalY = gridSnapY.position;
  }

  // Apply snap to guides
  for (const guide of guides) {
    if (guide.type === "vertical") {
      const guideSnap = snapToGuides(finalX, [guide]);
      if (guideSnap.snapped) {
        finalX = guideSnap.position;
        activeGuides.push(guide);
      }
    } else {
      const guideSnap = snapToGuides(finalY, [guide]);
      if (guideSnap.snapped) {
        finalY = guideSnap.position;
        activeGuides.push(guide);
      }
    }
  }

  return { x: finalX, y: finalY, activeGuides };
}
