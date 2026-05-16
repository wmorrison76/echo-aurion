import { Request, Response, NextFunction } from "express";

export type LogLevel = "error" | "warn" | "info" | "debug" | "trace";

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  context?: Record<string, any>;
  error?: {
    message: string;
    stack?: string;
    code?: string;
  };
  requestId?: string;
  userId?: string;
  path?: string;
  method?: string;
  statusCode?: number;
  duration?: number;
}

/**
 * Structured logger for production observability
 * Logs to console in development, can integrate with Sentry/ELK/CloudWatch
 */
class Logger {
  private logLevel: LogLevel;
  private isDev: boolean;

  constructor() {
    this.isDev = process.env.NODE_ENV !== "production";
    this.logLevel = process.env.LOG_LEVEL === "debug" ? "debug" : "info";
  }

  /**
   * Format log entry as JSON
   */
  private formatEntry(entry: LogEntry): string {
    return JSON.stringify(entry);
  }

  /**
   * Check if this log level should be logged
   */
  private shouldLog(level: LogLevel): boolean {
    const levels: LogLevel[] = ["error", "warn", "info", "debug", "trace"];
    const levelIndex = levels.indexOf(level);
    const minLevelIndex = levels.indexOf(this.logLevel);
    return levelIndex <= minLevelIndex;
  }

  /**
   * Output log to appropriate destination
   */
  private output(entry: LogEntry): void {
    if (!this.shouldLog(entry.level)) return;

    const formatted = this.formatEntry(entry);

    switch (entry.level) {
      case "error":
        console.error(formatted);
        // In production, also send to error tracking service (Sentry)
        if (!this.isDev && process.env.SENTRY_DSN) {
          // Will integrate with Sentry later
        }
        break;
      case "warn":
        console.warn(formatted);
        break;
      case "info":
        console.log(formatted);
        break;
      case "debug":
        if (this.isDev) console.debug(formatted);
        break;
      case "trace":
        if (this.isDev) console.trace(formatted);
        break;
    }
  }

  /**
   * Log error with full context
   */
  error(
    message: string,
    context?: Record<string, any>,
    error?: Error,
    requestId?: string,
  ): void {
    this.output({
      timestamp: new Date().toISOString(),
      level: "error",
      message,
      context,
      error: error
        ? {
            message: error.message,
            stack: this.isDev ? error.stack : undefined,
            code: (error as any).code,
          }
        : undefined,
      requestId,
    });
  }

  /**
   * Log warning
   */
  warn(
    message: string,
    context?: Record<string, any>,
    requestId?: string,
  ): void {
    this.output({
      timestamp: new Date().toISOString(),
      level: "warn",
      message,
      context,
      requestId,
    });
  }

  /**
   * Log info
   */
  info(
    message: string,
    context?: Record<string, any>,
    requestId?: string,
  ): void {
    this.output({
      timestamp: new Date().toISOString(),
      level: "info",
      message,
      context,
      requestId,
    });
  }

  /**
   * Log debug (only in dev)
   */
  debug(message: string, context?: Record<string, any>): void {
    if (!this.isDev) return;

    this.output({
      timestamp: new Date().toISOString(),
      level: "debug",
      message,
      context,
    });
  }

  /**
   * Log HTTP request/response
   */
  logRequest(
    req: Request,
    res: Response,
    statusCode: number,
    duration: number,
    error?: Error,
  ): void {
    const userId = (req as any).user?.id;
    const requestId = (req as any).requestId || req.headers["x-request-id"];

    this.output({
      timestamp: new Date().toISOString(),
      level: statusCode >= 500 ? "error" : statusCode >= 400 ? "warn" : "info",
      message: `${req.method} ${req.path}`,
      path: req.path,
      method: req.method,
      statusCode,
      duration,
      requestId: String(requestId),
      userId,
      error: error
        ? {
            message: error.message,
            stack: this.isDev ? error.stack : undefined,
          }
        : undefined,
      context: {
        userAgent: req.headers["user-agent"],
        ip: req.ip,
      },
    });
  }
}

// Singleton instance
let loggerInstance: Logger | null = null;

export function getLogger(): Logger {
  if (!loggerInstance) {
    loggerInstance = new Logger();
  }
  return loggerInstance;
}

/**
 * Middleware: Add request ID and start timing
 */
export function requestIdMiddleware(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  const requestId =
    req.headers["x-request-id"] || `req-${Date.now()}-${Math.random()}`;
  (req as any).requestId = requestId;
  (req as any).startTime = Date.now();

  // Capture original res.end
  const originalEnd = res.end;
  res.end = function (...args: any[]) {
    const duration = Date.now() - (req as any).startTime;
    const logger = getLogger();
    logger.logRequest(req, res, res.statusCode, duration);

    // Call original end
    return originalEnd.apply(res, args);
  };

  next();
}

/**
 * Middleware: Log all errors
 */
export function errorLoggingMiddleware(
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  const logger = getLogger();
  const requestId = (req as any).requestId;
  const userId = (req as any).user?.id;

  logger.error(
    `Unhandled error on ${req.method} ${req.path}`,
    {
      userId,
      path: req.path,
      method: req.method,
      query: req.query,
      body: req.body,
    },
    err,
    String(requestId),
  );

  next(err);
}
