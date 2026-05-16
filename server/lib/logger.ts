/**
 * PHASE 0: ENTERPRISE FOUNDATION
 * Structured Logging System
 * All logs in JSON format with consistent fields
 */

export type LogLevel = 'DEBUG' | 'INFO' | 'WARN' | 'ERROR' | 'CRITICAL';

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  [key: string]: any;
}

// Correlation ID support (safe default).
// Some modules set a correlation ID for request-scoped logging; in dev/offline mode it may be unset.
let correlationIdContext: string | undefined;

export function setCorrelationId(correlationId?: string) {
  correlationIdContext = correlationId;
}

export function getCorrelationId() {
  return correlationIdContext;
}

/**
 * Structured logger - outputs JSON for easy parsing
 */
export const logger = {
  /**
   * Debug level - for development troubleshooting
   */
  debug: (message: string, meta?: Record<string, any>) => {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level: 'DEBUG',
      message,
      ...(correlationIdContext && { correlationId: correlationIdContext }),
      ...meta,
    };
    if (process.env.NODE_ENV === 'development') {
      console.log(JSON.stringify(entry));
    }
  },

  /**
   * Info level - for general operational information
   */
  info: (message: string, meta?: Record<string, any>) => {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level: 'INFO',
      message,
      ...(correlationIdContext && { correlationId: correlationIdContext }),
      ...meta,
    };
    console.log(JSON.stringify(entry));
  },

  /**
   * Warn level - for potentially problematic situations
   */
  warn: (message: string, meta?: Record<string, any>) => {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level: 'WARN',
      message,
      ...(correlationIdContext && { correlationId: correlationIdContext }),
      ...meta,
    };
    console.warn(JSON.stringify(entry));
  },

  /**
   * Error level - for error events that might still allow the application to continue
   */
  error: (message: string, meta?: Record<string, any>) => {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level: 'ERROR',
      message,
      ...(correlationIdContext && { correlationId: correlationIdContext }),
      ...meta,
    };
    console.error(JSON.stringify(entry));
  },

  /**
   * Critical level - for serious errors that require immediate attention
   */
  critical: (message: string, meta?: Record<string, any>) => {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level: 'CRITICAL',
      message,
      ...(correlationIdContext && { correlationId: correlationIdContext }),
      ...meta,
    };
    console.error(JSON.stringify(entry));
    // TODO: Send to Sentry in Phase 0 Day 8
  },
};

/**
 * Audit logger - tracks all data modifications
 * Used for compliance and security auditing
 * 
 * TODO-014, TODO-015: Integrated with AuditLogService for tamper-evident storage
 */
import { auditLogService } from '../services/audit-log-service';

export const auditLogger = {
  /**
   * Log a data modification (CREATE, UPDATE, DELETE)
   * TODO-014, TODO-015: Now stores to database with tamper-evident hashing
   */
  logModification: async (
    orgId: string,
    userId: string | undefined,
    action: 'CREATE' | 'UPDATE' | 'DELETE',
    entity: string,
    entityId: string,
    changes: Record<string, any>,
    context?: Record<string, any>,
    ipAddress?: string,
    userAgent?: string
  ) => {
    logger.info(`Audit: ${action} ${entity}`, {
      orgId,
      userId: userId || 'system',
      action,
      entity,
      entityId,
      changes,
      ...(context && { context }),
    });

    logger.info(`Audit: ${action} ${entity}`, {
      orgId,
      userId: userId || 'system',
      action,
      entity,
      entityId,
    });

    // Store to database with tamper-evident storage
    try {
      await auditLogService.createAuditLog(
        orgId, // Using orgId as tenantId for now (can be enhanced)
        orgId,
        userId,
        action,
        entity,
        entityId,
        changes,
        context,
        ipAddress,
        userAgent
      );
    } catch (error) {
      // Log error but don't throw - audit logging failures shouldn't break the app
      logger.error('[AuditLogger] Failed to store audit log', {
        error,
        action,
        entity,
        entityId,
      });
    }
  },

  /**
   * Log a security event (auth failures, tenant violations, etc.)
   */
  logSecurityEvent: (
    orgId: string,
    eventType: string,
    severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL',
    description: string,
    context?: Record<string, any>
  ) => {
    const logMethod = severity === 'CRITICAL'
      ? logger.critical
      : severity === 'HIGH'
        ? logger.error
        : logger.warn;
    logMethod(`Security: ${eventType}`, {
      orgId,
      eventType,
      severity,
      description,
      ...(context && { context }),
    });
  },

  /**
   * Log API access
   */
  logApiAccess: (
    orgId: string,
    userId: string | undefined,
    method: string,
    path: string,
    statusCode: number,
    durationMs: number,
    context?: Record<string, any>
  ) => {
    const logMethod = statusCode >= 500
      ? logger.error
      : statusCode >= 400
        ? logger.warn
        : logger.debug;
    logMethod(`API: ${method} ${path}`, {
      orgId,
      userId: userId || 'anonymous',
      method,
      path,
      statusCode,
      durationMs,
      ...(context && { context }),
    });
  },
};

/**
 * Request context middleware
 * Attaches logger to req object for easy access in routes
 */
export const requestContextMiddleware = (req: any, _res: any, next: any) => {
  req.logger = logger;
  req.auditLogger = auditLogger;
  next();
};
