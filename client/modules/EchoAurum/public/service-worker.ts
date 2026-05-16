/// <reference lib="webworker" /> declare const self: ServiceWorkerGlobalScope; const CACHE_NAME ="aurum-v1";
const CACHE_URLS = ["/", "/index.html", "/manifest.json", "/placeholder.svg"]; // Install event
self.addEventListener("install", (event: ExtendableEvent) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(CACHE_URLS);
    }),
  );
  self.skipWaiting();
}); // Activate event
self.addEventListener("activate", (event: ExtendableEvent) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        }),
      );
    }),
  );
  self.clients.claim();
}); // Fetch event - network first, fallback to cache
self.addEventListener("fetch", (event: FetchEvent) => {
  const { request } = event; // Skip non-GET requests if (request.method !=="GET") { return; } // Skip API requests (they'll use cache strategies in the app) if (request.url.includes("/api/")) { event.respondWith( fetch(request) .then((response) => { return response; }) .catch(() => { // Return offline response return new Response( JSON.stringify({ error:"Offline - API unavailable", offline: true, }), { status: 503, statusText:"Service Unavailable", headers: new Headers({"Content-Type":"application/json", }), }, ); }), ); return; } // Network first strategy for HTML/JS/CSS event.respondWith( fetch(request) .then((response) => { if (!response || response.status !== 200 || response.type ==="error") { return response; } const responseToCache = response.clone(); caches.open(CACHE_NAME).then((cache) => { cache.put(request, responseToCache); }); return response; }) .catch(() => { // Fallback to cache return caches.match(request).then((cached) => { if (cached) { return cached; } // Return offline page if available return caches.match("/index.html").then((offlinePage) => { return ( offlinePage || new Response("Offline - Page not cached", { status: 503, statusText:"Service Unavailable", }) ); }); }); }), );
}); // Message handler for cache updates
self.addEventListener("message", (event: ExtendableMessageEvent) => {
  if (event.data && event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
  if (event.data && event.data.type === "CLEAR_CACHE") {
    caches.delete(CACHE_NAME);
  }
  if (event.data && event.data.type === "CACHE_URLS") {
    const urls = event.data.urls || [];
    caches.open(CACHE_NAME).then((cache) => {
      cache.addAll(urls);
    });
  }
});
export {};
