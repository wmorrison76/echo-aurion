/**
 * System-wide scope discovery: modules, panels, server routes/services, test files.
 * Produces a complete inventory for the smoke harness (client + server surface).
 */

import fs from "fs";
import path from "path";
import { PATHS } from "./config.ts";

export interface SystemScope {
  panels: string[];
  modules: string[];
  serverRoutes: string[];
  serverServices: string[];
  testFiles: string[];
  discoveredAt: string;
}

/** Extract panel keys from client/lib/panel-registry.ts (PANEL_REGISTRY entries). */
function discoverPanels(): string[] {
  const filePath = PATHS.panelRegistry;
  if (!fs.existsSync(filePath)) return [];
  const content = fs.readFileSync(filePath, "utf-8");
  const keys: string[] = [];
  // Match lines like:  "dashboard": () => or  ekg: () => or  "maestro-bqt": () =>
  const regex = /^\s*["']?([a-zA-Z0-9_-]+)["']?\s*:\s*\(\)\s*=>/gm;
  let m: RegExpExecArray | null;
  while ((m = regex.exec(content)) !== null) {
    keys.push(m[1]);
  }
  return [...new Set(keys)];
}

/** List top-level client/modules directory names. */
function discoverModules(): string[] {
  const dir = PATHS.clientModules;
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name)
    .sort();
}

/** List server/routes/*.ts files (top-level route modules). */
function discoverServerRoutes(): string[] {
  const dir = path.join(PATHS.server, "routes");
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir, { withFileTypes: true })
    .filter((d) => d.isFile() && d.name.endsWith(".ts") && !d.name.endsWith(".test.ts"))
    .map((d) => d.name.replace(/\.ts$/, ""))
    .sort();
}

/** List server/services/*.ts files (top-level service modules). */
function discoverServerServices(): string[] {
  const dir = path.join(PATHS.server, "services");
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir, { withFileTypes: true })
    .filter((d) => d.isFile() && d.name.endsWith(".ts") && !d.name.endsWith(".test.ts"))
    .map((d) => d.name.replace(/\.ts$/, ""))
    .sort();
}

/** Recursively find *.test.ts, *.spec.ts, *.test.tsx, *.spec.tsx (exclude node_modules). */
function discoverTestFiles(): string[] {
  const root = PATHS.root;
  const out: string[] = [];
  const exclude = new Set(["node_modules", "dist", "build", ".git", "coverage", ".next", "luccca-mobile"]);

  function walk(dir: string) {
    if (!fs.existsSync(dir)) return;
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const e of entries) {
      const full = path.join(dir, e.name);
      const rel = path.relative(root, full);
      if (e.isDirectory()) {
        if (!exclude.has(e.name) && !rel.includes("node_modules")) walk(full);
      } else if (e.isFile()) {
        if (/\.(test|spec)\.(ts|tsx)$/.test(e.name)) out.push(rel);
      }
    }
  }

  walk(path.join(root, "client"));
  walk(path.join(root, "server"));
  walk(path.join(root, "tests"));
  walk(path.join(root, "shared"));
  return out.sort();
}

export function discoverScope(): SystemScope {
  return {
    panels: discoverPanels(),
    modules: discoverModules(),
    serverRoutes: discoverServerRoutes(),
    serverServices: discoverServerServices(),
    testFiles: discoverTestFiles(),
    discoveredAt: new Date().toISOString(),
  };
}
