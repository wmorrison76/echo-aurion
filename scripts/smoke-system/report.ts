/**
 * Live report: stream to stdout and append to markdown + JSON files.
 */

import fs from "fs";
import path from "path";
import { PATHS, REPORT_PREFIX, type DifficultyLevel } from "./config.ts";
import type { RunResult } from "./runner.ts";
import type { SystemScope } from "./scope.ts";

export interface LiveReportState {
  startedAt: string;
  difficulty: DifficultyLevel;
  scope: SystemScope;
  runs: RunResult[];
  currentRun?: RunResult;
}

function reportDir(): string {
  const d = PATHS.reportDir;
  if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true });
  return d;
}

function reportBasename(): string {
  const now = new Date();
  const date = now.toISOString().slice(0, 10);
  const time = now.toTimeString().slice(0, 5).replace(":", "-");
  return `${REPORT_PREFIX}_${date}_${time}`;
}

let reportBase: string | null = null;
let reportMdPath: string | null = null;
let reportJsonPath: string | null = null;

export function startLiveReport(scope: SystemScope, difficulty: DifficultyLevel): LiveReportState {
  reportBase = reportBasename();
  const dir = reportDir();
  reportMdPath = path.join(dir, `${reportBase}.md`);
  reportJsonPath = path.join(dir, `${reportBase}.json`);

  const state: LiveReportState = {
    startedAt: new Date().toISOString(),
    difficulty,
    scope,
    runs: [],
  };

  const header = `# System-Wide Smoke Report\n\nStarted: ${state.startedAt}\nDifficulty: ${difficulty}\n\n## Scope\n- Panels: ${scope.panels.length}\n- Client Modules: ${scope.modules.length}\n- Server Routes: ${scope.serverRoutes?.length ?? 0}\n- Server Services: ${scope.serverServices?.length ?? 0}\n- Test files: ${scope.testFiles.length}\n\n---\n\n`;
  fs.writeFileSync(reportMdPath, header, "utf-8");
  fs.writeFileSync(reportJsonPath, JSON.stringify(state, null, 2), "utf-8");

  process.stdout.write(`\n📄 Live report: ${reportMdPath}\n`);
  return state;
}

export function appendRunToReport(state: LiveReportState, result: RunResult): void {
  state.runs.push(result);
  state.currentRun = result;

  if (!reportMdPath || !reportJsonPath) return;

  const md = [
    `## Run @ ${new Date().toISOString()} (difficulty ${result.difficulty}, concurrency ${result.concurrency})`,
    `- **Passed:** ${result.passed}`,
    `- Tests: ${result.passedTests} passed, ${result.failedTests} failed (${result.totalTests} total)`,
    `- Duration: ${result.durationMs}ms`,
    result.failures.length ? `- **Failures:** ${result.failures.length}` : "",
    result.connectivity?.length
      ? `- **Connectivity:** ${result.connectivity.filter((c) => c.passed).length}/${result.connectivity.length} scenarios passed`
      : "",
    "",
  ].filter(Boolean).join("\n");

  fs.appendFileSync(reportMdPath, md, "utf-8");
  if (result.connectivity?.length) {
    fs.appendFileSync(
      reportMdPath,
      "### Connectivity scenarios\n\n" +
        result.connectivity
          .map((c) => `- ${c.passed ? "✅" : "❌"} ${c.scenarioName}: ${c.durationMs}ms${c.error ? ` — ${c.error.slice(0, 100)}` : ""}`)
          .join("\n") +
        "\n\n",
      "utf-8",
    );
  }
  if (result.failures.length) {
    fs.appendFileSync(reportMdPath, "\n```\n" + result.failures.map((f) => `${f.suite || ""} ${f.test || ""}: ${f.message}`).join("\n") + "\n```\n\n", "utf-8");
  }
  fs.writeFileSync(reportJsonPath, JSON.stringify(state, null, 2), "utf-8");
}

export function streamChunk(chunk: string): void {
  process.stdout.write(chunk);
}

export function getReportPaths(): { md: string | null; json: string | null } {
  return { md: reportMdPath, json: reportJsonPath };
}
