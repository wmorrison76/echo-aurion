/**
 * System smoke runner: run Vitest and optional load at current difficulty.
 * Collects pass/fail and failure details for reporting and TODO generation.
 */

import { spawn } from "child_process";
import {
  PATHS,
  DIFFICULTY_LEVELS,
  SMOKE_EXCLUDE,
  VITEST_TIMEOUT_MS,
  DISNEY_VITEST_TIMEOUT_MS,
  WAR_GRADE_EXCLUDE,
  WAR_GRADE_VITEST_TIMEOUT_MS,
  AURION_ULTRA_EXCLUDE,
  AURION_ULTRA_VITEST_TIMEOUT_MS,
  FAST_TEST_TIMEOUT_MS,
  FAST_HOOK_TIMEOUT_MS,
  FAST_VITEST_TIMEOUT_MS,
  type DifficultyLevel,
} from "./config.ts";

export interface TestFailure {
  file?: string;
  suite?: string;
  test?: string;
  message: string;
  category: "repair" | "correction" | "upgrade";
}

/** Result of connectivity (cross-module) scenario run. */
export interface ConnectivityResult {
  scenarioId: string;
  scenarioName: string;
  passed: boolean;
  durationMs: number;
  error?: string;
}

export interface RunResult {
  passed: boolean;
  totalTests: number;
  passedTests: number;
  failedTests: number;
  durationMs: number;
  failures: TestFailure[];
  difficulty: DifficultyLevel;
  concurrency: number;
  stdout: string;
  stderr: string;
  /** Cross-module connectivity scenario results (when difficulty >= 2). */
  connectivity?: ConnectivityResult[];
}

/** Run Vitest (pnpm test) and parse stdout for summary and failures. */
export async function runVitest(
  onChunk?: (chunk: string) => void,
  options?: { light?: boolean; disney?: boolean; warGrade?: boolean; aurionUltra?: boolean; fast?: boolean },
): Promise<RunResult> {
  const root = PATHS.root;
  const stdoutChunks: string[] = [];
  const stderrChunks: string[] = [];

  // Aurion Ultra > War-grade > Disney > Default; fast overrides max run time only
  const exclude = options?.aurionUltra
    ? AURION_ULTRA_EXCLUDE
    : options?.warGrade
      ? WAR_GRADE_EXCLUDE
      : SMOKE_EXCLUDE;
  let timeoutMs = options?.aurionUltra
    ? AURION_ULTRA_VITEST_TIMEOUT_MS
    : options?.warGrade
      ? WAR_GRADE_VITEST_TIMEOUT_MS
      : options?.disney
        ? DISNEY_VITEST_TIMEOUT_MS
        : VITEST_TIMEOUT_MS;
  if (options?.fast) {
    timeoutMs = FAST_VITEST_TIMEOUT_MS;
  }

  const testArgs = ["test", "--", "--run"];
  if (options?.light) {
    testArgs.push("--maxWorkers=1");
  }
  if (options?.fast) {
    testArgs.push("--testTimeout", String(FAST_TEST_TIMEOUT_MS));
    testArgs.push("--hookTimeout", String(FAST_HOOK_TIMEOUT_MS));
  }
  for (const ex of exclude) {
    testArgs.push("--exclude", ex);
  }

  const child = spawn("pnpm", testArgs, {
    cwd: root,
    shell: true,
    stdio: ["ignore", "pipe", "pipe"],
  });

  return new Promise((resolve) => {
    const start = Date.now();
    let settled = false;

    function finish(code: number | null, signal: string | null): void {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      const durationMs = Date.now() - start;
      const stdout = stdoutChunks.join("");
      const stderr = stderrChunks.join("");
      const { totalTests, passedTests, failedTests, failures } = parseVitestOutput(stdout, stderr);
      resolve({
        passed: code === 0 && failedTests === 0,
        totalTests,
        passedTests,
        failedTests,
        durationMs,
        failures,
        difficulty: 1,
        concurrency: 1,
        stdout,
        stderr,
      });
    }

    const timer = setTimeout(() => {
      child.kill("SIGTERM");
      finish(null, "SIGTERM");
    }, timeoutMs);

    child.stdout?.on("data", (d: Buffer) => {
      const s = d.toString();
      stdoutChunks.push(s);
      onChunk?.(s);
    });
    child.stderr?.on("data", (d: Buffer) => {
      const s = d.toString();
      stderrChunks.push(s);
      onChunk?.(s);
    });

    child.on("close", (code, signal) => {
      finish(code, signal ?? null);
    });
  });
}

