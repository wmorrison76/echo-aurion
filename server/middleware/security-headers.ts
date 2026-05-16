/**
 * Security Headers Middleware
 * Implements enterprise-grade security headers and validation
 * Compliant with OWASP Top 10 and security best practices
 */

import { Request, Response, NextFunction } from "express";
import { logger } from "../lib/logger";

/**
 * Set critical security headers
 */
export function securityHeadersMiddleware(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  // Content Security Policy - Prevent XSS and injection attacks
  res.setHeader(
    "Content-Security-Policy",
    [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.jsdelivr.net https://unpkg.com",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "font-src 'self' https://fonts.gstatic.com",
      "img-src 'self' data: https:",
      "connect-src 'self' https://api.neon.tech https://api.supabase.co",
      "frame-ancestors 'self'",
      "base-uri 'self'",
    ].join("; "),
  );

  // X-Frame-Options - Prevent clickjacking
  res.setHeader("X-Frame-Options", "SAMEORIGIN");

  // X-Content-Type-Options - Prevent MIME sniffing
  res.setHeader("X-Content-Type-Options", "nosniff");

  // X-XSS-Protection - Legacy XSS protection
  res.setHeader("X-XSS-Protection", "1; mode=block");

  // Referrer-Policy - Control referrer information
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");

  // Permissions-Policy - Control browser features
  res.setHeader(
    "Permissions-Policy",
    "geolocation=(), microphone=(), camera=(), payment=()",
  );

  // Strict-Transport-Security - Force HTTPS
  if (process.env.NODE_ENV === "production") {
    res.setHeader(
      "Strict-Transport-Security",
      "max-age=31536000; includeSubDomains; preload",
    );
  }

  // Remove Server header (don't reveal tech stack)
  res.removeHeader("Server");
  res.removeHeader("X-Powered-By");

  next();
}

/**
 * Input validation middleware - Sanitize and validate request data
 */
export function inputValidationMiddleware(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  // Validate content-type for POST/PUT
  if (["POST", "PUT", "PATCH"].includes(req.method)) {
    const contentType = req.get("content-type");
    if (!contentType || !contentType.includes("application/json")) {
      logger.warn(
        `[Security] Invalid content-type: ${contentType} from ${req.ip}`,
      );
      return res.status(415).json({
        error: "Content-Type must be application/json",
      });
    }

    // Check request size (prevent large payload attacks)
    if (req.get("content-length")) {
      const size = parseInt(req.get("content-length") || "0");
      const maxSize = 10 * 1024 * 1024; // 10MB
      if (size > maxSize) {
        logger.warn(
          `[Security] Request too large: ${size} bytes from ${req.ip}`,
        );
        return res.status(413).json({
          error: "Payload too large",
        });
      }
    }
  }

  // Validate org context for API routes
  if (req.path.startsWith("/api/")) {
    const orgId = req.headers["x-org-id"] as string | undefined;
    if (!orgId && req.path !== "/api/auth" && req.path !== "/api/health") {
      // Extract from JWT if present
      const auth = req.headers.authorization?.replace("Bearer ", "");
      if (!auth) {
        logger.warn(
          `[Security] Missing org context for ${req.path} from ${req.ip}`,
        );
        return res.status(401).json({
          error: "Missing organization context",
        });
      }
    }
  }

  next();
}

/**
 * Rate limiting by user/IP for API endpoints
 */
export function apiRateLimitMiddleware(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  // Get identifier (user ID or IP)
  const identifier = req.user?.id || req.ip || "unknown";
  const key = `ratelimit:${identifier}`;

  // Store in session/memory (in production, use Redis)
  if (!req.app.locals.rateLimitMap) {
    req.app.locals.rateLimitMap = new Map();
  }

  const map = req.app.locals.rateLimitMap;
  const now = Date.now();
  const limit = 100; // requests
  const window = 60000; // 1 minute

  if (!map.has(key)) {
    map.set(key, { count: 1, resetAt: now + window });
  } else {
    const data = map.get(key);
    if (now > data.resetAt) {
      data.count = 1;
      data.resetAt = now + window;
    } else {
      data.count++;
      if (data.count > limit) {
        logger.warn(
          `[Security] Rate limit exceeded for ${identifier} on ${req.path}`,
        );
        return res.status(429).json({
          error: "Too many requests",
          retryAfter: Math.ceil((data.resetAt - now) / 1000),
        });
      }
    }
  }

  // Set rate limit headers
  res.setHeader("X-RateLimit-Limit", limit);
  res.setHeader("X-RateLimit-Remaining", limit - map.get(key).count);
  res.setHeader(
    "X-RateLimit-Reset",
    new Date(map.get(key).resetAt).toISOString(),
  );

  next();
}

/**
 * Validate critical parameters
 */
export function parameterValidationMiddleware(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  // Validate UUID parameters
  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

  // Check URL parameters
  for (const [key, value] of Object.entries(req.params)) {
    if (
      key.includes("id") &&
      typeof value === "string" &&
      value.length === 36
    ) {
      if (!uuidRegex.test(value)) {
        logger.warn(`[Security] Invalid UUID format: ${key}=${value}`);
        return res.status(400).json({
          error: `Invalid ${key} format`,
        });
      }
    }
  }

  // Validate query parameters (prevent injection)
  for (const [key, value] of Object.entries(req.query)) {
    if (typeof value === "string") {
      // Check for SQL injection patterns
      if (/['";\\]/g.test(value)) {
        logger.warn(`[Security] Suspicious query parameter: ${key}=${value}`);
        return res.status(400).json({
          error: "Invalid query parameter",
        });
      }

      // Length validation
      if (value.length > 1000) {
        logger.warn(`[Security] Query parameter too long: ${key}`);
        return res.status(400).json({
          error: "Query parameter too long",
        });
      }
    }
  }

  next();
}

/**
 * Audit logging middleware
 */
export function auditLoggingMiddleware(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  const start = Date.now();
  const userId = req.user?.id;
  const orgId = req.user?.org_id;

  // Capture response
  const originalSend = res.send;
  res.send = function (data) {
    const duration = Date.now() - start;

    // Log security-relevant operations
    if (
      ["POST", "PUT", "DELETE"].includes(req.method) &&
      req.path.startsWith("/api/")
    ) {
      logger.info(`[Audit] ${req.method} ${req.path}`, {
        userId,
        orgId,
        statusCode: res.statusCode,
        duration,
        ip: req.ip,
      });
    }

    // Log failed auth attempts
    if (res.statusCode === 401 || res.statusCode === 403) {
      logger.warn(`[Security] Access denied: ${req.method} ${req.path}`, {
        userId,
        orgId,
        statusCode: res.statusCode,
        ip: req.ip,
      });
    }

    return originalSend.call(this, data);
  };

  next();
}

/**
 * CORS configuration - Restrict cross-origin requests
 */
export const corsConfig = {
  origin:
    process.env.NODE_ENV === "production"
      ? (process.env.ALLOWED_ORIGINS || "").split(",")
      : ["http://localhost:8080", "http://localhost:3000"],
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "X-Org-Id", "X-Request-Id"],
  maxAge: 86400,
};

export default {
  securityHeadersMiddleware,
  inputValidationMiddleware,
  apiRateLimitMiddleware,
  parameterValidationMiddleware,
  auditLoggingMiddleware,
  corsConfig,
};
