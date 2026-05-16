/**
 * Performance optimization utilities for better app responsiveness
 */

/**
 * Debounce function to limit execution frequency
 * @param func - Function to debounce
 * @param delay - Delay in milliseconds
 * @returns Debounced function
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  delay: number,
): (...args: Parameters<T>) => void {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;

  return function debounced(...args: Parameters<T>) {
    if (timeoutId !== null) {
      clearTimeout(timeoutId);
    }
    timeoutId = setTimeout(() => {
      func(...args);
      timeoutId = null;
    }, delay);
  };
}

/**
 * Throttle function to limit execution frequency
 * @param func - Function to throttle
 * @param limit - Time limit in milliseconds
 * @returns Throttled function
 */
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number,
): (...args: Parameters<T>) => void {
  let inThrottle: boolean;

  return function throttled(...args: Parameters<T>) {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => {
        inThrottle = false;
      }, limit);
    }
  };
}

/**
 * Memoize function results
 * @param func - Function to memoize
 * @returns Memoized function
 */
export function memoize<T extends (...args: any[]) => any>(func: T): T {
  const cache = new Map();

  return ((...args: Parameters<T>) => {
    const key = JSON.stringify(args);
    if (cache.has(key)) {
      return cache.get(key);
    }
    const result = func(...args);
    cache.set(key, result);
    return result;
  }) as T;
}

/**
 * Request idle callback wrapper
 * Uses global polyfill if available, falls back to setTimeout
 * @param callback - Function to call when idle
 * @returns ID for cancellation
 */
export function requestIdleCallback(callback: () => void): number {
  if (typeof globalThis !== "undefined" && "requestIdleCallback" in globalThis) {
    return (globalThis as any).requestIdleCallback(callback) as unknown as number;
  }
  if (typeof window !== "undefined" && "requestIdleCallback" in window) {
    return (window as any).requestIdleCallback(callback) as unknown as number;
  }
  // Fallback to setTimeout
  if (typeof setTimeout !== "undefined") {
    return setTimeout(callback, 1) as unknown as number;
  }
  return 0;
}

/**
 * Cancel idle callback
 * @param id - ID from requestIdleCallback
 */
export function cancelIdleCallback(id: number): void {
  if (typeof globalThis !== "undefined" && "cancelIdleCallback" in globalThis) {
    (globalThis as any).cancelIdleCallback(id as unknown as number);
  } else if (typeof window !== "undefined" && "cancelIdleCallback" in window) {
    (window as any).cancelIdleCallback(id as unknown as number);
  } else if (typeof clearTimeout !== "undefined") {
    clearTimeout(id);
  }
}

/**
 * Lazy load images with intersection observer
 * @param img - Image element
 * @param src - Image source URL
 */
export function lazyLoadImage(img: HTMLImageElement, src: string) {
  if (!("IntersectionObserver" in window)) {
    img.src = src;
    return;
  }

  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        const image = entry.target as HTMLImageElement;
        image.src = src;
        observer.unobserve(image);
      }
    });
  });

  observer.observe(img);
}

/**
 * Measure performance of a function
 * @param name - Function name
 * @param func - Function to measure
 * @returns Result and execution time
 */
export function measurePerformance<T>(
  name: string,
  func: () => T,
): { result: T; duration: number } {
  const start = performance.now();
  const result = func();
  const duration = performance.now() - start;

  if (duration > 100) {
    console.warn(`${name} took ${duration.toFixed(2)}ms`);
  }

  return { result, duration };
}

/**
 * Batch DOM updates for better performance
 * @param updates - Array of DOM update functions
 */
export function batchDOMUpdates(updates: Array<() => void>) {
  requestAnimationFrame(() => {
    updates.forEach((update) => update());
  });
}

/**
 * Virtualize long lists for better performance
 * @param items - Array of items
 * @param visibleCount - Number of items visible at once
 * @param startIndex - Starting index
 * @returns Visible items and total count
 */
