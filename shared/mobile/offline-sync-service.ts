/**
 * Offline Sync Service
 * Enables offline-first architecture with conflict resolution
 * 
 * Features:
 * - IndexedDB storage layer
 * - Conflict resolution strategy
 * - Sync model for offline changes
 * - Progressive Web App (PWA) support
 */

import { logger } from "../../server/lib/logger";

/**
 * Offline Sync Types
 */
export interface OfflineChange {
  id: string;
  table: string;
  operation: "INSERT" | "UPDATE" | "DELETE";
  data: Record<string, any>;
  timestamp: string;
  synced: boolean;
  conflictResolution?: "server" | "client" | "merge" | "manual";
}

export interface ConflictResolution {
  changeId: string;
  resolution: "server" | "client" | "merge";
  mergedData?: Record<string, any>;
  resolvedAt: string;
}

/**
 * Offline Sync Service
 */
export class OfflineSyncService {
  private db: IDBDatabase | null = null;
  private readonly DB_NAME = "lucca_offline";
  private readonly DB_VERSION = 1;

  /**
   * Initialize IndexedDB
   */
  async initialize(): Promise<boolean> {
    return new Promise((resolve, reject) => {
      if (typeof window === "undefined" || !window.indexedDB) {
        logger.warn("[OfflineSync] IndexedDB not available");
        resolve(false);
        return;
      }

      const request = indexedDB.open(this.DB_NAME, this.DB_VERSION);

      request.onerror = () => {
        logger.error("[OfflineSync] Failed to open IndexedDB", { error: request.error });
        reject(request.error);
      };

      request.onsuccess = () => {
        this.db = request.result;
        logger.info("[OfflineSync] IndexedDB initialized");
        resolve(true);
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // Create object stores
        if (!db.objectStoreNames.contains("offline_changes")) {
          const changesStore = db.createObjectStore("offline_changes", { keyPath: "id" });
          changesStore.createIndex("timestamp", "timestamp", { unique: false });
          changesStore.createIndex("synced", "synced", { unique: false });
          changesStore.createIndex("table", "table", { unique: false });
        }

        if (!db.objectStoreNames.contains("conflict_resolutions")) {
          db.createObjectStore("conflict_resolutions", { keyPath: "changeId" });
        }

        if (!db.objectStoreNames.contains("sync_state")) {
          db.createObjectStore("sync_state", { keyPath: "key" });
        }
      };
    });
  }

