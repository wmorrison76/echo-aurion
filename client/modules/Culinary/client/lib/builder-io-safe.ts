/**
 * Safe Builder.io API Wrapper
 * ===========================
 * Handles Builder.io API calls with graceful error handling
 * Prevents CORS and other errors from breaking the application
 */

/**
 * Safe wrapper for Builder.io API calls
 * Handles CORS errors and network issues gracefully
 */
export async function safeBuilderIOFetch<T = any>(
  endpoint: string,
  options?: RequestInit,
): Promise<{ data: T | null; error: Error | null; status: number }> {
  try {
    const url =
      endpoint.startsWith("http") || endpoint.startsWith("https")
        ? endpoint
        : `https://api.builder.io${endpoint}`;

    const response = await fetch(url, {
      ...options,
      // Remove User-Agent header if present to avoid CORS issues
      headers: {
        ...(options?.headers || {}),
        // Don't explicitly set User-Agent - let the browser handle it
        // But ensure we don't send forbidden headers
      },
    });

    if (!response.ok) {
      console.warn(`Builder.io API error: ${response.status} ${response.statusText}`);
      return {
        data: null,
        error: new Error(
          `Builder.io API error: ${response.status} ${response.statusText}`,
        ),
        status: response.status,
      };
    }

    const data = (await response.json()) as T;
    return { data, error: null, status: response.status };
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));
    console.warn(`Builder.io API call failed: ${err.message}`);

    // Log CORS-specific errors
    if (err.message.includes("Access-Control") || err.message.includes("CORS")) {
      console.warn(
        "CORS issue detected with Builder.io API. This is expected in some environments.",
      );
    }

    return {
      data: null,
      error: err,
      status: 0,
    };
  }
}

/**
 * Safely get GitHub installations from Builder.io
 * This endpoint is known to have CORS issues, so we handle them gracefully
 */
export async function getBuilderIOGitHubInstallations(
  apiKey: string,
): Promise<{ installations: any[]; error: Error | null }> {
  const result = await safeBuilderIOFetch(
    `/projects/github-installs?apiKey=${encodeURIComponent(apiKey)}`,
  );

  if (result.error) {
    console.warn(
      "Failed to fetch GitHub installations from Builder.io. The feature may not be available in this environment.",
      result.error,
    );
  }

  return {
    installations: result.data?.installations || [],
    error: result.error,
  };
}

/**
 * Safely get Builder.io project information
 */
export async function getBuilderIOProject(
  projectId: string,
  apiKey: string,
): Promise<{ project: any | null; error: Error | null }> {
  const result = await safeBuilderIOFetch(
    `/projects/${projectId}?apiKey=${encodeURIComponent(apiKey)}`,
  );

  return {
    project: result.data || null,
    error: result.error,
  };
}

/**
 * Check if a URL is a Builder.io API endpoint
 */
export function isBuilderIOEndpoint(url: string): boolean {
  return url.includes("api.builder.io") || url.includes("cdn.builder.io");
}

/**
 * Handle Builder.io API errors safely
 * This can be used as an error boundary or error handler
 */
export function handleBuilderIOError(
  error: Error,
  context?: string,
): { handled: boolean; message: string } {
  const message = error.message || String(error);

  if (
    message.includes("Access-Control") ||
    message.includes("CORS") ||
    message.includes("github-installs")
  ) {
    console.warn(
      `Builder.io API CORS issue${context ? ` in ${context}` : ""}: ${message}`,
    );
    return {
      handled: true,
      message:
        "This feature is temporarily unavailable. Please try refreshing the page.",
    };
  }

  if (message.includes("api.builder.io")) {
    console.warn(
      `Builder.io API error${context ? ` in ${context}` : ""}: ${message}`,
    );
    return {
      handled: true,
      message: "Unable to connect to Builder.io services. Please try again later.",
    };
  }

  return {
    handled: false,
    message: message,
  };
}
