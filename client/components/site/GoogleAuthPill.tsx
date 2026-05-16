/**
 * iter177 · Phase 6 · Google Auth Pill
 *
 * REMINDER: DO NOT HARDCODE THE URL, OR ADD ANY FALLBACKS OR REDIRECT URLS — THIS BREAKS THE AUTH.
 *
 * Renders a floating top-right pill that either:
 *   - shows "Sign in" when unauthenticated (launches Emergent-managed Google OAuth)
 *   - shows the user's avatar + name when authenticated, with a sign-out menu
 *
 * Also handles the one-time session_id exchange when we land back at
 * `{origin}/auth/callback#session_id=...`. The hash check runs synchronously
 * on first render (NOT in useEffect) to avoid race conditions with the rest
 * of the app reading `/api/auth/me` before we've established a session.
 */
import React, { useEffect, useRef, useState } from "react";
import { NotificationPrefsRow } from "./NotificationPrefsRow";

const API = (): string => {
  const env = (import.meta as any).env || {};
  return env.VITE_REACT_APP_BACKEND_URL || env.REACT_APP_BACKEND_URL || env.VITE_BACKEND_URL || "";
};

type AuthUser = {
  user_id: string; email: string; name?: string; picture?: string;
  session_token?: string;
};
type AuthResp = {
  ok: boolean;
  user: AuthUser;
  employee_match: null | {
    id: string; display_name: string; department: string; role: string;
    title?: string; job_profile_code?: string; job_profile_title?: string;
    hire_date?: string; birthday?: string;
  };
};

const LS_TOKEN = "echoai3_session_token";

function getStoredToken(): string | null {
  try { return localStorage.getItem(LS_TOKEN); } catch { return null; }
}
function setStoredToken(t: string | null) {
  try { if (t) localStorage.setItem(LS_TOKEN, t); else localStorage.removeItem(LS_TOKEN); } catch {}
}

