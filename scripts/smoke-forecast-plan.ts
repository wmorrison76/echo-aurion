import fs from "node:fs";
import path from "node:path";
import { loadForecastPlan, saveForecastPlan } from "../server/services/forecast-plan-service";

const assert = (condition: boolean, message: string) => {
  if (!condition) throw new Error(message);
};

const run = async () => {
  const orgId = "demo-org";
  const plan = await loadForecastPlan(orgId);
  assert(plan.days.length === 21, "Expected 21-day plan");

  const next = {
    ...plan,
    days: plan.days.map((day, index) =>
      index === 0 ? { ...day, override: (day.forecast || 0) + 15 } : day,
    ),
  };
  await saveForecastPlan(orgId, next);

  const ledgerPath = path.resolve(
    process.cwd(),
    "server/localdata/trace-ledger.v1.json",
  );
  const ledger = fs.existsSync(ledgerPath)
    ? JSON.parse(fs.readFileSync(ledgerPath, "utf8"))
    : [];
  const actions = ledger.map((entry: any) => entry.payload?.action);

  assert(actions.includes("FORECAST_UPDATED"), "Missing FORECAST_UPDATED action");
  assert(
    actions.includes("FORECAST_OVERRIDE_SET"),
    "Missing FORECAST_OVERRIDE_SET action",
  );

  console.log("OK: forecast plan smoke complete");
};

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
