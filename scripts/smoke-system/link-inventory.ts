/**
 * Link inventory: panels, SPA routes, API base paths.
 * Writes docs/smoke-system/LINK_INVENTORY.json for smoke runners.
 */

import fs from "fs";
import path from "path";
import { PATHS } from "./config.ts";

export interface LinkInventoryRoute {
  path: string;
  method: "GET" | "POST";
}

export interface LinkInventory {
  panels: string[];
  routes: LinkInventoryRoute[];
  apiBasePaths: { path: string; method: "GET" | "POST" }[];
  generatedAt: string;
}

/** Extract all panel keys from PANEL_REGISTRY (including createSafeModuleLoader entries). */
function discoverAllPanels(): string[] {
  const filePath = PATHS.panelRegistry;
  if (!fs.existsSync(filePath)) return [];
  const content = fs.readFileSync(filePath, "utf-8");
  const keys: string[] = [];
  const registryStart = content.indexOf("export const PANEL_REGISTRY");
  if (registryStart === -1) return [];
  const braceStart = content.indexOf("{", registryStart);
  if (braceStart === -1) return [];
  let depth = 0;
  let blockEnd = -1;
  for (let i = braceStart; i < content.length; i++) {
    const char = content[i];
    if (char === "{") depth += 1;
    if (char === "}") {
      depth -= 1;
      if (depth === 0) {
        blockEnd = i;
        break;
      }
    }
  }
  if (blockEnd === -1) return [];
  const block = content.slice(braceStart + 1, blockEnd);
  // Match "key": or key: (identifier or quoted) at line start within the block
  const regex = /^\s*["']?([a-zA-Z0-9_.-]+)["']?\s*:/gm;
  let m: RegExpExecArray | null;
  while ((m = regex.exec(block)) !== null) {
    keys.push(m[1]);
  }
  return [...new Set(keys)];
}

/** Main shell SPA routes (from client/App.tsx). */
function getSpaRoutes(): LinkInventoryRoute[] {
  return [
    { path: "/", method: "GET" },
    { path: "/auth", method: "GET" },
    { path: "/conference/join/test-link-id", method: "GET" },
    { path: "/mobile", method: "GET" },
    { path: "/mobile/receiving", method: "GET" },
    { path: "/mobile/inventory-count", method: "GET" },
    { path: "/mobile/recipe-view", method: "GET" },
    { path: "/mobile/approvals", method: "GET" },
    { path: "/mobile/tasks", method: "GET" },
  ];
}

/** Extract API base paths and preferred method from server/index.ts. */
function discoverApiPaths(): { path: string; method: "GET" | "POST" }[] {
  const indexPath = path.join(PATHS.server, "index.ts");
  if (!fs.existsSync(indexPath)) return [];
  const content = fs.readFileSync(indexPath, "utf-8");
  const entries: { path: string; method: "GET" | "POST" }[] = [];
  const seen = new Set<string>();

  // app.use("/api/...", ...) or app.get("/api/...") or app.post("/api/...")
  const useRe = /app\.(use|get|post|put|delete|patch)\s*\(\s*["'](\/api\/[^"']*)["']/g;
  let m: RegExpExecArray | null;
  while ((m = useRe.exec(content)) !== null) {
    const method = m[1].toLowerCase();
    let pathStr = m[2];
    // Normalize: remove trailing slash for consistency
    if (pathStr.endsWith("/") && pathStr.length > 1) pathStr = pathStr.slice(0, -1);
    if (pathStr.startsWith("/api") && !seen.has(pathStr)) {
      seen.add(pathStr);
      const preferred: "GET" | "POST" =
        method === "get" ? "GET" : method === "post" ? "POST" : "GET";
      entries.push({ path: pathStr, method: preferred });
    }
  }

  return entries.sort((a, b) => a.path.localeCompare(b.path));
}

export function generateLinkInventory(): LinkInventory {
  return {
    panels: discoverAllPanels(),
    routes: getSpaRoutes(),
    apiBasePaths: discoverApiPaths(),
    generatedAt: new Date().toISOString(),
  };
}

export function writeLinkInventory(): string {
  const inventory = generateLinkInventory();
  const reportDir = PATHS.reportDir;
  if (!fs.existsSync(reportDir)) fs.mkdirSync(reportDir, { recursive: true });
  const outPath = path.join(reportDir, "LINK_INVENTORY.json");
  fs.writeFileSync(outPath, JSON.stringify(inventory, null, 2), "utf-8");
  return outPath;
}

// CLI when run as main module
const isMain =
  typeof process !== "undefined" &&
  process.argv[1] &&
  (process.argv[1].endsWith("link-inventory.ts") || process.argv[1].endsWith("link-inventory.mjs"));
if (isMain) {
  const outPath = writeLinkInventory();
  const inv = generateLinkInventory();
  console.log(`Link inventory written to ${outPath}`);
  console.log(`  panels: ${inv.panels.length}`);
  console.log(`  routes: ${inv.routes.length}`);
  console.log(`  apiBasePaths: ${inv.apiBasePaths.length}`);
}
