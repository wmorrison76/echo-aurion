/**
 * Scope and Coverage Matrix Generator.
 * Produces a report showing which modules/routes/services have tests
 * and which are included in connectivity scenarios.
 */

import fs from "fs";
import path from "path";
import { PATHS } from "./config.ts";
import { discoverScope, type SystemScope } from "./scope.ts";
import { CONNECTIVITY_SCENARIOS, CONNECTIVITY_EDGES } from "./connectivity.ts";

export interface CoverageEntry {
  name: string;
  type: "panel" | "clientModule" | "serverRoute" | "serverService";
  hasTest: boolean;
  testFiles: string[];
  inConnectivityScenario: boolean;
  scenarioIds: string[];
}

export interface CoverageReport {
  generatedAt: string;
  summary: {
    totalEntries: number;
    withTest: number;
    withoutTest: number;
    inScenario: number;
    notInScenario: number;
  };
  entries: CoverageEntry[];
  scenariosWithoutScript: string[];
  missingFlows: string[];
}

/** Check if a test file covers a given module/route/service name. */
function testCovers(testFile: string, name: string): boolean {
  const lowerName = name.toLowerCase().replace(/-/g, "").replace(/_/g, "");
  const lowerFile = testFile.toLowerCase().replace(/-/g, "").replace(/_/g, "");
  return lowerFile.includes(lowerName);
}

/** Check if a connectivity scenario includes a module name. */
function scenarioIncludes(scenarioModules: string[], name: string): boolean {
  const lowerName = name.toLowerCase().replace(/-/g, "").replace(/_/g, "");
  return scenarioModules.some((m) => {
    const lowerM = m.toLowerCase().replace(/-/g, "").replace(/_/g, "");
    return lowerM.includes(lowerName) || lowerName.includes(lowerM);
  });
}

export function generateCoverageReport(): CoverageReport {
  const scope = discoverScope();
  const entries: CoverageEntry[] = [];

  // Panels
  for (const panel of scope.panels) {
    const testFiles = scope.testFiles.filter((t) => testCovers(t, panel));
    const scenarios = CONNECTIVITY_SCENARIOS.filter((s) =>
      scenarioIncludes(s.modules, panel),
    );
    entries.push({
      name: panel,
      type: "panel",
      hasTest: testFiles.length > 0,
      testFiles,
      inConnectivityScenario: scenarios.length > 0,
      scenarioIds: scenarios.map((s) => s.id),
    });
  }

  // Client modules
  for (const mod of scope.modules) {
    const testFiles = scope.testFiles.filter((t) => testCovers(t, mod));
    const scenarios = CONNECTIVITY_SCENARIOS.filter((s) =>
      scenarioIncludes(s.modules, mod),
    );
    entries.push({
      name: mod,
      type: "clientModule",
      hasTest: testFiles.length > 0,
      testFiles,
      inConnectivityScenario: scenarios.length > 0,
      scenarioIds: scenarios.map((s) => s.id),
    });
  }

  // Server routes
  for (const route of scope.serverRoutes) {
    const testFiles = scope.testFiles.filter((t) => testCovers(t, route));
    const scenarios = CONNECTIVITY_SCENARIOS.filter((s) =>
      scenarioIncludes(s.modules, route),
    );
    entries.push({
      name: route,
      type: "serverRoute",
      hasTest: testFiles.length > 0,
      testFiles,
      inConnectivityScenario: scenarios.length > 0,
      scenarioIds: scenarios.map((s) => s.id),
    });
  }

  // Server services
  for (const svc of scope.serverServices) {
    const testFiles = scope.testFiles.filter((t) => testCovers(t, svc));
    const scenarios = CONNECTIVITY_SCENARIOS.filter((s) =>
      scenarioIncludes(s.modules, svc),
    );
    entries.push({
      name: svc,
      type: "serverService",
      hasTest: testFiles.length > 0,
      testFiles,
      inConnectivityScenario: scenarios.length > 0,
      scenarioIds: scenarios.map((s) => s.id),
    });
  }

  // Scenarios without script
  const scenariosWithoutScript = CONNECTIVITY_SCENARIOS
    .filter((s) => !s.script && !s.testPattern)
    .map((s) => s.id);

  // Missing flows (hard-coded list of expected flows not yet implemented)
  const missingFlows = [
    "BEO traceability (prospect/order → production/plate)",
    "Staff-gap resilience scenario",
    "Full-automatic E2E (layout→BEO→order→scheduling→production)",
    "EchoAI^3 audit event emission and read path",
  ];

  const withTest = entries.filter((e) => e.hasTest).length;
  const inScenario = entries.filter((e) => e.inConnectivityScenario).length;

  return {
    generatedAt: new Date().toISOString(),
    summary: {
      totalEntries: entries.length,
      withTest,
      withoutTest: entries.length - withTest,
      inScenario,
      notInScenario: entries.length - inScenario,
    },
    entries,
    scenariosWithoutScript,
    missingFlows,
  };
}

