/**
 * Redis Pub/Sub Cache Invalidation
 * 
 * Implements cross-instance cache invalidation using Redis pub/sub.
 * When one instance invalidates a cache key, all other instances are notified.
 * 
 * Target: <10ms cache access, 85%+ hit rate
 */

import { logger } from "./logger";
import { safeRequire } from "../utils/safe-require";

export interface InvalidationMessage {
  type: "invalidate" | "invalidate_pattern" | "clear";
  key?: string;
  pattern?: string;
  timestamp: number;
  instanceId: string;
}

class CacheInvalidationPubSub {
  private publisher: any = null;
  private subscriber: any = null;
  private redisUrl: string;
  private instanceId: string;
  private invalidationHandlers: Map<string, Set<(key: string) => void>> = new Map();
  private isConnected = false;

  constructor() {
    this.redisUrl = process.env.REDIS_URL || "";
    this.instanceId = process.env.INSTANCE_ID || `instance-${Date.now()}`;
  }

  /**
   * Initialize Redis pub/sub connections
   */
  async initialize(): Promise<void> {
    if (!this.redisUrl || process.env.ENABLE_CACHE_REDIS !== "true") {
      logger.warn("[CacheInvalidation] Redis pub/sub disabled");
      return;
    }

    try {
      const redis = safeRequire<any>("redis");
      if (!redis) {
        logger.warn("[CacheInvalidation] Redis package not installed");
        return;
      }

      // Create publisher client
      this.publisher = redis.createClient({ url: this.redisUrl });
      this.publisher.on("error", (err: Error) => {
        logger.debug("[CacheInvalidation] Publisher error:", err);
      });
      await this.publisher.connect();

      // Create subscriber client
      this.subscriber = redis.createClient({ url: this.redisUrl });
      this.subscriber.on("error", (err: Error) => {
        logger.debug("[CacheInvalidation] Subscriber error:", err);
      });
      await this.subscriber.connect();

      // Subscribe to invalidation channel
      await this.subscriber.subscribe("cache:invalidate", (message: string) => {
        this.handleInvalidationMessage(message);
      });

      this.isConnected = true;
      logger.info("[CacheInvalidation] Pub/sub initialized");
    } catch (error) {
      logger.debug("[CacheInvalidation] Failed to initialize pub/sub:", error);
      this.isConnected = false;
    }
  }

  /**
   * Publish invalidation message
   */
  async invalidate(key: string): Promise<void> {
    if (!this.isConnected || !this.publisher) {
      return;
    }

    try {
      const message: InvalidationMessage = {
        type: "invalidate",
        key,
        timestamp: Date.now(),
        instanceId: this.instanceId,
      };

      await this.publisher.publish("cache:invalidate", JSON.stringify(message));
      logger.debug(`[CacheInvalidation] Published invalidation for: ${key}`);
    } catch (error) {
      logger.debug("[CacheInvalidation] Failed to publish invalidation:", error);
    }
  }

  /**
   * Publish pattern invalidation message
   */
  async invalidatePattern(pattern: string): Promise<void> {
    if (!this.isConnected || !this.publisher) {
      return;
    }

    try {
      const message: InvalidationMessage = {
        type: "invalidate_pattern",
        pattern,
        timestamp: Date.now(),
        instanceId: this.instanceId,
      };

      await this.publisher.publish("cache:invalidate", JSON.stringify(message));
      logger.debug(`[CacheInvalidation] Published pattern invalidation: ${pattern}`);
    } catch (error) {
      logger.debug("[CacheInvalidation] Failed to publish pattern invalidation:", error);
    }
  }

  /**
   * Publish clear all message
   */
  async clearAll(): Promise<void> {
    if (!this.isConnected || !this.publisher) {
      return;
    }

    try {
      const message: InvalidationMessage = {
        type: "clear",
        timestamp: Date.now(),
        instanceId: this.instanceId,
      };

      await this.publisher.publish("cache:invalidate", JSON.stringify(message));
      logger.debug("[CacheInvalidation] Published clear all");
    } catch (error) {
      logger.debug("[CacheInvalidation] Failed to publish clear all:", error);
    }
  }

  /**
   * Handle incoming invalidation message
   */
  private handleInvalidationMessage(messageStr: string): void {
    try {
      const message: InvalidationMessage = JSON.parse(messageStr);

      // Ignore messages from this instance (we already invalidated locally)
      if (message.instanceId === this.instanceId) {
        return;
      }

      logger.debug(`[CacheInvalidation] Received invalidation: ${message.type}`);

      switch (message.type) {
        case "invalidate":
          if (message.key) {
            this.notifyHandlers("invalidate", message.key);
          }
          break;

        case "invalidate_pattern":
          if (message.pattern) {
            this.notifyHandlers("invalidate_pattern", message.pattern);
          }
          break;

        case "clear":
          this.notifyHandlers("clear", "");
          break;
      }
    } catch (error) {
      logger.debug("[CacheInvalidation] Error handling message:", error);
    }
  }

  /**
   * Register handler for invalidation events
   */
  onInvalidate(handler: (key: string) => void): void {
    if (!this.invalidationHandlers.has("invalidate")) {
      this.invalidationHandlers.set("invalidate", new Set());
    }
    this.invalidationHandlers.get("invalidate")!.add(handler);
  }

  /**
   * Register handler for pattern invalidation
   */
  onInvalidatePattern(handler: (pattern: string) => void): void {
    if (!this.invalidationHandlers.has("invalidate_pattern")) {
      this.invalidationHandlers.set("invalidate_pattern", new Set());
    }
    this.invalidationHandlers.get("invalidate_pattern")!.add(handler);
  }

  /**
   * Register handler for clear all
   */
  onClear(handler: () => void): void {
    if (!this.invalidationHandlers.has("clear")) {
      this.invalidationHandlers.set("clear", new Set());
    }
    this.invalidationHandlers.get("clear")!.add(handler);
  }

  /**
   * Notify all handlers
   */
  private notifyHandlers(type: string, value: string): void {
    const handlers = this.invalidationHandlers.get(type);
    if (handlers) {
      handlers.forEach(handler => {
        try {
          handler(value);
        } catch (error) {
          logger.debug(`[CacheInvalidation] Handler error:`, error);
        }
      });
    }
  }

  /**
   * Destroy pub/sub connections
   */
  async destroy(): Promise<void> {
    try {
      if (this.publisher) {
        await this.publisher.quit();
        this.publisher = null;
      }
      if (this.subscriber) {
        await this.subscriber.quit();
        this.subscriber = null;
      }
      this.isConnected = false;
      logger.info("[CacheInvalidation] Pub/sub destroyed");
    } catch (error) {
      logger.debug("[CacheInvalidation] Error destroying pub/sub:", error);
    }
  }
}

// Singleton instance
let pubSubInstance: CacheInvalidationPubSub | null = null;

export function initializeCacheInvalidationPubSub(): CacheInvalidationPubSub {
  if (pubSubInstance) {
    return pubSubInstance;
  }
  pubSubInstance = new CacheInvalidationPubSub();
  pubSubInstance.initialize();
  return pubSubInstance;
}

export function getCacheInvalidationPubSub(): CacheInvalidationPubSub {
  if (!pubSubInstance) {
    pubSubInstance = initializeCacheInvalidationPubSub();
  }
  return pubSubInstance;
}
