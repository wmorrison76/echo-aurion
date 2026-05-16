import type { RoleCategoryId } from "./role-taxonomy";
import { ROLE_TAXONOMY } from "./role-taxonomy";

export type PermissionAction = "view" | "edit" | "publish" | "export" | "admin";

export type ModuleId =
  | "executive-dashboard"
  | "finance"
  | "purchasing"
  | "culinary"
  | "banquets"
  | "foh"
  | "beverage"
  | "rooms"
  | "spa"
  | "security"
  | "it-admin"
  | "reports"
  | "onboarding";

export const PERMISSION_MODULES: { id: ModuleId; label: string }[] = [
  { id: "executive-dashboard", label: "Executive Dashboard" },
  { id: "finance", label: "Finance Center" },
  { id: "purchasing", label: "Purchasing & Receiving" },
  { id: "culinary", label: "Culinary Ops" },
  { id: "banquets", label: "Banquets" },
  { id: "foh", label: "Front of House" },
  { id: "beverage", label: "Beverage Program" },
  { id: "rooms", label: "Rooms & Hotel Ops" },
  { id: "spa", label: "Spa & Wellness" },
  { id: "security", label: "Security Center" },
  { id: "it-admin", label: "IT & Admin Console" },
  { id: "reports", label: "Reports & Exports" },
  { id: "onboarding", label: "Onboarding & Roles" },
];

export type PermissionMatrix = Record<
  string,
  Partial<Record<ModuleId, PermissionAction[]>>
>;

const FULL_ACCESS: PermissionAction[] = [
  "view",
  "edit",
  "publish",
  "export",
  "admin",
];
const VIEW_EXPORT: PermissionAction[] = ["view", "export"];
const VIEW_EDIT: PermissionAction[] = ["view", "edit"];
const VIEW_ONLY: PermissionAction[] = ["view"];
const VIEW_EDIT_PUBLISH: PermissionAction[] = ["view", "edit", "publish"];
const VIEW_EDIT_EXPORT: PermissionAction[] = ["view", "edit", "export"];

const ROLE_GROUP_PERMISSIONS: Record<
  RoleCategoryId,
  Partial<Record<ModuleId, PermissionAction[]>>
