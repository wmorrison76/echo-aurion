/**
 * Touch Gesture Utilities
 * 
 * Provides touch gesture support for tablet/mobile interfaces
 * Supports: swipe, pinch, long press, drag
 */

import React from 'react';

export interface SwipeDirection {
  direction: 'left' | 'right' | 'up' | 'down';
  distance: number;
  velocity: number;
}

export interface PinchGesture {
  scale: number;
  center: { x: number; y: number };
}

export interface TouchGestureHandlers {
  onSwipe?: (direction: SwipeDirection) => void;
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  onSwipeUp?: () => void;
  onSwipeDown?: () => void;
  onPinch?: (gesture: PinchGesture) => void;
  onLongPress?: () => void;
  onDrag?: (delta: { x: number; y: number }) => void;
}

/**
 * Hook for touch gesture handling
 */
export function useTouchGestures(handlers: TouchGestureHandlers) {
  const touchStart = React.useRef<{ x: number; y: number; time: number } | null>(null);
  const longPressTimer = React.useRef<NodeJS.Timeout | null>(null);

  const handleTouchStart = (e: React.TouchEvent) => {
    const touch = e.touches[0];
    touchStart.current = {
      x: touch.clientX,
      y: touch.clientY,
      time: Date.now(),
    };

    // Long press detection
    if (handlers.onLongPress) {
      longPressTimer.current = setTimeout(() => {
        handlers.onLongPress?.();
      }, 500); // 500ms for long press
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    // Cancel long press if user moves
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }

    if (!touchStart.current) return;

    const touch = e.touches[0];
    const deltaX = touch.clientX - touchStart.current.x;
    const deltaY = touch.clientY - touchStart.current.y;

    // Drag gesture
    if (handlers.onDrag && (Math.abs(deltaX) > 5 || Math.abs(deltaY) > 5)) {
      handlers.onDrag({ x: deltaX, y: deltaY });
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    // Cancel long press
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }

    if (!touchStart.current) return;

    const touch = e.changedTouches[0];
    const deltaX = touch.clientX - touchStart.current.x;
    const deltaY = touch.clientY - touchStart.current.y;
    const deltaTime = Date.now() - touchStart.current.time;
    const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
    const velocity = distance / deltaTime;

    // Swipe detection (minimum distance and velocity)
    if (distance > 50 && velocity > 0.3) {
      const absX = Math.abs(deltaX);
      const absY = Math.abs(deltaY);

      if (absX > absY) {
        // Horizontal swipe
        const direction: SwipeDirection = {
          direction: deltaX > 0 ? 'right' : 'left',
          distance: absX,
          velocity,
        };
        handlers.onSwipe?.(direction);
        if (deltaX > 0) {
          handlers.onSwipeRight?.();
        } else {
          handlers.onSwipeLeft?.();
        }
      } else {
        // Vertical swipe
        const direction: SwipeDirection = {
          direction: deltaY > 0 ? 'down' : 'up',
          distance: absY,
          velocity,
        };
        handlers.onSwipe?.(direction);
        if (deltaY > 0) {
          handlers.onSwipeDown?.();
        } else {
          handlers.onSwipeUp?.();
        }
      }
    }

    touchStart.current = null;
  };

  return {
    onTouchStart: handleTouchStart,
    onTouchMove: handleTouchMove,
    onTouchEnd: handleTouchEnd,
  };
}

/**
 * Pinch-to-zoom handler
 */
export function usePinchZoom(
  onZoom: (scale: number) => void,
  initialScale = 1
) {
  const [scale, setScale] = React.useState(initialScale);
  const lastDistance = React.useRef<number | null>(null);

  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      const touch1 = e.touches[0];
      const touch2 = e.touches[1];
      const distance = Math.sqrt(
        Math.pow(touch2.clientX - touch1.clientX, 2) +
        Math.pow(touch2.clientY - touch1.clientY, 2)
      );
      lastDistance.current = distance;
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 2 && lastDistance.current !== null) {
      const touch1 = e.touches[0];
      const touch2 = e.touches[1];
      const distance = Math.sqrt(
        Math.pow(touch2.clientX - touch1.clientX, 2) +
        Math.pow(touch2.clientY - touch1.clientY, 2)
      );

      const newScale = scale * (distance / lastDistance.current);
      const clampedScale = Math.max(0.5, Math.min(3, newScale));
      setScale(clampedScale);
      onZoom(clampedScale);
      lastDistance.current = distance;
    }
  };

  const handleTouchEnd = () => {
    lastDistance.current = null;
  };

  return {
    scale,
    onTouchStart: handleTouchStart,
    onTouchMove: handleTouchMove,
    onTouchEnd: handleTouchEnd,
  };
}
