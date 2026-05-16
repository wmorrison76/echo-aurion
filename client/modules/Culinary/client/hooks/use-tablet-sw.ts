import { useEffect, useState, useCallback } from "react";

export function useTabletServiceWorker() {
  const [swRegistered, setSwRegistered] = useState(false);
  const [swError, setSwError] = useState<Error | null>(null);
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  // Register service worker on mount
  useEffect(() => {
    if (!("serviceWorker" in navigator)) {
      return;
    }

    // Only register for tablet routes
    if (!window.location.pathname.includes("/tablet")) {
      return;
    }

    (async () => {
      try {
        const swPath = "/tablet-sw.js";

        // First, verify the service worker file exists
        const swCheck = await fetch(swPath, { method: "HEAD" });
        if (!swCheck.ok) {
          throw new Error(
            `Service Worker file not found at ${swPath} (HTTP ${swCheck.status})`,
          );
        }

        const registration = await navigator.serviceWorker.register(swPath, {
          scope: "/tablet/",
        });

        console.log("[Tablet SW] Successfully registered:", registration);
        setSwRegistered(true);

        // Check for updates periodically
        const updateInterval = setInterval(
          () => {
            registration.update().catch((error) => {
              console.warn("[Tablet SW] Update check failed:", error);
            });
          },
          60 * 60 * 1000,
        ); // Check every hour

        // Cleanup interval on unmount
        return () => clearInterval(updateInterval);
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        console.error("[Tablet SW] Registration failed:", errorMsg);
        setSwError(error instanceof Error ? error : new Error(errorMsg));
      }
    })();

    // Monitor online/offline status
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  const triggerSync = useCallback(async () => {
    if (!navigator.serviceWorker?.controller) {
      return;
    }

    try {
      if ("sync" in registration) {
        // Use Background Sync API if available
        await (navigator.serviceWorker.ready as any).then((reg: any) =>
          reg.sync.register("sync-print-history"),
        );
      }
    } catch (error) {
      console.error("[Tablet SW] Sync trigger failed:", error);
    }
  }, []);

  const queuePrintOffline = useCallback(
    async (printData: any) => {
      try {
        const db = await openDB();
        await saveToDB(db, "printQueue", {
          id: `print-${Date.now()}`,
          ...printData,
          queuedAt: new Date().toISOString(),
        });

        // Trigger sync if online
        if (isOnline) {
          await triggerSync();
        }
      } catch (error) {
        console.error("[Tablet] Failed to queue print:", error);
        throw error;
      }
    },
    [isOnline, triggerSync],
  );

  return {
    swRegistered,
    swError,
    isOnline,
    triggerSync,
    queuePrintOffline,
  };
}

// IndexedDB helpers
function openDB(): Promise<IDBDatabase> {
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

function saveToDB(
  db: IDBDatabase,
  storeName: string,
  data: any,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, "readwrite");
    const store = transaction.objectStore(storeName);
    const request = store.put(data);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();
  });
}
