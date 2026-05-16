/**
 * UI E2E smoke: shell loads, critical panels open and are stable.
 * Echo Recipe Pro (Culinary) is the preferred look baseline.
 * Uses same patterns as panel-module-links (dismiss settings, scope to aside).
 *
 * Requires dev server on port 8080 (or BASE_URL). Run: pnpm test:smoke:ui
 */
import { test, expect } from "@playwright/test";

const BASE_TIMEOUT = 15000;

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

test.describe("UI smoke – shell and panels", () => {
  test("shell loads and Dashboard panel opens", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("body")).toBeVisible({ timeout: BASE_TIMEOUT });
    await dismissSettingsIfOpen(page);
    const sidebar = page.locator("aside").first();
    await expect(sidebar).toBeVisible({ timeout: 8000 });
    const btn = sidebar.getByRole("button", { name: /dashboard/i }).first();
    await expect(btn).toBeVisible({ timeout: 8000 });
    await btn.click();
    const floatingPanel = page.locator("#panel-host .fixed");
    await expect(floatingPanel.first()).toBeVisible({ timeout: BASE_TIMEOUT });
  });

  test("Culinary (Echo Recipe Pro) panel opens and shows content", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("body")).toBeVisible({ timeout: BASE_TIMEOUT });
    await dismissSettingsIfOpen(page);
    const sidebar = page.locator("aside").first();
    await expect(sidebar).toBeVisible({ timeout: 8000 });
    const culinary = sidebar.getByRole("button", { name: /^culinary$/i }).first();
    await expect(culinary).toBeVisible({ timeout: 8000 });
    await culinary.click();
    await expect(page.locator("#panel-host .fixed").first()).toBeVisible({ timeout: BASE_TIMEOUT });
    await expect(
      page.getByText(/echo recipe pro|search|gallery|recipe/i).first()
    ).toBeVisible({ timeout: BASE_TIMEOUT });
  });

  test("Schedule panel opens", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("body")).toBeVisible({ timeout: BASE_TIMEOUT });
    await dismissSettingsIfOpen(page);
    const sidebar = page.locator("aside").first();
    await expect(sidebar).toBeVisible({ timeout: 8000 });
    const schedule = sidebar.getByRole("button", { name: /^schedule$/i }).first();
    await expect(schedule).toBeVisible({ timeout: 8000 });
    await schedule.click();
    await expect(page.locator("#panel-host .fixed").first()).toBeVisible({ timeout: BASE_TIMEOUT });
  });

  test("Maestro BQT panel opens", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("body")).toBeVisible({ timeout: BASE_TIMEOUT });
    await dismissSettingsIfOpen(page);
    const sidebar = page.locator("aside").first();
    await expect(sidebar).toBeVisible({ timeout: 8000 });
    const maestro = sidebar.getByRole("button", { name: /maestro|bqt|orchestrator/i }).first();
    await expect(maestro).toBeVisible({ timeout: 8000 });
    await maestro.click();
    await expect(page.locator("#panel-host .fixed").first()).toBeVisible({ timeout: BASE_TIMEOUT });
  });
});

test.describe("Echo Recipe Pro visual baseline (Culinary)", () => {
  test("Culinary panel matches look baseline snapshot", async ({ page }) => {
    await page.goto("/");
    await dismissSettingsIfOpen(page);
    const sidebar = page.locator("aside").first();
    await expect(sidebar).toBeVisible({ timeout: 8000 });
    const culinary = sidebar.getByRole("button", { name: /^culinary$/i }).first();
    await expect(culinary).toBeVisible({ timeout: 8000 });
    await culinary.click();
    const floatingPanel = page.locator("#panel-host .fixed").first();
    await expect(floatingPanel).toBeVisible({ timeout: BASE_TIMEOUT });
    await expect(
      page.getByText(/echo recipe pro|search|gallery|recipe/i).first()
    ).toBeVisible({ timeout: BASE_TIMEOUT });
    await expect(floatingPanel).toHaveScreenshot("echo-recipe-pro-culinary-baseline.png", {
      maxDiffPixels: 1000,
    });
  });
});
