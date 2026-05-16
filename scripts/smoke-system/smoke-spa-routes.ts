/**
 * SPA route smoke: GET each main shell route; expect 200 and optional body snippet.
 * Reads LINK_INVENTORY.json, writes docs/smoke-system/spa-route-results.json.
 * Set SMOKE_BASE_URL (default http://localhost:8080).
 */

import fs from "fs";
import path from "path";
import { PATHS } from "./config.ts";

const BASE_URL = process.env.SMOKE_BASE_URL || "http://localhost:8080";

interface RouteEntry {
  path: string;
  method: string;
}

interface SpaRouteResult {
  path: string;
  status?: number;
  passed: boolean;
  error?: string;
}

async function smokeOne(route: RouteEntry): Promise<SpaRouteResult> {
  const url = BASE_URL + route.path;
  try {
    const res = await fetch(url, {
      method: "GET",
      redirect: "follow",
      signal: AbortSignal.timeout(15000),
    });
    const passed = res.status === 200;
    let error: string | undefined;
    if (!passed) error = `HTTP ${res.status}`;
    else {
      const text = await res.text();
      if (!text || text.length < 50) error = "Empty or very short response";
    }
    return {
      path: route.path,
      status: res.status,
      passed: passed && !error,
      error: error ?? (passed ? undefined : `HTTP ${res.status}`),
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return {
      path: route.path,
      passed: false,
      error: message.length > 300 ? message.slice(0, 297) + "..." : message,
    };
  }
}

async function run(): Promise<void> {
  const inventoryPath = path.join(PATHS.reportDir, "LINK_INVENTORY.json");
  if (!fs.existsSync(inventoryPath)) {
    console.error("LINK_INVENTORY.json not found. Run link-inventory script first.");
    process.exit(1);
  }
  const inventory = JSON.parse(fs.readFileSync(inventoryPath, "utf-8"));
  const routes: RouteEntry[] = inventory.routes ?? [];
  if (routes.length === 0) {
    console.log("No SPA routes in inventory.");
    fs.writeFileSync(
      path.join(PATHS.reportDir, "spa-route-results.json"),
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

  const results: SpaRouteResult[] = [];
  for (const route of routes) {
    const r = await smokeOne(route);
    results.push(r);
    if (!r.passed) process.stderr.write(`  FAIL ${r.path}: ${r.error}\n`);
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
    path.join(PATHS.reportDir, "spa-route-results.json"),
    JSON.stringify(out, null, 2),
    "utf-8"
  );
  console.log(`SPA route smoke: ${passed}/${results.length} passed`);
  if (failed > 0) process.exit(1);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
