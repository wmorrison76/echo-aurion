/**
 * Cloud Persistence for Whiteboard
 * Handles Supabase backup, sync, and recovery
 * Falls back to localStorage if Supabase unavailable
 */

import { CanvasState, WhiteboardSession } from "./types";
import { supabaseConfig } from "@/lib/supabase";
import { v4 as uuidv4 } from "uuid";

export interface CloudBackup {
  backupId: string;
  sessionId: string;
  canvasState: CanvasState;
  backedUpAt: number;
  size: number;
  isAutomatic: boolean;
}

export interface SyncStatus {
  lastSync?: number;
  pending: number;
  failed: number;
  isOnline: boolean;
}

class CloudPersistence {
  private static syncInterval = 30000; // 30 seconds
  private static syncTimer: NodeJS.Timeout | null = null;
  private static pendingChanges: Map<string, CanvasState> = new Map();
  private static syncStatus: SyncStatus = {
    pending: 0,
    failed: 0,
    isOnline: navigator.onLine,
  };

  /**
   * Initialize cloud persistence
   */
  static initialize(): void {
    // Listen for online/offline changes
    window.addEventListener("online", () => {
      this.syncStatus.isOnline = true;
      console.log("[CloudPersistence] Online - syncing pending changes");
      this.syncPendingChanges();
    });

    window.addEventListener("offline", () => {
      this.syncStatus.isOnline = false;
      console.log("[CloudPersistence] Offline - queuing changes");
    });

    // Start auto-sync
    this.startAutoSync();
  }

  /**
   * Backup session to cloud
   */
  static async backupSession(
    sessionId: string,
    canvasState: CanvasState,
    isAutomatic: boolean = false
  ): Promise<CloudBackup | null> {
    if (!supabaseConfig.isConfigured || (typeof navigator !== "undefined" && navigator.onLine === false)) {
      // Fallback to localStorage
      return this.backupSessionLocally(sessionId, canvasState, isAutomatic);
    }

    try {
      const backup: CloudBackup = {
        backupId: uuidv4(),
        sessionId,
        canvasState,
        backedUpAt: Date.now(),
        size: JSON.stringify(canvasState).length,
        isAutomatic,
      };

      // Try to save to Supabase
      if (!supabaseConfig.client) {
        throw new Error("Supabase client not initialized");
      }

      const { data, error } = await supabaseConfig.client
        .from("whiteboard_backups")
        .insert([
          {
            backup_id: backup.backupId,
            session_id: sessionId,
            canvas_state: canvasState,
            backed_up_at: new Date(backup.backedUpAt),
            size: backup.size,
            is_automatic: isAutomatic,
          },
        ]);

      if (error) {
        console.debug(
          "[CloudPersistence] Supabase backup failed:",
          error
        );
        // Fallback to localStorage
        return this.backupSessionLocally(sessionId, canvasState, isAutomatic);
      }

      this.syncStatus.lastSync = Date.now();
      console.log("[CloudPersistence] Session backed up to cloud:", sessionId);
      return backup;
    } catch (error) {
      console.debug("[CloudPersistence] Backup failed:", error);
      // Fallback
      return this.backupSessionLocally(sessionId, canvasState, isAutomatic);
    }
  }

  /**
   * Restore session from cloud
   */
  static async restoreSession(
    sessionId: string
  ): Promise<CanvasState | null> {
    if (!supabaseConfig.isConfigured || (typeof navigator !== "undefined" && navigator.onLine === false)) {
      return this.restoreSessionLocally(sessionId);
    }

    try {
      if (!supabaseConfig.client) {
        throw new Error("Supabase client not initialized");
      }

      const { data, error } = await supabaseConfig.client
        .from("whiteboard_backups")
        .select("*")
        .eq("session_id", sessionId)
        .order("backed_up_at", { ascending: false })
        .limit(1);

      if (error || !data || data.length === 0) {
        console.debug(
          "[CloudPersistence] No cloud backup found, trying localStorage"
        );
        return this.restoreSessionLocally(sessionId);
      }

      const backup = data[0];
      console.log("[CloudPersistence] Session restored from cloud:", sessionId);
      return backup.canvas_state;
    } catch (error) {
      console.debug("[CloudPersistence] Restore failed:", error);
      return this.restoreSessionLocally(sessionId);
    }
  }

  /**
   * Queue change for sync
   */
  static queueChange(sessionId: string, canvasState: CanvasState): void {
    this.pendingChanges.set(sessionId, canvasState);
    this.syncStatus.pending = this.pendingChanges.size;
  }

  /**
   * Sync pending changes to cloud
   */
  private static async syncPendingChanges(): Promise<void> {
    if (!this.syncStatus.isOnline || this.pendingChanges.size === 0) {
      return;
    }

    try {
      for (const [sessionId, canvasState] of this.pendingChanges) {
        const result = await this.backupSession(sessionId, canvasState, false);
        if (result) {
          this.pendingChanges.delete(sessionId);
        } else {
          this.syncStatus.failed++;
        }
      }

      this.syncStatus.pending = this.pendingChanges.size;
      console.log(
        "[CloudPersistence] Sync complete. Pending:",
        this.syncStatus.pending
      );
    } catch (error) {
      console.debug("[CloudPersistence] Sync failed:", error);
      this.syncStatus.failed++;
    }
  }

