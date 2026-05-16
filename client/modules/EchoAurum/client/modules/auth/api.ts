import type {
  SessionEnvelope,
  SessionPersona,
} from "../../../../shared/session";
import { fetchWithRetry } from "@/lib/fetch-with-retry";

const SESSION_STORAGE_KEY = "luccca.auth.sessionToken";
function isBrowser() {
  return (
    typeof window !== "undefined" && typeof window.localStorage !== "undefined"
  );
}
export function getStoredSessionToken() {
  if (!isBrowser()) {
    return null;
  }
  return window.localStorage.getItem(SESSION_STORAGE_KEY);
}
export function storeSessionToken(token: string | null) {
  if (!isBrowser()) {
    return;
  }
  if (!token) {
    window.localStorage.removeItem(SESSION_STORAGE_KEY);
  } else {
    window.localStorage.setItem(SESSION_STORAGE_KEY, token);
  }
}
function isJwtLike(token: string) {
  const parts = token.split(".");
  return parts.length === 3 && parts.every((part) => part.length > 0);
}
function buildHeaders(init?: HeadersInit, token?: string) {
  const headers = new Headers(init ?? {});
  if (token) {
    if (isJwtLike(token)) {
      headers.set("Authorization", `Bearer ${token}`);
    } else {
      headers.set("X-LUCCCA-Session", token);
    }
  }
  return headers;
}
export async function fetchSession(
  token: string,
): Promise<SessionEnvelope | null> {
  try {
    const response = await fetchWithRetry("/api/auth/session", {
      method: "GET",
      headers: buildHeaders(undefined, token),
      maxRetries: 2,
      timeout: 10000,
      fallback: null,
    });

    if (!response || response.status === 401 || response.status === 499 || response.status === 503) {
      return null;
    }
    if (!response.ok) {
      const errorBody = await response.json().catch(() => ({}));
      const message =
        typeof errorBody?.error === "string"
          ? errorBody.error
          : "Unable to resolve session.";
      throw new Error(message);
    }
    const payload = (await response.json()) as { session: SessionEnvelope };
    return payload.session;
  } catch (error) {
    console.warn("[Auth] fetchSession failed:", error);
    return null;
  }
}
export async function createSession(personaId: string) {
  try {
    const response = await fetchWithRetry("/api/auth/session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ personaId }),
      maxRetries: 2,
      timeout: 10000,
      fallback: null,
    });

    // If response is null (network failure), return null gracefully
    if (!response) {
      console.debug("[Auth] createSession: Network error, returning null");
      return null;
    }

    // If the backend is unavailable, fail quietly so session bootstrap does not surface noise
    if (!response.ok) {
      if ([499, 502, 503, 504].includes(response.status)) {
        return null;
      }

      try {
        const errorBody = await response.json();
        const message =
          typeof errorBody?.error === "string"
            ? errorBody.error
            : `HTTP ${response.status}: Unable to create session.`;
        throw new Error(message);
      } catch {
        // If we can't parse error response, just throw generic error
        throw new Error(`HTTP ${response.status}: Unable to create session.`);
      }
    }

    const payload = (await response.json()) as { session: SessionEnvelope };
    return payload.session;
  } catch (error) {
    console.debug("[Auth] createSession failed; returning null", error);
    return null;
  }
}
export async function revokeSession(token: string) {
  try {
    await fetchWithRetry("/api/auth/session", {
      method: "DELETE",
      headers: buildHeaders(undefined, token),
      maxRetries: 1,
      timeout: 5000,
    });
  } catch (error) {
    console.warn("[Auth] revokeSession failed:", error);
    // Silently fail - revocation is not critical
  }
}
export async function fetchPersonas(): Promise<SessionPersona[]> {
  try {
    const response = await fetchWithRetry("/api/auth/personas", {
      maxRetries: 2,
      timeout: 10000,
      fallback: null,
    });

    if (!response?.ok) {
      if (response?.status === 499 || response?.status === 503) {
        return [];
      }
      const errorBody = await response.json().catch(() => ({}));
      const message =
        typeof errorBody?.error === "string"
          ? errorBody.error
          : "Unable to load personas.";
      throw new Error(message);
    }
    const payload = (await response.json()) as { personas?: SessionPersona[] };
    return Array.isArray(payload.personas) ? payload.personas : [];
  } catch (error) {
    console.warn("[Auth] fetchPersonas failed:", error);
    return [];
  }
}
export function buildAuthHeaders(init?: HeadersInit) {
  const token = getStoredSessionToken();
  return buildHeaders(init, token ?? undefined);
}
export async function fetchWithSession(
  input: RequestInfo | URL,
  init: RequestInit = {},
) {
  const headers = buildAuthHeaders(init.headers ?? undefined);
  return fetch(input, {
    ...init,
    headers,
    credentials: init.credentials ?? "same-origin",
  });
}
export async function fetchWithLucccaSession(
  input: RequestInfo | URL,
  init: RequestInit = {},
) {
  const token = getStoredSessionToken();
  const headers = new Headers(init.headers ?? undefined);
  if (token) {
    headers.set("X-LUCCCA-Session", token);
  }
  if (!headers.has("Content-Type") && init.body) {
    headers.set("Content-Type", "application/json");
  }
  return fetch(input, {
    ...init,
    headers,
    credentials: init.credentials ?? "same-origin",
  });
}
