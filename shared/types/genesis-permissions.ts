/**
 * Genesis Permissions & RBAC Types
 * Role-based access control for Genesis operations
 */

export type PermissionCode =
  | "PROCUREMENT_RUN"
  | "PROCUREMENT_VIEW"
  | "VENDOR_SCHEDULE_EDIT"
  | "VENDOR_SCHEDULE_VIEW"
  | "OFFSETS_EDIT"
  | "OFFSETS_VIEW"
  | "AURUM_DRAFT_VIEW"
  | "AURUM_DRAFT_EXPORT"
  | "AUDIT_VIEW"
  | "CONFIG_EDIT"
  | "CONFIG_VIEW"
  | "MANAGE_ROLES"
  | "VIEW_REWARDS"
  | "CLAIM_QUEUE"
  | "FULFILL_QUEUE";

export type RoleType =
  | "SYSTEM_ADMIN"
  | "OUTLET_MANAGER"
  | "COMMISSARY_HEAD"
  | "PROCUREMENT_MANAGER"
  | "FINANCE_OFFICER"
  | "STAFF";

/**
 * User representation (built from GenesisConfig outlets/commissaries)
 */
export interface User {
  userId: string;
  name: string;
  role: RoleType;
  outletId?: string; // which outlet/commissary they belong to
  permissions: PermissionCode[];
  isActive: boolean;
  createdAt: string; // ISO
}

/**
 * Team (group of outlets or commissaries)
 */
export interface Team {
  teamId: string;
  name: string;
  description?: string;
  members: string[]; // user IDs
  permissions: PermissionCode[];
  createdAt: string; // ISO
}

/**
 * Role configuration (maps role to default permissions)
 */
export interface RoleConfig {
  roleId: string;
  name: RoleType;
  description: string;
  defaultPermissions: PermissionCode[];
  outletIndependent: boolean; // true = can access all outlets
  commissaryFulfillmentConstraint?:
    | "CAN_FULFILL_ALL"
    | "OWN_COMMISSARY_ONLY"
    | "OWN_OUTLET_ONLY";
}

/**
 * Permission matrix (role -> permissions)
 */
export interface PermissionMatrix {
  roles: Record<RoleType, RoleConfig>;
  createdAt: string; // ISO
  updatedAt: string; // ISO
}
