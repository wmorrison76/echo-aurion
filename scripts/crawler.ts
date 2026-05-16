/**
 * LUCCCA Diagnostic Harness — Layer 3: Playwright panel crawler
 * For each contract: open app at ?diag=1, run openScript, wait for rootSelector,
 * classify mounted/hung/import-failed/crashed/invisible via __DIAG__.getEvents() and DOM.
 * Output: audit/crawler-results.json, audit/FAILURES.md, audit/screenshots/
 *
 * Prerequisite: dev server running (e.g. pnpm dev). Default URL: http://localhost:5173
 */

import * as path from "path";
import * as fs from "fs";
import { chromium } from "@playwright/test";

const PROJECT_ROOT = process.cwd();
const BASE_URL = process.env.DIAG_BASE_URL || "http://localhost:5173";
const APP_URL = `${BASE_URL}?diag=1`;
const AUDIT_DIR = path.join(PROJECT_ROOT, "audit");
const SCREENSHOTS_DIR = path.join(AUDIT_DIR, "screenshots");

type CrawlStatus = "mounted" | "hung" | "import-failed" | "crashed" | "invisible" | "timeout" | "no-diag";

interface CrawlResult {
  id: string;
  status: CrawlStatus;
  cause?: string;
  suggestion?: string;
  screenshot?: string;
  eventsExcerpt?: string;
  durationMs?: number;
}

interface ModuleContract {
  id: string;
  openMethod: string;
  openScript?: string;
  url?: string;
  expect: { rootSelector: string; textContent?: string[] };
  timeoutMs?: number;
}

async function loadContracts(): Promise<ModuleContract[]> {
  const genPath = path.join(PROJECT_ROOT, "scripts/module-contracts.generated.ts");
  if (!fs.existsSync(genPath)) {
    console.error("Run audit:generate-contracts first to create scripts/module-contracts.generated.ts");
    process.exit(1);
  }
  const mod = await import("./module-contracts.generated.js");
  return mod.MODULE_CONTRACTS as ModuleContract[];
}

async function crawlOne(
  page: import("playwright").Page,
  contract: ModuleContract,
  results: CrawlResult[]
): Promise<void> {
  const start = Date.now();
  const timeoutMs = contract.timeoutMs ?? 10000;
  const result: CrawlResult = { id: contract.id, status: "timeout" };

  try {
    await page.goto(APP_URL, { waitUntil: "domcontentloaded", timeout: 30000 });
  } catch (e) {
    result.status = "hung";
    result.cause = `Navigation failed: ${(e as Error).message}`;
    result.suggestion = "Ensure dev server is running (e.g. pnpm dev) and DIAG_BASE_URL is correct.";
    result.durationMs = Date.now() - start;
    results.push(result);
    return;
  }

  try {
    await page.waitForFunction(
      () => typeof (window as any).__DIAG__ !== "undefined",
      { timeout: 15000 }
    );
  } catch {
    result.status = "no-diag";
    result.cause = "window.__DIAG__ not available within 15s";
    result.suggestion = "Open the app with ?diag=1 and ensure diagnostic-core init runs.";
    result.durationMs = Date.now() - start;
    results.push(result);
    return;
  }

  if (contract.openScript) {
    try {
      await page.evaluate((script: string) => {
        // eslint-disable-next-line no-eval
        eval(script);
      }, contract.openScript!);
    } catch (e) {
      result.status = "crashed";
      result.cause = `openScript threw: ${(e as Error).message}`;
      result.durationMs = Date.now() - start;
      results.push(result);
      return;
    }
  }

  const rootSelector = contract.expect.rootSelector;
  let el: import("playwright").ElementHandle<SVGElement | HTMLElement> | null = null;
  try {
    el = await page.waitForSelector(rootSelector, { state: "attached", timeout: timeoutMs });
  } catch {
    // timeout waiting for root
  }

  const events = await page.evaluate(() => (window as any).__DIAG__?.getEvents?.() ?? []);
  const eventsForModule = (events as { type?: string; module?: string }[]).filter(
    (e) => e.module === contract.id
  );
  const hasImportFailure = eventsForModule.some((e) => e.type === "import.failure");
  const hasErrorBoundary = eventsForModule.some((e) => e.type === "module.error" || e.type === "error_boundary.catch");
  const hasMount = eventsForModule.some((e) => e.type === "module.mount");

  if (hasImportFailure) {
    result.status = "import-failed";
    result.cause = "import.failure event recorded for this module";
    result.eventsExcerpt = eventsForModule.map((e) => `${e.type} ${JSON.stringify(e)}`).join("; ");
  } else if (hasErrorBoundary) {
    result.status = "crashed";
    result.cause = "module.error or error_boundary.catch recorded";
    result.eventsExcerpt = eventsForModule.map((e) => `${e.type} ${JSON.stringify(e)}`).join("; ");
  } else if (!el) {
    result.status = "hung";
    result.cause = `Selector ${rootSelector} did not appear within ${timeoutMs}ms`;
    result.eventsExcerpt = eventsForModule.slice(-5).map((e) => `${e.type}`).join(", ");
  } else {
    const visible = await page.evaluate((sel) => {
      const node = document.querySelector(sel);
      if (!node) return false;
      const style = window.getComputedStyle(node);
      const rect = (node as Element).getBoundingClientRect();
      return (
        style.display !== "none" &&
        style.visibility !== "hidden" &&
        Number(style.opacity) > 0 &&
        rect.width > 0 &&
        rect.height > 0
      );
    }, rootSelector);
    if (!visible) {
      result.status = "invisible";
      result.cause = "Root element has zero size or is hidden";
    } else {
      result.status = "mounted";
    }
  }

  result.durationMs = Date.now() - start;
  if (result.eventsExcerpt === undefined && eventsForModule.length > 0) {
    result.eventsExcerpt = eventsForModule.slice(-3).map((e) => e.type).join(", ");
  }

  if (result.status !== "mounted") {
    const safeName = contract.id.replace(/[^a-zA-Z0-9_-]/g, "_");
    const screenshotPath = path.join(SCREENSHOTS_DIR, `${safeName}.png`);
    try {
      await page.screenshot({ path: screenshotPath, fullPage: false });
      result.screenshot = path.relative(AUDIT_DIR, screenshotPath);
    } catch {
      // ignore screenshot errors
    }
  }

  results.push(result);
}

