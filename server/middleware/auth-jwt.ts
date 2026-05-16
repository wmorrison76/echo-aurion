/**
 * JWT Authentication Middleware
 * Validates JWT tokens and extracts user context
 */

import type { NextFunction, Request, Response } from "express";
import { JWTService } from "../lib/auth";
import { logger } from "../lib/logger";
import { extractSessionToken } from "../../client/modules/EchoAurum/server/middleware/session";
import { getSession } from "../../client/modules/EchoAurum/server/services/session";

export interface AuthenticatedRequest {
  user: {
    id: string;
    org_id: string;
    email: string;
    role?: string;
    exp: number;
  };
}

type AuthRequest = Request & {
  user?: AuthenticatedRequest["user"];
  cookies?: { auth_token?: string };
  headers: Request["headers"] & {
    authorization?: string;
    "x-auth-token"?: string;
    "x-org-id"?: string;
  };
  org?: { id?: string; tier?: string };
};

/**
 * Extract JWT token from request
 */
function extractToken(req: AuthRequest): string | null {
  // Check Authorization header
  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith("Bearer ")) {
    return authHeader.slice(7);
  }

  // Check cookies (httpOnly)
  if (req.cookies?.auth_token) {
    return req.cookies.auth_token;
  }

  // Check custom header
  if (req.headers["x-auth-token"]) {
    return req.headers["x-auth-token"];
  }

  return null;
}

/**
 * JWT Authentication Middleware
 * Validates JWT and attaches user context to request
 */
const ECHOAURUM_FALLBACK_ORG_ID = "org-test-001";

function tryHydrateUserFromAurumSession(req: AuthRequest): AuthenticatedRequest["user"] | null {
  if (process.env.NODE_ENV === "production") {
    return null;
  }

  try {
    const sessionToken = extractSessionToken(req);
    if (!sessionToken) {
      return null;
    }

    const session = getSession(sessionToken);
    if (!session) {
      return null;
    }

    const expSeconds = Math.floor(Date.now() / 1000) + 60 * 60;
    return {
      id: session.userId,
      org_id: ECHOAURUM_FALLBACK_ORG_ID,
      email: session.email,
      role: session.role,
      exp: expSeconds,
    };
  } catch {
    return null;
  }
}

export const jwtAuthMiddleware = (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const token = extractToken(req);

    if (!token) {
      const fallbackUser = tryHydrateUserFromAurumSession(req);
      if (fallbackUser) {
        req.user = fallbackUser;
        req.headers["x-org-id"] = fallbackUser.org_id;
        return next();
      }

      return res.status(401).json({
        error: "UNAUTHORIZED",
        message: "No authentication token provided",
        code: "NO_AUTH_TOKEN",
      });
    }

    // Verify token
    const payload = JWTService.verifyToken(token);

    if (!payload) {
      const fallbackUser = tryHydrateUserFromAurumSession(req);
      if (fallbackUser) {
        req.user = fallbackUser;
        req.headers["x-org-id"] = fallbackUser.org_id;
        return next();
      }

      return res.status(401).json({
        error: "UNAUTHORIZED",
        message: "Invalid or expired token",
        code: "INVALID_TOKEN",
      });
    }

    // Attach user context to request
    req.user = {
      id: payload.sub,
      org_id: payload.org_id,
      email: payload.email,
      role: payload.role,
      exp: payload.exp,
    };

    // Add tenant validation header
    req.headers["x-org-id"] = payload.org_id;

    logger.debug("[JWT Auth] User authenticated", {
      userId: payload.sub,
      orgId: payload.org_id,
      email: payload.email,
      role: payload.role ? String(payload.role) : "MISSING",
      hasRole: !!payload.role,
      path: req.path,
    });

    next();
  } catch (error) {
    logger.error("[JWT Auth] Authentication error", {
      error: error instanceof Error ? error.message : String(error),
      path: req.path,
    });

    res.status(500).json({
      error: "AUTH_ERROR",
      message: "Authentication error",
      code: "AUTH_ERROR",
    });
  }
};

/**
 * Optional JWT Authentication
 * Doesn't fail if token is missing, but validates if present
 */
export const optionalJwtAuthMiddleware = (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const token = extractToken(req);

    if (token) {
      const payload = JWTService.verifyToken(token);

      if (payload) {
        req.user = {
          id: payload.sub,
          org_id: payload.org_id,
          email: payload.email,
          role: payload.role,
          exp: payload.exp,
        };
        req.headers["x-org-id"] = payload.org_id;
      }
    }

    next();
  } catch (error) {
    logger.warn("[JWT Auth] Optional auth error", {
      error: error instanceof Error ? error.message : String(error),
    });
    next(); // Continue anyway
  }
};

/**
 * Role-based access control middleware
 */
export const requireRole = (allowedRoles: string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({
        error: "UNAUTHORIZED",
        message: "Authentication required",
      });
    }

    // Extract role from JWT payload (recommended) or default to 'member'
    // JWT payload should include 'role' field from identity provider
    const userRole = req.user.role || "member";

    if (!allowedRoles.includes(userRole)) {
      logger.warn("[RBAC] Access denied", {
        userId: req.user.id,
        requiredRoles: allowedRoles,
        userRole,
      });

      return res.status(403).json({
        error: "FORBIDDEN",
        message: "Insufficient permissions",
        code: "INSUFFICIENT_PERMISSIONS",
      });
    }

    next();
  };
};

/**
 * Org-level tenant validation
 * Ensures user can only access their own org data
 */
export const validateOrgAccess = (req: AuthRequest, res: Response, next: NextFunction) => {
  if (!req.user) {
    return res.status(401).json({
      error: "UNAUTHORIZED",
      message: "Authentication required",
    });
  }

  const requestedOrgId = req.params.org_id || req.headers["x-org-id"];

  if (requestedOrgId && requestedOrgId !== req.user.org_id) {
    logger.warn("[Tenant Validation] Org access denied", {
      userId: req.user.id,
      userOrgId: req.user.org_id,
      requestedOrgId,
    });

    return res.status(403).json({
      error: "FORBIDDEN",
      message: "Cannot access this organization",
      code: "ORG_ACCESS_DENIED",
    });
  }

  next();
};
