import fs from "node:fs";
import path from "node:path";
import { loadForecastPlan, saveForecastPlan } from "../server/services/forecast-plan-service";
import { deriveInventoryImplications, getDemandDeltasByTraceId } from "../server/services/inventory-implications-service";
import { consumeDemandDeltasForMenu } from "../server/services/menu-builder-consumption-service";
import { TraceLedgerService } from "../server/services/trace-ledger-service";

const assert = (condition: boolean, message: string) => {
  if (!condition) throw new Error(message);
};

const orgId = "demo-org";

const run = async () => {
  console.log("Phase 7.5 Smoke Test: Forecast → Menu → Inventory Loop\n");

  // Step 1: Load existing forecast plan
  console.log("Step 1: Loading forecast plan...");
  const plan = await loadForecastPlan(orgId);
  assert(plan.days.length === 21, "Expected 21-day plan");
  console.log(`✓ Loaded forecast plan with ${plan.days.length} days\n`);

  // Step 2: Update forecast plan to trigger demand delta emission
  console.log("Step 2: Updating forecast plan to emit demand deltas...");
  const updatedPlan = {
    ...plan,
    days: plan.days.map((day, index) =>
      index === 0
        ? { ...day, forecast: (day.forecast || 120) + 20 } // Increase first day by 20
        : index === 1
          ? { ...day, forecast: (day.forecast || 122) - 10 } // Decrease second day by 10
          : day,
    ),
  };

  const result = await saveForecastPlan(orgId, updatedPlan, {
    userId: "smoke-test-user",
    role: "admin",
    system: "forecast-hub",
  });

  assert(result.traceId, "Expected traceId from saveForecastPlan");
  assert(result.deltas.length > 0, "Expected demand deltas to be emitted");
  console.log(`✓ Emitted ${result.deltas.length} demand deltas`);
  console.log(`✓ TraceId: ${result.traceId}\n`);

  const traceId = result.traceId;

  // Step 3: Verify demand deltas in trace ledger
  console.log("Step 3: Verifying demand deltas in trace ledger...");
  const ledgerPath = path.resolve(
    process.cwd(),
    "server/localdata/trace-ledger.v1.json",
  );
  const ledger = fs.existsSync(ledgerPath)
    ? JSON.parse(fs.readFileSync(ledgerPath, "utf8"))
    : [];

  const demandDeltaEntries = ledger.filter(
    (entry: any) =>
      entry.entityType === "demand-delta" && entry.sourceRef === traceId,
  );
  assert(
    demandDeltaEntries.length > 0,
    "Expected demand delta entries in trace ledger",
  );
  console.log(`✓ Found ${demandDeltaEntries.length} demand delta entries\n`);

  // Step 4: Simulate Menu Builder consuming deltas
  console.log("Step 4: Simulating Menu Builder consuming deltas...");
  const menuId = `menu-${Date.now()}`;
  const consumptionResult = await consumeDemandDeltasForMenu(
    orgId,
    menuId,
    traceId,
    {
      userId: "smoke-test-user",
      role: "admin",
      system: "menu-builder",
    },
  );
  assert(consumptionResult !== null, "Expected Menu Builder to consume deltas");
  assert(consumptionResult.deltas.length > 0, "Expected deltas to be consumed");
  console.log(`✓ Menu Builder consumed ${consumptionResult.deltas.length} deltas`);
  console.log(`✓ Consumption traced with traceId: ${consumptionResult.traceId}\n`);
  
  const deltas = consumptionResult.deltas;

  // Step 5: Derive inventory implications
  console.log("Step 5: Deriving inventory implications...");
  const implications = await deriveInventoryImplications(
    orgId,
    traceId,
    deltas,
    {
      userId: "smoke-test-user",
      role: "admin",
      system: "inventory-engine",
    },
  );
  assert(
    implications.length > 0,
    "Expected inventory implications to be derived",
  );
  console.log(`✓ Derived ${implications.length} inventory implications\n`);

  // Step 6: Verify trace continuity
  console.log("Step 6: Verifying trace continuity...");
  
  // Re-read ledger to get latest entries including inventory implications
  const updatedLedger = fs.existsSync(ledgerPath)
    ? JSON.parse(fs.readFileSync(ledgerPath, "utf8"))
    : [];
  
  const allTraces = updatedLedger.filter(
    (entry: any) => entry.orgId === orgId && entry.sourceRef === traceId,
  );
  const traceActions = allTraces.map((entry: any) => entry.payload?.action);

  // Check for all three domains
  const hasForecastDelta = traceActions.some((a) =>
    a?.includes("DEMAND_DELTA_EMITTED"),
  );
  const hasMenuConsumption = traceActions.some((a) =>
    a?.includes("DEMAND_DELTA_CONSUMED"),
  );
  const hasInventoryImplication = traceActions.some((a) =>
    a?.includes("INVENTORY_IMPLICATION_DERIVED"),
  );

  assert(hasForecastDelta, "Missing DEMAND_DELTA_EMITTED from ForecastHub");
  assert(hasMenuConsumption, "Missing DEMAND_DELTA_CONSUMED from Menu Builder");
  assert(
    hasInventoryImplication,
    "Missing INVENTORY_IMPLICATION_DERIVED from Inventory",
  );

  console.log(`✓ Found ${allTraces.length} trace entries linked by traceId`);
  console.log(`✓ ForecastHub: DEMAND_DELTA_EMITTED`);
  console.log(`✓ Menu Builder: DEMAND_DELTA_CONSUMED`);
  console.log(`✓ Inventory: INVENTORY_IMPLICATION_DERIVED`);
  
  // Verify trace continuity - all should share the same traceId
  const uniqueSourceRefs = new Set(allTraces.map((entry: any) => entry.sourceRef));
  assert(
    uniqueSourceRefs.size === 1 && uniqueSourceRefs.has(traceId),
    "All traces must share the same traceId (sourceRef)",
  );
  console.log(`✓ Trace continuity verified: all entries share traceId ${traceId}`);

  console.log("\n✅ Phase 7.5 smoke test complete!");
  console.log("\nTrace Continuity Summary:");
  console.log(`- TraceId: ${traceId}`);
  console.log(`- ForecastHub: emitted ${result.deltas.length} demand deltas`);
  console.log(`- Menu Builder: consumed ${consumptionResult.deltas.length} deltas`);
  console.log(`- Inventory: derived ${implications.length} implications`);
  console.log(`- All traces linked via shared traceId (sourceRef)`);
  console.log(`\n✅ Closed loop verified: Forecast → Menu → Inventory`);
};

run().catch((error) => {
  console.error("❌ Smoke test failed:", error);
  process.exit(1);
});
