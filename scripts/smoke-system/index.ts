#!/usr/bin/env node
/**
 * System-wide smoke test: full scope, incremental difficulty, live report, TODO list.
 * As difficulty increases, cross-module connectivity is tested (invoice → food on plate,
 * BEO → event layout → production → schedule). EchoAI^3 enhances UI/UX; it does not replace it.
 *
 * Flow:
 * 1. Discover scope (modules, panels, test files).
 * 2. For difficulty 1 → MAX: run Vitest, then connectivity scenarios at difficulty >= 2.
 * 3. Stream live report to stdout and to docs/smoke-system/SMOKE_REPORT_*.md|.json.
 * 4. On failure: generate REPAIR_TODO_*.md|.json and exit(1). User fixes and re-runs.
 * 5. On pass: if difficulty < MAX, increase difficulty and retest; else exit(0).
 *
 * Usage:
 *   pnpm exec tsx scripts/smoke-system/index.ts
 *   pnpm exec tsx scripts/smoke-system/index.ts --difficulty 3
 *   pnpm exec tsx scripts/smoke-system/index.ts --once   # single run at difficulty 1, no cycle
 *   pnpm exec tsx scripts/smoke-system/index.ts --once --light   # low-resource: Vitest --maxWorkers=1, skip connectivity
 *   pnpm exec tsx scripts/smoke-system/index.ts --disney         # Disney scope: 25min Vitest timeout, reduced exclusions
 *   pnpm exec tsx scripts/smoke-system/index.ts --war-grade      # Aurion war-grade: full speed, difficulty 3+, EchoAurum/hr inclusive, 35min timeout
 */

import { discoverScope } from "./scope.ts";
import { runSystemSmoke } from "./runner.ts";
import { runConnectivityScenarios } from "./run-connectivity.ts";
import {
  startLiveReport,
  appendRunToReport,
  streamChunk,
  getReportPaths,
} from "./report.ts";
import { generateTodo, writeTodoList } from "./todo.ts";
import { writeGapReport } from "./gap-report.ts";
import { writeCoverageReport } from "./coverage.ts";
import {
  MAX_DIFFICULTY,
  DIFFICULTY_LEVELS,
  PATHS,
  WAR_GRADE_START_DIFFICULTY,
  AURION_ULTRA_START_DIFFICULTY,
  CHAOS_CONFIG,
  type DifficultyLevel,
} from "./config.ts";
import fs from "fs";

const args = process.argv.slice(2);
const difficultyArg = args.find((a) => a.startsWith("--difficulty="));
const once = args.includes("--once");
const light = args.includes("--light");
const disney = args.includes("--disney");
const warGrade = args.includes("--war-grade");
const aurionUltra = args.includes("--aurion-ultra");
const fast = args.includes("--fast");
const startDifficulty = difficultyArg
  ? Math.min(MAX_DIFFICULTY, Math.max(1, parseInt(difficultyArg.split("=")[1], 10) || 1))
  : aurionUltra
    ? AURION_ULTRA_START_DIFFICULTY
    : warGrade
      ? WAR_GRADE_START_DIFFICULTY
      : (1 as DifficultyLevel);

