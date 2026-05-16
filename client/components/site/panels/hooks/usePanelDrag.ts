/**
 * usePanelDrag Hook
 * Handles panel dragging logic
 */

import { useState, useEffect, useRef, useCallback } from "react";

interface UsePanelDragProps {
  panelRef: React.RefObject<HTMLDivElement>;
  position: { x: number; y: number };
  onPositionChange?: (position: { x: number; y: number }) => void;
  onFocus: () => void;
}

export function usePanelDrag({
  panelRef,
  position,
  onPositionChange,
  onFocus,
}: UsePanelDragProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

  const handleMouseDown = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (!panelRef.current) return;
      onFocus();
      setIsDragging(true);
      const rect = panelRef.current.getBoundingClientRect();
      setDragOffset({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      });
    },
    [panelRef, onFocus]
  );

  useEffect(() => {
    if (!isDragging) return;

    let animationFrameId: number | null = null;
    let lastMouseEvent: MouseEvent | null = null;

    const handleMouseMove = (e: MouseEvent) => {
      e.preventDefault();
      lastMouseEvent = e;

      if (animationFrameId === null) {
        animationFrameId = requestAnimationFrame(() => {
          if (!lastMouseEvent || !panelRef.current) return;

          let newX = lastMouseEvent.clientX - dragOffset.x;
          let newY = lastMouseEvent.clientY - dragOffset.y;

          const panelWidth = panelRef.current.offsetWidth;
          const panelHeight = panelRef.current.offsetHeight;

          const minX = -panelWidth + 80;
          const maxX = window.innerWidth - 80;
          const minY = 0;
          const maxY = window.innerHeight - 30;

          newX = Math.max(minX, Math.min(newX, maxX));
          newY = Math.max(minY, Math.min(newY, maxY));

          onPositionChange?.({ x: newX, y: newY });
          animationFrameId = null;
        });
      }
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      if (animationFrameId !== null) {
        cancelAnimationFrame(animationFrameId);
        animationFrameId = null;
      }
      document.body.style.cursor = "";
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
      if (animationFrameId !== null) {
        cancelAnimationFrame(animationFrameId);
      }
    };
  }, [isDragging, dragOffset, panelRef, onPositionChange]);

  return { isDragging, handleMouseDown };
}
