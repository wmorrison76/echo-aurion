import * as Sentry from "@sentry/node";
import { Request, Response, NextFunction } from "express";
export function sentryRequestHandler() {
  return Sentry.Handlers.requestHandler();
}
export function sentryErrorHandler() {
  return Sentry.Handlers.errorHandler();
}
export function sentryTracingMiddleware(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  // Add custom context Sentry.setContext("request", { method: req.method, url: req.originalUrl, ip: req.ip, userAgent: req.get("user-agent"), }); // Track response time const startTime = Date.now(); res.on("finish", () => { const duration = Date.now() - startTime; Sentry.addBreadcrumb({ message: `${req.method} ${req.originalUrl}`, category:"http", level:"info", data: { statusCode: res.statusCode, duration: `${duration}ms`, }, }); // Alert on slow responses if (duration > 5000) { Sentry.captureMessage( `Slow API response: ${req.method} ${req.originalUrl}`,"warning", { contexts: { performance: { duration, statusCode: res.statusCode, }, }, } ); } // Alert on errors if (res.statusCode >= 500) { Sentry.captureMessage( `Server error: ${req.method} ${req.originalUrl}`,"error", { contexts: { error: { statusCode: res.statusCode, }, }, } ); } }); next();
}
export function setRequestUser(userId?: string) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (userId || req.user?.id) {
      Sentry.setUser({
        id: userId || req.user?.id,
        email: req.user?.email,
        role: req.user?.role,
      });
    }
    next();
  };
}
