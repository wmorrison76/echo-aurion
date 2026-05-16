/**
 * PHASE 0: ENTERPRISE FOUNDATION - Day 3 Task 1
 * Rate Limiting Middleware
 * 
 * Features:
 * - Per-organization rate limiting (prevents one customer from affecting others)
 * - Tiered limits: standard (1000 req/min) vs enterprise (5000 req/min)
 * - In-memory storage for Phase 0 (can swap for Redis in Phase 1)
 * - Graceful degradation with 429 (Too Many Requests) response
 * - Exempt internal/webhook endpoints
 * - Automatic window reset every 60 seconds
 */

import type { NextFunction, Request, Response } from "express";
import { createClient, type RedisClientType } from "redis";
import { logger } from "../lib/logger";

/**
 * Rate limit storage (in-memory for Phase 0)
 * Format: { orgId: { count: number, resetTime: timestamp } }
 * In Phase 1, replace with Redis for distributed systems
 */
const rateLimitStore = new Map<
  string,
  {
    count: number;
    resetTime: number;
  }
>();

let redisClient: RedisClientType | null = null;
let redisClientInit: Promise<RedisClientType | null> | null = null;

type RateLimitRequest = Request & {
  id?: string;
  user?: { org_id?: string };
  org?: { id?: string; tier?: string };
};

async function getRedisClient(): Promise<RedisClientType | null> {
  if (!process.env.REDIS_URL) {
    return null;
  }

  if (redisClient?.isOpen) {
    return redisClient;
  }

  if (!redisClientInit) {
    redisClientInit = (async () => {
      try {
        const client = createClient({ url: process.env.REDIS_URL });
        client.on("error", (error) => {
          logger.error("Redis rate limit client error", {
            error: error instanceof Error ? error.message : String(error),
          });
        });
        await client.connect();
        redisClient = client;
        return client;
      } catch (error) {
        logger.warn("Redis rate limit client unavailable", {
          error: error instanceof Error ? error.message : String(error),
        });
        redisClient = null;
        return null;
      } finally {
        redisClientInit = null;
      }
    })();
  }

  return redisClientInit;
}

/**
 * Get the rate limit for an organization based on tier
 */
const getRateLimit = (tier: string = 'standard'): number => {
  switch (tier) {
    case 'enterprise':
      return 5000; // 5000 requests per minute
    case 'premium':
      return 3000; // 3000 requests per minute
    case 'standard':
    default:
      return 1000; // 1000 requests per minute
  }
};

async function incrementRateLimitWithRedis(
  orgId: string,
  tier: string = 'standard',
): Promise<{ count: number; resetTime: number; limit: number } | null> {
  const client = await getRedisClient();
  if (!client) {
    return null;
  }

  const limit = getRateLimit(tier);
  const key = `rate-limit:${orgId}`;
  const count = await client.incr(key);

  if (count === 1) {
    await client.expire(key, 60);
  }

  const ttl = await client.ttl(key);
  const resetTime = Date.now() + Math.max(ttl, 0) * 1000;

  return { count, resetTime, limit };
}

async function getRedisRateLimitData(
  orgId: string,
  tier: string = 'standard',
): Promise<{ count: number; resetTime: number; limit: number } | null> {
  const client = await getRedisClient();
  if (!client) {
    return null;
  }

  const limit = getRateLimit(tier);
  const key = `rate-limit:${orgId}`;
  const count = Number((await client.get(key)) || 0);
  const ttl = await client.ttl(key);

  if (!count) {
    return {
      count: 0,
      resetTime: Date.now() + 60 * 1000,
      limit,
    };
  }

  return {
    count,
    resetTime: Date.now() + Math.max(ttl, 0) * 1000,
    limit,
  };
}

/**
 * Get or initialize rate limit data for an org
 */
const getRateLimitData = (
  orgId: string,
  tier: string = 'standard'
): { count: number; resetTime: number; limit: number } => {
  const now = Date.now();
  let data = rateLimitStore.get(orgId);

  // Initialize or reset if window expired
  if (!data || now >= data.resetTime) {
    data = {
      count: 0,
      resetTime: now + 60 * 1000, // 60-second window
    };
    rateLimitStore.set(orgId, data);
  }

  const limit = getRateLimit(tier);
  return { ...data, limit };
};

/**
 * Increment rate limit counter for an org
 */
const incrementRateLimit = (orgId: string): number => {
  const data = rateLimitStore.get(orgId);

  if (!data) {
    rateLimitStore.set(orgId, {
      count: 1,
      resetTime: Date.now() + 60 * 1000,
    });
    return 1;
  }

  data.count++;
  return data.count;
};

/**
 * Endpoints that are exempt from rate limiting
 * Usually: health checks, internal services, webhooks
 */
const EXEMPT_ENDPOINTS = [
  '/health',
  '/health/ready',
  '/health/live',
  '/api/ping',
  '/api/health',
  '/api/health-check',
  '/webhooks/', // all webhook endpoints
];

/**
 * Check if an endpoint is exempt from rate limiting
 */
const isExemptEndpoint = (path: string): boolean => {
  return EXEMPT_ENDPOINTS.some((endpoint) => path.startsWith(endpoint));
};

/**
 * Main rate limiting middleware
 */
