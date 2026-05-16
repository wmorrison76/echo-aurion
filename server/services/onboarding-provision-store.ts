import path from "path";
import { promises as fs } from "fs";
import type { OnboardingProvisionPayload } from "../../shared/types/onboarding";

export type OnboardingOrg = {
  orgId: string;
  name: string;
  createdAt: string;
};

export type OnboardingOutlet = {
  id: string;
  orgId: string;
  name: string;
  location?: string | null;
  createdAt: string;
};

export type OnboardingDepartment = {
  id: string;
  orgId: string;
  outletId?: string | null;
  name: string;
  createdAt: string;
};

export type OnboardingRole = {
  id: string;
  orgId: string;
  name: string;
  permissions: string[];
  createdAt: string;
};

export type OnboardingAssignment = {
  id: string;
  orgId: string;
  userId: string;
  roleId: string;
  outletId?: string | null;
  departmentId?: string | null;
  createdAt: string;
};

export type OnboardingStorageLocation = {
  id: string;
  orgId: string;
  outletId?: string | null;
  departmentId?: string | null;
  name: string;
  createdAt: string;
};

type StoreShape = {
  version: 1;
  orgs: Record<
    string,
    {
      org: OnboardingOrg;
      outlets: OnboardingOutlet[];
      departments: OnboardingDepartment[];
      roles: OnboardingRole[];
      assignments: OnboardingAssignment[];
      storageLocations: OnboardingStorageLocation[];
    }
  >;
};

const STORE_PATH = path.resolve(process.cwd(), "server/localdata/onboarding-provision.v1.json");

const nowIso = () => new Date().toISOString();

const createId = (prefix: string) =>
  `${prefix}_${Date.now()}_${Math.random().toString(16).slice(2)}`;

const ensureDir = async () => {
  await fs.mkdir(path.dirname(STORE_PATH), { recursive: true });
};

const readStore = async (): Promise<StoreShape> => {
  try {
    const raw = await fs.readFile(STORE_PATH, "utf8");
    const parsed = JSON.parse(raw) as StoreShape;
    if (!parsed || parsed.version !== 1 || typeof parsed.orgs !== "object") {
      return { version: 1, orgs: {} };
    }
    return parsed;
  } catch {
    return { version: 1, orgs: {} };
  }
};

const writeStore = async (next: StoreShape) => {
  await ensureDir();
  await fs.writeFile(STORE_PATH, JSON.stringify(next, null, 2), "utf8");
};

export const provisionOnboardingStore = async (payload: OnboardingProvisionPayload) => {
  const store = await readStore();
  const orgId = payload.org.orgId || createId("org");

  if (!store.orgs[orgId]) {
    store.orgs[orgId] = {
      org: { orgId, name: payload.org.name, createdAt: nowIso() },
      outlets: [],
      departments: [],
      roles: [],
      assignments: [],
      storageLocations: [],
    };
  }

  const bucket = store.orgs[orgId];

  const outlets = payload.outlets.map((outlet) => ({
    id: outlet.id || createId("outlet"),
    orgId,
    name: outlet.name,
    location: outlet.location ?? null,
    createdAt: nowIso(),
  }));
  bucket.outlets.push(...outlets);

  const departments = payload.departments.map((dept) => ({
    id: dept.id || createId("dept"),
    orgId,
    outletId: dept.outletId ?? null,
    name: dept.name,
    createdAt: nowIso(),
  }));
  bucket.departments.push(...departments);

  const roles = payload.roles.map((role) => ({
    id: role.id || createId("role"),
    orgId,
    name: role.name,
    permissions: role.permissions ?? [],
    createdAt: nowIso(),
  }));
  bucket.roles.push(...roles);

  const assignments = payload.assignments.map((assignment) => ({
    id: assignment.id || createId("assign"),
    orgId,
    userId: assignment.userId,
    roleId: assignment.roleId,
    outletId: assignment.outletId ?? null,
    departmentId: assignment.departmentId ?? null,
    createdAt: nowIso(),
  }));
  bucket.assignments.push(...assignments);

  const storageLocations = payload.storageLocations.map((location) => ({
    id: location.id || createId("storage"),
    orgId,
    outletId: location.outletId ?? null,
    departmentId: location.departmentId ?? null,
    name: location.name,
    createdAt: nowIso(),
  }));
  bucket.storageLocations.push(...storageLocations);

  await writeStore(store);

  return {
    orgId,
    org: bucket.org,
    outlets,
    departments,
    roles,
    assignments,
    storageLocations,
  };
};
