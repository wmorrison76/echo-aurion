/// <reference lib="webworker" />
// Very small offline cache for shell + manifest; extend as needed.
const CACHE ="luccca-shell-v1";
const ASSETS = ["/","/manifest.webmanifest"]; declare const self: ServiceWorkerGlobalScope; self.addEventListener("install", (event: ExtendableEvent) => { event.waitUntil( (async () => { const cache = await caches.open(CACHE); await cache.addAll(ASSETS); await self.skipWaiting(); })() );
}); self.addEventListener("activate", (event: ExtendableEvent) => { event.waitUntil(self.clients.claim());
}); self.addEventListener("fetch", (event: FetchEvent) => { const req = event.request; if (req.method !=="GET") return; event.respondWith( (async () => { const hit = await caches.match(req); if (hit) return hit; try { const resp = await fetch(req); // Cache same-origin GETs for offline use if (new URL(req.url).origin === self.location.origin && resp.status === 200) { const copy = resp.clone(); const cache = await caches.open(CACHE); cache.put(req, copy); } return resp; } catch { // Fall back to offline page if available return caches.match("/"); } })() );
});
