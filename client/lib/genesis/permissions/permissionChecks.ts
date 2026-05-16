/**
 * Permission Checks for Genesis RBAC
 * Core function: can(user, permission)
 */

import type { User } from "@/../shared/types/genesis-permissions";
import { getCurrentUser, getUserPermissions } from "@/stores/genesisAuthStore";

/**
 * Check if a user has a specific permission
 * Main RBAC gate function
 */
export function can(user: User | null, permission: string): boolean {
  if (!user) {
    return false;
  }

  if (!user.isActive) {
    return false;
  }

  // Get all permissions (including team permissions)
  const allPermissions = getUserPermissions(user.userId);

  return allPermissions.includes(permission);
}

/**
 * Check if current user has permission (convenience wrapper)
 */
export function currentUserCan(permission: string): boolean {
  const user = getCurrentUser();
  return can(user, permission);
}

/**
 * Check if user has ANY of the specified permissions
 */
export function canAny(user: User | null, permissions: string[]): boolean {
  return permissions.some((p) => can(user, p));
}

/**
 * Check if user has ALL of the specified permissions
 */
export function canAll(user: User | null, permissions: string[]): boolean {
  return permissions.every((p) => can(user, p));
}

/**
 * Check if user can access a specific outlet
 */
export function canAccessOutlet(user: User | null, outletId: string): boolean {
  if (!user) return false;

  // System admin can access all outlets
  if (user.role === "SYSTEM_ADMIN") {
    return true;
  }

  // Outlet manager can only access their own outlet
  if (user.role === "OUTLET_MANAGER" && user.outletId === outletId) {
    return true;
  }

  // Procurement manager can access all
  if (user.role === "PROCUREMENT_MANAGER") {
    return true;
  }

  return false;
}

/**
 * Check if user can edit an outlet's settings
 */
export function canEditOutlet(user: User | null, outletId: string): boolean {
  if (!user) return false;

  if (!can(user, "CONFIG_EDIT")) {
    return false;
  }

  return canAccessOutlet(user, outletId);
}

/**
 * Check if user can run procurement
 */
export function canRunProcurement(user: User | null): boolean {
  return can(user, "PROCUREMENT_RUN");
}

/**
 * Check if user can view procurement plans
 */
export function canViewProcurement(user: User | null): boolean {
  return can(user, "PROCUREMENT_VIEW");
}

/**
 * Check if user can edit vendor schedule
 */
export function canEditVendorSchedule(user: User | null): boolean {
  return can(user, "VENDOR_SCHEDULE_EDIT");
}

/**
 * Check if user can view vendor schedule
 */
export function canViewVendorSchedule(user: User | null): boolean {
  return can(user, "VENDOR_SCHEDULE_VIEW");
}

/**
 * Check if user can edit inventory offsets
 */
export function canEditOffsets(user: User | null): boolean {
  return can(user, "OFFSETS_EDIT");
}

/**
 * Check if user can view inventory offsets
 */
export function canViewOffsets(user: User | null): boolean {
  return can(user, "OFFSETS_VIEW");
}

/**
 * Check if user can view Aurum journal drafts
 */
export function canViewAurumDrafts(user: User | null): boolean {
  return can(user, "AURUM_DRAFT_VIEW");
}

/**
 * Check if user can export Aurum journal drafts
 */
export function canExportAurumDrafts(user: User | null): boolean {
  return can(user, "AURUM_DRAFT_EXPORT");
}

/**
 * Check if user can view audit logs
 */
export function canViewAudit(user: User | null): boolean {
  return can(user, "AUDIT_VIEW");
}

/**
 * Check if user can manage roles
 */
export function canManageRoles(user: User | null): boolean {
  return can(user, "MANAGE_ROLES");
}

/**
 * Check if user can view rewards
 */
export function canViewRewards(user: User | null): boolean {
  return can(user, "VIEW_REWARDS");
}

/**
 * Check if user can claim queue items
 */
export function canClaimQueue(user: User | null): boolean {
  return can(user, "CLAIM_QUEUE");
}

/**
 * Check if user can fulfill queue items
 */
export function canFulfillQueue(user: User | null): boolean {
  return can(user, "FULFILL_QUEUE");
}

/**
 * Get a human-readable permission description
 */
export function getPermissionDescription(permission: string): string {
  const descriptions: Record<string, string> = {
    PROCUREMENT_RUN: "Run combined procurement orchestrator",
    PROCUREMENT_VIEW: "View procurement plans",
    VENDOR_SCHEDULE_EDIT: "Edit vendor schedules",
    VENDOR_SCHEDULE_VIEW: "View vendor schedules",
    OFFSETS_EDIT: "Edit inventory offsets",
    OFFSETS_VIEW: "View inventory offsets",
    AURUM_DRAFT_VIEW: "View Aurum journal drafts",
    AURUM_DRAFT_EXPORT: "Export Aurum journal drafts",
    AUDIT_VIEW: "View audit logs",
    CONFIG_EDIT: "Edit system configuration",
    CONFIG_VIEW: "View system configuration",
    MANAGE_ROLES: "Manage user roles",
    VIEW_REWARDS: "View rewards and achievements",
    CLAIM_QUEUE: "Claim queue items",
    FULFILL_QUEUE: "Fulfill queue items",
  };

  return descriptions[permission] || permission;
}
