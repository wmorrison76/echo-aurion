/**
 * BullMQ Configuration
 * 
 * Configures BullMQ queue system with Redis backend for batch processing.
 * Target: Process 10,000 invoices/day, <2s per 100 items
 */

import { Queue, Worker, QueueOptions, WorkerOptions } from "bullmq";
import { logger } from "./logger";

export interface BullMQConfig {
  connection: {
    host: string;
    port: number;
    password?: string;
  };
  defaultJobOptions: {
    attempts: number;
    backoff: {
      type: "exponential";
      delay: number;
    };
    removeOnComplete: boolean;
    removeOnFail: boolean;
  };
}

let bullMQConfig: BullMQConfig | null = null;
const SAFE_MODE = process.env.SAFE_MODE === "true";
const ENABLE_BULLMQ = process.env.ENABLE_BULLMQ === "true";

/**
 * Initialize BullMQ configuration
 */
export function initializeBullMQConfig(): BullMQConfig | null {
  if (bullMQConfig) {
    return bullMQConfig;
  }

  if (SAFE_MODE || !ENABLE_BULLMQ) {
    logger.info("[BullMQ] BullMQ disabled by default");
    return null;
  }

  const redisUrl = process.env.REDIS_URL;
  if (!redisUrl) {
    logger.info("[BullMQ] REDIS_URL not configured, BullMQ disabled");
    return null;
  }

  const url = new URL(redisUrl);

  bullMQConfig = {
    connection: {
      host: url.hostname,
      port: parseInt(url.port) || 6379,
      password: url.password || undefined,
    },
    defaultJobOptions: {
      attempts: 5,
      backoff: {
        type: "exponential",
        delay: 2000, // 2s initial delay
      },
      removeOnComplete: {
        age: 24 * 3600, // Keep completed jobs for 24 hours
        count: 1000, // Keep last 1000 completed jobs
      },
      removeOnFail: {
        age: 7 * 24 * 3600, // Keep failed jobs for 7 days
      },
    },
  };

  logger.info("[BullMQ] Configuration initialized");
  return bullMQConfig;
}

/**
 * Get BullMQ connection configuration
 */
export function getBullMQConnection() {
  const config = initializeBullMQConfig();
  return config?.connection ?? null;
}

/**
 * Get default job options
 */
export function getDefaultJobOptions() {
  const config = initializeBullMQConfig();
  return config?.defaultJobOptions ?? null;
}

/**
 * Create a BullMQ queue
 */
export function createQueue<T = any>(
  name: string,
  options?: Partial<QueueOptions>
): Queue<T> | null {
  const connection = getBullMQConnection();
  const defaultJobOptions = getDefaultJobOptions();

  if (!connection || !defaultJobOptions) {
    logger.warn(`[BullMQ] Queue ${name} disabled - Redis unavailable`);
    return null;
  }

  return new Queue<T>(name, {
    connection,
    defaultJobOptions,
    ...options,
  });
}

/**
 * Create a BullMQ worker
 */
export function createWorker<T = any>(
  name: string,
  processor: (job: { data: T }) => Promise<any>,
  options?: Partial<WorkerOptions>
): Worker<T> | null {
  try {
    const connection = getBullMQConnection();
    const defaultJobOptions = getDefaultJobOptions();

    if (!connection || !defaultJobOptions) {
      logger.warn(`[BullMQ] Worker ${name} disabled - Redis unavailable`);
      return null;
    }

    const worker = new Worker<T>(
      name,
      async (job) => {
        logger.debug(`[BullMQ] Processing job ${job.id} from queue ${name}`);
        const result = await processor(job);
        logger.debug(`[BullMQ] Completed job ${job.id}`);
        return result;
      },
      {
        connection,
        concurrency: options?.concurrency || 10,
        // Reduce error logging during dev - BullMQ spams connection errors when Redis is unavailable
        maxStalledCount: process.env.NODE_ENV === "development" ? 1 : 3,
        ...options,
      }
    );

    worker.on("completed", (job) => {
      logger.info(`[BullMQ] Job ${job.id} completed`);
    });

    worker.on("failed", (job, err) => {
      // Suppress connection errors in development
      if (process.env.NODE_ENV !== "development" || !err.message?.includes("ECONNREFUSED")) {
        logger.error(`[BullMQ] Job ${job?.id} failed:`, err);
      }
    });

    worker.on("error", (err) => {
      // Suppress connection errors in development - they're expected when Redis is unavailable
      if (process.env.NODE_ENV !== "development" || !err.message?.includes("ECONNREFUSED")) {
        logger.error(`[BullMQ] Worker error:`, err);
      }
    });

    return worker;
  } catch (err) {
    // If worker creation fails (e.g., Redis unavailable), log and return null
    logger.warn(`[BullMQ] Failed to create worker: ${err instanceof Error ? err.message : String(err)}`);
    return null;
  }
}
