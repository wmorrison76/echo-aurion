/**
 * Full-system Sentry audit: scans entire LUCCCA_Framework for error handling
 * and reports Sentry usage and gaps.
 *
 * Run: pnpm exec tsx scripts/sentry-audit.ts
 * Or:  npx tsx scripts/sentry-audit.ts
 */

import * as fs from "fs";
import * as path from "path";

const ROOT = path.join(import.meta.dirname, "..");
const EXT = [".ts", ".tsx", ".js", ".jsx"];
const IGNORE_DIRS = new Set([
  "node_modules",
  "dist",
  ".git",
  "coverage",
  ".next",
  "build",
  "*.backup",
]);

interface Finding {
  file: string;
  line: number;
  kind: "sentry_use" | "error_boundary" | "catch" | "console_error" | "throw";
  snippet: string;
}

const findings: Finding[] = [];

function walk(dir: string, fn: (file: string) => void) {
  if (!fs.existsSync(dir)) return;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const e of entries) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) {
      if (!IGNORE_DIRS.has(e.name) && !e.name.startsWith(".")) walk(full, fn);
    } else if (EXT.some((x) => e.name.endsWith(x))) fn(full);
  }
}

const SENTRY_PATTERNS = [
  /captureException\s*\(/,
  /captureMessage\s*\(/,
  /addBreadcrumb\s*\(/,
  /initSentry\s*\(/,
  /Sentry\.(captureException|captureMessage|setContext|setUser)/,
  /from\s+["'].*sentry-init["']/,
  /import\s+\*?\s*Sentry\s+from\s+["']@sentry/,
];

const ERROR_BOUNDARY_PATTERNS = [
  /componentDidCatch\s*\(/,
  /getDerivedStateFromError\s*\(/,
  /<ErrorBoundary\b/,
  /ErrorBoundary\s*\./,
];

const CATCH_PATTERN = /\.catch\s*\(|catch\s*\(/;
const CONSOLE_ERROR_PATTERN = /console\.error\s*\(/;
const THROW_PATTERN = /throw\s+(new\s+)?Error\s*\(/;

function scanFile(filePath: string) {
  const rel = path.relative(ROOT, filePath);
  const content = fs.readFileSync(filePath, "utf-8");
  const lines = content.split("\n");

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lineNum = i + 1;

    for (const re of SENTRY_PATTERNS) {
      if (re.test(line)) {
        findings.push({
          file: rel,
          line: lineNum,
          kind: "sentry_use",
          snippet: line.trim().slice(0, 80),
        });
        break;
      }
    }

    for (const re of ERROR_BOUNDARY_PATTERNS) {
      if (re.test(line)) {
        findings.push({
          file: rel,
          line: lineNum,
          kind: "error_boundary",
          snippet: line.trim().slice(0, 80),
        });
        break;
      }
    }

    if (CATCH_PATTERN.test(line)) {
      findings.push({
        file: rel,
        line: lineNum,
        kind: "catch",
        snippet: line.trim().slice(0, 80),
      });
    }
    if (CONSOLE_ERROR_PATTERN.test(line)) {
      findings.push({
        file: rel,
        line: lineNum,
        kind: "console_error",
        snippet: line.trim().slice(0, 80),
      });
    }
    if (THROW_PATTERN.test(line)) {
      findings.push({
        file: rel,
        line: lineNum,
        kind: "throw",
        snippet: line.trim().slice(0, 80),
      });
    }
  }
}

function main() {
  console.log("Sentry full-system audit – scanning", ROOT, "\n");

  walk(ROOT, (f) => scanFile(f));

  const byKind = {
    sentry_use: findings.filter((f) => f.kind === "sentry_use"),
    error_boundary: findings.filter((f) => f.kind === "error_boundary"),
    catch: findings.filter((f) => f.kind === "catch"),
    console_error: findings.filter((f) => f.kind === "console_error"),
    throw: findings.filter((f) => f.kind === "throw"),
  };

  const filesWithSentry = new Set(byKind.sentry_use.map((f) => f.file));
  const filesWithErrorBoundary = new Set(byKind.error_boundary.map((f) => f.file));
  const filesWithCatch = new Set(byKind.catch.map((f) => f.file));

  console.log("=== Summary ===");
  console.log("Files with Sentry usage:", filesWithSentry.size);
  console.log("Files with ErrorBoundary/componentDidCatch:", filesWithErrorBoundary.size);
  console.log("Files with .catch() or catch():", filesWithCatch.size);
  console.log("Total console.error occurrences:", byKind.console_error.length);
  console.log("Total throw Error occurrences:", byKind.throw.length);
  console.log("");

  console.log("=== Files using Sentry (captureException / captureMessage / init) ===");
  const sentryFiles = [...filesWithSentry].sort();
  sentryFiles.forEach((f) => {
    const count = byKind.sentry_use.filter((x) => x.file === f).length;
    console.log(`  ${f} (${count})`);
  });
  console.log("");

  console.log("=== Error boundaries (should report to Sentry) ===");
  const boundaryFiles = [...filesWithErrorBoundary].sort();
  boundaryFiles.forEach((f) => {
    const hasSentry = filesWithSentry.has(f);
    console.log(`  ${f} ${hasSentry ? "✓ Sentry" : "✗ NO SENTRY"}`);
  });
  console.log("");

  console.log("=== Files with catch blocks (sample; not all need Sentry) ===");
  const catchFiles = [...filesWithCatch].sort().slice(0, 50);
  catchFiles.forEach((f) => {
    const hasSentry = filesWithSentry.has(f);
    console.log(`  ${f} ${hasSentry ? "✓" : ""}`);
  });
  if (filesWithCatch.size > 50) {
    console.log(`  ... and ${filesWithCatch.size - 50} more`);
  }
  console.log("");

  const boundariesWithoutSentry = boundaryFiles.filter((f) => !filesWithSentry.has(f));
  if (boundariesWithoutSentry.length > 0) {
    console.log("=== Gaps: Error boundaries without Sentry ===");
    boundariesWithoutSentry.forEach((f) => console.log("  ", f));
  }

  console.log("\nDone. Total files scanned:", new Set(findings.map((f) => f.file)).size);
  console.log("Total findings:", findings.length);
}

main();
