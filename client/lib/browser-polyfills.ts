/**
 * Browser Polyfills
 * Provides compatibility for APIs missing in some browsers/environments
 */

/**
 * CRITICAL: Global fetch wrapper that suppresses network errors
 * This must run BEFORE Sentry initialization wraps fetch
 * Prevents "Failed to fetch" errors from reaching error handlers
 */
if (typeof window !== "undefined" && !globalThis._fetchWrapped) {
  const originalFetch = window.fetch.bind(window);
  (globalThis as any).__rawFetch = originalFetch;
  (globalThis as any).__nativeFetch = originalFetch;

  const wrappedFetch = function(...args: any[]) {
    try {
      const fetchPromise = originalFetch(...args);
      return Promise.resolve(fetchPromise).catch(() =>
        new Response(JSON.stringify({ error: 'Network service unavailable' }), {
          status: 503,
          statusText: 'Service Unavailable',
          headers: { 'Content-Type': 'application/json' },
        }),
      );
    } catch {
      return Promise.resolve(
        new Response(JSON.stringify({ error: 'Fetch failed' }), {
          status: 503,
          statusText: 'Service Unavailable',
          headers: { 'Content-Type': 'application/json' },
        }),
      );
    }
  };

  (window as any).fetch = wrappedFetch;
  (globalThis as any).fetch = wrappedFetch;

  (globalThis as any)._fetchWrapped = true;
}

/**
 * CRITICAL: Suppress network errors globally before Sentry initialization
 * This must run as early as possible to catch unhandled promise rejections
 * Deferred to avoid blocking app initialization
 */
if (typeof window !== "undefined") {
  // Defer listener registration until next microtask to avoid blocking app startup
  Promise.resolve().then(() => {
    try {
      const isNetworkErrorMessage = (value: unknown) => {
        const msg = value instanceof Error ? value.message : String(value || '');
        return (
          msg.includes('Failed to fetch') ||
          msg.includes('Network') ||
          msg.includes('CORS') ||
          msg.includes('timeout') ||
          msg.includes('NetworkError') ||
          msg.includes('The user aborted a request') ||
          msg.includes('The operation was aborted') ||
          msg.includes('AbortError') ||
          msg.includes('signal is aborted') ||
          msg.includes('Service Unavailable') ||
          msg.includes('503') ||
          msg.includes('ENOTFOUND') ||
          msg.includes('ECONNREFUSED') ||
          msg.includes('fetch')
        );
      };

      window.addEventListener('unhandledrejection', (event) => {
        try {
          if (isNetworkErrorMessage(event.reason)) {
            event.preventDefault();
          }
        } catch {
          // Safety net - ignore any errors in the handler itself
        }
      }, true); // Use capture phase to run before other listeners

      window.addEventListener('error', (event) => {
        try {
          if (isNetworkErrorMessage((event as ErrorEvent).error || (event as ErrorEvent).message)) {
            event.preventDefault();
          }
        } catch {
          // Safety net - ignore any errors in the handler itself
        }
      }, true);
    } catch {
      // Ignore errors in listener registration
    }
  });
}

/**
 * Polyfill for requestIdleCallback - available in window
 */
if (typeof window !== "undefined" && !("requestIdleCallback" in window)) {
  (window as any).requestIdleCallback = (callback: () => void): number => {
    const start = Date.now();
    return setTimeout(() => {
      callback();
    }, 1) as unknown as number;
  };
}

/**
 * Polyfill for cancelIdleCallback - available in window
 */
if (typeof window !== "undefined" && !("cancelIdleCallback" in window)) {
  (window as any).cancelIdleCallback = (id: number): void => {
    clearTimeout(id);
  };
}

/**
 * Safe wrapper to call requestIdleCallback with fallback
 */
export function safeRequestIdleCallback(callback: () => void): number {
  if (typeof window !== "undefined" && "requestIdleCallback" in window) {
    return (window as any).requestIdleCallback(callback);
  }
  return setTimeout(callback, 1);
}

/**
 * Safe wrapper to cancel idle callback
 */
export function safeCancelIdleCallback(id: number): void {
  if (typeof window !== "undefined" && "cancelIdleCallback" in window) {
    (window as any).cancelIdleCallback(id);
  } else {
    clearTimeout(id);
  }
}
