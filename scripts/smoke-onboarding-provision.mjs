#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { z } from "zod";

const STORE_PATH = path.resolve(
  process.cwd(),
  "server/localdata/onboarding-provision.v1.json",
);
const TRACE_PATH = path.resolve(
  process.cwd(),
  "server/localdata/trace-ledger.v1.json",
);

const payloadSchema = z.object({
  org: z.object({ orgId: z.string().optional(), name: z.string().min(1) }),
  outlets: z.array(z.object({ id: z.string().optional(), name: z.string() })),
  departments: z.array(z.object({ id: z.string().optional(), name: z.string() })),
  roles: z.array(z.object({ id: z.string().optional(), name: z.string() })),
  assignments: z.array(
    z.object({
      id: z.string().optional(),
      userId: z.string(),
      roleId: z.string(),
    }),
  ),
  storageLocations: z.array(z.object({ id: z.string().optional(), name: z.string() })),
});

const createId = (prefix) =>
  `${prefix}_${Date.now()}_${Math.random().toString(16).slice(2)}`;

const readJson = (filePath, fallback) => {
  if (!fs.existsSync(filePath)) return fallback;
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
};

const writeJson = (filePath, value) => {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(value, null, 2), "utf8");
};

const appendTrace = (entry) => {
  const ledger = readJson(TRACE_PATH, []);
  ledger.unshift(entry);
  writeJson(TRACE_PATH, ledger);
};

const payload = payloadSchema.parse({
  org: { name: "Echo Hospitality Group" },
  outlets: [{ name: "Harbor Room" }, { name: "Skyline Lounge" }],
  departments: [{ name: "Culinary" }, { name: "Beverage" }],
  roles: [{ name: "Manager" }, { name: "Chef" }],
  assignments: [
    { userId: "user-1", roleId: "role-manager" },
    { userId: "user-2", roleId: "role-chef" },
  ],
  storageLocations: [{ name: "Main Walk-in" }, { name: "Dry Storage" }],
});

const store = readJson(STORE_PATH, { version: 1, orgs: {} });
const orgId = payload.org.orgId || createId("org");
if (!store.orgs[orgId]) {
  store.orgs[orgId] = {
    org: { orgId, name: payload.org.name, createdAt: new Date().toISOString() },
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
  createdAt: new Date().toISOString(),
}));
bucket.outlets.push(...outlets);
const roles = payload.roles.map((role) => ({
  id: role.id || createId("role"),
  orgId,
  name: role.name,
  permissions: [],
  createdAt: new Date().toISOString(),
}));
bucket.roles.push(...roles);
const storageLocations = payload.storageLocations.map((location) => ({
  id: location.id || createId("storage"),
  orgId,
  name: location.name,
  createdAt: new Date().toISOString(),
}));
bucket.storageLocations.push(...storageLocations);
writeJson(STORE_PATH, store);

appendTrace({
  id: createId("trace"),
  orgId,
  entityType: "org",
  entityId: orgId,
  payload: { action: "ORG_PROVISIONED" },
  createdAt: new Date().toISOString(),
});
outlets.forEach((outlet) =>
  appendTrace({
    id: createId("trace"),
    orgId,
    entityType: "outlet",
    entityId: outlet.id,
    payload: { action: "OUTLET_CREATED" },
    createdAt: new Date().toISOString(),
  }),
);
payload.assignments.forEach((assignment) =>
  appendTrace({
    id: createId("trace"),
    orgId,
    entityType: "role-assignment",
    entityId: assignment.id || createId("assign"),
    payload: { action: "ROLE_ASSIGNED" },
    createdAt: new Date().toISOString(),
  }),
);
storageLocations.forEach((location) =>
  appendTrace({
    id: createId("trace"),
    orgId,
    entityType: "storage-location",
    entityId: location.id,
    payload: { action: "STORAGE_LOCATION_CREATED" },
    createdAt: new Date().toISOString(),
  }),
);

const ledger = readJson(TRACE_PATH, []);
const actions = ledger.map((entry) => entry.payload?.action);
["ORG_PROVISIONED", "OUTLET_CREATED", "ROLE_ASSIGNED", "STORAGE_LOCATION_CREATED"].forEach(
  (action) => {
    if (!actions.includes(action)) {
      throw new Error(`Missing trace action ${action}`);
    }
  },
);

console.log("OK: onboarding provision smoke complete");
