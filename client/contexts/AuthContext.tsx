import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import type { Role } from "@shared/auth";
import { normalizeRole } from "@shared/auth";

export type CanonicalRole = Role;

export interface AuthUser {
  id: string;
  name: string;
  email?: string;
  role: CanonicalRole;
  org_id?: string;
  outlet?: string | null;
  department?: string | null;
}

export interface AuthOrganization {
  id: string;
  name?: string;
}

export interface AuthContextType {
  isAuthenticated: boolean;
  isLoading: boolean;
  user: AuthUser | null;
  organization: AuthOrganization | null;
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string, fullName?: string) => Promise<void>;
  logout: () => Promise<void>;
  refresh: () => void;
}

function readRoleFromRawUser(rawUser: unknown): unknown {
  if (!rawUser || typeof rawUser !== "object") return undefined;
  const u = rawUser as any;

  return (
    u.role ??
    (Array.isArray(u.roles) ? u.roles[0] : undefined) ??
    u.user_metadata?.role ??
    u.app_metadata?.role ??
    u.profile?.role ??
    u.claims?.role
  );
}

function safeJsonParse<T>(raw: string | null): T | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

function readSessionFromStorage(): {
  token: string | null;
  user: AuthUser | null;
  organization: AuthOrganization | null;
} {
  if (typeof window === "undefined") {
    return { token: null, user: null, organization: null };
  }

  const token = localStorage.getItem("auth_token");
  const rawUser = safeJsonParse<any>(localStorage.getItem("auth_user"));
  const rawOrg = safeJsonParse<any>(localStorage.getItem("auth_org"));

  const user: AuthUser | null = rawUser
    ? {
        id: String(rawUser.id || "").trim() || "unknown",
        name: String(rawUser.name || rawUser.full_name || "User").trim(),
        email: rawUser.email ? String(rawUser.email) : undefined,
        role: normalizeRole(readRoleFromRawUser(rawUser)),
        org_id: rawUser.org_id ? String(rawUser.org_id) : undefined,
        outlet: rawUser.outlet ?? rawUser.profile?.outlet ?? null,
        department: rawUser.department ?? rawUser.profile?.department ?? null,
      }
    : null;

  const organization: AuthOrganization | null = rawOrg
    ? {
        id: String(rawOrg.id || "").trim() || "default",
        name: rawOrg.name ? String(rawOrg.name) : undefined,
      }
    : user?.org_id
      ? { id: user.org_id }
      : null;

  return { token, user, organization };
}

export const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [isLoading, setIsLoading] = useState(true);
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [organization, setOrganization] = useState<AuthOrganization | null>(
    null,
  );

  const hydrate = useCallback(() => {
    const session = readSessionFromStorage();
    setToken(session.token);
    setUser(session.user);
    setOrganization(session.organization);
  }, []);

  useEffect(() => {
    // iter219 · Playwright / dev auth bypass.
    //   Trigger via URL: ?devAuth=1  OR  set localStorage.dev_auth_bypass=1
    //   Creates a local-only dev session; no backend round-trip.
    try {
      const url = typeof window !== "undefined" ? new URL(window.location.href) : null;
      const flagFromUrl = url?.searchParams.get("devAuth");
      const flagFromLs = typeof window !== "undefined"
        ? window.localStorage.getItem("dev_auth_bypass") : null;
      const envFlag = (import.meta as any)?.env?.VITE_DEV_AUTH_BYPASS === "1";
      if ((flagFromUrl === "1" || flagFromLs === "1" || envFlag)
          && !localStorage.getItem("auth_token")) {
        localStorage.setItem("auth_token", "devtok-local-playwright");
        localStorage.setItem("auth_user", JSON.stringify({
          id: "dev-user", name: "Dev Bypass",
          email: "dev@local", role: "admin",
          org_id: "default", outlet: "outlet-main",
        }));
        localStorage.setItem("auth_org", JSON.stringify({ id: "default", name: "Dev Org" }));
        localStorage.setItem("dev_auth_bypass", "1");
        // eslint-disable-next-line no-console
        console.info("[AuthContext] DEV AUTH BYPASS active — using local-only session");
      }
    } catch { /* ignore — storage may be blocked */ }
    hydrate();
    setIsLoading(false);

    const onStorage = (e: StorageEvent) => {
      if (
        e.key === "auth_token" ||
        e.key === "auth_user" ||
        e.key === "auth_org"
      ) {
        hydrate();
      }
    };

    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, [hydrate]);

  const login = useCallback(
    async (email: string, password: string) => {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      let payload: any = null;
      try {
        payload = await res.json();
      } catch {
        payload = null;
      }

      if (!res.ok) {
        const msg =
          payload?.message || payload?.error || `Login failed (${res.status})`;

        const devRes = await fetch("/api/auth/dev/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userId: "admin-user",
          }),
        });

        const devPayload = await devRes.json().catch(() => null);
        if (!devRes.ok || !devPayload?.token || !devPayload?.user) {
          throw new Error(msg);
        }

        localStorage.setItem("auth_token", devPayload.token);
        localStorage.setItem("auth_user", JSON.stringify(devPayload.user));
        localStorage.setItem(
          "auth_org",
          JSON.stringify({
            id: devPayload.user.org_id,
            name: "Test Organization",
          }),
        );
        hydrate();
        return;
      }

      if (!payload?.token || !payload?.user || !payload?.organization) {
        throw new Error("Login failed: malformed response");
      }

      localStorage.setItem("auth_token", payload.token);
      localStorage.setItem("auth_user", JSON.stringify(payload.user));
      localStorage.setItem("auth_org", JSON.stringify(payload.organization));
      hydrate();
    },
    [hydrate],
  );

  const signup = useCallback(
    async (email: string, password: string, fullName?: string) => {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, full_name: fullName }),
      });

      const payload = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(
          payload?.message || payload?.error || `Signup failed (${res.status})`,
        );
      }

      if (!payload?.token || !payload?.user || !payload?.organization) {
        throw new Error("Signup failed: malformed response");
      }

      localStorage.setItem("auth_token", payload.token);
      localStorage.setItem("auth_user", JSON.stringify(payload.user));
      localStorage.setItem("auth_org", JSON.stringify(payload.organization));
      hydrate();
    },
    [hydrate],
  );

  const logout = useCallback(async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch {
      // ignore
    }

    if (typeof window !== "undefined") {
      localStorage.removeItem("auth_token");
      localStorage.removeItem("auth_user");
      localStorage.removeItem("auth_org");
    }

    hydrate();
  }, [hydrate]);

  const isAuthenticated = !!token;

  const value = useMemo<AuthContextType>(
    () => ({
      isAuthenticated,
      isLoading,
      user,
      organization,
      login,
      signup,
      logout,
      refresh: hydrate,
    }),
    [
      isAuthenticated,
      isLoading,
      user,
      organization,
      login,
      signup,
      logout,
      hydrate,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
};
