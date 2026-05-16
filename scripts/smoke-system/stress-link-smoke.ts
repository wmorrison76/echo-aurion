/**
 * Stress test: run full link smoke multiple times and optionally vitest at higher difficulty.
 * Merges all failures into one set (by id/surface) and writes STRESS_REPAIRS_*.md/.json
 * and appends to REPAIR_TODO. Use after initial smoke to find flaky or load-related breakages.
 *
 * Usage:
 *   pnpm exec tsx scripts/smoke-system/stress-link-smoke.ts
 *   SMOKE_STRESS_ROUNDS=3 pnpm exec tsx scripts/smoke-system/stress-link-smoke.ts
 *   SMOKE_STRESS_ROUNDS=2 SMOKE_STRESS_VITEST=1 pnpm exec tsx scripts/smoke-system/stress-link-smoke.ts
 */

import { spawnSync } from "child_process";
import fs from "fs";
import path from "path";
import { PATHS } from "./config.ts";
import { writeLinkInventory } from "./link-inventory.ts";
import type { TestFailure } from "./runner.ts";
import { generateTodo, writeTodoList } from "./todo.ts";

const ROOT = PATHS.root;
const ROUNDS = Math.max(1, parseInt(process.env.SMOKE_STRESS_ROUNDS ?? "2", 10));
const RUN_VITEST = process.env.SMOKE_STRESS_VITEST === "1" || process.env.SMOKE_STRESS_VITEST === "true";

interface RepairEntry {
  id: string;
  surface: "panel" | "api" | "route";
  error: string;
  intendedPurpose: string;
  seenInRounds: number;
}

function run(cmd: string, args: string[], env?: NodeJS.ProcessEnv): { ok: boolean } {
  const r = spawnSync(cmd, args, { cwd: ROOT, stdio: "pipe", shell: false, env: { ...process.env, ...env } });
  return { ok: (r.status ?? 1) === 0 };
}

function collectRepairsFromResults(): RepairEntry[] {
  const repairs: RepairEntry[] = [];
  const key = (e: RepairEntry) => `${e.surface}:${e.id}`;
  const seen = new Map<string, RepairEntry>();

  const panelPath = path.join(PATHS.reportDir, "panel-load-results.json");
  if (fs.existsSync(panelPath)) {
    const data = JSON.parse(fs.readFileSync(panelPath, "utf-8"));
    for (const r of data.results ?? []) {
      if (!r.passed) {
        const e: RepairEntry = {
          id: r.key,
          surface: "panel",
          error: r.error ?? "Load failed",
          intendedPurpose: "Panel loads and exports a default component",
          seenInRounds: 1,
        };
        const k = key(e);
        if (seen.has(k)) seen.get(k)!.seenInRounds += 1;
        else seen.set(k, e);
      }
    }
  }

  const skipHttp = process.env.SMOKE_SKIP_HTTP === "1" || process.env.SMOKE_SKIP_HTTP === "true";
  const apiPath = path.join(PATHS.reportDir, "api-link-results.json");
  if (!skipHttp && fs.existsSync(apiPath)) {
    const data = JSON.parse(fs.readFileSync(apiPath, "utf-8"));
    for (const r of data.results ?? []) {
      if (!r.passed) {
        const e: RepairEntry = {
          id: r.path,
          surface: "api",
          error: r.error ?? `HTTP ${r.status ?? "error"}`,
          intendedPurpose: "API returns non-5xx",
          seenInRounds: 1,
        };
        const k = key(e);
        if (seen.has(k)) seen.get(k)!.seenInRounds += 1;
        else seen.set(k, e);
      }
    }
  }

  const spaPath = path.join(PATHS.reportDir, "spa-route-results.json");
  if (!skipHttp && fs.existsSync(spaPath)) {
    const data = JSON.parse(fs.readFileSync(spaPath, "utf-8"));
    for (const r of data.results ?? []) {
      if (!r.passed) {
        const e: RepairEntry = {
          id: r.path,
          surface: "route",
          error: r.error ?? `HTTP ${r.status ?? "error"}`,
          intendedPurpose: "Route returns 200 and app shell",
          seenInRounds: 1,
        };
        const k = key(e);
        if (seen.has(k)) seen.get(k)!.seenInRounds += 1;
        else seen.set(k, e);
      }
    }
  }

  return Array.from(seen.values());
}

