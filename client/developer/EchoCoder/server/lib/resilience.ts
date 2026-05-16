import { getLogger } from "./logger";

export type BackoffStrategy = "exponential" | "linear" | "constant";

/**
 * Exponential backoff with jitter
 * Prevents thundering herd when service recovers
 */
function calculateBackoff(
  attempt: number,
  baseDelayMs: number,
  strategy: BackoffStrategy = "exponential",
): number {
  let delay: number;

  switch (strategy) {
    case "exponential":
      delay = baseDelayMs * Math.pow(2, attempt);
      break;
    case "linear":
      delay = baseDelayMs * (attempt + 1);
      break;
    case "constant":
      delay = baseDelayMs;
      break;
  }

  // Add jitter (±10%)
  const jitter = delay * 0.1 * (Math.random() - 0.5);
  const finalDelay = Math.max(100, Math.min(delay + jitter, 30000)); // Cap at 30s

  return finalDelay;
}

/**
 * Retry a function with exponential backoff
 * PHASE 2.2: Automatic retry for transient failures
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxAttempts: number = 3,
  baseDelayMs: number = 100,
  shouldRetry?: (error: Error, attempt: number) => boolean,
): Promise<T> {
  const logger = getLogger();
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;

      // Don't retry certain errors (validation, auth, etc)
      if (shouldRetry && !shouldRetry(lastError, attempt)) {
        throw error;
      }

      if (attempt < maxAttempts - 1) {
        const delay = calculateBackoff(attempt, baseDelayMs);
        logger.debug(
          `Retry attempt ${attempt + 1}/${maxAttempts} after ${delay}ms`,
          {
            error: lastError.message,
          },
        );

        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }

  logger.error(`Failed after ${maxAttempts} attempts`, undefined, lastError!);
  throw lastError;
}

/**
 * Circuit Breaker pattern
 * PHASE 2.3: Prevents cascading failures
 *
 * States:
 * - CLOSED: Normal operation, requests pass through
 * - OPEN: Service failing, requests fail fast
 * - HALF_OPEN: Testing if service recovered
 */
export class CircuitBreaker<T> {
  private state: "CLOSED" | "OPEN" | "HALF_OPEN" = "CLOSED";
  private failureCount = 0;
  private successCount = 0;
  private lastFailureTime = 0;
  private readonly failureThreshold: number;
  private readonly successThreshold: number;
  private readonly resetTimeoutMs: number;
  private readonly name: string;

  constructor(
    private fn: () => Promise<T>,
    options: {
      name: string;
      failureThreshold?: number;
      successThreshold?: number;
      resetTimeoutMs?: number;
    },
  ) {
    this.name = options.name;
    this.failureThreshold = options.failureThreshold || 5;
    this.successThreshold = options.successThreshold || 2;
    this.resetTimeoutMs = options.resetTimeoutMs || 30000;
  }

  async execute(): Promise<T> {
    const logger = getLogger();

    // Check if circuit should transition to HALF_OPEN
    if (this.state === "OPEN") {
      const timeSinceLastFailure = Date.now() - this.lastFailureTime;
      if (timeSinceLastFailure > this.resetTimeoutMs) {
        logger.info(`[CircuitBreaker] ${this.name} transitioning to HALF_OPEN`);
        this.state = "HALF_OPEN";
        this.successCount = 0;
      } else {
        throw new Error(`[CircuitBreaker] ${this.name} is OPEN - failing fast`);
      }
    }

    try {
      const result = await this.fn();

      // Success - update state
      if (this.state === "HALF_OPEN") {
        this.successCount++;
        if (this.successCount >= this.successThreshold) {
          logger.info(
            `[CircuitBreaker] ${this.name} recovered, closing circuit`,
          );
          this.state = "CLOSED";
          this.failureCount = 0;
          this.successCount = 0;
        }
      } else if (this.state === "CLOSED") {
        this.failureCount = Math.max(0, this.failureCount - 1); // Decay failures
      }

      return result;
    } catch (error) {
      // Failure - update state
      this.failureCount++;
      this.lastFailureTime = Date.now();

      if (this.state === "HALF_OPEN") {
        logger.warn(
          `[CircuitBreaker] ${this.name} still failing in HALF_OPEN, reopening`,
        );
        this.state = "OPEN";
      } else if (
        this.state === "CLOSED" &&
        this.failureCount >= this.failureThreshold
      ) {
        logger.warn(
          `[CircuitBreaker] ${this.name} exceeded failure threshold, opening circuit`,
        );
        this.state = "OPEN";
      }

      throw error;
    }
  }

  getState(): "CLOSED" | "OPEN" | "HALF_OPEN" {
    return this.state;
  }

  reset(): void {
    this.state = "CLOSED";
    this.failureCount = 0;
    this.successCount = 0;
    this.lastFailureTime = 0;
  }
}

/**
 * Timeout wrapper for promises
 * Prevents hanging requests
 */
export async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  timeoutMessage: string = "Operation timed out",
): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(timeoutMessage)), timeoutMs),
    ),
  ]);
}

/**
 * Bulkhead pattern - limit concurrent calls
 * Prevents resource exhaustion
 */
export class Bulkhead {
  private activeCount = 0;
  private queue: (() => void)[] = [];

  constructor(private maxConcurrent: number) {}

  async execute<T>(fn: () => Promise<T>): Promise<T> {
    if (this.activeCount >= this.maxConcurrent) {
      await new Promise<void>((resolve) => {
        this.queue.push(resolve);
      });
    }

    this.activeCount++;

    try {
      return await fn();
    } finally {
      this.activeCount--;
      const next = this.queue.shift();
      if (next) next();
    }
  }

  getActiveCount(): number {
    return this.activeCount;
  }

  getQueuedCount(): number {
    return this.queue.length;
  }
}
