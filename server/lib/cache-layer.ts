/**
 * Cache Layer for Calendar System
 * Handles caching of frequently accessed data to reduce database load
 * Supports 1000+ concurrent events with sub-second response times
 *
 * Cache Strategy:
 * - Event queries: 5 minute TTL
 * - Conflict data: 1 minute TTL (update heavy)
 * - Outlet config: 30 minute TTL (rarely changes)
 * - User permissions: 10 minute TTL
 * - Computed stats: 15 minute TTL
 */

import { logger } from "./logger";
import { safeRequire } from "../utils/safe-require";

export interface CacheConfig {
  enabled: boolean;
  provider: "redis" | "memory" | "none";
  ttl: {
    events: number; // seconds
    conflicts: number;
    outlets: number;
    permissions: number;
    stats: number;
  };
  maxSize?: number; // max items in memory cache
}

export interface CacheEntry<T> {
  data: T;
  expiresAt: number;
  createdAt: number;
  hits: number;
}

/**
 * In-memory cache fallback (when Redis unavailable)
 */
class MemoryCache {
  private data: Map<string, CacheEntry<any>> = new Map();
  private maxSize: number;

  constructor(maxSize = 10000) {
    this.maxSize = maxSize;
    this.startCleanupInterval();
  }

  get<T>(key: string): T | null {
    const entry = this.data.get(key);
    if (!entry) return null;

    if (entry.expiresAt < Date.now()) {
      this.data.delete(key);
      return null;
    }

    entry.hits++;
    return entry.data as T;
  }

  set<T>(key: string, value: T, ttlSeconds: number): void {
    // Evict oldest if at capacity
    if (this.data.size >= this.maxSize) {
      const oldest = Array.from(this.data.entries()).sort(
        ([, a], [, b]) => a.createdAt - b.createdAt,
      )[0];
      if (oldest) {
        this.data.delete(oldest[0]);
      }
    }

    this.data.set(key, {
      data: value,
      expiresAt: Date.now() + ttlSeconds * 1000,
      createdAt: Date.now(),
      hits: 0,
    });
  }

  del(key: string): boolean {
    return this.data.delete(key);
  }

  invalidatePattern(pattern: RegExp): number {
    let count = 0;
    for (const key of this.data.keys()) {
      if (pattern.test(key)) {
        this.data.delete(key);
        count++;
      }
    }
    return count;
  }

  clear(): void {
    this.data.clear();
  }

  stats() {
    return {
      size: this.data.size,
      maxSize: this.maxSize,
      utilization: (this.data.size / this.maxSize) * 100,
    };
  }

  private startCleanupInterval() {
    setInterval(() => {
      let expired = 0;
      for (const [key, entry] of this.data.entries()) {
        if (entry.expiresAt < Date.now()) {
          this.data.delete(key);
          expired++;
        }
      }
      if (expired > 0) {
        logger.debug(`[Cache] Cleaned up ${expired} expired entries`);
      }
    }, 60000); // Run every minute
  }
}

/**
 * Cache Layer Manager
 */
class CacheLayer {
  private memoryCache: MemoryCache;
  private redisClient: any = null;
  private config: CacheConfig;

  constructor(config: CacheConfig) {
    this.config = config;
    this.memoryCache = new MemoryCache(config.maxSize || 10000);

    if (config.provider === "redis" && process.env.ENABLE_CACHE_REDIS === "true") {
      this.initRedis();
      this.initPubSub();
    }
  }

  /**
   * Initialize pub/sub for cache invalidation
   */
  private async initPubSub(): Promise<void> {
    try {
      const { initializeCacheInvalidationPubSub } = await import("./cache-invalidation-pubsub");
      const pubSub = initializeCacheInvalidationPubSub();
      
      // Register handlers for cross-instance invalidation
      pubSub.onInvalidate((key: string) => {
        this.memoryCache.del(key);
        logger.debug(`[Cache] Invalidated via pub/sub: ${key}`);
      });

      pubSub.onInvalidatePattern((pattern: string) => {
        const regex = new RegExp(pattern.replace(/\*/g, ".*"));
        this.memoryCache.invalidatePattern(regex);
        logger.debug(`[Cache] Invalidated pattern via pub/sub: ${pattern}`);
      });

      pubSub.onClear(() => {
        this.memoryCache.clear();
        logger.debug("[Cache] Cleared via pub/sub");
      });
    } catch (error) {
      logger.warn("[Cache] Pub/sub initialization failed:", error);
    }
  }

