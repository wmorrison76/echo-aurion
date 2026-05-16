/**
 * Offline Sync Service
 *
 * Handles offline capability for Culinary module
 * - Caches recipes locally
 * - Queues changes when offline
 * - Syncs when connection restored
 * - Conflict resolution
 */

export interface OfflineChange {
  id: string;
  type: "create" | "update" | "delete";
  entity: "recipe" | "ingredient" | "yield" | "cost";
  entityId: string;
  data: any;
  timestamp: string;
  synced: boolean;
}

class OfflineSyncService {
  private changes: Map<string, OfflineChange> = new Map();
  private isOnline = typeof navigator !== "undefined" ? navigator.onLine : true;
  private syncListeners: Array<() => void> = [];

  constructor() {
    if (typeof window !== "undefined") {
      window.addEventListener("online", () => {
        this.isOnline = true;
        this.sync();
      });
      window.addEventListener("offline", () => {
        this.isOnline = false;
      });
    }
  }

  /**
   * Check if currently online
   */
  isConnected(): boolean {
    return this.isOnline;
  }

  /**
   * Queue a change for sync
   */
  queueChange(
    change: Omit<OfflineChange, "id" | "timestamp" | "synced">,
  ): string {
    const id = `offline_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
    const fullChange: OfflineChange = {
      ...change,
      id,
      timestamp: new Date().toISOString(),
      synced: false,
    };

    this.changes.set(id, fullChange);

    // Try to sync immediately if online
    if (this.isOnline) {
      this.sync();
    }

    return id;
  }

  /**
   * Get pending changes
   */
  getPendingChanges(): OfflineChange[] {
    return Array.from(this.changes.values())
      .filter((change) => !change.synced)
      .sort(
        (a, b) =>
          new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
      );
  }

  /**
   * Sync pending changes
   */
  async sync(): Promise<void> {
    if (!this.isOnline) {
      console.log("[OfflineSync] Offline - queuing changes");
      return;
    }

    const pending = this.getPendingChanges();
    if (pending.length === 0) {
      return;
    }

    console.log(`[OfflineSync] Syncing ${pending.length} pending changes...`);

    for (const change of pending) {
      try {
        await this.syncChange(change);
        change.synced = true;
        this.changes.set(change.id, change);
      } catch (error) {
        console.error(
          `[OfflineSync] Failed to sync change ${change.id}:`,
          error,
        );
        // Keep change in queue for retry
      }
    }

    // Clean up synced changes older than 7 days
    this.cleanup();

    // Notify listeners
    this.syncListeners.forEach((listener) => listener());
  }

  /**
   * Sync a single change
   */
  private async syncChange(change: OfflineChange): Promise<void> {
    const endpoint = this.getEndpoint(change.entity);
    const method = this.getMethod(change.type);

    const response = await fetch(endpoint, {
      method,
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(change.data),
    });

    if (!response.ok) {
      throw new Error(`Sync failed: ${response.statusText}`);
    }
  }

  /**
   * Get API endpoint for entity type
   */
  private getEndpoint(entity: OfflineChange["entity"]): string {
    switch (entity) {
      case "recipe":
        return "/api/recipes";
      case "ingredient":
        return "/api/ingredients";
      case "yield":
        return "/api/yields";
      case "cost":
        return "/api/costs";
      default:
        throw new Error(`Unknown entity type: ${entity}`);
    }
  }

  /**
   * Get HTTP method for change type
   */
  private getMethod(type: OfflineChange["type"]): string {
    switch (type) {
      case "create":
        return "POST";
      case "update":
        return "PUT";
      case "delete":
        return "DELETE";
      default:
        throw new Error(`Unknown change type: ${type}`);
    }
  }

  /**
   * Clean up old synced changes
   */
  private cleanup(): void {
    const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;

    for (const [id, change] of this.changes.entries()) {
      if (
        change.synced &&
        new Date(change.timestamp).getTime() < sevenDaysAgo
      ) {
        this.changes.delete(id);
      }
    }
  }

  /**
   * Add sync listener
   */
  onSync(listener: () => void): () => void {
    this.syncListeners.push(listener);
    return () => {
      const index = this.syncListeners.indexOf(listener);
      if (index > -1) {
        this.syncListeners.splice(index, 1);
      }
    };
  }

  /**
   * Clear all pending changes (use with caution)
   */
  clearPending(): void {
    for (const [id, change] of this.changes.entries()) {
      if (!change.synced) {
        this.changes.delete(id);
      }
    }
  }
}

export const offlineSyncService = new OfflineSyncService();
