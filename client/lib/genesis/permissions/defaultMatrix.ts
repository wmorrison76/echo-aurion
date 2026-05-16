/**
 * Default Permission Matrix for Genesis RBAC
 * Maps roles to permissions
 */

import type {
  PermissionMatrix,
  RoleConfig,
} from "@/../shared/types/genesis-permissions";

export const DEFAULT_PERMISSION_MATRIX: PermissionMatrix = {
  roles: {
    SYSTEM_ADMIN: {
      roleId: "role_admin",
      name: "SYSTEM_ADMIN",
      description: "Full system access",
      defaultPermissions: [
        "PROCUREMENT_RUN",
        "PROCUREMENT_VIEW",
        "VENDOR_SCHEDULE_EDIT",
        "VENDOR_SCHEDULE_VIEW",
        "OFFSETS_EDIT",
        "OFFSETS_VIEW",
        "AURUM_DRAFT_VIEW",
        "AURUM_DRAFT_EXPORT",
        "AUDIT_VIEW",
        "CONFIG_EDIT",
        "CONFIG_VIEW",
        "MANAGE_ROLES",
        "VIEW_REWARDS",
        "CLAIM_QUEUE",
        "FULFILL_QUEUE",
      ],
      outletIndependent: true,
    },

    OUTLET_MANAGER: {
      roleId: "role_outlet_manager",
      name: "OUTLET_MANAGER",
      description: "Manages a specific outlet",
      defaultPermissions: [
        "PROCUREMENT_VIEW",
        "VENDOR_SCHEDULE_VIEW",
        "OFFSETS_VIEW",
        "CLAIM_QUEUE",
        "FULFILL_QUEUE",
        "VIEW_REWARDS",
      ],
      outletIndependent: false,
      commissaryFulfillmentConstraint: "OWN_OUTLET_ONLY",
    },

    COMMISSARY_HEAD: {
      roleId: "role_commissary_head",
      name: "COMMISSARY_HEAD",
      description: "Manages commissary operations",
      defaultPermissions: [
        "PROCUREMENT_RUN",
        "PROCUREMENT_VIEW",
        "VENDOR_SCHEDULE_VIEW",
        "OFFSETS_EDIT",
        "OFFSETS_VIEW",
        "AURUM_DRAFT_VIEW",
        "AUDIT_VIEW",
        "CONFIG_VIEW",
        "VIEW_REWARDS",
        "FULFILL_QUEUE",
      ],
      outletIndependent: false,
      commissaryFulfillmentConstraint: "OWN_COMMISSARY_ONLY",
    },

    PROCUREMENT_MANAGER: {
      roleId: "role_procurement_manager",
      name: "PROCUREMENT_MANAGER",
      description: "Manages all procurement operations",
      defaultPermissions: [
        "PROCUREMENT_RUN",
        "PROCUREMENT_VIEW",
        "VENDOR_SCHEDULE_EDIT",
        "VENDOR_SCHEDULE_VIEW",
        "OFFSETS_EDIT",
        "OFFSETS_VIEW",
        "AURUM_DRAFT_VIEW",
        "AUDIT_VIEW",
        "CONFIG_VIEW",
        "VIEW_REWARDS",
      ],
      outletIndependent: true,
    },

    FINANCE_OFFICER: {
      roleId: "role_finance_officer",
      name: "FINANCE_OFFICER",
      description: "Manages financial aspects",
      defaultPermissions: [
        "PROCUREMENT_VIEW",
        "AURUM_DRAFT_VIEW",
        "AURUM_DRAFT_EXPORT",
        "AUDIT_VIEW",
        "CONFIG_VIEW",
        "VIEW_REWARDS",
      ],
      outletIndependent: true,
    },

    STAFF: {
      roleId: "role_staff",
      name: "STAFF",
      description: "General staff member",
      defaultPermissions: ["CLAIM_QUEUE", "FULFILL_QUEUE", "VIEW_REWARDS"],
      outletIndependent: false,
      commissaryFulfillmentConstraint: "OWN_OUTLET_ONLY",
    },
  },

  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

/**
 * Get permissions for a role
 */
export function getPermissionsForRole(roleName: string): string[] {
  const role =
    DEFAULT_PERMISSION_MATRIX.roles[
      roleName as keyof typeof DEFAULT_PERMISSION_MATRIX.roles
    ];
  return role?.defaultPermissions || [];
}

/**
 * Check if a role is outlet-independent
 */
export function isRoleOutletIndependent(roleName: string): boolean {
  const role =
    DEFAULT_PERMISSION_MATRIX.roles[
      roleName as keyof typeof DEFAULT_PERMISSION_MATRIX.roles
    ];
  return role?.outletIndependent ?? false;
}

/**
 * Get commissary fulfillment constraint for a role
 */
export function getCommissaryConstraint(roleName: string): string | undefined {
  const role =
    DEFAULT_PERMISSION_MATRIX.roles[
      roleName as keyof typeof DEFAULT_PERMISSION_MATRIX.roles
    ];
  return role?.commissaryFulfillmentConstraint;
}

/**
 * Get all role names
 */
export function getAllRoles(): string[] {
  return Object.keys(DEFAULT_PERMISSION_MATRIX.roles);
}

/**
 * Get role configuration
 */
export function getRoleConfig(roleName: string): RoleConfig | null {
  return (
    DEFAULT_PERMISSION_MATRIX.roles[
      roleName as keyof typeof DEFAULT_PERMISSION_MATRIX.roles
    ] || null
  );
}