> = {
  ownership: {
    "executive-dashboard": VIEW_EXPORT,
    finance: VIEW_EXPORT,
    purchasing: VIEW_EXPORT,
    culinary: VIEW_EXPORT,
    banquets: VIEW_EXPORT,
    foh: VIEW_EXPORT,
    beverage: VIEW_EXPORT,
    rooms: VIEW_EXPORT,
    spa: VIEW_EXPORT,
    security: VIEW_EXPORT,
    "it-admin": VIEW_ONLY,
    reports: VIEW_EXPORT,
    onboarding: VIEW_ONLY,
  },
  executive: {
    "executive-dashboard": VIEW_EDIT_EXPORT,
    finance: VIEW_EDIT_EXPORT,
    purchasing: VIEW_EDIT,
    culinary: VIEW_EDIT,
    banquets: VIEW_EDIT,
    foh: VIEW_EDIT,
    beverage: VIEW_EDIT,
    rooms: VIEW_EDIT,
    spa: VIEW_EDIT,
    security: VIEW_ONLY,
    "it-admin": VIEW_ONLY,
    reports: VIEW_EDIT_EXPORT,
    onboarding: VIEW_EDIT,
  },
  finance: {
    "executive-dashboard": VIEW_ONLY,
    finance: VIEW_EDIT_EXPORT,
    purchasing: VIEW_ONLY,
    culinary: VIEW_ONLY,
    banquets: VIEW_ONLY,
    foh: VIEW_ONLY,
    beverage: VIEW_ONLY,
    rooms: VIEW_ONLY,
    spa: VIEW_ONLY,
    security: VIEW_ONLY,
    "it-admin": VIEW_ONLY,
    reports: VIEW_EDIT_EXPORT,
    onboarding: VIEW_ONLY,
  },
  purchasing: {
    "executive-dashboard": VIEW_ONLY,
    finance: VIEW_ONLY,
    purchasing: VIEW_EDIT_PUBLISH,
    culinary: VIEW_ONLY,
    banquets: VIEW_ONLY,
    foh: VIEW_ONLY,
    beverage: VIEW_ONLY,
    rooms: VIEW_ONLY,
    spa: VIEW_ONLY,
    security: VIEW_ONLY,
    "it-admin": VIEW_ONLY,
    reports: VIEW_EDIT_EXPORT,
    onboarding: VIEW_ONLY,
  },
  culinary: {
    "executive-dashboard": VIEW_ONLY,
    finance: VIEW_ONLY,
    purchasing: VIEW_ONLY,
    culinary: VIEW_EDIT_PUBLISH,
    banquets: VIEW_EDIT,
    foh: VIEW_ONLY,
    beverage: VIEW_ONLY,
    rooms: VIEW_ONLY,
    spa: VIEW_ONLY,
    security: VIEW_ONLY,
    "it-admin": VIEW_ONLY,
    reports: VIEW_EDIT_EXPORT,
    onboarding: VIEW_ONLY,
  },
  banquets: {
    "executive-dashboard": VIEW_ONLY,
    finance: VIEW_ONLY,
    purchasing: VIEW_ONLY,
    culinary: VIEW_ONLY,
    banquets: VIEW_EDIT_PUBLISH,
    foh: VIEW_EDIT,
    beverage: VIEW_EDIT,
    rooms: VIEW_EDIT,
    spa: VIEW_ONLY,
    security: VIEW_ONLY,
    "it-admin": VIEW_ONLY,
    reports: VIEW_EDIT_EXPORT,
    onboarding: VIEW_ONLY,
  },
  foh: {
    "executive-dashboard": VIEW_ONLY,
    finance: VIEW_ONLY,
    purchasing: VIEW_ONLY,
    culinary: VIEW_ONLY,
    banquets: VIEW_ONLY,
    foh: VIEW_EDIT_PUBLISH,
    beverage: VIEW_EDIT,
    rooms: VIEW_ONLY,
    spa: VIEW_ONLY,
    security: VIEW_ONLY,
    "it-admin": VIEW_ONLY,
    reports: VIEW_ONLY,
    onboarding: VIEW_ONLY,
  },
  beverage: {
    "executive-dashboard": VIEW_ONLY,
    finance: VIEW_ONLY,
    purchasing: VIEW_ONLY,
    culinary: VIEW_ONLY,
    banquets: VIEW_ONLY,
    foh: VIEW_ONLY,
    beverage: VIEW_EDIT_PUBLISH,
    rooms: VIEW_ONLY,
    spa: VIEW_ONLY,
    security: VIEW_ONLY,
    "it-admin": VIEW_ONLY,
    reports: VIEW_ONLY,
    onboarding: VIEW_ONLY,
  },
  rooms: {
    "executive-dashboard": VIEW_ONLY,
    finance: VIEW_ONLY,
    purchasing: VIEW_ONLY,
    culinary: VIEW_ONLY,
    banquets: VIEW_ONLY,
    foh: VIEW_ONLY,
    beverage: VIEW_ONLY,
    rooms: VIEW_EDIT_PUBLISH,
    spa: VIEW_EDIT,
    security: VIEW_EDIT,
    "it-admin": VIEW_ONLY,
    reports: VIEW_EDIT_EXPORT,
    onboarding: VIEW_ONLY,
  },
  spa: {
    "executive-dashboard": VIEW_ONLY,
    finance: VIEW_ONLY,
    purchasing: VIEW_ONLY,
    culinary: VIEW_ONLY,
    banquets: VIEW_ONLY,
    foh: VIEW_ONLY,
    beverage: VIEW_ONLY,
    rooms: VIEW_ONLY,
    spa: VIEW_EDIT_PUBLISH,
    security: VIEW_ONLY,
    "it-admin": VIEW_ONLY,
    reports: VIEW_EDIT_EXPORT,
    onboarding: VIEW_ONLY,
  },
  security: {
    "executive-dashboard": VIEW_ONLY,
    finance: VIEW_ONLY,
    purchasing: VIEW_ONLY,
    culinary: VIEW_ONLY,
    banquets: VIEW_ONLY,
    foh: VIEW_ONLY,
    beverage: VIEW_ONLY,
    rooms: VIEW_ONLY,
    spa: VIEW_ONLY,
    security: VIEW_EDIT_PUBLISH,
    "it-admin": VIEW_ONLY,
    reports: VIEW_EDIT_EXPORT,
    onboarding: VIEW_ONLY,
  },
  "it-admin": {
    "executive-dashboard": VIEW_ONLY,
    finance: VIEW_ONLY,
    purchasing: VIEW_ONLY,
    culinary: VIEW_ONLY,
    banquets: VIEW_ONLY,
    foh: VIEW_ONLY,
    beverage: VIEW_ONLY,
    rooms: VIEW_ONLY,
    spa: VIEW_ONLY,
    security: VIEW_ONLY,
    "it-admin": VIEW_EDIT_PUBLISH,
    reports: VIEW_EDIT_EXPORT,
    onboarding: VIEW_EDIT,
  },
};

const superadminOverrides: Partial<Record<ModuleId, PermissionAction[]>> = {};
for (const m of PERMISSION_MODULES) {
  superadminOverrides[m.id] = FULL_ACCESS;
}

const ROLE_OVERRIDES: PermissionMatrix = {
  superadmin: superadminOverrides,
  owner: {
    "it-admin": VIEW_EDIT,
    onboarding: VIEW_EDIT,
  },
};

export const PERMISSIONS_MATRIX: PermissionMatrix =
  ROLE_TAXONOMY.reduce<PermissionMatrix>((acc, role) => {
    const defaults = ROLE_GROUP_PERMISSIONS[role.categoryId] ?? {};
    const overrides = ROLE_OVERRIDES[role.id] ?? {};
    acc[role.id] = { ...defaults, ...overrides };
    return acc;
  }, {});

export function isActionAllowed(
  roleId: string,
  moduleId: ModuleId,
  action: PermissionAction,
): boolean {
  const modulePermissions = PERMISSIONS_MATRIX[roleId]?.[moduleId];
  return Array.isArray(modulePermissions) && modulePermissions.includes(action);
}
