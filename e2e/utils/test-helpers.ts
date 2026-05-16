/**
 * Smoke Test Helper Utilities
 * Common functions for end-to-end testing
 */

import { expect } from '@playwright/test';

export interface TestContext {
  baseURL: string;
  timeout: number;
  auth?: {
    email: string;
    password: string;
  };
}

export const DEFAULT_TEST_CONTEXT: TestContext = {
  baseURL: process.env.TEST_BASE_URL || 'http://localhost:8081',
  timeout: 30000,
  auth: {
    email: process.env.TEST_USER_EMAIL || 'test@example.com',
    password: process.env.TEST_USER_PASSWORD || 'testpass123',
  },
};

/**
 * Wait for API response with validation
 */
export async function waitForApiResponse(
  page: any,
  urlPattern: string | RegExp,
  timeout = 10000
) {
  try {
    const response = await page.waitForResponse(
      (response: any) => {
        if (typeof urlPattern === 'string') {
          return response.url().includes(urlPattern);
        }
        return urlPattern.test(response.url());
      },
      { timeout }
    );
    return response;
  } catch (error) {
    throw new Error(`API response timeout waiting for ${urlPattern}`);
  }
}

/**
 * Navigate to page and wait for load
 */
export async function navigateAndWait(page: any, url: string) {
  await page.goto(url, { waitUntil: 'networkidle' });
}

/**
 * Login helper for auth flow
 */
export async function login(page: any, email: string, password: string) {
  await page.goto(DEFAULT_TEST_CONTEXT.baseURL);
  
  // Assuming login form exists
  await page.fill('input[type="email"]', email);
  await page.fill('input[type="password"]', password);
  await page.click('button[type="submit"]');
  
  // Wait for redirect to dashboard
  await page.waitForURL(/dashboard|home/);
}

/**
 * Validate module panel loads
 */
export async function validateModulePanelLoads(page: any, panelKey: string, timeout = 10000) {
  const panelSelector = `[data-panel="${panelKey}"], [data-module="${panelKey}"]`;
  
  try {
    await page.waitForSelector(panelSelector, { timeout });
    return true;
  } catch (error) {
    throw new Error(`Module panel ${panelKey} failed to load within ${timeout}ms`);
  }
}

/**
 * Check for error states
 */
export async function checkForErrors(page: any) {
  const errorMessages = await page.locator('[role="alert"], [class*="error"]').allTextContents();
  
  if (errorMessages.length > 0) {
    throw new Error(`Errors found on page: ${errorMessages.join(', ')}`);
  }
  
  // Check console for errors
  const consoleLogs = page.context()?.logs || [];
  const errors = consoleLogs.filter((log: any) => log.level === 'error');
  
  if (errors.length > 0) {
    throw new Error(`Console errors found: ${errors.map((e: any) => e.message).join(', ')}`);
  }
  
  return true;
}

/**
 * Test data generator
 */
export function generateTestData(type: string) {
  const timestamp = Date.now();
  
  switch (type) {
    case 'beo':
      return {
        name: `Test BEO ${timestamp}`,
        eventDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        guestCount: 50,
        menu: 'Standard',
      };
    
    case 'invoice':
      return {
        invoiceNumber: `INV-${timestamp}`,
        vendorName: `Vendor ${timestamp}`,
        amount: 1500.00,
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      };
    
    case 'recipe':
      return {
        name: `Test Recipe ${timestamp}`,
        servings: 4,
        cookTime: 30,
        ingredients: ['Flour', 'Sugar', 'Butter'],
      };
    
    case 'prospect':
      return {
        name: `Test Prospect ${timestamp}`,
        email: `prospect${timestamp}@test.com`,
        phone: '555-0123',
        company: 'Test Company',
      };
    
    default:
      return { timestamp };
  }
}

/**
 * Mock API response helper
 */
export async function mockApiResponse(page: any, urlPattern: string, responseData: any) {
  await page.route(urlPattern, (route: any) => {
    route.abort('blockedbyroute');
  });
  
  await page.route(urlPattern, (route: any) => {
    route.continue();
  });
}

export default {
  DEFAULT_TEST_CONTEXT,
  waitForApiResponse,
  navigateAndWait,
  login,
  validateModulePanelLoads,
  checkForErrors,
  generateTestData,
  mockApiResponse,
};