async function main(): Promise<void> {
  const contracts = await loadContracts();
  console.log(`Crawling ${contracts.length} panels at ${APP_URL}`);

  fs.mkdirSync(AUDIT_DIR, { recursive: true });
  fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });

  const results: CrawlResult[] = [];
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1280, height: 720 } });
  const page = await context.newPage();

  for (let i = 0; i < contracts.length; i++) {
    const c = contracts[i];
    process.stdout.write(`  [${i + 1}/${contracts.length}] ${c.id} ... `);
    await crawlOne(page, c, results);
    const r = results[results.length - 1];
    console.log(r.status);
  }

  await context.close();
  await browser.close();

  const report = {
    timestamp: new Date().toISOString(),
    baseUrl: APP_URL,
    total: results.length,
    mounted: results.filter((r) => r.status === "mounted").length,
    failed: results.filter((r) => r.status !== "mounted").length,
    byStatus: {} as Record<string, number>,
    results,
  };
  for (const r of results) {
    report.byStatus[r.status] = (report.byStatus[r.status] ?? 0) + 1;
  }

  fs.writeFileSync(
    path.join(AUDIT_DIR, "crawler-results.json"),
    JSON.stringify(report, null, 2)
  );

  const failures = results.filter((r) => r.status !== "mounted");
  let failMd = "# Crawler Failures\n\n";
  failMd += `Generated: ${report.timestamp}\n\n`;
  failMd += `Total: ${report.total} | Mounted: ${report.mounted} | Failed: ${report.failed}\n\n`;
  failMd += "## By status\n\n";
  for (const [status, count] of Object.entries(report.byStatus)) {
    if (status !== "mounted") failMd += `- **${status}**: ${count}\n`;
  }
  failMd += "\n## Failed modules\n\n";
  for (const r of failures) {
    failMd += `### ${r.id} — ${r.status}\n`;
    if (r.cause) failMd += `- **Cause**: ${r.cause}\n`;
    if (r.suggestion) failMd += `- **Suggestion**: ${r.suggestion}\n`;
    if (r.screenshot) failMd += `- **Screenshot**: ${r.screenshot}\n`;
    if (r.eventsExcerpt) failMd += `- **Events**: ${r.eventsExcerpt}\n`;
    failMd += "\n";
  }
  fs.writeFileSync(path.join(AUDIT_DIR, "FAILURES.md"), failMd);

  console.log(`\nDone. Mounted: ${report.mounted}, Failed: ${report.failed}`);
  console.log("   Reports: audit/crawler-results.json, audit/FAILURES.md");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
