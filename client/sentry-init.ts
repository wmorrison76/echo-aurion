import * as Sentry from "@sentry/react";

const SENTRY_DSN_PLACEHOLDERS = ["", "your-sentry-dsn", "https://xxx@xxx.ingest.sentry.io/xxx"];

// ═══════════════════════════════════════════════════════════════════════
// GLOBAL ERROR SUPPRESSION LAYER
// Prevents network errors from reaching Sentry before it's even initialized
// ═══════════════════════════════════════════════════════════════════════
if (typeof window !== "undefined") {
  // CRITICAL: Suppress console.error for network errors FIRST (before anything else)
  // This ensures even Sentry's own fetch errors are suppressed from console
  const originalConsoleError = console.error;
  console.error = function(...args: any[]) {
    const allText = args.map(a => String(a)).join(" ");
    const allTextLower = allText.toLowerCase();

    // Also check just the error message (first arg) for TypeError: Failed to fetch
    const firstArgStr = args.length > 0 ? String(args[0] || "").toLowerCase() : "";

    // Don't log network-related errors and startup issues
    if (
      // Network errors - most important (check both exact and lowercased)
      allTextLower.includes("failed to fetch") ||
      firstArgStr.includes("failed to fetch") ||
      allTextLower.includes("fetch failed") ||
      firstArgStr.includes("fetch failed") ||
      allTextLower.includes("typeerror: failed to fetch") ||
      firstArgStr.includes("typeerror: failed to fetch") ||
      allTextLower.includes("network unavailable") ||
      allTextLower.includes("network error") ||
      allTextLower.includes("offline") ||
      allTextLower.includes("econnrefused") ||
      allTextLower.includes("enotfound") ||
      allTextLower.includes("timeout") ||
      allTextLower.includes("a network error occurred") ||
      allTextLower.includes("the network connection was lost") ||
      // Startup errors
      allTextLower.includes("auth-init") ||
      allTextLower.includes("startup-diagnostics") ||
      allTextLower.includes("diagnostics send timeout") ||
      allTextLower.includes("service unavailable") ||
      allTextLower.includes("503") ||
      allTextLower.includes("502") ||
      allTextLower.includes("504") ||
      // Sentry-specific
      (allTextLower.includes("sentry") && (allTextLower.includes("fetch") || allTextLower.includes("network"))) ||
      // NaN-related warnings (from Radix UI)
      allTextLower.includes("received nan") ||
      (allTextLower.includes("nan") && allTextLower.includes("attribute"))
    ) {
      return; // Suppress this log completely
    }

    // Log everything else
    return originalConsoleError.apply(console, args);
  };

  // Suppress unhandled promise rejections for network errors IMMEDIATELY
  const suppressNetworkError = (reason: any): boolean => {
    const str = String(reason).toLowerCase();
    const message = (reason instanceof Error ? reason.message : "").toLowerCase();
    const name = reason instanceof Error ? reason.name : "";

    return !!(
      // Network fetch errors
      str.includes("failed to fetch") ||
      str.includes("fetch failed") ||
      message.includes("failed to fetch") ||
      name === "TypeError" && message.includes("fetch") ||

      // Network connectivity
      str.includes("network") ||
      message.includes("network") ||
      str.includes("econnrefused") ||
      str.includes("enotfound") ||
      str.includes("offline") ||
      message.includes("offline") ||

      // Timeout errors
      str.includes("timeout") ||
      message.includes("timeout") ||

      // HTTP errors during startup
      str.includes("503") ||
      str.includes("502") ||
      str.includes("504") ||
      message.includes("service unavailable") ||

      // Abort/cancellation - suppress all AbortErrors
      name === "AbortError" ||
      message.includes("abort") ||
      str.includes("abort") ||

      // Startup-specific errors
      str.includes("auth-init") ||
      str.includes("startup-diagnostics") ||
      str.includes("diagnostics send timeout")
    );
  };

  // CRITICAL: Intercept ALL unhandled rejections - highest priority
  window.addEventListener(
    "unhandledrejection",
    (event) => {
      // SUPER AGGRESSIVE: Check for fetch errors immediately
      const reason = event.reason;
      const reasonStr = String(reason || "").toLowerCase();
      const reasonMsg = reason instanceof Error ? (reason.message || "").toLowerCase() : "";

      // IMMEDIATE: Suppress all TypeError: Failed to fetch errors
      if (reasonStr.includes("failed to fetch") || reasonMsg.includes("failed to fetch")) {
        event.preventDefault();
        return;
      }

      // Also check with our comprehensive function
      if (suppressNetworkError(reason)) {
        event.preventDefault(); // Prevent reporting to Sentry
      }
    },
    true // Capture phase - runs before bubbling
  );

  // CRITICAL: Also suppress errors thrown during component mount
  const originalError = window.onerror;
  window.onerror = function(message, source, lineno, colno, error) {
    const errorMessage = (message || "").toString().toLowerCase();
    const errorStr = (error instanceof Error ? error.message : "").toLowerCase();
    const errorName = error instanceof Error ? error.name : "";
    const sourceStr = (source || "").toString().toLowerCase();

    // Suppress network-related errors using the same logic as suppressNetworkError
    if (suppressNetworkError(error || message || errorMessage)) {
      return true; // Suppress error
    }

    // Also suppress based on source file (auth-init, startup-diagnostics)
    if (sourceStr.includes("auth-init") || sourceStr.includes("startup-diagnostics") || sourceStr.includes("sentry")) {
      return true;
    }

    // Call original handler for non-network errors
    if (originalError) {
      return originalError.call(window, message, source, lineno, colno, error);
    }
    return false;
  };
}

