import { defineConfig, devices } from "@playwright/test";

/**
 * Playwright config for UI E2E smoke tests.
 * Requires dev server on port 8080 (or set BASE_URL).
 * Run: pnpm test:smoke:ui
 */
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: "list",
  use: {
    baseURL: process.env.BASE_URL || "http://localhost:8080",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "off",
  },
  projects: [
    {
      name: "smoke-ui",
      testMatch: /smoke-ui\.spec\.ts/,
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "panel-module-links",
      testMatch: /panel-module-links-smoke\.spec\.ts/,
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "prospect-invoice-plate",
      testMatch: /prospect-to-plate-invoice-to-plate\.spec\.ts/,
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "debug",
      testMatch: /debug-smoke\.spec\.ts/,
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  timeout: 60000,
  expect: { timeout: 15000 },
  webServer: process.env.CI
    ? undefined
    : {
        command: "pnpm run dev",
        url: "http://localhost:8080",
        reuseExistingServer: true,
        timeout: 120000,
      },
});
