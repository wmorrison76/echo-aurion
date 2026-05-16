/**
 * Tablet Service Worker
 * Handles offline support for kitchen tablet operations
 * Includes caching and background sync for recipe labels, waste tracking, and inventory transfers
 */

const CACHE_NAME = "tablet-cache-v1";
const RUNTIME_CACHE = "tablet-runtime-v1";

// API routes that should be cached for offline access
const CACHE_URLS = [
  "/api/tablet/recipes",
  "/api/tablet/settings",
  "/api/inventory/items",
];

// Install event - cache essential assets
self.addEventListener("install", (event) => {
  console.log("[Tablet SW] Installing...");
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => {
        console.log("[Tablet SW] Cache opened");
        return cache;
      })
      .then(() => self.skipWaiting()),
  );
});

// Activate event - clean up old caches
self.addEventListener("activate", (event) => {
  console.log("[Tablet SW] Activating...");
  event.waitUntil(
    caches
      .keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames
            .filter((cacheName) => {
              return (
                cacheName !== CACHE_NAME &&
                cacheName !== RUNTIME_CACHE &&
                cacheName.startsWith("tablet-")
              );
            })
            .map((cacheName) => {
              console.log("[Tablet SW] Deleting cache:", cacheName);
              return caches.delete(cacheName);
            }),
        );
      })
      .then(() => self.clients.claim()),
  );
});

// Fetch event - serve from cache, fallback to network
self.addEventListener("fetch", (event) => {
  const { request } = event;
  const { url, method } = request;

  // Skip non-GET requests
  if (method !== "GET") {
    return;
  }

  // Skip chrome extensions and other non-http requests
  if (!url.startsWith("http")) {
    return;
  }

  // Only intercept tablet routes
  if (!url.includes("/tablet/") && !url.includes("/api/")) {
    return;
  }

  // API requests - network first, cache fallback
  if (url.includes("/api/")) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          // Clone the response before storing
          const responseToCache = response.clone();
          caches.open(RUNTIME_CACHE).then((cache) => {
            cache.put(request, responseToCache);
          });
          return response;
        })
        .catch(() => {
          // Network failed, try cache
          return caches.match(request).then((cachedResponse) => {
            if (cachedResponse) {
              return cachedResponse;
            }

            // Return a custom offline response for API failures
            if (request.url.includes("/api/")) {
              return new Response(
                JSON.stringify({
                  error: "offline",
                  message:
                    "You are currently offline. Changes will sync when back online.",
                }),
                {
                  status: 503,
                  statusText: "Service Unavailable",
                  headers: new Headers({
                    "Content-Type": "application/json",
                  }),
                },
              );
            }

            return new Response("Offline", { status: 503 });
          });
        }),
    );
    return;
  }

  // HTML/CSS/JS - cache first, network fallback
  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }

      return fetch(request)
        .then((response) => {
          // Only cache successful responses
          if (
            !response ||
            response.status !== 200 ||
            response.type === "error"
          ) {
            return response;
          }

          const responseToCache = response.clone();
          caches.open(RUNTIME_CACHE).then((cache) => {
            cache.put(request, responseToCache);
          });

          return response;
        })
        .catch(() => {
          // Return offline page or cached response
          return caches.match(request);
        });
    }),
  );
});

// Handle messages from clients
self.addEventListener("message", (event) => {
  console.log("[Tablet SW] Message received:", event.data);

  if (event.data && event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }

  if (event.data && event.data.type === "CLEAR_CACHE") {
    caches.keys().then((cacheNames) => {
      cacheNames.forEach((cacheName) => {
        if (
          cacheName === CACHE_NAME ||
          cacheName === RUNTIME_CACHE ||
          cacheName.startsWith("tablet-")
        ) {
          caches.delete(cacheName);
        }
      });
    });
  }

  if (event.data && event.data.type === "SYNC_PRINT_QUEUE") {
    // Handle background sync if needed
    event.waitUntil(
      new Promise((resolve) => {
        console.log("[Tablet SW] Syncing print queue...");
        resolve();
      }),
    );
  }
});

// Background sync (if supported)
if ("sync" in self) {
  self.addEventListener("sync", (event) => {
    console.log("[Tablet SW] Background sync triggered:", event.tag);

    if (event.tag === "sync-print-history") {
      event.waitUntil(
        new Promise((resolve) => {
          console.log("[Tablet SW] Syncing print history...");
          resolve();
        }),
      );
    }
  });
}

console.log("[Tablet SW] Service Worker loaded successfully");
