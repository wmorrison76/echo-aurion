/**
 * Graceful Degradation Middleware
 * 
 * Automatically applies graceful degradation for failed requests.
 */

import { Request, Response, NextFunction } from "express";
import { getDegradationHandler } from "../lib/degradation-handler";
import { CircuitBreakerOpenError } from "./circuit-breakers";
import { logger } from "../lib/logger";

/**
 * Middleware to handle graceful degradation
 */
export function gracefulDegradationMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  // Store original send function
  const originalSend = res.send.bind(res);

  // Override send to handle degradation
  res.send = function (body: any) {
    // Check if response indicates degradation
    if (body && typeof body === "object" && body.degraded) {
      res.setHeader("X-Degraded-Service", body.service || "unknown");
      logger.warn(`[Degradation] Response indicates degraded service: ${body.service}`);
    }

    return originalSend(body);
  };

  next();
}

/**
 * Wrap async handler with graceful degradation
 */
export function withGracefulDegradation<T>(
  service: string,
  handler: () => Promise<T>,
  fallback?: T
): Promise<T> {
  const degradationHandler = getDegradationHandler();

  return degradationHandler.handleDegradation(
    service,
    handler,
    {
      fallbackToCache: true,
      fallbackValue: fallback,
      reducedFunctionality: true,
      notifyUser: false,
    }
  );
}
