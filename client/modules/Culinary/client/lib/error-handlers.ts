/**
 * Global Error Handlers
 * ====================
 * Handles browser errors gracefully, especially CORS and requestIdleCallback issues
 */

/**
 * Install global error handlers
 * Should be called early in app initialization
 */
export function installGlobalErrorHandlers(): void {
  if (typeof window === "undefined") return;

  // Handle uncaught errors
  window.addEventListener(
    "error",
    (event: ErrorEvent) => {
      const message = event.message || String(event.error);

      // Suppress CORS errors from breaking the app - just log them
      if (
        message.includes("Access-Control") ||
        message.includes("CORS") ||
        message.includes("api.builder.io")
      ) {
        console.warn("[CORS Error - Suppressed]", message);
        event.preventDefault();
        return;
      }

      // Suppress requestIdleCallback reference errors in certain contexts
      if (message.includes("requestIdleCallback")) {
        console.debug("[requestIdleCallback - Suppressed]", message);
        // Don't prevent the default if it's a critical error
        // Just log it for now
      }
    },
    true, // Use capture phase to intercept early
  );

  // Handle unhandled promise rejections
  window.addEventListener(
    "unhandledrejection",
    (event: PromiseRejectionEvent) => {
      const reason = event.reason;
      const message = typeof reason === "string" ? reason : String(reason);

      // Suppress CORS and API errors from unhandled rejections
      if (
        message.includes("Access-Control") ||
        message.includes("CORS") ||
        message.includes("api.builder.io") ||
        message.includes("github-installs")
      ) {
        console.warn("[API Error - Unhandled Promise - Suppressed]", message);
        event.preventDefault();
        return;
      }

      // Suppress GitHub connection errors
      if (message.includes("GitHubConnectionError") || message.includes("Failed to connect")) {
        console.warn("[Connection Error - Suppressed]", message);
        event.preventDefault();
        return;
      }
    },
  );
}

/**
 * Wrap async function to handle specific errors gracefully
 */
export function withErrorHandling<T extends (...args: any[]) => Promise<any>>(
  fn: T,
  errorHandler?: (error: Error) => void,
): T {
  return (async (...args: any[]) => {
    try {
      return await fn(...args);
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));

      // Check if this is a known error we want to suppress
      const message = err.message || String(err);

      if (
        message.includes("Access-Control") ||
        message.includes("CORS") ||
        message.includes("api.builder.io") ||
        message.includes("github-installs") ||
        message.includes("GitHubConnectionError")
      ) {
        console.warn("[Known Error - Handled]", message);
        return undefined;
      }

      // Call custom error handler if provided
      if (errorHandler) {
        errorHandler(err);
      }

      // Re-throw unknown errors
      throw err;
    }
  }) as T;
}

/**
 * Retry async operation with exponential backoff
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxAttempts: number = 3,
  baseDelayMs: number = 1000,
  shouldRetry?: (error: Error) => boolean,
): Promise<T> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      // Check if we should retry
      if (shouldRetry && !shouldRetry(lastError)) {
        throw lastError;
      }

      // Check if this is a CORS error that shouldn't be retried
      const message = lastError.message || String(lastError);
      if (
        message.includes("Access-Control") ||
        message.includes("CORS") ||
        message.includes("403") ||
        message.includes("Forbidden")
      ) {
        // Don't retry CORS errors
        throw lastError;
      }

      // Wait before retrying (exponential backoff)
      if (attempt < maxAttempts - 1) {
        const delayMs = baseDelayMs * Math.pow(2, attempt);
        await new Promise((resolve) => setTimeout(resolve, delayMs));
      }
    }
  }

  if (lastError) {
    throw lastError;
  }

  throw new Error("Unexpected error: operation failed");
}

/**
 * Safe JSON parse with error handling
 */
export function safeJSONParse<T = any>(
  json: string,
  fallback?: T,
): T | null {
  try {
    return JSON.parse(json) as T;
  } catch (error) {
    console.warn("Failed to parse JSON:", error);
    return fallback || null;
  }
}

/**
 * Safe fetch with timeout
 */
export async function fetchWithTimeout(
  input: RequestInfo | URL,
  init?: RequestInit & { timeout?: number },
): Promise<Response> {
  const timeout = init?.timeout || 10000;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort("Fetch request timeout"), timeout);

  try {
    const response = await fetch(input, {
      ...init,
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    throw error;
  }
}
