#!/usr/bin/env node
import fs from "node:fs";
import { spawnSync } from "node:child_process";

const steps = [
  { label: "typecheck", cmd: "pnpm", args: ["typecheck"] },
  { label: "build", cmd: "pnpm", args: ["build"] },
  { label: "panel-audit", cmd: "node", args: ["scripts/audit-panel-registry.mjs"] },
  { label: "core-panels", cmd: "node", args: ["scripts/smoke-open-core-panels.mjs"] },
  { label: "panel-runtime", cmd: "node", args: ["scripts/audit-panels-runtime.mjs"] },
  { label: "onboarding-provision", cmd: "node", args: ["scripts/smoke-onboarding-provision.mjs"] },
  { label: "forecast-plan", cmd: "node", args: ["scripts/smoke-forecast-plan.mjs"] },
  { label: "spine-chain", cmd: "node", args: ["scripts/smoke-spine-chain.mjs"] },
];

const optional = [
  "scripts/smoke-phase6B.mjs",
  "scripts/smoke-phase6C.mjs",
  "scripts/smoke-phase6D.mjs",
];

optional.forEach((script) => {
  if (fs.existsSync(script)) {
    steps.push({ label: script.replace("scripts/", ""), cmd: "node", args: [script] });
  }
});

for (const step of steps) {
  console.log(`\n-> Phase 7 smoke: ${step.label}`);
  const result = spawnSync(step.cmd, step.args, { stdio: "inherit", shell: false });
  if (result.status !== 0) {
    console.error(`\nERROR: Phase 7 smoke failed at ${step.label}`);
    process.exit(result.status ?? 1);
  }
}

console.log("\nOK: Phase 7 smoke checks completed.");
