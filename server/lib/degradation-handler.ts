/**
 * Graceful Degradation Handler
 * 
 * Provides fallback mechanisms when services are unavailable.
 * System remains functional even with partial failures.
 */

import { logger } from "./logger";
import { getCache } from "./cache-layer";
import { CircuitBreakerOpenError } from "../middleware/circuit-breakers";

export interface DegradationOptions {
  fallbackToCache?: boolean;
  fallbackValue?: any;
  reducedFunctionality?: boolean;
  notifyUser?: boolean;
}

class GracefulDegradationHandler {
  private cache = getCache();
  private degradedServices: Set<string> = new Set();
  private degradationStartTimes: Map<string, Date> = new Map();

  /**
   * Handle service degradation
   */
  async handleDegradation<T>(
    service: string,
    operation: () => Promise<T>,
    options: DegradationOptions = {}
  ): Promise<T> {
    const {
      fallbackToCache = true,
      fallbackValue,
      reducedFunctionality = false,
      notifyUser = false,
    } = options;

    try {
      return await operation();
    } catch (error) {
      // Check if it's a circuit breaker error
      if (error instanceof CircuitBreakerOpenError) {
        logger.warn(`[Degradation] Service ${service} unavailable, using fallback`);
        this.markDegraded(service);

        // Try cache fallback
        if (fallbackToCache) {
          const cached = await this.getCachedFallback<T>(service);
          if (cached !== null) {
            logger.info(`[Degradation] Using cached data for ${service}`);
            return cached;
          }
        }

        // Use provided fallback value
        if (fallbackValue !== undefined) {
          logger.info(`[Degradation] Using fallback value for ${service}`);
          return fallbackValue as T;
        }

        // Reduced functionality mode
        if (reducedFunctionality) {
          logger.warn(`[Degradation] Operating in reduced functionality mode for ${service}`);
          return this.getReducedFunctionalityResponse<T>(service);
        }

        throw error;
      }

      // Other errors, re-throw
      throw error;
    }
  }

  /**
   * Get cached fallback data
   */
  private async getCachedFallback<T>(service: string): Promise<T | null> {
    try {
      const cacheKey = `degradation:fallback:${service}`;
      const cached = await this.cache.get<T>(cacheKey);
      return cached;
    } catch (error) {
      logger.error(`[Degradation] Error getting cached fallback for ${service}:`, error);
      return null;
    }
  }

  /**
   * Store fallback data in cache
   */
  async storeFallbackData<T>(service: string, data: T, ttl: number = 300): Promise<void> {
    try {
      const cacheKey = `degradation:fallback:${service}`;
      await this.cache.set(cacheKey, data, "events");
      logger.debug(`[Degradation] Stored fallback data for ${service}`);
    } catch (error) {
      logger.error(`[Degradation] Error storing fallback data for ${service}:`, error);
    }
  }

  /**
   * Get reduced functionality response
   */
  private getReducedFunctionalityResponse<T>(service: string): T {
    // Return a minimal response that allows the system to continue
    return {
      degraded: true,
      service,
      message: "Service temporarily unavailable, operating in reduced functionality mode",
      timestamp: new Date().toISOString(),
    } as T;
  }

  /**
   * Mark service as degraded
   */
  private markDegraded(service: string): void {
    if (!this.degradedServices.has(service)) {
      this.degradedServices.add(service);
      this.degradationStartTimes.set(service, new Date());
      logger.warn(`[Degradation] Service ${service} marked as degraded`);

      // Notify user if configured
      this.notifyDegradation(service);
    }
  }

  /**
   * Mark service as recovered
   */
  markRecovered(service: string): void {
    if (this.degradedServices.has(service)) {
      const startTime = this.degradationStartTimes.get(service);
      const duration = startTime ? Date.now() - startTime.getTime() : 0;

      this.degradedServices.delete(service);
      this.degradationStartTimes.delete(service);

      logger.info(
        `[Degradation] Service ${service} recovered after ${Math.floor(duration / 1000)}s`
      );
    }
  }

  /**
   * Notify user of degradation
   */
  private notifyDegradation(service: string): void {
    // TODO: Integrate with notification system
    logger.warn(`[Degradation] User notification: Service ${service} is degraded`);
  }

  /**
   * Get degradation statistics
   */
  getStats() {
    const degraded: Array<{ service: string; duration: number }> = [];

    this.degradedServices.forEach(service => {
      const startTime = this.degradationStartTimes.get(service);
      const duration = startTime ? Date.now() - startTime.getTime() : 0;
      degraded.push({ service, duration });
    });

    return {
      degradedServices: Array.from(this.degradedServices),
      degradedCount: this.degradedServices.size,
      degraded,
    };
  }

  /**
   * Check if service is degraded
   */
  isDegraded(service: string): boolean {
    return this.degradedServices.has(service);
  }
}

// Singleton instance
let degradationHandler: GracefulDegradationHandler | null = null;

export function getDegradationHandler(): GracefulDegradationHandler {
  if (!degradationHandler) {
    degradationHandler = new GracefulDegradationHandler();
  }
  return degradationHandler;
}
