/**
 * Run connectivity scenarios at the given difficulty.
 * Executes cross-module flows (invoice → food on plate, BEO → event layout → production → schedule).
 * Results are merged into the main smoke report and TODO.
 */

import { spawn } from "child_process";
import path from "path";
import { PATHS, CHAOS_CONFIG } from "./config.ts";
import { getScenariosForDifficulty, type ConnectivityScenario } from "./connectivity.ts";
import type { DifficultyLevel } from "./config.ts";
import type { TestFailure } from "./runner.ts";

export interface RunConnectivityOptions {
  /** Run scenarios in parallel (up to maxParallel at a time). */
  parallel?: boolean;
  /** Max concurrent scenarios when parallel is true. */
  maxParallel?: number;
}

export interface ConnectivityRunResult {
  scenarioId: string;
  scenarioName: string;
  passed: boolean;
  durationMs: number;
  error?: string;
  failures: TestFailure[];
}

/** Run a single scenario by executing its script (tsx). */
async function runScenarioScript(scenario: ConnectivityScenario): Promise<ConnectivityRunResult> {
  const root = PATHS.root;
  const failures: TestFailure[] = [];
  const start = Date.now();
  let passed = false;
  let error: string | undefined;

  return new Promise((resolve) => {
    const child = spawn("pnpm", ["exec", "tsx", scenario.script!], {
      cwd: root,
      shell: true,
      stdio: ["ignore", "pipe", "pipe"],
    });

    const outChunks: string[] = [];
    const errChunks: string[] = [];

    child.stdout?.on("data", (d: Buffer) => outChunks.push(d.toString()));
    child.stderr?.on("data", (d: Buffer) => errChunks.push(d.toString()));

    child.on("close", (code) => {
      const durationMs = Date.now() - start;
      passed = code === 0;
      if (!passed) {
        const stderr = errChunks.join("");
        error = stderr.slice(0, 500) || `Script exited with code ${code}`;
        failures.push({
          message: `Connectivity scenario "${scenario.name}" failed: ${error}`,
          category: "repair",
        });
      }
      resolve({
        scenarioId: scenario.id,
        scenarioName: scenario.name,
        passed,
        durationMs,
        error,
        failures,
      });
    });

    child.on("error", (err) => {
      const durationMs = Date.now() - start;
      error = err.message;
      failures.push({
        message: `Connectivity scenario "${scenario.name}" error: ${err.message}`,
        category: "repair",
      });
      resolve({
        scenarioId: scenario.id,
        scenarioName: scenario.name,
        passed: false,
        durationMs,
        error,
        failures,
      });
    });
  });
}

/** Run a scenario by executing a Vitest test pattern. */
async function runScenarioTestPattern(scenario: ConnectivityScenario): Promise<ConnectivityRunResult> {
  const root = PATHS.root;
  const failures: TestFailure[] = [];
  const start = Date.now();
  let passed = false;
  let error: string | undefined;

  return new Promise((resolve) => {
    const child = spawn("pnpm", ["test", "--", "--run", "-t", scenario.testPattern!], {
      cwd: root,
      shell: true,
      stdio: ["ignore", "pipe", "pipe"],
    });

    const outChunks: string[] = [];
    const errChunks: string[] = [];

    child.stdout?.on("data", (d: Buffer) => outChunks.push(d.toString()));
    child.stderr?.on("data", (d: Buffer) => errChunks.push(d.toString()));

    child.on("close", (code) => {
      const durationMs = Date.now() - start;
      passed = code === 0;
      if (!passed) {
        const stdout = outChunks.join("");
        const stderr = errChunks.join("");
        error = (stderr + stdout).slice(0, 500) || `Tests failed with code ${code}`;
        failures.push({
          message: `Connectivity scenario "${scenario.name}" tests failed: ${error}`,
          category: "repair",
        });
      }
      resolve({
        scenarioId: scenario.id,
        scenarioName: scenario.name,
        passed,
        durationMs,
        error,
        failures,
      });
    });

    child.on("error", (err) => {
      const durationMs = Date.now() - start;
      error = err.message;
      failures.push({
        message: `Connectivity scenario "${scenario.name}" test error: ${err.message}`,
        category: "repair",
      });
      resolve({
        scenarioId: scenario.id,
        scenarioName: scenario.name,
        passed: false,
        durationMs,
        error,
        failures,
      });
    });
  });
}

/** Run a single scenario (script or test pattern). */
async function runOneScenario(scenario: ConnectivityScenario): Promise<ConnectivityRunResult> {
  if (scenario.script) {
    return runScenarioScript(scenario);
  }
  if (scenario.testPattern) {
    return runScenarioTestPattern(scenario);
  }
  return {
    scenarioId: scenario.id,
    scenarioName: scenario.name,
    passed: true,
    durationMs: 0,
    failures: [],
  };
}

/** Run all connectivity scenarios for the given difficulty; return combined results. */
export async function runConnectivityScenarios(
  difficulty: DifficultyLevel,
  onProgress?: (scenario: string, result: ConnectivityRunResult) => void,
  options?: RunConnectivityOptions,
): Promise<{ results: ConnectivityRunResult[]; allPassed: boolean; failures: TestFailure[] }> {
  const scenarios = getScenariosForDifficulty(difficulty).filter(
    (s) => s.script || s.testPattern,
  );
  const parallel = options?.parallel ?? false;
  const maxParallel = options?.maxParallel ?? CHAOS_CONFIG.parallelScenarios;
  const results: ConnectivityRunResult[] = [];
  const allFailures: TestFailure[] = [];

  if (parallel && maxParallel > 1) {
    // Run in batches of maxParallel
    for (let i = 0; i < scenarios.length; i += maxParallel) {
      const batch = scenarios.slice(i, i + maxParallel);
      const batchResults = await Promise.all(batch.map((s) => runOneScenario(s)));
      for (let j = 0; j < batch.length; j++) {
        const result = batchResults[j];
        results.push(result);
        result.failures.forEach((f) => allFailures.push(f));
        onProgress?.(batch[j].name, result);
      }
    }
  } else {
    for (const scenario of scenarios) {
      const result = await runOneScenario(scenario);
      results.push(result);
      result.failures.forEach((f) => allFailures.push(f));
      onProgress?.(scenario.name, result);
    }
  }

  const allPassed = results.every((r) => r.passed);
  return { results, allPassed, failures: allFailures };
}
