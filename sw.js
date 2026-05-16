// LUCCCA PWA Service Worker — Offline-First with Auto-Sync
// =========================================================
const CACHE_NAME = 'luccca-v3';
const API_CACHE = 'luccca-api-v3';
const SYNC_QUEUE = 'luccca-sync-queue';

const STATIC_ASSETS = [
  '/',
  '/manifest.json',
];

// API endpoints to cache for offline access
const CACHEABLE_API = [
  '/api/health',
  '/api/dashboard',
  '/api/housekeeping/dashboard',
  '/api/ird/dashboard',
  '/api/ird/menu',
  '/api/concierge/dashboard',
  '/api/concierge/tickets',
  '/api/engineering-ops/dashboard',
  '/api/engineering-ops/tickets',
  '/api/foh/dashboard',
  '/api/retail/dashboard',
  '/api/guest-order/menu',
  '/api/guest-order/manager/periods',
  '/api/guest-order/manager/menu',
  '/api/guest-order/style',
  '/api/kitchen-routing/dashboard',
  '/api/kitchen-routing/stations',
  '/api/kitchen-routing/printers',
  '/api/spa/dashboard',
  '/api/analytics/summary',
];

// Install: cache shell
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS))
  );
  self.skipWaiting();
});

// Activate: clean old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((k) => k !== CACHE_NAME && k !== API_CACHE && k !== SYNC_QUEUE)
          .map((k) => caches.delete(k))
      )
    )
  );
  self.clients.claim();
});

// ── Offline Queue (IndexedDB) ──
function openSyncDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open('luccca-offline-sync', 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains('queue')) {
        db.createObjectStore('queue', { keyPath: 'id', autoIncrement: true });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function enqueueOfflineRequest(request, body) {
  try {
    const db = await openSyncDB();
    const tx = db.transaction('queue', 'readwrite');
    tx.objectStore('queue').add({
      url: request.url,
      method: request.method,
      headers: Object.fromEntries(request.headers.entries()),
      body: body,
      timestamp: Date.now(),
    });
    await new Promise((resolve, reject) => {
      tx.oncomplete = resolve;
      tx.onerror = reject;
    });
    // Notify clients about queued request
    self.clients.matchAll().then(clients => {
      clients.forEach(client => {
        client.postMessage({ type: 'OFFLINE_QUEUED', url: request.url, method: request.method });
      });
    });
    return true;
  } catch (e) {
    console.warn('[SW] Failed to enqueue offline request:', e);
    return false;
  }
}

async function processOfflineQueue() {
  try {
    const db = await openSyncDB();
    const tx = db.transaction('queue', 'readonly');
    const store = tx.objectStore('queue');
    const items = await new Promise((resolve) => {
      const req = store.getAll();
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => resolve([]);
    });

    if (items.length === 0) return;

    let synced = 0;
    let failed = 0;

    for (const item of items) {
      try {
        const response = await fetch(item.url, {
          method: item.method,
          headers: item.headers,
          body: item.body ? JSON.stringify(item.body) : undefined,
        });
        if (response.ok) {
          // Remove from queue
          const delTx = db.transaction('queue', 'readwrite');
          delTx.objectStore('queue').delete(item.id);
          synced++;
        } else {
          failed++;
        }
      } catch (e) {
        failed++;
        break; // Still offline, stop trying
      }
    }

    // Notify clients about sync result
    self.clients.matchAll().then(clients => {
      clients.forEach(client => {
        client.postMessage({ type: 'SYNC_COMPLETE', synced, failed, remaining: items.length - synced });
      });
    });
  } catch (e) {
    console.warn('[SW] Failed to process offline queue:', e);
  }
}


// Fetch: network-first for API with offline caching, stale-while-revalidate for assets
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET for caching (but handle POST offline queue)
  if (url.protocol === 'ws:' || url.protocol === 'wss:') return;

  // ── POST/PUT/DELETE: Queue if offline ──
  if (request.method !== 'GET' && url.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(request.clone()).catch(async () => {
        // Offline — queue the mutation for later sync
        let body = null;
        try {
          body = await request.clone().json();
        } catch (e) {
          try { body = await request.clone().text(); } catch (e2) {}
        }
        const queued = await enqueueOfflineRequest(request, body);
        return new Response(JSON.stringify({
          offline: true,
          queued: queued,
          message: 'You are offline. This action has been saved and will sync when you reconnect.',
        }), {
          status: 202,
          headers: { 'Content-Type': 'application/json' },
        });
      })
    );
    return;
  }

  // ── GET API calls: network-first with cache fallback ──
  if (url.pathname.startsWith('/api/')) {
    const isCacheable = CACHEABLE_API.some(path => url.pathname === path || url.pathname.startsWith(path));

    event.respondWith(
      fetch(request.clone())
        .then((response) => {
          if (response.ok && isCacheable) {
            const clone = response.clone();
            caches.open(API_CACHE).then((cache) => cache.put(request, clone));
          }
          return response;
        })
        .catch(async () => {
          // Offline — try cache
          const cached = await caches.match(request);
          if (cached) {
            // Add offline indicator header
            const headers = new Headers(cached.headers);
            headers.set('X-Offline', 'true');
            return new Response(cached.body, { status: cached.status, headers });
          }
          return new Response(JSON.stringify({
            offline: true,
            message: 'No cached data available. Please reconnect to the internet.',
          }), { status: 503, headers: { 'Content-Type': 'application/json' } });
        })
    );
    return;
  }

  // ── Static assets: stale-while-revalidate ──
  if (request.method === 'GET') {
    event.respondWith(
      caches.match(request).then((cached) => {
        const fetchPromise = fetch(request.clone()).then((response) => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          }
          return response;
        }).catch(() => cached);
        return cached || fetchPromise;
      })
    );
  }
});

