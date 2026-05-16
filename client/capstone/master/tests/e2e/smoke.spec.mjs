import { test, expect } from '@playwright/test';

test.describe('Echo Capstone Smoke', () => {
  test('Mixology ABV calculation shows result', async ({ page }) => {
    await page.goto('/');
    // Assume app mounts EchoMixologyPanel somewhere on root route
    await expect(page.getByText(/ABV Calculator/i)).toBeVisible();
  });

  test('Sommelier top results render', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByText(/Echo Sommelier/i)).toBeVisible();
    await expect(page.getByText(/Top Matches/i)).toBeVisible();
  });
});
