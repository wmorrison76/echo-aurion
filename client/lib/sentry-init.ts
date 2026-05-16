import * as Sentry from "@sentry/react";

export interface SentryConfig {
  enabled?: boolean;
  tracesSampleRate?: number;
  dsn?: string;
}

let sentryInitialized = false;

export function initializeSentry(config?: SentryConfig) {
  // Prevent multiple initializations (important for Vite HMR)
  if (sentryInitialized) {
    return { captureException: () => {}, captureMessage: () => {}, Sentry };
  }

  const rawDSN =
    config?.dsn ||
    import.meta.env.VITE_SENTRY_DSN ||
    (typeof window !== "undefined" ? (window as any).SENTRY_DSN : undefined);

  const isValidDsn =
    rawDSN &&
    typeof rawDSN === "string" &&
    rawDSN.trim().length > 0 &&
    !/your-sentry|placeholder/i.test(rawDSN) &&
    rawDSN.startsWith("https://") &&
    rawDSN.includes("@");

  if (!isValidDsn) {
    if (rawDSN) console.debug("[SENTRY] Invalid or placeholder DSN - error tracking disabled");
    console.info(
      "[SENTRY] To enable error tracking and replay: add VITE_SENTRY_DSN to .env. " +
      "Get DSN from https://sentry.io → your project → Settings → Client Keys (DSN). " +
      "Optional: VITE_SENTRY_DEBUG=true for verbose Sentry logs."
    );
    return { captureException: () => {}, captureMessage: () => {}, Sentry };
  }

  const sentryDSN = rawDSN as string;

  sentryInitialized = true;

  // Sentry v7: use browserTracingIntegration and replayIntegration (no @sentry/tracing)
  Sentry.init({
    dsn: sentryDSN,
    environment: import.meta.env.MODE || "development",
    enabled: true,
    release: import.meta.env.VITE_APP_VERSION || "development",
    integrations: [
      Sentry.browserTracingIntegration(),
      Sentry.replayIntegration({
        maskAllText: true,
        blockAllMedia: true,
        stickySession: true,
      }),
    ],
    tracesSampleRate:
      config?.tracesSampleRate ??
      (import.meta.env.MODE === "production" ? 0.05 : 0.1),
    tracePropagationTargets: [/^\//, /^https?:\/\/localhost/],
    replaysSessionSampleRate: import.meta.env.MODE === "production" ? 0.05 : 0.0,
    replaysOnErrorSampleRate: import.meta.env.MODE === "production" ? 1.0 : 0.0,
    maxBreadcrumbs: 50,
    debug: import.meta.env.VITE_SENTRY_DEBUG === "true",
    ignoreErrors: [
      "chrome-extension://",
      "moz-extension://",
      /top\.GLOBALS/,
      "originalCreateNotification",
      "canvas.contentDocument",
      "MyApp_RemoveAllHighlights",
      "Failed to fetch",
      "NetworkError",
      "TimeoutError",
      "AbortError",
      "signal is aborted",
      "signal is aborted without reason",
      "status code 429",
      "Transport returned status code 429",
      "[Replay] Attempting to finish replay event after session expired",
      /Attempting to finish replay event after session expired/i,
    ],
    beforeSend(event, hint) {
      // Filter out internal Sentry errors that might leak into the event stream
      const message = event.message || "";
      const exceptionValue = event.exception?.values?.[0]?.value || "";
      const exceptionMessage = event.exception?.values?.[0]?.message || "";
      const logger = event.logger || "";
      const stacktrace = event.exception?.values?.[0]?.stacktrace?.frames || [];

      const isReplayError =
        message.includes("[Replay]") ||
        exceptionValue.includes("[Replay]") ||
        message.includes("session expired") ||
        exceptionValue.includes("session expired") ||
        logger.includes("replay");

      if (isReplayError) {
        console.debug("[SENTRY] Filtered internal replay error:", message || exceptionValue);
        return null;
      }

      // CRITICAL: Filter out ALL network/fetch errors - these are expected and handled gracefully
      // Check multiple levels of the error message and stack
      const combinedText = `${message} ${exceptionValue} ${exceptionMessage}`.toLowerCase();

      // Check error name/type (case-insensitive)
      const errorName = event.exception?.values?.[0]?.type || '';
      const isAbortError =
        errorName.toLowerCase().includes('aborterror') ||
        combinedText.includes('aborterror') ||
        combinedText.includes('signal is aborted');

      const isNetworkError =
        isAbortError ||
        combinedText.includes("failed to fetch") ||
        combinedText.includes("networkerror") ||
        combinedText.includes("cors") ||
        combinedText.includes("timeout") ||
        combinedText.includes("getaddrinfo") ||
        combinedText.includes("enotfound") ||
        combinedText.includes("service unavailable") ||
        combinedText.includes("unavailable") ||
        combinedText.includes("the user aborted") ||
        exceptionValue.includes("Failed to fetch") ||
        exceptionValue.includes("TypeError") && exceptionValue.includes("fetch") ||
        // Check if any frame in stack references fetch-with-retry or auth-init
        stacktrace.some((frame: any) => {
          const filename = (frame.filename || "").toLowerCase();
          return filename.includes("fetch-with-retry") ||
                 filename.includes("auth-init") ||
                 filename.includes("fetch-with-fallback") ||
                 filename.includes("supabase") ||
                 frame.function?.includes("fetchWithRetry") ||
                 frame.function?.includes("fetchWithFallback") ||
                 frame.function?.includes("originalFetch");
        });

      if (isNetworkError) {
        console.debug("[SENTRY] Filtered network error:", {
          type: errorName,
          message: message || exceptionValue || exceptionMessage,
          isAbortError,
        });
        return null;
      }

      return event;
    },
  });

  console.log("[SENTRY] Client-side error tracking initialized");
  console.log(`[SENTRY] Environment: ${import.meta.env.MODE || "development"}`);
  console.log(
    `[SENTRY] Release: ${import.meta.env.VITE_APP_VERSION || "development"}`,
  );

  return { Sentry };
}

/** Whether Sentry was initialized with a valid DSN (use for conditional logging). */
export function isSentryEnabled(): boolean {
  return sentryInitialized;
}

// Capture exception from client (no-op if Sentry not initialized)
export function captureException(error: Error, context?: Record<string, any>) {
  try {
    if (!sentryInitialized) return;
    Sentry.captureException(error, {
      contexts: context ? { custom: context } : undefined,
    });
  } catch (err) {
    console.error("[SENTRY] Error capturing exception:", err);
  }
}

// Capture message for logging (no-op if Sentry not initialized)
export function captureMessage(
  message: string,
  level: "fatal" | "error" | "warning" | "info" | "debug" = "info",
  context?: Record<string, any>,
) {
  try {
    if (!sentryInitialized) return;
    Sentry.captureMessage(message, level);
    if (context) {
      Sentry.setContext("custom", context);
    }
  } catch (err) {
    console.error("[SENTRY] Error capturing message:", err);
  }
}

// Set user context
export function setSentryUser(userId: string, userInfo?: Record<string, any>) {
  try {
    if (!sentryInitialized) return;
    Sentry.setUser({
      id: userId,
      ...userInfo,
    });
  } catch (err) {
    console.error("[SENTRY] Error setting user context:", err);
  }
}

// Clear user context
export function clearSentryUser() {
  try {
    if (!sentryInitialized) return;
    Sentry.setUser(null);
  } catch (err) {
    console.error("[SENTRY] Error clearing user context:", err);
  }
}

// Add breadcrumb for debugging
export function addBreadcrumb(
  messageOrOptions:
    | string
    | {
        message?: string;
        category?: string;
        level?: "fatal" | "error" | "warning" | "info" | "debug";
        data?: Record<string, any>;
      },
  category: string = "app",
  level: "fatal" | "error" | "warning" | "info" | "debug" = "info",
) {
  try {
    if (!sentryInitialized) return;
    const options =
      typeof messageOrOptions === "string"
        ? { message: messageOrOptions, category, level }
        : {
            message: messageOrOptions.message || "Event",
            category: messageOrOptions.category || category,
            level: messageOrOptions.level || level,
            data: messageOrOptions.data,
          };

    Sentry.addBreadcrumb({
      message: options.message,
      category: options.category,
      level: options.level,
      timestamp: Date.now() / 1000,
      data: options.data,
    });
  } catch (err) {
    console.error("[SENTRY] Error adding breadcrumb:", err);
  }
}

// Export alias for compatibility with client initialization
export const initSentry = initializeSentry;

export default Sentry;
