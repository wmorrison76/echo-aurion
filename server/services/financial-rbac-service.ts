/**
 * Financial RBAC Service
 * Manages financial-specific role-based access control
 * Extends standard RBAC with financial permissions including salary/payroll protection
 */

import { logger } from "../lib/logger";

/**
 * Financial permissions available in the system
 */
export enum FinancialPermission {
  // Summary view - high-level metrics only (everyone with access)
  VIEW_SUMMARY = "view_summary",

  // Detailed P&L - full financial reports
  VIEW_DETAILED_PNL = "view_detailed_pnl",

  // Payroll/Salary data - protected by additional passcode
  VIEW_PAYROLL = "view_payroll",

  // Forecasting - ability to view and edit forecasts
  VIEW_FORECAST = "view_forecast",
  EDIT_FORECAST = "edit_forecast",

  // Budget management
  VIEW_BUDGETS = "view_budgets",
  MANAGE_BUDGETS = "manage_budgets",

  // Audit logs - access to financial access audit trail
  VIEW_AUDIT_LOGS = "view_audit_logs",

  // Multi-outlet consolidation
  VIEW_CONSOLIDATED = "view_consolidated",

  // Admin/full access
  MANAGE_FINANCIAL = "manage_financial",
}

/**
 * Financial role definitions
 * Maps roles to permissions
 */
export const FinancialRolePermissions: Record<string, FinancialPermission[]> = {
  // Viewer - read-only access to summary metrics
  viewer: [FinancialPermission.VIEW_SUMMARY],

  // Manager - detailed P&L access, no payroll
  manager: [
    FinancialPermission.VIEW_SUMMARY,
    FinancialPermission.VIEW_DETAILED_PNL,
    FinancialPermission.VIEW_FORECAST,
  ],

  // Finance - full access except payroll (protected separately)
  finance: [
    FinancialPermission.VIEW_SUMMARY,
    FinancialPermission.VIEW_DETAILED_PNL,
    FinancialPermission.VIEW_FORECAST,
    FinancialPermission.EDIT_FORECAST,
    FinancialPermission.VIEW_BUDGETS,
    FinancialPermission.MANAGE_BUDGETS,
    FinancialPermission.VIEW_CONSOLIDATED,
    FinancialPermission.VIEW_AUDIT_LOGS,
  ],

  // Payroll - only payroll data
  payroll: [FinancialPermission.VIEW_PAYROLL],

  // Owner/Admin - all permissions
  owner: Object.values(FinancialPermission),
  admin: Object.values(FinancialPermission),
};

/**
 * User context for permission checks
 */
export interface UserContext {
  id: string;
  org_id: string;
  role?: string;
  outlet_ids?: string[];
}

/**
 * Financial RBAC Service
 */
export class FinancialRBACService {
  /**
   * Check if user has permission
   */
  static async hasPermission(
    user: UserContext,
    permission: FinancialPermission,
    outlet_id?: string,
  ): Promise<boolean> {
    if (!user || !user.id) {
      logger.debug("[FinancialRBAC] User context missing");
      return false;
    }

    // Get user's role from context or database
    const role = user.role || "member";

    // Get permissions for role
    const permissions = FinancialRolePermissions[role.toLowerCase()] || [];

    const hasPermission = permissions.includes(permission);

    logger.debug("[FinancialRBAC] Permission check", {
      userId: user.id,
      userRoleProvided: user.role !== undefined,
      userRoleValue: user.role || "UNDEFINED",
      resolvedRole: role,
      permission,
      outletId: outlet_id,
      availablePermissions: permissions.join(","),
      result: hasPermission,
    });

    // If outlet_id provided, verify user has access to it
    // EXCEPTION: Admins and owners have access to all outlets
    if (hasPermission && outlet_id && user.outlet_ids) {
      const isAdmin = ["admin", "owner"].includes(role.toLowerCase());
      if (!isAdmin && !user.outlet_ids.includes(outlet_id)) {
        logger.warn("[FinancialRBAC] Outlet access denied", {
          userId: user.id,
          requestedOutlet: outlet_id,
          userOutlets: user.outlet_ids,
        });
        return false;
      }
    }

    return hasPermission;
  }

  /**
   * Check if user has multiple permissions (AND logic)
   */
  static async hasPermissions(
    user: UserContext,
    permissions: FinancialPermission[],
    outlet_id?: string,
  ): Promise<boolean> {
    for (const permission of permissions) {
      const has = await this.hasPermission(user, permission, outlet_id);
      if (!has) {
        return false;
      }
    }
    return true;
  }

  /**
   * Check if user can access payroll data (requires additional verification)
   * Payroll always requires extra security check
   */
  static async canAccessPayroll(
    user: UserContext,
    sessionHasPayrollVerification: boolean,
    outlet_id?: string,
  ): Promise<boolean> {
    // First check if role grants permission
    const hasPermission = await this.hasPermission(
      user,
      FinancialPermission.VIEW_PAYROLL,
      outlet_id,
    );

    if (!hasPermission) {
      return false;
    }

    // Second, verify session has recent passcode verification
    if (!sessionHasPayrollVerification) {
      logger.warn(
        "[FinancialRBAC] Payroll access denied - no session verification",
        {
          userId: user.id,
        },
      );
      return false;
    }

    logger.debug("[FinancialRBAC] Payroll access granted", {
      userId: user.id,
      outletId: outlet_id,
    });

    return true;
  }

  /**
   * Get permissions for a given role
   */
  static getPermissionsForRole(role: string): FinancialPermission[] {
    return FinancialRolePermissions[role.toLowerCase()] || [];
  }

  /**
   * Check if role is financial admin
   */
  static isFinancialAdmin(role?: string): boolean {
    if (!role) return false;
    const lowerRole = role.toLowerCase();
    return (
      lowerRole === "owner" || lowerRole === "admin" || lowerRole === "finance"
    );
  }

  /**
   * Filter outlets user can access
   */
  static filterAccessibleOutlets(
    user: UserContext,
    requestedOutlets: string[],
  ): string[] {
    if (!user.outlet_ids) {
      return [];
    }

    return requestedOutlets.filter((outletId) =>
      user.outlet_ids!.includes(outletId),
    );
  }

  /**
   * Verify outlet access
   */
  static canAccessOutlet(user: UserContext, outlet_id: string): boolean {
    if (!user.outlet_ids) {
      return false;
    }
    return user.outlet_ids.includes(outlet_id);
  }
}

/**
 * Factory to create user context
 */
export function createUserContext(
  id: string,
  org_id: string,
  role?: string,
  outlet_ids?: string[],
): UserContext {
  return {
    id,
    org_id,
    role,
    outlet_ids,
  };
}
