/**
 * CSRF Protection Middleware
 * ==========================
 * Implements Cross-Site Request Forgery protection for LUCCCA.
 * 
 * Phase 1 Critical Fix: MF-003 Security Vulnerabilities
 * 
 * Features:
 * - Double-submit cookie pattern
 * - Token validation
 * - Origin/Referer checking
 * - Same-site cookie enforcement
 */

import { Request, Response, NextFunction } from 'express';
import * as crypto from 'crypto';
import { logger } from '../lib/logger.js';

// ============================================================================
// CONFIGURATION
// ============================================================================

interface CSRFConfig {
  cookieName: string;
  headerName: string;
  tokenLength: number;
  cookieMaxAge: number;
  ignoreMethods: string[];
  ignorePaths: string[];
  secure: boolean;
  sameSite: 'strict' | 'lax' | 'none';
}

const defaultConfig: CSRFConfig = {
  cookieName: 'XSRF-TOKEN',
  headerName: 'X-XSRF-TOKEN',
  tokenLength: 32,
  cookieMaxAge: 24 * 60 * 60 * 1000, // 24 hours
  ignoreMethods: ['GET', 'HEAD', 'OPTIONS'],
  ignorePaths: [
    '/api/health',
    '/api/auth/login',
    '/api/auth/register',
    '/api/auth/refresh',
    '/api/webhooks',
  ],
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax',
};

// ============================================================================
// TOKEN GENERATION
// ============================================================================

function generateToken(length: number = 32): string {
  return crypto.randomBytes(length).toString('hex');
}

function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

// ============================================================================
// CSRF MIDDLEWARE
// ============================================================================

export function csrfProtection(config: Partial<CSRFConfig> = {}) {
  const cfg: CSRFConfig = { ...defaultConfig, ...config };

  return (req: Request, res: Response, next: NextFunction) => {
    // Skip ignored methods
    if (cfg.ignoreMethods.includes(req.method.toUpperCase())) {
      return setTokenCookie(req, res, cfg, next);
    }

    // Skip ignored paths
    if (cfg.ignorePaths.some(path => req.path.startsWith(path))) {
      return next();
    }

    // Get token from cookie and header
    const cookieToken = req.cookies?.[cfg.cookieName];
    const headerToken = req.headers[cfg.headerName.toLowerCase()] as string;

    // Validate tokens exist
    if (!cookieToken || !headerToken) {
      logger.warn('[CSRF] Missing token', {
        path: req.path,
        ip: req.ip,
        hasCookie: !!cookieToken,
        hasHeader: !!headerToken,
      });
      return res.status(403).json({
        error: 'CSRF token missing',
        code: 'CSRF_TOKEN_MISSING',
      });
    }

    // Validate tokens match (double-submit cookie pattern)
    if (hashToken(cookieToken) !== hashToken(headerToken)) {
      logger.warn('[CSRF] Token mismatch', {
        path: req.path,
        ip: req.ip,
      });
      return res.status(403).json({
        error: 'CSRF token invalid',
        code: 'CSRF_TOKEN_INVALID',
      });
    }

    // Validate Origin/Referer header
    if (!validateOrigin(req)) {
      logger.warn('[CSRF] Origin validation failed', {
        path: req.path,
        ip: req.ip,
        origin: req.headers.origin,
        referer: req.headers.referer,
      });
      return res.status(403).json({
        error: 'Origin not allowed',
        code: 'CSRF_ORIGIN_INVALID',
      });
    }

    // Token valid, continue
    setTokenCookie(req, res, cfg, next);
  };
}

/**
 * Set CSRF token cookie if not present or expired
 */
function setTokenCookie(
  req: Request,
  res: Response,
  cfg: CSRFConfig,
  next: NextFunction
): void {
  const existingToken = req.cookies?.[cfg.cookieName];

  if (!existingToken) {
    const newToken = generateToken(cfg.tokenLength);
    
    res.cookie(cfg.cookieName, newToken, {
      httpOnly: false, // Must be accessible by JavaScript
      secure: cfg.secure,
      sameSite: cfg.sameSite,
      maxAge: cfg.cookieMaxAge,
      path: '/',
    });

    // Also set in response header for SPA convenience
    res.setHeader(cfg.headerName, newToken);
  }

  next();
}

/**
 * Validate Origin or Referer header
 */
function validateOrigin(req: Request): boolean {
  const origin = req.headers.origin;
  const referer = req.headers.referer;
  const host = req.headers.host;

  // In development, allow localhost
  if (process.env.NODE_ENV !== 'production') {
    return true;
  }

  // Check Origin header first (preferred)
  if (origin) {
    try {
      const originUrl = new URL(origin);
      const hostWithoutPort = host?.split(':')[0];
      return originUrl.hostname === hostWithoutPort;
    } catch {
      return false;
    }
  }

  // Fall back to Referer header
  if (referer) {
    try {
      const refererUrl = new URL(referer);
      const hostWithoutPort = host?.split(':')[0];
      return refererUrl.hostname === hostWithoutPort;
    } catch {
      return false;
    }
  }

  // No Origin or Referer - reject in production
  return process.env.NODE_ENV !== 'production';
}

// ============================================================================
// CSRF TOKEN ENDPOINT
// ============================================================================

/**
 * Endpoint to get CSRF token for SPA initialization
 */
