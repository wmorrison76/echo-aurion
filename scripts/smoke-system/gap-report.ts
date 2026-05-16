/**
 * Gap Report Generator.
 * Produces a structured report of:
 * - Scope coverage gaps (modules/routes/services without tests or not in scenarios)
 * - Connectivity scenarios without scripts (not executed)
 * - Missing flows (BEO traceability, staff-gap, full-automatic E2E, audit events)
 * - Failure summary from last run (if provided)
 */

import fs from "fs";
import path from "path";
import { PATHS } from "./config.ts";
import { generateCoverageReport, type CoverageReport } from "./coverage.ts";
import type { TestFailure } from "./runner.ts";
import { CONNECTIVITY_SCENARIOS } from "./connectivity.ts";

export interface GapReportEntry {
  category: "coverage" | "scenario" | "flow" | "failure";
  severity: "critical" | "high" | "medium" | "low";
  description: string;
  action: string;
}

export interface GapReport {
  generatedAt: string;
  summary: {
    totalGaps: number;
    critical: number;
    high: number;
    medium: number;
    low: number;
  };
  gaps: GapReportEntry[];
  coverageSummary: CoverageReport["summary"];
}

/** Generate gap report from coverage and optional failures. */
export function generateGapReport(failures?: TestFailure[]): GapReport {
  const coverage = generateCoverageReport();
  const gaps: GapReportEntry[] = [];

  // Coverage gaps: modules/routes/services without tests
  const noTest = coverage.entries.filter((e) => !e.hasTest);
  if (noTest.length > 20) {
    gaps.push({
      category: "coverage",
      severity: "medium",
      description: `${noTest.length} entries have no unit/integration test (see SCOPE_AND_COVERAGE.md for full list).`,
      action: "Add tests for critical modules and services.",
    });
  } else {
    for (const e of noTest) {
      gaps.push({
        category: "coverage",
        severity: "low",
        description: `${e.type} "${e.name}" has no test file.`,
        action: `Add test for ${e.name}.`,
      });
    }
  }

  // Coverage gaps: not in connectivity scenario
  const noScenario = coverage.entries.filter((e) => !e.inConnectivityScenario);
  if (noScenario.length > 30) {
    gaps.push({
      category: "coverage",
      severity: "low",
      description: `${noScenario.length} entries are not part of any connectivity scenario.`,
      action: "Consider adding cross-module scenarios for critical flows.",
    });
  }

  // Scenarios without script (not executed)
  for (const id of coverage.scenariosWithoutScript) {
    const scenario = CONNECTIVITY_SCENARIOS.find((s) => s.id === id);
    gaps.push({
      category: "scenario",
      severity: "high",
      description: `Connectivity scenario "${scenario?.name || id}" has no script and is not executed.`,
      action: `Implement script or Vitest test for scenario "${id}".`,
    });
  }

  // Missing flows (hard-coded critical flows) - check if implemented in connectivity
  const missingFlows = [
    {
      id: "beo-traceability",
      name: "BEO Traceability (prospect/order → production/plate)",
      severity: "critical" as const,
    },
    {
      id: "staff-gap",
      name: "Staff-gap resilience scenario (understaffed, no-show)",
      severity: "high" as const,
    },
    {
      id: "full-automatic-e2e",
      name: "Full-automatic E2E (layout → BEO → order → scheduling → production)",
      severity: "critical" as const,
    },
    {
      id: "audit-events",
      name: "EchoAI^3 audit event emission and read path",
      severity: "high" as const,
    },
  ];

  // Check if these flows have scripts or testPatterns in connectivity
  for (const flow of missingFlows) {
    const hasImplementation = CONNECTIVITY_SCENARIOS.some(
      (s) =>
        s.id.includes(flow.id.replace(/-/g, "")) &&
        (s.script || s.testPattern),
    );
    if (!hasImplementation) {
      gaps.push({
        category: "flow",
        severity: flow.severity,
        description: `Missing flow: ${flow.name}.`,
        action: `Implement ${flow.id} scenario script or test and register in connectivity.ts.`,
      });
    }
  }

  // Failures from last run
  if (failures && failures.length > 0) {
    for (const f of failures.slice(0, 20)) {
      gaps.push({
        category: "failure",
        severity: f.category === "repair" ? "critical" : "high",
        description: `Test failure: ${f.suite || ""} ${f.test || ""} — ${f.message.slice(0, 100)}`,
        action: f.category === "repair" ? "Fix broken behavior." : "Correct test or implementation.",
      });
    }
    if (failures.length > 20) {
      gaps.push({
        category: "failure",
        severity: "high",
        description: `${failures.length - 20} more failures (truncated).`,
        action: "Review full REPAIR_TODO for all failures.",
      });
    }
  }

  const critical = gaps.filter((g) => g.severity === "critical").length;
  const high = gaps.filter((g) => g.severity === "high").length;
  const medium = gaps.filter((g) => g.severity === "medium").length;
  const low = gaps.filter((g) => g.severity === "low").length;

  return {
    generatedAt: new Date().toISOString(),
    summary: {
      totalGaps: gaps.length,
      critical,
      high,
      medium,
      low,
    },
    gaps,
    coverageSummary: coverage.summary,
  };
}

/** Write gap report to docs/smoke-system/GAP_REPORT_*.md and .json. */
export function writeGapReport(failures?: TestFailure[]): { mdPath: string; jsonPath: string } {
  const report = generateGapReport(failures);
  const dir = PATHS.reportDir;
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  const now = new Date();
  const date = now.toISOString().slice(0, 10);
  const base = `GAP_REPORT_${date}`;
  const mdPath = path.join(dir, `${base}.md`);
  const jsonPath = path.join(dir, `${base}.json`);

  const severityIcon = (s: string) => {
    switch (s) {
      case "critical": return "🔴";
      case "high": return "🟠";
      case "medium": return "🟡";
      default: return "🟢";
    }
  };

  const md = [
    "# Gap Report",
    "",
    `Generated: ${report.generatedAt}`,
    "",
    "## Summary",
    "",
    `| Metric | Count |`,
    `|--------|-------|`,
    `| Total gaps | ${report.summary.totalGaps} |`,
    `| Critical | ${report.summary.critical} |`,
    `| High | ${report.summary.high} |`,
    `| Medium | ${report.summary.medium} |`,
    `| Low | ${report.summary.low} |`,
    "",
    "## Coverage Summary",
    "",
    `| Metric | Count |`,
    `|--------|-------|`,
    `| Total entries | ${report.coverageSummary.totalEntries} |`,
    `| With test | ${report.coverageSummary.withTest} |`,
    `| Without test | ${report.coverageSummary.withoutTest} |`,
    `| In scenario | ${report.coverageSummary.inScenario} |`,
    `| Not in scenario | ${report.coverageSummary.notInScenario} |`,
    "",
    "## Gaps",
    "",
    ...report.gaps.map(
      (g) =>
        `- ${severityIcon(g.severity)} **[${g.category}]** ${g.description}\n  - Action: ${g.action}`,
    ),
    "",
    "---",
    "",
    "See also: [SCOPE_AND_COVERAGE.md](./SCOPE_AND_COVERAGE.md) for full coverage matrix.",
  ].join("\n");

  fs.writeFileSync(mdPath, md, "utf-8");
  fs.writeFileSync(jsonPath, JSON.stringify(report, null, 2), "utf-8");

  return { mdPath, jsonPath };
}
