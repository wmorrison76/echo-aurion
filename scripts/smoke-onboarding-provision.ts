import fs from "node:fs";
import path from "node:path";
import { provisionOnboarding } from "../server/services/onboarding-provision-service";

const payload = {
  org: { name: "Echo Hospitality Group" },
  outlets: [
    { name: "Harbor Room", location: "San Diego" },
    { name: "Skyline Lounge", location: "Austin" },
  ],
  departments: [
    { name: "Culinary", outletId: null },
    { name: "Beverage", outletId: null },
  ],
  roles: [
    { name: "Manager", permissions: ["menu:edit", "forecast:edit"] },
    { name: "Chef", permissions: ["menu:read", "production:edit"] },
  ],
  assignments: [
    { userId: "user-1", roleId: "role_manager", outletId: null, departmentId: null },
    { userId: "user-2", roleId: "role_chef", outletId: null, departmentId: null },
  ],
  storageLocations: [
    { name: "Main Walk-in", outletId: null, departmentId: null },
    { name: "Dry Storage", outletId: null, departmentId: null },
  ],
};

const assert = (condition: boolean, message: string) => {
  if (!condition) {
    throw new Error(message);
  }
};

const run = async () => {
  const result = await provisionOnboarding(payload);
  assert(result.outlets.length >= 2, "Expected outlets to be created.");
  assert(result.roles.length >= 2, "Expected roles to be created.");
  assert(result.storageLocations.length >= 2, "Expected storage locations to be created.");

  const ledgerPath = path.resolve(
    process.cwd(),
    "server/localdata/trace-ledger.v1.json",
  );
  const ledger = fs.existsSync(ledgerPath)
    ? JSON.parse(fs.readFileSync(ledgerPath, "utf8"))
    : [];
  const actions = ledger.map((entry: any) => entry.payload?.action);

  const required = [
    "ORG_PROVISIONED",
    "OUTLET_CREATED",
    "ROLE_ASSIGNED",
    "STORAGE_LOCATION_CREATED",
  ];
  required.forEach((action) => {
    assert(actions.includes(action), `Missing trace action ${action}`);
  });

  console.log("OK: onboarding provision smoke complete");
};

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
