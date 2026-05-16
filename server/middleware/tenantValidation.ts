/**
 * PHASE 0: ENTERPRISE FOUNDATION
 * Tenant Validation Middleware
 * Enforces org_id validation on ALL routes
 * Must be registered AFTER auth middleware, BEFORE business logic
 */

import {
  enforceOrgId,
  extractOrgId,
  getUserOrgId,
  getOrgMetadata,
  validateOrgAccess,
} from "../lib/multi-tenant";
import { AppError } from "../lib/errorHandler";
import { logger } from "../lib/logger";
import { extractSessionToken } from "../../client/modules/EchoAurum/server/middleware/session";

/**
 * Main tenant validation middleware
 * Validates org_id on EVERY request that accesses org data
 */
export const tenantValidationMiddleware = async (
  req: any,
  res: any,
  next: any,
) => {
  try {
    // Skip validation for public endpoints (health, ping, etc.)
    if (isPublicEndpoint(req.path)) {
      return next();
    }

    // Extract org_id from request
    const requestOrgId = extractOrgId(req);
    const userOrgId = getUserOrgId(req);

    // Enforce org_id match
    try {
      enforceOrgId(requestOrgId, userOrgId);
    } catch (error) {
      // Log security event
      logger.warn("Tenant validation failed", {
        requestId: req.id,
        path: req.path,
        method: req.method,
        requestOrgId,
        userOrgId: userOrgId || "none",
        error: error instanceof Error ? error.message : "Unknown error",
      });

      if (error instanceof AppError) {
        return res.status(error.statusCode).json({
          error: error.code,
          message: error.message,
          requestId: req.id,
        });
      }

      throw error;
    }

    // Validate org exists and is active
    try {
      const orgMetadata = await getOrgMetadata(userOrgId!);

      if (!orgMetadata.active) {
        throw new AppError(
          "ORG_INACTIVE",
          "Organization is inactive. Please contact support.",
          "WARN",
          403,
          { orgId: userOrgId },
        );
      }

      // Attach org metadata to request for use in routes
      req.org = {
        id: userOrgId,
        tier: orgMetadata.tier,
        active: orgMetadata.active,
      };
    } catch (error) {
      if (error instanceof AppError) {
        logger.warn("Org metadata validation failed", {
          requestId: req.id,
          orgId: userOrgId,
          error: error.message,
        });

        return res.status(error.statusCode).json({
          error: error.code,
          message: error.message,
          requestId: req.id,
        });
      }

      throw error;
    }

    // Log successful validation
    logger.debug("Tenant validation passed", {
      requestId: req.id,
      orgId: userOrgId,
      path: req.path,
      method: req.method,
    });

    next();
  } catch (error) {
    // Catch unexpected errors
    logger.error("Tenant validation error", {
      requestId: req.id,
      path: req.path,
      method: req.method,
      error: error instanceof Error ? error.message : "Unknown",
      stack:
        process.env.NODE_ENV === "development"
          ? (error as Error).stack
          : undefined,
    });

    res.status(500).json({
      error: "VALIDATION_ERROR",
      message: "Unexpected validation error",
      requestId: req.id,
    });
  }
};

/**
 * List of public endpoints that don't require tenant validation
 * These endpoints are accessible without org context
 */
const PUBLIC_ENDPOINTS = [
  "/", // Root path for SPA
  "/health",
  "/health/ready",
  "/health/live",
  "/api/ping",
  "/api/health",
  "/api/module-health", // System module health and validation (no org context needed)
  "/api/avatar/file", // Public avatar images
  "/api/auth", // Authentication endpoints (signup, login, logout, OAuth)
  "/api/tts", // Text-to-speech (public service)
  "/api/weather", // Weather (public service)
  "/api/excel-templates", // Excel template download/upload for ecosystem control
  "/api/help", // Echo Help System (articles, missions, skills)
  "/api/layout/optimize", // EchoLayout optimization service
  "/api/echo-ai3", // EchoAi^3 Unified Brain service
];

/**
 * Paths that start with these prefixes skip strict tenant validation
 * They manage their own org context validation
 */
const SELF_VALIDATING_PREFIXES = ["/api/calendar"];

/**
 * Check if endpoint is public (doesn't require tenant validation)
 */
function normalizeTenantPath(path: string): string {
  if (!path) return path;

  // Keep non-API roots intact
  if (path.startsWith("/api") || path.startsWith("/health")) {
    return path;
  }

  // Many routers are mounted under "/api"; downstream middleware may receive stripped paths
  if (path.startsWith("/")) {
    return `/api${path}`;
  }

  return `/api/${path}`;
}

const isPublicEndpoint = (path: string): boolean => {
  const normalizedPath = normalizeTenantPath(path);

  // Check public endpoints
  if (
    PUBLIC_ENDPOINTS.some((endpoint) => normalizedPath.startsWith(endpoint))
  ) {
    return true;
  }

  // Calendar routes have their own org context middleware - skip global validation
  // This is critical to prevent 401 errors on calendar API calls
  if (normalizedPath.startsWith("/api/calendar")) {
    return true;
  }

  // Check self-validating prefixes (routes that manage their own org context)
  if (
    SELF_VALIDATING_PREFIXES.some((prefix) => normalizedPath.startsWith(prefix))
  ) {
    return true;
  }

  return false;
};

/**
 * Conditional tenant validation middleware
 * Only validates if not a public endpoint
 */
function hasAurumSessionToken(req: any): boolean {
  return Boolean(extractSessionToken(req));
}

function isEchoAurumSessionEndpoint(path: string): boolean {
  const normalizedPath = normalizeTenantPath(path);
  const prefixes = [
    "/api/console",
    "/api/ap",
    "/api/purchasing",
    "/api/aurum",
    "/api/outlets",
    "/api/rules",
    "/api/forecast",
  ];

  return prefixes.some((prefix) => normalizedPath.startsWith(prefix));
}

export const conditionalTenantValidation = async (
  req: any,
  res: any,
  next: any,
) => {
  const requestPath =
    typeof req.originalUrl === "string" && req.originalUrl.length > 0
      ? req.originalUrl
      : req.path;

  if (isPublicEndpoint(requestPath)) {
    return next();
  }

  if (isEchoAurumSessionEndpoint(requestPath) && hasAurumSessionToken(req)) {
    return next();
  }

  return tenantValidationMiddleware(req, res, next);
};

/**
 * Strict tenant validation middleware
 * ALWAYS validates org_id, even for authenticated-only endpoints
 * Use this for routes that definitely need org context
 */
export const strictTenantValidation = (req: any, res: any, next: any) => {
  try {
    const requestOrgId = extractOrgId(req);
    const userOrgId = getUserOrgId(req);

    enforceOrgId(requestOrgId, userOrgId);

    // Attach org context
    req.org = {
      id: userOrgId,
    };

    next();
  } catch (error) {
    if (error instanceof AppError) {
      return res.status(error.statusCode).json({
        error: error.code,
        message: error.message,
        requestId: req.id,
      });
    }

    res.status(500).json({
      error: "VALIDATION_ERROR",
      message: "Unexpected validation error",
      requestId: req.id,
    });
  }
};
