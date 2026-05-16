export type OnboardingOrgInput = {
  orgId?: string;
  name: string;
};

export type OnboardingOutletInput = {
  id?: string;
  name: string;
  location?: string | null;
};

export type OnboardingDepartmentInput = {
  id?: string;
  name: string;
  outletId?: string | null;
};

export type OnboardingRoleInput = {
  id?: string;
  name: string;
  permissions?: string[];
};

export type OnboardingAssignmentInput = {
  id?: string;
  userId: string;
  roleId: string;
  outletId?: string | null;
  departmentId?: string | null;
};

export type OnboardingStorageLocationInput = {
  id?: string;
  name: string;
  outletId?: string | null;
  departmentId?: string | null;
};

export type OnboardingProvisionPayload = {
  org: OnboardingOrgInput;
  outlets: OnboardingOutletInput[];
  departments: OnboardingDepartmentInput[];
  roles: OnboardingRoleInput[];
  assignments: OnboardingAssignmentInput[];
  storageLocations: OnboardingStorageLocationInput[];
};