export function GoogleAuthPill() {
  const [state, setState] = useState<"checking" | "anon" | "authed">("checking");
  const [auth, setAuth] = useState<AuthResp | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const exchanged = useRef(false);

  // Synchronous hash check — fire exchange on first render, only once.
  // This prevents the race where AuthProvider would call /api/auth/me before
  // the session cookie exists, yielding a 401 + infinite sign-in bounce.
  if (!exchanged.current && typeof window !== "undefined" && window.location.hash.includes("session_id=")) {
    exchanged.current = true;
    const match = window.location.hash.match(/session_id=([^&]+)/);
    const sid = match ? decodeURIComponent(match[1]) : "";
    if (sid) {
      (async () => {
        try {
          const r = await fetch(`${API()}/api/auth/session`, {
            method: "POST", credentials: "include",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ session_id: sid }),
          });
          if (r.ok) {
            const j: AuthResp = await r.json();
            if (j.user?.session_token) setStoredToken(j.user.session_token);
            setAuth(j);
            setState("authed");
            // Notify any listeners (e.g. MySchedule) and clean the URL
            try { window.dispatchEvent(new CustomEvent("echo:auth:signed-in", { detail: j })); } catch {}
          } else {
            setState("anon");
          }
        } catch {
          setState("anon");
        } finally {
          // Strip #session_id=... from URL so refresh doesn't retry
          try {
            const clean = window.location.pathname + window.location.search;
            window.history.replaceState({}, "", clean);
          } catch {}
        }
      })();
    }
  }

  // Standard /me check for returning visitors.
  useEffect(() => {
    // If we're mid-exchange (hash present), skip /me call — exchange handles it.
    if (typeof window !== "undefined" && window.location.hash.includes("session_id=")) return;
    (async () => {
      try {
        const tok = getStoredToken();
        const r = await fetch(`${API()}/api/auth/me`, {
          credentials: "include",
          headers: tok ? { Authorization: `Bearer ${tok}` } : {},
        });
        if (r.ok) {
          const j: AuthResp = await r.json();
          setAuth(j);
          setState("authed");
          try { window.dispatchEvent(new CustomEvent("echo:auth:signed-in", { detail: j })); } catch {}
        } else {
          setState("anon");
        }
      } catch { setState("anon"); }
    })();
  }, []);

  function signIn() {
    // REMINDER: DO NOT HARDCODE THE URL, OR ADD ANY FALLBACKS OR REDIRECT URLS — THIS BREAKS THE AUTH.
    const redirectUrl = window.location.origin + "/auth/callback";
    window.location.href = `https://auth.emergentagent.com/?redirect=${encodeURIComponent(redirectUrl)}`;
  }

  async function signOut() {
    try {
      const tok = getStoredToken();
      await fetch(`${API()}/api/auth/logout`, {
        method: "POST", credentials: "include",
        headers: tok ? { Authorization: `Bearer ${tok}` } : {},
      });
    } catch {}
    setStoredToken(null);
    setAuth(null);
    setState("anon");
    setMenuOpen(false);
    try { window.dispatchEvent(new CustomEvent("echo:auth:signed-out")); } catch {}
  }

  if (state === "checking") return null;

  if (state === "anon") {
    return (
      <button
        data-testid="auth-sign-in-btn"
        onClick={signIn}
        className="hidden lg:flex fixed items-center gap-2 z-[2147482500]"
        style={{
          top: 12, right: 12,
          padding: "6px 14px", borderRadius: 999,
          background: "linear-gradient(180deg, rgba(200,169,126,0.22), rgba(200,169,126,0.08))",
          border: "1px solid rgba(200,169,126,0.55)",
          backdropFilter: "blur(10px)",
          boxShadow: "0 4px 16px rgba(0,0,0,0.25)",
          color: "#c8a97e", fontSize: 11, fontWeight: 700,
          letterSpacing: 1, textTransform: "uppercase",
          cursor: "pointer",
        }}
        title="Sign in with your Google work account"
      >
        <GoogleGlyph />
        <span>Sign In</span>
      </button>
    );
  }

  // authed
  const u = auth?.user;
  const emp = auth?.employee_match;
  return (
    <div
      className="hidden lg:flex fixed items-center"
      style={{ top: 12, right: 12, zIndex: 2147482500 }}
    >
      <button
        data-testid="auth-user-pill"
        onClick={() => setMenuOpen((v) => !v)}
        className="flex items-center gap-2"
        style={{
          padding: "4px 12px 4px 4px", borderRadius: 999,
          background: "linear-gradient(180deg, rgba(200,169,126,0.22), rgba(200,169,126,0.08))",
          border: "1px solid rgba(200,169,126,0.55)",
          backdropFilter: "blur(10px)",
          boxShadow: "0 4px 16px rgba(0,0,0,0.25)",
          color: "#c8a97e", cursor: "pointer",
        }}
      >
        {u?.picture ? (
          <img src={u.picture} alt="" width={26} height={26} style={{ borderRadius: "50%", objectFit: "cover" }} />
        ) : (
          <div style={{ width: 26, height: 26, borderRadius: "50%", background: "#c8a97e22", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 800 }}>
            {(u?.name || u?.email || "?").slice(0, 1).toUpperCase()}
          </div>
        )}
        <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: 0.4, maxWidth: 140, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {u?.name || u?.email}
        </span>
      </button>

      {menuOpen && (
        <div
          data-testid="auth-user-menu"
          style={{
            position: "absolute", top: 42, right: 0, minWidth: 260,
            background: "rgba(10,14,26,0.97)", color: "#f8fafc",
            border: "1px solid rgba(200,169,126,0.4)", borderRadius: 10,
            padding: 12, boxShadow: "0 10px 40px rgba(0,0,0,0.5)",
          }}
        >
          <div style={{ fontSize: 12, color: "#f8fafc", fontWeight: 700 }}>{u?.name}</div>
          <div style={{ fontSize: 10, color: "#94a3b8", marginTop: 2 }}>{u?.email}</div>
          {emp ? (
            <div data-testid="auth-employee-match" style={{ marginTop: 10, padding: 8, background: "rgba(34,197,94,0.08)", border: "1px solid rgba(34,197,94,0.3)", borderRadius: 6 }}>
              <div style={{ fontSize: 9, letterSpacing: 2, color: "#86efac", fontWeight: 700, textTransform: "uppercase" }}>Employee matched</div>
              <div style={{ fontSize: 12, color: "#f8fafc", marginTop: 3 }}>{emp.display_name}</div>
              <div style={{ fontSize: 10, color: "#cbd5e1" }}>{emp.title || emp.role} · {emp.department}</div>
              {emp.job_profile_title && <div style={{ fontSize: 10, color: "#67e8f9", marginTop: 3 }}>🎯 {emp.job_profile_title}</div>}
            </div>
          ) : (
            <div data-testid="auth-employee-missing" style={{ marginTop: 10, padding: 8, background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.3)", borderRadius: 6, fontSize: 10, color: "#fca5a5" }}>
              No employee record matches this email. Ask an admin to add you with <code>{u?.email}</code>.
            </div>
          )}
          <OutlookRow />
          <NotificationPrefsRow userId={u?.email || u?.user_id || "anon-test"} />
          <button
            data-testid="auth-sign-out-btn"
            onClick={signOut}
            style={{
              marginTop: 12, width: "100%", padding: "8px 12px", borderRadius: 6,
              background: "transparent", color: "#fca5a5",
              border: "1px solid rgba(239,68,68,0.4)",
              fontSize: 11, fontWeight: 700, letterSpacing: 1,
              textTransform: "uppercase", cursor: "pointer",
            }}
          >
            Sign out
          </button>
        </div>
      )}
    </div>
  );
}

