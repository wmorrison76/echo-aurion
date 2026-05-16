/** * Sentry Error Tracking Integration * Centralized error monitoring and performance tracking */ export interface SentryConfig {
  dsn: string;
  enabled: boolean;
  environment: string;
  tracesSampleRate: number;
  maxBreadcrumbs: number;
}
export interface ErrorContext {
  userId?: string;
  orgId?: string;
  requestId?: string;
  [key: string]: any;
}
export interface PerformanceMetric {
  name: string;
  duration: number;
  timestamp: Date;
  tags?: Record<string, string>;
}
let sentryConfig: SentryConfig | null = null; /** * Initialize Sentry */
export function initSentry(config: SentryConfig): void {
  sentryConfig = config;
  if (config.enabled) {
    console.log(`Sentry initialized for environment: ${config.environment}`);
  }
} /** * Capture exception */
export function captureException(
  error: Error | string,
  context?: ErrorContext,
): string {
  if (!sentryConfig?.enabled) {
    return "sentry-disabled";
  }
  const errorMessage = typeof error === "string" ? error : error.message;
  const eventId = Math.random().toString(36).substring(7); // Log to console in development console.error(`[Sentry] ${errorMessage}`, context); // In production, would send to Sentry: // Sentry.captureException(error, { contexts: { custom: context } }); return eventId;
} /** * Capture message */
export function captureMessage(
  message: string,
  level: "fatal" | "error" | "warning" | "info" | "debug" = "info",
  context?: ErrorContext,
): void {
  if (!sentryConfig?.enabled) {
    return;
  }
  console.log(`[Sentry] [${level}] ${message}`, context); // In production, would send to Sentry: // Sentry.captureMessage(message, level, { contexts: { custom: context } });
} /** * Set user context */
export function setUserContext(
  userId: string,
  userData?: Record<string, any>,
): void {
  if (!sentryConfig?.enabled) {
    return;
  }
  const context = { id: userId, ...userData };
  console.debug("Sentry user context set:", context); // In production: // Sentry.setUser(context);
} /** * Add breadcrumb for debugging */
export function addBreadcrumb(
  message: string,
  category: string = "default",
  level: "fatal" | "error" | "warning" | "info" | "debug" = "info",
  data?: Record<string, any>,
): void {
  if (!sentryConfig?.enabled) {
    return;
  }
  console.debug(`[Breadcrumb] ${category}: ${message}`, data); // In production: // Sentry.addBreadcrumb({ // message, // category, // level, // data, // timestamp: Date.now() / 1000, // });
} /** * Start performance monitoring */
export function startPerformanceTransaction(
  name: string,
  op: string = "http.request",
): { end: () => void } {
  const startTime = Date.now();
  return {
    end: () => {
      const duration = Date.now() - startTime;
      if (duration > 1000) {
        captureMessage(
          `Slow operation: ${name} took ${duration}ms`,
          "warning",
          { operation: name, duration, type: op },
        );
      }
    },
  };
} /** * Record custom metric */
export function recordMetric(
  name: string,
  value: number,
  tags?: Record<string, string>,
): void {
  if (!sentryConfig?.enabled) {
    return;
  }
  console.debug(`[Metric] ${name}: ${value}`, tags); // In production, would send to Sentry or metrics service
} /** * Report API error */
export function reportAPIError(
  method: string,
  path: string,
  statusCode: number,
  error: Error | string,
  context?: ErrorContext,
): void {
  const message = typeof error === "string" ? error : error.message;
  captureMessage(
    `API Error: ${method} ${path} (${statusCode})`,
    statusCode >= 500 ? "error" : "warning",
    { method, path, statusCode, error: message, ...context },
  );
} /** * Report database error */
export function reportDatabaseError(
  query: string,
  error: Error | string,
  context?: ErrorContext,
): void {
  const message = typeof error === "string" ? error : error.message;
  captureMessage(`Database Error: ${message}`, "error", {
    query: query.substring(0, 200),
    error: message,
    ...context,
  });
} /** * Get Sentry configuration */
export function getSentryConfig(): SentryConfig | null {
  return sentryConfig;
} /** * Check if Sentry is enabled */
export function isSentryEnabled(): boolean {
  return sentryConfig?.enabled ?? false;
} /** * Flush pending events */
export async function flushSentry(timeout: number = 2000): Promise<boolean> {
  if (!sentryConfig?.enabled) {
    return true;
  } // In production, would flush Sentry queue // Sentry.close(timeout); return true;
}
