/**
 * Retry Strategy
 * 
 * Comprehensive retry logic with exponential backoff and jitter.
 * Target: 99.98% success rate after retries
 */

import { logger } from "./logger";

export interface RetryOptions {
  maxRetries?: number;
  initialDelay?: number;
  maxDelay?: number;
  multiplier?: number;
  jitter?: boolean;
  retryableErrors?: string[];
  onRetry?: (attempt: number, error: Error) => void;
}

export class RetryableError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "RetryableError";
  }
}

export class NonRetryableError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "NonRetryableError";
  }
}

/**
 * Execute function with retry logic
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const {
    maxRetries = 3,
    initialDelay = 100,
    maxDelay = 5000,
    multiplier = 2,
    jitter = true,
    retryableErrors = [],
    onRetry,
  } = options;

  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error: any) {
      lastError = error;

      // Don't retry if it's a non-retryable error
      if (error instanceof NonRetryableError) {
        throw error;
      }

      // Don't retry on last attempt
      if (attempt >= maxRetries) {
        break;
      }

      // Check if error is retryable
      if (!isRetryableError(error, retryableErrors)) {
        throw error;
      }

      // Calculate delay with exponential backoff
      const delay = calculateDelay(attempt, initialDelay, maxDelay, multiplier, jitter);

      logger.warn(
        `[Retry] Attempt ${attempt + 1}/${maxRetries} failed, retrying in ${delay}ms:`,
        error.message
      );

      if (onRetry) {
        onRetry(attempt + 1, error);
      }

      // Wait before retry
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  // All retries exhausted
  throw lastError || new Error("Retry exhausted");
}

/**
 * Check if error is retryable
 */
function isRetryableError(error: any, retryableErrors: string[]): boolean {
  // Network errors are always retryable
  if (
    error.code === "ECONNREFUSED" ||
    error.code === "ETIMEDOUT" ||
    error.code === "ENOTFOUND" ||
    error.message?.includes("timeout") ||
    error.message?.includes("network")
  ) {
    return true;
  }

  // Rate limit errors are retryable
  if (error.status === 429 || error.message?.includes("rate limit")) {
    return true;
  }

  // Server errors (5xx) are retryable
  if (error.status >= 500 && error.status < 600) {
    return true;
  }

  // Check custom retryable errors
  if (retryableErrors.length > 0) {
    const errorMessage = error.message?.toLowerCase() || "";
    return retryableErrors.some(retryable => errorMessage.includes(retryable.toLowerCase()));
  }

  // Client errors (4xx) are generally not retryable
  if (error.status >= 400 && error.status < 500) {
    return false;
  }

  // Default: retryable
  return true;
}

/**
 * Calculate retry delay with exponential backoff and jitter
 */
function calculateDelay(
  attempt: number,
  initialDelay: number,
  maxDelay: number,
  multiplier: number,
  jitter: boolean
): number {
  // Exponential backoff: initialDelay * (multiplier ^ attempt)
  let delay = initialDelay * Math.pow(multiplier, attempt);

  // Cap at max delay
  delay = Math.min(delay, maxDelay);

  // Add jitter to prevent thundering herd
  if (jitter) {
    const jitterAmount = delay * 0.1; // 10% jitter
    delay = delay + (Math.random() * 2 - 1) * jitterAmount;
  }

  return Math.floor(delay);
}

/**
 * Retry strategies by error type
 */
export const RETRY_STRATEGIES = {
  network: {
    maxRetries: 3,
    initialDelay: 100,
    multiplier: 2,
    jitter: true,
    retryableErrors: ["ECONNREFUSED", "ETIMEDOUT", "ENOTFOUND"],
  },
  timeout: {
    maxRetries: 2,
    initialDelay: 500,
    multiplier: 2,
    jitter: true,
    retryableErrors: ["timeout"],
  },
  rateLimit: {
    maxRetries: 1,
    initialDelay: 1000,
    multiplier: 1,
    jitter: false,
    retryableErrors: ["rate limit", "429"],
    onRetry: async (attempt: number, error: any) => {
      // Wait for Retry-After header if available
      const retryAfter = error.headers?.["retry-after"];
      if (retryAfter) {
        const delay = parseInt(retryAfter) * 1000;
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    },
  },
  validation: {
    maxRetries: 0, // Don't retry validation errors
    initialDelay: 0,
    multiplier: 1,
    jitter: false,
    retryableErrors: [],
  },
};
