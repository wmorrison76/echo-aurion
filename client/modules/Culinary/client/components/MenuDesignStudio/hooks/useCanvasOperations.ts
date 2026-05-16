import { useCallback, useState } from "react";
import type { DesignerElement } from "./useDesignerState";

type DragState = {
  id: string;
  offsetX: number;
  offsetY: number;
  startX: number;
  startY: number;
};

type ResizeState = {
  id: string;
  startWidth: number;
  startHeight: number;
  startX: number;
  startY: number;
  handle: "nw" | "ne" | "sw" | "se" | "n" | "s" | "e" | "w";
};

export function useCanvasOperations() {
  const [dragState, setDragState] = useState<DragState | null>(null);
  const [resizeState, setResizeState] = useState<ResizeState | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);

  const startDrag = useCallback(
    (element: DesignerElement, clientX: number, clientY: number) => {
      setDragState({
        id: element.id,
        offsetX: clientX - element.x,
        offsetY: clientY - element.y,
        startX: element.x,
        startY: element.y,
      });
    },
    []
  );

  const updateDrag = useCallback(
    (clientX: number, clientY: number, snapToGrid: boolean = false, gridSize: number = 16) => {
      if (!dragState) return { x: 0, y: 0 };

      let x = clientX - dragState.offsetX;
      let y = clientY - dragState.offsetY;

      if (snapToGrid) {
        x = Math.round(x / gridSize) * gridSize;
        y = Math.round(y / gridSize) * gridSize;
      }

      return { x, y };
    },
    [dragState]
  );

  const endDrag = useCallback(() => {
    setDragState(null);
  }, []);

  const startResize = useCallback(
    (
      element: DesignerElement,
      handle: ResizeState["handle"],
      clientX: number,
      clientY: number
    ) => {
      setResizeState({
        id: element.id,
        startWidth: element.width,
        startHeight: element.height,
        startX: element.x,
        startY: element.y,
        handle,
      });
    },
    []
  );

  const updateResize = useCallback(
    (
      clientX: number,
      clientY: number,
      startClientX: number,
      startClientY: number,
      aspectRatio: boolean = false
    ) => {
      if (!resizeState) return { width: 0, height: 0, x: 0, y: 0 };

      const deltaX = clientX - startClientX;
      const deltaY = clientY - startClientY;
      const { handle, startWidth, startHeight, startX, startY } = resizeState;

      let width = startWidth;
      let height = startHeight;
      let x = startX;
      let y = startY;

      if (["se", "e", "ne"].includes(handle)) {
        width = Math.max(40, startWidth + deltaX);
      }
      if (["sw", "w", "nw"].includes(handle)) {
        width = Math.max(40, startWidth - deltaX);
        x = startX + startWidth - width;
      }
      if (["sw", "s", "se"].includes(handle)) {
        height = Math.max(40, startHeight + deltaY);
      }
      if (["nw", "n", "ne"].includes(handle)) {
        height = Math.max(40, startHeight - deltaY);
        y = startY + startHeight - height;
      }

      if (aspectRatio) {
        const ratio = startWidth / startHeight;
        const newRatio = width / height;

        if (newRatio > ratio) {
          height = width / ratio;
          if (["nw", "n", "ne"].includes(handle)) {
            y = startY + startHeight - height;
          }
        } else {
          width = height * ratio;
          if (["sw", "w", "nw"].includes(handle)) {
            x = startX + startWidth - width;
          }
        }
      }

      return { width, height, x, y };
    },
    [resizeState]
  );

  const endResize = useCallback(() => {
    setResizeState(null);
  }, []);

  const startEditingText = useCallback((id: string) => {
    setEditingId(id);
  }, []);

  const endEditingText = useCallback(() => {
    setEditingId(null);
  }, []);

  const distributeHorizontally = useCallback((elements: DesignerElement[]) => {
    if (elements.length < 2) return {};

    const sortedElements = [...elements].sort((a, b) => a.x - b.x);
    const totalWidth = sortedElements.reduce((sum, el) => sum + el.width, 0);
    const totalGap =
      sortedElements[sortedElements.length - 1].x +
      sortedElements[sortedElements.length - 1].width -
      sortedElements[0].x -
      totalWidth;

    const gap = totalGap / (sortedElements.length - 1);
    const updates: Record<string, Partial<DesignerElement>> = {};

    let currentX = sortedElements[0].x;
    sortedElements.forEach((el) => {
      updates[el.id] = { x: currentX };
      currentX += el.width + gap;
    });

    return updates;
  }, []);

  const distributeVertically = useCallback((elements: DesignerElement[]) => {
    if (elements.length < 2) return {};

    const sortedElements = [...elements].sort((a, b) => a.y - b.y);
    const totalHeight = sortedElements.reduce((sum, el) => sum + el.height, 0);
    const totalGap =
      sortedElements[sortedElements.length - 1].y +
      sortedElements[sortedElements.length - 1].height -
      sortedElements[0].y -
      totalHeight;

    const gap = totalGap / (sortedElements.length - 1);
    const updates: Record<string, Partial<DesignerElement>> = {};

    let currentY = sortedElements[0].y;
    sortedElements.forEach((el) => {
      updates[el.id] = { y: currentY };
      currentY += el.height + gap;
    });

    return updates;
  }, []);

  const alignLeft = useCallback((elements: DesignerElement[]) => {
    if (elements.length < 2) return {};

    const minX = Math.min(...elements.map((el) => el.x));
    const updates: Record<string, Partial<DesignerElement>> = {};

    elements.forEach((el) => {
      if (el.x !== minX) {
        updates[el.id] = { x: minX };
      }
    });

    return updates;
  }, []);

  const alignCenter = useCallback((elements: DesignerElement[]) => {
    if (elements.length < 2) return {};

    const centerX = Math.min(...elements.map((el) => el.x)) +
      (Math.max(...elements.map((el) => el.x + el.width)) -
        Math.min(...elements.map((el) => el.x))) /
        2;

    const updates: Record<string, Partial<DesignerElement>> = {};

    elements.forEach((el) => {
      const elCenter = el.x + el.width / 2;
      if (elCenter !== centerX) {
        updates[el.id] = { x: centerX - el.width / 2 };
      }
    });

    return updates;
  }, []);

  const alignRight = useCallback((elements: DesignerElement[]) => {
    if (elements.length < 2) return {};

    const maxRight = Math.max(...elements.map((el) => el.x + el.width));
    const updates: Record<string, Partial<DesignerElement>> = {};

    elements.forEach((el) => {
      if (el.x + el.width !== maxRight) {
        updates[el.id] = { x: maxRight - el.width };
      }
    });

    return updates;
  }, []);

  const alignTop = useCallback((elements: DesignerElement[]) => {
    if (elements.length < 2) return {};

    const minY = Math.min(...elements.map((el) => el.y));
    const updates: Record<string, Partial<DesignerElement>> = {};

    elements.forEach((el) => {
      if (el.y !== minY) {
        updates[el.id] = { y: minY };
      }
    });

    return updates;
  }, []);

  const alignMiddle = useCallback((elements: DesignerElement[]) => {
    if (elements.length < 2) return {};

    const centerY = Math.min(...elements.map((el) => el.y)) +
      (Math.max(...elements.map((el) => el.y + el.height)) -
        Math.min(...elements.map((el) => el.y))) /
        2;

    const updates: Record<string, Partial<DesignerElement>> = {};

    elements.forEach((el) => {
      const elCenter = el.y + el.height / 2;
      if (elCenter !== centerY) {
        updates[el.id] = { y: centerY - el.height / 2 };
      }
    });

    return updates;
  }, []);

  const alignBottom = useCallback((elements: DesignerElement[]) => {
    if (elements.length < 2) return {};

    const maxBottom = Math.max(...elements.map((el) => el.y + el.height));
    const updates: Record<string, Partial<DesignerElement>> = {};

    elements.forEach((el) => {
      if (el.y + el.height !== maxBottom) {
        updates[el.id] = { y: maxBottom - el.height };
      }
    });

    return updates;
  }, []);

  const matchWidth = useCallback((elements: DesignerElement[]) => {
    if (elements.length < 2) return {};

    const targetWidth = elements[0].width;
    const updates: Record<string, Partial<DesignerElement>> = {};

    elements.forEach((el) => {
      if (el.width !== targetWidth) {
        updates[el.id] = { width: targetWidth };
      }
    });

    return updates;
  }, []);

  const matchHeight = useCallback((elements: DesignerElement[]) => {
    if (elements.length < 2) return {};

    const targetHeight = elements[0].height;
    const updates: Record<string, Partial<DesignerElement>> = {};

    elements.forEach((el) => {
      if (el.height !== targetHeight) {
        updates[el.id] = { height: targetHeight };
      }
    });

    return updates;
  }, []);

  return {
    dragState,
    resizeState,
    editingId,
    startDrag,
    updateDrag,
    endDrag,
    startResize,
    updateResize,
    endResize,
    startEditingText,
    endEditingText,
    distributeHorizontally,
    distributeVertically,
    alignLeft,
    alignCenter,
    alignRight,
    alignTop,
    alignMiddle,
    alignBottom,
    matchWidth,
    matchHeight,
  };
}
