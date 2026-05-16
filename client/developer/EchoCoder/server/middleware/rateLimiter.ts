import { Request, Response, NextFunction } from "express";

interface RateLimitConfig {
  windowMs: number; // Time window in milliseconds
  maxRequests: number; // Max requests per window
  keyGenerator?: (req: Request) => string; // Custom key generator
}

interface RateLimitStore {
  [key: string]: {
    count: number;
    resetTime: number;
  };
}

const store: RateLimitStore = {};

// Cleanup old entries every 10 minutes
setInterval(() => {
  const now = Date.now();
  Object.keys(store).forEach((key) => {
    if (store[key].resetTime < now) {
      delete store[key];
    }
  });
}, 10 * 60 * 1000);

export function rateLimiter(config: RateLimitConfig) {
  const { windowMs, maxRequests, keyGenerator } = config;

  return (
    req: Request,
    res: Response,
    next: NextFunction
  ): void => {
    // Generate rate limit key (user ID if authenticated, IP if not)
    let key: string;
    if (keyGenerator) {
      key = keyGenerator(req);
    } else {
      const authHeader = req.headers.authorization;
      if (authHeader && authHeader.startsWith("Bearer ")) {
        // Rate limit by user (from token)
        const token = authHeader.substring(7);
        key = `user:${token.substring(0, 20)}`; // Use first 20 chars of token
      } else {
        // Rate limit by IP
        const ip =
          (req.headers["x-forwarded-for"] as string) ||
          req.socket.remoteAddress ||
          "unknown";
        key = `ip:${ip}`;
      }
    }

    const now = Date.now();

    if (!store[key]) {
      store[key] = {
        count: 1,
        resetTime: now + windowMs,
      };
      return next();
    }

    const entry = store[key];

    // Check if window has expired
    if (now > entry.resetTime) {
      entry.count = 1;
      entry.resetTime = now + windowMs;
      return next();
    }

    // Increment count
    entry.count += 1;

    // Set rate limit headers
    const remaining = Math.max(0, maxRequests - entry.count);
    const resetTime = Math.ceil(entry.resetTime / 1000);

    res.set("X-RateLimit-Limit", maxRequests.toString());
    res.set("X-RateLimit-Remaining", remaining.toString());
    res.set("X-RateLimit-Reset", resetTime.toString());

    // Check if exceeded
    if (entry.count > maxRequests) {
      const retryAfter = Math.ceil((entry.resetTime - now) / 1000);
      res.set("Retry-After", retryAfter.toString());
      res.status(429).json({
        error: "Too many requests",
        retryAfter,
        message: `Rate limit exceeded. Try again in ${retryAfter} seconds.`,
      });
      return;
    }

    next();
  };
}

/**
 * Tier-based rate limiting
 */
export function tierBasedRateLimiter(
  tierLimits: { [key: string]: number } = {
    free: 100,
    starter: 1000,
    professional: 10000,
    enterprise: -1, // Unlimited
  }
) {
  return (req: Request, res: Response, next: NextFunction): void => {
    // Get tier from request (should be set by auth middleware)
    const tier = (req as any).tier || "free";
    const limit = tierLimits[tier];

    if (limit === -1) {
      // Unlimited
      return next();
    }

    return rateLimiter({
      windowMs: 60 * 1000, // 1 minute
      maxRequests: limit,
    })(req, res, next);
  };
}

/**
 * Endpoint-specific rate limiting
 */
const endpointLimits: { [key: string]: RateLimitConfig } = {
  "/api/chat": {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 10,
  },
  "/api/generate": {
    windowMs: 60 * 1000,
    maxRequests: 5,
  },
  "/api/codegen": {
    windowMs: 60 * 1000,
    maxRequests: 3,
  },
  "/api/upload": {
    windowMs: 60 * 1000,
    maxRequests: 2,
  },
};

export function endpointRateLimiter(req: Request, res: Response, next: NextFunction): void {
  const limit = endpointLimits[req.path];
  if (limit) {
    return rateLimiter(limit)(req, res, next);
  }
  next();
}

/**
 * Cost-based rate limiting (for expensive operations)
 */
export function costBasedRateLimiter(
  costFn: (req: Request) => number,
  budgetPerWindow: number = 1000
) {
  const budgetStore: { [key: string]: { used: number; resetTime: number } } =
    {};
  const windowMs = 24 * 60 * 60 * 1000; // 24 hours

  return (req: Request, res: Response, next: NextFunction): void => {
    const key = (req as any).user?.id || req.ip || "unknown";
    const cost = costFn(req);
    const now = Date.now();

    if (!budgetStore[key]) {
      budgetStore[key] = {
        used: 0,
        resetTime: now + windowMs,
      };
    }

    const budget = budgetStore[key];

    // Reset if window expired
    if (now > budget.resetTime) {
      budget.used = 0;
      budget.resetTime = now + windowMs;
    }

    // Check if cost would exceed budget
    if (budget.used + cost > budgetPerWindow) {
      const resetHours = Math.ceil((budget.resetTime - now) / (60 * 60 * 1000));
      res.status(429).json({
        error: "Budget exceeded",
        message: `Your daily API budget is exceeded. Try again in ${resetHours} hours.`,
        resetTime: Math.ceil(budget.resetTime / 1000),
      });
      return;
    }

    budget.used += cost;
    res.set("X-Budget-Used", budget.used.toString());
    res.set("X-Budget-Limit", budgetPerWindow.toString());

    next();
  };
}