function main(): void {
  console.log(`\nStress: ${ROUNDS} round(s) of full link smoke`);
  writeLinkInventory();

  const allRepairsByKey = new Map<string, RepairEntry>();

  for (let i = 0; i < ROUNDS; i++) {
    console.log(`\n--- Round ${i + 1}/${ROUNDS} ---`);
    run("node", ["scripts/audit-panel-registry.mjs"]);
    run("node", ["scripts/smoke-all-panels-load.mjs"]);
    if (process.env.SMOKE_SKIP_HTTP !== "1") {
      run("pnpm", ["exec", "tsx", "scripts/smoke-system/smoke-api-links.ts"]);
      run("pnpm", ["exec", "tsx", "scripts/smoke-system/smoke-spa-routes.ts"]);
    }
    const roundRepairs = collectRepairsFromResults();
    for (const e of roundRepairs) {
      const k = `${e.surface}:${e.id}`;
      const existing = allRepairsByKey.get(k);
      if (existing) existing.seenInRounds += 1;
      else allRepairsByKey.set(k, { ...e, seenInRounds: 1 } as RepairEntry);
    }
  }

  if (RUN_VITEST) {
    console.log("\n--- Vitest (stress) ---");
    run("pnpm", ["test", "--", "--run", "--maxWorkers=2"]);
  }

  const repairs = Array.from(allRepairsByKey.values());
  const failures: TestFailure[] = repairs.map((e) => ({
    file: e.surface === "panel" ? `panel:${e.id}` : e.id,
    message: `${e.error} (seen in ${e.seenInRounds}/${ROUNDS} round(s))`,
    category: "repair" as const,
  }));

  const date = new Date().toISOString().slice(0, 10);
  const stamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
  const stressMdPath = path.join(PATHS.reportDir, `STRESS_REPAIRS_${date}.md`);
  const stressJsonPath = path.join(PATHS.reportDir, `STRESS_REPAIRS_${date}.json`);
  if (!fs.existsSync(PATHS.reportDir)) fs.mkdirSync(PATHS.reportDir, { recursive: true });

  const bySurface = {
    panel: repairs.filter((x) => x.surface === "panel"),
    api: repairs.filter((x) => x.surface === "api"),
    route: repairs.filter((x) => x.surface === "route"),
  };

  const md = [
    "# Stress Smoke Repairs",
    "",
    `Generated: ${new Date().toISOString()}`,
    `Rounds: ${ROUNDS}, Vitest: ${RUN_VITEST}`,
    `Total unique repairs: ${repairs.length}`,
    "",
    "## Panels",
    "",
    ...bySurface.panel.map(
      (e) => `- **${e.id}** (${e.seenInRounds}/${ROUNDS}): ${e.error}\n  - Intended: ${e.intendedPurpose}`
    ),
    "",
    "## API",
    "",
    ...bySurface.api.map(
      (e) => `- **${e.id}** (${e.seenInRounds}/${ROUNDS}): ${e.error}\n  - Intended: ${e.intendedPurpose}`
    ),
    "",
    "## SPA routes",
    "",
    ...bySurface.route.map(
      (e) => `- **${e.id}** (${e.seenInRounds}/${ROUNDS}): ${e.error}\n  - Intended: ${e.intendedPurpose}`
    ),
    "",
  ].join("\n");

  fs.writeFileSync(stressMdPath, md, "utf-8");
  fs.writeFileSync(
    stressJsonPath,
    JSON.stringify({ generatedAt: new Date().toISOString(), rounds: ROUNDS, repairs }, null, 2),
    "utf-8"
  );
  console.log(`\nStress repairs: ${stressMdPath}`);

  const todoItems = generateTodo(failures);
  writeTodoList(todoItems);
  console.log(`\nDone. Unique repairs: ${repairs.length}, TODO items: ${todoItems.length}`);
  if (repairs.length > 0) process.exit(1);
}

main();
