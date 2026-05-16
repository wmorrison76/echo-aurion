/**
 * Admin Authentication Middleware
 * 
 * Validates ADMIN_TOKEN for sensitive operations
 * Prevents unauthorized access to admin endpoints
 */

import type { RequestHandler } from "express";

/**
 * Middleware to validate admin token
 * Requires ADMIN_TOKEN environment variable to be set
 */
export const requireAdminToken: RequestHandler = (req, res, next) => {
  const adminToken = process.env.ADMIN_TOKEN;
  
  // If ADMIN_TOKEN is not set, reject all admin requests
  if (!adminToken || adminToken.trim() === "") {
    console.error("[ADMIN_AUTH] ADMIN_TOKEN environment variable not set");
    return res.status(500).json({
      error: "Admin authentication not configured. ADMIN_TOKEN environment variable must be set.",
    });
  }

  // Get token from header
  const providedToken = String((req.headers["x-admin-token"] as string) || "");

  // Validate token
  if (!providedToken || providedToken !== adminToken) {
    console.warn("[ADMIN_AUTH] Invalid or missing admin token");
    return res.status(401).json({
      error: "Unauthorized. Valid admin token required.",
    });
  }

  // Token is valid, proceed
  next();
};

/**
 * Validate file path is within allowed directories
 */
export function validateFilePath(filePath: string, allowedDirs: string[]): boolean {
  const path = require("path");
  const resolvedPath = path.resolve(filePath);
  
  return allowedDirs.some((allowedDir) => {
    const resolvedAllowed = path.resolve(allowedDir);
    return resolvedPath.startsWith(resolvedAllowed);
  });
}

/**
 * Rate limiting for admin operations
 * Simple in-memory rate limiter (use Redis in production)
 */
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

export function checkRateLimit(
  identifier: string,
  maxRequests: number = 10,
  windowMs: number = 60000, // 1 minute
): boolean {
  const now = Date.now();
  const record = rateLimitMap.get(identifier);

  if (!record || now > record.resetAt) {
    rateLimitMap.set(identifier, {
      count: 1,
      resetAt: now + windowMs,
    });
    return true;
  }

  if (record.count >= maxRequests) {
    return false;
  }

  record.count++;
  return true;
}

/**
 * Clean up old rate limit records
 */
setInterval(() => {
  const now = Date.now();
  for (const [key, record] of rateLimitMap.entries()) {
    if (now > record.resetAt) {
      rateLimitMap.delete(key);
    }
  }
}, 60000); // Clean up every minute
