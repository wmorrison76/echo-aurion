/**
 * API Client
 * Fetch wrapper that automatically adds JWT token to all requests
 */

export interface ApiResponse<T = any> {
  status: "success" | "error";
  data?: T;
  error?: string;
  message?: string;
}

/**
 * Get JWT token from storage
 */
function getToken(): string | null {
  if (typeof window === "undefined") {
    return null;
  }
  return localStorage.getItem("auth_token");
}

/**
 * Get org ID from storage
 */
function getOrgId(): string | null {
  if (typeof window === "undefined") {
    return null;
  }

  const org = localStorage.getItem("auth_org");
  if (org) {
    try {
      const parsed = JSON.parse(org);
      if (parsed?.id) return String(parsed.id);
    } catch {
      // ignore
    }
  }

  const user = localStorage.getItem("auth_user");
  if (user) {
    try {
      const parsed = JSON.parse(user);
      if (parsed?.org_id) return String(parsed.org_id);
    } catch {
      // ignore
    }
  }

  return null;
}

/**
 * Get API base URL
 */
function getApiBase(): string {
  if (typeof window !== "undefined") {
    return window.location.origin;
  }
  return process.env.VITE_API_URL || "http://localhost:8080";
}

/**
 * Fetch wrapper with automatic JWT injection
 */
async function fetchWithAuth(
  endpoint: string,
  options: RequestInit = {},
): Promise<Response> {
  const token = getToken();
  const orgId = getOrgId();

  const headers = {
    "Content-Type": "application/json",
    ...options.headers,
  } as Record<string, string>;

  // Add JWT token if available
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  // Add org ID if available
  if (orgId) {
    headers["X-Org-ID"] = orgId;
  }

  const url = endpoint.startsWith("http")
    ? endpoint
    : `${getApiBase()}${endpoint}`;

  const response = await fetch(url, {
    ...options,
    headers,
  }).catch((error) => {
    if (typeof console !== "undefined" && console.debug) {
      console.debug("[API Client] Fetch failed:", error);
    }

    return new Response(JSON.stringify({ error: "Network unavailable" }), {
      status: 503,
      statusText: "Service Unavailable",
      headers: { "Content-Type": "application/json" },
    });
  });

  // Handle 401 - token may be invalid
  if (response.status === 401) {
    // Clear auth in case of unauthorized
    if (typeof window !== "undefined") {
      localStorage.removeItem("auth_token");
      localStorage.removeItem("auth_user");
      localStorage.removeItem("auth_org");
      // Redirect to login
      window.location.href = "/auth?mode=login";
    }
  }

  return response;
}

/**
 * GET request
 */
export async function get<T = any>(
  endpoint: string,
  options?: RequestInit,
): Promise<T> {
  const response = await fetchWithAuth(endpoint, {
    ...options,
    method: "GET",
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.message || `Request failed: ${response.status}`);
  }

  return response.json();
}

/**
 * POST request
 */
export async function post<T = any>(
  endpoint: string,
  data?: any,
  options?: RequestInit,
): Promise<T> {
  const response = await fetchWithAuth(endpoint, {
    ...options,
    method: "POST",
    body: data ? JSON.stringify(data) : undefined,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.message || `Request failed: ${response.status}`);
  }

  return response.json();
}

/**
 * PUT request
 */
export async function put<T = any>(
  endpoint: string,
  data?: any,
  options?: RequestInit,
): Promise<T> {
  const response = await fetchWithAuth(endpoint, {
    ...options,
    method: "PUT",
    body: data ? JSON.stringify(data) : undefined,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.message || `Request failed: ${response.status}`);
  }

  return response.json();
}

/**
 * PATCH request
 */
export async function patch<T = any>(
  endpoint: string,
  data?: any,
  options?: RequestInit,
): Promise<T> {
  const response = await fetchWithAuth(endpoint, {
    ...options,
    method: "PATCH",
    body: data ? JSON.stringify(data) : undefined,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.message || `Request failed: ${response.status}`);
  }

  return response.json();
}

/**
 * DELETE request
 */
export async function del<T = any>(
  endpoint: string,
  options?: RequestInit,
): Promise<T> {
  const response = await fetchWithAuth(endpoint, {
    ...options,
    method: "DELETE",
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.message || `Request failed: ${response.status}`);
  }

  return response.json();
}

/**
 * Export all as default
 */
export default {
  get,
  post,
  put,
  patch,
  del,
  fetch: fetchWithAuth,
};
