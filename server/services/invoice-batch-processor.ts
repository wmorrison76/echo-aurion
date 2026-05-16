/**
 * Invoice Batch Processor
 * 
 * Processes invoices in batches using BullMQ queue system.
 * Target: <2s for 100 items, 10,000 invoices/day
 */

import { logger } from "../lib/logger";
import { createQueue, createWorker } from "../lib/bullmq-config";
import { getTransactionManager } from "../lib/transaction-manager";
import { getSupabaseServiceClient } from "../lib/supabase-service-client";
import { processParallel } from "../lib/parallel-processor";

export interface InvoiceItem {
  id: string;
  invoiceId: string;
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
  category?: string;
  glCode?: string;
}

export interface InvoiceBatchJob {
  batchId: string;
  invoiceId: string;
  items: InvoiceItem[];
  organizationId: string;
  priority: "high" | "normal" | "low";
  metadata?: Record<string, any>;
}

// Create invoice processing queue
const invoiceQueue = createQueue<InvoiceBatchJob>("invoice-processing", {
  defaultJobOptions: {
    attempts: 5,
    backoff: {
      type: "exponential",
      delay: 2000,
    },
  },
});

/**
 * Add invoice to processing queue
 */
export async function queueInvoiceProcessing(
  invoiceId: string,
  items: InvoiceItem[],
  organizationId: string,
  priority: "high" | "normal" | "low" = "normal"
): Promise<string> {
  const batchId = `batch-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  const job = await invoiceQueue.add(
    `invoice-${invoiceId}`,
    {
      batchId,
      invoiceId,
      items,
      organizationId,
      priority,
    },
    {
      priority: priority === "high" ? 1 : priority === "normal" ? 5 : 10,
      jobId: batchId,
    }
  );

  logger.info(`[InvoiceBatchProcessor] Queued invoice ${invoiceId} (batch: ${batchId}, priority: ${priority})`);
  return batchId;
}

/**
 * Process invoice batch
 */
async function processInvoiceBatch(job: { data: InvoiceBatchJob }): Promise<any> {
  const { batchId, invoiceId, items, organizationId } = job.data;
  const startTime = Date.now();

  logger.info(`[InvoiceBatchProcessor] Processing batch ${batchId} (${items.length} items)`);

  try {
    // Process items in parallel (10 concurrent, batch inserts of 1000)
    const results = await processParallel(
      items,
      (item) => processInvoiceItem(item, organizationId),
      {
        concurrency: 10,
        batchSize: 1000,
        onProgress: (completed, total) => {
          logger.debug(`[InvoiceBatchProcessor] Batch ${batchId}: ${completed}/${total} items processed`);
        },
      }
    );

    // Batch insert all items in single transaction for performance
    if (results.length > 0) {
      const transactionManager = getTransactionManager();
      await transactionManager.executeBatch(
        results.map((item, index) => ({
          table: "invoice_items",
          operation: "upsert",
          data: {
            id: items[index].id,
            invoice_id: invoiceId,
            organization_id: organizationId,
            description: items[index].description,
            quantity: items[index].quantity,
            unit_price: items[index].unitPrice,
            total: items[index].total,
            category: items[index].category,
            gl_code: items[index].glCode,
            processed_at: new Date().toISOString(),
          },
        }))
      );
    }

    const duration = Date.now() - startTime;
    logger.info(`[InvoiceBatchProcessor] Batch ${batchId} completed in ${duration}ms`);

    return {
      batchId,
      invoiceId,
      itemsProcessed: items.length,
      duration,
      success: true,
    };
  } catch (error) {
    logger.error(`[InvoiceBatchProcessor] Batch ${batchId} failed:`, error);
    throw error;
  }
}

/**
 * Process single invoice item
 */
async function processInvoiceItem(
  item: InvoiceItem,
  organizationId: string
): Promise<void> {
  const supabase = getSupabaseServiceClient();
  const transactionManager = getTransactionManager();

  // Process item (classification, GL mapping, inventory update, etc.)
  await transactionManager.executeBatch([
    {
      table: "invoice_items",
      operation: "upsert",
      data: {
        id: item.id,
        invoice_id: item.invoiceId,
        organization_id: organizationId,
        description: item.description,
        quantity: item.quantity,
        unit_price: item.unitPrice,
        total: item.total,
        category: item.category,
        gl_code: item.glCode,
        processed_at: new Date().toISOString(),
      },
    },
  ]);
}

/**
 * Initialize invoice batch worker
 */
export function initializeInvoiceBatchWorker(): void {
  const worker = createWorker<InvoiceBatchJob>(
    "invoice-processing",
    processInvoiceBatch,
    {
      concurrency: 5, // Process 5 batches concurrently
    }
  );

  logger.info("[InvoiceBatchProcessor] Worker initialized");
}

/**
 * Get queue statistics
 */
export async function getQueueStats() {
  const waiting = await invoiceQueue.getWaitingCount();
  const active = await invoiceQueue.getActiveCount();
  const completed = await invoiceQueue.getCompletedCount();
  const failed = await invoiceQueue.getFailedCount();
  const delayed = await invoiceQueue.getDelayedCount();

  return {
    waiting,
    active,
    completed,
    failed,
    delayed,
    total: waiting + active + completed + failed + delayed,
  };
}

/**
 * Get job status
 */
export async function getJobStatus(batchId: string) {
  const job = await invoiceQueue.getJob(batchId);
  
  if (!job) {
    return null;
  }

  const state = await job.getState();
  const progress = job.progress;

  return {
    batchId,
    state,
    progress,
    data: job.data,
    createdAt: new Date(job.timestamp),
    processedAt: job.processedOn ? new Date(job.processedOn) : null,
    finishedAt: job.finishedOn ? new Date(job.finishedOn) : null,
  };
}
