/**
 * Cycle: run link smoke then stress; regenerate repairs/TODO each time.
 * Repeat until both pass or max iterations. Fix items from REPAIR_TODO between runs.
 *
 * Usage:
 *   pnpm exec tsx scripts/smoke-system/cycle-until-pass.ts
 *   SMOKE_SKIP_HTTP=1 SMOKE_CYCLE_MAX=3 pnpm exec tsx scripts/smoke-system/cycle-until-pass.ts
 *
 * Env:
 *   SMOKE_SKIP_HTTP=1     Skip API/SPA smoke (panel-only).
 *   SMOKE_CYCLE_MAX=N    Max cycles (default 5).
 *   SMOKE_STRESS_ROUNDS  Passed to stress (default 2).
 */

import { spawnSync } from "child_process";
import { PATHS } from "./config.ts";

const ROOT = PATHS.root;
const MAX_CYCLES = Math.max(1, parseInt(process.env.SMOKE_CYCLE_MAX ?? "5", 10));

function run(cmd: string, args: string[], env?: NodeJS.ProcessEnv): { ok: boolean } {
  const r = spawnSync(cmd, args, { cwd: ROOT, stdio: "inherit", shell: false, env: { ...process.env, ...env } });
  return { ok: (r.status ?? 1) === 0 };
}

function main(): void {
  const skipHttp = process.env.SMOKE_SKIP_HTTP === "1" || process.env.SMOKE_SKIP_HTTP === "true";
  console.log(`\nCycle until pass (max ${MAX_CYCLES}), SMOKE_SKIP_HTTP=${skipHttp}\n`);

  for (let cycle = 1; cycle <= MAX_CYCLES; cycle++) {
    console.log(`\n========== Cycle ${cycle}/${MAX_CYCLES} ==========`);
    const env = skipHttp ? { SMOKE_SKIP_HTTP: "1" } : {};
    const smokeOk = run("pnpm", ["exec", "tsx", "scripts/smoke-system/run-all-link-smoke.ts"], env);
    const stressOk = run("pnpm", ["exec", "tsx", "scripts/smoke-system/stress-link-smoke.ts"], env);
    if (smokeOk.ok && stressOk.ok) {
      console.log("\nAll smoke and stress checks passed. System passes.");
      process.exit(0);
    }
    console.log(`\nCycle ${cycle}: smoke or stress had failures. See SMOKE_REPAIRS_*.md and REPAIR_TODO_*.md.`);
    if (cycle < MAX_CYCLES) console.log("Fix repairs, then re-run to continue.");
  }

  console.log(`\nStopped after ${MAX_CYCLES} cycle(s). Fix items in REPAIR_TODO and re-run.`);
  process.exit(1);
}

main();
