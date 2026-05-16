/**
 * Touch gesture utilities for tablet interfaces.
 */
import { useRef, useCallback } from "react";

export interface SwipeResult {
  direction: "left" | "right" | "up" | "down";
  distance: number;
  velocity: number;
}

export function useTouchSwipe(
  onSwipe: (result: SwipeResult) => void,
  threshold = 50,
) {
  const startRef = useRef<{ x: number; y: number; t: number } | null>(null);

  const onTouchStart = useCallback((e: React.TouchEvent) => {
    const touch = e.touches[0];
    if (touch) {
      startRef.current = { x: touch.clientX, y: touch.clientY, t: Date.now() };
    }
  }, []);

  const onTouchEnd = useCallback(
    (e: React.TouchEvent) => {
      if (!startRef.current) return;
      const touch = e.changedTouches[0];
      if (!touch) return;

      const dx = touch.clientX - startRef.current.x;
      const dy = touch.clientY - startRef.current.y;
      const dt = Math.max(1, Date.now() - startRef.current.t);
      const absDx = Math.abs(dx);
      const absDy = Math.abs(dy);

      if (absDx < threshold && absDy < threshold) return;

      const horizontal = absDx > absDy;
      const direction: SwipeResult["direction"] = horizontal
        ? dx > 0
          ? "right"
          : "left"
        : dy > 0
          ? "down"
          : "up";
      const distance = horizontal ? absDx : absDy;

      onSwipe({ direction, distance, velocity: distance / dt });
      startRef.current = null;
    },
    [onSwipe, threshold],
  );

  return { onTouchStart, onTouchEnd };
}

export function usePinchZoom(onChange: (scale: number) => void) {
  const distRef = useRef<number | null>(null);

  const onTouchMove = useCallback(
    (e: React.TouchEvent) => {
      if (e.touches.length < 2) return;
      const [a, b] = [e.touches[0], e.touches[1]];
      if (!a || !b) return;
      const dist = Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
      if (distRef.current !== null) {
        onChange(dist / distRef.current);
      }
      distRef.current = dist;
    },
    [onChange],
  );

  const onTouchEnd = useCallback(() => {
    distRef.current = null;
  }, []);

  return { onTouchMove, onTouchEnd };
}
