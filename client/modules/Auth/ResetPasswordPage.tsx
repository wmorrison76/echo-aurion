/** iter250 · Reset Password page · /reset-password?token=... */
import React from "react";

const API = (window as any).location.origin;

export default function ResetPasswordPage() {
  const params = new URLSearchParams(window.location.search);
  const token = params.get("token") || "";
  const [pw, setPw] = React.useState("");
  const [pw2, setPw2] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [msg, setMsg] = React.useState("");
  const [done, setDone] = React.useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (pw.length < 8) { setMsg("Password must be at least 8 characters"); return; }
    if (pw !== pw2) { setMsg("Passwords don't match"); return; }
    setBusy(true); setMsg("");
    const r = await fetch(`${API}/api/auth/jwt/reset-password`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, password: pw }),
    });
    const j = await r.json();
    setBusy(false);
    if (r.ok) { setDone(true); setMsg(j.message || "Password updated"); }
    else { setMsg(typeof j.detail === "string" ? j.detail : "Reset failed"); }
  }

  return (
    <div data-testid="reset-root" style={{
      minHeight: "100vh", background: "#04060d", color: "#f5efe4",
      display: "flex", alignItems: "center", justifyContent: "center",
      padding: 20, fontFamily: "'Inter', system-ui, sans-serif",
    }}>
      <div style={{
        width: "min(380px, 100%)", padding: 28, borderRadius: 14,
        background: "rgba(255,255,255,0.04)",
        border: "1px solid rgba(212,175,55,0.33)",
        boxShadow: "0 0 30px rgba(212,175,55,0.18)",
      }}>
        <h1 style={{
          fontFamily: "'Playfair Display', Georgia, serif",
          fontSize: 24, fontWeight: 200, margin: "0 0 16px",
          letterSpacing: -0.5, textAlign: "center",
        }}>Reset password</h1>
        {!token && <div style={{ color: "#fca5a5", fontSize: 12, padding: 12,
                                          borderRadius: 6, background: "rgba(239,68,68,0.1)" }}>
          Missing reset token. Click the link from your email.</div>}
        {token && !done && (
          <form onSubmit={submit} data-testid="reset-form">
            <Field label="New password">
              <input data-testid="reset-pw" type="password" required value={pw}
                onChange={(e) => setPw(e.target.value)} style={inputStyle}
                placeholder="At least 8 characters" autoFocus />
            </Field>
            <Field label="Confirm">
              <input data-testid="reset-pw2" type="password" required value={pw2}
                onChange={(e) => setPw2(e.target.value)} style={inputStyle} />
            </Field>
            {msg && <div data-testid="reset-msg" style={{
              padding: "8px 12px", borderRadius: 6, marginTop: 8, fontSize: 11,
              background: "rgba(239,68,68,0.1)", color: "#fca5a5",
              border: "1px solid rgba(239,68,68,0.3)",
            }}>{msg}</div>}
            <button data-testid="reset-submit" type="submit" disabled={busy} style={{
              width: "100%", marginTop: 18, padding: "12px 16px",
              borderRadius: 8, fontSize: 12, fontWeight: 700, letterSpacing: 1,
              background: "rgba(212,175,55,0.1)", color: "#d4af37",
              border: "1px solid rgba(212,175,55,0.5)", cursor: "pointer",
              fontFamily: "inherit",
            }}>{busy ? "Saving…" : "UPDATE PASSWORD"}</button>
          </form>
        )}
        {done && (
          <div style={{ textAlign: "center" }}>
            <div data-testid="reset-success" style={{
              padding: 14, borderRadius: 8, marginBottom: 16,
              background: "rgba(16,185,129,0.1)", color: "#10b981",
              border: "1px solid rgba(16,185,129,0.3)", fontSize: 13,
            }}>✓ {msg}</div>
            <a href="/login" style={{
              display: "inline-block", padding: "10px 22px", borderRadius: 8,
              background: "rgba(212,175,55,0.1)", color: "#d4af37",
              border: "1px solid rgba(212,175,55,0.5)", fontSize: 11,
              fontWeight: 700, letterSpacing: 1, textDecoration: "none",
            }}>SIGN IN</a>
          </div>
        )}
      </div>
    </div>
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
