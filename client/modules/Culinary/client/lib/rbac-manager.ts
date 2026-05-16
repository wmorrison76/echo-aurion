/**
 * Role-Based Access Control (RBAC) Manager
 * Handles permission checking, enforcement, and data isolation
 */

import {
  type AccessContext,
  type OutletUserRole,
  type UserRole,
  type Permission,
  Permission as PermissionEnum,
  UserRole as UserRoleEnum,
  roleHasPermission,
  getUserOutletRole,
  canAccessOutlet,
} from "@/types/roles-permissions";

/**
 * Check if user has a specific permission
 */
export function checkPermission(
  context: AccessContext,
  permission: Permission,
): boolean {
  // Admins always have all permissions
  if (context.userRole === UserRoleEnum.ADMIN) {
    return true;
  }

  // Check if role has the permission
  return roleHasPermission(context.userRole, permission);
}

/**
 * Check if user has permission in a specific outlet
 */
export function checkOutletPermission(
  context: AccessContext,
  outletId: string,
  permission: Permission,
): boolean {
  // Must have access to outlet
  if (!canAccessOutlet(context.outletRoles, outletId)) {
    return false;
  }

  // Check outlet-level role permissions
  const outletRole = getUserOutletRole(context.outletRoles, outletId);
  if (outletRole) {
    return roleHasPermission(outletRole, permission);
  }

  // Fall back to organization-level role
  return checkPermission(context, permission);
}

/**
 * Check if user can view a recipe
 */
export function canViewRecipe(
  context: AccessContext,
  recipe: { isGlobal?: boolean; outletId?: string; createdBy?: string },
): boolean {
  if (!checkPermission(context, PermissionEnum.VIEW_RECIPE)) {
    return false;
  }

  // Local recipes: only visible to outlet staff
  if (!recipe.isGlobal && recipe.outletId) {
    return canAccessOutlet(context.outletRoles, recipe.outletId);
  }

  return true;
}

/**
 * Check if user can edit a recipe
 */
export function canEditRecipe(
  context: AccessContext,
  recipe: { isGlobal?: boolean; outletId?: string; createdBy?: string },
): boolean {
  if (!checkPermission(context, PermissionEnum.EDIT_RECIPE)) {
    return false;
  }

  // Can only edit your own recipes or in your outlet
  if (recipe.outletId) {
    return canAccessOutlet(context.outletRoles, recipe.outletId);
  }

  // Global recipes: chef/admin only
  if (recipe.isGlobal) {
    return (
      context.userRole === UserRoleEnum.CHEF ||
      context.userRole === UserRoleEnum.ADMIN
    );
  }

  return true;
}

/**
 * Check if user can delete a recipe
 */
export function canDeleteRecipe(
  context: AccessContext,
  recipe: { isGlobal?: boolean; outletId?: string; createdBy?: string },
): boolean {
  if (!checkPermission(context, PermissionEnum.DELETE_RECIPE)) {
    return false;
  }

  // Can only delete own recipes or in managed outlet
  if (recipe.createdBy && recipe.createdBy !== context.userId) {
    // Can delete if you manage the outlet
    if (recipe.outletId) {
      return checkOutletPermission(
        context,
        recipe.outletId,
        PermissionEnum.MANAGE_OUTLET_STAFF,
      );
    }
  }

  return true;
}

/**
 * Check if user can create global recipe
 */
export function canCreateGlobalRecipe(context: AccessContext): boolean {
  return checkPermission(context, PermissionEnum.CREATE_GLOBAL_RECIPE);
}

/**
 * Check if user can approve global recipe
 */
export function canApproveGlobalRecipe(context: AccessContext): boolean {
  return checkPermission(context, PermissionEnum.APPROVE_GLOBAL_RECIPE);
}

/**
 * Check if user can view inventory
 */
export function canViewInventory(
  context: AccessContext,
  outletId?: string,
): boolean {
  if (outletId) {
    return checkOutletPermission(context, outletId, PermissionEnum.VIEW_INVENTORY);
  }
  return checkPermission(context, PermissionEnum.VIEW_INVENTORY);
}

/**
 * Check if user can edit inventory
 */
