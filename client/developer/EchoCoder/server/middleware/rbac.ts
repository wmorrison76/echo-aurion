import { Request, Response, NextFunction } from "express";

/**
 * Role-Based Access Control (RBAC) middleware and utilities
 * Enforces permissions on all sensitive operations
 */

export interface UserWithRole extends Express.User {
  id: string;
  email: string;
  workspace_id?: string;
  role?: string;
  permissions?: string[];
}

export interface RBACContext {
  userId: string;
  workspaceId: string;
  role: string;
  permissions: string[];
}

/**
 * Standard permission definitions
 */
export const PERMISSIONS = {
  // Workspace management
  MANAGE_WORKSPACE: "manage_workspace",
  MANAGE_MEMBERS: "manage_members",
  MANAGE_ROLES: "manage_roles",

  // Feature flags
  MANAGE_FEATURES: "manage_features",
  TOGGLE_FEATURES: "toggle_features",

  // Webhooks
  MANAGE_WEBHOOKS: "manage_webhooks",
  VIEW_WEBHOOKS: "view_webhooks",

  // Compliance
  MANAGE_COMPLIANCE: "manage_compliance",
  VIEW_COMPLIANCE: "view_compliance",

  // Security
  MANAGE_SECURITY: "manage_security",
  MANAGE_SSO: "manage_sso",
  MANAGE_2FA: "manage_2fa",

  // A/B Testing & Analytics
  MANAGE_EXPERIMENTS: "manage_experiments",
  VIEW_ANALYTICS: "view_analytics",
  MANAGE_AUDIENCES: "manage_audiences",

  // Code generation
  GENERATE_CODE: "generate_code",
  SAVE_PROJECT: "save_project",
  DELETE_PROJECT: "delete_project",

  // API operations
  VIEW_AUDIT_LOGS: "view_audit_logs",
  MANAGE_API_KEYS: "manage_api_keys",
};

/**
 * Standard roles with associated permissions
 */
export const ROLE_PERMISSIONS: Record<string, string[]> = {
  admin: Object.values(PERMISSIONS),
  owner: Object.values(PERMISSIONS),
  editor: [
    PERMISSIONS.GENERATE_CODE,
    PERMISSIONS.SAVE_PROJECT,
    PERMISSIONS.VIEW_WEBHOOKS,
    PERMISSIONS.VIEW_ANALYTICS,
  ],
  viewer: [
    PERMISSIONS.VIEW_ANALYTICS,
    PERMISSIONS.VIEW_WEBHOOKS,
    PERMISSIONS.VIEW_COMPLIANCE,
  ],
};

/**
 * Authenticate and extract user context
 */
export function extractUserContext(req: Request): RBACContext | null {
  const user = req.user as UserWithRole | undefined;

  if (!user || !user.id) {
    return null;
  }

  return {
    userId: user.id,
    workspaceId: user.workspace_id || "",
    role: user.role || "viewer",
    permissions:
      user.permissions || ROLE_PERMISSIONS[user.role || "viewer"] || [],
  };
}

/**
 * Middleware: Check if user is authenticated
 */
export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const context = extractUserContext(req);

  if (!context) {
    return res.status(401).json({
      error: "Unauthorized",
      message: "Authentication required",
    });
  }

  // Attach context to request for downstream handlers
  (req as any).rbacContext = context;
  next();
}

/**
 * Middleware: Require specific permission(s)
 */
export function requirePermission(...permissions: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    const context = extractUserContext(req);

    if (!context) {
      return res.status(401).json({
        error: "Unauthorized",
        message: "Authentication required",
      });
    }

    const hasPermission = permissions.some((perm) =>
      context.permissions.includes(perm),
    );

    if (!hasPermission) {
      return res.status(403).json({
        error: "Forbidden",
        message: `This action requires one of: ${permissions.join(", ")}`,
        requiredPermissions: permissions,
        userPermissions: context.permissions,
      });
    }

    (req as any).rbacContext = context;
    next();
  };
}

/**
 * Middleware: Require specific role
 */
