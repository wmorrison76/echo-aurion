#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

const STORE_PATH = path.resolve(
  process.cwd(),
  "server/localdata/forecast-plan.v1.json",
);
const TRACE_PATH = path.resolve(
  process.cwd(),
  "server/localdata/trace-ledger.v1.json",
);

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

const orgId = "demo-org";
const store = readJson(STORE_PATH, { version: 1, plans: {} });
if (!store.plans[orgId]) {
  const start = new Date();
  store.plans[orgId] = {
    orgId,
    startDate: start.toISOString().slice(0, 10),
    days: Array.from({ length: 21 }).map((_, idx) => {
      const day = new Date(start);
      day.setDate(start.getDate() + idx);
      return { date: day.toISOString().slice(0, 10), forecast: 120 + idx };
    }),
    updatedAt: new Date().toISOString(),
  };
}

const plan = store.plans[orgId];
plan.days[0] = { ...plan.days[0], override: (plan.days[0].forecast || 0) + 10 };
plan.updatedAt = new Date().toISOString();
writeJson(STORE_PATH, store);

appendTrace({
  id: `trace_${Date.now()}`,
  orgId,
  entityType: "forecast-plan",
  entityId: orgId,
  payload: { action: "FORECAST_UPDATED" },
  createdAt: new Date().toISOString(),
});
appendTrace({
  id: `trace_${Date.now()}_override`,
  orgId,
  entityType: "forecast-plan",
  entityId: orgId,
  payload: { action: "FORECAST_OVERRIDE_SET" },
  createdAt: new Date().toISOString(),
});

const ledger = readJson(TRACE_PATH, []);
const actions = ledger.map((entry) => entry.payload?.action);
if (!actions.includes("FORECAST_UPDATED")) {
  throw new Error("Missing FORECAST_UPDATED action");
}
if (!actions.includes("FORECAST_OVERRIDE_SET")) {
  throw new Error("Missing FORECAST_OVERRIDE_SET action");
}

console.log("OK: forecast plan smoke complete");
