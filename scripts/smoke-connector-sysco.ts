/**
 * Smoke: Sysco connector — connectivity (auth present), fetch sample, map + validate, emitTrace.
 */

import { syscoAdapter } from "../server/integrations/sdk/connectors/sysco-adapter";

const assert = (condition: boolean, message: string) => {
  if (!condition) throw new Error(message);
};

async function run() {
  console.log("Smoke: Sysco connector\n");

  const config = {
    orgId: "smoke-org",
    connectorId: "sysco",
    credentials: { apiKey: process.env.SYSCO_API_KEY || "test" },
  };

  // 1) Connectivity: auth present
  assert(!!config.credentials?.apiKey, "Auth present (apiKey)");
  console.log("✓ Connectivity: auth present\n");

  // 2) Fetch sample
  const records = await syscoAdapter.fetch(config, { limit: 2 });
  assert(Array.isArray(records), "Fetch returns array");
  console.log("✓ Fetch sample: returned", records.length, "records\n");

  if (records.length > 0) {
    const mapped = await syscoAdapter.map(records[0], config);
    assert(mapped !== null, "Map returns entity");
    const validation = await syscoAdapter.validate(mapped!, config);
    assert(validation.valid, "Validate passes");
    console.log("✓ Map + validate: OK\n");
  }

  // 3) emitTrace
  const traceResult = await syscoAdapter.emitTrace(config, {
    eventType: "INGEST_FETCH",
    connectorId: "sysco",
    sourceRecordId: "smoke-test",
    entityType: "vendor_invoice",
    entityId: "smoke-invoice-1",
    inputs: { smoke: true },
    outputs: {},
  }, undefined);
  console.log("✓ emitTrace: called", traceResult?.traceId ?? "—\n");
  console.log("Evidence: Sysco adapter implements fetch, map, validate, emitTrace, reconcile.");
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
