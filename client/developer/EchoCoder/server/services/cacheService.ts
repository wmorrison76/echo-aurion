import crypto from "crypto";

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

interface CacheConfig {
  enableRedis: boolean;
  redisUrl?: string;
  defaultTTL: number;
  maxCacheSize: number;
}

class CacheService {
  private cache: Map<string, CacheEntry<any>> = new Map();
  private config: CacheConfig;
  private redisClient: any = null;
  private initialized = false;

  constructor(config: Partial<CacheConfig> = {}) {
    this.config = {
      enableRedis: config.enableRedis ?? !!process.env.REDIS_URL,
      redisUrl: config.redisUrl || process.env.REDIS_URL,
      defaultTTL: config.defaultTTL ?? 3600,
      maxCacheSize: config.maxCacheSize ?? 1000,
    };

    if (this.config.enableRedis && this.config.redisUrl) {
      this.initRedis();
    }
  }

  private async initRedis() {
    try {
      const redis = await import("redis");
      this.redisClient = redis.createClient({
        url: this.config.redisUrl,
      });
      this.redisClient.on("error", (err: Error) =>
        console.error("Redis error:", err),
      );
      await this.redisClient.connect();
      this.initialized = true;
      console.log("Redis cache initialized");
    } catch (error) {
      console.warn("Redis not available, using in-memory cache:", error);
      this.initialized = false;
    }
  }

  private generateKey(...parts: (string | number)[]): string {
    const combined = parts.join("::");
    return crypto.createHash("sha256").update(combined).digest("hex");
  }

  async get<T>(key: string, namespace: string = "default"): Promise<T | null> {
    const fullKey = this.generateKey(namespace, key);

    if (this.redisClient && this.initialized) {
      try {
        const cached = await this.redisClient.get(fullKey);
        if (cached) {
          return JSON.parse(cached);
        }
      } catch (error) {
        console.error("Redis get error:", error);
      }
    }

    const entry = this.cache.get(fullKey);
    if (!entry) return null;

    const isExpired = Date.now() - entry.timestamp > entry.ttl * 1000;
    if (isExpired) {
      this.cache.delete(fullKey);
      return null;
    }

    return entry.data as T;
  }

  async set<T>(
    key: string,
    data: T,
    ttl: number = this.config.defaultTTL,
    namespace: string = "default",
  ): Promise<void> {
    const fullKey = this.generateKey(namespace, key);

    const entry: CacheEntry<T> = {
      data,
      timestamp: Date.now(),
      ttl,
    };

    if (this.redisClient && this.initialized) {
      try {
        await this.redisClient.setEx(fullKey, ttl, JSON.stringify(entry.data));
      } catch (error) {
        console.error("Redis set error:", error);
        this.cache.set(fullKey, entry);
      }
    } else {
      this.cache.set(fullKey, entry);
    }

    if (this.cache.size > this.config.maxCacheSize) {
      const firstKey = this.cache.keys().next().value;
      if (firstKey) {
        this.cache.delete(firstKey);
      }
    }
  }

  async delete(key: string, namespace: string = "default"): Promise<void> {
    const fullKey = this.generateKey(namespace, key);

    if (this.redisClient && this.initialized) {
      try {
        await this.redisClient.del(fullKey);
      } catch (error) {
        console.error("Redis delete error:", error);
      }
    }

    this.cache.delete(fullKey);
  }

  async clear(namespace: string = "default"): Promise<void> {
    if (this.redisClient && this.initialized) {
      try {
        const pattern = this.generateKey(namespace, "*");
        const keys = await this.redisClient.keys(pattern);
        if (keys.length > 0) {
          await this.redisClient.del(keys);
        }
      } catch (error) {
        console.error("Redis clear error:", error);
      }
    }

    for (const [key] of this.cache.entries()) {
      if (key.includes(namespace)) {
        this.cache.delete(key);
      }
    }
  }

  async getOrCompute<T>(
    key: string,
    computeFn: () => Promise<T>,
    ttl?: number,
    namespace?: string,
  ): Promise<T> {
    const cached = await this.get<T>(key, namespace);
    if (cached !== null) {
      return cached;
    }

    const computed = await computeFn();
    await this.set(key, computed, ttl, namespace);
    return computed;
  }

  getStats(): { size: number; memoryUsage: string } {
    let memoryUsage = 0;
    for (const [, entry] of this.cache.entries()) {
      memoryUsage += JSON.stringify(entry.data).length;
    }

    return {
      size: this.cache.size,
      memoryUsage: `${(memoryUsage / 1024 / 1024).toFixed(2)} MB`,
    };
  }

  async close(): Promise<void> {
    if (this.redisClient && this.initialized) {
      await this.redisClient.quit();
    }
  }
}

let cacheInstance: CacheService | null = null;

export function getCacheService(): CacheService {
  if (!cacheInstance) {
    cacheInstance = new CacheService();
  }
  return cacheInstance;
}

export function resetCacheService(): void {
  cacheInstance = null;
}

export type { CacheConfig, CacheEntry };
