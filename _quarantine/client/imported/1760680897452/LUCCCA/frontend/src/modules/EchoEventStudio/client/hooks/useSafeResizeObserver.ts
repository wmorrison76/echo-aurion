import { useEffect, useRef, useCallback } from 'react';

interface UseSafeResizeObserverOptions {
  debounceMs?: number;
  enabled?: boolean;
}

/**
 * Safe ResizeObserver hook that prevents infinite loops and errors
 * @param callback - Function to call when resize is observed
 * @param options - Configuration options
 * @returns ref to attach to the element to observe
 */
export function useSafeResizeObserver<T extends HTMLElement = HTMLElement>(
  callback: (entry: ResizeObserverEntry, observer: ResizeObserver) => void,
  options: UseSafeResizeObserverOptions = {}
) {
  const { debounceMs = 16, enabled = true } = options;
  const elementRef = useRef<T>(null);
  const observerRef = useRef<ResizeObserver | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const frameRef = useRef<number | null>(null);
  const lastSizeRef = useRef<{ width: number; height: number } | null>(null);

  const debouncedCallback = useCallback(
    (entries: ResizeObserverEntry[], observer: ResizeObserver) => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      if (frameRef.current) {
        cancelAnimationFrame(frameRef.current);
      }

      timeoutRef.current = setTimeout(() => {
        frameRef.current = requestAnimationFrame(() => {
          try {
            const entry = entries[0];
            if (!entry) return;

            // Prevent loops by checking if size actually changed
            const newSize = {
              width: entry.contentRect.width,
              height: entry.contentRect.height
            };

            if (
              lastSizeRef.current &&
              Math.abs(lastSizeRef.current.width - newSize.width) < 1 &&
              Math.abs(lastSizeRef.current.height - newSize.height) < 1
            ) {
              return; // No significant change, skip callback
            }

            lastSizeRef.current = newSize;
            callback(entry, observer);
          } catch (error) {
            // Suppress ResizeObserver-related errors
            if (error instanceof Error && error.message.includes('ResizeObserver')) {
              return;
            }
            console.error('ResizeObserver callback error:', error);
          }
        });
      }, debounceMs);
    },
    [callback, debounceMs]
  );

  useEffect(() => {
    if (!enabled || !elementRef.current) return;

    try {
      // Create observer with error handling
      observerRef.current = new ResizeObserver((entries, observer) => {
        try {
          debouncedCallback(entries, observer);
        } catch (error) {
          // Suppress ResizeObserver loop errors
          if (error instanceof Error && error.message.includes('ResizeObserver loop')) {
            return;
          }
          console.error('ResizeObserver error:', error);
        }
      });

      observerRef.current.observe(elementRef.current);
    } catch (error) {
      console.error('Failed to create ResizeObserver:', error);
    }

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
        observerRef.current = null;
      }
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      if (frameRef.current) {
        cancelAnimationFrame(frameRef.current);
      }
    };
  }, [enabled, debouncedCallback]);

  return elementRef;
}

/**
 * Hook to safely observe multiple elements
 */
export function useSafeMultiResizeObserver<T extends HTMLElement = HTMLElement>(
  callback: (entries: ResizeObserverEntry[], observer: ResizeObserver) => void,
  options: UseSafeResizeObserverOptions = {}
) {
  const { debounceMs = 16, enabled = true } = options;
  const observerRef = useRef<ResizeObserver | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const frameRef = useRef<number | null>(null);
  const elementsRef = useRef<Set<T>>(new Set());

  const debouncedCallback = useCallback(
    (entries: ResizeObserverEntry[], observer: ResizeObserver) => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      if (frameRef.current) {
        cancelAnimationFrame(frameRef.current);
      }

      timeoutRef.current = setTimeout(() => {
        frameRef.current = requestAnimationFrame(() => {
          try {
            callback(entries, observer);
          } catch (error) {
            if (error instanceof Error && error.message.includes('ResizeObserver')) {
              return;
            }
            console.error('Multi ResizeObserver callback error:', error);
          }
        });
      }, debounceMs);
    },
    [callback, debounceMs]
  );

  const observeElement = useCallback((element: T) => {
    if (!enabled || !element) return;

    try {
      if (!observerRef.current) {
        observerRef.current = new ResizeObserver((entries, observer) => {
          try {
            debouncedCallback(entries, observer);
          } catch (error) {
            if (error instanceof Error && error.message.includes('ResizeObserver loop')) {
              return;
            }
            console.error('ResizeObserver error:', error);
          }
        });
      }

      elementsRef.current.add(element);
      observerRef.current.observe(element);
    } catch (error) {
      console.error('Failed to observe element:', error);
    }
  }, [enabled, debouncedCallback]);

  const unobserveElement = useCallback((element: T) => {
    if (observerRef.current && elementsRef.current.has(element)) {
      observerRef.current.unobserve(element);
      elementsRef.current.delete(element);
    }
  }, []);

  useEffect(() => {
    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
        observerRef.current = null;
      }
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      if (frameRef.current) {
        cancelAnimationFrame(frameRef.current);
      }
      elementsRef.current.clear();
    };
  }, []);

  return { observeElement, unobserveElement };
}

/**
 * Hook to safely measure element dimensions without ResizeObserver
 * Uses a combination of RAF and debouncing for performance
 */
export function useSafeDimensionTracking<T extends HTMLElement = HTMLElement>(
  callback: (dimensions: { width: number; height: number }) => void,
  options: { debounceMs?: number; enabled?: boolean } = {}
) {
  const { debounceMs = 100, enabled = true } = options;
  const elementRef = useRef<T>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastDimensionsRef = useRef<{ width: number; height: number } | null>(null);

  const measureDimensions = useCallback(() => {
    if (!elementRef.current) return;

    const rect = elementRef.current.getBoundingClientRect();
    const newDimensions = {
      width: rect.width,
      height: rect.height
    };

    // Only trigger callback if dimensions actually changed
    if (
      !lastDimensionsRef.current ||
      Math.abs(lastDimensionsRef.current.width - newDimensions.width) >= 1 ||
      Math.abs(lastDimensionsRef.current.height - newDimensions.height) >= 1
    ) {
      lastDimensionsRef.current = newDimensions;
      callback(newDimensions);
    }
  }, [callback]);

  const debouncedMeasure = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    
    timeoutRef.current = setTimeout(measureDimensions, debounceMs);
  }, [measureDimensions, debounceMs]);

  useEffect(() => {
    if (!enabled) return;

    // Initial measurement
    measureDimensions();

    // Listen to window resize
    window.addEventListener('resize', debouncedMeasure);

    return () => {
      window.removeEventListener('resize', debouncedMeasure);
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [enabled, measureDimensions, debouncedMeasure]);

  return elementRef;
}
