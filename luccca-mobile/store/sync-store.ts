/**
 * Sync Store
 * Manages offline-to-online synchronization and queue
 */

import { create } from "zustand";
import { devtools } from "zustand/middleware";
import { SyncQueueItem } from "@/lib/database/schema";
import { querySql, executeSql } from "@/lib/database/sqlite";
import { isConnected, post, patch, remove } from "@/lib/api-client";

export interface SyncStatus {
  isSyncing: boolean;
  lastSyncAt: string | null;
  pendingCount: number;
  failedCount: number;
  successCount: number;
}

export interface SyncState {
  // State
  status: SyncStatus;
  isOnline: boolean;
  lastError: string | null;
  syncInProgress: boolean;

  // Actions
  startSync: () => Promise<void>;
  syncEvent: (queueItem: SyncQueueItem) => Promise<boolean>;
  processSyncQueue: () => Promise<void>;
  setOnlineStatus: (isOnline: boolean) => void;
  clearError: () => void;
  getQueueItems: () => Promise<SyncQueueItem[]>;
  retryFailedItems: () => Promise<void>;
}

export const useSyncStore = create<SyncState>()(
  devtools((set, get) => ({
    status: {
      isSyncing: false,
      lastSyncAt: null,
      pendingCount: 0,
      failedCount: 0,
      successCount: 0,
    },
    isOnline: isConnected(),
    lastError: null,
    syncInProgress: false,

    startSync: async () => {
      if (get().status.isSyncing) return;

      set((state) => ({
        status: { ...state.status, isSyncing: true },
        lastError: null,
        syncInProgress: true,
      }));

      try {
        await get().processSyncQueue();

        set((state) => ({
          status: {
            ...state.status,
            isSyncing: false,
            lastSyncAt: new Date().toISOString(),
          },
          syncInProgress: false,
        }));
      } catch (error) {
        set({
          lastError: error instanceof Error ? error.message : "Sync failed",
        });
        set((state) => ({
          status: { ...state.status, isSyncing: false },
          syncInProgress: false,
        }));
        throw error;
      }
    },

    syncEvent: async (queueItem: SyncQueueItem) => {
      try {
        let success = false;

        switch (queueItem.action) {
          case "create":
            try {
              await post("/calendar/events", JSON.parse(queueItem.payload));
              success = true;
            } catch (error) {
              console.error("Create sync failed:", error);
              throw error;
            }
            break;

          case "update":
            try {
              await patch(
                `/calendar/events/${queueItem.event_id}`,
                JSON.parse(queueItem.payload),
              );
              success = true;
            } catch (error) {
              console.error("Update sync failed:", error);
              throw error;
            }
            break;

          case "delete":
            try {
              await remove(`/calendar/events/${queueItem.event_id}`);
              success = true;
            } catch (error) {
              console.error("Delete sync failed:", error);
              throw error;
            }
            break;
        }

        if (success) {
          // Remove from queue
          await executeSql("DELETE FROM sync_queue WHERE id = ?", [
            queueItem.id,
          ]);

          // Mark event as synced
          await executeSql(
            "UPDATE events SET is_synced = 1, synced_at = ? WHERE id = ?",
            [new Date().toISOString(), queueItem.event_id],
          );
        }

        return success;
      } catch (error) {
        // Update attempt count and error
        const attempts = queueItem.attempted + 1;
        const maxAttempts = 3;

        if (attempts >= maxAttempts) {
          // Give up after 3 attempts
          await executeSql(
            "UPDATE sync_queue SET attempted = ?, last_error = ? WHERE id = ?",
            [
              attempts,
              error instanceof Error ? error.message : "Unknown error",
              queueItem.id,
            ],
          );
        } else {
          // Retry later
          await executeSql(
            "UPDATE sync_queue SET attempted = ?, last_error = ? WHERE id = ?",
            [
              attempts,
              error instanceof Error ? error.message : "Unknown error",
              queueItem.id,
            ],
          );
        }

        return false;
      }
    },

    processSyncQueue: async () => {
      if (!get().isOnline) {
        console.log("[Sync] Offline, skipping sync");
        return;
      }

      try {
        const queueItems = await querySql<SyncQueueItem>(
          "SELECT * FROM sync_queue WHERE attempted < 3 ORDER BY created_at ASC",
        );

        if (queueItems.length === 0) {
          return;
        }

        console.log(`[Sync] Processing ${queueItems.length} items`);

        let successCount = 0;
        let failedCount = 0;

        for (const item of queueItems) {
          const success = await get().syncEvent(item);
          if (success) {
            successCount++;
          } else {
            failedCount++;
          }

          // Add small delay between requests
          await new Promise((resolve) => setTimeout(resolve, 100));
        }

        set((state) => ({
          status: {
            ...state.status,
            pendingCount: queueItems.length - successCount,
            failedCount,
            successCount,
          },
        }));

        console.log(
          `[Sync] Complete: ${successCount} successful, ${failedCount} failed`,
        );
      } catch (error) {
        console.error("[Sync] Queue processing failed:", error);
        throw error;
      }
    },

    setOnlineStatus: (isOnline: boolean) => {
      set({ isOnline });

      if (isOnline) {
        console.log("[Sync] Online, starting sync");
        get()
          .startSync()
          .catch((error) => console.error("[Sync] Auto-sync failed:", error));
      } else {
        console.log("[Sync] Offline, deferring sync");
      }
    },

    clearError: () => set({ lastError: null }),

    getQueueItems: async () => {
      try {
        const items = await querySql<SyncQueueItem>(
          "SELECT * FROM sync_queue ORDER BY created_at DESC",
        );
        return items;
      } catch (error) {
        console.error("Failed to get queue items:", error);
        return [];
      }
    },

    retryFailedItems: async () => {
      try {
        await executeSql(
          "UPDATE sync_queue SET attempted = 0, last_error = NULL WHERE attempted >= 3",
        );
        await get().startSync();
      } catch (error) {
        set({
          lastError: error instanceof Error ? error.message : "Retry failed",
        });
        throw error;
      }
    },
  })),
);
