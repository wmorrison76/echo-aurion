/**
 * E2E smoke: Prospect→Plate and Invoice→Plate flows.
 * - Prospect→Plate: Open Maestro BQT, select/context, open Culinary (with beoId/eventId).
 * - Invoice→Plate: Open Purchasing/Receiving or Inventory, verify flows and panels.
 * Run: pnpm test:smoke:ui (with project including this file) or playwright test e2e/prospect-to-plate-invoice-to-plate.spec.ts
 */
import { test, expect } from "@playwright/test";

test.describe("Prospect to Plate flow", () => {
  test("Maestro BQT opens and shows BEO/ops content", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("body")).toBeVisible();
    const maestro = page.getByRole("button", { name: /maestro|bqt|orchestrator/i }).first();
    await expect(maestro).toBeVisible({ timeout: 15000 });
    await maestro.click();
    const panelHost = page.locator("#panel-host");
    await expect(panelHost).toBeVisible({ timeout: 10000 });
    await expect(
      page.getByText(/BEO|operations|event|production|orchestrat/i).first()
    ).toBeVisible({ timeout: 15000 });
  });

  test("Culinary panel opens from shell (ready for BEO context)", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("body")).toBeVisible();
    const coreOps = page.getByRole("button", { name: /core operations/i }).first();
    await expect(coreOps).toBeVisible({ timeout: 15000 });
    await coreOps.click();
    const culinary = page.getByRole("button", { name: /culinary/i }).first();
    await expect(culinary).toBeVisible({ timeout: 5000 });
    await culinary.click();
    await expect(
      page.getByText(/echo recipe pro|search|gallery|recipe|culinary/i).first()
    ).toBeVisible({ timeout: 15000 });
  });
});

test.describe("Invoice to Plate flow", () => {
  test("Purchasing/Receiving or Ordering panel opens", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("body")).toBeVisible();
    const purchasing = page.getByRole("button", { name: /purchasing|receiving|ordering|inventory/i }).first();
    await expect(purchasing).toBeVisible({ timeout: 15000 });
    await purchasing.click();
    const panelHost = page.locator("#panel-host");
    await expect(panelHost).toBeVisible({ timeout: 10000 });
    await expect(panelHost.locator("[data-panel], [class*='panel'], iframe").first()).toBeVisible({
      timeout: 15000,
    });
  });

  test("Inventory panel opens", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("body")).toBeVisible();
    const inv = page.getByRole("button", { name: /inventory/i }).first();
    await expect(inv).toBeVisible({ timeout: 15000 });
    await inv.click();
    const panelHost = page.locator("#panel-host");
    await expect(panelHost).toBeVisible({ timeout: 10000 });
    await expect(panelHost.locator("[data-panel], [class*='panel'], iframe").first()).toBeVisible({
      timeout: 15000,
    });
  });
});
