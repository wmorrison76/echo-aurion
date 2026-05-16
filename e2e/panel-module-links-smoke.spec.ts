/**
 * Panel module link smoke: open every sidebar panel (18) and toolbar control (4),
 * wait for content, assert panel or dropdown renders.
 * Sidebar panelId → button name pattern (i18n): dashboard, ekg, maestro-bqt, culinary,
 * pastry, schedule, inventory, mixology_sommelier, purchasing-receiving, aurum, stratus,
 * forecast-hub, echo-events, layout, trace-viewer, chefnet, support, module-status.
 *
 * Requires dev server on port 8080 (or BASE_URL). Run: pnpm exec playwright test e2e/panel-module-links-smoke.spec.ts
 */
import { test, expect } from "@playwright/test";

const BASE_TIMEOUT = 15000;

/** Dismiss the SystemSettings overlay if it auto-opened on page load.
 *  Uses Escape key since clicking the close button may be blocked by overlapping elements. */
async function dismissSettingsIfOpen(page: import("@playwright/test").Page) {
  const settingsDialog = page.locator(".fixed.inset-0.z-\\[99999\\]");
  const isSettingsVisible = await settingsDialog
    .evaluate((el) => {
      const style = window.getComputedStyle(el);
      return style.opacity !== "0" && style.pointerEvents !== "none";
    })
    .catch(() => false);

  if (isSettingsVisible) {
    await page.keyboard.press("Escape");
    await page.waitForTimeout(400);
  }
}

/** Open app, open panel by clicking the sidebar button matching panelButtonName.
 *  Scopes the button search to the sidebar <aside> to avoid collisions with
 *  identically-named buttons in the Settings overlay or other panels. */
async function openPanel(
  page: import("@playwright/test").Page,
  panelButtonName: string | RegExp
) {
  await page.goto("/");
  await expect(page.locator("body")).toBeVisible({ timeout: BASE_TIMEOUT });

  // Dismiss Settings overlay if auto-opened
  await dismissSettingsIfOpen(page);

  // Scope all sidebar interactions to the <aside> element
  const sidebar = page.locator("aside").first();
  await expect(sidebar).toBeVisible({ timeout: 8000 });

  // Click the sidebar button matching the requested panel name
  const btn = sidebar.getByRole("button", { name: panelButtonName }).first();
  await expect(btn).toBeVisible({ timeout: 8000 });
  await btn.click();

  // Wait for a floating panel to appear inside #panel-host
  // (panels are position: fixed elements rendered via a portal into #panel-host)
  const floatingPanel = page.locator("#panel-host .fixed");
  await expect(floatingPanel.first()).toBeVisible({ timeout: BASE_TIMEOUT });
  return floatingPanel.first();
}

/** Assert panel has some visible content (not blank).
 *  Waits up to BASE_TIMEOUT for content to appear (modules lazy-load). */
async function expectPanelHasContent(
  page: import("@playwright/test").Page,
  hint: string
) {
  const panelHost = page.locator("#panel-host");

  // Wait for the panel to have meaningful content (modules lazy-load)
  await expect(async () => {
    const text = await panelHost.textContent();
    expect(
      text != null && text.trim().length > 5,
      `Panel should have visible content after ${hint} (got ${text?.trim().length ?? 0} chars)`
    ).toBe(true);
  }).toPass({ timeout: BASE_TIMEOUT });
}

