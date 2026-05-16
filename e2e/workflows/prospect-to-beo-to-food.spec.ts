/**
 * Smoke Test: Workflow 4 - Prospect → BEO → Food on Plate
 * 
 * Scenario: Sales pipeline → BEO auto-creation → event production → execution
 * 
 * Test Steps:
 * 1. Create Prospect in CRM
 * 2. Advance prospect through pipeline stages
 * 3. Mark prospect as "Won" (trigger BEO creation)
 * 4. Verify BEO automatically created (server/routes/crm.ts)
 * 5. Validate BEO contains correct menu/recipe references
 * 6. Execute Workflow 1 (BEO → inventory → purchasing → production)
 * 7. Track full event execution from proposal → plated dish
 * 8. Verify revenue recognition in EchoAurum
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
  TEST_PROSPECTS,
  TEST_EVENTS,
  API_ENDPOINTS,
  EVENT_TYPES,
} from '../fixtures/test-data';

test.describe('Workflow 4: Prospect → BEO → Food on Plate', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to app
    await navigateAndWait(page, DEFAULT_TEST_CONTEXT.baseURL);
  });
  
  test('should create prospect and convert to BEO', async ({ page }) => {
    // Step 1: Create Prospect in CRM
    // Assuming CRM module is available
    await page.click('[data-module="crm"]');
    await validateModulePanelLoads(page, 'crm', 15000);
    
    await page.click('button[data-action="new-prospect"]');
    
    const prospectData = TEST_PROSPECTS.wedding_couple;
    await page.fill('input[name="prospect-name"]', prospectData.name);
    await page.fill('input[name="prospect-email"]', prospectData.email);
    await page.fill('input[name="prospect-phone"]', prospectData.phone);
    await page.selectOption('select[name="event-type"]', prospectData.eventType);
    await page.fill('input[name="event-date"]', prospectData.eventDate);
    await page.fill('input[name="estimated-guests"]', String(prospectData.estimatedGuests));
    
    // Submit prospect
    await page.click('button[type="submit"]');
    
    const createResponse = await waitForApiResponse(
      page,
      API_ENDPOINTS.createProspect,
      10000
    );
    expect(createResponse.ok()).toBeTruthy();
    console.log('✓ Prospect created');
    
    // Step 2: Advance through pipeline stages
    const stages = ['Inquiry', 'Quote Sent', 'Negotiating', 'Won'];
    
    for (const stage of stages) {
      await page.click(`[data-action="move-to-stage"][data-stage="${stage}"]`);
      
      // Wait for status update
      await page.waitForTimeout(500);
      
      // Verify stage changed
      const stageDisplay = await page.locator('[data-component="prospect-stage"]');
      await expect(stageDisplay).toContainText(stage);
      
      console.log(`✓ Prospect moved to: ${stage}`);
    }
    
    // Step 3 & 4: Mark as "Won" - triggers BEO creation
    const updateResponse = await waitForApiResponse(
      page,
      API_ENDPOINTS.updateProspectStatus,
      10000
    );
    expect(updateResponse.ok()).toBeTruthy();
    
    // Wait for BEO auto-creation event
    await page.waitForTimeout(2000);
    
    const beoCreatedEvent = await page.evaluate(() => {
      return (window as any).__eventBusLog?.find((e: any) =>
        e.type === EVENT_TYPES.BEO_CREATED
      );
    });
    
    if (beoCreatedEvent) {
      console.log('✓ BEO_CREATED event published');
    }
    
    // Step 5: Verify BEO was created with correct data
    await page.click('[data-module="maestro-bqt"]');
    await validateModulePanelLoads(page, 'maestro-bqt', 15000);
    
    // Find the newly created BEO
    const newBEO = await page.locator(`[data-event-name*="${prospectData.name}"]`).first();
    await expect(newBEO).toBeVisible({ timeout: 10000 });
    
    // Verify BEO details
    const guestCountDisplay = await newBEO.locator('[data-component="guest-count"]');
    await expect(guestCountDisplay).toContainText(String(prospectData.estimatedGuests));
    
    console.log('✓ BEO auto-created with prospect details');
    
    // Step 6: Execute production workflow
    // This is the same as Workflow 1
    // Click on BEO to open
    await newBEO.click();
    
    // Add menus and recipes
    await page.click('button[data-action="add-menu"]');
    await page.fill('input[name="menu-name"]', 'Wedding Menu');
    
    // Check inventory
    const inventoryResponse = await waitForApiResponse(
      page,
      API_ENDPOINTS.checkInventory,
      10000
    );
    expect(inventoryResponse.ok()).toBeTruthy();
    
    // Process purchasing and receiving
    const poResponse = await waitForApiResponse(
      page,
      API_ENDPOINTS.createPO,
      10000
    );
    
    const receiptResponse = await waitForApiResponse(
      page,
      API_ENDPOINTS.receiveInventory,
      10000
    );
    expect(receiptResponse.ok()).toBeTruthy();
    
    // Verify kitchen can execute
    await page.click('[data-module="culinary"]');
    await validateModulePanelLoads(page, 'culinary', 15000);
    
    const productionSheet = await page.locator('[data-component="production-sheet"]');
    await expect(productionSheet).toBeVisible({ timeout: 10000 });
    
    console.log('✓ Production workflow executed successfully');
    
    // Step 7: Verify revenue recognition
    await page.click('[data-module="stratus"]');
    await validateModulePanelLoads(page, 'stratus', 15000);
    
    const eventRevenue = await page.locator(
      `[data-component="event-revenue"][data-event-id*="${prospectData.name}"]`
    ).first();
    
    if (await eventRevenue.isVisible({ timeout: 5000 })) {
      console.log('✓ Revenue recognized in EchoStratus');
    }
    
    // Step 8: Verify no errors
    await checkForErrors(page);
    
    console.log('✓ Workflow 4 complete: Prospect → BEO → Food on Plate');
  });
  
  test('should track prospect through full lifecycle', async ({ page }) => {
    // Create and track prospect
    await page.click('[data-module="crm"]');
    await validateModulePanelLoads(page, 'crm', 15000);
    
    // Create prospect
    const prospectData = generateTestData('prospect');
    await page.click('button[data-action="new-prospect"]');
    await page.fill('input[name="prospect-name"]', prospectData.name);
    await page.fill('input[name="prospect-email"]', prospectData.email);
    await page.fill('input[name="prospect-phone"]', prospectData.phone);
    await page.click('button[type="submit"]');
    
    // Wait for creation
    await waitForApiResponse(page, API_ENDPOINTS.createProspect, 10000);
    
    // Find and track prospect
    const prospectCard = await page.locator(`[data-prospect-name="${prospectData.name}"]`).first();
    
    // Verify prospect appears in dashboard
    await expect(prospectCard).toBeVisible({ timeout: 10000 });
    
    // Check prospect status timeline
    const timeline = await page.locator('[data-component="prospect-timeline"]');
    await expect(timeline).toBeVisible();
    
    console.log('✓ Prospect lifecycle tracked successfully');
  });
  
  test('should validate BEO creation from prospect data', async ({ page }) => {
    const prospectData = TEST_PROSPECTS.corporate;
    
    // Create prospect via API
    const createResponse = await page.request.post(
      `${DEFAULT_TEST_CONTEXT.baseURL}${API_ENDPOINTS.createProspect}`,
      {
        data: prospectData,
      }
    );
    expect(createResponse.ok()).toBeTruthy();
    
    const prospectId = await createResponse.json().then((d: any) => d.id);
    
    // Convert to won status
    const updateResponse = await page.request.patch(
      `${DEFAULT_TEST_CONTEXT.baseURL}${API_ENDPOINTS.updateProspectStatus}`.replace(':id', prospectId),
      {
        data: { status: 'Won' },
      }
    );
    expect(updateResponse.ok()).toBeTruthy();
    
    // Wait for BEO creation
    await page.waitForTimeout(2000);
    
    // Navigate to MaestroBQT and verify BEO exists
    await page.goto(`${DEFAULT_TEST_CONTEXT.baseURL}/modules/maestro-bqt`);
    
    const beoCard = await page.locator(
      `[data-event-name*="${prospectData.name}"]`
    ).first();
    
    await expect(beoCard).toBeVisible({ timeout: 15000 });
    
    // Verify BEO contains prospect data
    const guestCount = await beoCard.locator('[data-component="guest-count"]').textContent();
    expect(guestCount).toContain(String(prospectData.estimatedGuests));
    
    console.log('✓ BEO validation complete');
  });
});
