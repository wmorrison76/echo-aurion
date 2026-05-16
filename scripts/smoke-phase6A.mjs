#!/usr/bin/env node
import { spawnSync } from "node:child_process";

const steps = [
  { label: "typecheck", cmd: "pnpm", args: ["typecheck"] },
  { label: "build", cmd: "pnpm", args: ["build"] },
  { label: "panel-audit", cmd: "node", args: ["scripts/audit-panel-registry.mjs"] },
  { label: "core-panels", cmd: "node", args: ["scripts/smoke-open-core-panels.mjs"] },
  { label: "investor-flow-beverage", cmd: "node", args: ["scripts/smoke-investor-flow-beverage.mjs"] },
];

for (const step of steps) {
  console.log(`\n-> Phase 6A smoke: ${step.label}`);
  const result = spawnSync(step.cmd, step.args, { stdio: "inherit", shell: false });
  if (result.status !== 0) {
    console.error(`\nERROR: Phase 6A smoke failed at ${step.label}`);
    process.exit(result.status ?? 1);
  }
}

console.log("\nOK: Phase 6A smoke checks completed.");