// ── Background Sync ──
self.addEventListener('sync', (event) => {
  if (event.tag === 'luccca-offline-sync') {
    event.waitUntil(processOfflineQueue());
  }
});

// ── Periodic Sync (for browsers that support it) ──
self.addEventListener('periodicsync', (event) => {
  if (event.tag === 'luccca-data-refresh') {
    event.waitUntil(
      // Refresh cacheable API data in background
      Promise.all(
        CACHEABLE_API.map(path =>
          fetch(self.location.origin + path)
            .then(res => {
              if (res.ok) {
                return caches.open(API_CACHE).then(cache => cache.put(path, res));
              }
            })
            .catch(() => {})
        )
      )
    );
  }
});

// ── Message handling ──
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  if (event.data && event.data.type === 'FORCE_SYNC') {
    processOfflineQueue();
  }
  if (event.data && event.data.type === 'GET_QUEUE_SIZE') {
    openSyncDB().then(db => {
      const tx = db.transaction('queue', 'readonly');
      const req = tx.objectStore('queue').count();
      req.onsuccess = () => {
        event.source.postMessage({ type: 'QUEUE_SIZE', count: req.result });
      };
    });
  }
});

// Push notifications
self.addEventListener('push', (event) => {
  let data = { title: 'LUCCCA Alert', body: 'New notification', icon: '/icon-192.png' };
  try {
    data = event.data ? event.data.json() : data;
  } catch (e) {
    data.body = event.data ? event.data.text() : data.body;
  }

  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: data.icon || '/icon-192.png',
      badge: '/icon-192.png',
      tag: data.tag || 'luccca-notification',
      data: data.url || '/',
      vibrate: [200, 100, 200],
    })
  );
});

// Notification click: open app
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    self.clients.matchAll({ type: 'window' }).then((clients) => {
      for (const client of clients) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          return client.focus();
        }
      }
      return self.clients.openWindow(event.notification.data || '/');
    })
  );
});

// ── Online event: trigger sync ──
self.addEventListener('online', () => {
  processOfflineQueue();
});
