/**
 * Organization Context Middleware
 * Validates that the request has a valid organization context
 * Works with JWT auth which provides org_id via req.user.org_id
 */

import { logger } from "../lib/logger";

/**
 * Validates that organization context is present
 * Expects org_id to be set by the JWT auth middleware
 */
export const validateOrgContext = (req: any, res: any, next: any) => {
  try {
    // Check if user context exists (set by JWT middleware)
    if (!req.user) {
      return res.status(401).json({
        error: "UNAUTHORIZED",
        message: "Authentication required",
      });
    }

    // Check if org_id is present
    if (!req.user.org_id && !req.headers["x-org-id"]) {
      return res.status(400).json({
        error: "MISSING_ORG_CONTEXT",
        message: "Organization context is required",
      });
    }

    // Ensure org_id is set on the request for downstream middleware
    if (!req.user.org_id && req.headers["x-org-id"]) {
      req.user.org_id = req.headers["x-org-id"];
    }

    logger.debug("Org context validated", {
      userId: req.user.id,
      orgId: req.user.org_id,
      path: req.path,
    });

    next();
  } catch (error) {
    logger.error("Org context validation error", {
      error: error instanceof Error ? error.message : String(error),
      path: req.path,
    });

    res.status(500).json({
      error: "ORG_CONTEXT_ERROR",
      message: "Organization context validation failed",
    });
  }
};