export function csrfTokenEndpoint(config: Partial<CSRFConfig> = {}) {
  const cfg: CSRFConfig = { ...defaultConfig, ...config };

  return (req: Request, res: Response) => {
    const token = generateToken(cfg.tokenLength);

    res.cookie(cfg.cookieName, token, {
      httpOnly: false,
      secure: cfg.secure,
      sameSite: cfg.sameSite,
      maxAge: cfg.cookieMaxAge,
      path: '/',
    });

    res.json({ 
      token,
      headerName: cfg.headerName,
      cookieName: cfg.cookieName,
    });
  };
}

// ============================================================================
// INPUT SANITIZATION
// ============================================================================

/**
 * Sanitize input to prevent XSS and injection attacks
 */
export function sanitizeInput(input: string): string {
  if (typeof input !== 'string') return input;

  return input
    // Remove HTML tags
    .replace(/<[^>]*>/g, '')
    // Escape special characters
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;')
    // Remove potential SQL injection patterns
    .replace(/(\b(SELECT|INSERT|UPDATE|DELETE|DROP|UNION|ALTER|CREATE|TRUNCATE)\b)/gi, '')
    // Limit length
    .substring(0, 10000);
}

/**
 * Deep sanitize object
 */
export function sanitizeObject(obj: any): any {
  if (typeof obj === 'string') {
    return sanitizeInput(obj);
  }
  
  if (Array.isArray(obj)) {
    return obj.map(sanitizeObject);
  }
  
  if (obj && typeof obj === 'object') {
    const sanitized: any = {};
    for (const [key, value] of Object.entries(obj)) {
      sanitized[sanitizeInput(key)] = sanitizeObject(value);
    }
    return sanitized;
  }
  
  return obj;
}

/**
 * Input sanitization middleware
 */
export function inputSanitizationMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
) {
  // Sanitize body
  if (req.body && typeof req.body === 'object') {
    req.body = sanitizeObject(req.body);
  }

  // Sanitize query parameters
  if (req.query && typeof req.query === 'object') {
    req.query = sanitizeObject(req.query) as any;
  }

  // Sanitize params
  if (req.params && typeof req.params === 'object') {
    req.params = sanitizeObject(req.params);
  }

  next();
}

// ============================================================================
// ADMIN TOKEN VALIDATION
// ============================================================================

/**
 * Validate admin token for sensitive operations
 */
export function adminTokenValidation(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const adminToken = req.headers['x-admin-token'] as string;
  const expectedToken = process.env.ADMIN_API_TOKEN;

  // Skip if no admin token configured (development)
  if (!expectedToken && process.env.NODE_ENV !== 'production') {
    logger.warn('[AdminAuth] No admin token configured, allowing request in development');
    return next();
  }

  // Require admin token in production
  if (!adminToken) {
    logger.warn('[AdminAuth] Missing admin token', {
      path: req.path,
      ip: req.ip,
    });
    return res.status(401).json({
      error: 'Admin authentication required',
      code: 'ADMIN_AUTH_REQUIRED',
    });
  }

  // Constant-time comparison to prevent timing attacks
  if (!timingSafeEqual(adminToken, expectedToken || '')) {
    logger.warn('[AdminAuth] Invalid admin token', {
      path: req.path,
      ip: req.ip,
    });
    return res.status(403).json({
      error: 'Invalid admin token',
      code: 'ADMIN_AUTH_INVALID',
    });
  }

  next();
}

/**
 * Timing-safe string comparison
 */
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) {
    // Still do comparison to maintain constant time
    const dummy = crypto.createHash('sha256').update(a).digest();
    crypto.createHash('sha256').update(b).digest();
    return false;
  }
  
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  return crypto.timingSafeEqual(bufA, bufB);
}

// ============================================================================
// RATE LIMITING FOR SENSITIVE ENDPOINTS
// ============================================================================

interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
  keyGenerator: (req: Request) => string;
}

const rateLimitStore = new Map<string, { count: number; resetAt: number }>();

/**
 * Enhanced rate limiting for auth endpoints
 */
export function authRateLimiting(config: Partial<RateLimitConfig> = {}) {
  const cfg: RateLimitConfig = {
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 5, // 5 failed attempts
    keyGenerator: (req) => `${req.ip}:${req.body?.email || 'unknown'}`,
    ...config,
  };

  return (req: Request, res: Response, next: NextFunction) => {
    const key = cfg.keyGenerator(req);
    const now = Date.now();

    let record = rateLimitStore.get(key);
    
    if (!record || now > record.resetAt) {
      record = { count: 1, resetAt: now + cfg.windowMs };
      rateLimitStore.set(key, record);
      return next();
    }

    record.count++;

    if (record.count > cfg.maxRequests) {
      logger.warn('[RateLimit] Auth rate limit exceeded', {
        key,
        count: record.count,
        ip: req.ip,
      });

      return res.status(429).json({
        error: 'Too many attempts. Please try again later.',
        code: 'RATE_LIMIT_EXCEEDED',
        retryAfter: Math.ceil((record.resetAt - now) / 1000),
      });
    }

    next();
  };
}

/**
 * Clear successful auth from rate limit
 */
export function clearAuthRateLimit(req: Request): void {
  const key = `${req.ip}:${req.body?.email || 'unknown'}`;
  rateLimitStore.delete(key);
}

// ============================================================================
// EXPORTS
// ============================================================================

export default {
  csrfProtection,
  csrfTokenEndpoint,
  sanitizeInput,
  sanitizeObject,
  inputSanitizationMiddleware,
  adminTokenValidation,
  authRateLimiting,
  clearAuthRateLimit,
};