async function main(): Promise<void> {
  if (light && !warGrade && !aurionUltra) {
    process.stdout.write("🟢 Light mode: Vitest --maxWorkers=1, connectivity scenarios skipped (reduces CPU/memory load).\n");
  }
  if (disney && !warGrade && !aurionUltra) {
    process.stdout.write("🎢 Disney scope: 25min Vitest timeout, full suite, readiness for 5000-concurrent ops.\n");
  }
  if (warGrade && !aurionUltra) {
    process.stdout.write("⚔️ War-grade (Aurion): full speed, difficulty 3+, EchoAurum/hr inclusive, 35min Vitest timeout. Connectivity enabled.\n");
  }
  if (aurionUltra) {
    process.stdout.write("🔥⚔️ AURION ULTRA: EXTREME stress test - difficulty 4+ (1000 concurrent), ZERO exclusions, 20min timeout.\n");
    process.stdout.write(`   Chaos mode: ${CHAOS_CONFIG.parallelExecution ? "parallel" : "sequential"} scenarios, ${CHAOS_CONFIG.parallelScenarios} max parallel, ${CHAOS_CONFIG.injectedFailureRate}% injected failures.\n`);
  }
  if (fast) {
    process.stdout.write("⚡ Fast mode: 5s per test, 2s per hook, 3min max run. Slow tests fail fast → feedback in seconds.\n");
  }
  process.stdout.write("🔍 Discovering system scope...\n");
  const scope = discoverScope();
  process.stdout.write(
    `   Panels: ${scope.panels.length} | Client Modules: ${scope.modules.length} | Server Routes: ${scope.serverRoutes.length} | Server Services: ${scope.serverServices.length} | Test files: ${scope.testFiles.length}\n\n`,
  );

  let difficulty: DifficultyLevel = startDifficulty;
  const maxRuns = once ? 1 : MAX_DIFFICULTY - startDifficulty + 1;

  for (let run = 0; run < maxRuns; run++) {
    const level = DIFFICULTY_LEVELS[difficulty];
    process.stdout.write(
      `\n${"=".repeat(60)}\n📦 Difficulty ${difficulty}: ${level.label} (concurrency ${level.concurrency})\n${"=".repeat(60)}\n`,
    );

    const state = startLiveReport(scope, difficulty);

    const result = await runSystemSmoke(difficulty, streamChunk, {
      light: (warGrade || aurionUltra) ? false : light,
      disney: disney || warGrade || aurionUltra,
      warGrade,
      aurionUltra,
      fast,
    });

    // From difficulty 2 onward, run cross-module connectivity scenarios (invoice → food on plate, BEO → schedule, etc.)
    // Skip connectivity in light mode or fast mode to get results in seconds.
    if (difficulty >= 2 && !fast && (warGrade || aurionUltra || !light)) {
      process.stdout.write("\n🔗 Running connectivity scenarios (cross-module flows)...\n");
      if (aurionUltra && CHAOS_CONFIG.parallelExecution) {
        process.stdout.write(`   ⚡ Chaos mode: running up to ${CHAOS_CONFIG.parallelScenarios} scenarios in parallel...\n`);
      }
      const { results: connResults, allPassed: connPassed, failures: connFailures } = await runConnectivityScenarios(
        difficulty,
        (name, r) => {
          const icon = r.passed ? "✅" : "❌";
          process.stdout.write(`   ${icon} ${name}: ${r.durationMs}ms\n`);
        },
        aurionUltra && CHAOS_CONFIG.parallelExecution
          ? { parallel: true, maxParallel: CHAOS_CONFIG.parallelScenarios }
          : undefined,
      );
      result.connectivity = connResults.map((r) => ({
        scenarioId: r.scenarioId,
        scenarioName: r.scenarioName,
        passed: r.passed,
        durationMs: r.durationMs,
        error: r.error,
      }));
      result.failures = result.failures.concat(connFailures);
      result.passed = result.passed && connPassed;
    }

    appendRunToReport(state, result);

    if (!result.passed) {
      process.stdout.write(
        `\n❌ Run failed: ${result.failedTests} failed, ${result.passedTests} passed${result.connectivity?.length ? `; connectivity: ${result.connectivity.filter((c) => !c.passed).length} failed` : ""}.\n`,
      );
      const items = generateTodo(result.failures);
      writeTodoList(items);
      // Generate gap report with failures
      const gapPaths = writeGapReport(result.failures);
      process.stdout.write(`📋 Gap report: ${gapPaths.mdPath}\n`);
      // Generate coverage report
      const covPaths = writeCoverageReport();
      process.stdout.write(`📊 Coverage report: ${covPaths.mdPath}\n`);
      process.stdout.write(
        "\n→ Fix items in REPAIR_TODO and GAP_REPORT, then re-run: pnpm test:smoke:system\n\n",
      );
      process.exit(1);
    }

    process.stdout.write(
      `\n✅ Run passed: ${result.passedTests} passed, ${result.totalTests} total, ${result.durationMs}ms${result.connectivity?.length ? `; connectivity: ${result.connectivity.length} scenarios` : ""}.\n`,
    );

    if (once) {
      process.stdout.write("\n→ Single run (--once) complete.\n\n");
      process.exit(0);
    }

    if (difficulty >= MAX_DIFFICULTY) {
      process.stdout.write(
        `\n✅ System passed at max difficulty (${MAX_DIFFICULTY}). Disney-scale ready.\n\n`,
      );
      const { md, json } = getReportPaths();
      if (md) process.stdout.write(`Report: ${md}\n`);

      // Staff Needs Pipeline: produce Operational Needs Mapping when tests pass 100% at max difficulty
      try {
        const { runStaffNeedsPipeline, writeOperationalNeedsMapping } = await import(
          "../../server/services/staff-needs-pipeline/index.js"
        );

        const period = new Date().toISOString().slice(0, 10);
        const smokeRunSummary = {
          runId: `smoke_${Date.now()}_d${difficulty}`,
          difficulty,
          durationMs: result.durationMs,
          passedTests: result.passedTests,
          totalTests: result.totalTests,
          scope: {
            panels: scope.panels.length,
            modules: scope.modules.length,
            serverRoutes: scope.serverRoutes.length,
            serverServices: scope.serverServices.length,
            testFiles: scope.testFiles.length,
          },
          connectivity: result.connectivity,
          reportMdPath: md ?? undefined,
          reportJsonPath: json ?? undefined,
        };

        const onm = await runStaffNeedsPipeline({
          tenantId: "default",
          periodStart: period,
          periodEnd: period,
          smokeRunSummary,
        });

        const { jsonPath: onmJsonPath, mdPath: onmMdPath } = writeOperationalNeedsMapping(
          onm,
          PATHS.reportDir,
        );
        process.stdout.write(`📋 Operational Needs Mapping: ${onmJsonPath}\n`);

        if (md) {
          fs.appendFileSync(
            md,
            `\n## Operational Needs\n\nONM generated: ${onmJsonPath}\n\n`,
            "utf-8",
          );
        }
      } catch (err) {
        process.stdout.write(`⚠️ Staff needs pipeline skipped: ${(err as Error).message}\n`);
      }

      process.exit(0);
    }

    difficulty = (difficulty + 1) as DifficultyLevel;
    process.stdout.write(`\n⬆️  Increasing difficulty to ${difficulty}. Next run...\n`);
  }

  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
