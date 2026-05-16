/**
 * Feature 13.1: Sync Manager
 * Manages real-time synchronization and change broadcasting
 * Handles pending changes, acknowledgments, and batching
 */

import { RemoteChange, SyncState } from "../types/Phase12Types";
import { v4 as uuidv4 } from "uuid";

interface SyncOptions {
  batchSize?: number;
  batchInterval?: number; // milliseconds
  maxRetries?: number;
  retryDelay?: number;
}

interface SyncListener {
  onRemoteChange: (change: RemoteChange) => void;
  onConflict?: (changeId: string, reason: string) => void;
  onSyncComplete?: () => void;
  onError?: (error: Error) => void;
}

class SyncManager {
  private syncState: SyncState = {
    lastSyncTimestamp: Date.now(),
    pendingChanges: [],
    acknowledgedChanges: new Set(),
    conflictResolutions: new Map(),
  };

  private listeners: SyncListener[] = [];
  private batchTimer: NodeJS.Timeout | null = null;
  private options: Required<SyncOptions>;
  private isSyncing: boolean = false;
  private changeHistory: RemoteChange[] = [];

  constructor(options: SyncOptions = {}) {
    this.options = {
      batchSize: options.batchSize || 50,
      batchInterval: options.batchInterval || 1000,
      maxRetries: options.maxRetries || 3,
      retryDelay: options.retryDelay || 1000,
    };
  }

  /**
   * Record a local change to be synced
   */
  recordChange(change: Omit<RemoteChange, "changeId">): RemoteChange {
    const fullChange: RemoteChange = {
      ...change,
      changeId: uuidv4(),
    };

    this.syncState.pendingChanges.push(fullChange);
    this.changeHistory.push(fullChange);
    this.scheduleBatchSync();

    return fullChange;
  }

  /**
   * Apply a remote change
   */
  applyRemoteChange(change: RemoteChange): boolean {
    // Check if already applied
    if (this.syncState.acknowledgedChanges.has(change.changeId)) {
      return false;
    }

    // Mark as acknowledged
    this.syncState.acknowledgedChanges.add(change.changeId);
    this.syncState.lastSyncTimestamp = Math.max(
      this.syncState.lastSyncTimestamp,
      change.timestamp,
    );

    // Notify listeners
    this.notifyRemoteChange(change);

    return true;
  }

  /**
   * Get pending changes for sync
   */
  getPendingChanges(): RemoteChange[] {
    return [...this.syncState.pendingChanges];
  }

  /**
   * Get pending changes since timestamp
   */
  getPendingChangesSince(timestamp: number): RemoteChange[] {
    return this.syncState.pendingChanges.filter((c) => c.timestamp > timestamp);
  }

  /**
   * Acknowledge changes (after successful sync)
   */
  acknowledgeChanges(changeIds: string[]): void {
    const changeIdSet = new Set(changeIds);

    // Remove acknowledged from pending
    this.syncState.pendingChanges = this.syncState.pendingChanges.filter(
      (c) => !changeIdSet.has(c.changeId),
    );

    // Mark as acknowledged
    changeIds.forEach((id) => this.syncState.acknowledgedChanges.add(id));
  }

  /**
   * Schedule batch sync
   */
  private scheduleBatchSync(): void {
    // If already scheduled, don't schedule again
    if (this.batchTimer) return;

    // Check if batch is full
    if (this.syncState.pendingChanges.length >= this.options.batchSize) {
      this.performSync();
      return;
    }

    // Schedule sync after interval
    this.batchTimer = setTimeout(() => {
      this.batchTimer = null;
      this.performSync();
    }, this.options.batchInterval);
  }

  /**
   * Perform synchronization
   */
  private async performSync(): Promise<void> {
    if (this.isSyncing || this.syncState.pendingChanges.length === 0) {
      return;
    }

    this.isSyncing = true;

    try {
      const changesToSync = [...this.syncState.pendingChanges];

      // Simulate network sync (in real implementation, this would be HTTP/WebSocket)
      await this.simulateNetworkSync(changesToSync);

      // Acknowledge successful sync
      this.acknowledgeChanges(changesToSync.map((c) => c.changeId));
      this.notifySyncComplete();
    } catch (error) {
      this.notifyError(error as Error);
    } finally {
      this.isSyncing = false;
    }
  }

