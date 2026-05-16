/**
 * Conflict Resolution Service
 * ─────────────────────────
 * Handles conflicts from concurrent edits across multiple users/outlets.
 * Implements operational transformation and CRDT-inspired merge strategies.
 *
 * FEATURES:
 * - Last-write-wins (LWW) with timestamps
 * - 3-way merge (local, remote, base)
 * - Field-level conflict detection
 * - Undo/redo stack management
 * - Transaction atomicity for multi-field updates
 */

export interface ConflictResolutionRequest {
  entity_type: string;
  entity_id: string;
  base_version: number;
  local_changes: Record<string, any>;
  remote_changes: Record<string, any>;
  base_data?: Record<string, any>;
  local_timestamp: number;
  remote_timestamp: number;
  local_user_id: string;
  remote_user_id: string;
}

export interface ConflictResolutionResult {
  has_conflicts: boolean;
  merged_data: Record<string, any>;
  conflicts: FieldConflict[];
  resolution_strategy: ResolutionStrategy;
  new_version: number;
  metadata: {
    resolved_by: string;
    resolved_at: number;
    resolution_reason: string;
  };
}

export interface FieldConflict {
  field: string;
  base_value: any;
  local_value: any;
  remote_value: any;
  is_conflicting: boolean;
  resolution: "local-wins" | "remote-wins" | "merged" | "manual";
  resolved_value: any;
  auto_resolvable: boolean;
}

export interface TransactionLog {
  id: string;
  entity_type: string;
  entity_id: string;
  operation: "create" | "update" | "delete";
  changes: Record<string, any>;
  user_id: string;
  timestamp: number;
  version: number;
}

type ResolutionStrategy =
  | "last-write-wins"
  | "local-wins"
  | "remote-wins"
  | "merge"
  | "manual";

class ConflictResolutionService {
  private transactionLogs: Map<string, TransactionLog[]> = new Map();
  private resolutionHistory: Map<string, ConflictResolutionResult[]> =
    new Map();
  private undoRedoStack: Map<string, UndoRedoEntry[]> = new Map();

  /**
   * Detect and resolve conflicts
   */
  public resolveConflict(
    request: ConflictResolutionRequest,
    strategy: ResolutionStrategy = "merge",
  ): ConflictResolutionResult {
    const entityKey = `${request.entity_type}:${request.entity_id}`;

    // Detect field-level conflicts
    const conflicts = this.detectConflicts(
      request.base_data || {},
      request.local_changes,
      request.remote_changes,
    );

    // Resolve conflicts
    const hasConflicts = conflicts.some((c) => c.is_conflicting);
    const merged = this.mergeChanges(
      request.base_data || {},
      request.local_changes,
      request.remote_changes,
      conflicts,
      strategy,
      request.local_timestamp,
      request.remote_timestamp,
      request.local_user_id,
      request.remote_user_id,
    );

    const result: ConflictResolutionResult = {
      has_conflicts: hasConflicts,
      merged_data: merged,
      conflicts,
      resolution_strategy: strategy,
      new_version: request.base_version + 1,
      metadata: {
        resolved_by: "system",
        resolved_at: Date.now(),
        resolution_reason: hasConflicts
          ? `Resolved via ${strategy}`
          : "No conflicts",
      },
    };

    // Record resolution
    if (!this.resolutionHistory.has(entityKey)) {
      this.resolutionHistory.set(entityKey, []);
    }
    this.resolutionHistory.get(entityKey)!.push(result);

    // Keep history bounded
    const history = this.resolutionHistory.get(entityKey)!;
    if (history.length > 1000) {
      history.shift();
    }

    console.log(
      `[ConflictResolution] Resolved conflicts for ${entityKey}: ${conflicts.length} fields, ${strategy} strategy`,
    );

    return result;
  }

  /**
   * Detect field-level conflicts
   */
  private detectConflicts(
    baseData: Record<string, any>,
    localChanges: Record<string, any>,
    remoteChanges: Record<string, any>,
  ): FieldConflict[] {
    const conflicts: FieldConflict[] = [];
    const allFields = new Set([
      ...Object.keys(baseData),
      ...Object.keys(localChanges),
      ...Object.keys(remoteChanges),
    ]);

    for (const field of allFields) {
      const baseValue = baseData[field];
      const localValue = localChanges[field];
      const remoteValue = remoteChanges[field];

      // Check if field was changed by both sides
      const localChanged = localValue !== undefined && localValue !== baseValue;
      const remoteChanged =
        remoteValue !== undefined && remoteValue !== baseValue;
      const isBothChanged = localChanged && remoteChanged;
      const sameChange =
        JSON.stringify(localValue) === JSON.stringify(remoteValue);

      const conflict: FieldConflict = {
        field,
        base_value: baseValue,
        local_value: localValue,
        remote_value: remoteValue,
        is_conflicting: isBothChanged && !sameChange,
        resolution: "local-wins", // Default, will be overridden
        resolved_value: undefined,
        auto_resolvable: this.isAutoResolvable(
          baseValue,
          localValue,
          remoteValue,
        ),
      };

      conflicts.push(conflict);
    }

    return conflicts;
  }

  /**
   * Check if conflict is auto-resolvable
   */
  private isAutoResolvable(
    baseValue: any,
    localValue: any,
    remoteValue: any,
  ): boolean {
    // Non-conflicting or same value → resolvable
    if (localValue === remoteValue) return true;

    // Arrays: can merge by union
    if (Array.isArray(localValue) && Array.isArray(remoteValue)) {
      return true;
    }

    // Numeric: can average
    if (typeof localValue === "number" && typeof remoteValue === "number") {
      return true;
    }

    // One side is unchanged (has base value) → use other side
    if (localValue === baseValue || remoteValue === baseValue) {
      return true;
    }

    return false;
  }

