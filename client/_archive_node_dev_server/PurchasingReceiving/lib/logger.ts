import pino from "pino";
import pinoPretty from "pino-pretty"; const isDevelopment = process.env.NODE_ENV ==="development";
const logLevel = process.env.LOG_LEVEL || (isDevelopment ?"debug" :"info"); const pinoOptions = { level: logLevel, timestamp: pino.stdTimeFunctions.isoTime,
}; const transport = isDevelopment ? pinoPretty({ colorize: true, translateTime:"SYS:standard", ignore:"pid,hostname", singleLine: false, }) : undefined; export const logger = pino(pinoOptions, transport); // Logger utilities
export function logRequest(req: any, res: any, duration: number) { const status = res.statusCode; const method = req.method; const url = req.url; const level = status >= 500 ?"error" : status >= 400 ?"warn" :"info"; logger[level]({ type:"http_request", method, url, status, duration: `${duration}ms`, ip: req.ip, userAgent: req.get("user-agent"), });
} export function logError(error: unknown, context?: any) { if (error instanceof Error) { logger.error({ type:"error", message: error.message, stack: error.stack, ...context, }); } else { logger.error({ type:"error", message: String(error), ...context, }); }
} export function logInfo(message: string, data?: any) { logger.info({ type:"info", message, ...data, });
} export function logWarn(message: string, data?: any) { logger.warn({ type:"warning", message, ...data, });
} export function logDebug(message: string, data?: any) { logger.debug({ type:"debug", message, ...data, });
} // Performance logging
export function logPerformance(name: string, duration: number, data?: any) { const level = duration > 5000 ?"warn" : duration > 1000 ?"info" :"debug"; logger[level]({ type:"performance", name, duration: `${duration}ms`, slow: duration > 1000, ...data, });
} // Database operation logging
export function logDatabaseOperation( operation: string, table: string, duration: number, rowsAffected?: number,
) { const level = duration > 1000 ?"warn" :"debug"; logger[level]({ type:"database", operation, table, duration: `${duration}ms`, rowsAffected, slow: duration > 1000, });
} // Security event logging
export function logSecurityEvent(event: string, details?: any) { logger.warn({ type:"security", event, ...details, });
} // Audit logging
export function logAudit( action: string, resourceType: string, resourceId: string, userId?: string, changes?: any,
) { logger.info({ type:"audit", action, resourceType, resourceId, userId, changes, timestamp: new Date().toISOString(), });
} // Alias for audit logging with different naming convention
export const logAuditEvent = logAudit; // Webhook event logging
export function logWebhookEvent( provider: string, eventType: string, status:"received" |"processed" |"failed", details?: any,
) { logger.info({ type:"webhook", provider, eventType, status, ...details, timestamp: new Date().toISOString(), });
} // Payment transaction logging
export function logPaymentTransaction( transactionId: string, provider: string, amount: number, currency: string, status: string, details?: any,
) { const level = status ==="failed" ?"error" :"info"; logger[level]({ type:"payment", transactionId, provider, amount, currency, status, ...details, timestamp: new Date().toISOString(), });
} // Error sanitization for safe logging
export function sanitizeError(error: unknown): any { if (error instanceof Error) { return { message: error.message, name: error.name, stack: error.stack, }; } if (typeof error ==="object" && error !== null) { const sanitized: any = {}; for (const [key, value] of Object.entries(error)) { // Skip sensitive fields if ( !key.toLowerCase().includes("password") && !key.toLowerCase().includes("token") && !key.toLowerCase().includes("secret") && !key.toLowerCase().includes("key") && !key.toLowerCase().includes("apikey") ) { sanitized[key] = value; } } return sanitized; } return String(error);
}