  private async initRedis(): Promise<void> {
    try {
      const redisUrl = process.env.REDIS_URL;
      if (!redisUrl) {
        logger.warn(
          "[Cache] Redis URL not configured, falling back to memory cache",
        );
        return;
      }

      const redis = safeRequire<any>("redis");
      if (!redis) {
        logger.warn(
          "[Cache] Redis package not installed, falling back to memory cache",
        );
        return;
      }

      this.redisClient = redis.createClient({ url: redisUrl });
      this.redisClient.on("error", (err) =>
        logger.debug("[Cache] Redis error:", err),
      );
      await this.redisClient.connect();
      logger.info("[Cache] Redis connected");
    } catch (error) {
      logger.warn("[Cache] Redis initialization failed, using memory cache");
    }
  }

  /**
   * Get value from cache
   */
  async get<T>(key: string): Promise<T | null> {
    if (!this.config.enabled) return null;

    // Try memory cache first
    const memValue = this.memoryCache.get<T>(key);
    if (memValue) {
      logger.debug(`[Cache] HIT: ${key}`);
      return memValue;
    }

    // Try Redis
    if (this.redisClient) {
      try {
        const redisValue = await this.redisClient.get(key);
        if (redisValue) {
          logger.debug(`[Cache] Redis HIT: ${key}`);
          // Backfill memory cache
          const parsed = JSON.parse(redisValue);
          this.memoryCache.set(key, parsed, 60); // 60s in memory
          return parsed as T;
        }
      } catch (error) {
        logger.debug(`[Cache] Redis get error for ${key}:`, error);
      }
    }

    logger.debug(`[Cache] MISS: ${key}`);
    return null;
  }

  /**
   * Set value in cache
   */
  async set<T>(
    key: string,
    value: T,
    type:
      | "events"
      | "conflicts"
      | "outlets"
      | "permissions"
      | "stats" = "events",
  ): Promise<void> {
    if (!this.config.enabled) return;

    const ttl = this.config.ttl[type];
    const stringValue = JSON.stringify(value);

    // Store in memory cache
    this.memoryCache.set(key, value, ttl);

    // Store in Redis
    if (this.redisClient) {
      try {
        await this.redisClient.setEx(key, ttl, stringValue);
        logger.debug(`[Cache] SET: ${key} (TTL: ${ttl}s)`);
      } catch (error) {
        logger.debug(`[Cache] Redis set error for ${key}:`, error);
      }
    }
  }

  /**
   * Delete cache entry
   */
  async del(key: string): Promise<void> {
    this.memoryCache.del(key);

    if (this.redisClient) {
      try {
        await this.redisClient.del(key);
        logger.debug(`[Cache] DEL: ${key}`);
      } catch (error) {
        logger.debug(`[Cache] Redis del error for ${key}:`, error);
      }
    }

    // Publish invalidation via pub/sub
    try {
      const { getCacheInvalidationPubSub } = await import("./cache-invalidation-pubsub");
      const pubSub = getCacheInvalidationPubSub();
      await pubSub.invalidate(key);
    } catch (error) {
      // Pub/sub not available, continue without it
    }
  }

  async invalidatePattern(pattern: string): Promise<number> {
    const regex = new RegExp(pattern.replace(/\*/g, ".*"));
    let count = this.memoryCache.invalidatePattern(regex);

    if (this.redisClient) {
      try {
        // Use SCAN instead of KEYS to avoid blocking the Redis event loop (Disney-level scaling)
        let keys: string[] = [];
        for await (const key of this.redisClient.scanIterator({
          MATCH: pattern,
          COUNT: 100,
        })) {
          keys.push(key);
          // Batch deletes to optimize performance
          if (keys.length >= 100) {
            await this.redisClient.del(keys);
            count += keys.length;
            keys = [];
          }
        }

        if (keys.length > 0) {
          await this.redisClient.del(keys);
          count += keys.length;
        }

        logger.debug(
          `[Cache] Invalidated ${count} entries matching ${pattern} using SCAN`,
        );
      } catch (error) {
        logger.error(`[Cache] Redis invalidate error:`, error);
      }
    }

    // Publish pattern invalidation via pub/sub
    try {
      const { getCacheInvalidationPubSub } = await import("./cache-invalidation-pubsub");
      const pubSub = getCacheInvalidationPubSub();
      await pubSub.invalidatePattern(pattern);
    } catch (error) {
      // Pub/sub not available, continue without it
    }

    return count;
  }

