/**
 * BEOStandalone — Public landing for venue/catering companies. Mirrors Pastry pattern.
 */
import React, { useEffect, useState, useMemo } from "react";
import { adminFetch, ensureAdminToken } from "../../lib/admin-auth";

const API = "";

interface Pkg {
  label: string;
  amount: number;
  setup_usd: number;
  monthly_usd: number;
  features: string[];
}

export default function BEOStandalone() {
  const path = useMemo(() => window.location.pathname, []);
  if (path.startsWith("/beo/success")) return <BEOSuccess />;
  if (path.startsWith("/beo/admin")) return <BEOAdmin />;
  return <BEOLanding />;
}

function BEOLanding() {
  const [pkgs, setPkgs] = useState<Record<string, Pkg>>({});
  const [selected, setSelected] = useState<string>("venue_monthly");
  const [email, setEmail] = useState("");
  const [venue, setVenue] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    fetch(`${API}/api/beo-standalone/packages`).then((r) => r.json()).then((d) => setPkgs(d.packages || {})).catch(() => {});
  }, []);

  const start = async () => {
    setLoading(true); setErr(null);
    try {
      const r = await fetch(`${API}/api/beo-standalone/checkout/session`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ package_id: selected, origin_url: window.location.origin, email, venue_name: venue }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d?.detail || "Checkout failed");
      window.location.href = d.url;
    } catch (e: any) {
      setErr(e.message || "Error"); setLoading(false);
    }
  };

  return (
    <div style={wrap} data-testid="beo-landing">
      <div style={hero}>
        <div style={{ flex: 1, minWidth: 320 }}>
          <div style={eyebrow}>EchoAi³ · BEO</div>
          <h1 style={h1} data-testid="beo-hero-title">
            Run every event <span style={{ color: "#c8a97e" }}>flawlessly.</span>
          </h1>
          <p style={lead}>
            The banquet-event-order studio used by venues, wedding halls, and catering companies.
            Contract → BEO → kitchen → billing — one seamless thread.
          </p>

          <div style={pkgSwitcher}>
            {Object.entries(pkgs).map(([id, p]) => (
              <button key={id} onClick={() => setSelected(id)} style={{ ...pkgBtn, ...(selected === id ? pkgBtnActive : {}) }} data-testid={`beo-pkg-${id}`}>
                <div style={{ fontSize: 11, letterSpacing: 1, color: "#94a3b8", textTransform: "uppercase", fontWeight: 700 }}>
                  {id === "venue_monthly" ? "Full venue" : "Catering"}
                </div>
                <div style={{ fontSize: 22, color: "#f8fafc", fontFamily: "'Instrument Serif', Georgia, serif", marginTop: 4 }}>
                  ${p.monthly_usd}<span style={{ fontSize: 12, color: "#94a3b8", fontFamily: "system-ui" }}>/mo</span>
                </div>
                <div style={{ fontSize: 11, color: "#64748b", marginTop: 2 }}>+${p.setup_usd} setup</div>
              </button>
            ))}
          </div>

          <ul style={{ listStyle: "none", padding: 0, marginTop: 16 }}>
            {(pkgs[selected]?.features || []).map((f, i) => (
              <li key={i} style={{ color: "#e2e8f0", fontSize: 14, padding: "5px 0" }}>
                <span style={{ color: "#c8a97e", marginRight: 10 }}>✓</span>{f}
              </li>
            ))}
          </ul>

          <div style={{ display: "grid", gap: 10, marginTop: 18 }}>
            <input value={venue} onChange={(e) => setVenue(e.target.value)} placeholder="Venue or company name" style={inp} data-testid="beo-venue-input" />
            <input value={email} type="email" onChange={(e) => setEmail(e.target.value)} placeholder="you@venue.com" style={inp} data-testid="beo-email-input" />
          </div>
          <button onClick={start} disabled={loading} style={cta} data-testid="beo-checkout-btn">
            {loading ? "Opening secure checkout…" : `Activate — $${pkgs[selected]?.amount || "…"} today`}
          </button>
          {err && <div style={{ color: "#f87171", fontSize: 13, marginTop: 10 }}>{err}</div>}
        </div>

        <div style={{ flex: 1, minWidth: 320, display: "flex", justifyContent: "center" }}>
          <div style={showcase}>
            <div style={badge}>Venue & Catering</div>
            <div style={mockCard}>
              <div style={{ fontSize: 11, color: "#c8a97e", letterSpacing: 2, fontWeight: 700 }}>BEO #2026-0418-01</div>
              <div style={{ fontSize: 22, color: "#f8fafc", fontFamily: "'Instrument Serif', Georgia, serif", marginTop: 6 }}>Sarah & Tom — Wedding</div>
              <div style={{ fontSize: 13, color: "#cbd5e1", marginTop: 2 }}>June 14, 2026 · 140 guests · The Conservatory</div>
              <div style={{ height: 1, background: "rgba(255,255,255,0.1)", margin: "14px 0" }} />
              <div style={{ fontSize: 12, color: "#94a3b8", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <div><b style={{ color: "#f8fafc" }}>Cocktail</b><br />5:30 · Garden</div>
                <div><b style={{ color: "#f8fafc" }}>Dinner</b><br />7:00 · Ballroom</div>
                <div><b style={{ color: "#f8fafc" }}>First dance</b><br />9:15 · Ballroom</div>
                <div><b style={{ color: "#f8fafc" }}>Send-off</b><br />11:30 · Portico</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function BEOSuccess() {
  const [msg, setMsg] = useState("Verifying payment with Stripe…");
  useEffect(() => {
    const sid = new URLSearchParams(window.location.search).get("session_id");
    if (!sid) { setMsg("No session id."); return; }
    let i = 0;
    const tick = async () => {
      if (++i > 10) { setMsg("Timing out — check your email."); return; }
      try {
        const r = await fetch(`${API}/api/beo-standalone/checkout/status/${sid}`);
        const d = await r.json();
        if (d.payment_status === "paid") setMsg("Payment confirmed. Your venue is activated.");
        else setTimeout(tick, 2000);
      } catch { setTimeout(tick, 2500); }
    };
    tick();
  }, []);
  return (
    <div style={wrap} data-testid="beo-success-page">
      <div style={{ maxWidth: 560, margin: "60px auto", padding: 40, borderRadius: 20, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(200,169,126,0.25)" }}>
        <div style={eyebrow}>EchoAi³ · BEO</div>
        <h1 style={h1}>Welcome.</h1>
        <div style={{ color: "#cbd5e1", marginTop: 12 }}>{msg}</div>
        <a href="/" style={{ ...cta, display: "inline-block", marginTop: 16, textDecoration: "none" }}>Enter the Studio →</a>
      </div>
    </div>
  );
}

function BEOAdmin() {
  const [data, setData] = useState<any>(null);
  useEffect(() => {
    if (!ensureAdminToken()) return;
    adminFetch(`${API}/api/beo-standalone/admin/subscribers`).then((r) => r.json()).then(setData).catch(() => setData(null));
  }, []);
  if (!data) return <div style={wrap}><div style={{ color: "#94a3b8" }}>Loading…</div></div>;
  return (
    <div style={wrap} data-testid="beo-admin-page">
      <div style={{ maxWidth: 1100, margin: "0 auto" }}>
        <div style={eyebrow}>EchoAi³ · BEO Revenue</div>
        <h1 style={h1}>Paying venues</h1>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 14, marginTop: 20 }}>
          <Kpi label="Active" value={data.active_subscribers} />
          <Kpi label="MRR" value={`$${(data.mrr_usd || 0).toLocaleString()}`} accent />
          <Kpi label="Lifetime" value={`$${(data.lifetime_revenue_usd || 0).toLocaleString()}`} />
          <Kpi label="Total signups" value={data.total_subscribers} />
        </div>
        <div style={{ marginTop: 20, padding: 4, borderRadius: 14, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)", overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14, fontFamily: "system-ui" }} data-testid="beo-admin-table">
            <thead>
              <tr style={{ background: "rgba(255,255,255,0.04)" }}>
                <th style={th}>Venue</th><th style={th}>Email</th><th style={th}>Plan</th><th style={th}>MRR</th><th style={th}>Lifetime</th><th style={th}>Signup</th>
              </tr>
            </thead>
            <tbody>
              {(data.subscribers || []).length === 0 && <tr><td colSpan={6} style={{ padding: 30, textAlign: "center", color: "#64748b" }}>No paying venues yet.</td></tr>}
              {(data.subscribers || []).map((s: any) => (
                <tr key={s.email} style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }}>
                  <td style={td}><b>{s.venue_name || "—"}</b></td>
                  <td style={{ ...td, color: "#94a3b8" }}>{s.email}</td>
                  <td style={td}>{s.package_id}</td>
                  <td style={td}>${s.mrr_usd}</td>
                  <td style={td}>${s.lifetime_paid_usd}</td>
                  <td style={{ ...td, color: "#94a3b8" }}>{s.signup_at?.slice(0, 10)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function Kpi({ label, value, accent }: { label: string; value: any; accent?: boolean }) {
  return (
    <div style={{ padding: 22, borderRadius: 14, background: "rgba(255,255,255,0.03)", border: `1px solid ${accent ? "rgba(200,169,126,0.35)" : "rgba(255,255,255,0.06)"}` }}>
      <div style={{ color: "#94a3b8", fontSize: 12, textTransform: "uppercase", letterSpacing: 1, fontWeight: 600 }}>{label}</div>
      <div style={{ color: accent ? "#c8a97e" : "#f8fafc", fontSize: 36, fontFamily: "'Instrument Serif', Georgia, serif", marginTop: 6, lineHeight: 1 }}>{value}</div>
    </div>
  );
}

// ─── shared styles ───
const wrap: React.CSSProperties = {
  minHeight: "100vh", padding: "0 24px 60px",
  background: "radial-gradient(1200px 600px at 20% -10%, rgba(200,169,126,0.18), transparent), #0b1020",
  color: "#f8fafc", fontFamily: "'Instrument Serif', Georgia, system-ui, sans-serif",
};
const hero: React.CSSProperties = {
  maxWidth: 1200, margin: "0 auto", padding: "72px 0 40px",
  display: "flex", gap: 48, flexWrap: "wrap", alignItems: "center",
};
const eyebrow: React.CSSProperties = { fontSize: 12, letterSpacing: 2, color: "#c8a97e", fontWeight: 700, textTransform: "uppercase" };
const h1: React.CSSProperties = { fontSize: "clamp(44px, 6vw, 76px)", lineHeight: 1.02, margin: "14px 0 20px", fontFamily: "'Instrument Serif', Georgia, serif", fontWeight: 400 };
const lead: React.CSSProperties = { color: "#cbd5e1", fontSize: 18, lineHeight: 1.6, fontFamily: "system-ui", maxWidth: 560 };
const pkgSwitcher: React.CSSProperties = { display: "flex", gap: 12, marginTop: 28, flexWrap: "wrap" };
const pkgBtn: React.CSSProperties = {
  padding: 18, borderRadius: 16, background: "rgba(255,255,255,0.03)",
  border: "1px solid rgba(255,255,255,0.1)", cursor: "pointer", textAlign: "left", minWidth: 160, color: "#f8fafc",
};
const pkgBtnActive: React.CSSProperties = { borderColor: "rgba(200,169,126,0.5)", background: "rgba(200,169,126,0.08)" };
const inp: React.CSSProperties = {
  padding: "12px 14px", borderRadius: 10, border: "1px solid rgba(255,255,255,0.1)",
  background: "rgba(0,0,0,0.3)", color: "#f8fafc", fontSize: 14, fontFamily: "system-ui",
};
const cta: React.CSSProperties = {
  marginTop: 16, padding: "14px 22px", borderRadius: 12,
  background: "linear-gradient(135deg, #c8a97e 0%, #a88357 100%)",
  color: "#0b1020", border: 0, fontWeight: 700, fontSize: 16, cursor: "pointer", fontFamily: "system-ui",
  boxShadow: "0 6px 20px rgba(200,169,126,0.3)", width: "100%",
};
const showcase: React.CSSProperties = {
  position: "relative", padding: 20, maxWidth: 520, width: "100%", borderRadius: 20,
  background: "rgba(255,255,255,0.03)", border: "1px solid rgba(200,169,126,0.2)",
  boxShadow: "0 30px 80px rgba(0,0,0,0.5)",
};
const badge: React.CSSProperties = {
  position: "absolute", top: -12, left: 20, padding: "4px 12px", borderRadius: 20, background: "#c8a97e",
  color: "#0b1020", fontWeight: 700, fontSize: 11, letterSpacing: 1, textTransform: "uppercase", fontFamily: "system-ui",
};
const mockCard: React.CSSProperties = {
  padding: 20, borderRadius: 12, background: "rgba(0,0,0,0.3)",
  border: "1px solid rgba(255,255,255,0.06)", fontFamily: "system-ui",
};
const th: React.CSSProperties = {
  textAlign: "left", padding: "12px 14px", color: "#94a3b8",
  fontWeight: 600, fontSize: 12, textTransform: "uppercase", letterSpacing: 1,
};
const td: React.CSSProperties = { padding: "14px 14px", color: "#f8fafc" };