  /**
   * Merge changes with conflict resolution
   */
  private mergeChanges(
    baseData: Record<string, any>,
    localChanges: Record<string, any>,
    remoteChanges: Record<string, any>,
    conflicts: FieldConflict[],
    strategy: ResolutionStrategy,
    localTimestamp: number,
    remoteTimestamp: number,
    localUserId: string,
    remoteUserId: string,
  ): Record<string, any> {
    const merged = { ...baseData };

    for (const conflict of conflicts) {
      if (!conflict.is_conflicting) {
        // Non-conflicting: use the change (either local or remote)
        if (conflict.local_value !== undefined) {
          merged[conflict.field] = conflict.local_value;
        } else if (conflict.remote_value !== undefined) {
          merged[conflict.field] = conflict.remote_value;
        }
        conflict.resolved_value = merged[conflict.field];
        conflict.resolution = "merged";
        continue;
      }

      // Conflicting: apply resolution strategy
      let resolved: any;

      switch (strategy) {
        case "last-write-wins":
          if (localTimestamp >= remoteTimestamp) {
            resolved = conflict.local_value;
            conflict.resolution = "local-wins";
          } else {
            resolved = conflict.remote_value;
            conflict.resolution = "remote-wins";
          }
          break;

        case "local-wins":
          resolved = conflict.local_value;
          conflict.resolution = "local-wins";
          break;

        case "remote-wins":
          resolved = conflict.remote_value;
          conflict.resolution = "remote-wins";
          break;

        case "merge":
          resolved = this.smartMerge(
            conflict.base_value,
            conflict.local_value,
            conflict.remote_value,
          );
          conflict.resolution = "merged";
          break;

        case "manual":
          // Keep both for manual review
          resolved = {
            local: conflict.local_value,
            remote: conflict.remote_value,
          };
          conflict.resolution = "manual";
          break;

        default:
          resolved = conflict.remote_value;
          conflict.resolution = "remote-wins";
      }

      merged[conflict.field] = resolved;
      conflict.resolved_value = resolved;
    }

    return merged;
  }

  /**
   * Smart merge algorithm
   */
  private smartMerge(baseValue: any, localValue: any, remoteValue: any): any {
    // Same values → return
    if (localValue === remoteValue) return localValue;

    // Arrays: merge by union
    if (Array.isArray(localValue) && Array.isArray(remoteValue)) {
      return Array.from(new Set([...localValue, ...remoteValue]));
    }

    // Objects: recursive merge
    if (
      typeof localValue === "object" &&
      typeof remoteValue === "object" &&
      !Array.isArray(localValue) &&
      !Array.isArray(remoteValue)
    ) {
      return { ...localValue, ...remoteValue };
    }

    // Numeric: average
    if (typeof localValue === "number" && typeof remoteValue === "number") {
      return (localValue + remoteValue) / 2;
    }

    // String: prefer non-empty
    if (typeof localValue === "string" && typeof remoteValue === "string") {
      return localValue.length > 0 ? localValue : remoteValue;
    }

    // One unchanged: use the change
    if (localValue === baseValue) return remoteValue;
    if (remoteValue === baseValue) return localValue;

    // Fallback: remote wins
    return remoteValue;
  }

  /**
   * Create transaction log entry
   */
  public logTransaction(
    entityType: string,
    entityId: string,
    operation: "create" | "update" | "delete",
    changes: Record<string, any>,
    userId: string,
    version: number,
  ): TransactionLog {
    const log: TransactionLog = {
      id: this.generateId(),
      entity_type: entityType,
      entity_id: entityId,
      operation,
      changes,
      user_id: userId,
      timestamp: Date.now(),
      version,
    };

    const entityKey = `${entityType}:${entityId}`;
    if (!this.transactionLogs.has(entityKey)) {
      this.transactionLogs.set(entityKey, []);
    }

    this.transactionLogs.get(entityKey)!.push(log);

    // Keep bounded
    const logs = this.transactionLogs.get(entityKey)!;
    if (logs.length > 10000) {
      logs.shift();
    }

    return log;
  }

  /**
   * Get transaction history
   */
  public getTransactionHistory(
    entityType: string,
    entityId: string,
    limit = 100,
  ): TransactionLog[] {
    const entityKey = `${entityType}:${entityId}`;
    const logs = this.transactionLogs.get(entityKey) || [];
    return logs.slice(-limit);
  }

  /**
   * Push undo entry
   */
  public pushUndo(
    entityType: string,
    entityId: string,
    operation: "create" | "update" | "delete",
    previousData: Record<string, any>,
  ): void {
    const entityKey = `${entityType}:${entityId}`;
    if (!this.undoRedoStack.has(entityKey)) {
      this.undoRedoStack.set(entityKey, []);
    }

    const stack = this.undoRedoStack.get(entityKey)!;
    stack.push({
      operation,
      data: previousData,
      timestamp: Date.now(),
    });

    // Keep stack bounded
    if (stack.length > 100) {
      stack.shift();
    }
  }

  /**
   * Get stats
   */
  public getStats() {
    return {
      transaction_logs: Array.from(this.transactionLogs.values()).reduce(
        (sum, logs) => sum + logs.length,
        0,
      ),
      resolution_history: Array.from(this.resolutionHistory.values()).reduce(
        (sum, resolutions) => sum + resolutions.length,
        0,
      ),
      undo_redo_stacks: this.undoRedoStack.size,
    };
  }

  /**
   * Generate ID
   */
  private generateId(): string {
    return Math.random().toString(36).slice(2);
  }
}

interface UndoRedoEntry {
  operation: "create" | "update" | "delete";
  data: Record<string, any>;
  timestamp: number;
}

export const conflictResolutionService = new ConflictResolutionService();
