/** * Phase 13: Real-Time Sync Engine * Manages synchronization of changes across multiple clients */ import {
  RemoteChange,
  SyncMessage,
  ConflictDetectionResult,
  OperationalTransform,
} from "./types/CollaborationTypes";
import { v4 as uuidv4 } from "uuid";
class RealtimeSyncEngine {
  private sessionId: string;
  private userId: string;
  private clientVersion: number = 0;
  private serverVersion: number = 0;
  private pendingChanges: RemoteChange[] = [];
  private appliedChanges: Map<string, RemoteChange> = new Map();
  private conflictResolutions: Map<string, RemoteChange> = new Map();
  private messageQueue: SyncMessage[] = [];
  private syncListeners: Set<(change: RemoteChange) => void> = new Set();
  private errorListeners: Set<(error: Error) => void> = new Set();
  private isSyncing: boolean = false;
  private lastSyncTime: number = Date.now();
  private syncInterval: NodeJS.Timeout | null = null;
  private BATCH_SIZE = 50;
  private SYNC_INTERVAL = 2000;
  constructor(sessionId: string, userId: string) {
    this.sessionId = sessionId;
    this.userId = userId;
  }
  /** * Initialize sync engine */ initialize(): void {
    this.startPeriodicSync();
  }
  /** * Add local change to pending queue */ addLocalChange(
    change: Omit<RemoteChange, "changeId" | "lamportClock" | "sessionId">,
  ): RemoteChange {
    const remoteChange: RemoteChange = {
      ...change,
      changeId: uuidv4(),
      lamportClock: this.clientVersion++,
      sessionId: this.sessionId,
    };
    this.pendingChanges.push(remoteChange);
    return remoteChange;
  }
  /** * Apply remote change */ applyRemoteChange(
    change: RemoteChange,
  ): ConflictDetectionResult {
    this.serverVersion = Math.max(this.serverVersion, change.lamportClock);
    const existingChange = this.appliedChanges.get(change.elementId);
    if (existingChange) {
      const conflict = this.detectConflict(existingChange, change);
      if (conflict.hasConflict) {
        const resolution = this.resolveConflict(existingChange, change);
        this.conflictResolutions.set(change.elementId, resolution);
        this.emitSyncEvent(resolution);
        return conflict;
      }
    }
    this.appliedChanges.set(change.elementId, change);
    this.emitSyncEvent(change);
    return { hasConflict: false };
  }
  /** * Detect conflict between changes */ private detectConflict(
    change1: RemoteChange,
    change2: RemoteChange,
  ): ConflictDetectionResult {
    if (change1.elementId !== change2.elementId) {
      return { hasConflict: false };
    }
    const isEditEdit = change1.type !== "delete" && change2.type !== "delete";
    const isEditDelete =
      (change1.type === "delete" && change2.type !== "delete") ||
      (change1.type !== "delete" && change2.type === "delete");
    const isDeleteDelete =
      change1.type === "delete" && change2.type === "delete";
    if (isEditEdit) {
      return {
        hasConflict: true,
        conflictType: "edit-edit",
        affectedElementId: change1.elementId,
        resolution: "lww",
      };
    }
    if (isEditDelete) {
      return {
        hasConflict: true,
        conflictType: "edit-delete",
        affectedElementId: change1.elementId,
        resolution:
          change1.lamportClock > change2.lamportClock
            ? "keep-local"
            : "keep-remote",
      };
    }
    if (isDeleteDelete) {
      return {
        hasConflict: true,
        conflictType: "delete-delete",
        affectedElementId: change1.elementId,
        resolution: "merge",
      };
    }
    return { hasConflict: false };
  }
  /** * Resolve conflict using Last-Write-Wins */ private resolveConflict(
    change1: RemoteChange,
    change2: RemoteChange,
  ): RemoteChange {
    if (change1.lamportClock > change2.lamportClock) {
      return change1;
    }
    if (change2.lamportClock > change1.lamportClock) {
      return change2;
    }
    return change1.timestamp > change2.timestamp ? change1 : change2;
  }
  /** * Get pending changes for sync */ getPendingChanges(
    limit: number = this.BATCH_SIZE,
  ): RemoteChange[] {
    return this.pendingChanges.splice(0, limit);
  }
  /** * Acknowledge changes */ acknowledgeChanges(changeIds: string[]): void {
    changeIds.forEach((changeId) => {
      this.pendingChanges = this.pendingChanges.filter(
        (c) => c.changeId !== changeId,
      );
    });
  }
  /** * Get pending changes count */ getPendingChangeCount(): number {
    return this.pendingChanges.length;
  }
  /** * Sync pending changes */ async syncPendingChanges(): Promise<
    RemoteChange[]
  > {
    if (this.isSyncing || this.pendingChanges.length === 0) {
      return [];
    }
    this.isSyncing = true;
    this.lastSyncTime = Date.now();
    try {
      const changes = this.getPendingChanges();
      return changes;
    } finally {
      this.isSyncing = false;
    }
  }
  /** * Subscribe to sync events */ subscribe(
    callback: (change: RemoteChange) => void,
  ): () => void {
    this.syncListeners.add(callback);
    return () => {
      this.syncListeners.delete(callback);
    };
  }
  /** * Subscribe to errors */ onError(
    callback: (error: Error) => void,
  ): () => void {
    this.errorListeners.add(callback);
    return () => {
      this.errorListeners.delete(callback);
    };
  }
  /** * Emit sync event */ private emitSyncEvent(change: RemoteChange): void {
    this.syncListeners.forEach((listener) => {
      listener(change);
    });
  }
  /** * Emit error event */ private emitErrorEvent(error: Error): void {
    this.errorListeners.forEach((listener) => {
      listener(error);
    });
  }
  /** * Start periodic sync */ private startPeriodicSync(): void {
    if (this.syncInterval) clearInterval(this.syncInterval);
    this.syncInterval = setInterval(async () => {
      try {
        await this.syncPendingChanges();
      } catch (error) {
        this.emitErrorEvent(
          error instanceof Error ? error : new Error("Sync failed"),
        );
      }
    }, this.SYNC_INTERVAL);
  }
  /** * Transform operations (OT) */ transformOperation(
    op1: OperationalTransform,
    op2: OperationalTransform,
  ): OperationalTransform {
    const transformed: OperationalTransform = {
      ...op1,
      priority: Math.max(op1.priority, op2.priority),
    };
    if (op1.operation.type === "insert" && op2.operation.type === "insert") {
      if (op1.operation.position === op2.operation.position) {
        if (op1.clientId > op2.clientId) {
          transformed.operation.position += 1;
        }
      } else if (op1.operation.position > op2.operation.position) {
        transformed.operation.position += 1;
      }
    }
    return transformed;
  }
  /** * Get sync status */ getSyncStatus(): {
    isSyncing: boolean;
    pendingChanges: number;
    clientVersion: number;
    serverVersion: number;
    lastSyncTime: number;
  } {
    return {
      isSyncing: this.isSyncing,
      pendingChanges: this.pendingChanges.length,
      clientVersion: this.clientVersion,
      serverVersion: this.serverVersion,
      lastSyncTime: this.lastSyncTime,
    };
  }
  /** * Clear all pending changes */ clearPendingChanges(): void {
    this.pendingChanges = [];
  }
  /** * Get conflict map */ getConflicts(): Map<string, RemoteChange> {
    return new Map(this.conflictResolutions);
  }
  /** * Clear conflicts */ clearConflicts(): void {
    this.conflictResolutions.clear();
  }
  /** * Destroy sync engine */ destroy(): void {
    if (this.syncInterval) clearInterval(this.syncInterval);
    this.syncListeners.clear();
    this.errorListeners.clear();
    this.pendingChanges = [];
    this.appliedChanges.clear();
    this.conflictResolutions.clear();
  }
  /** * Reset version numbers */ resetVersions(): void {
    this.clientVersion = 0;
    this.serverVersion = 0;
  }
  /** * Get change history */ getChangeHistory(): RemoteChange[] {
    return Array.from(this.appliedChanges.values());
  }
}
export default RealtimeSyncEngine;
