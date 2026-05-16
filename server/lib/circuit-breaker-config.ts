/**
 * Circuit Breaker Configuration
 * 
 * Defines circuit breakers for all external services.
 * Prevents cascading failures and provides graceful degradation.
 */

export interface CircuitBreakerConfig {
  service: string;
  failureThreshold: number; // Number of failures before opening
  resetTimeout: number; // Milliseconds before attempting reset
  halfOpenMaxCalls: number; // Max calls in half-open state
  timeout: number; // Request timeout in milliseconds
}

export const CIRCUIT_BREAKER_CONFIGS: Record<string, CircuitBreakerConfig> = {
  ocr: {
    service: "ocr",
    failureThreshold: 5,
    resetTimeout: 60000, // 60s
    halfOpenMaxCalls: 1,
    timeout: 10000, // 10s
  },
  pos: {
    service: "pos",
    failureThreshold: 10,
    resetTimeout: 120000, // 120s
    halfOpenMaxCalls: 1,
    timeout: 5000, // 5s
  },
  nutrition: {
    service: "nutrition",
    failureThreshold: 5,
    resetTimeout: 60000, // 60s
    halfOpenMaxCalls: 1,
    timeout: 8000, // 8s
  },
  payment: {
    service: "payment",
    failureThreshold: 10,
    resetTimeout: 120000, // 120s
    halfOpenMaxCalls: 1,
    timeout: 10000, // 10s
  },
};
