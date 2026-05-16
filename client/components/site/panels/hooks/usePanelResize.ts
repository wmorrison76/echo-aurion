/**
 * usePanelResize Hook
 * Handles panel resize logic
 */

import { useState, useEffect, useRef, useCallback } from "react";

interface UsePanelResizeProps {
  panelRef: React.RefObject<HTMLDivElement>;
  position: { x: number; y: number };
  size: { width: number; height: number };
  onResize: (size: { width: number; height: number }) => void;
  onPositionChange?: (position: { x: number; y: number }) => void;
  onFocus: () => void;
}

const EDGE_THRESHOLD = 16;

export function usePanelResize({
  panelRef,
  position,
  size,
  onResize,
  onPositionChange,
  onFocus,
}: UsePanelResizeProps) {
  const [isResizing, setIsResizing] = useState(false);
  const [resizeEdge, setResizeEdge] = useState<string | null>(null);
  const [resizeStart, setResizeStart] = useState({
    x: 0,
    y: 0,
    width: 0,
    height: 0,
    panelX: 0,
    panelY: 0,
  });
  const [hoverEdge, setHoverEdge] = useState<string | null>(null);

  const getEdgeAtPoint = useCallback(
    (e: React.MouseEvent<HTMLDivElement> | MouseEvent): string | null => {
      if (!panelRef.current) return null;
      const rect = panelRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      const top = y < EDGE_THRESHOLD;
      const bottom = y > rect.height - EDGE_THRESHOLD;
      const left = x < EDGE_THRESHOLD;
      const right = x > rect.width - EDGE_THRESHOLD;

      if (top && left) return "nw";
      if (top && right) return "ne";
      if (bottom && left) return "sw";
      if (bottom && right) return "se";
      if (top) return "n";
      if (bottom) return "s";
      if (left) return "w";
      if (right) return "e";
      return null;
    },
    [panelRef]
  );

  const getCursorStyle = useCallback((edge: string | null): string => {
    if (!edge) return "default";
    if (edge.includes("nw")) return "nw-resize";
    if (edge.includes("ne")) return "ne-resize";
    if (edge.includes("sw")) return "sw-resize";
    if (edge.includes("se")) return "se-resize";
    if (edge.includes("n") || edge.includes("s")) return "ns-resize";
    if (edge.includes("e") || edge.includes("w")) return "ew-resize";
    return "default";
  }, []);

  const handleResizeMouseDown = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      e.preventDefault();
      e.stopPropagation();
      const edge = getEdgeAtPoint(e);
      if (edge) {
        setResizeEdge(edge);
        setResizeStart({
          x: e.clientX,
          y: e.clientY,
          width: size.width,
          height: size.height,
          panelX: position.x,
          panelY: position.y,
        });
        setIsResizing(true);
        onFocus();

        document.body.style.userSelect = "none";
        document.body.style.cursor = getCursorStyle(edge);
      }
    },
    [getEdgeAtPoint, size, position, onFocus, getCursorStyle]
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      const edge = getEdgeAtPoint(e);
      setHoverEdge(edge);
    },
    [getEdgeAtPoint]
  );

  useEffect(() => {
    if (!isResizing || !resizeEdge) return;

    let lastUpdate = 0;
    const throttleMs = 16; // ~60fps

    const handleMouseMove = (e: MouseEvent) => {
      const now = performance.now();
      if (now - lastUpdate < throttleMs) return;
      lastUpdate = now;

      if (!panelRef.current) return;

      const deltaX = e.clientX - resizeStart.x;
      const deltaY = e.clientY - resizeStart.y;

      let newWidth = resizeStart.width;
      let newHeight = resizeStart.height;
      let newX = resizeStart.panelX;
      let newY = resizeStart.panelY;

      if (resizeEdge.includes("e")) {
        newWidth = Math.max(350, resizeStart.width + deltaX);
      } else if (resizeEdge.includes("w")) {
        newWidth = Math.max(350, resizeStart.width - deltaX);
        newX = resizeStart.panelX + deltaX;
      }

      if (resizeEdge.includes("s")) {
        newHeight = Math.max(250, resizeStart.height + deltaY);
      } else if (resizeEdge.includes("n")) {
        newHeight = Math.max(250, resizeStart.height - deltaY);
        newY = resizeStart.panelY + deltaY;
      }

      const clampedSize = { width: newWidth, height: newHeight };
      onResize(clampedSize);
      onPositionChange?.({ x: newX, y: newY });
    };

    const handleMouseUp = () => {
      setIsResizing(false);
      setResizeEdge(null);
      document.body.style.userSelect = "";
      document.body.style.cursor = "";
    };

    document.addEventListener("mousemove", handleMouseMove, { passive: true });
    document.addEventListener("mouseup", handleMouseUp);

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
      document.body.style.userSelect = "";
      document.body.style.cursor = "";
    };
  }, [
    isResizing,
    resizeEdge,
    resizeStart,
    panelRef,
    onResize,
    onPositionChange,
  ]);

  return {
    isResizing,
    hoverEdge,
    handleResizeMouseDown,
    handleMouseMove,
    getCursorStyle,
  };
}
