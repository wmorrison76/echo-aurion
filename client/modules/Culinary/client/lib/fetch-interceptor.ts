/**
 * Fetch Interceptor
 * =================
 * Handles CORS errors and other network issues gracefully
 * Prevents third-party API failures from breaking the application
 */

const originalFetch = globalThis.fetch;

// URLs that are known to have CORS issues and should be skipped
const CORS_PROBLEMATIC_URLS = new Set([
  "api.builder.io/projects/github-installs",
  "api.builder.io/projects", // Builder.io integration endpoints
]);

// Local API routes that should not be intercepted
const LOCAL_API_ROUTES = [
  "/api/knowledge",
  "/api/echo",
  "/api/pdf-library",
  "/api/training",
  "/api/terms",
];

/**
 * Check if a URL is known to have CORS issues
 */
function isKnownCORSProblem(url: string): boolean {
  try {
    const urlStr = typeof url === "string" ? url : url.toString();
    return Array.from(CORS_PROBLEMATIC_URLS).some((problematic) =>
      urlStr.includes(problematic),
    );
  } catch {
    return false;
  }
}

/**
 * Enhanced fetch that handles CORS errors gracefully
 */
export const fetchWithCORSHandling = async (
  input: RequestInfo | URL,
  init?: RequestInit,
): Promise<Response> => {
  const urlStr = typeof input === "string" ? input : input.toString();

  // Check if this is a local API route (should not be intercepted)
  const isLocalAPI = LOCAL_API_ROUTES.some((route) => urlStr.includes(route));
  if (isLocalAPI) {
    try {
      return await originalFetch(input, init);
    } catch (error) {
      // Handle local API fetch failures gracefully
      const errorMsg = error instanceof Error ? error.message : String(error);
      console.error(
        `[Fetch Interceptor] Local API fetch failed for ${urlStr}:`,
        error,
      );

      return new Response(
        JSON.stringify({
          error: "Local API unavailable",
          url: urlStr,
          details: errorMsg,
        }),
        {
          status: 503,
          statusText: "Service Unavailable",
          headers: {
            "Content-Type": "application/json",
          },
        },
      );
    }
  }

  // If this is a known CORS problematic URL, return a mock error response
  // instead of making the request
  if (isKnownCORSProblem(urlStr)) {
    console.warn(
      `[CORS Warning] Skipping request to known CORS-problematic URL: ${urlStr}`,
    );
    // Return a mock 403 Forbidden response
    return new Response(
      JSON.stringify({
        error: "CORS Policy: This endpoint is not available in this context",
        url: urlStr,
      }),
      {
        status: 403,
        statusText: "Forbidden",
        headers: {
          "Content-Type": "application/json",
        },
      },
    );
  }

  try {
    // Attempt the original fetch
    const response = await originalFetch(input, init);

    // Check if we got a CORS error
    if (
      !response.ok &&
      (response.status === 0 ||
        response.headers.get("access-control-allow-headers") === null)
    ) {
      console.warn(`[CORS Error] Failed to fetch: ${urlStr}`, response);
      // Return a more user-friendly error response
      return new Response(
        JSON.stringify({
          error: "CORS Error: Unable to access this resource",
          url: urlStr,
          status: response.status,
        }),
        {
          status: response.status || 403,
          statusText: "CORS Error",
          headers: {
            "Content-Type": "application/json",
          },
        },
      );
    }

    return response;
  } catch (error) {
    // Handle all TypeErrors gracefully (CORS, network, etc.)
    if (error instanceof TypeError) {
      const errorMsg = error.message;

      // Determine if it's a CORS error or general network error
      const isCORSError =
        errorMsg.includes("Access-Control") || errorMsg.includes("CORS");
      const isNetworkError =
        errorMsg.includes("Failed to fetch") || errorMsg.includes("fetch");

      const status = isCORSError ? 403 : 500;
      const errorType = isCORSError ? "CORS Error" : "Network Error";

      console.warn(`[${errorType}] ${errorType} for: ${urlStr}`, error);

      return new Response(
        JSON.stringify({
          error: isCORSError
            ? "CORS Error: Unable to access this resource"
            : "Network Error: Unable to reach this endpoint",
          url: urlStr,
          details: errorMsg,
          type: errorType,
        }),
        {
          status,
          statusText: errorType,
          headers: {
            "Content-Type": "application/json",
          },
        },
      );
    }

    // For non-TypeError errors, return a generic error response instead of throwing
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error(`[Fetch Interceptor] Unexpected error for ${urlStr}:`, error);

    return new Response(
      JSON.stringify({
        error: "Request failed",
        url: urlStr,
        details: errorMsg,
      }),
      {
        status: 500,
        statusText: "Internal Server Error",
        headers: {
          "Content-Type": "application/json",
        },
      },
    );
  }
};

/**
 * Install the fetch interceptor globally
 * This should be called during app initialization
 */
export function installFetchInterceptor(): void {
  if (typeof globalThis !== "undefined" && globalThis.fetch) {
    // Only override if not already overridden
    if (globalThis.fetch === originalFetch) {
      (globalThis as any).fetch = fetchWithCORSHandling;
    }
  }
}

export { installFetchInterceptor as default };