function GoogleGlyph() {
  return (
    <svg width="14" height="14" viewBox="0 0 48 48" aria-hidden>
      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
    </svg>
  );
}

// iter180 · Outlook Connect row — inline with auth popover
function OutlookRow() {
  const [status, setStatus] = useState<{ configured: boolean; connected: boolean; outlook_email?: string } | null>(null);
  const [busy, setBusy] = useState<"pull" | "disconnect" | null>(null);

  async function load() {
    try {
      const tok = getStoredToken();
      const r = await fetch(`${API()}/api/outlook/status`, {
        credentials: "include",
        headers: tok ? { Authorization: `Bearer ${tok}` } : {},
      });
      if (r.ok) setStatus(await r.json());
    } catch {}
  }
  useEffect(() => { load(); }, []);

  function connect() {
    window.location.href = `${API()}/api/outlook/authorize`;
  }

  async function pull() {
    setBusy("pull");
    try {
      const tok = getStoredToken();
      const r = await fetch(`${API()}/api/outlook/sync/pull`, {
        method: "POST", credentials: "include",
        headers: tok ? { Authorization: `Bearer ${tok}` } : {},
      });
      if (r.ok) { const j = await r.json(); alert(`Synced ${j.synced} events from Outlook`); }
      else alert("Sync failed: " + await r.text());
    } finally { setBusy(null); }
  }

  async function disconnect() {
    if (!confirm("Disconnect Outlook?")) return;
    setBusy("disconnect");
    try {
      const tok = getStoredToken();
      await fetch(`${API()}/api/outlook/disconnect`, {
        method: "POST", credentials: "include",
        headers: tok ? { Authorization: `Bearer ${tok}` } : {},
      });
      await load();
    } finally { setBusy(null); }
  }

  if (!status) return null;

  if (!status.configured) {
    return (
      <div data-testid="outlook-not-configured" style={{
        marginTop: 10, padding: 8, background: "rgba(251,191,36,0.08)",
        border: "1px solid rgba(251,191,36,0.3)", borderRadius: 6, fontSize: 10, color: "#fcd34d",
      }}>
        <div style={{ fontSize: 9, letterSpacing: 2, fontWeight: 700, textTransform: "uppercase", marginBottom: 3 }}>Outlook · Not configured</div>
        Admin needs to set <code style={{ background: "rgba(0,0,0,0.3)", padding: "0 4px", borderRadius: 3 }}>AZURE_CLIENT_ID / SECRET / TENANT_ID</code> in backend/.env.
      </div>
    );
  }

  if (!status.connected) {
    return (
      <button data-testid="outlook-connect" onClick={connect} style={{
        marginTop: 10, width: "100%", padding: "8px 12px", borderRadius: 6,
        background: "linear-gradient(90deg, rgba(0,120,212,0.2), rgba(0,120,212,0.05))",
        color: "#7dd3fc", border: "1px solid rgba(0,120,212,0.5)",
        fontSize: 11, fontWeight: 700, letterSpacing: 1, textTransform: "uppercase", cursor: "pointer",
        display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
      }}>
        <OutlookGlyph /> Connect my Outlook
      </button>
    );
  }

  return (
    <div data-testid="outlook-connected" style={{ marginTop: 10, padding: 8, background: "rgba(0,120,212,0.08)", border: "1px solid rgba(0,120,212,0.3)", borderRadius: 6 }}>
      <div style={{ fontSize: 9, letterSpacing: 2, fontWeight: 700, textTransform: "uppercase", color: "#7dd3fc", display: "flex", alignItems: "center", gap: 6 }}>
        <OutlookGlyph /> Outlook · Connected
      </div>
      <div style={{ fontSize: 10, color: "#cbd5e1", marginTop: 3 }}>{status.outlook_email || ""}</div>
      <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
        <button data-testid="outlook-pull" onClick={pull} disabled={busy === "pull"} style={S_OUT.smallBtn}>{busy === "pull" ? "Syncing…" : "Sync now"}</button>
        <button data-testid="outlook-disconnect" onClick={disconnect} disabled={busy === "disconnect"} style={{ ...S_OUT.smallBtn, borderColor: "rgba(239,68,68,0.4)", color: "#fca5a5" }}>Disconnect</button>
      </div>
    </div>
  );
}

