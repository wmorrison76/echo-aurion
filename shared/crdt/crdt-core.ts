/**
 * CRDT Core Library
 * ────────────────
 * Conflict-free Replicated Data Types for distributed synchronization.
 * Enables multiple replicas to converge to same state without coordination.
 *
 * TYPES:
 * - LWW Register: Last-write-wins scalar value
 * - G-Counter: Grow-only counter (increment-only)
 * - PN-Counter: Positive-Negative counter (increment/decrement)
 * - G-Set: Grow-only set (add-only)
 * - OR-Set: Observed-remove set (add/remove)
 * - Map: CRDT-based map (combines other types)
 */

export interface CRDTOperation {
  id: string; // Unique operation ID
  replica_id: string;
  timestamp: number;
  operation_type: string;
  data: Record<string, any>;
}

/**
 * LWW Register - Last-Write-Wins Register
 * Simplest CRDT: timestamp-based conflict resolution
 */
export class LWWRegister<T> {
  private value: T;
  private timestamp: number = 0;
  private replica_id: string;

  constructor(replica_id: string, initial_value?: T) {
    this.replica_id = replica_id;
    this.value = initial_value as T;
  }

  public set(value: T, timestamp: number = Date.now()): void {
    if (timestamp >= this.timestamp) {
      this.value = value;
      this.timestamp = timestamp;
    }
  }

  public get(): T {
    return this.value;
  }

  public merge(other: LWWRegister<T>): void {
    if (other.timestamp > this.timestamp) {
      this.value = other.value;
      this.timestamp = other.timestamp;
    }
  }

  public toJSON() {
    return {
      value: this.value,
      timestamp: this.timestamp,
      replica_id: this.replica_id,
    };
  }
}

/**
 * G-Counter - Grow-only Counter
 * Can only increment, guarantees eventual consistency
 */
export class GCounter {
  private counts: Map<string, number> = new Map();
  private replica_id: string;

  constructor(replica_id: string) {
    this.replica_id = replica_id;
    this.counts.set(replica_id, 0);
  }

  public increment(amount: number = 1): void {
    const current = this.counts.get(this.replica_id) || 0;
    this.counts.set(this.replica_id, current + amount);
  }

  public value(): number {
    let sum = 0;
    for (const count of this.counts.values()) {
      sum += count;
    }
    return sum;
  }

  public merge(other: GCounter): void {
    for (const [replica, count] of other.counts.entries()) {
      const currentCount = this.counts.get(replica) || 0;
      this.counts.set(replica, Math.max(currentCount, count));
    }
  }

  public toJSON() {
    return Object.fromEntries(this.counts);
  }
}

/**
 * PN-Counter - Positive-Negative Counter
 * Allows both increment and decrement
 */
export class PNCounter {
  private p: GCounter;
  private n: GCounter;

  constructor(replica_id: string) {
    this.p = new GCounter(`${replica_id}:p`);
    this.n = new GCounter(`${replica_id}:n`);
  }

  public increment(amount: number = 1): void {
    if (amount > 0) {
      this.p.increment(amount);
    } else {
      this.n.increment(-amount);
    }
  }

  public decrement(amount: number = 1): void {
    this.n.increment(amount);
  }

  public value(): number {
    return this.p.value() - this.n.value();
  }

  public merge(other: PNCounter): void {
    this.p.merge(other.p);
    this.n.merge(other.n);
  }

  public toJSON() {
    return {
      p: this.p.toJSON(),
      n: this.n.toJSON(),
    };
  }
}

/**
 * G-Set - Grow-only Set
 * Can only add elements, not remove
 */
export class GSet<T> {
  private elements: Set<string> = new Set();

  public add(element: T): void {
    this.elements.add(JSON.stringify(element));
  }

  public contains(element: T): boolean {
    return this.elements.has(JSON.stringify(element));
  }

  public values(): T[] {
    return Array.from(this.elements).map((s) => JSON.parse(s));
  }

  public merge(other: GSet<T>): void {
    for (const elem of other.elements) {
      this.elements.add(elem);
    }
  }

  public toJSON() {
    return Array.from(this.elements).map((s) => JSON.parse(s));
  }
}

/**
 * OR-Set - Observed-Remove Set
 * Can add and remove with automatic conflict resolution
 */
export class ORSet<T> {
  private elements: Map<string, Set<string>> = new Map(); // element -> set of unique tags
  private replica_id: string;
  private tag_counter: number = 0;

  constructor(replica_id: string) {
    this.replica_id = replica_id;
  }

  public add(element: T): void {
    const key = JSON.stringify(element);
    const tag = `${this.replica_id}:${this.tag_counter++}`;

    if (!this.elements.has(key)) {
      this.elements.set(key, new Set());
    }

    this.elements.get(key)!.add(tag);
  }

  public remove(element: T): void {
    const key = JSON.stringify(element);
    this.elements.delete(key);
  }

