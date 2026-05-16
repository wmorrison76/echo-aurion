/** iter250 · Auth context + protected-route guard. Shared by AURION desktop and MyEcho mobile. */
import React from "react";

const API = (window as any).location.origin;
const AUTH_BASE = `${API}/api/auth/jwt`;

function devSuffix(): string {
  try {
    const p = new URLSearchParams(window.location.search);
    if (p.get("devAuth") === "1") return "?devAuth=1";
    // iter256 · Auto-enable devAuth on Emergent preview hosts so the avatar
    // pill (and rest of the auth-gated UI) always has a user to render.
    const host = window.location.hostname || "";
    if (host.includes("preview.emergentagent.com") || host.includes("localhost")) {
      return "?devAuth=1";
    }
  } catch { /* */ }
  return "";
}

// iter255 · Dev-mode profile override. When user clicks "Switch to Director"
// in dev mode, we persist the chosen user_id and inject as a header on every
// request so the backend's get_current_user can resolve to that profile.
function devUserHeader(): Record<string, string> {
  try {
    const overrideId = localStorage.getItem("dev-user-override");
    if (overrideId) return { "X-Dev-User-Id": overrideId };
  } catch { /* ignore */ }
  return {};
}

// Patch global fetch to attach the X-Dev-User-Id header on every same-origin
// request (only when devAuth=1 is in the URL OR we're on a preview host).
// Idempotent.
(function attachDevUserHeader() {
  if (typeof window === "undefined") return;
  if ((window as any).__echoDevHeaderPatched) return;
  const original = window.fetch.bind(window);
  window.fetch = function(input: RequestInfo | URL, init?: RequestInit) {
    try {
      const url = typeof input === "string" ? input : (input as any).url || "";
      const params = new URLSearchParams(window.location.search);
      const host = window.location.hostname || "";
      const devOn = params.get("devAuth") === "1"
                       || host.includes("preview.emergentagent.com")
                       || host.includes("localhost");
      // Only inject for same-origin or relative URLs in dev mode
      const sameOrigin = !url.startsWith("http") || url.startsWith(window.location.origin);
      if (devOn && sameOrigin) {
        init = init || {};
        const headers = new Headers(init.headers || {});
        // iter256 · Always send X-Dev-Auth so backend resolves to a user even
        // when the URL doesn't carry ?devAuth=1 (e.g. fetch("/api/...")).
        headers.set("X-Dev-Auth", "1");
        const overrideId = localStorage.getItem("dev-user-override");
        if (overrideId) headers.set("X-Dev-User-Id", overrideId);
        init.headers = headers;
      }
    } catch { /* ignore */ }
    return original(input, init);
  };
  (window as any).__echoDevHeaderPatched = true;
})();

type User = {
  id: string; email: string; name: string;
  role: string; kind: "salaried" | "hourly";
  department?: string; title?: string;
  // iter266.3 · Auto-scoping fields surfaced from admin_users.
  outlet_ids?: string[];
  modules?: string[];
  is_admin?: boolean;
};

type AuthState = {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<{ ok: boolean; error?: string }>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
};

const AuthCtx = React.createContext<AuthState | null>(null);

function fmtErr(detail: any): string {
  if (detail == null) return "Something went wrong.";
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail))
    return detail.map((e) => (e && typeof e.msg === "string" ? e.msg : JSON.stringify(e))).join(" ");
  if (detail && typeof detail.msg === "string") return detail.msg;
  return String(detail);
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = React.useState<User | null>(null);
  const [loading, setLoading] = React.useState(true);

  const refresh = React.useCallback(async () => {
    try {
      const r = await fetch(`${AUTH_BASE}/me${devSuffix()}`, { credentials: "include" });
      if (r.ok) {
        const j = await r.json();
        setUser(j.user || null);
      } else {
        setUser(null);
      }
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => { refresh(); }, [refresh]);

  const login = React.useCallback(async (email: string, password: string) => {
    try {
      const r = await fetch(`${AUTH_BASE}/login`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const j = await r.json();
      if (r.ok && j.user) {
        setUser(j.user);
        return { ok: true };
      }
      return { ok: false, error: fmtErr(j.detail) };
    } catch (e: any) {
      return { ok: false, error: e?.message || "Network error" };
    }
  }, []);

  const logout = React.useCallback(async () => {
    await fetch(`${AUTH_BASE}/logout`, { method: "POST", credentials: "include" });
    setUser(null);
  }, []);

  const value = React.useMemo(() => ({ user, loading, login, logout, refresh }),
                                          [user, loading, login, logout, refresh]);
  return <AuthCtx.Provider value={value}>{children}</AuthCtx.Provider>;
}

export function useAuth(): AuthState {
  const ctx = React.useContext(AuthCtx);
  if (!ctx) throw new Error("useAuth must be inside <AuthProvider>");
  return ctx;
}

/** Wraps a route — redirects to /login (or /m/login for mobile) if not signed in.
 *  Honors ?devAuth=1 in non-prod (matches backend behavior). */
export function ProtectedRoute({ children, mobileRedirect = false }:
                                            { children: React.ReactNode; mobileRedirect?: boolean }) {
  const { user, loading } = useAuth();
  const params = new URLSearchParams(window.location.search);
  const devBypass = params.get("devAuth") === "1";

  if (loading) {
    return <div style={{
      minHeight: "100vh", display: "flex", alignItems: "center",
      justifyContent: "center", background: "#04060d", color: "#94a3b8",
      fontFamily: "system-ui, sans-serif",
    }}>Loading…</div>;
  }

  if (!user && !devBypass) {
    const target = mobileRedirect ? "/m/login" : "/login";
    const next = encodeURIComponent(window.location.pathname + window.location.search);
    window.location.replace(`${target}?next=${next}`);
    return null;
  }

  return <>{children}</>;
}
