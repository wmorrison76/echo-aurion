/**
 * Audit middleware for sensitive actions
 * Logs who did what and when for enterprise compliance (SOX/HIPAA readiness).
 * Use with requireAdminToken on admin-only routes.
 */

import type { Request, Response, NextFunction } from "express";
import { unifiedAuditService } from "../services/unified-audit-service";

const tenantIdDefault = "default";

/**
 * Logs sensitive action to unified audit trail.
 * Call after successful state-changing operation (or from route handler).
 */
export async function logSensitiveAction(
  req: Request,
  action: string,
  entityType: string,
  entityId: string,
  metadata?: Record<string, unknown>
): Promise<void> {
  try {
    const performedBy =
      (req as any).user?.id ?? (req as any).user?.sub ?? req.headers["x-user-id"] ?? "anonymous";
    const tenantId = (req as any).user?.orgId ?? (req as any).user?.tenant_id ?? tenantIdDefault;
    await unifiedAuditService.log(
      tenantId,
      entityType,
      entityId,
      action,
      String(performedBy),
      { metadata }
    );
  } catch (e) {
    console.warn("[audit-sensitive] Log failed:", e);
  }
}

/**
 * Middleware that logs the request to audit trail when the route succeeds.
 * Attach to sensitive routes after requireAdminToken.
 * entityType and entityId can be derived from req in the route; this middleware
 * just ensures we have a hook. For simpler use, routes can call logSensitiveAction directly.
 */
export function auditSensitiveRoute(entityType: string, entityIdFromReq?: (req: Request) => string) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const originalJson = res.json.bind(res);
    res.json = function (body: any) {
      if (res.statusCode >= 200 && res.statusCode < 300) {
        const entityId = entityIdFromReq ? entityIdFromReq(req) : (req.params?.id ?? req.body?.id ?? "request");
        logSensitiveAction(req, `${req.method} ${req.path}`, entityType, entityId, {
          path: req.path,
          method: req.method,
        }).catch(() => {});
      }
      return originalJson(body);
    };
    next();
  };
}
