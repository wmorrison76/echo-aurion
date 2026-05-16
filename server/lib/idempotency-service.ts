/**
 * Idempotency Service
 * 
 * Ensures all write operations are idempotent using idempotency keys.
 * Prevents duplicate processing of the same operation.
 * 
 * Target: Zero duplicate operations, 100% idempotency
 * 
 * Storage: Redis (24h TTL)
 */

import { logger } from "./logger";
import { getCache } from "./cache-layer";

export interface IdempotencyRecord {
  key: string;
  result: any;
  status: "processing" | "completed" | "failed";
  createdAt: number;
  expiresAt: number;
}

class IdempotencyService {
  private cache = getCache();
  private readonly TTL = 24 * 60 * 60; // 24 hours in seconds
  private processingKeys: Set<string> = new Set();

  /**
   * Check if operation with idempotency key has been processed
   */
  async check(key: string): Promise<IdempotencyRecord | null> {
    try {
      const cached = await this.cache.get<IdempotencyRecord>(`idempotency:${key}`);
      return cached || null;
    } catch (error) {
      logger.error(`[Idempotency] Error checking key ${key}:`, error);
      return null;
    }
  }

  /**
   * Mark operation as processing
   */
  async markProcessing(key: string): Promise<void> {
    try {
      const record: IdempotencyRecord = {
        key,
        result: null,
        status: "processing",
        createdAt: Date.now(),
        expiresAt: Date.now() + this.TTL * 1000,
      };

      await this.cache.set(`idempotency:${key}`, record, "events");
      this.processingKeys.add(key);
      
      logger.debug(`[Idempotency] Marked as processing: ${key}`);
    } catch (error) {
      logger.error(`[Idempotency] Error marking processing for ${key}:`, error);
    }
  }

  /**
   * Store completed operation result
   */
  async storeResult(key: string, result: any): Promise<void> {
    try {
      const record: IdempotencyRecord = {
        key,
        result,
        status: "completed",
        createdAt: Date.now(),
        expiresAt: Date.now() + this.TTL * 1000,
      };

      await this.cache.set(`idempotency:${key}`, record, "events");
      this.processingKeys.delete(key);
      
      logger.debug(`[Idempotency] Stored result for: ${key}`);
    } catch (error) {
      logger.error(`[Idempotency] Error storing result for ${key}:`, error);
    }
  }

  /**
   * Mark operation as failed
   */
  async markFailed(key: string, error: Error): Promise<void> {
    try {
      const record: IdempotencyRecord = {
        key,
        result: { error: error.message },
        status: "failed",
        createdAt: Date.now(),
        expiresAt: Date.now() + this.TTL * 1000,
      };

      await this.cache.set(`idempotency:${key}`, record, "events");
      this.processingKeys.delete(key);
      
      logger.warn(`[Idempotency] Marked as failed: ${key} - ${error.message}`);
    } catch (err) {
      logger.error(`[Idempotency] Error marking failed for ${key}:`, err);
    }
  }

  /**
   * Execute operation with idempotency check
   */
  async execute<T>(
    key: string,
    operation: () => Promise<T>
  ): Promise<T> {
    // Check if already processed
    const existing = await this.check(key);
    
    if (existing) {
      if (existing.status === "completed") {
        logger.debug(`[Idempotency] Returning cached result for: ${key}`);
        return existing.result as T;
      }
      
      if (existing.status === "processing") {
        // Operation is still processing, wait and retry
        logger.warn(`[Idempotency] Operation still processing: ${key}`);
        throw new Error("Operation already in progress");
      }
      
      if (existing.status === "failed") {
        // Previous attempt failed, allow retry
        logger.info(`[Idempotency] Previous attempt failed, retrying: ${key}`);
      }
    }

    // Mark as processing
    await this.markProcessing(key);

    try {
      // Execute operation
      const result = await operation();
      
      // Store result
      await this.storeResult(key, result);
      
      return result;
    } catch (error) {
      // Mark as failed
      await this.markFailed(key, error instanceof Error ? error : new Error(String(error)));
      throw error;
    }
  }

  /**
   * Generate idempotency key from request
   */
  generateKey(operation: string, params: Record<string, any>): string {
    const sortedParams = Object.keys(params)
      .sort()
      .map(key => `${key}=${JSON.stringify(params[key])}`)
      .join("&");
    
    return `${operation}:${Buffer.from(sortedParams).toString("base64")}`;
  }

  /**
   * Clean up expired keys
   */
  async cleanup(): Promise<void> {
    // This would be called periodically to clean up expired keys
    // In production, use Redis TTL or scheduled job
    logger.debug("[Idempotency] Cleanup completed (handled by cache TTL)");
  }
}

// Singleton instance
let idempotencyService: IdempotencyService | null = null;

export function getIdempotencyService(): IdempotencyService {
  if (!idempotencyService) {
    idempotencyService = new IdempotencyService();
  }
  return idempotencyService;
}
