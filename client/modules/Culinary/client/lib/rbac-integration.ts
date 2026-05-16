/**
 * RBAC Integration Utilities
 * Bridges RBAC system with existing application modules
 */

import type { AccessContext, Permission } from "@/types/roles-permissions";
import { checkPermission } from "@/lib/rbac-manager";

/**
 * Recipe module integration
 */
export const RecipeModuleIntegration = {
  /**
   * Check if user can access recipe module
   */
  canAccessModule: (context: AccessContext): boolean => {
    return checkPermission(context, "view_recipe" as Permission);
  },

  /**
   * Get available recipe actions for user
   */
  getAvailableActions: (context: AccessContext) => ({
    view: checkPermission(context, "view_recipe" as Permission),
    create: checkPermission(context, "create_recipe" as Permission),
    edit: checkPermission(context, "edit_recipe" as Permission),
    delete: checkPermission(context, "delete_recipe" as Permission),
    export: checkPermission(context, "export_recipe" as Permission),
    createGlobal: checkPermission(
      context,
      "create_global_recipe" as Permission,
    ),
    approveGlobal: checkPermission(
      context,
      "approve_global_recipe" as Permission,
    ),
  }),
};

/**
 * Inventory module integration
 */
export const InventoryModuleIntegration = {
  /**
   * Check if user can access inventory module
   */
  canAccessModule: (context: AccessContext): boolean => {
    return checkPermission(context, "view_inventory" as Permission);
  },

  /**
   * Get available inventory actions for user
   */
  getAvailableActions: (context: AccessContext) => ({
    view: checkPermission(context, "view_inventory" as Permission),
    edit: checkPermission(context, "edit_inventory" as Permission),
    manageSupplers: checkPermission(context, "manage_suppliers" as Permission),
    viewPurchasing: checkPermission(context, "view_purchasing" as Permission),
    approvePurchasing: checkPermission(
      context,
      "approve_purchasing" as Permission,
    ),
  }),
};

/**
 * User management module integration
 */
export const UserManagementIntegration = {
  /**
   * Check if user can access user management module
   */
  canAccessModule: (context: AccessContext): boolean => {
    return checkPermission(context, "manage_users" as Permission);
  },

  /**
   * Get available user management actions
   */
  getAvailableActions: (context: AccessContext) => ({
    manageUsers: checkPermission(context, "manage_users" as Permission),
    inviteUsers: checkPermission(context, "invite_users" as Permission),
    viewActivity: checkPermission(
      context,
      "view_user_activity" as Permission,
    ),
  }),
};

/**
 * Reporting module integration
 */
export const ReportingModuleIntegration = {
  /**
   * Check if user can access reporting module
   */
  canAccessModule: (context: AccessContext): boolean => {
    return checkPermission(context, "view_reports" as Permission);
  },

  /**
   * Get available reporting actions
   */
  getAvailableActions: (context: AccessContext) => ({
    viewReports: checkPermission(context, "view_reports" as Permission),
    viewAnalytics: checkPermission(context, "view_analytics" as Permission),
    exportData: checkPermission(context, "export_data" as Permission),
  }),
};

/**
 * Settings module integration
 */
export const SettingsModuleIntegration = {
  /**
   * Check if user can access settings
   */
  canAccessModule: (context: AccessContext): boolean => {
    return checkPermission(context, "manage_settings" as Permission);
  },

  /**
   * Get available settings actions
   */
  getAvailableActions: (context: AccessContext) => ({
    manageSettings: checkPermission(
      context,
      "manage_settings" as Permission,
    ),
    viewAuditLog: checkPermission(context, "view_audit_log" as Permission),
  }),
};

/**
 * Get all available modules for user
 */
export function getAvailableModules(context: AccessContext) {
  return {
    recipes: RecipeModuleIntegration.canAccessModule(context),
    inventory: InventoryModuleIntegration.canAccessModule(context),
    userManagement: UserManagementIntegration.canAccessModule(context),
    reporting: ReportingModuleIntegration.canAccessModule(context),
    settings: SettingsModuleIntegration.canAccessModule(context),
  };
}

/**
 * Get module navigation based on permissions
 */
export interface ModuleNavItem {
  id: string;
  label: string;
  path: string;
  icon?: string;
  accessible: boolean;
  actions: Record<string, boolean>;
}

export function getNavigationItems(context: AccessContext): ModuleNavItem[] {
  const modules = getAvailableModules(context);

  const items: ModuleNavItem[] = [];

  if (modules.recipes) {
    items.push({
      id: "recipes",
      label: "Recipes",
      path: "/recipes",
      icon: "📖",
      accessible: true,
      actions: RecipeModuleIntegration.getAvailableActions(context),
    });
  }

  if (modules.inventory) {
    items.push({
      id: "inventory",
      label: "Inventory",
      path: "/inventory",
      icon: "📦",
      accessible: true,
      actions: InventoryModuleIntegration.getAvailableActions(context),
    });
  }

  if (modules.userManagement) {
    items.push({
      id: "users",
      label: "Team Members",
      path: "/team",
      icon: "👥",
      accessible: true,
      actions: UserManagementIntegration.getAvailableActions(context),
    });
  }

  if (modules.reporting) {
    items.push({
      id: "reports",
      label: "Reports",
      path: "/reports",
      icon: "📊",
      accessible: true,
      actions: ReportingModuleIntegration.getAvailableActions(context),
    });
  }

  if (modules.settings) {
    items.push({
      id: "settings",
      label: "Settings",
      path: "/settings",
      icon: "⚙️",
      accessible: true,
      actions: SettingsModuleIntegration.getAvailableActions(context),
    });
  }

  return items;
}

/**
 * Apply RBAC to API responses
 * Filters and sanitizes data based on permissions
 */
export function applyRBACToResponse<T extends { outletId?: string }>(
  context: AccessContext,
  data: T[],
): T[] {
  // Admins see all data
  if (context.userRole === "admin") {
    return data;
  }

  // Non-admins see only data from accessible outlets
  const accessibleOutlets = context.outletRoles.map((or) => or.outletId);

  return data.filter((item) => {
    // Items without outlet ID are global
    if (!item.outletId) {
      return true;
    }

    return accessibleOutlets.includes(item.outletId);
  });
}

/**
 * Validate user action before execution
 */
export interface UserAction {
  type: string; // e.g., "create_recipe", "edit_inventory"
  outletId?: string;
  resourceId?: string;
  details?: Record<string, any>;
}

export function validateUserAction(
  context: AccessContext,
  action: UserAction,
): { valid: boolean; reason?: string } {
  // Add custom validation logic here
  // This can be extended based on specific business rules

  // If outlet-scoped action, check access
  if (action.outletId) {
    const hasAccess = context.outletRoles.some(
      (or) => or.outletId === action.outletId,
    );
    if (!hasAccess && context.userRole !== "admin") {
      return {
        valid: false,
        reason: `No access to outlet ${action.outletId}`,
      };
    }
  }

  return { valid: true };
}
