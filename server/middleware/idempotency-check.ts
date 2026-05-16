/**
 * Idempotency Check Middleware
 * 
 * Automatically checks and enforces idempotency for write operations.
 * Extracts idempotency key from request headers or generates one.
 */

import { Request, Response, NextFunction } from "express";
import { getIdempotencyService } from "../lib/idempotency-service";
import { logger } from "../lib/logger";

export interface IdempotencyRequest extends Request {
  idempotencyKey?: string;
  idempotencyResult?: any;
}

/**
 * Middleware to check idempotency for write operations
 */
export function idempotencyCheckMiddleware(
  req: IdempotencyRequest,
  res: Response,
  next: NextFunction
): void {
  // Only apply to write operations
  const isWriteOperation = !["GET", "HEAD", "OPTIONS"].includes(req.method);
  
  if (!isWriteOperation) {
    return next();
  }

  // Extract or generate idempotency key
  const idempotencyKey = 
    req.headers["idempotency-key"] as string ||
    req.headers["x-idempotency-key"] as string ||
    generateIdempotencyKey(req);

  req.idempotencyKey = idempotencyKey;

  // Check if operation was already processed
  const idempotencyService = getIdempotencyService();
  
  idempotencyService.check(idempotencyKey)
    .then(existing => {
      if (existing && existing.status === "completed") {
        // Return cached result
        logger.info(`[Idempotency] Returning cached result for: ${idempotencyKey}`);
        req.idempotencyResult = existing.result;
        return res.status(200).json(existing.result);
      }

      if (existing && existing.status === "processing") {
        // Operation in progress
        logger.warn(`[Idempotency] Operation in progress: ${idempotencyKey}`);
        return res.status(409).json({
          error: "Operation already in progress",
          idempotencyKey,
        });
      }

      // Continue with operation
      next();
    })
    .catch(error => {
      logger.error("[Idempotency] Error checking idempotency:", error);
      // Continue on error (fail open)
      next();
    });
}

/**
 * Generate idempotency key from request
 */
function generateIdempotencyKey(req: Request): string {
  const operation = `${req.method}:${req.path}`;
  const params = {
    ...req.body,
    ...req.query,
    ...req.params,
  };

  const idempotencyService = getIdempotencyService();
  return idempotencyService.generateKey(operation, params);
}

/**
 * Store result after successful operation
 */
export async function storeIdempotencyResult(
  req: IdempotencyRequest,
  result: any
): Promise<void> {
  if (!req.idempotencyKey) {
    return;
  }

  try {
    const idempotencyService = getIdempotencyService();
    await idempotencyService.storeResult(req.idempotencyKey, result);
  } catch (error) {
    logger.error("[Idempotency] Error storing result:", error);
  }
}
