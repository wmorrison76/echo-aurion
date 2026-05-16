/**
 * Resilient Fetch Wrapper
 * Adds retry logic with exponential backoff for failed requests
 * Provides fallback values when services are unavailable
 */

export interface FetchOptions extends RequestInit {
  /** Maximum number of retry attempts (default: 3) */
  maxRetries?: number;
  /** Initial retry delay in milliseconds (default: 1000) */
  retryDelay?: number;
  /** Request timeout in milliseconds (default: 30000) */
  timeout?: number;
  /** Fallback value to return if all retries fail */
  fallback?: any;
}

/**
 * Fetch with automatic retry logic and exponential backoff
 * @param url - URL to fetch
 * @param options - Fetch options + retry configuration
 * @returns Response or fallback value
 */
export async function fetchWithRetry(
  url: string,
  options: FetchOptions = {}
): Promise<Response | any> {
  const {
    maxRetries = 3,
    retryDelay = 1000,
    timeout = 30000,
    fallback = null,
    ...fetchOptions
  } = options;

  let lastError: Error | null = null;
  let delay = retryDelay;
  const externalSignal = fetchOptions.signal;

  if (externalSignal?.aborted) {
    return fallback ?? new Response(
      JSON.stringify({ error: "Request aborted" }),
      { status: 499, statusText: "Client Closed Request" }
    );
  }

  const fetchImpl = ((globalThis as any).__nativeFetch ?? (globalThis as any).__rawFetch) as typeof fetch | undefined;
  if (!fetchImpl) {
    return fallback ?? new Response(
      JSON.stringify({ error: 'Service unavailable' }),
      { status: 503, statusText: 'Service Unavailable' }
    );
  }

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    let timeoutId: NodeJS.Timeout | undefined;

    try {
      type FetchRaceResult =
        | { kind: "response"; response: Response }
        | { kind: "error"; error: unknown }
        | { kind: "timeout" };

      let fetchPromise: Promise<FetchRaceResult>;
      try {
        fetchPromise = fetchImpl(url, {
          ...fetchOptions,
          signal: externalSignal,
        })
          .then((response) => ({ kind: "response", response }))
          .catch((error) => ({ kind: "error", error }));
      } catch (error) {
        fetchPromise = Promise.resolve({ kind: "error", error });
      }

      const timeoutPromise: Promise<FetchRaceResult> = new Promise((resolve) => {
        timeoutId = setTimeout(() => resolve({ kind: "timeout" }), timeout);
      });

      const result = await Promise.race([fetchPromise, timeoutPromise]);

      if (timeoutId) clearTimeout(timeoutId);

      if (result.kind === "timeout") {
        if (attempt === maxRetries) {
          return fallback ?? new Response(
            JSON.stringify({ error: 'Service unavailable' }),
            { status: 503, statusText: 'Service Unavailable' }
          );
        }

        await new Promise((r) => setTimeout(r, delay));
        delay *= 2;
        continue;
      }

      if (result.kind === "error") {
        const error = result.error;
        const errorName = error instanceof Error ? error.name : '';
        const errorMessage = error instanceof Error ? error.message : String(error);
        lastError = error instanceof Error ? error : new Error(errorMessage);

        const isAbortError =
          errorName === 'AbortError' ||
          errorName === 'TimeoutError' ||
          errorMessage.includes('AbortError') ||
          errorMessage.includes('TimeoutError') ||
          errorMessage.includes('The operation was aborted') ||
          errorMessage.includes('signal is aborted') ||
          errorMessage.includes('signal is aborted without reason');

        if (isAbortError) {
          if (attempt === maxRetries) {
            return fallback ?? new Response(
              JSON.stringify({ error: 'Service unavailable' }),
              { status: 503, statusText: 'Service Unavailable' }
            );
          }

          await new Promise((r) => setTimeout(r, delay));
          delay *= 2;
          continue;
        }

        const isTimeoutOrNetworkError =
          errorMessage.includes('Failed to fetch') ||
          errorMessage.includes('NetworkError') ||
          errorMessage.includes('fetch failed') ||
          errorMessage.includes('timeout') ||
          errorMessage.includes('offline');

        if (!isTimeoutOrNetworkError || attempt === maxRetries) {
          console.debug(
            `[Fetch] Error for ${url}: ${errorMessage}`,
            { attempt: attempt + 1, maxRetries: maxRetries + 1 }
          );
          return fallback ?? new Response(
            JSON.stringify({ error: errorMessage }),
            { status: 503, statusText: 'Service Unavailable' }
          );
        }

        await new Promise((r) => setTimeout(r, delay));
        delay *= 2;
        continue;
      }

      const response = result.response;

      if (response.ok) {
        return response;
      }

      if (response.status === 503 || response.status === 502 || response.status === 504) {
        lastError = new Error(`Server error: ${response.status}`);

        if (attempt === maxRetries) {
          console.warn(
            `[Fetch] Request to ${url} failed after ${maxRetries + 1} attempts`,
            lastError
          );
          return fallback ?? response;
        }

        await new Promise((r) => setTimeout(r, delay));
        delay *= 2;
        continue;
      }

      return response;
    } finally {
      if (timeoutId) clearTimeout(timeoutId);
    }
  }

  console.debug(
    `[Fetch] All retry attempts failed for ${url}`,
    lastError
  );
  return fallback ?? new Response(
    JSON.stringify({ error: 'Service unavailable after retries' }),
    { status: 503, statusText: 'Service Unavailable' }
  );
}

/**
 * Fetch JSON with retry
 * Parses response as JSON and provides fallback
 */
export async function fetchJsonWithRetry<T = any>(
  url: string,
  options: FetchOptions & { fallback?: T } = {}
): Promise<T | null> {
  const { fallback = null, ...fetchOptions } = options;

  try {
    const response = await fetchWithRetry(url, {
      ...fetchOptions,
      fallback: null,
    });

    if (!response || !response.ok) {
      return fallback;
    }

    const data = await response.json();
    return data as T;
  } catch (error) {
    console.error(`[FetchJson] Error parsing JSON from ${url}:`, error);
    return fallback;
  }
}

/**
 * Fetch with fallback defaults for common API endpoints
 * Returns default data structure if API is unavailable
 */
export function getFallbackData(endpoint: string): any {
  const fallbacks: Record<string, any> = {
    '/api/maestro/events': { events: [], total: 0 },
    '/api/maestro/spaces': { spaces: [], total: 0 },
    '/api/maestro/tasks': { tasks: [], total: 0 },
    '/api/metrics': { metrics: {}, timestamp: Date.now() },
    '/api/auth/session': null,
    '/api/inventory': { items: [], total: 0 },
    '/api/recipes': { recipes: [], total: 0 },
  };

  return fallbacks[endpoint] ?? null;
}

export default {
  fetchWithRetry,
  fetchJsonWithRetry,
  getFallbackData,
};
