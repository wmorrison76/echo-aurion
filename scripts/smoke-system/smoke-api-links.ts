/**
 * API link smoke: GET (or safe POST) each API base path; expect status < 500.
 * Reads LINK_INVENTORY.json, writes docs/smoke-system/api-link-results.json.
 * Set SMOKE_API_BASE_URL or SMOKE_BASE_URL (default http://localhost:8080).
 */

import fs from "fs";
import path from "path";
import { PATHS } from "./config.ts";

const BASE_URL =
  process.env.SMOKE_API_BASE_URL ||
  process.env.SMOKE_BASE_URL ||
  "http://localhost:8080";

interface ApiEntry {
  path: string;
  method: "GET" | "POST";
}

interface ApiLinkResult {
  path: string;
  method: string;
  status?: number;
  passed: boolean;
  error?: string;
}

const API_RETRY_DELAY_MS = 1000;
const API_MAX_ATTEMPTS = 2;

async function smokeOne(entry: ApiEntry): Promise<ApiLinkResult> {
  const url = BASE_URL + entry.path;
  let lastResult: ApiLinkResult | null = null;
  for (let attempt = 1; attempt <= API_MAX_ATTEMPTS; attempt++) {
    try {
      const res = await fetch(url, {
        method: entry.method,
        headers: { "Content-Type": "application/json" },
        body: entry.method === "POST" ? "{}" : undefined,
        signal: AbortSignal.timeout(10000),
      });
      const passed = res.status < 500;
      lastResult = {
        path: entry.path,
        method: entry.method,
        status: res.status,
        passed,
        error: passed ? undefined : `HTTP ${res.status}`,
      };
      if (passed) return lastResult;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      lastResult = {
        path: entry.path,
        method: entry.method,
        passed: false,
        error: message.length > 300 ? message.slice(0, 297) + "..." : message,
      };
    }
    if (attempt < API_MAX_ATTEMPTS) {
      await new Promise((r) => setTimeout(r, API_RETRY_DELAY_MS));
    }
  }
  return lastResult!;
}

async function run(): Promise<void> {
  const inventoryPath = path.join(PATHS.reportDir, "LINK_INVENTORY.json");
  if (!fs.existsSync(inventoryPath)) {
    console.error("LINK_INVENTORY.json not found. Run link-inventory script first.");
    process.exit(1);
  }
  const inventory = JSON.parse(fs.readFileSync(inventoryPath, "utf-8"));
  const apiBasePaths: ApiEntry[] = inventory.apiBasePaths ?? [];
  if (apiBasePaths.length === 0) {
    console.log("No API base paths in inventory.");
    fs.writeFileSync(
      path.join(PATHS.reportDir, "api-link-results.json"),
      JSON.stringify(
        { generatedAt: new Date().toISOString(), total: 0, passed: 0, failed: 0, results: [] },
        null,
        2
      ),
      "utf-8"
    );
    process.exit(0);
    return;
  }

  const results: ApiLinkResult[] = [];
  for (const entry of apiBasePaths) {
    const r = await smokeOne(entry);
    results.push(r);
    if (!r.passed) process.stderr.write(`  FAIL ${r.method} ${r.path}: ${r.error}\n`);
  }

  const passed = results.filter((r) => r.passed).length;
  const failed = results.length - passed;
  const out = {
    generatedAt: new Date().toISOString(),
    baseUrl: BASE_URL,
    total: results.length,
    passed,
    failed,
    results,
  };
  if (!fs.existsSync(PATHS.reportDir)) fs.mkdirSync(PATHS.reportDir, { recursive: true });
  fs.writeFileSync(
    path.join(PATHS.reportDir, "api-link-results.json"),
    JSON.stringify(out, null, 2),
    "utf-8"
  );
  console.log(`API link smoke: ${passed}/${results.length} passed`);
  if (failed > 0) process.exit(1);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
