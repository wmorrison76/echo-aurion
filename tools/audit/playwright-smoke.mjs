import fs from "node:fs";
import path from "node:path";

const BASE_URL = process.env.DIAG_BASE_URL ?? "http://localhost:8080";

async function ensurePlaywright() {
  try {
    return await import("playwright");
  } catch {
    console.error("Playwright not installed. Install with: pnpm add -D playwright && pnpm exec playwright install");
    process.exit(1);
  }
}

async function main() {
  const { chromium } = await ensurePlaywright();
  fs.mkdirSync("audit/artifacts", { recursive: true });
  fs.mkdirSync("audit/artifacts/screens", { recursive: true });

  const browser = await chromium.launch();
  const page = await browser.newPage();

  const url = `${BASE_URL}/__diag?diag=1`;
  const consoleLines = [];
  page.on("console", (msg) => consoleLines.push(`[${msg.type()}] ${msg.text()}`));
  page.on("pageerror", (err) => consoleLines.push(`[pageerror] ${err?.message}\n${err?.stack ?? ""}`));

  await page.goto(url, { waitUntil: "domcontentloaded" });

  // Click "Run All Panels"
  await page.click("text=Run All Panels");

  // Wait for done marker
  await page.waitForSelector("text=✅ Done", { timeout: 20 * 60 * 1000 });

  // Download JSON by invoking diag API
  const report = await page.evaluate(() => (window).__LUCCCA_DIAG__?.report);
  const out = path.join("audit", "diag-report.playwright.json");
  fs.writeFileSync(out, JSON.stringify(report, null, 2), "utf8");

  await page.screenshot({ path: "audit/artifacts/screens/diag-finished.png", fullPage: true });
  fs.writeFileSync("audit/artifacts/console.log", consoleLines.join("\n"), "utf8");

  await browser.close();
  console.log(`Saved ${out} + artifacts`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
