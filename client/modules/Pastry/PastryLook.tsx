/**
 * PastryLook — public, unauthenticated render view reachable at /pastry/look/{share_token}.
 * Bakery sends this URL to clients for approval. Shows only the image + title + bakery branding.
 */
import React, { useEffect, useState } from "react";

const API = "";

interface Look {
  render_id: string;
  image_url: string;
  title: string;
  client_name?: string;
  bakery_name?: string;
  style?: string;
  created_at?: string;
}

export function PastryLook() {
  const [look, setLook] = useState<Look | null>(null);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    const m = window.location.pathname.match(/\/pastry\/look\/([^\/]+)/);
    if (!m) { setNotFound(true); return; }
    const token = m[1];
    fetch(`${API}/api/pastry/look/${token}`)
      .then((r) => (r.ok ? r.json() : Promise.reject(r)))
      .then(setLook)
      .catch(() => setNotFound(true));
  }, []);

  if (notFound) return (
    <div style={wrapStyle} data-testid="pastry-look-notfound">
      <div style={cardStyle}>
        <div style={{ fontSize: 44, opacity: 0.2, marginBottom: 16 }}>🎂</div>
        <h1 style={{ fontSize: 28, margin: "0 0 10px", color: "#f8fafc", fontFamily: "'Instrument Serif', Georgia, serif" }}>
          Preview link unavailable
        </h1>
        <div style={{ color: "#94a3b8" }}>This cake preview was unpublished or doesn't exist.</div>
      </div>
    </div>
  );

  if (!look) return <div style={wrapStyle}><div style={{ color: "#94a3b8" }}>Loading your cake preview…</div></div>;

  return (
    <div style={wrapStyle} data-testid="pastry-look-page">
      <div style={frameStyle}>
        <div style={headerStyle}>
          <div style={{ fontSize: 11, letterSpacing: 2, color: "#c8a97e", fontWeight: 700, textTransform: "uppercase" }}>
            Cake preview · {look.bakery_name || "Your bakery"}
          </div>
          <h1 style={{ fontSize: "clamp(32px, 5vw, 56px)", margin: "14px 0 4px", color: "#f8fafc", fontFamily: "'Instrument Serif', Georgia, serif", fontWeight: 400, lineHeight: 1.05 }} data-testid="pastry-look-title">
            {look.title}
          </h1>
          {look.client_name && (
            <div style={{ color: "#cbd5e1", fontSize: 18 }}>for {look.client_name}</div>
          )}
        </div>
        <img src={look.image_url} alt={look.title} style={imgStyle} data-testid="pastry-look-image" />
        <div style={footerStyle}>
          <div style={{ color: "#cbd5e1", fontSize: 14, lineHeight: 1.6 }}>
            This is an AI-assisted photoreal preview of your cake, rendered exclusively for approval.
            The final cake may have natural artisan variations.
          </div>
          <div style={{ marginTop: 18, display: "flex", gap: 10, flexWrap: "wrap" }}>
            <button onClick={async () => {
              const m = window.location.pathname.match(/\/pastry\/look\/([^\/]+)/);
              const tok = m ? m[1] : null;
              if (!tok) return;
              try {
                await fetch(`${API}/api/pastry/look/approve`, {
                  method: "POST", headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ share_token: tok, decision: "approved" }),
                });
                alert("Thanks! Your bakery has been notified.");
              } catch { alert("Couldn't record approval. Please call your bakery."); }
            }} style={primaryBtnStyle} data-testid="pastry-look-approve">
              ✓ I approve this design
            </button>
            <button onClick={async () => {
              const note = prompt("What would you like changed?");
              if (!note) return;
              const m = window.location.pathname.match(/\/pastry\/look\/([^\/]+)/);
              const tok = m ? m[1] : null;
              if (!tok) return;
              try {
                await fetch(`${API}/api/pastry/look/approve`, {
                  method: "POST", headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ share_token: tok, decision: "changes_requested", note }),
                });
                alert("Thanks! Your bakery will be in touch.");
              } catch { alert("Couldn't submit. Please contact your bakery."); }
            }} style={secondaryBtnStyle} data-testid="pastry-look-change">
              Request a change
            </button>
          </div>
        </div>
        <div style={{ textAlign: "center", marginTop: 28, color: "#64748b", fontSize: 11, letterSpacing: 1 }}>
          Powered by <b style={{ color: "#c8a97e" }}>EchoAi³</b> · {look.style || "studio"} render
        </div>
      </div>
    </div>
  );
}

const wrapStyle: React.CSSProperties = {
  minHeight: "100vh", padding: "40px 24px 60px", display: "flex", alignItems: "center", justifyContent: "center",
  background: "radial-gradient(1200px 600px at 50% -10%, rgba(200,169,126,0.14), transparent), #0b1020",
  color: "#f8fafc", fontFamily: "system-ui, sans-serif",
};
const frameStyle: React.CSSProperties = {
  width: "min(760px, 100%)", background: "rgba(255,255,255,0.03)", padding: 28,
  border: "1px solid rgba(200,169,126,0.25)", borderRadius: 20, boxShadow: "0 40px 100px rgba(0,0,0,0.5)",
};
const headerStyle: React.CSSProperties = { textAlign: "center", marginBottom: 20 };
const imgStyle: React.CSSProperties = { width: "100%", borderRadius: 14, display: "block", background: "#0b1020" };
const footerStyle: React.CSSProperties = { paddingTop: 24 };
const cardStyle: React.CSSProperties = {
  maxWidth: 420, padding: 40, borderRadius: 16, textAlign: "center",
  background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)",
};
const primaryBtnStyle: React.CSSProperties = {
  padding: "12px 20px", borderRadius: 12, background: "#c8a97e", color: "#0b1020",
  fontWeight: 700, textDecoration: "none", fontSize: 14, display: "inline-block",
};
const secondaryBtnStyle: React.CSSProperties = {
  padding: "12px 20px", borderRadius: 12, background: "rgba(255,255,255,0.06)",
  color: "#f8fafc", border: "1px solid rgba(255,255,255,0.1)", fontWeight: 600,
  textDecoration: "none", fontSize: 14,
};