export function canEditInventory(
  context: AccessContext,
  outletId?: string,
): boolean {
  if (outletId) {
    return checkOutletPermission(context, outletId, PermissionEnum.EDIT_INVENTORY);
  }
  return checkPermission(context, PermissionEnum.EDIT_INVENTORY);
}

/**
 * Check if user can approve purchasing
 */
export function canApprovePurchasing(
  context: AccessContext,
  outletId?: string,
): boolean {
  if (outletId) {
    return checkOutletPermission(
      context,
      outletId,
      PermissionEnum.APPROVE_PURCHASING,
    );
  }
  return checkPermission(context, PermissionEnum.APPROVE_PURCHASING);
}

/**
 * Check if user can manage outlet staff
 */
export function canManageOutletStaff(
  context: AccessContext,
  outletId: string,
): boolean {
  return checkOutletPermission(
    context,
    outletId,
    PermissionEnum.MANAGE_OUTLET_STAFF,
  );
}

/**
 * Check if user can manage users
 */
export function canManageUsers(context: AccessContext): boolean {
  return checkPermission(context, PermissionEnum.MANAGE_USERS);
}

/**
 * Check if user can view reports
 */
export function canViewReports(context: AccessContext): boolean {
  return checkPermission(context, PermissionEnum.VIEW_REPORTS);
}

/**
 * Get all accessible outlet IDs for user
 */
export function getAccessibleOutlets(context: AccessContext): string[] {
  // Admins can access all outlets in organization
  if (context.userRole === UserRoleEnum.ADMIN) {
    return ["all"]; // Special marker for all outlets
  }

  return context.outletRoles.map((or) => or.outletId);
}

/**
 * Check if user can access outlet
 */
export function canAccessOutletContext(
  context: AccessContext,
  outletId: string,
): boolean {
  if (context.userRole === UserRoleEnum.ADMIN) {
    return true;
  }

  return canAccessOutlet(context.outletRoles, outletId);
}

/**
 * Filter recipes based on user permissions
 */
export function filterRecipesByPermission(
  context: AccessContext,
  recipes: Array<{ id: string; isGlobal?: boolean; outletId?: string }>,
): string[] {
  return recipes
    .filter((recipe) =>
      canViewRecipe(context, {
        isGlobal: recipe.isGlobal,
        outletId: recipe.outletId,
      }),
    )
    .map((r) => r.id);
}

/**
 * Filter outlets based on user permissions
 */
export function filterOutletsByPermission(
  context: AccessContext,
  outlets: Array<{ id: string }>,
): string[] {
  if (context.userRole === UserRoleEnum.ADMIN) {
    return outlets.map((o) => o.id);
  }

  return outlets
    .filter((outlet) => canAccessOutletContext(context, outlet.id))
    .map((o) => o.id);
}

/**
 * Get audit info for record modification
 */
export interface AuditInfo {
  userId: string;
  username: string;
  timestamp: number;
  action: string;
  details?: Record<string, unknown>;
}

/**
 * Create audit record for user action
 */
export function createAuditRecord(
  userId: string,
  username: string,
  action: string,
  details?: Record<string, unknown>,
): AuditInfo {
  return {
    userId,
    username,
    timestamp: Date.now(),
    action,
    details,
  };
}

/**
 * Check if data should be visible based on outlet context
 * Used for outlet-specific data isolation
 */
export function canAccessData(
  context: AccessContext,
  dataOutletId?: string,
): boolean {
  // No outlet restriction
  if (!dataOutletId) {
    return true;
  }

  // Admin can see all
  if (context.userRole === UserRoleEnum.ADMIN) {
    return true;
  }

  // Check if user has access to that outlet
  return canAccessOutlet(context.outletRoles, dataOutletId);
}

/**
 * Apply outlet filter to query based on user context
 */
export function applyOutletFilter(
  context: AccessContext,
): { outletId?: string } {
  // Admin sees all outlets
  if (context.userRole === UserRoleEnum.ADMIN) {
    return {};
  }

  // Non-admins see only their accessible outlets
  const outlets = getAccessibleOutlets(context);
  if (outlets.length === 1 && context.outletId) {
    return { outletId: context.outletId };
  }

  return {};
}
