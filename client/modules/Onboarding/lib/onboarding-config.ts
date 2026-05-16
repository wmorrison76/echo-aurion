import { ROLE_TAXONOMY } from "./role-taxonomy";

export type DepartmentId =
  | "ownership"
  | "executive"
  | "finance"
  | "purchasing"
  | "culinary"
  | "banquets"
  | "foh"
  | "beverage"
  | "rooms"
  | "spa"
  | "security"
  | "it-admin";

export const DEPARTMENT_OPTIONS: { id: DepartmentId; label: string }[] = [
  { id: "ownership", label: "Ownership & Board" },
  { id: "executive", label: "Executive Committee" },
  { id: "finance", label: "Finance" },
  { id: "purchasing", label: "Purchasing & Receiving" },
  { id: "culinary", label: "Culinary" },
  { id: "banquets", label: "Banquets" },
  { id: "foh", label: "Front of House" },
  { id: "beverage", label: "Beverage" },
  { id: "rooms", label: "Rooms & Hotel Ops" },
  { id: "spa", label: "Spa & Wellness" },
  { id: "security", label: "Security" },
  { id: "it-admin", label: "IT & Admin" },
];

export type OrganizationType =
  | "hotel"
  | "resort"
  | "casino"
  | "spa"
  | "restaurant-group"
  | "venue"
  | "other";

export interface OnboardingConfig {
  version: "v1";
  organization: {
    name: string;
    type: OrganizationType;
    timezone: string;
  };
  operations: {
    outletCount: number;
    hasBanquets: boolean;
    banquetRooms: number;
  };
  departments: DepartmentId[];
  roles: {
    primaryAdminName: string;
    primaryAdminRoleId: string;
    assignedRoles: string[];
  };
  preferences: {
    notifications: boolean;
    tutorials: boolean;
  };
}

export const ROLE_OPTIONS = ROLE_TAXONOMY.map((role) => ({
  id: role.id,
  label: role.label,
  categoryId: role.categoryId,
}));

export function buildOnboardingConfig(params: {
  organizationName: string;
  organizationType: OrganizationType;
  timezone: string;
  outletCount: number;
  hasBanquets: boolean;
  banquetRooms: number;
  departments: string[];
  primaryAdminName: string;
  primaryAdminRoleId: string;
  assignedRoles: string[];
  notifications: boolean;
  tutorials: boolean;
}): OnboardingConfig {
  return {
    version: "v1",
    organization: {
      name: params.organizationName,
      type: params.organizationType,
      timezone: params.timezone,
    },
    operations: {
      outletCount: params.outletCount,
      hasBanquets: params.hasBanquets,
      banquetRooms: params.banquetRooms,
    },
    departments: params.departments as DepartmentId[],
    roles: {
      primaryAdminName: params.primaryAdminName,
      primaryAdminRoleId: params.primaryAdminRoleId,
      assignedRoles: params.assignedRoles,
    },
    preferences: {
      notifications: params.notifications,
      tutorials: params.tutorials,
    },
  };
}

export function createSampleOnboardingConfig(): OnboardingConfig {
  return buildOnboardingConfig({
    organizationName: "Lakeside Resort & Spa",
    organizationType: "resort",
    timezone: "America/New_York",
    outletCount: 3,
    hasBanquets: true,
    banquetRooms: 8,
    departments: [
      "executive",
      "finance",
      "purchasing",
      "culinary",
      "banquets",
      "foh",
    ],
    primaryAdminName: "Jordan Ellis",
    primaryAdminRoleId: "gm",
    assignedRoles: ["executive-chef", "banquets-director", "controller"],
    notifications: true,
    tutorials: true,
  });
}