  /**
   * Store offline change
   */
  async storeChange(change: OfflineChange): Promise<void> {
    if (!this.db) {
      await this.initialize();
    }

    if (!this.db) {
      throw new Error("IndexedDB not available");
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(["offline_changes"], "readwrite");
      const store = transaction.objectStore("offline_changes");

      const request = store.put(change);

      request.onsuccess = () => {
        logger.debug("[OfflineSync] Change stored", { changeId: change.id });
        resolve();
      };

      request.onerror = () => {
        logger.error("[OfflineSync] Failed to store change", { error: request.error });
        reject(request.error);
      };
    });
  }

  /**
   * Get pending changes
   */
  async getPendingChanges(): Promise<OfflineChange[]> {
    if (!this.db) {
      await this.initialize();
    }

    if (!this.db) {
      return [];
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(["offline_changes"], "readonly");
      const store = transaction.objectStore("offline_changes");
      const index = store.index("synced");

      const request = index.getAll(false);

      request.onsuccess = () => {
        resolve(request.result || []);
      };

      request.onerror = () => {
        logger.error("[OfflineSync] Failed to get pending changes", { error: request.error });
        reject(request.error);
      };
    });
  }

  /**
   * Sync changes with server
   */
  async syncChanges(apiEndpoint: string): Promise<{ synced: number; conflicts: number; errors: number }> {
    const pendingChanges = await this.getPendingChanges();
    let synced = 0;
    let conflicts = 0;
    let errors = 0;

    for (const change of pendingChanges) {
      try {
        const response = await fetch(apiEndpoint, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(change),
        });

        if (response.status === 409) {
          // Conflict detected
          const serverData = await response.json();
          const resolution = await this.resolveConflict(change, serverData);
          conflicts++;

          if (resolution) {
            // Retry with resolved data
            const retryResponse = await fetch(apiEndpoint, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                ...change,
                data: resolution.mergedData || change.data,
              }),
            });

            if (retryResponse.ok) {
              await this.markAsSynced(change.id);
              synced++;
            } else {
              errors++;
            }
          }
        } else if (response.ok) {
          await this.markAsSynced(change.id);
          synced++;
        } else {
          errors++;
        }
      } catch (error) {
        logger.error("[OfflineSync] Failed to sync change", { error, changeId: change.id });
        errors++;
      }
    }

    return { synced, conflicts, errors };
  }

  /**
   * Resolve conflict
   */
  private async resolveConflict(
    clientChange: OfflineChange,
    serverData: Record<string, any>,
  ): Promise<ConflictResolution | null> {
    // Use conflict resolution strategy
    const strategy = clientChange.conflictResolution || "server"; // Default: server wins

    switch (strategy) {
      case "server":
        // Server wins - discard client change
        return {
          changeId: clientChange.id,
          resolution: "server",
          resolvedAt: new Date().toISOString(),
        };

      case "client":
        // Client wins - use client data
        return {
          changeId: clientChange.id,
          resolution: "client",
          resolvedAt: new Date().toISOString(),
        };

      case "merge":
        // Merge strategy - combine both (simplified)
        const mergedData = { ...serverData, ...clientChange.data };
        return {
          changeId: clientChange.id,
          resolution: "merge",
          mergedData,
          resolvedAt: new Date().toISOString(),
        };

      case "manual":
        // Manual resolution required
        logger.warn("[OfflineSync] Manual conflict resolution required", {
          changeId: clientChange.id,
        });
        return null;

      default:
        return null;
    }
  }

  /**
   * Mark change as synced
   */
  private async markAsSynced(changeId: string): Promise<void> {
    if (!this.db) return;

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(["offline_changes"], "readwrite");
      const store = transaction.objectStore("offline_changes");

      const getRequest = store.get(changeId);

      getRequest.onsuccess = () => {
        const change = getRequest.result;
        if (change) {
          change.synced = true;
          const updateRequest = store.put(change);

          updateRequest.onsuccess = () => {
            resolve();
          };

          updateRequest.onerror = () => {
            reject(updateRequest.error);
          };
        } else {
          resolve();
        }
      };

      getRequest.onerror = () => {
        reject(getRequest.error);
      };
    });
  }

  /**
   * Get sync state
   */
  async getSyncState(): Promise<{ lastSync: string | null; pendingChanges: number }> {
    const pendingChanges = await this.getPendingChanges();

    if (!this.db) {
      return { lastSync: null, pendingChanges: pendingChanges.length };
    }

    return new Promise((resolve) => {
      const transaction = this.db!.transaction(["sync_state"], "readonly");
      const store = transaction.objectStore("sync_state");

      const request = store.get("lastSync");

      request.onsuccess = () => {
        const state = request.result;
        resolve({
          lastSync: state?.value || null,
          pendingChanges: pendingChanges.length,
        });
      };

      request.onerror = () => {
        resolve({ lastSync: null, pendingChanges: pendingChanges.length });
      };
    });
  }

  /**
   * Update last sync time
   */
  async updateLastSync(): Promise<void> {
    if (!this.db) return;

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(["sync_state"], "readwrite");
      const store = transaction.objectStore("sync_state");

      const request = store.put({
        key: "lastSync",
        value: new Date().toISOString(),
      });

      request.onsuccess = () => {
        resolve();
      };

      request.onerror = () => {
        reject(request.error);
      };
    });
  }
}

// Export singleton instance
export const offlineSyncService = new OfflineSyncService();