  /**
   * Start automatic sync
   */
  private static startAutoSync(): void {
    this.syncTimer = setInterval(() => {
      this.syncPendingChanges();
    }, this.syncInterval);

    console.log("[CloudPersistence] Auto-sync started");
  }

  /**
   * Stop automatic sync
   */
  static stopAutoSync(): void {
    if (this.syncTimer) {
      clearInterval(this.syncTimer);
      this.syncTimer = null;
      console.log("[CloudPersistence] Auto-sync stopped");
    }
  }

  /**
   * Get backup history
   */
  static async getBackupHistory(
    sessionId: string,
    limit: number = 10
  ): Promise<CloudBackup[]> {
    if (!supabaseConfig.isConfigured || (typeof navigator !== "undefined" && navigator.onLine === false)) {
      return this.getBackupHistoryLocally(sessionId, limit);
    }

    try {
      if (!supabaseConfig.client) {
        throw new Error("Supabase client not initialized");
      }

      const { data, error } = await supabaseConfig.client
        .from("whiteboard_backups")
        .select("*")
        .eq("session_id", sessionId)
        .order("backed_up_at", { ascending: false })
        .limit(limit);

      if (error || !data) {
        return this.getBackupHistoryLocally(sessionId, limit);
      }

      return data.map((b: any) => ({
        backupId: b.backup_id,
        sessionId: b.session_id,
        canvasState: b.canvas_state,
        backedUpAt: new Date(b.backed_up_at).getTime(),
        size: b.size,
        isAutomatic: b.is_automatic,
      }));
    } catch (error) {
      console.debug("[CloudPersistence] Get history failed:", error);
      return this.getBackupHistoryLocally(sessionId, limit);
    }
  }

  /**
   * Delete old backups (cleanup)
   */
  static async cleanupOldBackups(
    sessionId: string,
    keepDays: number = 30
  ): Promise<boolean> {
    if (!supabaseConfig.isConfigured || (typeof navigator !== "undefined" && navigator.onLine === false)) {
      return true;
    }

    try {
      if (!supabaseConfig.client) {
        return false;
      }

      const cutoffDate = new Date(Date.now() - keepDays * 24 * 60 * 60 * 1000);

      const { error } = await supabaseConfig.client
        .from("whiteboard_backups")
        .delete()
        .eq("session_id", sessionId)
        .lt("backed_up_at", cutoffDate.toISOString());

      if (error) {
        console.debug("[CloudPersistence] Cleanup failed:", error);
        return false;
      }

      console.log("[CloudPersistence] Cleaned up old backups:", sessionId);
      return true;
    } catch (error) {
      console.debug("[CloudPersistence] Cleanup error:", error);
      return false;
    }
  }

  /**
   * Get sync status
   */
  static getSyncStatus(): SyncStatus {
    return { ...this.syncStatus };
  }

  // ===== Local Fallback Methods =====

  private static backupSessionLocally(
    sessionId: string,
    canvasState: CanvasState,
    isAutomatic: boolean
  ): CloudBackup {
    const backup: CloudBackup = {
      backupId: uuidv4(),
      sessionId,
      canvasState,
      backedUpAt: Date.now(),
      size: JSON.stringify(canvasState).length,
      isAutomatic,
    };

    try {
      const history = JSON.parse(
        localStorage.getItem(`echo:whiteboard:backups:${sessionId}`) || "[]"
      );
      history.unshift(backup);

      // Keep last 50 backups
      const trimmed = history.slice(0, 50);
      localStorage.setItem(
        `echo:whiteboard:backups:${sessionId}`,
        JSON.stringify(trimmed)
      );
    } catch (error) {
      console.debug("[CloudPersistence] Local backup failed:", error);
    }

    return backup;
  }

  private static restoreSessionLocally(
    sessionId: string
  ): CanvasState | null {
    try {
      const history = JSON.parse(
        localStorage.getItem(`echo:whiteboard:backups:${sessionId}`) || "[]"
      );

      if (history.length === 0) {
        return null;
      }

      return history[0].canvasState;
    } catch (error) {
      console.debug("[CloudPersistence] Local restore failed:", error);
      return null;
    }
  }

  private static getBackupHistoryLocally(
    sessionId: string,
    limit: number
  ): CloudBackup[] {
    try {
      const history = JSON.parse(
        localStorage.getItem(`echo:whiteboard:backups:${sessionId}`) || "[]"
      );
      return history.slice(0, limit);
    } catch {
      return [];
    }
  }
}

// Initialize on module load
CloudPersistence.initialize();

export default CloudPersistence;
