/**
 * Orchestrator: run full link smoke (inventory, panel audit, panel load, API links, SPA routes),
 * aggregate failures, write SMOKE_REPAIRS_*.md/.json and REPAIR_TODO_*.md/.json.
 *
 * Usage:
 *   pnpm exec tsx scripts/smoke-system/run-all-link-smoke.ts
 *   SMOKE_BASE_URL=http://localhost:8080 SMOKE_API_BASE_URL=http://localhost:8080 pnpm exec tsx scripts/smoke-system/run-all-link-smoke.ts
 *
 * Server must be running for API and SPA smoke (or set env URLs). Panel steps run without server.
 *
 * Set SMOKE_SKIP_HTTP=1 to skip API and SPA smoke (panel-only; no server required).
 */

import { spawnSync } from "child_process";
import fs from "fs";
import path from "path";
import { PATHS } from "./config.ts";
import { writeLinkInventory } from "./link-inventory.ts";
import type { TestFailure } from "./runner.ts";
import { generateTodo, writeTodoList } from "./todo.ts";

const ROOT = PATHS.root;

interface RepairEntry {
  id: string;
  surface: "panel" | "api" | "route";
  error: string;
  intendedPurpose: string;
}

function run(cmd: string, args: string[], env?: NodeJS.ProcessEnv): { ok: boolean; code: number | null } {
  const r = spawnSync(cmd, args, { cwd: ROOT, stdio: "pipe", shell: false, env: { ...process.env, ...env } });
  return { ok: (r.status ?? 1) === 0, code: r.status };
}

function main(): void {
  const repairs: RepairEntry[] = [];
  const failures: TestFailure[] = [];
  const skipHttp = process.env.SMOKE_SKIP_HTTP === "1" || process.env.SMOKE_SKIP_HTTP === "true";

  console.log("\n-> Link inventory");
  writeLinkInventory();

  console.log("\n-> Panel registry audit");
  const audit = run("node", ["scripts/audit-panel-registry.mjs"]);
  if (!audit.ok) {
    repairs.push({
      id: "panel-registry-audit",
      surface: "panel",
      error: "Panel registry audit failed (missing or stubbed modules)",
      intendedPurpose: "All panel import targets exist and are not stubs",
    });
    failures.push({
      message: "Panel registry audit failed",
      category: "repair",
      file: "client/lib/panel-registry.ts",
    });
  }

  console.log("\n-> Panel load smoke");
  const panelLoad = run("node", ["scripts/smoke-all-panels-load.mjs"]);
  const panelResultsPath = path.join(PATHS.reportDir, "panel-load-results.json");
  if (fs.existsSync(panelResultsPath)) {
    const data = JSON.parse(fs.readFileSync(panelResultsPath, "utf-8"));
    for (const r of data.results ?? []) {
      if (!r.passed) {
        repairs.push({
          id: r.key,
          surface: "panel",
          error: r.error ?? "Load failed",
          intendedPurpose: "Panel loads and exports a default component",
        });
        failures.push({
          file: `panel:${r.key}`,
          message: r.error ?? "Load failed",
          category: "repair",
        });
      }
    }
  }

  if (!skipHttp) {
    console.log("\n-> API link smoke");
    run("pnpm", ["exec", "tsx", "scripts/smoke-system/smoke-api-links.ts"]);
  } else {
    console.log("\n-> API link smoke (skipped, SMOKE_SKIP_HTTP=1)");
  }
  const apiResultsPath = path.join(PATHS.reportDir, "api-link-results.json");
  if (!skipHttp && fs.existsSync(apiResultsPath)) {
    const data = JSON.parse(fs.readFileSync(apiResultsPath, "utf-8"));
    for (const r of data.results ?? []) {
      if (!r.passed) {
        repairs.push({
          id: r.path,
          surface: "api",
          error: r.error ?? `HTTP ${r.status ?? "error"}`,
          intendedPurpose: "API returns non-5xx",
        });
        failures.push({
          file: r.path,
          message: r.error ?? "Request failed",
          category: "repair",
        });
      }
    }
  }

  if (!skipHttp) {
    console.log("\n-> SPA route smoke");
    run("pnpm", ["exec", "tsx", "scripts/smoke-system/smoke-spa-routes.ts"]);
  } else {
    console.log("\n-> SPA route smoke (skipped, SMOKE_SKIP_HTTP=1)");
  }
  const spaResultsPath = path.join(PATHS.reportDir, "spa-route-results.json");
  if (!skipHttp && fs.existsSync(spaResultsPath)) {
    const data = JSON.parse(fs.readFileSync(spaResultsPath, "utf-8"));
    for (const r of data.results ?? []) {
      if (!r.passed) {
        repairs.push({
          id: r.path,
          surface: "route",
          error: r.error ?? `HTTP ${r.status ?? "error"}`,
          intendedPurpose: "Route returns 200 and app shell",
        });
        failures.push({
          file: r.path,
          message: r.error ?? "Request failed",
          category: "repair",
        });
      }
    }
  }

  const date = new Date().toISOString().slice(0, 10);
  const repairsMdPath = path.join(PATHS.reportDir, `SMOKE_REPAIRS_${date}.md`);
  const repairsJsonPath = path.join(PATHS.reportDir, `SMOKE_REPAIRS_${date}.json`);
  if (!fs.existsSync(PATHS.reportDir)) fs.mkdirSync(PATHS.reportDir, { recursive: true });

  const repairsBySurface = {
    panel: repairs.filter((x) => x.surface === "panel"),
    api: repairs.filter((x) => x.surface === "api"),
    route: repairs.filter((x) => x.surface === "route"),
  };

  const md = [
    "# Smoke Repairs",
    "",
    `Generated: ${new Date().toISOString()}`,
    `Total repairs: ${repairs.length}`,
    "",
    "## Panels",
    "",
    ...repairsBySurface.panel.map(
      (e) => `- **${e.id}**: ${e.error}\n  - Intended: ${e.intendedPurpose}`
    ),
    "",
    "## API",
    "",
    ...repairsBySurface.api.map(
      (e) => `- **${e.id}**: ${e.error}\n  - Intended: ${e.intendedPurpose}`
    ),
    "",
    "## SPA routes",
    "",
    ...repairsBySurface.route.map(
      (e) => `- **${e.id}**: ${e.error}\n  - Intended: ${e.intendedPurpose}`
    ),
    "",
  ].join("\n");

  fs.writeFileSync(repairsMdPath, md, "utf-8");
  fs.writeFileSync(
    repairsJsonPath,
    JSON.stringify({ generatedAt: new Date().toISOString(), repairs }, null, 2),
    "utf-8"
  );
  console.log(`\nRepairs list: ${repairsMdPath}`);

  const todoItems = generateTodo(failures);
  writeTodoList(todoItems);
  console.log(`\nDone. Repairs: ${repairs.length}, TODO items: ${todoItems.length}`);
  if (repairs.length > 0) process.exit(1);
}

main();
