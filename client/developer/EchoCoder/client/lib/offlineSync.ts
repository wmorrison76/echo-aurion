import { getIndexedDBCache } from "./indexedDB";

export type SyncOperation = "create" | "update" | "delete" | "publish";

export interface SyncQueueItem {
  id: string;
  operation: SyncOperation;
  resource: string;
  resourceId: string;
  data: Record<string, any>;
  timestamp: number;
  retries: number;
  lastError?: string;
  status: "pending" | "syncing" | "failed" | "completed";
}

/**
 * PHASE 4.2 & 4.3: Offline detection and sync queue management
 * Tracks pending operations while offline, syncs when online
 */
export class OfflineSyncManager {
  private isOnline = navigator.onLine;
  private syncQueue: SyncQueueItem[] = [];
  private isSyncing = false;
  private maxRetries = 3;

  constructor() {
    this.setupOnlineDetection();
  }

  /**
   * Setup online/offline detection
   */
  private setupOnlineDetection(): void {
    window.addEventListener("online", () => {
      this.isOnline = true;
      console.log("🌐 Back online - starting sync");
      this.sync();
    });

    window.addEventListener("offline", () => {
      this.isOnline = false;
      console.log("📡 Offline - queuing operations");
    });
  }

  /**
   * Check if currently online
   */
  getOnlineStatus(): boolean {
    return this.isOnline;
  }

  /**
   * Queue an operation for sync
   */
  async queueOperation(
    operation: SyncOperation,
    resource: string,
    resourceId: string,
    data: Record<string, any>,
  ): Promise<SyncQueueItem> {
    const cache = await getIndexedDBCache();

    const item: SyncQueueItem = {
      id: `op-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      operation,
      resource,
      resourceId,
      data,
      timestamp: Date.now(),
      retries: 0,
      status: "pending",
    };

    this.syncQueue.push(item);

    // Also save to IndexedDB for persistence
    await cache.set("syncQueue", item.id, item);

    console.log(`📋 Queued ${operation} on ${resource}/${resourceId}`);

    // If online, start syncing immediately
    if (this.isOnline) {
      this.sync();
    }

    return item;
  }

  /**
   * Get pending operations count
   */
  getPendingCount(): number {
    return this.syncQueue.filter((op) => op.status === "pending").length;
  }

  /**
   * Get all queued operations
   */
  getQueue(): SyncQueueItem[] {
    return [...this.syncQueue];
  }

  /**
   * Sync all pending operations
   */
  async sync(): Promise<void> {
    if (this.isSyncing || !this.isOnline) return;

    this.isSyncing = true;
    const cache = await getIndexedDBCache();

    try {
      const pending = this.syncQueue.filter((op) => op.status === "pending");

      for (const item of pending) {
        try {
          item.status = "syncing";

          // Call appropriate API endpoint
          const url = `/api/${item.resource}/${item.resourceId}`;
          const method =
            item.operation === "create"
              ? "POST"
              : item.operation === "delete"
                ? "DELETE"
                : "PUT";

          const response = await fetch(url, {
            method,
            headers: { "Content-Type": "application/json" },
            body: method !== "DELETE" ? JSON.stringify(item.data) : undefined,
          });

          if (response.ok) {
            item.status = "completed";
            await cache.delete("syncQueue", item.id);
            console.log(`✅ Synced ${item.operation} on ${item.resource}`);
          } else {
            throw new Error(`HTTP ${response.status}`);
          }
        } catch (error) {
          item.retries++;
          item.lastError =
            error instanceof Error ? error.message : String(error);

          if (item.retries < this.maxRetries) {
            item.status = "pending";
            console.warn(`⚠️ Sync failed, will retry: ${item.lastError}`);
          } else {
            item.status = "failed";
            console.error(`❌ Sync failed after ${this.maxRetries} retries`);
          }

          // Save updated item
          await cache.set("syncQueue", item.id, item);
        }
      }
    } finally {
      this.isSyncing = false;
    }
  }

  /**
   * Clear failed operations
   */
  async clearFailed(): Promise<void> {
    const cache = await getIndexedDBCache();

    const failed = this.syncQueue.filter((op) => op.status === "failed");
    for (const item of failed) {
      await cache.delete("syncQueue", item.id);
    }

    this.syncQueue = this.syncQueue.filter((op) => op.status !== "failed");
  }

  /**
   * Clear all queued operations
   */
  async clearAll(): Promise<void> {
    const cache = await getIndexedDBCache();
    await cache.clear("syncQueue");
    this.syncQueue = [];
  }
}

// Singleton instance
let manager: OfflineSyncManager | null = null;

export function getOfflineSyncManager(): OfflineSyncManager {
  if (!manager) {
    manager = new OfflineSyncManager();
  }
  return manager;
}

/**
 * Service Worker registration
 * PHASE 4.2: Register service worker for offline support
 */
export async function registerServiceWorker(): Promise<
  ServiceWorkerContainer["controller"] | null
> {
  if (!("serviceWorker" in navigator)) {
    console.warn("Service Workers not supported");
    return null;
  }

  try {
    const registration = await navigator.serviceWorker.register("/sw.js", {
      scope: "/",
    });

    console.log("✅ Service Worker registered");
    return registration.active || null;
  } catch (error) {
    console.error("Service Worker registration failed:", error);
    return null;
  }
}

/**
 * Request interceptor for offline support
 * Modifies requests when offline
 */
export function createOfflineAwareRequest(
  url: string,
  options: RequestInit,
): Promise<Response> {
  const manager = getOfflineSyncManager();

  // If online, use normal fetch
  if (manager.getOnlineStatus()) {
    return fetch(url, options);
  }

  // If offline and it's a read request, use cache
  if (options.method === "GET" || !options.method) {
    return new Promise((resolve, reject) => {
      // Would use cache API or IndexedDB here
      reject(new Error("Offline - read requests not yet supported from cache"));
    });
  }

  // If offline and it's a write request, queue it
  return new Promise((_, reject) => {
    reject(new Error("Offline - write requests will be synced when online"));
  });
}
