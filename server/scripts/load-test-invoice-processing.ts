/**
 * Load Test: Invoice Processing
 * 
 * Tests invoice processing at scale: 10,000 invoices/day
 */

import { queueInvoiceProcessing } from "../services/invoice-batch-processor";
import { logger } from "../lib/logger";

async function loadTestInvoiceProcessing() {
  logger.info("[LoadTest] Starting invoice processing load test");

  const invoicesPerDay = 10000;
  const itemsPerInvoice = 100;
  const testDuration = 2 * 60 * 60 * 1000; // 2 hours
  const startTime = Date.now();

  let processed = 0;
  let errors = 0;

  // Generate test invoices
  const invoices = Array.from({ length: invoicesPerDay }, (_, i) => ({
    id: `invoice-${i}`,
    organizationId: `org-${i % 10}`, // 10 organizations
    items: Array.from({ length: itemsPerInvoice }, (_, j) => ({
      id: `item-${i}-${j}`,
      invoiceId: `invoice-${i}`,
      description: `Test item ${j}`,
      quantity: Math.floor(Math.random() * 10) + 1,
      unitPrice: Math.random() * 100,
      total: 0,
    })),
  }));

  // Process invoices
  for (const invoice of invoices) {
    if (Date.now() - startTime > testDuration) {
      break;
    }

    try {
      await queueInvoiceProcessing(
        invoice.id,
        invoice.items,
        invoice.organizationId,
        "normal"
      );
      processed++;
    } catch (error) {
      errors++;
      logger.error(`[LoadTest] Error processing invoice ${invoice.id}:`, error);
    }

    // Log progress
    if (processed % 100 === 0) {
      logger.info(`[LoadTest] Processed ${processed} invoices, ${errors} errors`);
    }
  }

  logger.info(`[LoadTest] Completed: ${processed} processed, ${errors} errors`);
}

// Run if executed directly
if (require.main === module) {
  loadTestInvoiceProcessing().catch(console.error);
}