  public contains(element: T): boolean {
    return this.elements.has(JSON.stringify(element));
  }

  public values(): T[] {
    return Array.from(this.elements.keys()).map((k) => JSON.parse(k));
  }

  public merge(other: ORSet<T>): void {
    for (const [key, tags] of other.elements.entries()) {
      if (!this.elements.has(key)) {
        this.elements.set(key, new Set());
      }

      for (const tag of tags) {
        this.elements.get(key)!.add(tag);
      }
    }
  }

  public toJSON() {
    const result: Record<string, string[]> = {};
    for (const [key, tags] of this.elements.entries()) {
      result[key] = Array.from(tags);
    }
    return result;
  }
}

/**
 * CRDT Map - Combines multiple CRDT types
 */
export class CRDTMap {
  private data: Map<string, LWWRegister<any>> = new Map();
  private counters: Map<string, PNCounter> = new Map();
  private sets: Map<string, ORSet<any>> = new Map();
  private replica_id: string;

  constructor(replica_id: string) {
    this.replica_id = replica_id;
  }

  /**
   * Set a scalar value (LWW)
   */
  public set(key: string, value: any, timestamp: number = Date.now()): void {
    if (!this.data.has(key)) {
      this.data.set(key, new LWWRegister(this.replica_id, value));
    }
    this.data.get(key)!.set(value, timestamp);
  }

  /**
   * Get a scalar value
   */
  public get(key: string): any {
    return this.data.get(key)?.get();
  }

  /**
   * Increment a counter
   */
  public increment(key: string, amount: number = 1): void {
    if (!this.counters.has(key)) {
      this.counters.set(key, new PNCounter(this.replica_id));
    }
    this.counters.get(key)!.increment(amount);
  }

  /**
   * Get counter value
   */
  public getCounter(key: string): number {
    return this.counters.get(key)?.value() ?? 0;
  }

  /**
   * Add to set
   */
  public addToSet(key: string, element: any): void {
    if (!this.sets.has(key)) {
      this.sets.set(key, new ORSet(this.replica_id));
    }
    this.sets.get(key)!.add(element);
  }

  /**
   * Remove from set
   */
  public removeFromSet(key: string, element: any): void {
    this.sets.get(key)?.remove(element);
  }

  /**
   * Get set values
   */
  public getSet(key: string): any[] {
    return this.sets.get(key)?.values() ?? [];
  }

  /**
   * Merge with another map
   */
  public merge(other: CRDTMap): void {
    for (const [key, register] of other.data.entries()) {
      if (!this.data.has(key)) {
        this.data.set(key, new LWWRegister(this.replica_id, register.get()));
      }
      this.data.get(key)!.merge(register);
    }

    for (const [key, counter] of other.counters.entries()) {
      if (!this.counters.has(key)) {
        this.counters.set(key, new PNCounter(this.replica_id));
      }
      this.counters.get(key)!.merge(counter);
    }

    for (const [key, set] of other.sets.entries()) {
      if (!this.sets.has(key)) {
        this.sets.set(key, new ORSet(this.replica_id));
      }
      this.sets.get(key)!.merge(set);
    }
  }

  /**
   * Snapshot for export
   */
  public toJSON() {
    const snapshot: Record<string, any> = {};

    for (const [key, register] of this.data.entries()) {
      snapshot[key] = register.get();
    }

    for (const [key, counter] of this.counters.entries()) {
      snapshot[`__counter_${key}`] = counter.value();
    }

    for (const [key, set] of this.sets.entries()) {
      snapshot[`__set_${key}`] = set.values();
    }

    return snapshot;
  }

  /**
   * Get stats
   */
  public stats() {
    return {
      scalars: this.data.size,
      counters: this.counters.size,
      sets: this.sets.size,
      total: this.data.size + this.counters.size + this.sets.size,
    };
  }
}

/**
 * CRDT Operation Log - Track all operations for replay
 */
export class OperationLog {
  private operations: CRDTOperation[] = [];

  public append(op: CRDTOperation): void {
    this.operations.push(op);

    // Keep bounded
    if (this.operations.length > 100000) {
      this.operations.shift();
    }
  }

  public getOperations(since?: number): CRDTOperation[] {
    if (!since) return [...this.operations];

    return this.operations.filter((op) => op.timestamp > since);
  }

  public replay(map: CRDTMap, operations: CRDTOperation[]): void {
    for (const op of operations) {
      // Apply operation to map
      if (op.operation_type === "set") {
        map.set(op.data.key, op.data.value, op.timestamp);
      } else if (op.operation_type === "increment") {
        map.increment(op.data.key, op.data.amount);
      } else if (op.operation_type === "add_set") {
        map.addToSet(op.data.key, op.data.element);
      }
    }
  }

  public clear(): void {
    this.operations = [];
  }
}
