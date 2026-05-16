/**
 * PHASE 0: ENTERPRISE FOUNDATION
 * Basic Authentication Middleware
 * Extracts org_id from headers (for Phase 0 testing)
 * In Phase 1, this will use JWT tokens with organization context
 */

import { AppError, UnauthorizedError } from "../lib/errorHandler";
import { logger } from "../lib/logger";

/**
 * Simple auth middleware for Phase 0
 * Expects org_id in X-Org-ID header (or x-org-id)
 * In production, this will use JWT tokens
 */
export const basicAuthMiddleware = (req: any, res: any, next: any) => {
  try {
    // Public endpoints that don't require auth
    const publicPaths = ["/api/avatar/file"];
    if (publicPaths.some((path) => req.path.startsWith(path))) {
      return next();
    }

    // Extract org_id from header (Express normalizes headers to lowercase)
    const orgId = req.headers["x-org-id"];

    // For Phase 0, we require org_id to be present
    // In Phase 1, this will extract from JWT token
    if (!orgId) {
      throw new UnauthorizedError(
        "X-Org-ID header is required (Phase 0 testing mode)",
        {
          requiredHeader: "X-Org-ID",
        },
      );
    }

    // In Phase 0, set up a minimal user context
    // In Phase 1, this will be decoded from JWT and include user_id, role, etc.
    req.user = {
      org_id: orgId,
      id: "test-user", // TODO: Extract from JWT in Phase 1
      role: "admin", // TODO: Extract from JWT in Phase 1
    };

    logger.debug("Auth successful", {
      requestId: req.id,
      orgId,
      path: req.path,
      method: req.method,
    });

    next();
  } catch (error) {
    if (error instanceof AppError) {
      logger.warn("Auth failed", {
        requestId: req.id,
        path: req.path,
        method: req.method,
        error: error.message,
      });

      return res.status(error.statusCode).json({
        error: error.code,
        message: error.message,
        requestId: req.id,
      });
    }

    logger.error("Auth error", {
      requestId: req.id,
      error: error instanceof Error ? error.message : "Unknown",
    });

    res.status(500).json({
      error: "AUTH_ERROR",
      message: "Authentication error",
      requestId: req.id,
    });
  }
};

/**
 * Optional auth middleware
 * Doesn't fail if auth is missing (for public endpoints)
 */
export const optionalAuthMiddleware = (req: any, _res: any, next: any) => {
  try {
    const orgId = req.headers["x-org-id"] || req.headers["X-Org-ID"];

    if (orgId) {
      req.user = {
        org_id: orgId,
        id: "test-user",
        role: "admin",
      };
    }

    next();
  } catch (error) {
    logger.error("Optional auth error", {
      requestId: req.id,
      error: error instanceof Error ? error.message : "Unknown",
    });
    next(); // Continue even if auth fails
  }
};

/**
 * Compatibility auth middleware used by newer routes.
 *
 * - If JWT middleware already hydrated req.user, we accept it.
 * - Otherwise, fall back to Phase 0 header-based auth.
 */
export const requireAuth = (req: any, res: any, next: any) => {
  const headerOrgId = req.headers["x-org-id"] || req.headers["X-Org-ID"];
  if (req.user?.id) {
    if (!req.user.org_id && headerOrgId) {
      req.user.org_id = headerOrgId;
    }
    if (req.user.org_id) {
      req.headers["x-org-id"] = req.user.org_id;
      return next();
    }
  }

  return basicAuthMiddleware(req, res, next);
};

/**
 * Role-based access control middleware factory
 * Checks if the authenticated user has one of the specified roles
 */
export const requireRole = (...allowedRoles: string[]) => {
  return (req: any, res: any, next: any) => {
    try {
      // Check if user is authenticated
      if (!req.user || !req.user.id) {
        return res.status(401).json({
          error: "UNAUTHORIZED",
          message: "Authentication required",
        });
      }

      // Get user role (default to 'user' if not set)
      const userRole = req.user.role || "user";

      // Check if user has one of the allowed roles
      if (!allowedRoles.includes(userRole)) {
        logger.warn("Insufficient permissions", {
          requestId: req.id,
          userId: req.user.id,
          userRole,
          requiredRoles: allowedRoles,
          path: req.path,
        });

        return res.status(403).json({
          error: "FORBIDDEN",
          message: "Insufficient permissions",
          requiredRoles: allowedRoles,
        });
      }

      next();
    } catch (error) {
      logger.error("Role check error", {
        requestId: req.id,
        error: error instanceof Error ? error.message : "Unknown",
      });

      res.status(500).json({
        error: "ROLE_CHECK_ERROR",
        message: "Role verification failed",
      });
    }
  };
};
