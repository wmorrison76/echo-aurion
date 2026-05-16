import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

import Ajv2020 from "ajv/dist/2020";
import addFormats from "ajv-formats";
import { describe, expect, it } from "vitest";

function createValidator() {
  const instance = new Ajv2020({
    allErrors: true,
    strict: true,
  });
  addFormats(instance);
  return instance;
}

describe("inventory-item schema", () => {
  const schemaPath = path.resolve(
    path.dirname(fileURLToPath(import.meta.url)),
    "../schemas/inventory-item.schema.json",
  );

  it("accepts a valid inventory record", async () => {
    const schema = JSON.parse(await readFile(schemaPath, "utf8"));
    const ajv = createValidator();
    const validate = ajv.compile(schema);

    const sample = {
      sku: "CREMEBRULEE-01",
      name: "Heavy Cream 32oz",
      uom: "qt",
      case_size: "6 x 32oz",
      on_hand: 12,
      par: 18,
      vendor_id: "US-DAIRY-01",
      category: "dairy",
      last_counted_at: new Date().toISOString(),
    };

    expect(validate(sample)).toBe(true);
  });

  it("rejects an invalid record", async () => {
    const schema = JSON.parse(await readFile(schemaPath, "utf8"));
    const ajv = createValidator();
    const validate = ajv.compile(schema);

    const invalid = {
      sku: "",
      name: "Vanilla Beans",
      uom: "ea",
      case_size: "12ct",
      on_hand: -4,
    };

    const result = validate(invalid);
    expect(result).toBe(false);
    expect(validate.errors?.length).toBeGreaterThan(0);
  });
});
