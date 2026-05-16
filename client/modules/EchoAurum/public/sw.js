/**
 * EchoAurum Service Worker
 * Handles offline functionality, caching, sync, and background tasks
 */

const CACHE_VERSION = "v1";
const CACHE_NAMES = {
  static: `echo-aurum-static-${CACHE_VERSION}`,
  dynamic: `echo-aurum-dynamic-${CACHE_VERSION}`,
  api: `echo-aurum-api-${CACHE_VERSION}`,
};

const STATIC_ASSETS = [
  "/",
  "/index.html",
  "/manifest.json",
  "/placeholder.svg",
];

const API_PATTERNS = [
  /\/api\/auth\//,
  /\/api\/aurum\//,
  /\/api\/console/,
  /\/api\/ping/,
];

// Install event - cache static assets
self.addEventListener("install", (event) => {
  console.log("[SW] Installing service worker...");

  event.waitUntil(
    caches
      .open(CACHE_NAMES.static)
      .then((cache) => {
        console.log("[SW] Caching static assets");
        return cache.addAll(STATIC_ASSETS).catch((error) => {
          console.warn("[SW] Failed to cache some static assets:", error);
          // Continue even if some assets fail to cache
          return Promise.resolve();
        });
      })
      .then(() => {
        console.log("[SW] Skipping waiting, activating immediately");
        return self.skipWaiting();
      }),
  );
});

// Activate event - clean up old caches
self.addEventListener("activate", (event) => {
  console.log("[SW] Activating service worker...");

  event
    .waitUntil(
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (!Object.values(CACHE_NAMES).includes(cacheName)) {
              console.log("[SW] Deleting old cache:", cacheName);
              return caches.delete(cacheName);
            }
          }),
        );
      }),
    )
    .then(() => {
      console.log("[SW] Claiming clients");
      return self.clients.claim();
    });
});

// Fetch event - implement caching and offline strategies
self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests (POST, PUT, DELETE, etc.)
  if (request.method !== "GET") {
    // For mutations, try network first
    return event.respondWith(
      fetch(request)
        .then((response) => {
          // Clone and cache successful responses
          if (response.ok && isApiRequest(request)) {
            const clone = response.clone();
            caches.open(CACHE_NAMES.api).then((cache) => {
              cache.put(request, clone).catch(() => {});
            });
          }
          return response;
        })
        .catch(() => {
          // Offline response for mutations
          if (isApiRequest(request)) {
            return new Response(
              JSON.stringify({
                error: "Offline - changes queued for sync",
                offline: true,
              }),
              {
                status: 202,
                headers: { "Content-Type": "application/json" },
              },
            );
          }
          return new Response("Offline", { status: 503 });
        }),
    );
  }

  // For GET requests, implement cache-first for static, network-first for API
  if (isStaticAsset(request)) {
    return event.respondWith(cacheFirst(request));
  } else if (isApiRequest(request)) {
    return event.respondWith(networkFirst(request));
  } else {
    return event.respondWith(networkFirst(request));
  }
});

/**
 * Cache-first strategy: use cached version if available, fall back to network
 */
function cacheFirst(request) {
  return caches.match(request).then((response) => {
    if (response) {
      return response;
    }

    return fetch(request)
      .then((response) => {
        if (!response || response.status !== 200 || response.type === "error") {
          return response;
        }

        const cache = caches.open(CACHE_NAMES.dynamic);
        cache.then((c) => {
          c.put(request, response.clone());
        });

        return response;
      })
      .catch(() => {
        // Return offline placeholder
        return caches.match(request).then((cached) => {
          return (
            cached ||
            new Response("Offline", {
              status: 503,
              statusText: "Service Unavailable",
            })
          );
        });
      });
  });
}

/**
 * Network-first strategy: try network first, fall back to cache
 */
function networkFirst(request) {
  return fetch(request)
    .then((response) => {
      if (!response || response.status !== 200 || response.type === "error") {
        return response;
      }

      // Cache successful API responses
      const cache = caches.open(CACHE_NAMES.api);
      cache.then((c) => {
        c.put(request, response.clone());
      });

      return response;
    })
    .catch(() => {
      // Offline fallback
      return caches.match(request).then((cached) => {
        if (cached) {
          return cached;
        }

        // Return offline indicator for API requests
        if (isApiRequest(request)) {
          return new Response(
            JSON.stringify({
              error: "Offline - using cached data",
              offline: true,
              cached: true,
            }),
            {
              status: 200,
              headers: { "Content-Type": "application/json" },
            },
          );
        }

        return new Response("Offline", {
          status: 503,
          statusText: "Service Unavailable",
        });
      });
    });
}

/**
 * Check if request is for a static asset
 */
function isStaticAsset(request) {
  const url = new URL(request.url);
  const pathname = url.pathname;

  return /\.(js|css|svg|png|jpg|jpeg|gif|webp|woff|woff2|ttf|eot)$/i.test(
    pathname,
  );
}

/**
 * Check if request is for an API endpoint
 */
function isApiRequest(request) {
  const url = new URL(request.url);
  return API_PATTERNS.some((pattern) => pattern.test(url.pathname));
}

// Background sync for offline queue
self.addEventListener("sync", (event) => {
  console.log("[SW] Background sync event:", event.tag);

  if (event.tag === "sync-offline-queue") {
    event.waitUntil(syncOfflineQueue());
  }
});

/**
 * Sync offline queue with server
 */
async function syncOfflineQueue() {
  try {
    const db = await openDatabase();
    const tx = db.transaction("offlineQueue", "readonly");
    const store = tx.objectStore("offlineQueue");
    const items = await store.getAll();

    console.log(`[SW] Found ${items.length} items in offline queue`);

    for (const item of items) {
      try {
        const response = await fetch(item.url, {
          method: item.method,
          headers: item.headers,
          body: item.body,
        });

        if (response.ok) {
          // Remove synced item from queue
          await removeFromQueue(item.id);
          console.log(`[SW] Synced item ${item.id}`);
        } else {
          console.warn(`[SW] Failed to sync ${item.id}: ${response.status}`);
        }
      } catch (error) {
        console.error(`[SW] Error syncing item ${item.id}:`, error);
        // Keep in queue for retry
      }
    }
  } catch (error) {
    console.error("[SW] Error during sync:", error);
    throw error;
  }
}

/**
 * Open IndexedDB database
 */
function openDatabase() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open("EchoAurum", 1);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = (event) => {
      const db = event.target.result;

      if (!db.objectStoreNames.contains("offlineQueue")) {
        const store = db.createObjectStore("offlineQueue", { keyPath: "id" });
        store.createIndex("timestamp", "timestamp", { unique: false });
        store.createIndex("status", "status", { unique: false });
      }

      if (!db.objectStoreNames.contains("cache")) {
        db.createObjectStore("cache", { keyPath: "key" });
      }
    };
  });
}

/**
 * Remove item from offline queue
 */
async function removeFromQueue(id) {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open("EchoAurum");

    request.onsuccess = () => {
      const db = request.result;
      const tx = db.transaction("offlineQueue", "readwrite");
      const store = tx.objectStore("offlineQueue");
      store.delete(id);

      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    };

    request.onerror = () => reject(request.error);
  });
}

// Message handler for client communication
self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }

  if (event.data && event.data.type === "CLEAR_CACHE") {
    caches.keys().then((cacheNames) => {
      cacheNames.forEach((cacheName) => {
        caches.delete(cacheName);
      });
    });
  }
});

console.log("[SW] Service worker loaded");
