export interface LogContext {
  [key: string]: any;
}

const isDevelopment = Boolean((import.meta as any).env?.DEV);
const isProduction = Boolean((import.meta as any).env?.PROD);

class ClientLogger {
  private context: LogContext = {};
  private sentry: any = null;

  constructor() {
    try {
      this.sentry = (window as any).__SENTRY__ ?? null;
    } catch {
      this.sentry = null;
    }
  }

  setContext(context: LogContext) {
    this.context = { ...this.context, ...context };
  }

  clearContext() {
    this.context = {};
  }

  debug(message: string, data?: LogContext) {
    if (isDevelopment)
      console.debug(`[DEBUG] ${message}`, { ...this.context, ...data });
  }

  info(message: string, data?: LogContext) {
    if (isDevelopment)
      console.log(`[INFO] ${message}`, { ...this.context, ...data });
  }

  warn(message: string, data?: LogContext) {
    console.warn(`[WARN] ${message}`, { ...this.context, ...data });
    if (isProduction && this.sentry?.captureMessage) {
      this.sentry.captureMessage(message, "warning", {
        extra: { ...this.context, ...data },
      });
    }
  }

  private serializeError(error: any): Record<string, any> {
    if (!error) return { message: "Unknown error" };
    if (error instanceof Error) {
      return {
        message: error.message,
        name: error.name,
        code: (error as any).code,
        status: (error as any).status,
      };
    }
    if (typeof error === "object") {
      const serialized: Record<string, any> = {};
      for (const key of Object.keys(error).slice(0, 10)) {
        const value = (error as any)[key];
        serialized[key] =
          typeof value === "object" ? JSON.stringify(value) : value;
      }
      return serialized;
    }
    return { message: String(error) };
  }

  error(message: string, error?: unknown, data?: LogContext) {
    const serializedError = error ? this.serializeError(error) : undefined;
    console.error(`[ERROR] ${message}`, serializedError, {
      ...this.context,
      ...data,
    });

    if (!this.sentry) return;
    try {
      if (error instanceof Error && this.sentry.captureException) {
        this.sentry.captureException(error, {
          extra: { message, ...this.context, ...data },
        });
      } else if (this.sentry.captureMessage) {
        this.sentry.captureMessage(message, "error", {
          extra: { ...this.context, ...data, error: serializedError },
        });
      }
    } catch {
      /* ignore */
    }
  }

  logUserAction(action: string, category: string, data?: LogContext) {
    if (isDevelopment) console.log(`[ACTION] ${category}:${action}`, data);
    if (this.sentry?.addBreadcrumb) {
      this.sentry.addBreadcrumb({
        category,
        message: action,
        level: "info",
        data,
      });
    }
  }

  logApiRequest(
    method: string,
    endpoint: string,
    status?: number,
    durationMs?: number,
  ) {
    if (isDevelopment) {
      console.log(
        `[API] ${method} ${endpoint} - ${status ?? "pending"}${durationMs ? ` (${durationMs}ms)` : ""}`,
      );
    }
    if (
      isProduction &&
      durationMs &&
      durationMs > 5000 &&
      this.sentry?.captureMessage
    ) {
      this.sentry.captureMessage(
        `Slow API request: ${method} ${endpoint}`,
        "warning",
        { extra: { durationMs } },
      );
    }
  }
}

export const logger = new ClientLogger();
export const clientLogger = logger;
export default logger;
