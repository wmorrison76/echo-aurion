/**
 * Service Worker for Tablet Label Printing System
 * Provides offline support, recipe caching, and background sync for print history
 */

const CACHE_NAME = "tablet-labels-v1";
const RECIPE_CACHE = "tablet-recipes-v1";
const OFFLINE_PAGE = "/tablet/labels";

const CACHE_URLS = ["/tablet/labels", "/api/tablet/recipes"];

// Install event - cache essential files
self.addEventListener("install", (event: ExtendedInstallEvent) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE_NAME);
      await cache.addAll(CACHE_URLS);
      (self as unknown as ServiceWorkerGlobalScope).skipWaiting();
    })(),
  );
});

// Activate event - clean up old caches
self.addEventListener("activate", (event: ExtendedActivateEvent) => {
  event.waitUntil(
    (async () => {
      const cacheNames = await caches.keys();
      await Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME && name !== RECIPE_CACHE)
          .map((name) => caches.delete(name)),
      );
      (self as unknown as ServiceWorkerGlobalScope).clients.claim();
    })(),
  );
});

// Fetch event - network first, fallback to cache
self.addEventListener("fetch", (event: ExtendedFetchEvent) => {
  const url = new URL(event.request.url);

  // Skip non-GET requests
  if (event.request.method !== "GET") {
    return;
  }

  // Recipe API endpoints - use cache-first strategy
  if (url.pathname.startsWith("/api/tablet/recipes")) {
    event.respondWith(
      (async () => {
        try {
          const response = await fetch(event.request);
          if (response.ok) {
            const cache = await caches.open(RECIPE_CACHE);
            cache.put(event.request, response.clone());
          }
          return response;
        } catch {
          // Offline: return cached recipes
          const cached = await caches.match(event.request);
          if (cached) {
            return cached;
          }
          // Return empty array if no cache
          return new Response(JSON.stringify([]), {
            headers: { "Content-Type": "application/json" },
          });
        }
      })(),
    );
    return;
  }

  // Other tablet requests - network first
  if (
    url.pathname.startsWith("/tablet") ||
    url.pathname.startsWith("/api/tablet")
  ) {
    event.respondWith(
      (async () => {
        try {
          return await fetch(event.request);
        } catch {
          // Offline: try cache
          const cached = await caches.match(event.request);
          if (cached) {
            return cached;
          }
          // Return offline page for HTML requests
          if (event.request.destination === "document") {
            return caches.match(OFFLINE_PAGE) || new Response("Offline");
          }
          throw new Error("Offline");
        }
      })(),
    );
    return;
  }

  // Let other requests pass through
  event.respondWith(fetch(event.request));
});

// Background sync for print history (queued prints when offline)
self.addEventListener("sync", (event: ExtendedSyncEvent) => {
  if (event.tag === "sync-print-history") {
    event.waitUntil(syncPrintHistory());
  }
});

async function syncPrintHistory() {
  try {
    // Get queued prints from IndexedDB
    const db = await openIndexedDB();
    const queuedPrints = await getFromDB(db, "printQueue");

    // Send each queued print to server
    for (const print of queuedPrints) {
      try {
        await fetch("/api/tablet/print-label", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(print),
        });

        // Remove from queue on success
        await deleteFromDB(db, "printQueue", print.id);
      } catch (error) {
        console.error("Failed to sync print:", error);
        // Keep in queue for next sync
      }
    }
  } catch (error) {
    console.error("Background sync failed:", error);
  }
}

// IndexedDB helpers
function openIndexedDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open("TabletLabels", 1);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains("printQueue")) {
        db.createObjectStore("printQueue", { keyPath: "id" });
      }
      if (!db.objectStoreNames.contains("recipes")) {
        db.createObjectStore("recipes", { keyPath: "id" });
      }
    };
  });
}

function getFromDB(db: IDBDatabase, storeName: string): Promise<any[]> {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, "readonly");
    const store = transaction.objectStore(storeName);
    const request = store.getAll();

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
  });
}

function deleteFromDB(
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

// Type definitions
interface ExtendedInstallEvent extends ExtendedEvent {
  waitUntil(promise: Promise<any>): void;
}

interface ExtendedActivateEvent extends ExtendedEvent {
  waitUntil(promise: Promise<any>): void;
}

interface ExtendedFetchEvent extends ExtendedEvent {
  request: Request;
  respondWith(promise: Promise<Response> | Response): void;
}

interface ExtendedSyncEvent extends ExtendedEvent {
  tag: string;
  waitUntil(promise: Promise<any>): void;
}

interface ExtendedEvent {
  type: string;
}
