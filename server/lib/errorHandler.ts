/**
 * PHASE 0: ENTERPRISE FOUNDATION
 * Centralized Error Handler with Severity Levels
 * All errors logged with requestId, org_id, severity for audit trail
 * Sends ERROR/CRITICAL to Sentry when SENTRY_DSN is set.
 */

import { captureException as sentryCaptureException } from "../sentry-init";

export type ErrorSeverity = 'DEBUG' | 'INFO' | 'WARN' | 'ERROR' | 'CRITICAL';

export class AppError extends Error {
  public readonly severity: ErrorSeverity;
  public readonly statusCode: number;
  public readonly context: Record<string, any>;

  constructor(
    public code: string,
    message: string,
    severity: ErrorSeverity = 'ERROR',
    statusCode: number = 500,
    context: Record<string, any> = {}
  ) {
    super(message);
    this.name = 'AppError';
    this.severity = severity;
    this.statusCode = statusCode;
    this.context = context;
    Object.setPrototypeOf(this, AppError.prototype);
  }
}

/**
 * Error response shape sent to clients
 * Never exposes internal details (stack traces, database info)
 */
export interface ErrorResponse {
  error: string; // error code (e.g., 'TENANT_VIOLATION')
  message: string; // user-friendly message
  requestId: string; // for tracing in logs
  statusCode?: number;
}

/**
 * Global error handler middleware
 * Use: app.use(globalErrorHandler) as the LAST middleware
 */
export const globalErrorHandler = (err: any, req: any, res: any, _next: any) => {
  const requestId = req.id || generateRequestId();
  const orgId = req.user?.org_id || req.org?.id || 'unknown';

  // Parse error to AppError if it isn't already
  let appError: AppError;

  if (err instanceof AppError) {
    appError = err;
  } else if (err instanceof SyntaxError && 'body' in err) {
    // JSON parsing error
    appError = new AppError(
      'INVALID_JSON',
      'Request body is not valid JSON',
      'WARN',
      400,
      { originalError: err.message }
    );
  } else if (err instanceof Error) {
    appError = new AppError(
      'INTERNAL_ERROR',
      'An unexpected error occurred',
      'ERROR',
      500,
      { originalError: err.message }
    );
  } else {
    appError = new AppError(
      'INTERNAL_ERROR',
      'An unexpected error occurred',
      'ERROR',
      500,
      { originalError: String(err) }
    );
  }

  // Log the error
  const logEntry = {
    timestamp: new Date().toISOString(),
    requestId,
    orgId,
    severity: appError.severity,
    code: appError.code,
    message: appError.message,
    statusCode: appError.statusCode,
    path: req.path,
    method: req.method,
    context: appError.context,
    // Stack trace only in development or for critical errors
    ...(process.env.NODE_ENV === 'development' || appError.severity === 'CRITICAL'
      ? { stack: err.stack }
      : {}),
  };

  // Log based on severity and send to Sentry for ERROR/CRITICAL
  if (appError.severity === 'CRITICAL' || appError.severity === 'ERROR') {
    console.error('[ERROR]', JSON.stringify(logEntry));
    try {
      sentryCaptureException(err instanceof Error ? err : new Error(appError.message), {
        requestId,
        orgId,
        code: appError.code,
        path: req.path,
        method: req.method,
        statusCode: appError.statusCode,
        ...appError.context,
      });
    } catch (_) {
      // Sentry capture is best-effort; don't break response
    }
  } else if (appError.severity === 'WARN') {
    console.warn('[WARN]', JSON.stringify(logEntry));
  } else {
    console.log('[INFO]', JSON.stringify(logEntry));
  }

  // Send response to client (never expose internal details)
  const errorResponse: ErrorResponse = {
    error: appError.code,
    message: appError.message,
    requestId,
    ...(appError.statusCode !== 500 ? { statusCode: appError.statusCode } : {}),
  };

  res.status(appError.statusCode).json(errorResponse);
};

/**
 * Generate unique request ID for tracing
 */
export const generateRequestId = (): string => {
  return `req-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
};

/**
 * Custom error types for common scenarios
 */

export class ValidationError extends AppError {
  constructor(message: string, context?: Record<string, any>) {
    super('VALIDATION_ERROR', message, 'WARN', 400, context);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message: string = 'Unauthorized', context?: Record<string, any>) {
    super('UNAUTHORIZED', message, 'WARN', 401, context);
  }
}

export class ForbiddenError extends AppError {
  constructor(message: string = 'Forbidden', context?: Record<string, any>) {
    super('FORBIDDEN', message, 'WARN', 403, context);
    this.name = 'ForbiddenError';
    Object.setPrototypeOf(this, ForbiddenError.prototype);
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string, context?: Record<string, any>) {
    super('NOT_FOUND', `${resource} not found`, 'INFO', 404, context);
  }
}

export class ConflictError extends AppError {
  constructor(message: string, context?: Record<string, any>) {
    super('CONFLICT', message, 'WARN', 409, context);
  }
}

export class RateLimitError extends AppError {
  constructor(retryAfter: number = 60, context?: Record<string, any>) {
    super(
      'RATE_LIMIT_EXCEEDED',
      `Rate limit exceeded. Retry after ${retryAfter} seconds.`,
      'WARN',
      429,
      { retryAfter, ...context }
    );
  }
}

export class DatabaseError extends AppError {
  constructor(message: string = 'Database error', context?: Record<string, any>) {
    super('DATABASE_ERROR', message, 'ERROR', 500, context);
  }
}

// ============================================================================
// INVENTORY-SPECIFIC ERRORS
// ============================================================================

export class InventoryError extends AppError {
  constructor(
    code: string,
    message: string,
    statusCode: number = 400,
    context?: Record<string, any>
  ) {
    super(code, message, 'WARN', statusCode, context);
  }
}

export class ProductNotFoundError extends AppError {
  constructor(productId: string, context?: Record<string, any>) {
    super('PRODUCT_NOT_FOUND', `Product ${productId} not found`, 'INFO', 404, {
      productId,
      ...context,
    });
  }
}

export class LocationNotFoundError extends AppError {
  constructor(locationId: string, context?: Record<string, any>) {
    super('LOCATION_NOT_FOUND', `Location ${locationId} not found`, 'INFO', 404, {
      locationId,
      ...context,
    });
  }
}

export class InsufficientStockError extends AppError {
  constructor(
    productId: string,
    available: number,
    requested: number,
    context?: Record<string, any>
  ) {
    super(
      'INSUFFICIENT_STOCK',
      `Insufficient stock for product ${productId}. Available: ${available}, Requested: ${requested}`,
      'WARN',
      409,
      { productId, available, requested, ...context }
    );
  }
}

export class InvalidTransferError extends AppError {
  constructor(message: string, context?: Record<string, any>) {
    super('INVALID_TRANSFER', message, 'WARN', 400, context);
  }
}

export class InvalidCostError extends AppError {
  constructor(message: string, context?: Record<string, any>) {
    super('INVALID_COST', message, 'WARN', 400, context);
  }
}