  /**
   * Simulate network sync (placeholder for actual implementation)
   */
  private simulateNetworkSync(changes: RemoteChange[]): Promise<void> {
    return new Promise((resolve, reject) => {
      // In real implementation, this would be:
      // POST /api/whiteboard/sync
      // with changes array
      setTimeout(() => {
        if (Math.random() > 0.1) {
          // 90% success rate for simulation
          resolve();
        } else {
          reject(new Error("Sync failed"));
        }
      }, 100);
    });
  }

  /**
   * Detect conflicts between local and remote changes
   */
  detectConflict(
    localChange: RemoteChange,
    remoteChange: RemoteChange,
  ): boolean {
    // Same element modified by different users at same time
    return (
      localChange.elementId === remoteChange.elementId &&
      localChange.userId !== remoteChange.userId &&
      Math.abs(localChange.timestamp - remoteChange.timestamp) < 1000
    );
  }

  /**
   * Resolve conflict
   */
  resolveConflict(
    changeId: string,
    resolution: "keep-local" | "keep-remote" | "merge",
  ): void {
    this.syncState.conflictResolutions.set(changeId, resolution);
  }

  /**
   * Get sync status
   */
  getSyncStatus() {
    return {
      isSyncing: this.isSyncing,
      pendingChanges: this.syncState.pendingChanges.length,
      acknowledgedChanges: this.syncState.acknowledgedChanges.size,
      lastSyncTimestamp: this.syncState.lastSyncTimestamp,
      conflicts: this.syncState.conflictResolutions.size,
    };
  }

  /**
   * Force immediate sync
   */
  forceSync(): Promise<void> {
    return this.performSync();
  }

  /**
   * Subscribe to sync events
   */
  subscribe(listener: SyncListener): () => void {
    this.listeners.push(listener);

    // Return unsubscribe function
    return () => {
      const index = this.listeners.indexOf(listener);
      if (index > -1) {
        this.listeners.splice(index, 1);
      }
    };
  }

  /**
   * Notify remote change
   */
  private notifyRemoteChange(change: RemoteChange): void {
    for (const listener of this.listeners) {
      try {
        listener.onRemoteChange(change);
      } catch (error) {
        console.error("Error in remote change listener:", error);
      }
    }
  }

  /**
   * Notify sync complete
   */
  private notifySyncComplete(): void {
    for (const listener of this.listeners) {
      if (listener.onSyncComplete) {
        try {
          listener.onSyncComplete();
        } catch (error) {
          console.error("Error in sync complete listener:", error);
        }
      }
    }
  }

  /**
   * Notify error
   */
  private notifyError(error: Error): void {
    for (const listener of this.listeners) {
      if (listener.onError) {
        try {
          listener.onError(error);
        } catch (err) {
          console.error("Error in error listener:", err);
        }
      }
    }
  }

  /**
   * Get change history
   */
  getChangeHistory(limit: number = 100): RemoteChange[] {
    return this.changeHistory.slice(-limit);
  }

  /**
   * Clear sync state
   */
  reset(): void {
    if (this.batchTimer) {
      clearTimeout(this.batchTimer);
      this.batchTimer = null;
    }

    this.syncState.pendingChanges = [];
    this.syncState.acknowledgedChanges.clear();
    this.syncState.conflictResolutions.clear();
    this.syncState.lastSyncTimestamp = Date.now();
    this.changeHistory = [];
  }

  /**
   * Get statistics
   */
  getStats() {
    return {
      totalChanges: this.changeHistory.length,
      pendingChanges: this.syncState.pendingChanges.length,
      acknowledgedChanges: this.syncState.acknowledgedChanges.size,
      conflicts: this.syncState.conflictResolutions.size,
      isSyncing: this.isSyncing,
      lastSyncTimestamp: this.syncState.lastSyncTimestamp,
    };
  }
}

export default SyncManager;
