/**
 * Performance Helper Utilities
 * Quick utilities for lazy loading and performance optimization
 */

import React, { lazy, Suspense, ComponentType } from "react";
import type { MemoExoticComponent } from "react";

/**
 * Create lazy-loaded component with loading fallback
 */
export function createLazyComponent<P = {}>(
  importFn: () => Promise<{ default: ComponentType<P> }>,
  fallback?: React.ReactNode
) {
  const LazyComponent = lazy(importFn);
  
  return function LazyWrapper(props: P) {
    return React.createElement(
      Suspense,
      { fallback: fallback || React.createElement("div", null, "Loading...") },
      React.createElement(LazyComponent as ComponentType<any>, props as any),
    );
  };
}

/**
 * Batch component lazy loading
 */
export function createLazyComponents<
  T extends Record<string, () => Promise<{ default: ComponentType<any> }>>
>(components: T): { [K in keyof T]: ReturnType<typeof createLazyComponent> } {
  const lazyComponents = {} as any;
  
  for (const [key, importFn] of Object.entries(components)) {
    lazyComponents[key] = createLazyComponent(importFn);
  }
  
  return lazyComponents;
}

/**
 * Memoized component wrapper
 */
export function withMemo<P extends Record<string, any>>(
  Component: ComponentType<P>,
  compareFn?: (prevProps: P, nextProps: P) => boolean
) {
  return React.memo(Component, compareFn) as MemoExoticComponent<ComponentType<P>>;
}

/**
 * Debounce hook for performance
 */
export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = React.useState<T>(value);

  React.useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

/**
 * Throttle hook for performance
 */
export function useThrottle<T>(value: T, limit: number): T {
  const [throttledValue, setThrottledValue] = React.useState<T>(value);
  const lastRan = React.useRef<number>(Date.now());

  React.useEffect(() => {
    const handler = setTimeout(() => {
      if (Date.now() - lastRan.current >= limit) {
        setThrottledValue(value);
        lastRan.current = Date.now();
      }
    }, limit - (Date.now() - lastRan.current));

    return () => {
      clearTimeout(handler);
    };
  }, [value, limit]);

  return throttledValue;
}
