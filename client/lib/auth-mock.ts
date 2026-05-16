/**
 * Mock Authentication System
 * Used for development and testing before full auth system is implemented
 * Provides test JWT tokens with valid org_id and user roles
 */

export interface MockUser {
  id: string;
  name: string;
  email: string;
  role: "admin" | "manager" | "staff" | "receiver";
  org_id: string;
}

export interface MockOrg {
  id: string;
  name: string;
}

// Test organizations
const TEST_ORGS: Record<string, MockOrg> = {
  "org-test-001": {
    id: "org-test-001",
    name: "Test Organization",
  },
};

// Test users
const TEST_USERS: Record<string, MockUser> = {
  "admin-user": {
    id: "admin-user",
    name: "William Morrison",
    email: "william@admin.local",
    role: "admin",
    org_id: "org-test-001",
  },
  "manager-user": {
    id: "manager-user",
    name: "Manager User",
    email: "manager@test.local",
    role: "manager",
    org_id: "org-test-001",
  },
  "staff-user": {
    id: "staff-user",
    name: "Staff User",
    email: "staff@test.local",
    role: "staff",
    org_id: "org-test-001",
  },
};

/**
 * Generate a mock JWT token for testing
 * NOTE: This generates a JWT structure compatible with the server's JWTService
 * For production, use proper OAuth2/JWT provider
 *
 * This function is a fallback if the server's dev endpoint is not available.
 * It creates a simple JWT that includes the role for RBAC testing.
 */
export function generateMockJWT(userId: string): string | null {
  const user = TEST_USERS[userId];
  if (!user) return null;

  const now = Math.floor(Date.now() / 1000);

  const header = btoa(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const payload = btoa(
    JSON.stringify({
      sub: user.id,
      email: user.email,
      role: user.role,
      org_id: user.org_id,
      iat: now,
      exp: now + 2592000, // 30 days
      aud: "hospitality-suite-users",
      iss: "hospitality-suite",
    }),
  );
  const signature = btoa("development-mock-signature");

  return `${header}.${payload}.${signature}`;
}

let mockLoginInProgress = false;
let currentLoginPromise: Promise<boolean> | null = null;

/**
 * Mock login function
 * Fetches a real JWT token from the server's development endpoint
 * Falls back to generating a local JWT if the API is unavailable
 * Sets auth_token and auth_org in localStorage
 */
export async function mockLogin(userId: string): Promise<boolean> {
  const user = TEST_USERS[userId];
  if (!user) return false;

  if (currentLoginPromise) {
    return currentLoginPromise;
  }

  currentLoginPromise = (async () => {
    mockLoginInProgress = true;
    try {
      // Try to call the development endpoint to get a real JWT
      try {
        const loginRequest = fetch("/api/auth/dev/login", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ userId }),
        }).catch(() => null);
        const timeout = new Promise<null>((resolve) => {
          setTimeout(() => {
            resolve(null);
          }, 3000);
        });
        const response = await Promise.race([loginRequest, timeout]);
        if (!response) {
          throw new Error("Auth request timeout after 3000ms");
        }

        if (response.ok) {
          const data = await response.json();
          const token = data.token;

          if (token) {
            // Set auth token
            localStorage.setItem("auth_token", token);

            // Set auth org
            const org = TEST_ORGS[user.org_id];
            if (org) {
              localStorage.setItem(
                "auth_org",
                JSON.stringify({ id: org.id, name: org.name }),
              );
            }
            // Set auth user
            localStorage.setItem("auth_user", JSON.stringify(user));

            console.log("[Auth Mock] Successfully logged in with server JWT");
            return true;
          }
        }

        // API responded but with error or no token
        console.debug(
          "[Auth Mock] API returned error or no token, using fallback JWT"
        );
      } catch (apiError) {
        // Network error or timeout - fall through to fallback
        console.debug(
          "[Auth Mock] API unavailable, using fallback JWT:",
          apiError instanceof Error ? apiError.message : String(apiError)
        );
      }

      // Fallback: Generate a local JWT if API is unavailable
      const token = generateMockJWT(userId);
      if (!token) {
        console.error("[Auth Mock] Failed to generate fallback JWT");
        return false;
      }

      console.log("[Auth Mock] Using fallback JWT for offline mode");

      // Set auth token
      localStorage.setItem("auth_token", token);

      // Set auth org
      const org = TEST_ORGS[user.org_id];
      if (org) {
        localStorage.setItem(
          "auth_org",
          JSON.stringify({ id: org.id, name: org.name }),
        );
      }
      // Set auth user
      localStorage.setItem("auth_user", JSON.stringify(user));

      return true;
    } catch (error) {
      console.error("[Auth Mock] Unexpected login error:", error);
      return false;
    } finally {
      mockLoginInProgress = false;
      currentLoginPromise = null;
    }
  })();

  return currentLoginPromise;
}

/**
 * Mock logout function
 * Clears auth data from localStorage
 */
export function mockLogout(): void {
  localStorage.removeItem("auth_token");
  localStorage.removeItem("auth_org");
  localStorage.removeItem("auth_user");
}

/**
 * Get current authenticated user
 */
export function getAuthUser(): MockUser | null {
  const stored = localStorage.getItem("auth_user");
  if (!stored) return null;
  try {
    return JSON.parse(stored);
  } catch {
    return null;
  }
}

/**
 * Get all available test users for login UI
 */
export function getTestUsers(): MockUser[] {
  return Object.values(TEST_USERS);
}

/**
 * Check if user is authenticated
 * Also validates that the token contains a role for RBAC
 */
export function isAuthenticated(): boolean {
  const token = localStorage.getItem("auth_token");
  const org = localStorage.getItem("auth_org");

  if (!token || !org) {
    return false;
  }

  // Verify token contains role claim (for RBAC)
  // Tokens are in format: header.payload.signature
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return false;

    // Use atob (browser-compatible) to decode base64url
    // Need to add padding for atob
    let encodedPayload = parts[1];
    encodedPayload = encodedPayload.replace(/-/g, "+").replace(/_/g, "/");
    const padding =
      encodedPayload.length % 4 === 0
        ? ""
        : "=".repeat(4 - (encodedPayload.length % 4));
    const decodedPayload = atob(encodedPayload + padding);
    const payload = JSON.parse(decodedPayload);

    const hasRole = !!payload.role && payload.role !== "MISSING";

    if (!hasRole) {
      // Token exists but has no role - clear and re-authenticate
      localStorage.removeItem("auth_token");
      localStorage.removeItem("auth_user");
      localStorage.removeItem("auth_org");
      return false;
    }

    return true;
  } catch (error) {
    // Invalid token format - clear and return false
    localStorage.removeItem("auth_token");
    localStorage.removeItem("auth_user");
    localStorage.removeItem("auth_org");
    return false;
  }
}

export default {
  mockLogin,
  mockLogout,
  getAuthUser,
  getTestUsers,
  isAuthenticated,
  generateMockJWT,
};
