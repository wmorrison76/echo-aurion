/**
 * Safe Fetch Wrapper
 *
 * CRITICAL: This wrapper ensures fetch NEVER throws errors that escape to Sentry
 * All network errors are handled gracefully and returned as error objects
 */

interface SafeFetchResult<T> {
  data: T | null;
  ok: boolean;
  status: number;
  error: Error | null;
}

/**
 * Safe fetch that NEVER throws
 * Always returns a result object with data or error
 * @param url URL to fetch
 * @param init Fetch options
 * @param fallbackData Optional fallback data if fetch fails
 * @returns SafeFetchResult with data or error
 */
export async function safeFetch<T = any>(
  url: string,
  init?: RequestInit,
  fallbackData: T | null = null
): Promise<SafeFetchResult<T>> {
  try {
    const response = await fetch(url, init).catch((err) => {
      // Catch fetch promise rejection immediately
      console.debug('[safeFetch] Fetch promise rejected:', err);
      // Return error object - never throw
      throw new SafeFetchError('Network error', 0, err);
    });

    // Check if response is ok
    if (!response.ok) {
      return {
        data: fallbackData,
        ok: false,
        status: response.status,
        error: new Error(`HTTP ${response.status}: ${response.statusText}`),
      };
    }

    // Try to parse JSON
    try {
      const data = (await response.json()) as T;
      return {
        data,
        ok: true,
        status: response.status,
        error: null,
      };
    } catch (parseErr) {
      return {
        data: fallbackData,
        ok: false,
        status: response.status,
        error: parseErr instanceof Error ? parseErr : new Error('JSON parse failed'),
      };
    }
  } catch (err) {
    // Catch ANY error that somehow escaped
    const error = err instanceof Error ? err : new Error(String(err));
    
    // Never throw - always return error object
    return {
      data: fallbackData,
      ok: false,
      status: 0,
      error,
    };
  }
}

/**
 * Marker class for safe fetch errors
 */
class SafeFetchError extends Error {
  constructor(message: string, status: number, originalError: any) {
    super(message);
    this.name = 'SafeFetchError';
  }
}

/**
 * Safe fetch helper for JSON endpoints that handles common patterns
 */
export async function safeFetchJson<T = any>(
  url: string,
  options: RequestInit = {},
  fallback: T | null = null
): Promise<T | null> {
  const result = await safeFetch<T>(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  }, fallback);

  if (result.error) {
    console.debug(`[safeFetchJson] Failed to fetch ${url}:`, result.error);
  }

  return result.data || fallback;
}

/**
 * Safe batch fetch for multiple URLs
 */
export async function safeFetchBatch<T = any>(
  urls: string[],
  init?: RequestInit,
  fallbackData: T | null = null
): Promise<(T | null)[]> {
  const results = await Promise.all(
    urls.map((url) => safeFetch<T>(url, init, fallbackData))
  );

  return results.map((r) => r.data || fallbackData);
}
