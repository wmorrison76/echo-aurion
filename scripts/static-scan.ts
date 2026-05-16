/**
 * LUCCCA Diagnostic Harness — Layer 1: Static Truth Scanner
 * Parses panel-registry.ts, validates loader targets, writes audit/static-report.json and audit/TODO.md
 */

import * as path from "path";
import * as fs from "fs";

const PROJECT_ROOT = process.cwd();
const REGISTRY_PATH = path.join(PROJECT_ROOT, "client/lib/panel-registry.ts");
const CLIENT_ROOT = path.join(PROJECT_ROOT, "client");

interface StaticFinding {
  severity: "P0" | "P1" | "P2";
  category: string;
  file: string;
  message: string;
  suggestion?: string;
}

const findings: StaticFinding[] = [];

function resolveModulePath(importPath: string, fromDir: string): string | null {
  const clean = importPath.replace(/^@\//, "");
  const base = path.resolve(fromDir, clean);
  const extensions = [".tsx", ".ts", ".jsx", ".js"];
  const withIndex = [path.join(base, "index.tsx"), path.join(base, "index.ts"), path.join(base, "index.jsx"), path.join(base, "index.js")];
  for (const p of withIndex) {
    if (fs.existsSync(p)) return p;
  }
  for (const ext of extensions) {
    const candidate = base + ext;
    if (fs.existsSync(candidate)) return candidate;
  }
  if (fs.existsSync(base)) return base;
  return null;
}

function checkForDefaultExport(filePath: string): boolean {
  const source = fs.readFileSync(filePath, "utf-8");
  return /export\s+default/.test(source);
}

function scanPanelRegistry(registryPath: string): Map<string, string> {
  const source = fs.readFileSync(registryPath, "utf-8");
  const entries = new Map<string, string>();
  // Match panel key (identifier or string) and import path: "key": () => import("path") or createSafeModuleLoader(() => import("path"), ...)
  const keyPathRe = /["']?([a-zA-Z0-9_-]+)["']?\s*:\s*(?:createSafeModuleLoader\s*\(\s*\(\)\s*=>\s*import\s*\(\s*["']([^"']+)["']\)|\(\)\s*=>\s*import\s*\(\s*["']([^"']+)["']\))/g;
  let m;
  while ((m = keyPathRe.exec(source)) !== null) {
    const key = m[1];
    const importPath = m[2] ?? m[3];
    if (key && importPath) entries.set(key, importPath);
  }
  return entries;
}

function validateLoaderTargets(entries: Map<string, string>, registryDir: string): void {
  for (const [panelKey, importPath] of entries) {
    const fromDir = path.dirname(REGISTRY_PATH);
    const resolved = resolveModulePath(importPath, path.join(PROJECT_ROOT, "client"));
    if (!resolved) {
      findings.push({
        severity: "P0",
        category: "missing-module",
        file: importPath,
        message: `Panel "${panelKey}" loader points to "${importPath}" which does not resolve to any file`,
        suggestion: "Check if the file exists, check for case mismatches, verify tsconfig/vite aliases",
      });
      continue;
    }
    const hasDefault = checkForDefaultExport(resolved);
    if (!hasDefault) {
      findings.push({
        severity: "P0",
        category: "missing-export",
        file: resolved,
        message: `Panel "${panelKey}" target file has no default export`,
        suggestion: "Add \"export default\" to the component, or change the loader to use named import",
      });
    }
  }
}

function findOrphans(moduleDirs: string[], registeredKeys: Set<string>): void {
  for (const dir of moduleDirs) {
    const dirName = path.basename(dir);
    if (!registeredKeys.has(dirName) && !dirName.startsWith(".")) {
      findings.push({
        severity: "P2",
        category: "orphan-module",
        file: dir,
        message: `Directory "${dir}" exists but "${dirName}" is not in PANEL_REGISTRY`,
        suggestion: "Either register this module or remove the directory if it's dead code",
      });
    }
  }
}

async function main(): Promise<void> {
  console.log("Scanning panel registry...");
  const entries = scanPanelRegistry(REGISTRY_PATH);
  console.log(`   Found ${entries.size} panel entries`);

  console.log("Validating loader targets...");
  validateLoaderTargets(entries, path.dirname(REGISTRY_PATH));

  console.log("Finding orphan modules...");
  const modulesDir = path.join(PROJECT_ROOT, "client/modules");
  if (fs.existsSync(modulesDir)) {
    const moduleDirs = fs.readdirSync(modulesDir).map((d) => path.join(modulesDir, d));
    findOrphans(moduleDirs, new Set(entries.keys()));
  }

  const report = {
    timestamp: new Date().toISOString(),
    totalPanels: entries.size,
    findings: findings.sort((a, b) => {
      const order = { P0: 0, P1: 1, P2: 2 };
      return order[a.severity] - order[b.severity];
    }),
    summary: {
      P0: findings.filter((f) => f.severity === "P0").length,
      P1: findings.filter((f) => f.severity === "P1").length,
      P2: findings.filter((f) => f.severity === "P2").length,
    },
  };

  fs.mkdirSync(path.join(PROJECT_ROOT, "audit"), { recursive: true });
  fs.writeFileSync(
    path.join(PROJECT_ROOT, "audit/static-report.json"),
    JSON.stringify(report, null, 2)
  );

  let todo = "# Static Scan Findings\n\n";
  for (const f of report.findings) {
    todo += `## [${f.severity}] ${f.category}\n`;
    todo += `- **File**: ${f.file}\n`;
    todo += `- **Issue**: ${f.message}\n`;
    if (f.suggestion) todo += `- **Fix**: ${f.suggestion}\n`;
    todo += "\n";
  }
  fs.writeFileSync(path.join(PROJECT_ROOT, "audit/TODO.md"), todo);

  console.log(
    `\nStatic scan complete: ${report.summary.P0} P0, ${report.summary.P1} P1, ${report.summary.P2} P2`
  );
  console.log("   Reports: audit/static-report.json, audit/TODO.md");
}

main().catch(console.error);
