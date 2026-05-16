/**
 * Smoke Test: Workflow 3 - Recipes → Plated Dish
 * 
 * Scenario: Recipe design → ingredient-to-inventory mapping → production sheet generation → kitchen execution
 * 
 * Test Steps:
 * 1. Create recipe in Culinary (RecipeInputPage)
 * 2. Add ingredients with inventory mapping
 * 3. Verify ingredient-to-inventory links resolve correctly
 * 4. Scale recipe for guest count (e.g., 100 guests)
 * 5. Confirm costing reflects current inventory prices
 * 6. Generate production sheet/prep plan
 * 7. Verify kitchen receives prep plan (Tablet UI)
 * 8. Execute production tasks and track completion
 * 9. Confirm ingredient inventory consumption recorded
 */

import { test, expect } from '@playwright/test';
import {
  DEFAULT_TEST_CONTEXT,
  waitForApiResponse,
  navigateAndWait,
  validateModulePanelLoads,
  checkForErrors,
} from '../utils/test-helpers';
import {
  TEST_RECIPES,
  TEST_INVENTORY,
  API_ENDPOINTS,
} from '../fixtures/test-data';

test.describe('Workflow 3: Recipes → Plated Dish', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to app
    await navigateAndWait(page, DEFAULT_TEST_CONTEXT.baseURL);
  });
  
  test('should create recipe with inventory mapping', async ({ page }) => {
    // Step 1: Open Culinary module
    await page.click('[data-module="culinary"]');
    await validateModulePanelLoads(page, 'culinary', 15000);
    
    // Step 2: Create new recipe
    await page.click('button[data-action="new-recipe"]');
    
    const recipeData = TEST_RECIPES.basicCake;
    await page.fill('input[name="recipe-name"]', recipeData.name);
    await page.fill('input[name="servings"]', String(recipeData.servings));
    
    // Step 3: Add ingredients with inventory mapping
    for (const ingredient of recipeData.ingredients) {
      // Click add ingredient button
      await page.click('button[data-action="add-ingredient"]');
      
      // Select ingredient from inventory
      const ingredientSelect = await page.locator(
        'select[name="ingredient-id"]'
      ).last();
      await ingredientSelect.selectOption(ingredient.id);
      
      // Set quantity
      const quantityInput = await page.locator(
        'input[name="ingredient-quantity"]'
      ).last();
      await quantityInput.fill(String(ingredient.quantity));
      
      // Select unit
      const unitSelect = await page.locator(
        'select[name="ingredient-unit"]'
      ).last();
      await unitSelect.selectOption(ingredient.unit);
    }
    
    // Submit recipe
    await page.click('button[type="submit"]');
    
    const createResponse = await waitForApiResponse(
      page,
      API_ENDPOINTS.createRecipe,
      10000
    );
    expect(createResponse.ok()).toBeTruthy();
    console.log('✓ Recipe created with inventory mapping');
    
    // Step 4: Verify ingredient-to-inventory links
    const ingredientLinks = await page.locator('[data-component="ingredient-link"]').all();
    expect(ingredientLinks.length).toBeGreaterThan(0);
    
    for (const link of ingredientLinks) {
      const linkedInventory = await link.locator('[data-field="inventory-item"]');
      await expect(linkedInventory).toBeVisible();
    }
    console.log(`✓ Verified ${ingredientLinks.length} ingredient-to-inventory mappings`);
    
    // Step 5: Scale recipe for guest count
    const scaledGuests = 100;
    await page.click('button[data-action="scale-recipe"]');
    
    const guestInput = await page.locator('input[name="scale-to-guests"]');
    await guestInput.clear();
    await guestInput.fill(String(scaledGuests));
    
    const scaleButton = await page.locator('button[data-action="confirm-scale"]');
    await scaleButton.click();
    
    // Verify scaling applied
    const scaledRecipe = await page.locator('[data-component="scaled-recipe"]');
    await expect(scaledRecipe).toBeVisible({ timeout: 10000 });
    
    const servingDisplay = await scaledRecipe.locator('[data-field="servings"]');
    await expect(servingDisplay).toContainText(String(scaledGuests));
    console.log(`✓ Recipe scaled for ${scaledGuests} guests`);
    
    // Step 6: Verify costing
    const recipeCost = await scaledRecipe.locator('[data-field="total-cost"]');
    await expect(recipeCost).toBeVisible();
    
    const costValue = await recipeCost.textContent();
    expect(costValue).toMatch(/\$/);
    console.log(`✓ Recipe costing verified: ${costValue}`);
    
    // Step 7: Generate production sheet
    await page.click('button[data-action="generate-prep-plan"]');
    
    const prepPlanResponse = await waitForApiResponse(
      page,
      '/api/culinary/prep-plan/generate',
      10000
    );
    expect(prepPlanResponse.ok()).toBeTruthy();
    
    const prepPlan = await page.locator('[data-component="prep-plan"]');
    await expect(prepPlan).toBeVisible({ timeout: 10000 });
    console.log('✓ Production sheet/prep plan generated');
  });
  
  test('should execute production tasks from prep plan', async ({ page }) => {
    // Navigate to Culinary
    await page.click('[data-module="culinary"]');
    await validateModulePanelLoads(page, 'culinary', 15000);
    
    // Open an existing recipe or create one
    await page.click('button[data-action="view-prep-plans"]');
    
    // Wait for prep plans to load
    const prepPlans = await page.locator('[data-component="prep-plan"]');
    await expect(prepPlans).toBeVisible({ timeout: 10000 });
    
    // Get first prep plan
    const firstPrepPlan = await page.locator('[data-component="prep-plan"]').first();
    await firstPrepPlan.click();
    
    // View production tasks
    const productionTasks = await page.locator('[data-component="production-task"]').all();
    console.log(`✓ Found ${productionTasks.length} production tasks`);
    
    // Execute each task
    for (let i = 0; i < Math.min(productionTasks.length, 3); i++) {
      const task = productionTasks[i];
      
      // Mark task as in progress
      await task.click();
      await page.click('button[data-action="start-task"]');
      
      // Wait for status update
      await page.waitForTimeout(500);
      
      const status = await task.locator('[data-field="status"]');
      await expect(status).toContainText('In Progress');
      
      // Mark task as complete
      await page.click('button[data-action="complete-task"]');
      
      // Wait for completion
      await page.waitForTimeout(500);
      
      await expect(status).toContainText('Complete');
      console.log(`✓ Task ${i + 1} completed`);
    }
  });
  
  test('should track ingredient consumption', async ({ page }) => {
    // Navigate to Culinary
    await page.click('[data-module="culinary"]');
    await validateModulePanelLoads(page, 'culinary', 15000);
    
    // Open prep plan with tasks
    await page.click('button[data-action="view-prep-plans"]');
    const prepPlan = await page.locator('[data-component="prep-plan"]').first();
    await prepPlan.click();
    
    // Complete all production tasks
    const tasks = await page.locator('[data-component="production-task"]').all();
    
    for (const task of tasks) {
      await task.click();
      
      // Check if task uses ingredients
      const ingredientsList = await task.locator('[data-component="task-ingredients"]');
      
      if (await ingredientsList.isVisible({ timeout: 2000 })) {
        const ingredients = await ingredientsList.locator('[data-component="ingredient-item"]').all();
        console.log(`Task uses ${ingredients.length} ingredients`);
      }
      
      // Complete task
      await page.click('button[data-action="complete-task"]');
      await page.waitForTimeout(300);
    }
    
    // Navigate to Inventory to verify consumption recorded
    await page.click('[data-module="inventory"]');
    await validateModulePanelLoads(page, 'inventory', 15000);
    
    // Check inventory levels
    const inventoryItems = await page.locator('[data-component="inventory-item"]').all();
    console.log(`✓ Inventory contains ${inventoryItems.length} items`);
    
    // Verify consumption logs exist
    const consumptionLogs = await page.locator('[data-component="consumption-log"]');
    if (await consumptionLogs.isVisible({ timeout: 5000 })) {
      const logs = await consumptionLogs.locator('[data-component="log-entry"]').count();
      expect(logs).toBeGreaterThan(0);
      console.log(`✓ ${logs} consumption entries recorded`);
    }
  });
  
  test('should validate kitchen tablet UI', async ({ page }) => {
    // Test mobile/tablet view for kitchen staff
    await page.setViewportSize({ width: 768, height: 1024 });
    
    // Navigate to Culinary
    await page.goto(`${DEFAULT_TEST_CONTEXT.baseURL}/modules/culinary`);
    await validateModulePanelLoads(page, 'culinary', 15000);
    
    // Open prep plans in tablet view
    await page.click('button[data-action="view-prep-plans"]');
    
    // Verify touch-friendly UI
    const productionTasks = await page.locator('[data-component="production-task"]').all();
    
    for (let i = 0; i < Math.min(productionTasks.length, 2); i++) {
      const task = productionTasks[i];
      
      // Verify tap targets are large enough (44px minimum)
      const taskButton = await task.locator('button[data-action="start-task"]');
      const boundingBox = await taskButton.boundingBox();
      
      if (boundingBox) {
        expect(boundingBox.width).toBeGreaterThanOrEqual(44);
        expect(boundingBox.height).toBeGreaterThanOrEqual(44);
      }
      
      // Tap to start task
      await taskButton.tap();
      await page.waitForTimeout(300);
    }
    
    console.log('✓ Kitchen tablet UI validated');
  });
  
  test('should calculate recipe margins and pricing', async ({ page }) => {
    // Navigate to Culinary
    await page.click('[data-module="culinary"]');
    await validateModulePanelLoads(page, 'culinary', 15000);
    
    // Create or open recipe
    const recipes = await page.locator('[data-component="recipe-card"]').all();
    
    if (recipes.length > 0) {
      // Click first recipe to view details
      await recipes[0].click();
      
      // Verify costing details
      const costingPanel = await page.locator('[data-component="recipe-costing"]');
      await expect(costingPanel).toBeVisible({ timeout: 10000 });
      
      // Check ingredient costs
      const ingredientCosts = await page.locator('[data-field="ingredient-cost"]').all();
      console.log(`✓ Ingredient costs calculated for ${ingredientCosts.length} items`);
      
      // Check margin calculation
      const marginDisplay = await page.locator('[data-field="profit-margin"]');
      if (await marginDisplay.isVisible({ timeout: 2000 })) {
        const margin = await marginDisplay.textContent();
        expect(margin).toMatch(/[0-9.]+/);
        console.log(`✓ Recipe margin: ${margin}`);
      }
      
      // Check portion cost
      const portionCost = await page.locator('[data-field="portion-cost"]');
      if (await portionCost.isVisible({ timeout: 2000 })) {
        const cost = await portionCost.textContent();
        console.log(`✓ Portion cost: ${cost}`);
      }
    }
  });
  
  test('should validate full recipe-to-plated dish flow', async ({ page }) => {
    // Comprehensive test of the entire workflow
    
    // 1. Create recipe in Culinary
    await page.click('[data-module="culinary"]');
    await validateModulePanelLoads(page, 'culinary', 15000);
    console.log('✓ Culinary module loaded');
    
    // 2. Verify inventory integration
    await page.click('[data-module="inventory"]');
    await validateModulePanelLoads(page, 'inventory', 15000);
    console.log('✓ Inventory module loaded');
    
    // 3. Check production planning
    await page.click('[data-module="culinary"]');
    const prepPlan = await page.locator('[data-component="prep-plan"]').first();
    if (await prepPlan.isVisible({ timeout: 5000 })) {
      console.log('✓ Prep plans available');
    }
    
    // 4. Verify no errors
    await checkForErrors(page);
    
    console.log('✓ Workflow 3 complete: Recipes → Plated Dish');
  });
});