export const rateLimitingMiddleware = (
  req: RateLimitRequest,
  res: Response,
  next: NextFunction,
) => {
  void (async () => {
    try {
      // Skip rate limiting for exempt endpoints
      if (isExemptEndpoint(req.path)) {
        next();
        return;
      }

      // Get org_id from request (already set by tenant validation middleware)
      const orgId = req.user?.org_id || req.org?.id;

      if (!orgId) {
        // No org context, skip rate limiting (will be caught by tenant validation)
        next();
        return;
      }

      const orgTier = req.org?.tier || 'standard';
      const rateLimitData = await incrementRateLimitWithRedis(orgId, orgTier);
      const currentCount = rateLimitData
        ? rateLimitData.count
        : incrementRateLimit(orgId);
      const effectiveRateLimitData = rateLimitData || getRateLimitData(orgId, orgTier);

      // Add rate limit headers to response
      res.set({
        'X-RateLimit-Limit': effectiveRateLimitData.limit.toString(),
        'X-RateLimit-Remaining': Math.max(0, effectiveRateLimitData.limit - currentCount).toString(),
        'X-RateLimit-Reset': Math.ceil(effectiveRateLimitData.resetTime / 1000).toString(),
      });

      // Check if limit exceeded
      if (currentCount > effectiveRateLimitData.limit) {
        const retryAfter = Math.ceil((effectiveRateLimitData.resetTime - Date.now()) / 1000);

        logger.warn('Rate limit exceeded', {
          requestId: req.id,
          orgId,
          tier: orgTier,
          limit: effectiveRateLimitData.limit,
          current: currentCount,
          path: req.path,
          method: req.method,
          retryAfter,
        });

        res.set('Retry-After', retryAfter.toString());
        res.status(429).json({
          error: 'RATE_LIMIT_EXCEEDED',
          message: `Rate limit exceeded. You have exceeded the ${effectiveRateLimitData.limit} requests per minute limit.`,
          requestId: req.id,
          retryAfter,
        });
        return;
      }

      // Request is within limit
      next();
    } catch (error) {
      // If rate limiting fails, allow request to continue
      logger.error('Rate limiting error', {
        requestId: req.id,
        error: error instanceof Error ? error.message : 'Unknown',
        path: req.path,
      });
      next();
    }
  })().catch((error) => {
    logger.error('Rate limiting fatal error', {
      requestId: req.id,
      error: error instanceof Error ? error.message : 'Unknown',
      path: req.path,
    });
    next();
  });
};

/**
 * Sliding window rate limiting (alternative implementation)
 * More accurate but uses more memory
 * Uncomment and use if needed for Phase 1
 */
// const requestTimestamps = new Map<string, number[]>();
//
// export const slidingWindowRateLimiting = (req: any, res: any, next: any) => {
//   const orgId = req.user?.org_id;
//   if (!orgId) return next();
//
//   const now = Date.now();
//   const windowStart = now - 60 * 1000;
//   const tier = req.org?.tier || 'standard';
//   const limit = getRateLimit(tier);
//
//   // Get or create timestamp array
//   let timestamps = requestTimestamps.get(orgId) || [];
//
//   // Remove timestamps outside the window
//   timestamps = timestamps.filter((ts) => ts > windowStart);
//
//   if (timestamps.length >= limit) {
//     const retryAfter = Math.ceil((timestamps[0] + 60 * 1000 - now) / 1000);
//     res.set('Retry-After', retryAfter.toString());
//     return res.status(429).json({
//       error: 'RATE_LIMIT_EXCEEDED',
//       message: 'Rate limit exceeded',
//       retryAfter,
//     });
//   }
//
//   timestamps.push(now);
//   requestTimestamps.set(orgId, timestamps);
//   next();
// };

/**
 * Get rate limit status for an org (useful for debugging)
 */
export const getRateLimitStatus = async (orgId: string, tier: string = 'standard') => {
  const redisData = await getRedisRateLimitData(orgId, tier);
  if (redisData) {
    const remaining = Math.max(0, redisData.limit - redisData.count);
    const windowResetSeconds = Math.max(0, Math.ceil((redisData.resetTime - Date.now()) / 1000));
    const percentage = Math.round((redisData.count / redisData.limit) * 100);

    return {
      orgId,
      tier,
      limit: redisData.limit,
      current: redisData.count,
      remaining,
      windowResetSeconds,
      percentage,
    };
  }

  const data = rateLimitStore.get(orgId);
  const limit = getRateLimit(tier);

  if (!data) {
    return {
      orgId,
      tier,
      limit,
      current: 0,
      remaining: limit,
      windowResetSeconds: 60,
      percentage: 0,
    };
  }

  const now = Date.now();
  const remaining = Math.max(0, limit - data.count);
  const windowResetSeconds = Math.ceil((data.resetTime - now) / 1000);
  const percentage = Math.round((data.count / limit) * 100);

  return {
    orgId,
    tier,
    limit,
    current: data.count,
    remaining,
    windowResetSeconds,
    percentage,
  };
};

/**
 * Clear rate limit for an org (useful for admin functions)
 */
export const clearRateLimit = async (orgId: string): Promise<void> => {
  rateLimitStore.delete(orgId);

  const client = await getRedisClient();
  if (client) {
    await client.del(`rate-limit:${orgId}`);
  }

  logger.info('Rate limit cleared', { orgId });
};

/**
 * Clear all rate limits (useful for system resets)
 */
export const clearAllRateLimits = async (): Promise<void> => {
  rateLimitStore.clear();

  const client = await getRedisClient();
  if (client) {
    const keys = await client.keys('rate-limit:*');
    for (const key of keys) {
      await client.del(key);
    }
  }

  logger.info('All rate limits cleared');
};

/**
 * Get metrics for all orgs (for monitoring)
 */
export const getRateLimitMetrics = () => {
  const metrics = {
    totalOrgs: rateLimitStore.size,
    orgStatuses: [] as Array<{ orgId: string; current: number; limit: number }>,
  };

  rateLimitStore.forEach((data, orgId) => {
    const limit = getRateLimit('standard');
    metrics.orgStatuses.push({
      orgId,
      current: data.count,
      limit,
    });
  });

  return metrics;
};
