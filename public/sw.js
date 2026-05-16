/**
 * Luccca Staff — Web Push service worker (iter199).
 *
 * Receives VAPID-signed Web Push messages from the backend (pywebpush) and
 * displays them as native notifications. Clicking jumps to the link in payload.
 */
self.addEventListener("install", (event) => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("push", (event) => {
  let payload = { title: "Luccca", body: "You have an update.", link: "/" };
  try {
    if (event.data) {
      const parsed = event.data.json();
      payload = { ...payload, ...parsed };
    }
  } catch (_e) {
    try {
      payload.body = event.data.text();
    } catch (_e2) { /* ignore */ }
  }

  const options = {
    body: payload.body,
    icon: "/icons/icon-192.png",
    badge: "/icons/badge-72.png",
    tag: payload.tag || "luccca-default",
    data: { link: payload.link || "/" },
    renotify: false,
  };

  event.waitUntil(
    self.registration.showNotification(payload.title || "Luccca", options)
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const link = (event.notification.data && event.notification.data.link) || "/";
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
      for (const c of clients) {
        if (c.url.includes(link) && "focus" in c) return c.focus();
      }
      if (self.clients.openWindow) return self.clients.openWindow(link);
    })
  );
});
