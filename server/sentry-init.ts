import * as Sentry from "@sentry/node";
import { Express } from "express";

export function initializeSentry(app: Express) {
  // Initialize Sentry - reads SENTRY_DSN from environment
  const sentryDSN = process.env.SENTRY_DSN;

  if (!sentryDSN) {
    console.warn("[SENTRY] SENTRY_DSN not configured - error tracking disabled");
    return;
  }

  Sentry.init({
    dsn: sentryDSN,
    environment: process.env.NODE_ENV || "development",
    release: process.env.APP_VERSION || "development",
    integrations: [
      // Express integration for request/response tracking
      new Sentry.Integrations.Express({
        app,
      }),
      // HTTP client integration
      new Sentry.Integrations.Http({
        tracing: true,
      }),
      // Additional Node.js integrations
      new Sentry.Integrations.OnUncaughtException(),
      new Sentry.Integrations.OnUnhandledRejection(),
    ],
    // Performance monitoring
    tracesSampleRate:
      process.env.NODE_ENV === "production" ? 0.1 : 1.0,
    maxBreadcrumbs: 50,
    // Debugging
    debug: process.env.NODE_ENV !== "production",
    // Ignore internal Sentry errors and common non-actionable errors
    ignoreErrors: [
      "AbortError",
      "NetworkError",
      "TimeoutError",
      "[Replay] Attempting to finish replay event after session expired",
    ],
    beforeSend(event) {
      // Filter out internal replay errors that might have been logged or bubbled up
      const message = event.message || "";
      const exceptionValue = event.exception?.values?.[0]?.value || "";

      if (
        message.includes("[Replay]") ||
        exceptionValue.includes("[Replay]") ||
        message.includes("session expired") ||
        exceptionValue.includes("session expired")
      ) {
        return null;
      }
      return event;
    },
  });

  // Add Sentry middleware for request tracking
  app.use(Sentry.Handlers.requestHandler());
  app.use(Sentry.Handlers.tracingHandler());

  console.log("[SENTRY] Server-side error tracking initialized");
  console.log(`[SENTRY] Environment: ${process.env.NODE_ENV || "development"}`);
  console.log(`[SENTRY] Release: ${process.env.APP_VERSION || "development"}`);

  return { Sentry };
}

// Error handler middleware (must be last)
export function sentryErrorHandler(app: Express) {
  app.use(Sentry.Handlers.errorHandler());
}

// Capture exception manually
export function captureException(error: Error, context?: Record<string, any>) {
  if (process.env.SENTRY_DSN) {
    Sentry.captureException(error, {
      contexts: context ? { custom: context } : undefined,
    });
  }
}

// Capture message for logging
export function captureMessage(
  message: string,
  level: "fatal" | "error" | "warning" | "info" | "debug" = "info",
  context?: Record<string, any>,
) {
  if (process.env.SENTRY_DSN) {
    Sentry.captureMessage(message, level);
    if (context) {
      Sentry.setContext("custom", context);
    }
  }
}

// Set user context for error tracking
export function setSentryUser(userId: string, userInfo?: Record<string, any>) {
  if (process.env.SENTRY_DSN) {
    Sentry.setUser({
      id: userId,
      ...userInfo,
    });
  }
}

// Clear user context
export function clearSentryUser() {
  if (process.env.SENTRY_DSN) {
    Sentry.setUser(null);
  }
}
