/**
 * Invoice Queue Worker
 * 
 * Background worker for processing invoice batches.
 * Auto-scales based on queue depth.
 */

import { initializeInvoiceBatchWorker, getQueueStats } from "../services/invoice-batch-processor";
import { logger } from "../lib/logger";

let workerInitialized = false;
let monitoringInterval: NodeJS.Timeout | null = null;

/**
 * Start invoice queue worker
 */
export function startInvoiceQueueWorker(): void {
  if (workerInitialized) {
    logger.warn("[InvoiceQueueWorker] Worker already initialized");
    return;
  }

  initializeInvoiceBatchWorker();
  workerInitialized = true;

  // Start monitoring queue depth
  startQueueMonitoring();

  logger.info("[InvoiceQueueWorker] Worker started");
}

/**
 * Monitor queue depth and alert if needed
 */
function startQueueMonitoring(): void {
  monitoringInterval = setInterval(async () => {
    try {
      const stats = await getQueueStats();

      // Alert if queue depth is high
      if (stats.waiting > 1000) {
        logger.error(
          `[InvoiceQueueWorker] ALERT: Queue depth exceeds threshold: ${stats.waiting} items waiting`
        );
      } else if (stats.waiting > 500) {
        logger.warn(
          `[InvoiceQueueWorker] Warning: High queue depth: ${stats.waiting} items waiting`
        );
      }

      // Log stats periodically
      if (stats.waiting > 0 || stats.active > 0) {
        logger.debug(
          `[InvoiceQueueWorker] Queue stats: waiting=${stats.waiting}, active=${stats.active}, completed=${stats.completed}, failed=${stats.failed}`
        );
      }
    } catch (error) {
      logger.error("[InvoiceQueueWorker] Error monitoring queue:", error);
    }
  }, 30000); // Check every 30 seconds
}

/**
 * Stop invoice queue worker
 */
export function stopInvoiceQueueWorker(): void {
  if (monitoringInterval) {
    clearInterval(monitoringInterval);
    monitoringInterval = null;
  }

  workerInitialized = false;
  logger.info("[InvoiceQueueWorker] Worker stopped");
}
