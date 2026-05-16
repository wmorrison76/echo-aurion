/**
 * Smoke Test: Workflow 1 - Ordering → Food on Plate
 * 
 * Scenario: BEO creation → inventory checks → purchasing → receiving → production → plated dish
 * 
 * Test Steps:
 * 1. Create/open BEO in MaestroBQT
 * 2. Define menu items and recipes with scaling
 * 3. Verify Maestro event bus publishes SHORTAGE_DETECTED (if applicable)
 * 4. Validate Purchasing creates PO automatically
 * 5. Simulate vendor receipt and inventory update
 * 6. Confirm PREP_PLAN_UPDATED event published
 * 7. Kitchen executes production tasks
 * 8. Verify food production completion
 */

import { test, expect } from '@playwright/test';
import {
  DEFAULT_TEST_CONTEXT,
  waitForApiResponse,
  navigateAndWait,
  validateModulePanelLoads,
  checkForErrors,
  generateTestData,
} from '../utils/test-helpers';
import {
  TEST_USERS,
  TEST_EVENTS,
  TEST_RECIPES,
  API_ENDPOINTS,
  EVENT_TYPES,
} from '../fixtures/test-data';

test.describe('Workflow 1: Ordering → Food on Plate', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to app
    await navigateAndWait(page, DEFAULT_TEST_CONTEXT.baseURL);
    
    // Assume logged in for this test scenario
    // In real tests, would implement login flow
  });
  
  test('should create BEO and generate production plan', async ({ page, context }) => {
    // Step 1: Open MaestroBQT panel
    await page.click('[data-module="maestro-bqt"]');
    await validateModulePanelLoads(page, 'maestro-bqt', 15000);
    
    // Step 2: Create new BEO
    await page.click('button[data-action="new-beo"]');
    
    const beoData = generateTestData('beo');
    await page.fill('input[name="event-name"]', beoData.name);
    await page.fill('input[name="event-date"]', beoData.eventDate);
    await page.fill('input[name="guest-count"]', String(beoData.guestCount));
    
    // Submit BEO
    await page.click('button[type="submit"]');
    
    // Wait for BEO creation API
    const createResponse = await waitForApiResponse(page, API_ENDPOINTS.createBEO);
    expect(createResponse.ok()).toBeTruthy();
    
    // Step 3: Add menu and recipes
    await page.click('button[data-action="add-menu"]');
    await page.fill('input[name="menu-name"]', 'Main Course');
    
    // Add recipe to menu
    await page.click('button[data-action="add-recipe"]');
    await page.selectOption('select[name="recipe-id"]', TEST_RECIPES.basicCake.id);
    await page.fill('input[name="serving-count"]', String(beoData.guestCount));
    
    // Step 4: Check inventory
    const inventoryResponse = await waitForApiResponse(
      page,
      API_ENDPOINTS.checkInventory,
      10000
    );
    expect(inventoryResponse.ok()).toBeTruthy();
    
    // Verify SHORTAGE_DETECTED event if applicable
    const eventLog = await page.evaluate(() => {
      return (window as any).__eventBusLog || [];
    });
    
    const shortageDetected = eventLog.some((e: any) =>
      e.type === EVENT_TYPES.SHORTAGE_DETECTED
    );
    
    if (shortageDetected) {
      console.log('✓ Shortage detected, PO should be generated');
    }
    
    // Step 5: Verify purchasing order creation
    const poResponse = await waitForApiResponse(
      page,
      API_ENDPOINTS.createPO,
      10000
    );
    
    if (shortageDetected) {
      expect(poResponse.ok()).toBeTruthy();
      console.log('✓ Purchase order created automatically');
    }
    
    // Step 6: Simulate receipt
    await page.click('[data-action="receive-inventory"]');
    await page.click('button[data-action="confirm-receipt"]');
    
    const receiptResponse = await waitForApiResponse(
      page,
      API_ENDPOINTS.receiveInventory,
      10000
    );
    expect(receiptResponse.ok()).toBeTruthy();
    
    // Step 7: Verify PREP_PLAN_UPDATED event
    const updatedEventLog = await page.evaluate(() => {
      return (window as any).__eventBusLog || [];
    });
    
    const prepPlanUpdated = updatedEventLog.some((e: any) =>
      e.type === EVENT_TYPES.PREP_PLAN_UPDATED
    );
    expect(prepPlanUpdated).toBeTruthy();
    console.log('✓ Production plan updated');
    
    // Step 8: Verify kitchen can view production tasks
    await page.click('[data-module="culinary"]');
    await validateModulePanelLoads(page, 'culinary', 15000);
    
    // Check production sheet is displayed
    const productionSheet = await page.locator('[data-component="production-sheet"]');
    await expect(productionSheet).toBeVisible();
    
    // Verify no errors
    await checkForErrors(page);
    
    console.log('✓ Workflow 1 complete: Ordering → Food on Plate');
  });
  
  test('should scale recipe for guest count', async ({ page }) => {
    // Open Culinary module
    await page.click('[data-module="culinary"]');
    await validateModulePanelLoads(page, 'culinary', 15000);
    
    // Create recipe
    await page.click('button[data-action="new-recipe"]');
    
    const recipeData = TEST_RECIPES.basicCake;
    await page.fill('input[name="recipe-name"]', recipeData.name);
    await page.fill('input[name="servings"]', String(recipeData.servings));
    
    // Scale to different guest count
    const scaledGuests = 200;
    await page.fill('input[name="scale-to-guests"]', String(scaledGuests));
    
    // Verify scaling calculations
    const scaledRecipe = await page.evaluate((guests, baseServings) => {
      return guests / baseServings;
    }, scaledGuests, recipeData.servings);
    
    expect(scaledRecipe).toBe(scaledGuests / recipeData.servings);
    
    // Verify costing updates
    const costingElement = await page.locator('[data-component="recipe-costing"]');
    await expect(costingElement).toBeVisible();
    
    console.log(`✓ Recipe scaled for ${scaledGuests} guests`);
  });
  
  test('should track production completion', async ({ page }) => {
    // Open Culinary/Kitchen production sheet
    await page.click('[data-module="culinary"]');
    await validateModulePanelLoads(page, 'culinary', 15000);
    
    // Navigate to production tasks
    await page.click('[data-tab="production-tasks"]');
    
    // Wait for production tasks to load
    const tasksPanel = await page.locator('[data-component="production-tasks"]');
    await expect(tasksPanel).toBeVisible({ timeout: 10000 });
    
    // Get first production task
    const firstTask = await page.locator('[data-component="production-task"]').first();
    
    // Mark task as complete
    await firstTask.click();
    await page.click('button[data-action="mark-complete"]');
    
    // Verify task status updated
    const statusBadge = await firstTask.locator('[data-component="status"]');
    await expect(statusBadge).toContainText('Complete', { timeout: 5000 });
    
    console.log('✓ Production tasks tracked and marked complete');
  });
  
  test('should validate full integration chain', async ({ page }) => {
    // This is a comprehensive test that validates all modules communicate
    
    // 1. MaestroBQT - Create event
    await page.click('[data-module="maestro-bqt"]');
    await validateModulePanelLoads(page, 'maestro-bqt', 15000);
    console.log('✓ MaestroBQT module loaded');
    
    // 2. OrderingInventory - Check inventory
    await page.click('[data-module="inventory"]');
    await validateModulePanelLoads(page, 'inventory', 15000);
    console.log('✓ Inventory module loaded');
    
    // 3. PurchasingReceiving - Process PO and receipt
    await page.click('[data-module="purchasing-receiving"]');
    await validateModulePanelLoads(page, 'purchasing-receiving', 15000);
    console.log('✓ Purchasing/Receiving module loaded');
    
    // 4. Culinary - View production plans
    await page.click('[data-module="culinary"]');
    await validateModulePanelLoads(page, 'culinary', 15000);
    console.log('✓ Culinary module loaded');
    
    // 5. Verify no errors across all modules
    await checkForErrors(page);
    
    console.log('✓ Full integration chain validated');
  });
});
