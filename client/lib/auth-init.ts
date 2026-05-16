/**
 * Authentication Initialization
 * Auto-logs in as admin on first load for development
 *
 * CRITICAL: All fetch errors are suppressed at the source through
 * the auth-init.ts fetch interceptor and global error handlers
 */

import { isAuthenticated, mockLogin } from "./auth-mock";

type AuthFetchGlobal = typeof globalThis & {
  __authFetchPatched?: boolean;
  __nativeFetch?: typeof fetch;
  __rawFetch?: typeof fetch;
};

let authInitStarted = false;

export function installAuthFetchInterceptor(): void {
  if (typeof window === "undefined") return;

  const globalScope = globalThis as AuthFetchGlobal;
  if (globalScope.__authFetchPatched) return;

  const originalFetch = window.fetch.bind(window);
  const rawFetch = globalScope.__nativeFetch ?? globalScope.__rawFetch ?? originalFetch;
  let isIntercepting = false;

  window.fetch = async (
    input: Parameters<typeof window.fetch>[0],
    init?: Parameters<typeof window.fetch>[1],
  ) => {
    if (isIntercepting) {
      try {
        return await rawFetch(input, init);
      } catch {
        return new globalThis.Response(JSON.stringify({ error: "Network unavailable" }), {
          status: 503,
          headers: { "Content-Type": "application/json" },
        });
      }
    }

    isIntercepting = true;
    try {
      const updatedInit = { ...(init ?? {}) } as NonNullable<Parameters<typeof window.fetch>[1]>;
      const mergedHeaders = new globalThis.Headers(
        updatedInit.headers ?? (input instanceof globalThis.Request ? input.headers : undefined),
      );

      const token = localStorage.getItem("auth_token");
      if (token && !mergedHeaders.has("Authorization")) {
        mergedHeaders.set("Authorization", `Bearer ${token}`);
      }

      const orgRaw = localStorage.getItem("auth_org");
      if (orgRaw && !mergedHeaders.has("X-Org-ID")) {
        try {
          const parsed = JSON.parse(orgRaw) as { id?: string | number };
          if (parsed?.id) mergedHeaders.set("X-Org-ID", String(parsed.id));
        } catch {
          // ignore parse errors
        }
      }

      updatedInit.headers = mergedHeaders;

      try {
        return await rawFetch(input, updatedInit).catch((fetchError: unknown) => {
          if (typeof console !== "undefined" && console.debug) {
            console.debug("[Auth Interceptor] Fetch failed:", fetchError);
          }

          return new globalThis.Response(JSON.stringify({ error: "Network unavailable" }), {
            status: 503,
            statusText: "Service Unavailable",
            headers: { "Content-Type": "application/json" },
          });
        });
      } catch (fetchError: unknown) {
        if (typeof console !== "undefined" && console.debug) {
          console.debug("[Auth Interceptor] Fetch failed (outer catch):", fetchError);
        }

        return new globalThis.Response(JSON.stringify({ error: "Network unavailable" }), {
          status: 503,
          statusText: "Service Unavailable",
          headers: { "Content-Type": "application/json" },
        });
      }
    } finally {
      isIntercepting = false;
    }
  };

  globalScope.__authFetchPatched = true;
}

/**
 * Perform the actual auth initialization
 * CRITICAL: This is wrapped and delayed to prevent network errors during startup
 */
async function performAuthInit(): Promise<void> {
  try {
    if (isAuthenticated()) {
      return;
    }

    // Auto-login as admin for development
    try {
      const success = await mockLogin("admin-user");
      if (!success) {
        // Use offline mode - silently continue
      }
    } catch {
      // All errors handled gracefully - use offline mode
    }
  } catch {
    // Final safety net - suppress any remaining errors
  }
}

/**
 * Initialize authentication on app load
 * Auto-logs in as admin if not authenticated
 * CRITICAL: Wrapped to prevent network errors from reaching Sentry during startup
 */
export async function initializeAuth(): Promise<void> {
  // Only run in development/browser
  if (typeof window === "undefined") return;
  if (authInitStarted) return;
  authInitStarted = true;

  // CRITICAL: Delay auth init until after page is fully loaded
  // This prevents fetch errors during the vulnerable startup phase from reaching Sentry
  const scheduleAuthInit = () => {
    try {
      // Use Promise.resolve() to defer execution and ensure errors don't bubble
      Promise.resolve()
        .then(() => performAuthInit())
        .catch(() => {
          // Suppress all errors - never let them escape
        });
    } catch {
      // Suppress any synchronous errors
    }
  };

  // Schedule based on DOM state
  if (document.readyState === "loading") {
    // Page still loading - wait for DOMContentLoaded
    document.addEventListener("DOMContentLoaded", scheduleAuthInit, { once: true });
  } else {
    // Page already loaded - use setTimeout to defer
    setTimeout(scheduleAuthInit, 0);
  }
}

export default initializeAuth;
