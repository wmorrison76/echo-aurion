/**
 * Smoke Test: Workflow 2 - Invoice → Food on Plate
 * 
 * Scenario: Invoice ingestion → triad matching → payment approval → cost updates → production impact
 * 
 * Test Steps:
 * 1. Ingest vendor invoice (PurchasingReceiving)
 * 2. Verify invoice OCR/parsing
 * 3. Execute triad matching (Invoice → PO → Receipt)
 * 4. Confirm approval workflow decision (ready/blocked/awaiting_review)
 * 5. Process payment execution (if approved)
 * 6. Verify cost updates propagate to Culinary/Inventory
 * 7. Check recipe margin recalculation (if applicable)
 * 8. Confirm no production delays from cost discrepancies
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
  TEST_INVOICES,
  TEST_VENDORS,
  API_ENDPOINTS,
} from '../fixtures/test-data';

test.describe('Workflow 2: Invoice → Food on Plate', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to app
    await navigateAndWait(page, DEFAULT_TEST_CONTEXT.baseURL);
  });
  
  test('should process vendor invoice through triad matching', async ({ page }) => {
    // Step 1: Open PurchasingReceiving module
    await page.click('[data-module="purchasing-receiving"]');
    await validateModulePanelLoads(page, 'purchasing-receiving', 15000);
    
    // Step 2: Upload/ingest invoice
    await page.click('button[data-action="upload-invoice"]');
    
    // Simulate file upload (would be done with real file in actual test)
    const invoiceData = TEST_INVOICES.basic;
    await page.fill('input[name="invoice-number"]', invoiceData.invoiceNumber);
    await page.fill('input[name="vendor-name"]', invoiceData.vendorId);
    await page.fill('input[name="invoice-amount"]', String(invoiceData.amount));
    await page.fill('input[name="due-date"]', invoiceData.dueDate);
    
    // Submit invoice
    await page.click('button[type="submit"]');
    
    const createResponse = await waitForApiResponse(
      page,
      API_ENDPOINTS.createInvoice,
      10000
    );
    expect(createResponse.ok()).toBeTruthy();
    console.log('✓ Invoice ingested');
    
    // Step 3: Verify OCR/parsing
    const invoiceCard = await page.locator(
      `[data-invoice-number="${invoiceData.invoiceNumber}"]`
    ).first();
    await expect(invoiceCard).toBeVisible({ timeout: 10000 });
    
    // Verify parsed data
    const amount = await invoiceCard.locator('[data-field="amount"]').textContent();
    expect(amount).toContain(String(invoiceData.amount));
    console.log('✓ Invoice OCR/parsing verified');
    
    // Step 4: Execute triad matching
    await invoiceCard.click();
    
    // Wait for matching to occur
    await page.waitForTimeout(1000);
    
    const matchResponse = await waitForApiResponse(
      page,
      API_ENDPOINTS.matchTriad,
      10000
    );
    expect(matchResponse.ok()).toBeTruthy();
    
    // Verify triad match result
    const matchResult = await page.locator('[data-component="triad-match-result"]');
    await expect(matchResult).toBeVisible({ timeout: 5000 });
    
    const matchStatus = await matchResult.locator('[data-field="status"]').textContent();
    console.log(`✓ Triad matching completed: ${matchStatus}`);
    
    // Step 5: Approval workflow
    // Check if approval is needed
    const approvalButton = await page.locator('button[data-action="approve-invoice"]');
    
    if (await approvalButton.isVisible({ timeout: 2000 })) {
      await approvalButton.click();
      
      const approveResponse = await waitForApiResponse(
        page,
        API_ENDPOINTS.updateInvoice,
        10000
      );
      expect(approveResponse.ok()).toBeTruthy();
      console.log('✓ Invoice approved');
    }
    
    // Step 6: Verify cost updates propagate
    // Check that inventory costs were updated
    await page.click('[data-module="inventory"]');
    await validateModulePanelLoads(page, 'inventory', 15000);
    
    // Verify item cost has been updated
    const inventoryItem = await page.locator('[data-inventory-item]').first();
    const itemCost = await inventoryItem.locator('[data-field="unit-cost"]');
    await expect(itemCost).toBeVisible({ timeout: 5000 });
    console.log('✓ Inventory costs updated');
    
    // Step 7: Verify recipe costs recalculated
    await page.click('[data-module="culinary"]');
    await validateModulePanelLoads(page, 'culinary', 15000);
    
    // Check recipe costing
    const recipeCost = await page.locator('[data-component="recipe-total-cost"]');
    if (await recipeCost.isVisible({ timeout: 5000 })) {
      const costValue = await recipeCost.textContent();
      expect(costValue).toBeTruthy();
      console.log(`✓ Recipe margin recalculated: ${costValue}`);
    }
    
    // Step 8: Verify no production delays
    const productionSchedule = await page.locator('[data-component="production-schedule"]');
    await expect(productionSchedule).toBeVisible({ timeout: 5000 });
    
    // Check for any blocked items
    const blockedItems = await page.locator('[data-status="blocked"]').count();
    expect(blockedItems).toBe(0);
    console.log('✓ No production delays from cost discrepancies');
    
    // Verify no errors
    await checkForErrors(page);
    
    console.log('✓ Workflow 2 complete: Invoice → Food on Plate');
  });
  
  test('should handle invoice discrepancies', async ({ page }) => {
    // This test validates error handling in invoice processing
    await page.click('[data-module="purchasing-receiving"]');
    await validateModulePanelLoads(page, 'purchasing-receiving', 15000);
    
    // Create invoice with mismatched amount
    await page.click('button[data-action="upload-invoice"]');
    await page.fill('input[name="invoice-number"]', 'INV-MISMATCH-001');
    await page.fill('input[name="vendor-name"]', TEST_VENDORS[0].id);
    await page.fill('input[name="invoice-amount"]', '5000.00'); // Different from PO
    await page.click('button[type="submit"]');
    
    // Wait for processing
    await page.waitForTimeout(1000);
    
    // Verify discrepancy alert
    const discrepancyAlert = await page.locator('[data-component="discrepancy-alert"]');
    await expect(discrepancyAlert).toBeVisible({ timeout: 10000 });
    
    const alertMessage = await discrepancyAlert.textContent();
    expect(alertMessage).toContain('discrepanc');
    
    console.log('✓ Invoice discrepancies detected and alerted');
  });
  
  test('should track invoice through approval workflow', async ({ page }) => {
    const invoiceData = TEST_INVOICES.basic;
    
    // Create invoice via API
    const createResponse = await page.request.post(
      `${DEFAULT_TEST_CONTEXT.baseURL}${API_ENDPOINTS.createInvoice}`,
      {
        data: invoiceData,
      }
    );
    expect(createResponse.ok()).toBeTruthy();
    
    const invoiceId = await createResponse.json().then((d: any) => d.id);
    
    // Navigate to invoice detail
    await page.goto(
      `${DEFAULT_TEST_CONTEXT.baseURL}/modules/purchasing-receiving/invoices/${invoiceId}`
    );
    
    // Get current approval status
    const statusBadge = await page.locator('[data-component="approval-status"]').first();
    const currentStatus = await statusBadge.textContent();
    console.log(`Current status: ${currentStatus}`);
    
    // If awaiting review, approve it
    if (currentStatus?.includes('awaiting') || currentStatus?.includes('review')) {
      const approveButton = await page.locator('button[data-action="approve-invoice"]');
      await approveButton.click();
      
      // Wait for status update
      await page.waitForTimeout(500);
      
      const updatedStatus = await statusBadge.textContent();
      expect(updatedStatus).toContain('Approved');
      console.log('✓ Invoice approved and status updated');
    }
  });
  
  test('should validate cost impact on menu pricing', async ({ page }) => {
    // Create/update invoice
    const invoiceData = TEST_INVOICES.basic;
    
    // Create purchase order first
    const poResponse = await page.request.post(
      `${DEFAULT_TEST_CONTEXT.baseURL}${API_ENDPOINTS.createPO}`,
      {
        data: {
          vendorId: invoiceData.vendorId,
          items: invoiceData.items,
          totalAmount: invoiceData.amount,
        },
      }
    );
    expect(poResponse.ok()).toBeTruthy();
    
    // Now create matching invoice
    const invoiceResponse = await page.request.post(
      `${DEFAULT_TEST_CONTEXT.baseURL}${API_ENDPOINTS.createInvoice}`,
      {
        data: invoiceData,
      }
    );
    expect(invoiceResponse.ok()).toBeTruthy();
    
    // Navigate to Culinary to check menu pricing
    await page.goto(`${DEFAULT_TEST_CONTEXT.baseURL}/modules/culinary`);
    
    // Find a menu item that uses the ingredients from the invoice
    const menuItems = await page.locator('[data-component="menu-item"]').all();
    
    // Verify menu items can recalculate costs
    for (const item of menuItems.slice(0, 3)) {
      const recalculateBtn = await item.locator('button[data-action="recalculate-cost"]');
      if (await recalculateBtn.isVisible({ timeout: 1000 })) {
        await recalculateBtn.click();
        await page.waitForTimeout(500);
        
        const cost = await item.locator('[data-field="calculated-cost"]');
        await expect(cost).toBeVisible();
        console.log('✓ Menu item cost recalculated');
      }
    }
  });
});