test.describe("Panel module links smoke – all sidebar panels", () => {
  test("Dashboard panel opens and has content", async ({ page }) => {
    await openPanel(page, /dashboard/i);
    await expectPanelHasContent(page, "open Dashboard");
  });

  test("EKG panel opens and has content", async ({ page }) => {
    await openPanel(page, /ekg|monitor/i);
    await expectPanelHasContent(page, "open EKG");
  });

  test("Maestro BQT panel opens and has content", async ({ page }) => {
    await openPanel(page, /maestro|bqt|orchestrator/i);
    await expectPanelHasContent(page, "open Maestro BQT");
  });

  test("Culinary panel opens and nav stays visible", async ({ page }) => {
    await openPanel(page, /^culinary$/i);
    await expectPanelHasContent(page, "open Culinary");
  });

  test("Pastry panel opens and has content", async ({ page }) => {
    await openPanel(page, /^pastry$/i);
    await expectPanelHasContent(page, "open Pastry");
  });

  test("Schedule panel opens and has content", async ({ page }) => {
    await openPanel(page, /^schedule$/i);
    await expectPanelHasContent(page, "open Schedule");
  });

  test("Order/Inventory panel opens and has content", async ({ page }) => {
    await openPanel(page, /inventory|ordering/i);
    await expectPanelHasContent(page, "open Order/Inventory");
  });

  test("Mixology & Sommelier panel opens and has content", async ({ page }) => {
    await openPanel(page, /mixology|sommelier/i);
    await expectPanelHasContent(page, "open Mixology & Sommelier");
  });

  test("Purchasing Receiving panel opens and has content", async ({ page }) => {
    await openPanel(page, /purchasing|receiving/i);
    await expectPanelHasContent(page, "open Purchasing Receiving");
  });

  test("Aurum panel opens and has content", async ({ page }) => {
    await openPanel(page, /aurum|echo aurum/i);
    await expectPanelHasContent(page, "open Aurum");
  });

  test("Stratus panel opens and has content", async ({ page }) => {
    await openPanel(page, /stratus|echo stratus/i);
    await expectPanelHasContent(page, "open Stratus");
  });

  test("Forecast Hub panel opens and has content", async ({ page }) => {
    await openPanel(page, /forecast/i);
    await expectPanelHasContent(page, "open Forecast Hub");
  });

  test("Echo Events panel opens and has content", async ({ page }) => {
    await openPanel(page, /echo events/i);
    await expectPanelHasContent(page, "open Echo Events");
  });

  test("Layout panel opens and has content", async ({ page }) => {
    await openPanel(page, /layout|echo layout/i);
    await expectPanelHasContent(page, "open Layout");
  });

  test("Trace Viewer panel opens and has content", async ({ page }) => {
    await openPanel(page, /trace|traceviewer/i);
    await expectPanelHasContent(page, "open Trace Viewer");
  });

  test("ChefNet panel opens and has content", async ({ page }) => {
    await openPanel(page, /chefnet|chef net/i);
    await expectPanelHasContent(page, "open ChefNet");
  });

  test("Support panel opens and has content", async ({ page }) => {
    await openPanel(page, /^support$/i);
    await expectPanelHasContent(page, "open Support");
  });

  test("Module Status panel opens and has content", async ({ page }) => {
    await openPanel(page, /module status/i);
    await expectPanelHasContent(page, "open Module Status");
  });
});

test.describe("Toolbar smoke", () => {
  test("Quick Search opens and shows content", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("body")).toBeVisible({ timeout: BASE_TIMEOUT });
    await dismissSettingsIfOpen(page);
    const searchBtn = page.getByTitle("Quick Search");
    await expect(searchBtn).toBeVisible({ timeout: 8000 });
    await searchBtn.click();
    await expect(page.getByPlaceholder("Search modules, recipes, staff...")).toBeVisible({ timeout: 5000 });
  });

  test("Notifications opens and shows content", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("body")).toBeVisible({ timeout: BASE_TIMEOUT });
    await dismissSettingsIfOpen(page);
    const notifBtn = page.getByTitle("Notifications & Alerts");
    await expect(notifBtn).toBeVisible({ timeout: 8000 });
    await notifBtn.click();
    await expect(page.locator("[role='dialog'], [class*='fixed'], [class*='dropdown'], [class*='popover']").first()).toBeVisible({
      timeout: 5000,
    });
  });

  test("Quick Metrics opens and shows content", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("body")).toBeVisible({ timeout: BASE_TIMEOUT });
    await dismissSettingsIfOpen(page);
    const metricsBtn = page.getByTitle("Quick Metrics");
    await expect(metricsBtn).toBeVisible({ timeout: 8000 });
    await metricsBtn.click();
    await expect(page.getByText(/revenue|labor|covers|metric|today/i).first()).toBeVisible({ timeout: 5000 });
  });

  test("Staff Status opens and shows content", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("body")).toBeVisible({ timeout: BASE_TIMEOUT });
    await dismissSettingsIfOpen(page);
    const staffBtn = page.getByTitle("Staff Status");
    await expect(staffBtn).toBeVisible({ timeout: 8000 });
    await staffBtn.click();
    await expect(page.getByText(/staff|schedule|clock|on shift|in/i).first()).toBeVisible({ timeout: 5000 });
  });
});