export function writeCoverageReport(): { mdPath: string; jsonPath: string } {
  const report = generateCoverageReport();
  const dir = PATHS.reportDir;
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  const mdPath = path.join(dir, "SCOPE_AND_COVERAGE.md");
  const jsonPath = path.join(dir, "SCOPE_AND_COVERAGE.json");

  const md = [
    "# Scope and Coverage Matrix",
    "",
    `Generated: ${report.generatedAt}`,
    "",
    "## Summary",
    "",
    `| Metric | Count |`,
    `|--------|-------|`,
    `| Total entries | ${report.summary.totalEntries} |`,
    `| With test | ${report.summary.withTest} |`,
    `| Without test | ${report.summary.withoutTest} |`,
    `| In connectivity scenario | ${report.summary.inScenario} |`,
    `| Not in scenario | ${report.summary.notInScenario} |`,
    "",
    "## Entries by Type",
    "",
    "### Panels",
    "",
    "| Name | Has Test | In Scenario |",
    "|------|----------|-------------|",
    ...report.entries
      .filter((e) => e.type === "panel")
      .map((e) => `| ${e.name} | ${e.hasTest ? "Yes" : "No"} | ${e.inConnectivityScenario ? e.scenarioIds.join(", ") : "No"} |`),
    "",
    "### Client Modules",
    "",
    "| Name | Has Test | In Scenario |",
    "|------|----------|-------------|",
    ...report.entries
      .filter((e) => e.type === "clientModule")
      .map((e) => `| ${e.name} | ${e.hasTest ? "Yes" : "No"} | ${e.inConnectivityScenario ? e.scenarioIds.join(", ") : "No"} |`),
    "",
    "### Server Routes",
    "",
    "| Name | Has Test | In Scenario |",
    "|------|----------|-------------|",
    ...report.entries
      .filter((e) => e.type === "serverRoute")
      .map((e) => `| ${e.name} | ${e.hasTest ? "Yes" : "No"} | ${e.inConnectivityScenario ? e.scenarioIds.join(", ") : "No"} |`),
    "",
    "### Server Services",
    "",
    "| Name | Has Test | In Scenario |",
    "|------|----------|-------------|",
    ...report.entries
      .filter((e) => e.type === "serverService")
      .map((e) => `| ${e.name} | ${e.hasTest ? "Yes" : "No"} | ${e.inConnectivityScenario ? e.scenarioIds.join(", ") : "No"} |`),
    "",
    "## Gaps",
    "",
    "### Scenarios Without Script (not executed)",
    "",
    ...report.scenariosWithoutScript.map((s) => `- ${s}`),
    "",
    "### Missing Flows (to be built)",
    "",
    ...report.missingFlows.map((f) => `- ${f}`),
    "",
  ].join("\n");

  fs.writeFileSync(mdPath, md, "utf-8");
  fs.writeFileSync(jsonPath, JSON.stringify(report, null, 2), "utf-8");

  return { mdPath, jsonPath };
}
