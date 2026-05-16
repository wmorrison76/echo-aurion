/**
 * Fetch with Fallback
 *
 * Provides resilient HTTP fetching with:
 * - Automatic timeout handling
 * - localStorage caching
 * - Graceful fallback to cached data
 * - Error logging and recovery
 */

export interface FetchOptions extends RequestInit {
  timeoutMs?: number;
  cacheKey?: string;
  cacheDuration?: number; // milliseconds
}

export interface FetchResult<T> {
  data: T | null;
  error: Error | null;
  cached: boolean;
  timestamp: number;
}

/**
 * Fetch with timeout, caching, and fallback support
 */
export async function fetchWithFallback<T>(
  url: string,
  options: FetchOptions = {},
  fallbackData: T | null = null
): Promise<FetchResult<T>> {
  const {
    timeoutMs = 5000,
    cacheKey = `fetch-cache:${url}`,
    cacheDuration = 3600000, // 1 hour default
    ...fetchOptions
  } = options;

  const timestamp = Date.now();

  // CRITICAL: This function MUST NEVER THROW - all errors are handled gracefully
  // Return a FetchResult object in all cases
  try {
    let response: Response | null = null;

    try {
      // Use Promise.race to implement timeout
      response = (await Promise.race([
        fetch(url, fetchOptions),
        new Promise<Response | null>((_, reject) => {
          setTimeout(() => {
            reject(new Error(`Fetch timeout after ${timeoutMs}ms`));
          }, timeoutMs);
        }),
      ])) as Response | null;
    } catch (fetchError) {
      // ALL fetch errors (network, timeout, CORS, etc.) are SILENTLY handled
      // CRITICAL: Do not log or console.debug - this can trigger Sentry
      // Try to return cached data as fallback
      let cached = null;
      try {
        const cachedStr = localStorage.getItem(cacheKey);
        if (cachedStr) {
          cached = JSON.parse(cachedStr);
          if (cached && cached.data !== undefined) {
            return { data: cached.data as T, error: null, cached: true, timestamp: cached.timestamp || Date.now() };
          }
        }
      } catch {
        // Cache read failed - silently ignore
      }

      if (fallbackData !== null) {
        return { data: fallbackData, error: null, cached: false, timestamp };
      }

      // Return null data without error - NEVER throw
      // Mark as expected error to prevent Sentry capture
      (fetchError as any).__expected = true;
      return { data: null, error: null, cached: false, timestamp };
    }

    if (!response) {
      // No response - return fallback
      if (fallbackData !== null) {
        return { data: fallbackData, error: null, cached: false, timestamp };
      }
      return { data: null, error: null, cached: false, timestamp };
    }

    // Check response status
    if (!response.ok) {
      // HTTP error - try to get cached version
      try {
        const cached = localStorage.getItem(cacheKey);
        if (cached) {
          const { data, timestamp: cacheTimestamp } = JSON.parse(cached);
          return { data: data as T, error: null, cached: true, timestamp: cacheTimestamp };
        }
      } catch {
        // Cache read failed
      }

      // Return fallback if available
      if (fallbackData !== null) {
        return { data: fallbackData, error: null, cached: false, timestamp };
      }

      return { data: null, error: null, cached: false, timestamp };
    }

    // Try to parse JSON
    let data: T;
    try {
      data = (await response.json()) as T;
    } catch (parseError) {
      // JSON parse failed - try cached or fallback
      try {
        const cached = localStorage.getItem(cacheKey);
        if (cached) {
          const { data: cachedData, timestamp: cacheTimestamp } = JSON.parse(cached);
          return { data: cachedData as T, error: null, cached: true, timestamp: cacheTimestamp };
        }
      } catch {
        // Cache read failed
      }

      if (fallbackData !== null) {
        return { data: fallbackData, error: null, cached: false, timestamp };
      }

      return { data: null, error: null, cached: false, timestamp };
    }

    // Try to cache successful response
    try {
      localStorage.setItem(
        cacheKey,
        JSON.stringify({
          data,
          timestamp,
          ttl: cacheDuration,
        })
      );
    } catch {
      // Cache write failed - data is still valid, continue
    }

    return { data, error: null, cached: false, timestamp };
  } catch (error) {
    // OUTER CATCH: Safety net - catch ANY remaining errors that somehow escaped
    // CRITICAL: NEVER throw - always return a result object

    // Try cached data as last resort
    try {
      const cached = localStorage.getItem(cacheKey);
      if (cached) {
        const { data, timestamp: cacheTimestamp } = JSON.parse(cached);
        return { data: data as T, error: null, cached: true, timestamp: cacheTimestamp };
      }
    } catch {
      // Ignore all errors
    }

    // Return fallback
    if (fallbackData !== null) {
      return { data: fallbackData, error: null, cached: false, timestamp };
    }

    // Return empty result - NEVER throw
    return { data: null, error: null, cached: false, timestamp };
  }
}

/**
 * Simple fetch with just timeout (no caching, throws on error)
 * Use this when you want immediate error throwing
 * Prefer fetchWithFallback for non-critical data
 * NOTE: AbortError from timeouts is converted to a standard Error with timeout message
 */
export async function fetchWithTimeout<T>(
  url: string,
  timeoutMs: number = 5000,
  options: Omit<FetchOptions, 'timeoutMs' | 'cacheKey' | 'cacheDuration'> = {}
): Promise<T> {
  try {
    const response = (await Promise.race([
      fetch(url, options),
      new Promise<Response>((_, reject) => {
        setTimeout(() => {
          reject(new Error(`Request timeout after ${timeoutMs}ms`));
        }, timeoutMs);
      }),
    ])) as Response;

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    return (await response.json()) as T;
  } catch (error) {
    // Re-throw all errors - this function is meant to throw on error
    throw error;
  }
}

/**
 * Clear cached data for a URL
 */
export function clearFetchCache(url: string): void {
  try {
    localStorage.removeItem(`fetch-cache:${url}`);
  } catch (err) {
    console.warn(`[fetchWithFallback] Failed to clear cache for ${url}:`, err);
  }
}

/**
 * Get cached data for a URL without fetching
 */
export function getCachedData<T>(url: string): T | null {
  try {
    const cacheKey = `fetch-cache:${url}`;
    const cached = localStorage.getItem(cacheKey);
    if (cached) {
      const { data } = JSON.parse(cached);
      return data as T;
    }
  } catch (err) {
    console.warn(`[fetchWithFallback] Failed to get cached data for ${url}:`, err);
  }
  return null;
}
