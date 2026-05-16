import { Request, Response, NextFunction } from "express";

interface RateLimitConfig {
  windowMs: number; // Time window in milliseconds
  max: number; // Max requests per window
  keyGenerator?: (req: Request) => string; // Custom key function
  message?: string;
  statusCode?: number;
}

interface RequestRecord {
  count: number;
  resetTime: number;
}

/**
 * Simple in-memory rate limiting middleware
 * For production with multiple instances, use Redis-based solution
 */
class RateLimiter {
  private requests: Map<string, RequestRecord> = new Map();
  private windowMs: number;
  private max: number;
  private keyGenerator: (req: Request) => string;
  private message: string;
  private statusCode: number;

  constructor(config: RateLimitConfig) {
    this.windowMs = config.windowMs || 60 * 1000; // 1 minute default
    this.max = config.max || 100;
    this.keyGenerator = config.keyGenerator || ((req: Request) => req.ip || "unknown");
    this.message = config.message || "Too many requests, please try again later";
    this.statusCode = config.statusCode || 429;

    // Clean up old entries every 10 minutes
    setInterval(() => this.cleanup(), 10 * 60 * 1000);
  }

  middleware() {
    return (req: Request, res: Response, next: NextFunction) => {
      const key = this.keyGenerator(req);
      const now = Date.now();
      const record = this.requests.get(key);

      if (!record || now > record.resetTime) {
        // New window or reset
        this.requests.set(key, {
          count: 1,
          resetTime: now + this.windowMs,
        });
        res.set("X-RateLimit-Limit", this.max.toString());
        res.set("X-RateLimit-Remaining", (this.max - 1).toString());
        res.set("X-RateLimit-Reset", Math.ceil(record?.resetTime / 1000).toString());
        next();
      } else if (record.count < this.max) {
        // Within limits
        record.count++;
        res.set("X-RateLimit-Limit", this.max.toString());
        res.set("X-RateLimit-Remaining", (this.max - record.count).toString());
        res.set("X-RateLimit-Reset", Math.ceil(record.resetTime / 1000).toString());
        next();
      } else {
        // Rate limit exceeded
        res.set("X-RateLimit-Limit", this.max.toString());
        res.set("X-RateLimit-Remaining", "0");
        res.set("X-RateLimit-Reset", Math.ceil(record.resetTime / 1000).toString());
        res.set("Retry-After", Math.ceil((record.resetTime - now) / 1000).toString());

        res.status(this.statusCode).json({
          success: false,
          error: this.message,
          retryAfter: Math.ceil((record.resetTime - now) / 1000),
        });
      }
    };
  }

  private cleanup() {
    const now = Date.now();
    const expired: string[] = [];

    for (const [key, record] of this.requests.entries()) {
      if (now > record.resetTime) {
        expired.push(key);
      }
    }

    expired.forEach((key) => this.requests.delete(key));
  }
}

/**
 * Create a new rate limiter with given config
 */
export function createRateLimiter(config: RateLimitConfig) {
  const limiter = new RateLimiter(config);
  return limiter.middleware();
}

/**
 * Pre-configured limiters for different tiers
 */

// Tier 1: Standard tier (100 requests per minute per user/IP)
export const tier1Limiter = createRateLimiter({
  windowMs: 60 * 1000,
  max: 100,
  keyGenerator: (req: Request) => (req as any).user?.id || req.ip || "unknown",
  message: "Tier 1: Too many requests, please try again later",
});

// Tier 2: Enterprise tier (50 requests per minute per workspace)
export const tier2Limiter = createRateLimiter({
  windowMs: 60 * 1000,
  max: 50,
  keyGenerator: (req: Request) =>
    (req as any).workspaceId || (req as any).user?.id || req.ip || "unknown",
  message: "Tier 2: Too many requests, please try again later",
});

// Tier 3: Security tier (30 requests per minute per workspace)
export const tier3Limiter = createRateLimiter({
  windowMs: 60 * 1000,
  max: 30,
  keyGenerator: (req: Request) =>
    (req as any).workspaceId || (req as any).user?.id || req.ip || "unknown",
  message: "Tier 3: Too many requests, please try again later",
});

// Tier 4: Advanced tier (20 requests per minute per workspace)
export const tier4Limiter = createRateLimiter({
  windowMs: 60 * 1000,
  max: 20,
  keyGenerator: (req: Request) =>
    (req as any).workspaceId || (req as any).user?.id || req.ip || "unknown",
  message: "Tier 4: Too many requests, please try again later",
});

// Strict limiter for auth endpoints (5 per minute per IP)
export const authLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  max: 5,
  keyGenerator: (req: Request) => req.ip || "unknown",
  message: "Too many auth attempts, please try again later",
});

// Webhook limiter (100 per minute per workspace)
export const webhookLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  max: 100,
  keyGenerator: (req: Request) => (req as any).workspaceId || req.ip || "unknown",
  message: "Too many webhook events, please try again later",
});
