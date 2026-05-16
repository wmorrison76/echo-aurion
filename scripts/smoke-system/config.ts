/**
 * System-wide smoke test configuration.
 * Difficulty levels map to concurrent operations (Disney-scale at 5).
 */

import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "../..");

export const PATHS = {
  root: ROOT,
  panelRegistry: path.join(ROOT, "client/lib/panel-registry.ts"),
  clientModules: path.join(ROOT, "client/modules"),
  server: path.join(ROOT, "server"),
  tests: path.join(ROOT, "tests"),
  reportDir: path.join(ROOT, "docs/smoke-system"),
} as const;

/** Difficulty 1 = single-thread, 5 = Disney scale (thousands of concurrent ops). */
export const DIFFICULTY_LEVELS = {
  1: { concurrency: 1, label: "Single operation", maxFailures: 0 },
  2: { concurrency: 10, label: "10 concurrent", maxFailures: 0 },
  3: { concurrency: 100, label: "100 concurrent", maxFailures: 0 },
  4: { concurrency: 1000, label: "1000 concurrent", maxFailures: 0 },
  5: { concurrency: 5000, label: "Disney scale (5000)", maxFailures: 0 },
} as const;

export type DifficultyLevel = keyof typeof DIFFICULTY_LEVELS;

export const MAX_DIFFICULTY: DifficultyLevel = 5;

export const REPORT_PREFIX = "SMOKE_REPORT";
export const TODO_PREFIX = "REPAIR_TODO";

/** Paths excluded from smoke Vitest run (load/syntax errors). Finish run, then fix and re-include. */
export const SMOKE_EXCLUDE = [
  "**/imported/**",
  "**/EchoAurum/**",
  "**/panel-loading.test.ts",
];

/** Max ms to run Vitest before killing (ensure smoke run completes and produces TODO). */
export const VITEST_TIMEOUT_MS = 10 * 60 * 1000;

/** Disney scope: longer timeout, full suite, readiness for 5000-concurrent ops. */
export const DISNEY_VITEST_TIMEOUT_MS = 25 * 60 * 1000;

/** War-grade (Aurion): full speed, max challenge, include EchoAurum/hr-sync to find breakages. */
export const WAR_GRADE_EXCLUDE = ["**/imported/**"];
export const WAR_GRADE_VITEST_TIMEOUT_MS = 35 * 60 * 1000;
export const WAR_GRADE_START_DIFFICULTY = 3 as DifficultyLevel;

/** Aurion Ultra: extreme stress - zero exclusions, tighter timeout, start at difficulty 4, chaos mode. */
export const AURION_ULTRA_EXCLUDE: string[] = []; // Zero exclusions - everything is tested
export const AURION_ULTRA_VITEST_TIMEOUT_MS = 20 * 60 * 1000; // 20 minutes (stress test faster completion)
export const AURION_ULTRA_START_DIFFICULTY = 4 as DifficultyLevel; // 1000 concurrent from the start
export const AURION_ULTRA_CHAOS_MODE = true; // Enable chaos/fault injection simulation

/** Chaos mode settings for Aurion Ultra. */
export const CHAOS_CONFIG = {
  /** Percentage of connectivity scenarios to fail artificially (0-100). */
  injectedFailureRate: 10,
  /** Max parallel connectivity scenarios to run simultaneously. */
  parallelScenarios: 5,
  /** Whether to run all difficulty-appropriate scenarios in parallel instead of sequentially. */
  parallelExecution: true,
} as const;

/** Fast-feedback mode: strict timeouts so slow tests fail in seconds, not minutes. */
export const FAST_TEST_TIMEOUT_MS = 5000;   // 5s per test
export const FAST_HOOK_TIMEOUT_MS = 2000;   // 2s per hook
export const FAST_VITEST_TIMEOUT_MS = 3 * 60 * 1000; // 3 min max for entire Vitest run