export function virtualizeList<T>(
  items: T[],
  visibleCount: number,
  startIndex: number,
): {
  visibleItems: T[];
  totalCount: number;
  startIndex: number;
  endIndex: number;
} {
  const endIndex = Math.min(startIndex + visibleCount, items.length);
  return {
    visibleItems: items.slice(startIndex, endIndex),
    totalCount: items.length,
    startIndex,
    endIndex,
  };
}

/**
 * Prefetch resources for better perceived performance
 * @param urls - URLs to prefetch
 */
export function prefetchResources(urls: string[]) {
  urls.forEach((url) => {
    const link = document.createElement("link");
    link.rel = "prefetch";
    link.href = url;
    document.head.appendChild(link);
  });
}

/**
 * Preload critical resources
 * @param urls - URLs to preload
 * @param as - Resource type (script, style, image, etc)
 */
export function preloadResources(urls: string[], as: string = "script") {
  urls.forEach((url) => {
    const link = document.createElement("link");
    link.rel = "preload";
    link.href = url;
    link.as = as;
    document.head.appendChild(link);
  });
}

/**
 * Detect slow network and adjust content accordingly
 * @returns Network type and effective type
 */
export function getNetworkInfo() {
  if (typeof navigator === "undefined") {
    return { type: "unknown", effectiveType: "4g" };
  }

  const connection =
    (navigator as any).connection ||
    (navigator as any).mozConnection ||
    (navigator as any).webkitConnection;

  if (!connection) {
    return { type: "unknown", effectiveType: "4g" };
  }

  return {
    type: connection.type,
    effectiveType: connection.effectiveType,
    downlink: connection.downlink,
    saveData: connection.saveData,
  };
}

/**
 * Check if user prefers reduced motion
 * @returns True if user prefers reduced motion
 */
export function prefersReducedMotion(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/**
 * Check if device is in dark mode
 * @returns True if dark mode is preferred
 */
export function prefersDarkMode(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

/**
 * Compress image data URL
 * @param dataUrl - Image data URL
 * @param quality - Compression quality (0-1)
 * @returns Compressed data URL
 */
export async function compressImageDataUrl(dataUrl: string, quality: number = 0.8): Promise<string> {
  if (typeof document === "undefined") {
    return dataUrl;
  }
  const canvas = document.createElement("canvas");
  const img = new Image();

  return new Promise((resolve) => {
    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext("2d");
      ctx?.drawImage(img, 0, 0);
      resolve(canvas.toDataURL("image/jpeg", quality));
    };
    img.src = dataUrl;
  });
}

/**
 * Monitor Core Web Vitals
 * @param callback - Callback with vitals data
 */
export function monitorWebVitals(
  callback: (vitals: {
    LCP?: number;
    FID?: number;
    CLS?: number;
  }) => void,
) {
  const vitals: { LCP?: number; FID?: number; CLS?: number } = {};

  // Largest Contentful Paint
  if ("PerformanceObserver" in window) {
    try {
      const lcpObserver = new PerformanceObserver((entryList) => {
        const entries = entryList.getEntries();
        const lastEntry = entries[entries.length - 1] as any;
        vitals.LCP = lastEntry?.renderTime || lastEntry?.loadTime;
      });
      lcpObserver.observe({ entryTypes: ["largest-contentful-paint"] });
    } catch (e) {
      console.debug("LCP observer not supported");
    }

    // First Input Delay
    try {
      const fidObserver = new PerformanceObserver((entryList) => {
        entryList.getEntries().forEach((entry: any) => {
          if (vitals.FID === undefined) {
            vitals.FID = entry.processingDuration;
          }
        });
      });
      fidObserver.observe({ entryTypes: ["first-input"] });
    } catch (e) {
      console.debug("FID observer not supported");
    }

    // Cumulative Layout Shift
    try {
      const clsObserver = new PerformanceObserver((entryList) => {
        entryList.getEntries().forEach((entry: any) => {
          if (!entry.hadRecentInput) {
            vitals.CLS = (vitals.CLS || 0) + entry.value;
          }
        });
        callback(vitals);
      });
      clsObserver.observe({ entryTypes: ["layout-shift"] });
    } catch (e) {
      console.debug("CLS observer not supported");
    }
  }
}
