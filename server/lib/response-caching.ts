/**
 * Response Caching
 * 
 * Caches API responses for GET requests to improve performance.
 * Target: p95 <100ms, p99 <500ms
 */

import { Request, Response, NextFunction } from "express";
import { getCache } from "./cache-layer";
import { logger } from "./logger";

export interface CacheOptions {
  ttl?: number; // seconds
  keyGenerator?: (req: Request) => string;
  skipCache?: (req: Request) => boolean;
}

const cache = getCache();

/**
 * Generate cache key from request
 */
function generateCacheKey(req: Request): string {
  const path = req.path;
  const query = Object.keys(req.query)
    .sort()
    .map(key => `${key}=${req.query[key]}`)
    .join("&");
  
  return `response:${path}:${query || "no-query"}`;
}

/**
 * Response caching middleware
 */
export function responseCacheMiddleware(options: CacheOptions = {}) {
  const {
    ttl = 300, // 5 minutes default
    keyGenerator = generateCacheKey,
    skipCache = () => false,
  } = options;

  return async (req: Request, res: Response, next: NextFunction) => {
    // Only cache GET requests
    if (req.method !== "GET") {
      return next();
    }

    // Skip cache if configured
    if (skipCache(req)) {
      return next();
    }

    const cacheKey = keyGenerator(req);

    try {
      // Check cache
      const cached = await cache.get<any>(cacheKey);
      if (cached) {
        logger.debug(`[ResponseCache] HIT: ${cacheKey}`);
        res.setHeader("X-Cache", "HIT");
        return res.json(cached);
      }

      // Store original json function
      const originalJson = res.json.bind(res);

      // Override json to cache response
      res.json = function (body: any) {
        // Cache successful responses
        if (res.statusCode >= 200 && res.statusCode < 300) {
          cache.set(cacheKey, body, "events").catch(error => {
            logger.error("[ResponseCache] Error caching response:", error);
          });
        }

        res.setHeader("X-Cache", "MISS");
        return originalJson(body);
      };

      next();
    } catch (error) {
      logger.error("[ResponseCache] Error in cache middleware:", error);
      next();
    }
  };
}

/**
 * Invalidate response cache
 */
export async function invalidateResponseCache(pattern: string): Promise<void> {
  try {
    await cache.invalidatePattern(new RegExp(`response:${pattern}`));
    logger.debug(`[ResponseCache] Invalidated pattern: ${pattern}`);
  } catch (error) {
    logger.error("[ResponseCache] Error invalidating cache:", error);
  }
}
