/**
 * Global Object URL Wrapper
 * =========================
 * Intercepts all URL.createObjectURL calls to use the LRU cache
 * This ensures the entire app (including third-party libraries) respects blob resource limits
 *
 * CRITICAL: The cache uses native URL API directly (not wrapped), so no recursion
 */

import { objectURLCache } from "./object-url-cache";

let isWrapped = false;

/**
 * Install global wrapper for URL.createObjectURL
 * This must be called early in app initialization
 */
export function installGlobalObjectURLWrapper(): void {
  if (isWrapped) return;

  try {
    // Replace URL.createObjectURL with our cached version
    // The cache internally uses native URL API, not this wrapper
    URL.createObjectURL = function (blob: Blob): string {
      // Generate a unique ID for this blob
      const id = `blob-${Date.now()}-${Math.random().toString(36).substring(7)}`;

      try {
        // Use the LRU cache instead of creating unlimited URLs
        // The cache uses native URL.createObjectURL internally
        return objectURLCache.set(id, blob);
      } catch (error) {
        console.error("[ObjectURLWrapper] Failed to cache blob URL:", error);
        // Don't fallback - if it fails, let the error propagate
        // This helps us see actual resource exhaustion issues
        throw error;
      }
    };

    isWrapped = true;
    console.log("[ObjectURLWrapper] Global URL.createObjectURL wrapper installed successfully");
  } catch (error) {
    console.error("[ObjectURLWrapper] Failed to install wrapper:", error);
    throw error;
  }
}

/**
 * Get wrapper status
 */
export function isGlobalObjectURLWrapperInstalled(): boolean {
  return isWrapped;
}
