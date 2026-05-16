/**
 * Organization ID Resolver
 * 
 * Centralized utility for extracting org_id from requests with consistent fallback chain.
 * Fixes MISSING_ORG_ID errors across all API endpoints.
 * 
 * Fallback chain:
 * 1. req.user?.org_id (from authenticated JWT session)
 * 2. req.headers['x-org-id'] (from frontend header)
 * 3. req.query['org_id'] (from query parameter)
 * 4. 'default' (development fallback)
 */

import { Request } from "express";

export interface OrgContext {
  orgId: string;
  userId?: string;
  userRole?: string;
  authenticated: boolean;
}

/**
 * Extract org_id from request with fallback chain
 * @param req Express request object
 * @returns org_id string (never null)
 */
export function getOrgId(req: Request): string {
  if (!req) {
    return "default";
  }

  const orgIdFromAuth = (req as any).user?.org_id;
  if (orgIdFromAuth && typeof orgIdFromAuth === "string") {
    return String(orgIdFromAuth).trim();
  }

  const orgIdFromHeader = req.headers["x-org-id"];
  if (orgIdFromHeader && typeof orgIdFromHeader === "string") {
    return String(orgIdFromHeader).trim();
  }

  const orgIdFromQuery = req.query.org_id;
  if (orgIdFromQuery && typeof orgIdFromQuery === "string") {
    return String(orgIdFromQuery).trim();
  }

  return "default";
}

/**
 * Extract user ID from request
 * @param req Express request object
 * @returns user ID string or undefined
 */
export function getUserId(req: Request): string | undefined {
  const userId = (req as any).user?.id || req.headers["x-user-id"];
  if (userId) {
    return String(userId).trim();
  }
  return undefined;
}

/**
 * Extract user role from request
 * @param req Express request object
 * @returns role string or undefined
 */
export function getUserRole(req: Request): string | undefined {
  const role = (req as any).user?.role || req.headers["x-user-role"];
  if (role) {
    return String(role).trim().toLowerCase();
  }
  return undefined;
}

/**
 * Get complete organization context from request
 * @param req Express request object
 * @returns OrgContext object with org_id, user_id, and role
 */
export function getOrgContext(req: Request): OrgContext {
  const orgId = getOrgId(req);
  const userId = getUserId(req);
  const userRole = getUserRole(req);
  const authenticated = !!((req as any).user?.id || req.headers["authorization"]);

  return {
    orgId,
    userId,
    userRole,
    authenticated,
  };
}

/**
 * Middleware for extracting org context and attaching to request
 * Usage: app.use(orgContextMiddleware);
 */
export function orgContextMiddleware(
  req: any,
  res: any,
  next: () => void,
) {
  req.orgContext = getOrgContext(req);
  next();
}
