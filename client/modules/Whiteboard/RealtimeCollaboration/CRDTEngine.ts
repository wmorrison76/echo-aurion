/**
 * Feature 13.1: CRDT Engine
 * Conflict-free Replicated Data Type for collaborative editing
 * Enables conflict-free concurrent edits across multiple users
 */

import { v4 as uuidv4 } from "uuid";
import { CRDTOperation, RemoteChange, SyncState } from "../types/Phase12Types";

interface CRDTState {
  clock: Map<string, number>; // Lamport clock per user
  operations: CRDTOperation[];
  tombstones: Set<string>; // Deleted element IDs
}

class CRDTEngine {
  private state: CRDTState = {
    clock: new Map(),
    operations: [],
    tombstones: new Set(),
  };

  private lamportTimestamp: number = 0;
  private userId: string;

  constructor(userId: string) {
    this.userId = userId;
    this.state.clock.set(userId, 0);
  }

  /**
   * Create a new operation (local edit)
   */
  createOperation(elementId: string, value: any): CRDTOperation {
    // Increment local Lamport timestamp
    this.lamportTimestamp =
      Math.max(this.lamportTimestamp, this.state.clock.get(this.userId) || 0) +
      1;
    this.state.clock.set(this.userId, this.lamportTimestamp);

    const operation: CRDTOperation = {
      operationId: uuidv4(),
      lamportTimestamp: this.lamportTimestamp,
      userId: this.userId,
      elementId,
      value,
      timestamp: Date.now(),
    };

    this.state.operations.push(operation);
    return operation;
  }

  /**
   * Apply remote operation (from another user)
   * Uses Last-Write-Wins (LWW) strategy for conflicts
   */
  applyRemoteOperation(operation: CRDTOperation): boolean {
    // Update Lamport clock
    const remoteTimestamp = operation.lamportTimestamp;
    const currentTimestamp = this.state.clock.get(operation.userId) || 0;
    if (remoteTimestamp > currentTimestamp) {
      this.state.clock.set(operation.userId, remoteTimestamp);
    }

    // Update global Lamport timestamp
    this.lamportTimestamp =
      Math.max(this.lamportTimestamp, remoteTimestamp) + 1;

    // Check for conflicts with existing operations
    const existingOp = this.state.operations.find(
      (op) => op.elementId === operation.elementId,
    );

    if (existingOp) {
      // Last-Write-Wins: keep operation with higher Lamport timestamp
      // If timestamps equal, use userId as tiebreaker (lexicographic)
      const shouldReplace =
        operation.lamportTimestamp > existingOp.lamportTimestamp ||
        (operation.lamportTimestamp === existingOp.lamportTimestamp &&
          operation.userId > existingOp.userId);

      if (shouldReplace) {
        const index = this.state.operations.indexOf(existingOp);
        this.state.operations[index] = operation;
      }

      return !shouldReplace; // Return true if operation was applied
    }

    // No conflict, apply operation
    this.state.operations.push(operation);
    return true;
  }

  /**
   * Delete element (mark as tombstone)
   */
  deleteElement(elementId: string): CRDTOperation {
    this.state.tombstones.add(elementId);
    return this.createOperation(elementId, { __deleted: true });
  }

  /**
   * Get resolved state (filter out deletions)
   */
  getResolvedState(): Record<string, any> {
    const state: Record<string, any> = {};

    for (const operation of this.state.operations) {
      if (!this.state.tombstones.has(operation.elementId)) {
        state[operation.elementId] = operation.value;
      }
    }

    return state;
  }

  /**
   * Get all operations (for syncing)
   */
  getOperations(): CRDTOperation[] {
    return [...this.state.operations];
  }

  /**
   * Get operations after timestamp (for incremental sync)
   */
  getOperationsSince(timestamp: number): CRDTOperation[] {
    return this.state.operations.filter((op) => op.timestamp > timestamp);
  }

  /**
   * Compact operations (merge consecutive operations on same element)
   */
  compact(): void {
    const compacted = new Map<string, CRDTOperation>();

    for (const operation of this.state.operations) {
      // Keep only latest operation per element
      const existing = compacted.get(operation.elementId);
      if (
        !existing ||
        operation.lamportTimestamp > existing.lamportTimestamp ||
        (operation.lamportTimestamp === existing.lamportTimestamp &&
          operation.userId > existing.userId)
      ) {
        compacted.set(operation.elementId, operation);
      }
    }

    this.state.operations = Array.from(compacted.values()).sort(
      (a, b) => a.lamportTimestamp - b.lamportTimestamp,
    );
  }

  /**
   * Detect conflicts between two states
   */
  detectConflicts(otherOperations: CRDTOperation[]): Array<{
    elementId: string;
    ourVersion: CRDTOperation;
    theirVersion: CRDTOperation;
  }> {
    const conflicts: Array<{
      elementId: string;
      ourVersion: CRDTOperation;
      theirVersion: CRDTOperation;
    }> = [];

    for (const otherOp of otherOperations) {
      const ourOp = this.state.operations.find(
        (op) => op.elementId === otherOp.elementId,
      );

      if (
        ourOp &&
        ourOp.lamportTimestamp === otherOp.lamportTimestamp &&
        ourOp.userId !== otherOp.userId
      ) {
        // Concurrent operations on same element = conflict
        conflicts.push({
          elementId: otherOp.elementId,
          ourVersion: ourOp,
          theirVersion: otherOp,
        });
      }
    }

    return conflicts;
  }

  /**
   * Get Lamport timestamp for causality ordering
   */
  getLamportTimestamp(): number {
    return this.lamportTimestamp;
  }

  /**
   * Get vector clock (all user timestamps)
   */
  getVectorClock(): Record<string, number> {
    return Object.fromEntries(this.state.clock);
  }

  /**
   * Merge two CRDT states
   */
  merge(otherOperations: CRDTOperation[]): void {
    for (const operation of otherOperations) {
      this.applyRemoteOperation(operation);
    }
  }

  /**
   * Reset CRDT state
   */
  reset(): void {
    this.state.operations = [];
    this.state.tombstones.clear();
    this.state.clock.clear();
    this.state.clock.set(this.userId, 0);
    this.lamportTimestamp = 0;
  }

  /**
   * Get statistics
   */
  getStats() {
    return {
      totalOperations: this.state.operations.length,
      totalUsers: this.state.clock.size,
      deletedElements: this.state.tombstones.size,
      lamportTimestamp: this.lamportTimestamp,
      vectorClock: Object.fromEntries(this.state.clock),
    };
  }
}

export default CRDTEngine;