/** Parse vitest stdout for "X passed", "Y failed" and failure lines. */
function parseVitestOutput(stdout: string, stderr: string): {
  totalTests: number;
  passedTests: number;
  failedTests: number;
  failures: TestFailure[];
} {
  let totalTests = 0;
  let passedTests = 0;
  let failedTests = 0;
  const failures: TestFailure[] = [];

  // Summary: " X passed | Y failed" or "Tests X passed (Z ms)"
  const passedBlock = stdout.match(/(\d+)\s+passed/g);
  const failedBlock = stdout.match(/(\d+)\s+failed/g);
  if (passedBlock) passedTests = passedBlock.map((m) => parseInt(m, 10)).reduce((a, b) => a + b, 0);
  if (failedBlock) failedTests = failedBlock.map((m) => parseInt(m, 10)).reduce((a, b) => a + b, 0);
  
  // Also count "Failed Suites X" pattern (Vitest suite-level failures)
  const failedSuitesMatch = stdout.match(/Failed Suites\s+(\d+)/);
  if (failedSuitesMatch) {
    const suiteFails = parseInt(failedSuitesMatch[1], 10);
    // Add suite failures to total if not already counted
    if (suiteFails > failedTests) {
      failedTests = suiteFails;
    }
  }
  
  totalTests = passedTests + failedTests;

  // Parse FAIL markers for suite-level failures (import errors, missing files)
  const lines = stdout.split("\n");
  let currentFile = "";
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    // Track current file from test run lines
    const fileMatch = line.match(/❯\s+(.+?)\s+\(/);
    if (fileMatch) currentFile = fileMatch[1].trim();
    
    // Capture suite-level FAIL markers (import errors, missing files)
    const failMatch = line.match(/^\s*FAIL\s+(.+?)\s+\[/);
    if (failMatch) {
      const filePath = failMatch[1].trim();
      // Look ahead for the error message
      let errorMsg = "";
      for (let j = i + 1; j < Math.min(i + 10, lines.length); j++) {
        const nextLine = lines[j];
        if (nextLine.includes("Error:") || nextLine.includes("Cannot find module")) {
          errorMsg = nextLine.trim().slice(0, 300);
          break;
        }
      }
      failures.push({
        file: filePath,
        suite: "Suite Load",
        test: "File Import",
        message: errorMsg || "Failed to load test file",
        category: "repair",
      });
    }
    
    // Individual test failures: "× suite > test 10ms" then "→ message"
    const suiteMatch = line.match(/×\s+(.+?)\s+>\s+(.+?)(?:\s+\d+ms)?\s*$/);
    if (suiteMatch) {
      const suite = suiteMatch[1].trim();
      const test = suiteMatch[2].trim();
      let message = "";
      const next = lines[i + 1];
      if (next?.includes("→")) message = next.replace(/→\s*/, "").trim();
      failures.push({
        file: currentFile || undefined,
        suite,
        test,
        message: message || "Assertion failed",
        category: "correction",
      });
    }
  }

  // Also pull from stderr for unhandled errors when we know tests failed but no parsed failures
  if (stderr && failures.length === 0 && failedTests > 0) {
    const errLines = stderr.split("\n").filter((l) => l.includes("Error") || l.includes("expected"));
    if (errLines.length) {
      failures.push({
        message: errLines.slice(0, 3).join(" ").slice(0, 200),
        category: "repair",
      });
    }
  }

  return { totalTests, passedTests, failedTests, failures };
}

/** Run one full system smoke at the given difficulty: Vitest + optional load. */
export async function runSystemSmoke(
  difficulty: DifficultyLevel,
  onChunk?: (chunk: string) => void,
  options?: { light?: boolean; disney?: boolean; warGrade?: boolean; aurionUltra?: boolean; fast?: boolean },
): Promise<RunResult> {
  const level = DIFFICULTY_LEVELS[difficulty];
  const result = await runVitest(onChunk, options);
  result.difficulty = difficulty;
  result.concurrency = level.concurrency;
  return result;
}
