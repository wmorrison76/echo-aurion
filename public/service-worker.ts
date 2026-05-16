/**
 * Service Worker for LUCCCA PWA
 * Handles offline support, caching, and background sync
 * Weeks 5-7 Implementation
 */

const CACHE_NAME = "luccca-v1.0.2";
const RUNTIME_CACHE = "luccca-runtime";
const CRITICAL_ASSETS = ["/", "/index.html", "/manifest.json", "/robots.txt"];

const RUNTIME_PATHS = ["/api/", "/uploads/"];

/**
 * Install event: Cache critical assets
 */
self.addEventListener("install", (event: ExtendableEvent) => {
  console.log("[SERVICE-WORKER] Installing...");

  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => {
        console.log("[SERVICE-WORKER] Caching critical assets");
        return cache.addAll(CRITICAL_ASSETS);
      })
      .then(() => {
        console.log("[SERVICE-WORKER] Install complete");
        return self.skipWaiting();
      }),
  );
});

/**
 * Activate event: Clean up old caches
 */
self.addEventListener("activate", (event: ExtendableEvent) => {
  console.log("[SERVICE-WORKER] Activating...");

  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME && cacheName !== RUNTIME_CACHE) {
            console.log("[SERVICE-WORKER] Deleting old cache:", cacheName);
            return caches.delete(cacheName);
          }
        }),
      );
    }),
  );
});

/**
 * Fetch event: Network-first strategy for API, cache-first for static assets
 */
self.addEventListener("fetch", (event: FetchEvent) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== "GET") {
    event.respondWith(fetch(request));
    return;
  }

  // Handle API requests: network-first with cache fallback
  if (url.pathname.startsWith("/api/")) {
    event.respondWith(networkFirstStrategy(request));
    return;
  }

  // Handle static assets: cache-first with network fallback
  event.respondWith(cacheFirstStrategy(request));
});

/**
 * Network-first strategy: Try network, fall back to cache
 */
async function networkFirstStrategy(request: Request): Promise<Response> {
  try {
    // Try network first
    const networkResponse = await fetch(request.clone());

    // Cache successful responses
    if (networkResponse.ok) {
      const cache = await caches.open(RUNTIME_CACHE);
      cache.put(request, networkResponse.clone());
    }

    return networkResponse;
  } catch (error) {
    // Fall back to cache
    console.log("[SERVICE-WORKER] Network failed, using cache:", request.url);
    const cachedResponse = await caches.match(request);

    if (cachedResponse) {
      return cachedResponse;
    }

    // Return offline page if available
    const offlinePage = await caches.match("/index.html");
    if (offlinePage) {
      return offlinePage;
    }

    // Return error response
    return new Response("Offline - Unable to load resource", {
      status: 503,
      statusText: "Service Unavailable",
    });
  }
}

/**
 * Cache-first strategy: Use cache, fall back to network
 */
async function cacheFirstStrategy(request: Request): Promise<Response> {
  const cache = await caches.open(CACHE_NAME);
  const cachedResponse = await cache.match(request);

  if (cachedResponse) {
    return cachedResponse;
  }

  try {
    const networkResponse = await fetch(request);

    if (networkResponse.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, networkResponse.clone());
    }

    return networkResponse;
  } catch (error) {
    console.log("[SERVICE-WORKER] Failed to fetch:", request.url);
    return new Response("Offline - Unable to load resource", {
      status: 503,
    });
  }
}

/**
 * Background sync for offline actions
 */
self.addEventListener("sync", (event: any) => {
  console.log("[SERVICE-WORKER] Background sync triggered:", event.tag);

  if (event.tag === "sync-avatar-tasks") {
    event.waitUntil(syncAvatarTasks());
  } else if (event.tag === "sync-orders") {
    event.waitUntil(syncOrders());
  } else if (event.tag === "sync-clocking") {
    event.waitUntil(syncClocking());
  }
});

/**
 * Sync avatar tasks when connection is restored
 */
async function syncAvatarTasks(): Promise<void> {
  const db = await openIndexedDB("luccca-sync");
  const pendingTasks = await getAllFromStore(db, "pending-avatar-tasks");

  for (const task of pendingTasks) {
    try {
      await fetch("/api/avatar/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(task),
      });

      // Remove from sync queue
      await deleteFromStore(db, "pending-avatar-tasks", task.id);
    } catch (error) {
      console.error("[SERVICE-WORKER] Failed to sync task:", error);
    }
  }
}

/**
 * Sync orders when connection is restored
 */
async function syncOrders(): Promise<void> {
  const db = await openIndexedDB("luccca-sync");
  const pendingOrders = await getAllFromStore(db, "pending-orders");

  for (const order of pendingOrders) {
    try {
      await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(order),
      });

      // Remove from sync queue
      await deleteFromStore(db, "pending-orders", order.id);
    } catch (error) {
      console.error("[SERVICE-WORKER] Failed to sync order:", error);
    }
  }
}

/**
 * Sync clocking records when connection is restored
 */
async function syncClocking(): Promise<void> {
  const db = await openIndexedDB("luccca-sync");
  const pendingClocking = await getAllFromStore(db, "pending-clocking");

  for (const clock in pendingClocking) {
    try {
      await fetch("/api/v1/time-tracking/clock", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(clock),
      });

      // Remove from sync queue
      await deleteFromStore(db, "pending-clocking", clock.id);
    } catch (error) {
      console.error("[SERVICE-WORKER] Failed to sync clocking:", error);
    }
  }
}

/**
 * IndexedDB helper functions
 */
function openIndexedDB(dbName: string): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(dbName, 1);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = (event: any) => {
      const db = event.target.result;

      // Create object stores
      ["pending-avatar-tasks", "pending-orders", "pending-clocking"].forEach(
        (storeName) => {
          if (!db.objectStoreNames.contains(storeName)) {
            db.createObjectStore(storeName, { keyPath: "id" });
          }
        },
      );
    };
  });
}

function getAllFromStore(db: IDBDatabase, storeName: string): Promise<any[]> {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, "readonly");
    const store = transaction.objectStore(storeName);
    const request = store.getAll();

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
  });
}

function deleteFromStore(
  db: IDBDatabase,
  storeName: string,
  key: string,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, "readwrite");
    const store = transaction.objectStore(storeName);
    const request = store.delete(key);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();
  });
}

export {};
