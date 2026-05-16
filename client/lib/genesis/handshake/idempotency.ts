/**
 * Idempotency Module for Genesis Handshake Contract
 * Ensures operations are safe to retry within a time window
 */

import { v4 as uuidv4 } from "crypto";

export interface IdempotencyKey {
  key: string;
  correlationId: string;
  issuedAt: number; // timestamp ms
  operationType: string;
}

const IDEMPOTENCY_WINDOW_MS = 10 * 1000; // 10 seconds
const MAX_KEYS_STORED = 1000;

let idempotencyCache: Map<string, IdempotencyKey> = new Map();

/**
 * Generate a new idempotency key
 */
export function generateIdempotencyKey(operationType: string): IdempotencyKey {
  const key = `idem_${uuidv4()}`;
  const correlationId = `corr_${uuidv4()}`;
  const issuedAt = Date.now();

  const idemKey: IdempotencyKey = {
    key,
    correlationId,
    issuedAt,
    operationType,
  };

  // Store for deduplication check
  idempotencyCache.set(key, idemKey);

  // Clean up old entries if cache gets too large
  if (idempotencyCache.size > MAX_KEYS_STORED) {
    const now = Date.now();
    const keysToDelete: string[] = [];

    idempotencyCache.forEach((value, cacheKey) => {
      if (now - value.issuedAt > IDEMPOTENCY_WINDOW_MS * 2) {
        keysToDelete.push(cacheKey);
      }
    });

    keysToDelete.forEach((k) => idempotencyCache.delete(k));
  }

  return idemKey;
}

/**
 * Check if an idempotency key has been used recently (within window)
 * Returns the cached key if it's a duplicate, null if it's new
 */
export function checkIdempotency(
  idempotencyKey: string,
): IdempotencyKey | null {
  const cached = idempotencyCache.get(idempotencyKey);

  if (!cached) {
    return null; // Not seen before
  }

  const now = Date.now();
  const age = now - cached.issuedAt;

  if (age > IDEMPOTENCY_WINDOW_MS) {
    // Outside window, treat as new
    idempotencyCache.delete(idempotencyKey);
    return null;
  }

  // Duplicate within window
  return cached;
}

/**
 * Register an idempotency key as "processed"
 * Used after successfully handling an operation
 */
export function registerIdempotencyKey(idempotencyKey: string): void {
  // Key already in cache from generation; this is a confirmation
  // In a real system, you'd mark it as "confirmed" or update state
  // For now, just ensure it exists
  if (!idempotencyCache.has(idempotencyKey)) {
    idempotencyCache.set(idempotencyKey, {
      key: idempotencyKey,
      correlationId: `corr_${uuidv4()}`,
      issuedAt: Date.now(),
      operationType: "UNKNOWN",
    });
  }
}

/**
 * Clear all idempotency keys (dev/test use only)
 */
export function clearIdempotencyCache(): void {
  idempotencyCache.clear();
}

/**
 * Get cache size (for monitoring)
 */
export function getIdempotencyCacheSize(): number {
  return idempotencyCache.size;
}

/**
 * Generate a causation ID (links events in a chain)
 */
export function generateCausationId(sourceEventId?: string): string {
  if (sourceEventId) {
    return `caused_by_${sourceEventId}`;
  }
  return `cause_${uuidv4()}`;
}
