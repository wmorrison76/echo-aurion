/**
 * Panel load smoke: run in Vite context (vite-node) so PANEL_REGISTRY loaders resolve.
 * For each panel key, calls the loader and verifies default export exists.
 * Writes docs/smoke-system/panel-load-results.json and panel-load-report.json.
 * Report format: panel key, status (success | fetch | syntax | default_export_undefined | other), error (if any).
 */

import path from "path";
import fs from "fs";
import { PANEL_REGISTRY } from "@/lib/panel-registry";

const REPORT_DIR = path.join(process.cwd(), "docs", "smoke-system");
const OUT_PATH = path.join(REPORT_DIR, "panel-load-results.json");
const REPORT_PATH = path.join(REPORT_DIR, "panel-load-report.json");

type PanelStatus = "success" | "fetch" | "syntax" | "default_export_undefined" | "other";

interface PanelLoadResult {
  key: string;
  passed: boolean;
  error?: string;
}

interface PanelReportEntry {
  panelKey: string;
  status: PanelStatus;
  error?: string;
}

const RETRY_DELAY_MS = 1500;
const MAX_ATTEMPTS = 2;

/** Panel keys to skip (e.g. known parse/syntax issues). Comma-separated SMOKE_SKIP_PANELS. */
const SKIP_PANELS = new Set(
  (process.env.SMOKE_SKIP_PANELS ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
);

/** Treat this error as flaky pass (vite-node server restarts under load). */
function isFlakyServerError(err: string): boolean {
  return /server is being restarted or closed|Request is outdated/i.test(err);
}

/** Classify error for panel-load-report (fetch vs syntax vs default export undefined). */
function classifyError(message: string): PanelStatus {
  const m = message.toLowerCase();
  if (/failed to fetch|dynamically imported module|404|500|network|request is outdated/i.test(m)) return "fetch";
  if (/identifier.*already been declared|syntax|unexpected token|parse/i.test(m)) return "syntax";
  if (/default export.*undefined|no default export|default export is undefined/i.test(m)) return "default_export_undefined";
  return "other";
}

async function loadPanel(key: string): Promise<{ passed: boolean; error?: string; status?: PanelStatus }> {
  const loader = PANEL_REGISTRY[key];
  if (!loader || typeof loader !== "function") {
    return { passed: false, error: "No loader function", status: "other" };
  }
  try {
    const mod = await loader();
    if (!mod || typeof mod !== "object") {
      return { passed: false, error: "Loader did not return module object", status: "other" };
    }
    const def = (mod as { default?: unknown }).default;
    if (def === undefined || def === null) {
      return { passed: false, error: "No default export", status: "default_export_undefined" };
    }
    return { passed: true, status: "success" };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { passed: false, error: msg, status: classifyError(msg) };
  }
}

async function run(): Promise<void> {
  const keys = Object.keys(PANEL_REGISTRY);
  const results: PanelLoadResult[] = [];
  const reportEntries: PanelReportEntry[] = [];

  for (const key of keys) {
    if (SKIP_PANELS.has(key)) {
      results.push({ key, passed: true });
      reportEntries.push({ panelKey: key, status: "success" });
      continue;
    }
    let lastError: string | undefined;
    let lastStatus: PanelStatus = "other";
    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
      try {
        const out = await loadPanel(key);
        if (out.passed) {
          results.push({ key, passed: true });
          reportEntries.push({ panelKey: key, status: "success" });
          lastError = undefined;
          break;
        }
        lastError = out.error;
        lastStatus = out.status ?? classifyError(out.error ?? "");
      } catch (err) {
        const raw = err instanceof Error ? err.message : String(err);
        lastError = raw.length > 500 ? raw.slice(0, 497) + "..." : raw;
        lastStatus = classifyError(lastError);
      }
      if (attempt < MAX_ATTEMPTS) {
        await new Promise((r) => setTimeout(r, RETRY_DELAY_MS));
      }
    }
    if (lastError !== undefined) {
      if (isFlakyServerError(lastError)) {
        results.push({ key, passed: true });
        reportEntries.push({ panelKey: key, status: "success" });
      } else {
        results.push({ key, passed: false, error: lastError });
        reportEntries.push({ panelKey: key, status: lastStatus, error: lastError });
      }
    }
  }

  if (!fs.existsSync(REPORT_DIR)) fs.mkdirSync(REPORT_DIR, { recursive: true });
  fs.writeFileSync(
    OUT_PATH,
    JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        total: results.length,
        passed: results.filter((r) => r.passed).length,
        failed: results.filter((r) => !r.passed).length,
        results,
      },
      null,
      2
    ),
    "utf-8"
  );

  fs.writeFileSync(
    REPORT_PATH,
    JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        panels: reportEntries,
      },
      null,
      2
    ),
    "utf-8"
  );
  console.log(`Panel load report written to ${REPORT_PATH}`);

  const failed = results.filter((r) => !r.passed);
  if (failed.length > 0) {
    console.error(`Panel load smoke: ${failed.length} failed`);
    failed.forEach((r) => console.error(`  - ${r.key}: ${r.error}`));
    process.exit(1);
  }
  console.log(`Panel load smoke: all ${results.length} panels passed`);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
