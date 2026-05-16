/**
 * Service Worker for Panel Module Caching
 * Phase 2: Storage & Offline
 * 
 * Caches panel modules for offline support and faster loading
 */

const CACHE_NAME = "luccca-panel-modules-v1";
const MODULE_PATTERN = /\/modules\//;

self.addEventListener("install", (event) => {
  console.log("[ServiceWorker] Installing panel module cache");
  // Don't wait - allow service worker to activate immediately
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  console.log("[ServiceWorker] Activating panel module cache");
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name.startsWith("luccca-panel-modules") && name !== CACHE_NAME)
          .map((name) => {
            console.log("[ServiceWorker] Deleting old cache:", name);
            return caches.delete(name);
          })
      );
    })
  );
  // Take control of all pages immediately
  return self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);

  // Only cache panel module requests
  if (!MODULE_PATTERN.test(url.pathname)) {
    return;
  }

  // Only cache GET requests
  if (event.request.method !== "GET") {
    return;
  }

  event.respondWith(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.match(event.request).then((cachedResponse) => {
        if (cachedResponse) {
          // Return cached version immediately
          return cachedResponse;
        }

        // Fetch from network
        return fetch(event.request)
          .then((response) => {
            // Cache successful responses
            if (response.status === 200) {
              cache.put(event.request, response.clone());
            }
            return response;
          })
          .catch((error) => {
            console.error("[ServiceWorker] Fetch failed:", error);
            throw error;
          });
      });
    })
  );
});

// Message handler for cache management
self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "CLEAR_CACHE") {
    event.waitUntil(
      caches.delete(CACHE_NAME).then(() => {
        console.log("[ServiceWorker] Cache cleared");
        return self.clients.matchAll().then((clients) => {
          clients.forEach((client) => {
            client.postMessage({ type: "CACHE_CLEARED" });
          });
        });
      })
    );
  }
});