export function requireRole(...roles: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    const context = extractUserContext(req);

    if (!context) {
      return res.status(401).json({
        error: "Unauthorized",
        message: "Authentication required",
      });
    }

    if (!roles.includes(context.role)) {
      return res.status(403).json({
        error: "Forbidden",
        message: `This action requires role: ${roles.join(" or ")}`,
        requiredRole: roles,
        userRole: context.role,
      });
    }

    (req as any).rbacContext = context;
    next();
  };
}

/**
 * Middleware: Validate workspace membership
 */
export function requireWorkspaceAccess(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  const context = extractUserContext(req);
  const workspaceId = req.params.workspaceId || req.query.workspaceId;

  if (!context) {
    return res.status(401).json({
      error: "Unauthorized",
      message: "Authentication required",
    });
  }

  // Check if user has access to workspace
  // In production, verify workspace membership in database
  if (workspaceId && context.workspaceId !== workspaceId) {
    return res.status(403).json({
      error: "Forbidden",
      message: "Access denied to this workspace",
    });
  }

  (req as any).rbacContext = context;
  next();
}

/**
 * Check permission within request handler
 */
export function checkPermission(
  req: Request,
  permission: string | string[],
): boolean {
  const context = (req as any).rbacContext as RBACContext | undefined;

  if (!context) {
    return false;
  }

  if (Array.isArray(permission)) {
    return permission.some((p) => context.permissions.includes(p));
  }

  return context.permissions.includes(permission);
}

/**
 * Get RBAC context from request
 */
export function getRBACContext(req: Request): RBACContext {
  return (
    (req as any).rbacContext || {
      userId: "",
      workspaceId: "",
      role: "viewer",
      permissions: [],
    }
  );
}

/**
 * Check if user can perform action on specific resource
 */
export function canAccessResource(
  context: RBACContext,
  resourceOwnerId: string,
  requiredPermission: string,
): boolean {
  // Owner can always access their resources
  if (context.userId === resourceOwnerId) {
    return true;
  }

  // Check specific permission
  return context.permissions.includes(requiredPermission);
}

/**
 * Audit-logged operation
 */
export interface AuditedOperation {
  userId: string;
  workspaceId: string;
  action: string;
  resourceType: string;
  resourceId?: string;
  changes?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
  timestamp: Date;
  result: "success" | "failure";
  errorMessage?: string;
}

/**
 * Helper to create audit log entry
 */
export function createAuditEntry(
  context: RBACContext,
  req: Request,
  action: string,
  resourceType: string,
  resourceId?: string,
  changes?: Record<string, any>,
  result: "success" | "failure" = "success",
  errorMessage?: string,
): AuditedOperation {
  return {
    userId: context.userId,
    workspaceId: context.workspaceId,
    action,
    resourceType,
    resourceId,
    changes,
    ipAddress: req.ip,
    userAgent: req.get("user-agent"),
    timestamp: new Date(),
    result,
    errorMessage,
  };
}

/**
 * Validate resource ownership or permission
 */
export function validateResourceAccess(
  context: RBACContext,
  resourceOwnerId: string,
  permission: string,
): { allowed: boolean; reason?: string } {
  if (!context.userId) {
    return { allowed: false, reason: "User not authenticated" };
  }

  if (context.userId === resourceOwnerId) {
    return { allowed: true };
  }

  if (context.permissions.includes(permission)) {
    return { allowed: true };
  }

  return {
    allowed: false,
    reason: `Permission '${permission}' required`,
  };
}

/**
 * Helper to validate array of permissions
 */
export function validatePermissions(
  context: RBACContext,
  requiredPermissions: string[],
  requireAll: boolean = true,
): { valid: boolean; missing: string[] } {
  const missing = requiredPermissions.filter(
    (p) => !context.permissions.includes(p),
  );

  if (requireAll) {
    return {
      valid: missing.length === 0,
      missing,
    };
  } else {
    return {
      valid: missing.length < requiredPermissions.length,
      missing,
    };
  }
}