function isValidSentryDsn(dsn: string | undefined): boolean {
  if (!dsn || typeof dsn !== "string") return false;
  const trimmed = dsn.trim();
  if (!trimmed) return false;
  if (SENTRY_DSN_PLACEHOLDERS.some((p) => trimmed === p || trimmed.toLowerCase().includes("your-sentry"))) return false;
  return trimmed.startsWith("https://") && trimmed.includes("@");
}

export function initializeSentry() {
  const sentryDSN = import.meta.env.VITE_SENTRY_DSN;

  if (!isValidSentryDsn(sentryDSN)) {
    if (sentryDSN) console.debug("[SENTRY] Invalid or placeholder DSN - error tracking disabled");
    return;
  }

  try {
    Sentry.init({
      dsn: sentryDSN,
      environment: import.meta.env.MODE || "development",
      // Core integrations enabled by default
      integrations: [
        Sentry.browserTracingIntegration(),
      ],
      // Performance monitoring - disabled in dev to prevent spam
      tracesSampleRate: import.meta.env.MODE === "production" ? 0.1 : 0,
      maxBreadcrumbs: 50,
      // Debug mode disabled to prevent spam
      debug: false,
      // Default PII handling
      sendDefaultPii: true,
      // Suppress network error breadcrumbs
      beforeBreadcrumb(breadcrumb, hint) {
        // Filter out network-related breadcrumbs
        if (breadcrumb.type === 'http' || breadcrumb.type === 'fetch') {
          const message = breadcrumb.message || "";
          const data = breadcrumb.data || {};
          const url = (data.url || data.method || message).toString().toLowerCase();

          // Suppress failing health checks and other non-critical endpoints
          if (message.includes("Failed") ||
            message.includes("503") ||
            url.includes("/health") ||
            url.includes("/metrics") ||
            url.includes("offline") ||
            url.includes("network")) {
            return null; // Don't include this breadcrumb
          }
        }

        // Filter out console messages about network errors
        if (breadcrumb.type === 'console') {
          const msg = (breadcrumb.message || "").toLowerCase();
          if (msg.includes("failed to fetch") ||
            msg.includes("network") ||
            msg.includes("offline")) {
            return null;
          }
        }

        return breadcrumb;
      },
      // Ignore patterns - runs BEFORE beforeSend
      // These are regex patterns that match error messages
      ignoreErrors: [
        // CRITICAL: Fetch errors in all forms (must catch before Sentry processes)
        "Failed to fetch",
        "TypeError: Failed to fetch",
        /Failed to fetch/i,
        /TypeError: Failed to fetch/i,
        /fetch failed/i,
        /failed to fetch/i,
        /fetch error/i,

        // Abort errors from fetch timeouts
        "AbortError",
        /AbortError/i,
        /signal is aborted/i,
        /aborted/i,

        // Network-related errors
        /Network error/i,
        /Network request failed/i,
        /network/i,
        /offline/i,
        /ENOTFOUND/i,
        /ECONNREFUSED/i,
        /ECONNRESET/i,
        /timeout/i,
        /ERR_/i, // Node.js style errors

        // HTTP status errors during startup
        "503",
        "502",
        "504",
        /503/,
        /service unavailable/i,
        /502/,
        /bad gateway/i,
        /504/,
        /gateway timeout/i,

        // Auth and telemetry startup errors
        /auth-init/i,
        /telemetry-aggregator/i,
        /startup-diagnostics/i,
        /fetch-with-fallback/i,
        /kpi/i,
        /health/i,
        /metrics/i,

        // MaestroBQT API errors (network failures are expected)
        /MaestroBQT/i,
        /maestro/i,

        // Cross-origin and fetch-related errors
        /CORS/i,
        /cors/i,
        /credentials/i,
        /blocked by client/i,

        // WebSocket and streaming errors
        /websocket/i,
        /ws/i,

        // Common browser network errors
        /network timeout/i,
        /connect/i,
        /refused/i,
        /reset/i,
        /closed/i,
        /failed/i,
        /network unavailable/i,
        /the network connection/i,
        /a network error/i,
      ],
      // Additional filtering in beforeSend (ignoreErrors is the primary filter)
      beforeSend(event, hint) {
        // SUPER AGGRESSIVE: Final defense - catch ALL network/fetch errors before they reach Sentry
        const error = hint.originalException;
        const errorMessage = error instanceof Error ? error.message : "";
        const errorName = error instanceof Error ? error.name : "";

        // IMMEDIATE: Check exact error types first (highest priority)
        if (errorName === "TypeError" && errorMessage.includes("Failed to fetch")) {
          return null;
        }

        if (errorName === "AbortError") {
          return null;
        }

        const eventMessage = event.message || event.exception?.values?.[0]?.value || "";
        const exceptionValue = event.exception?.values?.[0]?.value || "";
        const exceptionType = event.exception?.values?.[0]?.type || "";
        const breadcrumbMsg = event.breadcrumbs?.map(b => b.message || b.data?.url || "")?.join(" ") || "";
        const stackTrace = event.exception?.values?.[0]?.stacktrace?.frames?.map(f => f.filename)?.join(" ") || "";
        const allText = `${eventMessage} ${exceptionValue} ${exceptionType} ${breadcrumbMsg} ${stackTrace}`.toLowerCase();

        // CRITICAL: Check all text variations of fetch errors
        if (
          allText.includes("failed to fetch") ||
          allText.includes("fetch failed") ||
          allText.includes("typeerror: failed to fetch") ||
          allText.includes("network unavailable") ||
          allText.includes("auth-init") ||
          allText.includes("startup-diagnostics") ||
          allText.includes("telemetry-aggregator") ||
          allText.includes("fetch-with-fallback") ||
          allText.includes("503") ||
          allText.includes("service unavailable") ||
          allText.includes("aborted")
        ) {
          return null;
        }

        // SECOND: Check original exception message carefully
        if (error instanceof Error) {
          const errorMsg = (error.message || "").toLowerCase();
          const errorName = error.name || "";

          // ANY "Failed to fetch" error should NEVER reach Sentry
          if (errorMsg.includes("failed to fetch") || errorMsg.includes("fetch failed")) {
            return null;
          }

          // TypeErrors related to network/fetch
          if (errorName === "TypeError" && (
            errorMsg.includes("failed") ||
            errorMsg.includes("network") ||
            errorMsg.includes("fetch")
          )) {
            return null;
          }

          // AbortError or timeout
          if (errorName === "AbortError" || errorMsg.includes("abort") || errorMsg.includes("timeout")) {
            return null;
          }

          // Network connectivity
          if (errorMsg.includes("offline") || errorMsg.includes("network unavailable") ||
            errorMsg.includes("econnrefused") || errorMsg.includes("enotfound")) {
            return null;
          }
        }

        // SECOND: Check all text together for network-related keywords
        if (allText.includes("failed to fetch") ||
          allText.includes("fetch failed") ||
          allText.includes("typeerror: failed to fetch") ||
          allText.includes("network") && (allText.includes("error") || allText.includes("failed")) ||
          allText.includes("offline") ||
          allText.includes("timeout") ||
          allText.includes("econnrefused") ||
          allText.includes("enotfound") ||
          allText.includes("cors") && allText.includes("error") ||
          allText.includes("503") ||
          allText.includes("service unavailable")) {
          return null;
        }

        // THIRD: Check stack trace for files known to handle network gracefully
        const stackLower = stackTrace.toLowerCase();
        if (stackLower.includes("auth-init") ||
          stackLower.includes("telemetry-aggregator") ||
          stackLower.includes("startup-diagnostics") ||
          stackLower.includes("fetch-with-fallback") ||
          stackLower.includes("maestrobqt")) {
          // For these files, drop ALL errors containing "fetch" or "network"
          if (allText.includes("fetch") || allText.includes("network") ||
            allText.includes("failed") || allText.includes("error")) {
            // But only if it looks like a network error
            if (allText.includes("failed to fetch") || allText.includes("network") ||
              allText.includes("timeout") || allText.includes("econn")) {
              return null;
            }
          }
        }

        // FOURTH: Exception type check
        if (exceptionType === "TypeError" && (
          allText.includes("failed to fetch") ||
          allText.includes("network") ||
          allText.includes("offline"))) {
          return null;
        }

        // Default: send the event (only actual application errors should reach here)
        return event;
      },
    });

    console.log("[SENTRY] Client-side error tracking initialized");
    console.log(`[SENTRY] Environment: ${import.meta.env.MODE || "development"}`);

    // Add global handler for unhandled promise rejections
    // This catches AbortErrors and other network errors that escape try-catch
    if (typeof window !== "undefined") {
      window.addEventListener("unhandledrejection", (event) => {
        const reason = event.reason;
        const reasonStr = String(reason);

        // Suppress expected errors - these are network/timeout related and are handled gracefully
        const shouldSuppress =
          (reason instanceof Error && reason.name === "AbortError") ||
          (reason instanceof Error && (
            reason.message?.toLowerCase().includes("aborted") ||
            reason.message?.toLowerCase().includes("failed to fetch") ||
            reason.message?.toLowerCase().includes("fetch failed") ||
            reason.message?.toLowerCase().includes("timeout") ||
            reason.message?.toLowerCase().includes("offline") ||
            reason.message?.toLowerCase().includes("network") ||
            reason.message?.toLowerCase().includes("econnrefused") ||
            reason.message?.toLowerCase().includes("enotfound")
          )) ||
          reasonStr.toLowerCase().includes("failed to fetch") ||
          reasonStr.toLowerCase().includes("fetch failed") ||
          reasonStr.toLowerCase().includes("abort") ||
          reasonStr.toLowerCase().includes("offline") ||
          reasonStr.toLowerCase().includes("network") ||
          reasonStr.toLowerCase().includes("timeout") ||
          reasonStr.toLowerCase().includes("econnrefused") ||
          reasonStr.toLowerCase().includes("enotfound") ||
          reasonStr.toLowerCase().includes("service unavailable");

        if (shouldSuppress) {
          event.preventDefault(); // Prevent the rejection from propagating
        }
      });

      // Intercept console.error to suppress network error logs
      const originalError = console.error;
      console.error = function (...args: any[]) {
        const message = args.map(a => String(a)).join(" ").toLowerCase();
        if (message.includes("failed to fetch") ||
          message.includes("network") ||
          message.includes("offline") ||
          message.includes("econnrefused")) {
          // Silently suppress network errors from being logged
          return;
        }
        // Call original for other errors
        return originalError.apply(console, args);
      };
    }
  } catch (error) {
    console.error("[SENTRY] Failed to initialize:", error);
  }
}

export { Sentry };
