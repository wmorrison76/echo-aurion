/**
 * Global Browser Polyfills
 * ========================
 * Ensures critical browser APIs are available globally
 * This must be imported early in the application lifecycle
 */

/**
 * Polyfill for requestIdleCallback
 * Some browsers and environments don't have this API
 * Falls back to setTimeout with a small delay
 */
if (typeof window !== "undefined" && !("requestIdleCallback" in window)) {
  (window as any).requestIdleCallback = (
    callback: IdleRequestCallback,
    options?: IdleRequestOptions,
  ): number => {
    const start = Date.now();
    return setTimeout(() => {
      callback({
        didTimeout: false,
        timeRemaining: () => Math.max(0, 50.0 - (Date.now() - start)),
      } as IdleDeadline);
    }, 1) as unknown as number;
  };
}

/**
 * Polyfill for cancelIdleCallback
 */
if (typeof window !== "undefined" && !("cancelIdleCallback" in window)) {
  (window as any).cancelIdleCallback = (id: number): void => {
    clearTimeout(id);
  };
}

/**
 * Polyfill for requestAnimationFrame
 */
if (typeof window !== "undefined" && !("requestAnimationFrame" in window)) {
  (window as any).requestAnimationFrame = (
    callback: FrameRequestCallback,
  ): number => {
    return setTimeout(callback, 1000 / 60) as unknown as number;
  };
}

/**
 * Polyfill for cancelAnimationFrame
 */
if (typeof window !== "undefined" && !("cancelAnimationFrame" in window)) {
  (window as any).cancelAnimationFrame = (id: number): void => {
    clearTimeout(id);
  };
}

/**
 * Add requestIdleCallback to globalThis for Node/SSR environments
 */
if (typeof globalThis !== "undefined" && !("requestIdleCallback" in globalThis)) {
  (globalThis as any).requestIdleCallback = (
    callback: IdleRequestCallback,
    options?: IdleRequestOptions,
  ): number => {
    const start = Date.now();
    return setTimeout(() => {
      callback({
        didTimeout: false,
        timeRemaining: () => Math.max(0, 50.0 - (Date.now() - start)),
      } as IdleDeadline);
    }, 1) as unknown as number;
  };
}

if (typeof globalThis !== "undefined" && !("cancelIdleCallback" in globalThis)) {
  (globalThis as any).cancelIdleCallback = (id: number): void => {
    clearTimeout(id);
  };
}

export const polyfillsLoaded = true;
