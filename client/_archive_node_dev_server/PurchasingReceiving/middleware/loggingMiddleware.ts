import { Request, Response, NextFunction } from "express";
import { logRequest, logError, logSecurityEvent } from "../lib/logger";
export function requestLoggingMiddleware(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  const startTime = Date.now(); // Log request start res.on('finish', () => { const duration = Date.now() - startTime; logRequest(req, res, duration); // Log security-relevant information if (req.method === 'POST' || req.method === 'DELETE') { logSecurityEvent('state_change', { method: req.method, path: req.path, status: res.statusCode, }); } }); // Log errors that occur during request handling res.on('error', (error) => { const duration = Date.now() - startTime; logError(error, { method: req.method, path: req.path, duration, }); }); next();
}
export function errorHandlingMiddleware(
  err: any,
  req: Request,
  res: Response,
  next: NextFunction,
) {
  const duration = Date.now() - (res.locals.startTime || Date.now()); // Log the error logError(err, { method: req.method, path: req.path, status: err.status || 500, duration, userId: req.user?.id, }); // Determine response status const status = err.status || 500; const message = process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message; // Send response res.status(status).json({ error: message, ...(process.env.NODE_ENV !== 'production' && { stack: err.stack }), });
} // Middleware to attach request timing
export function timingMiddleware(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  res.locals.startTime = Date.now();
  next();
}
