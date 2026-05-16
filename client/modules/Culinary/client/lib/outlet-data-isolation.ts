/**
 * Outlet Data Isolation System
 * Handles filtering and access control for outlet-specific data
 */

import type { AccessContext, OutletUserRole } from "@/types/roles-permissions";
import { UserRole as UserRoleEnum } from "@/types/roles-permissions";

// Re-export AccessContext for use in other modules
export type { AccessContext };

/**
 * Check if user has access to a specific outlet
 */
function canAccessOutlet(
  outletRoles: OutletUserRole[],
  outletId: string,
): boolean {
  return outletRoles.some((or) => or.outletId === outletId);
}

/**
 * Data with outlet context
 */
export interface OutletData {
  id: string;
  outletId: string;
  [key: string]: any;
}

/**
 * Filter data based on outlet access
 */
export function filterOutletData<T extends OutletData>(
  context: AccessContext,
  data: T[],
): T[] {
  // Admins see all data
  if (context.userRole === UserRoleEnum.ADMIN) {
    return data;
  }

  // Non-admins see only data from accessible outlets
  return data.filter((item) =>
    canAccessOutlet(context.outletRoles, item.outletId),
  );
}

/**
 * Filter single data item
 */
export function canAccessData(
  context: AccessContext,
  data: OutletData,
): boolean {
  // Admins can access all
  if (context.userRole === UserRoleEnum.ADMIN) {
    return true;
  }

  return canAccessOutlet(context.outletRoles, data.outletId);
}

/**
 * Create outlet filter query
 */
export interface OutletFilterQuery {
  outletId?: string | string[];
}

export function createOutletFilterQuery(
  context: AccessContext,
): OutletFilterQuery {
  // Admins see all outlets
  if (context.userRole === UserRoleEnum.ADMIN) {
    return {};
  }

  // Get accessible outlets
  const accessibleOutlets = context.outletRoles.map((or) => or.outletId);

  if (accessibleOutlets.length === 0) {
    return { outletId: "" }; // No access
  }

  if (accessibleOutlets.length === 1) {
    return { outletId: accessibleOutlets[0] };
  }

  return { outletId: accessibleOutlets };
}

/**
 * Filter recipes by outlet
 */
export interface RecipeData extends OutletData {
  isGlobal?: boolean;
}

export function filterRecipesByOutlet(
  context: AccessContext,
  recipes: RecipeData[],
): RecipeData[] {
  // Admins see all recipes
  if (context.userRole === UserRoleEnum.ADMIN) {
    return recipes;
  }

  return recipes.filter((recipe) => {
    // Global recipes are visible to all
    if (recipe.isGlobal) {
      return true;
    }

    // Local recipes: only visible to outlet staff
    return canAccessOutlet(context.outletRoles, recipe.outletId);
  });
}

/**
 * Filter inventory items by outlet
 */
export interface InventoryData extends OutletData {
  sku?: string;
  quantity: number;
}

export function filterInventoryByOutlet(
  context: AccessContext,
  items: InventoryData[],
): InventoryData[] {
  return filterOutletData(context, items);
}

/**
 * Filter suppliers by outlet access
 */
export interface SupplierData extends OutletData {
  name: string;
  contactEmail?: string;
}

export function filterSuppliersByOutlet(
  context: AccessContext,
  suppliers: SupplierData[],
): SupplierData[] {
  return filterOutletData(context, suppliers);
}

/**
 * Check if outlet data can be modified
 */
export function canModifyOutletData(
  context: AccessContext,
  data: OutletData,
  requiredPermission?: string,
): boolean {
  // Admins can modify anything
  if (context.userRole === UserRoleEnum.ADMIN) {
    return true;
  }

  // Must have access to outlet
  if (!canAccessOutlet(context.outletRoles, data.outletId)) {
    return false;
  }

  // Managers and chefs can modify
  return (
    context.userRole === UserRoleEnum.CHEF ||
    context.userRole === UserRoleEnum.MANAGER
  );
}

/**
 * Inter-outlet transfer validation
 * Controls whether data can be transferred between outlets
 */
export interface InterOutletTransfer {
  fromOutletId: string;
  toOutletId: string;
  itemId: string;
  quantity?: number;
}

export function canPerformInterOutletTransfer(
  context: AccessContext,
  transfer: InterOutletTransfer,
): boolean {
  // Admins can transfer between any outlets
  if (context.userRole === UserRoleEnum.ADMIN) {
    return true;
  }

  // Non-admins must have access to both outlets
  const hasSourceAccess = canAccessOutlet(
    context.outletRoles,
    transfer.fromOutletId,
  );
  const hasTargetAccess = canAccessOutlet(
    context.outletRoles,
    transfer.toOutletId,
  );

  return hasSourceAccess && hasTargetAccess;
}

/**
 * Audit trail with outlet context
 */
export interface OutletAuditEntry {
  id: string;
  outletId: string;
  userId: string;
  username: string;
  action: string;
  resourceType: string;
  resourceId: string;
  changes?: Record<string, { before: any; after: any }>;
  timestamp: number;
  ipAddress?: string;
}

/**
 * Filter audit entries by outlet
 */
export function filterAuditEntriesByOutlet(
  context: AccessContext,
  entries: OutletAuditEntry[],
): OutletAuditEntry[] {
  return filterOutletData(context, entries);
}

/**
 * Data aggregation across outlets (for authorized users)
 */
export function aggregateOutletData<T extends OutletData>(
  context: AccessContext,
  dataByOutlet: Record<string, T[]>,
): T[] {
  const result: T[] = [];

  for (const [outletId, items] of Object.entries(dataByOutlet)) {
    // Check access
    const hasAccess =
      context.userRole === UserRoleEnum.ADMIN ||
      canAccessOutlet(context.outletRoles, outletId);

    if (hasAccess) {
      result.push(...items);
    }
  }

  return result;
}

/**
 * Group data by outlet
 */
export function groupDataByOutlet<T extends OutletData>(
  data: T[],
): Record<string, T[]> {
  const grouped: Record<string, T[]> = {};

  for (const item of data) {
    if (!grouped[item.outletId]) {
      grouped[item.outletId] = [];
    }
    grouped[item.outletId].push(item);
  }

  return grouped;
}

/**
 * Count accessible outlets for user
 */
export function countAccessibleOutlets(outletRoles: OutletUserRole[]): number {
  return outletRoles.length;
}

/**
 * Get outlet IDs user has manager/admin role
 */
export function getManagedOutletIds(outletRoles: OutletUserRole[]): string[] {
  return outletRoles
    .filter(
      (or) =>
        or.role === UserRoleEnum.ADMIN || or.role === UserRoleEnum.MANAGER,
    )
    .map((or) => or.outletId);
}
