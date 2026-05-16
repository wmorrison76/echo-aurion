/** iter250 · Unified Login page · works for both Echo AURION and MyEcho.
 *
 * Theme + post-login redirect detected by the URL path:
 *   /login    → AURION (gold on midnight) → redirects to /
 *   /m/login  → MyEcho (gold on emerald) → redirects to /m/me
 */
import React from "react";
import { useAuth } from "@/lib/auth-context";

const API = (window as any).location.origin;

export default function LoginPage() {
  const { login } = useAuth();
  const path = window.location.pathname;
  const isMobile = path.startsWith("/m/");
  const params = new URLSearchParams(window.location.search);
  const next = params.get("next") || (isMobile ? "/m/me" : "/");

  const C = isMobile
    ? { bg: "#031e16", surface: "rgba(255,255,255,0.05)", accent: "#d4af37",
          icon: "/icons/myecho-staff-192.png", title: "MyEcho",
          tagline: "Sign in to your hourly staff app" }
    : { bg: "#04060d", surface: "rgba(255,255,255,0.04)", accent: "#d4af37",
          icon: "/icons/echo-aurion-mgr-192.png", title: "Echo AURION",
          tagline: "Sign in — Manager portal" };

  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [err, setErr] = React.useState("");
  const [showForgot, setShowForgot] = React.useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setErr("");
    const r = await login(email, password);
    setBusy(false);
    if (r.ok) {
      window.location.replace(next);
    } else {
      setErr(r.error || "Login failed");
    }
  }

  return (
    <div data-testid="login-root" style={{
      minHeight: "100vh", background: C.bg, color: "#f5efe4",
      display: "flex", alignItems: "center", justifyContent: "center",
      padding: 20, fontFamily: "'Inter', system-ui, sans-serif",
    }}>
      <div style={{
        width: "min(380px, 100%)", padding: 28, borderRadius: 14,
        background: C.surface, border: `1px solid ${C.accent}33`,
        boxShadow: `0 0 30px ${C.accent}22`,
      }}>
        <div style={{ textAlign: "center", marginBottom: 22 }}>
          <img src={C.icon} alt={C.title} style={{
            width: 72, height: 72, borderRadius: 16,
            boxShadow: "0 6px 20px rgba(0,0,0,0.5)",
          }} />
          <h1 style={{
            fontFamily: "'Playfair Display', Georgia, serif",
            fontSize: 26, fontWeight: 200, margin: "12px 0 4px", letterSpacing: -0.5,
          }}>{C.title}</h1>
          <div style={{ fontSize: 11, color: "#94a3b8" }}>{C.tagline}</div>
        </div>

        {!showForgot ? (
          <form onSubmit={submit} data-testid="login-form">
            <Field label="Email">
              <input data-testid="login-email" type="email" required value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@luccca.com" autoFocus
                style={inputStyle} />
            </Field>
            <Field label="Password">
              <input data-testid="login-password" type="password" required value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••" style={inputStyle} />
            </Field>
            {err && <div data-testid="login-error" style={{
              padding: "8px 12px", borderRadius: 6, marginTop: 8, fontSize: 11,
              background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)",
              color: "#fca5a5",
            }}>{err}</div>}
            <button data-testid="login-submit" type="submit" disabled={busy} style={{
              width: "100%", marginTop: 18, padding: "12px 16px",
              borderRadius: 8, fontSize: 12, fontWeight: 700, letterSpacing: 1,
              background: `${C.accent}1a`, color: C.accent,
              border: `1px solid ${C.accent}88`, cursor: "pointer", fontFamily: "inherit",
            }}>{busy ? "Signing in…" : "SIGN IN"}</button>
            <div style={{ marginTop: 14, textAlign: "center" }}>
              <button data-testid="login-forgot-link" type="button"
                onClick={() => setShowForgot(true)} style={{
                  background: "transparent", border: 0, color: "#94a3b8",
                  fontSize: 11, cursor: "pointer", textDecoration: "underline",
                }}>Forgot password?</button>
            </div>
          </form>
        ) : (
          <ForgotForm accent={C.accent} onCancel={() => setShowForgot(false)} />
        )}

        <div style={{
          marginTop: 24, padding: 12, borderRadius: 6,
          background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)",
          fontSize: 10, color: "#5a554d", lineHeight: 1.5,
        }}>
          {isMobile ? (
            <>Hourly staff login. Don't have an account?
              <a href="/install?role=staff" style={{ color: C.accent, marginLeft: 4 }}>Install MyEcho first ↗</a></>
          ) : (
            <>Manager / executive portal. Need access? Contact{" "}
              <a href="mailto:it@luccca.com" style={{ color: C.accent }}>IT</a></>
          )}
        </div>
      </div>
    </div>
  );
}

function ForgotForm({ accent, onCancel }: { accent: string; onCancel: () => void }) {
  const [email, setEmail] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [msg, setMsg] = React.useState("");
  async function send(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setMsg("");
    const r = await fetch(`${API}/api/auth/jwt/forgot-password`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    const j = await r.json();
    setBusy(false);
    setMsg(j.message || "If that email exists, a reset link was sent.");
  }
  return (
    <form onSubmit={send} data-testid="forgot-form">
      <Field label="Email">
        <input data-testid="forgot-email" type="email" required value={email}
          onChange={(e) => setEmail(e.target.value)} style={inputStyle} />
      </Field>
      {msg && <div data-testid="forgot-msg" style={{
        padding: "10px 12px", borderRadius: 6, marginTop: 8, fontSize: 11,
        background: "rgba(212,175,55,0.06)", border: `1px solid ${accent}55`,
        color: accent,
      }}>{msg}</div>}
      <button data-testid="forgot-submit" type="submit" disabled={busy} style={{
        width: "100%", marginTop: 18, padding: "12px 16px",
        borderRadius: 8, fontSize: 12, fontWeight: 700, letterSpacing: 1,
        background: `${accent}1a`, color: accent,
        border: `1px solid ${accent}88`, cursor: "pointer", fontFamily: "inherit",
      }}>{busy ? "Sending…" : "SEND RESET LINK"}</button>
      <div style={{ marginTop: 14, textAlign: "center" }}>
        <button type="button" onClick={onCancel} style={{
          background: "transparent", border: 0, color: "#94a3b8",
          fontSize: 11, cursor: "pointer", textDecoration: "underline",
        }}>Back to sign in</button>
      </div>
    </form>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ fontSize: 9, letterSpacing: 1, color: "#94a3b8",
                       textTransform: "uppercase", marginBottom: 4 }}>{label}</div>
      {children}
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  width: "100%", padding: "10px 12px", borderRadius: 6,
  background: "rgba(0,0,0,0.4)", border: "1px solid rgba(255,255,255,0.1)",
  color: "#f5efe4", fontFamily: "inherit", fontSize: 13,
};
