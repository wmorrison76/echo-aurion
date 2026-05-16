import { Request, Response, NextFunction } from "express";

export interface AppError extends Error {
  status?: number;
  code?: string;
  context?: Record<string, any>;
}

/**
 * Global error handler middleware
 * Captures errors to Sentry and returns standardized error responses
 */
export function errorHandler(
  error: AppError,
  req: Request,
  res: Response,
  _next: NextFunction,
) {
  const status = error.status || 500;
  const code = error.code || "INTERNAL_ERROR";
  const isDev = process.env.NODE_ENV !== "production";

  // Log to console in development
  if (isDev) {
    console.error(
      `[${status}] ${error.message}`,
      error.context || "",
      error.stack,
    );
  }

  // Log error context (Sentry integration can be added later)
  const errorContext = {
    status,
    code,
    method: req.method,
    path: req.path,
    userId: (req as any).user?.id,
    workspaceId: (req as any).workspaceId,
  };

  if (isDev) {
    console.error("Error context:", errorContext);
  }

  // Return standardized error response (never leak internal details in production)
  const errorResponse = {
    success: false,
    error: isDev ? error.message : "An error occurred",
    code,
    ...(isDev && { details: error.stack }),
  };

  res.status(status).json(errorResponse);
}

/**
 * Async error wrapper for Express handlers
 * Catches promises and forwards to error handler
 */
export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<any>,
) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

/**
 * Throw app error helper
 */
export function throwAppError(
  message: string,
  status: number = 500,
  code: string = "ERROR",
  context?: Record<string, any>,
): never {
  const error = new Error(message) as AppError;
  error.status = status;
  error.code = code;
  error.context = context;
  throw error;
}

/**
 * 404 handler
 */
export function notFoundHandler(req: Request, res: Response) {
  res.status(404).json({
    success: false,
    error: `Endpoint ${req.method} ${req.path} not found`,
    code: "NOT_FOUND",
  });
}