  /**
   * Clear entire cache (use with caution)
   */
  async clear(): Promise<void> {
    this.memoryCache.clear();

    if (this.redisClient) {
      try {
        await this.redisClient.flushDb();
        logger.info("[Cache] Entire cache cleared");
      } catch (error) {
        logger.error("[Cache] Redis flush error:", error);
      }
    }

    // Publish clear all via pub/sub
    try {
      const { getCacheInvalidationPubSub } = await import("./cache-invalidation-pubsub");
      const pubSub = getCacheInvalidationPubSub();
      await pubSub.clearAll();
    } catch (error) {
      // Pub/sub not available, continue without it
    }
  }

  /**
   * Get cache stats
   */
  getStats() {
    return {
      memory: this.memoryCache.stats(),
      redis: this.redisClient ? "connected" : "disconnected",
      config: this.config,
    };
  }
}

/**
 * Cache Key Builders (standardized naming)
 */
export const CacheKeys = {
  // Events
  event(eventId: string) {
    return `event:${eventId}`;
  },
  eventsByOrg(orgId: string, dateRange?: string) {
    return `events:org:${orgId}:${dateRange || "all"}`;
  },
  eventsByOutlet(outletId: string, dateRange?: string) {
    return `events:outlet:${outletId}:${dateRange || "all"}`;
  },

  // Conflicts
  conflicts(orgId: string) {
    return `conflicts:org:${orgId}`;
  },
  conflictsForEvent(eventId: string) {
    return `conflicts:event:${eventId}`;
  },

  // Outlets
  outlet(outletId: string) {
    return `outlet:${outletId}`;
  },
  outletsForOrg(orgId: string) {
    return `outlets:org:${orgId}`;
  },

  // Permissions
  userPermissions(userId: string, orgId: string) {
    return `permissions:user:${userId}:org:${orgId}`;
  },

  // Stats
  dailyStats(orgId: string, date: string) {
    return `stats:daily:org:${orgId}:${date}`;
  },
  orgStats(orgId: string) {
    return `stats:org:${orgId}`;
  },
};

// =====================================================
// SINGLETON INSTANCE
// =====================================================

let cacheInstance: CacheLayer | null = null;

export function initializeCache(config?: Partial<CacheConfig>): CacheLayer {
  const isProduction = process.env.NODE_ENV === "production";
  const defaultConfig: CacheConfig = {
    enabled: process.env.CACHE_ENABLED !== "false",
    // Force Redis in production for distributed scaling
    provider: (isProduction
      ? "redis"
      : process.env.CACHE_PROVIDER || "memory") as "redis" | "memory",
    ttl: {
      events: parseInt(process.env.CACHE_TTL_EVENTS || "300"), // 5 min
      conflicts: parseInt(process.env.CACHE_TTL_CONFLICTS || "60"), // 1 min
      outlets: parseInt(process.env.CACHE_TTL_OUTLETS || "1800"), // 30 min
      permissions: parseInt(process.env.CACHE_TTL_PERMISSIONS || "600"), // 10 min
      stats: parseInt(process.env.CACHE_TTL_STATS || "900"), // 15 min
    },
    maxSize: parseInt(process.env.CACHE_MAX_SIZE || "10000"),
  };

  cacheInstance = new CacheLayer({ ...defaultConfig, ...config });
  logger.info("[Cache] Initialized with config:", defaultConfig);
  return cacheInstance;
}

export function getCache(): CacheLayer {
  if (!cacheInstance) {
    cacheInstance = initializeCache();
  }
  return cacheInstance;
}

export default CacheLayer;
