/** * Register service worker for PWA offline support */
export function registerSW() {
  if ("serviceWorker" in navigator) {
    window.addEventListener("load", () => {
      navigator.serviceWorker
        .register("/client/sw/service-worker.js")
        .then((reg) => {
          console.log("Service Worker registered:", reg);
        })
        .catch((err) => {
          console.log("Service Worker registration failed:", err);
        });
    });
  }
}