function OutlookGlyph() {
  return (
    <svg width="14" height="14" viewBox="0 0 32 32" aria-hidden>
      <path fill="#0078D4" d="M30 8H16v16h14c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2z"/>
      <path fill="#50D9FF" d="M23 12h-4v3h4v-3zm0 5h-4v3h4v-3z"/>
      <path fill="#0078D4" d="M2 6v20l14 2V4L2 6z"/>
      <path fill="#fff" d="M9 20c-1.3 0-2.3-.4-3-1.3-.7-.9-1-2-1-3.4 0-1.4.4-2.5 1.1-3.4.7-.9 1.8-1.3 3.1-1.3 1.3 0 2.3.4 3 1.3.7.9 1 2 1 3.3 0 1.5-.3 2.6-1 3.5-.7.9-1.7 1.3-3.1 1.3zm.1-7.3c-.7 0-1.2.3-1.6.8-.4.5-.6 1.3-.6 2.2 0 .9.2 1.6.6 2.2.4.5.9.8 1.6.8.7 0 1.2-.3 1.6-.8.4-.5.6-1.3.6-2.2 0-.9-.2-1.6-.5-2.2-.4-.5-.9-.8-1.7-.8z"/>
    </svg>
  );
}

const S_OUT: Record<string, React.CSSProperties> = {
  smallBtn: {
    flex: 1, padding: "5px 8px", borderRadius: 4,
    background: "rgba(255,255,255,0.04)",
    color: "#7dd3fc", border: "1px solid rgba(0,120,212,0.4)",
    fontSize: 10, fontWeight: 700, letterSpacing: 0.5, textTransform: "uppercase", cursor: "pointer",
  },
};
