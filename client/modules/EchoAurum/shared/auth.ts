export type UserRole = "viewer" | "auditor" | "controller" | "admin";
export const ROLE_ORDER: UserRole[] = [
  "viewer",
  "auditor",
  "controller",
  "admin",
];
export const ROLE_LABELS: Record<UserRole, string> = {
  viewer: "Viewer",
  auditor: "Auditor",
  controller: "Controller",
  admin: "Administrator",
};
export function isRoleAtLeast(current: UserRole, required: UserRole) {
  return ROLE_ORDER.indexOf(current) >= ROLE_ORDER.indexOf(required);
}
export function normalizeUserRole(value: unknown): UserRole | null {
  if (typeof value !== "string") {
    return null;
  }
  const normalized = value.toLowerCase() as UserRole;
  return ROLE_ORDER.includes(normalized) ? normalized : null;
}
export interface RoleAssignment {
  role: UserRole;
  propertyIds: string[];
}
export function hasRoleAccess(
  assignment: RoleAssignment,
  requiredRole: UserRole,
  propertyId?: string,
) {
  const roleAllowed = isRoleAtLeast(assignment.role, requiredRole);
  if (!roleAllowed) {
    return false;
  }
  if (!propertyId) {
    return true;
  }
  return assignment.propertyIds.includes(propertyId);
}
