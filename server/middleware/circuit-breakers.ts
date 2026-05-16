/**
 * Circuit Breaker Middleware
 * 
 * Implements circuit breakers for all external services.
 * Prevents cascading failures and provides automatic recovery.
 */

import { logger } from "../lib/logger";
import { CIRCUIT_BREAKER_CONFIGS, CircuitBreakerConfig } from "../lib/circuit-breaker-config";

export type CircuitState = "closed" | "open" | "half-open";

export interface CircuitBreakerStats {
  state: CircuitState;
  failures: number;
  successes: number;
  lastFailure?: Date;
  lastSuccess?: Date;
  nextAttempt?: Date;
}

class CircuitBreaker {
  private config: CircuitBreakerConfig;
  private state: CircuitState = "closed";
  private failures = 0;
  private successes = 0;
  private lastFailure?: Date;
  private lastSuccess?: Date;
  private nextAttempt?: Date;
  private halfOpenCalls = 0;

  constructor(config: CircuitBreakerConfig) {
    this.config = config;
  }

  /**
   * Execute function with circuit breaker protection
   */
  async execute<T>(fn: () => Promise<T>): Promise<T> {
    // Check if circuit should be opened/closed
    this.updateState();

    if (this.state === "open") {
      // Circuit is open, reject immediately
      throw new CircuitBreakerOpenError(
        `Circuit breaker is OPEN for ${this.config.service}. Next attempt at ${this.nextAttempt?.toISOString()}`
      );
    }

    try {
      // Execute function with timeout
      const result = await Promise.race([
        fn(),
        new Promise<never>((_, reject) => {
          setTimeout(() => reject(new Error("Request timeout")), this.config.timeout);
        }),
      ]);

      // Success
      this.onSuccess();
      return result;
    } catch (error) {
      // Failure
      this.onFailure();
      throw error;
    }
  }

  /**
   * Update circuit state based on current conditions
   */
  private updateState(): void {
    const now = Date.now();

    if (this.state === "open") {
      // Check if we should attempt half-open
      if (this.nextAttempt && now >= this.nextAttempt.getTime()) {
        this.state = "half-open";
        this.halfOpenCalls = 0;
        logger.info(`[CircuitBreaker] ${this.config.service} entering HALF-OPEN state`);
      }
    } else if (this.state === "half-open") {
      // Check if we've exceeded half-open max calls
      if (this.halfOpenCalls >= this.config.halfOpenMaxCalls) {
        // If we got here without success, go back to open
        if (this.failures > 0) {
          this.state = "open";
          this.nextAttempt = new Date(now + this.config.resetTimeout);
          logger.warn(`[CircuitBreaker] ${this.config.service} back to OPEN state`);
        }
      }
    }
  }

  /**
   * Handle successful request
   */
  private onSuccess(): void {
    this.successes++;
    this.lastSuccess = new Date();

    if (this.state === "half-open") {
      // Success in half-open, close the circuit
      this.state = "closed";
      this.failures = 0;
      this.halfOpenCalls = 0;
      logger.info(`[CircuitBreaker] ${this.config.service} circuit CLOSED after successful half-open test`);
    } else if (this.state === "closed") {
      // Reset failure count on success streak
      if (this.successes % 10 === 0) {
        this.failures = Math.max(0, this.failures - 1);
      }
    }
  }

  /**
   * Handle failed request
   */
  private onFailure(): void {
    this.failures++;
    this.lastFailure = new Date();

    if (this.state === "half-open") {
      // Failure in half-open, go back to open
      this.state = "open";
      this.nextAttempt = new Date(Date.now() + this.config.resetTimeout);
      logger.warn(`[CircuitBreaker] ${this.config.service} circuit OPENED after half-open failure`);
    } else if (this.state === "closed") {
      // Check if we should open the circuit
      if (this.failures >= this.config.failureThreshold) {
        this.state = "open";
        this.nextAttempt = new Date(Date.now() + this.config.resetTimeout);
        logger.error(
          `[CircuitBreaker] ${this.config.service} circuit OPENED after ${this.failures} failures`
        );
        
        // Alert on-call
        this.alertCircuitOpen();
      }
    }

    this.halfOpenCalls++;
  }

  /**
   * Alert on-call when circuit opens
   */
  private alertCircuitOpen(): void {
    // TODO: Integrate with alerting system (PagerDuty, Slack, etc.)
    logger.error(
      `[CircuitBreaker] ALERT: Circuit breaker OPEN for ${this.config.service} - Page on-call engineer`
    );
  }

  /**
   * Get circuit breaker statistics
   */
  getStats(): CircuitBreakerStats {
    return {
      state: this.state,
      failures: this.failures,
      successes: this.successes,
      lastFailure: this.lastFailure,
      lastSuccess: this.lastSuccess,
      nextAttempt: this.nextAttempt,
    };
  }

  /**
   * Reset circuit breaker (for testing/admin)
   */
  reset(): void {
    this.state = "closed";
    this.failures = 0;
    this.successes = 0;
    this.halfOpenCalls = 0;
    this.nextAttempt = undefined;
    logger.info(`[CircuitBreaker] ${this.config.service} circuit RESET`);
  }
}

/**
 * Circuit breaker error
 */
export class CircuitBreakerOpenError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CircuitBreakerOpenError";
  }
}

// Circuit breaker instances
const circuitBreakers: Map<string, CircuitBreaker> = new Map();

/**
 * Get or create circuit breaker for a service
 */
export function getCircuitBreaker(service: string): CircuitBreaker {
  if (!circuitBreakers.has(service)) {
    const config = CIRCUIT_BREAKER_CONFIGS[service];
    if (!config) {
      throw new Error(`No circuit breaker config for service: ${service}`);
    }
    circuitBreakers.set(service, new CircuitBreaker(config));
  }
  return circuitBreakers.get(service)!;
}

/**
 * Execute function with circuit breaker
 */
export async function withCircuitBreaker<T>(
  service: string,
  fn: () => Promise<T>
): Promise<T> {
  const breaker = getCircuitBreaker(service);
  return breaker.execute(fn);
}

/**
 * Get all circuit breaker statistics
 */
export function getAllCircuitBreakerStats(): Record<string, CircuitBreakerStats> {
  const stats: Record<string, CircuitBreakerStats> = {};
  circuitBreakers.forEach((breaker, service) => {
    stats[service] = breaker.getStats();
  });
  return stats;
}
