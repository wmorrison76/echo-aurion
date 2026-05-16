/**
 * Correlation ID Middleware
 * Adds correlation ID to all requests for distributed tracing
 * 
 * TODO-018: Add structured logging with correlation IDs
 */

import { v4 as uuidv4 } from 'uuid';
import { Request, Response, NextFunction } from 'express';

/**
 * Express middleware to add correlation ID to requests
 * 
 * Usage:
 * ```typescript
 * import { correlationIdMiddleware } from './middleware/correlation-id';
 * app.use(correlationIdMiddleware);
 * ```
 */
export function correlationIdMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  // Get correlation ID from header or generate new one
  const correlationId = req.headers['x-correlation-id'] as string || 
                        req.headers['x-request-id'] as string ||
                        generateUUID();

  // Attach to request object for use in handlers
  (req as any).correlationId = correlationId;

  // Set correlation ID in logger context
  setCorrelationId(correlationId);

  // Add to response headers
  res.setHeader('X-Correlation-ID', correlationId);

  // Clean up correlation ID when response finishes
  res.on('finish', () => {
    clearCorrelationId();
  });

  // Continue to next middleware
  next();
}

/**
 * Get correlation ID from request object
 */
export function getCorrelationId(req: Request): string | undefined {
  return (req as any).correlationId;
}
