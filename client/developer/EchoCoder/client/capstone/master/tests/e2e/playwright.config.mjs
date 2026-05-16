// Minimal Playwright config for Echo Capstone
import { defineConfig } from '@playwright/test';
export default defineConfig({
  timeout: 30000,
  use: {
    baseURL: process.env.E2E_BASE_URL || 'http://localhost:8080',
    headless: true,
  },
  reporter: [['list'], ['html', { outputFolder: 'playwright-report' }]],
});
