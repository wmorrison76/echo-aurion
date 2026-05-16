/**
 * Parallel Processor
 * 
 * Processes multiple items in parallel with configurable concurrency.
 * Used for invoice processing optimization.
 */

import { logger } from "./logger";

export interface ParallelProcessorOptions {
  concurrency?: number;
  batchSize?: number;
  onProgress?: (completed: number, total: number) => void;
}

/**
 * Process items in parallel with concurrency limit
 */
export async function processParallel<T, R>(
  items: T[],
  processor: (item: T) => Promise<R>,
  options: ParallelProcessorOptions = {}
): Promise<R[]> {
  const {
    concurrency = 10,
    batchSize = 100,
    onProgress,
  } = options;

  const results: R[] = [];
  let completed = 0;

  // Process in batches
  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);
    
    // Process batch with concurrency limit
    const batchResults = await processBatchWithConcurrency(
      batch,
      processor,
      concurrency
    );

    results.push(...batchResults);
    completed += batch.length;

    if (onProgress) {
      onProgress(completed, items.length);
    }
  }

  return results;
}

/**
 * Process batch with concurrency limit
 */
async function processBatchWithConcurrency<T, R>(
  items: T[],
  processor: (item: T) => Promise<R>,
  concurrency: number
): Promise<R[]> {
  const results: R[] = [];
  const executing: Promise<void>[] = [];

  for (const item of items) {
    const promise = processor(item).then(result => {
      results.push(result);
    });

    executing.push(promise);

    if (executing.length >= concurrency) {
      await Promise.race(executing);
      executing.splice(executing.findIndex(p => p === promise), 1);
    }
  }

  // Wait for remaining
  await Promise.all(executing);

  return results;
}

/**
 * Process items with retry on failure
 */
export async function processParallelWithRetry<T, R>(
  items: T[],
  processor: (item: T) => Promise<R>,
  options: ParallelProcessorOptions & { maxRetries?: number } = {}
): Promise<Array<{ item: T; result?: R; error?: Error }>> {
  const { maxRetries = 3, ...parallelOptions } = options;

  const results: Array<{ item: T; result?: R; error?: Error }> = [];

  await processParallel(
    items,
    async (item) => {
      let lastError: Error | null = null;

      for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
          const result = await processor(item);
          results.push({ item, result });
          return result;
        } catch (error: any) {
          lastError = error;
          if (attempt < maxRetries) {
            await new Promise(resolve => setTimeout(resolve, 1000 * (attempt + 1)));
          }
        }
      }

      results.push({ item, error: lastError || new Error("Processing failed") });
      throw lastError;
    },
    parallelOptions
  );

  return results;
}
