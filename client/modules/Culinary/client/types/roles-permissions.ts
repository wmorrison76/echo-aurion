/**
 * Role-Based Access Control (RBAC) System Types
 * Defines roles, permissions, and access control structures
 */

// Available user roles in the system
export enum UserRole {
  ADMIN = "admin", // Full system access, can manage users and outlets
  CHEF = "chef", // Can create/modify recipes, approve changes
  MANAGER = "manager", // Can manage operations, view reports, assign staff
  STAFF = "staff", // Limited access, can view assigned recipes
  FOH = "foh", // Front of house, view-only access to recipes
}

// Fine-grained permissions
export enum Permission {
  // Recipe permissions
  CREATE_RECIPE = "create_recipe",
  EDIT_RECIPE = "edit_recipe",
  DELETE_RECIPE = "delete_recipe",
  VIEW_RECIPE = "view_recipe",
  EXPORT_RECIPE = "export_recipe",

  // Global recipe permissions
  CREATE_GLOBAL_RECIPE = "create_global_recipe",
  APPROVE_GLOBAL_RECIPE = "approve_global_recipe",
  REJECT_GLOBAL_RECIPE = "reject_global_recipe",
  MANAGE_GLOBAL_RECIPES = "manage_global_recipes",

  // Inventory permissions
  VIEW_INVENTORY = "view_inventory",
  EDIT_INVENTORY = "edit_inventory",
  MANAGE_SUPPLIERS = "manage_suppliers",
  VIEW_PURCHASING = "view_purchasing",
  APPROVE_PURCHASING = "approve_purchasing",

  // Outlet permissions
  MANAGE_OUTLETS = "manage_outlets",
  VIEW_ALL_OUTLETS = "view_all_outlets",
  MANAGE_OUTLET_STAFF = "manage_outlet_staff",

  // User management
  MANAGE_USERS = "manage_users",
  INVITE_USERS = "invite_users",
  VIEW_USER_ACTIVITY = "view_user_activity",

  // Reporting
  VIEW_REPORTS = "view_reports",
  EXPORT_DATA = "export_data",
  VIEW_ANALYTICS = "view_analytics",

  // Settings
  MANAGE_SETTINGS = "manage_settings",
  VIEW_AUDIT_LOG = "view_audit_log",
}

// Role-based permission mapping
export const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  [UserRole.ADMIN]: [
    // Full access
    Permission.CREATE_RECIPE,
    Permission.EDIT_RECIPE,
    Permission.DELETE_RECIPE,
    Permission.VIEW_RECIPE,
    Permission.EXPORT_RECIPE,
    Permission.CREATE_GLOBAL_RECIPE,
    Permission.APPROVE_GLOBAL_RECIPE,
    Permission.REJECT_GLOBAL_RECIPE,
    Permission.MANAGE_GLOBAL_RECIPES,
    Permission.VIEW_INVENTORY,
    Permission.EDIT_INVENTORY,
    Permission.MANAGE_SUPPLIERS,
    Permission.VIEW_PURCHASING,
    Permission.APPROVE_PURCHASING,
    Permission.MANAGE_OUTLETS,
    Permission.VIEW_ALL_OUTLETS,
    Permission.MANAGE_OUTLET_STAFF,
    Permission.MANAGE_USERS,
    Permission.INVITE_USERS,
    Permission.VIEW_USER_ACTIVITY,
    Permission.VIEW_REPORTS,
    Permission.EXPORT_DATA,
    Permission.VIEW_ANALYTICS,
    Permission.MANAGE_SETTINGS,
    Permission.VIEW_AUDIT_LOG,
  ],
  [UserRole.CHEF]: [
    Permission.CREATE_RECIPE,
    Permission.EDIT_RECIPE,
    Permission.DELETE_RECIPE,
    Permission.VIEW_RECIPE,
    Permission.EXPORT_RECIPE,
    Permission.CREATE_GLOBAL_RECIPE,
    Permission.APPROVE_GLOBAL_RECIPE,
    Permission.REJECT_GLOBAL_RECIPE,
    Permission.VIEW_INVENTORY,
    Permission.MANAGE_SUPPLIERS,
    Permission.VIEW_PURCHASING,
    Permission.VIEW_REPORTS,
    Permission.VIEW_ANALYTICS,
  ],
  [UserRole.MANAGER]: [
    Permission.VIEW_RECIPE,
    Permission.VIEW_INVENTORY,
    Permission.EDIT_INVENTORY,
    Permission.VIEW_PURCHASING,
    Permission.APPROVE_PURCHASING,
    Permission.VIEW_ALL_OUTLETS,
    Permission.MANAGE_OUTLET_STAFF,
    Permission.VIEW_REPORTS,
    Permission.VIEW_ANALYTICS,
  ],
  [UserRole.STAFF]: [
    Permission.VIEW_RECIPE,
    Permission.VIEW_INVENTORY,
  ],
  [UserRole.FOH]: [
    Permission.VIEW_RECIPE,
  ],
};

// User role in context of an outlet
export interface OutletUserRole {
  userId: string;
  outletId: string;
  role: UserRole;
  assignedAt: number;
  assignedBy: string;
  permissions?: Permission[]; // Custom permissions override role defaults
}

// User with outlet context
export interface UserWithOutletContext {
  id: string;
  email: string;
  username: string;
  role: UserRole;
  avatar_url?: string;
  organization_id: string;
  outletRoles: OutletUserRole[];
  createdAt: number;
  updatedAt: number;
}

// Outlet definition
export interface Outlet {
  id: string;
  name: string;
  organizationId: string;
  location?: string;
  timezone?: string;
  createdAt: number;
  updatedAt: number;
  managerId?: string; // User ID of outlet manager
}

// Access control context for checking permissions
export interface AccessContext {
  userId: string;
  userRole: UserRole;
  outletId?: string; // Current outlet context
  organizationId: string;
  outletRoles: OutletUserRole[];
}

// Permission check result
export interface PermissionCheckResult {
  allowed: boolean;
  reason?: string;
  requiresOutlet?: boolean;
}

/**
 * Get permissions for a role
 */
export function getRolePermissions(role: UserRole): Permission[] {
  return ROLE_PERMISSIONS[role] || [];
}

/**
 * Check if role has specific permission
 */
export function roleHasPermission(role: UserRole, permission: Permission): boolean {
  const permissions = getRolePermissions(role);
  return permissions.includes(permission);
}

/**
 * Get user's role in a specific outlet
 */
export function getUserOutletRole(
  outletRoles: OutletUserRole[],
  outletId: string,
): UserRole | undefined {
  return outletRoles.find((or) => or.outletId === outletId)?.role;
}

/**
 * Get user's outlets
 */
export function getUserOutlets(outletRoles: OutletUserRole[]): string[] {
  return outletRoles.map((or) => or.outletId);
}

/**
 * Check if user is outlet manager
 */
export function isOutletManager(
  outletRoles: OutletUserRole[],
  outletId: string,
): boolean {
  const role = getUserOutletRole(outletRoles, outletId);
  return role === UserRole.ADMIN || role === UserRole.MANAGER;
}

/**
 * Check if user can access outlet
 */
export function canAccessOutlet(outletRoles: OutletUserRole[], outletId: string): boolean {
  return outletRoles.some((or) => or.outletId === outletId);
}
