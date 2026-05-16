import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

import Ajv2020 from "ajv/dist/2020";
import addFormats from "ajv-formats";
import { describe, expect, it } from "vitest";

import { createSampleOnboardingConfig } from "../client/modules/Onboarding/lib/onboarding-config";
import {
  isActionAllowed,
  PERMISSIONS_MATRIX,
  type ModuleId,
} from "../client/modules/Onboarding/lib/permissions";

function createValidator() {
  const instance = new Ajv2020({
    allErrors: true,
    strict: true,
  });
  addFormats(instance);
  return instance;
}

describe("onboarding config schema", () => {
  const schemaPath = path.resolve(
    path.dirname(fileURLToPath(import.meta.url)),
    "../schemas/onboarding-config.schema.json",
  );

  it("accepts a valid onboarding config", async () => {
    const schema = JSON.parse(await readFile(schemaPath, "utf8"));
    const ajv = createValidator();
    const validate = ajv.compile(schema);
    const sample = createSampleOnboardingConfig();

    expect(validate(sample)).toBe(true);
  });

  it("rejects missing organization name", async () => {
    const schema = JSON.parse(await readFile(schemaPath, "utf8"));
    const ajv = createValidator();
    const validate = ajv.compile(schema);
    const sample = createSampleOnboardingConfig();

    const invalid = {
      ...sample,
      organization: {
        ...sample.organization,
        name: "",
      },
    };

    const result = validate(invalid);
    expect(result).toBe(false);
    expect(validate.errors?.length).toBeGreaterThan(0);
  });
});

describe("permission gating sanity checks", () => {
  it("grants superadmin admin access to all modules", () => {
    const superadmin = PERMISSIONS_MATRIX.superadmin;
    expect(superadmin).toBeDefined();

    const moduleIds = Object.keys(superadmin ?? {}) as ModuleId[];
    expect(moduleIds.length).toBeGreaterThan(0);

    moduleIds.forEach((moduleId) => {
      const actions = superadmin?.[moduleId] ?? [];
      expect(actions).toContain("admin");
    });
  });

  it("blocks server (FOH) export access to reports", () => {
    expect(isActionAllowed("server", "reports" as ModuleId, "export")).toBe(false);
  });

  it("allows executive edit access to executive dashboard", () => {
    expect(isActionAllowed("ceo", "executive-dashboard", "edit")).toBe(true);
  });

  it("allows culinary publish access to culinary ops", () => {
    expect(isActionAllowed("executive-chef", "culinary", "publish")).toBe(true);
  });
});
