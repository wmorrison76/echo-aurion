/** * Centralized error handler middleware * Catches all errors and returns consistent response format */ import {
  Request,
  Response,
  NextFunction,
} from "express";
export interface AppError extends Error {
  statusCode?: number;
  code?: string;
  details?: Record<string, any>;
}
export function errorHandler(
  err: AppError | Error,
  req: Request,
  res: Response,
  next: NextFunction,
) {
  const requestId = (req as any).requestId || "unknown"; // Log error console.error("💥 Error:", { requestId, message: err.message, code: (err as AppError).code, statusCode: (err as AppError).statusCode, stack: err.stack, }); // Determine status code const statusCode = (err as AppError).statusCode || 500; const code = (err as AppError).code ||"INTERNAL_ERROR"; const details = (err as AppError).details; // Return error response res.status(statusCode).json({ error: err.message ||"Internal Server Error", code, ...(details && { details }), requestId, timestamp: new Date().toISOString(), });
}
