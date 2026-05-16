/**
 * API Response Caching Service
 * Provides caching layer for API responses to improve performance
 */

import { logger } from "./logger";

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  expiresAt: number;
}

export class APICache {
  private cache: Map<string, CacheEntry<any>> = new Map();
  private defaultTTL = 5 * 60 * 1000; // 5 minutes

  /**
   * Get cached data
   */
  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    
    if (!entry) {
      return null;
    }

    // Check if expired
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }

    return entry.data as T;
  }

  /**
   * Set cached data
   */
  set<T>(key: string, data: T, ttl?: number): void {
    const expiresAt = Date.now() + (ttl || this.defaultTTL);
    
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      expiresAt,
    });

    logger.debug("API cache set", { key, expiresAt });
  }

  /**
   * Delete cached data
   */
  delete(key: string): void {
    this.cache.delete(key);
  }

  /**
   * Clear all cache
   */
  clear(): void {
    this.cache.clear();
    logger.info("API cache cleared");
  }

  /**
   * Clear expired entries
   */
  clearExpired(): void {
    const now = Date.now();
    let cleared = 0;

    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiresAt) {
        this.cache.delete(key);
        cleared++;
      }
    }

    if (cleared > 0) {
      logger.debug("API cache expired entries cleared", { cleared });
    }
  }

  /**
   * Get cache stats
   */
  getStats(): {
    size: number;
    keys: string[];
  } {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys()),
    };
  }
}

let apiCacheInstance: APICache | null = null;

export function getAPICache(): APICache {
  if (!apiCacheInstance) {
    apiCacheInstance = new APICache();
    // Clear expired entries every minute
    setInterval(() => {
      apiCacheInstance?.clearExpired();
    }, 60 * 1000);
  }
  return apiCacheInstance;
}

export default APICache;
