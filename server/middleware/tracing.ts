/**
 * Distributed Tracing Middleware
 * 
 * Adds tracing spans to all requests for observability.
 */

import { Request, Response, NextFunction } from "express";
import { logger } from "../lib/logger";

export interface TraceContext {
  traceId: string;
  spanId: string;
  parentSpanId?: string;
}

/**
 * Tracing middleware
 */
export function tracingMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  // Generate trace ID if not present
  const traceId = req.headers["x-trace-id"] as string || generateTraceId();
  const spanId = generateSpanId();

  // Store trace context
  (req as any).traceContext = {
    traceId,
    spanId,
    parentSpanId: req.headers["x-parent-span-id"] as string,
  };

  // Add trace headers to response
  res.setHeader("X-Trace-Id", traceId);
  res.setHeader("X-Span-Id", spanId);

  const startTime = Date.now();

  // Log request start
  logger.debug(`[Trace] ${req.method} ${req.path} [${traceId}]`);

  // Track response time
  res.on("finish", () => {
    const duration = Date.now() - startTime;
    logger.debug(`[Trace] ${req.method} ${req.path} [${traceId}] completed in ${duration}ms`);
  });

  next();
}

/**
 * Generate trace ID
 */
function generateTraceId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Generate span ID
 */
function generateSpanId(): string {
  return Math.random().toString(36).substr(2, 9);
}

/**
 * Get trace context from request
 */
export function getTraceContext(req: Request): TraceContext | null {
  return (req as any).traceContext || null;
}
