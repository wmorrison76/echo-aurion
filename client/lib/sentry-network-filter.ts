/**
 * Sentry Network Error Filter
 * Suppresses expected network errors to reduce noise in error logs
 * Allows legitimate errors to still be reported
 */

/**
 * Determine if an error is an expected network failure
 * These errors are handled gracefully by the app with fallback data
 */
export function isExpectedNetworkError(error: any): boolean {
  if (!error) return false;

  const message = error?.message || error?.toString() || '';
  const errorString = JSON.stringify(error).toLowerCase();

  // Known network failures that are handled gracefully
  const expectedPatterns = [
    // Fetch-specific errors
    'failed to fetch',
    'networkerror',
    'a network error occurred',
    'network request failed',
    'the network connection was lost',
    'network error',
    'network unavailable',
    
    // Service unavailability (expected when backend is down)
    'service unavailable',
    'service_unavailable',
    '503',
    '502',
    '504',
    
    // Timeout errors (handled with fallback)
    'timeout',
    'timed out',
    'aborted',
    'abort error',
    
    // Connection errors
    'connection refused',
    'econnrefused',
    'enotfound',
    'getaddrinfo',
    
    // CORS and fetch-related
    'cors',
    'cross-origin',
    'blocked by cors policy',
    
    // Database/API connection errors
    'database unavailable',
    'api unavailable',
    'fetch failed',
    'http error',
  ];

  // Check if error matches any expected pattern
  for (const pattern of expectedPatterns) {
    if (message.toLowerCase().includes(pattern) ||
        errorString.includes(pattern)) {
      return true;
    }
  }

  return false;
}

/**
 * Install Sentry before hook to filter network errors
 * Call this after Sentry is initialized
 */
export function installSentryNetworkFilter(Sentry: any): void {
  if (!Sentry?.addEventProcessor) return;

  Sentry.addEventProcessor((event: any, hint: any) => {
    // Check if this is a network error
    const error = hint?.originalException;
    
    if (isExpectedNetworkError(error)) {
      // Suppress expected network errors
      console.debug('[Sentry Filter] Suppressing expected network error:', {
        message: error?.message,
        type: error?.constructor?.name,
      });
      return null; // Return null to prevent sending to Sentry
    }

    // Allow other errors through
    return event;
  });

  console.debug('[Sentry] Network error filter installed');
}

export default {
  isExpectedNetworkError,
  installSentryNetworkFilter,
};
