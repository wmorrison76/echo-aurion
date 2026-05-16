/**
 * Service Worker Registration
 * Phase 2: Storage & Offline
 * 
 * Registers the panel module caching service worker
 */

/**
 * Register service worker for panel module caching
 */
export async function registerPanelServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  // In development, the panel-module service worker can serve stale cached modules
  // and make it look like "modules won't launch" after code changes. Avoid that.
  if (import.meta.env.DEV) {
    try {
      if ("serviceWorker" in navigator) {
        const regs = await navigator.serviceWorker.getRegistrations();
        await Promise.all(regs.map((r) => r.unregister()));
      }
    } catch (error) {
      console.warn("[ServiceWorker] Failed to unregister in dev:", error);
    }
    return null;
  }

  if (!("serviceWorker" in navigator)) {
    console.warn("[ServiceWorker] Service Workers not supported");
    return null;
  }

  try {
    const registration = await navigator.serviceWorker.register("/sw-panel-modules.js", {
      scope: "/",
    });

    console.log("[ServiceWorker] Registered:", registration.scope);

    registration.addEventListener("updatefound", () => {
      const newWorker = registration.installing;
      if (newWorker) {
        newWorker.addEventListener("statechange", () => {
          if (newWorker.state === "installed" && navigator.serviceWorker.controller) {
            console.log("[ServiceWorker] New service worker available");
          }
        });
      }
    });

    return registration;
  } catch (error) {
    console.error("[ServiceWorker] Registration failed:", error);
    return null;
  }
}

/**
 * Clear panel module cache
 */
export async function clearPanelCache(): Promise<void> {
  if (!("serviceWorker" in navigator) || !navigator.serviceWorker.controller) {
    return;
  }

  navigator.serviceWorker.controller.postMessage({ type: "CLEAR_CACHE" });
}
