/**
 * LogRocket session replay and debugging.
 * Optional: set VITE_LOGROCKET_APP_ID in .env to enable.
 * Pairs with Sentry: use LogRocket for replay, Sentry for errors.
 */

import LogRocket from "logrocket";
import setupLogRocketReact from "logrocket-react";

let logrocketInitialized = false;

export function initializeLogRocket(): void {
  if (logrocketInitialized || typeof window === "undefined") return;

  const appId =
    import.meta.env.VITE_LOGROCKET_APP_ID ||
    (typeof window !== "undefined" ? (window as any).LOGROCKET_APP_ID : undefined);

  if (!appId || typeof appId !== "string" || appId.trim().length === 0) {
    console.info(
      "[LOGROCKET] Session replay disabled. To enable: add VITE_LOGROCKET_APP_ID to .env. " +
      "Get your App ID from https://app.logrocket.com → sign in → create or open an app → Settings (or Setup) → copy the App ID."
    );
    return;
  }

  try {
    const debug = import.meta.env.VITE_LOGROCKET_DEBUG === "true";
    LogRocket.init(appId.trim(), {
      console: {
        shouldAggregateConsoleErrors: true,
      },
      network: {
        requestSanitizer: (req: { headers?: Record<string, string> }) => {
          if (req.headers?.Authorization) req.headers.Authorization = "[REDACTED]";
          return req;
        },
      },
      dom: {
        inputSanitizer: true,
      },
    });

    if (typeof setupLogRocketReact === "function") {
      setupLogRocketReact(LogRocket);
    }

    logrocketInitialized = true;
    console.log("[LOGROCKET] Session replay initialized" + (debug ? " (debug logging enabled via VITE_LOGROCKET_DEBUG=true)" : ""));
  } catch (err) {
    console.warn("[LOGROCKET] Initialization failed:", err);
  }
}

export function isLogRocketEnabled(): boolean {
  return logrocketInitialized;
}
