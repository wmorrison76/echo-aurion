/**
 * PastryAdmin — revenue dashboard listing paying bakeries, MRR and lifetime revenue.
 */
import React, { useEffect, useState } from "react";
import { PastryReferrals } from "./PastryReferrals";
import { PastryApprovals } from "./PastryApprovals";
import { adminFetch, ensureAdminToken, clearAdminToken } from "../../lib/admin-auth";

const API = "";  // relative; Vite proxies /api → backend

interface SubRow {
  email: string;
  bakery_name?: string;
  status: string;
  mrr_usd: number;
  signup_at: string;
  next_billing_at?: string;
  lifetime_paid_usd: number;
}

interface Summary {
  subscribers: SubRow[];
  total_subscribers: number;
  active_subscribers: number;
  mrr_usd: number;
  lifetime_revenue_usd: number;
}

export function PastryAdmin() {
  const [data, setData] = useState<Summary | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [refreshed, setRefreshed] = useState(0);
  const [billing, setBilling] = useState<null | { processed: number; charged: any[]; errors: any[] }>(null);
  const [runningBilling, setRunningBilling] = useState(false);

  useEffect(() => {
    if (!ensureAdminToken()) { setErr("Admin token required. Reload to re-enter."); return; }
    adminFetch(`${API}/api/pastry/admin/subscribers`)
      .then((r) => {
        if (r.status === 401) { clearAdminToken(); throw new Error("Invalid admin token — cleared"); }
        return r.json();
      })
      .then(setData)
      .catch((e) => setErr(e?.message || "Unable to load admin dashboard"));
  }, [refreshed]);

  const runMonthlyBilling = async (dryRun: boolean) => {
    setRunningBilling(true);
    try {
      const r = await adminFetch(`${API}/api/pastry/billing/run-monthly?dry_run=${dryRun}`, { method: "POST" });
      const d = await r.json();
      setBilling(d);
      if (!dryRun) setRefreshed((x) => x + 1);
    } catch {
      setBilling({ processed: 0, charged: [], errors: [{ error: "Request failed" }] });
    } finally {
      setRunningBilling(false);
    }
  };

  if (err) return <div style={wrapStyle}><div style={{ color: "#f87171" }}>{err}</div></div>;
  if (!data) return <div style={wrapStyle}><div style={{ color: "#94a3b8" }}>Loading…</div></div>;

  return (
    <div style={wrapStyle} data-testid="pastry-admin-page">
      <div style={{ maxWidth: 1200, margin: "0 auto" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 28 }}>
          <div>
            <div style={{ fontSize: 12, letterSpacing: 2, color: "#c8a97e", fontWeight: 700, textTransform: "uppercase" }}>
              EchoAi³ · Pastry Revenue
            </div>
            <h1 style={{ fontSize: 44, margin: "10px 0 0", fontFamily: "'Instrument Serif', Georgia, serif", fontWeight: 400, lineHeight: 1 }}>
              Paying bakeries
            </h1>
          </div>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <a href="/pastry/gallery" style={refreshBtn} data-testid="pastry-admin-gallery-link">Gallery</a>
            <button
              onClick={() => runMonthlyBilling(true)}
              disabled={runningBilling}
              style={refreshBtn}
              data-testid="pastry-admin-billing-dry-run"
            >
              Dry-run billing
            </button>
            <button
              onClick={() => {
                if (confirm("Create real Stripe checkout sessions for all due subscribers?")) runMonthlyBilling(false);
              }}
              disabled={runningBilling}
              style={{ ...refreshBtn, background: "rgba(200,169,126,0.18)", borderColor: "rgba(200,169,126,0.5)", color: "#c8a97e" }}
              data-testid="pastry-admin-billing-run"
            >
              {runningBilling ? "Charging…" : "Run monthly billing"}
            </button>
            <button onClick={() => setRefreshed((x) => x + 1)} style={refreshBtn} data-testid="pastry-admin-refresh">
              Refresh
            </button>
          </div>
        </div>

        <div style={kpiGrid}>
          <Kpi label="Active subscribers" value={data.active_subscribers} />
          <Kpi label="Monthly recurring revenue" value={`$${data.mrr_usd.toLocaleString()}`} accent />
          <Kpi label="Lifetime revenue" value={`$${data.lifetime_revenue_usd.toLocaleString()}`} />
          <Kpi label="Total signups" value={data.total_subscribers} />
        </div>

        {billing && (
          <div style={{ marginTop: 20, padding: 18, borderRadius: 12,
            background: billing.errors.length ? "rgba(239,68,68,0.08)" : "rgba(34,197,94,0.08)",
            border: `1px solid ${billing.errors.length ? "rgba(239,68,68,0.3)" : "rgba(34,197,94,0.3)"}` }}
            data-testid="pastry-admin-billing-result">
            <div style={{ fontWeight: 700, color: billing.errors.length ? "#fca5a5" : "#86efac", marginBottom: 6 }}>
              Billing run: {billing.charged.length} charged · {billing.errors.length} errors · {billing.processed} due
            </div>
            {billing.charged.slice(0, 5).map((c: any, i: number) => (
              <div key={i} style={{ color: "#cbd5e1", fontSize: 13, padding: "2px 0" }}>
                ✓ ${c.amount_usd} to <b>{c.bakery_name || c.email}</b> {c.dry_run ? "(dry run)" : ""}
              </div>
            ))}
            {billing.errors.slice(0, 3).map((e: any, i: number) => (
              <div key={i} style={{ color: "#fca5a5", fontSize: 13, padding: "2px 0" }}>
                ✗ {e.email}: {e.error}
              </div>
            ))}
          </div>
        )}

        <div style={{ marginTop: 28, padding: 4, borderRadius: 14, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)", overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: "system-ui, sans-serif", fontSize: 14 }} data-testid="pastry-admin-table">
            <thead>
              <tr style={{ background: "rgba(255,255,255,0.04)" }}>
                <th style={thStyle}>Bakery</th>
                <th style={thStyle}>Email</th>
                <th style={thStyle}>Status</th>
                <th style={thStyle}>MRR</th>
                <th style={thStyle}>Lifetime paid</th>
                <th style={thStyle}>Signup</th>
                <th style={thStyle}>Next bill</th>
              </tr>
            </thead>
            <tbody>
              {data.subscribers.length === 0 && (
                <tr>
                  <td colSpan={7} style={{ padding: 30, textAlign: "center", color: "#64748b" }}>
                    No paying bakeries yet. Share <a style={{ color: "#c8a97e" }} href="/pastry">/pastry</a> to start.
                  </td>
                </tr>
              )}
              {data.subscribers.map((s) => (
                <tr key={s.email} style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }} data-testid={`pastry-admin-row-${s.email}`}>
                  <td style={tdStyle}><b>{s.bakery_name || "—"}</b></td>
                  <td style={{ ...tdStyle, color: "#94a3b8" }}>{s.email}</td>
                  <td style={tdStyle}>
                    <span style={{
                      padding: "3px 8px", borderRadius: 999, fontSize: 12, fontWeight: 600,
                      background: s.status === "active" ? "rgba(34,197,94,0.18)" : "rgba(148,163,184,0.15)",
                      color: s.status === "active" ? "#86efac" : "#cbd5e1",
                    }}>{s.status}</span>
                  </td>
                  <td style={tdStyle}>${s.mrr_usd.toFixed(2)}</td>
                  <td style={tdStyle}>${s.lifetime_paid_usd.toFixed(2)}</td>
                  <td style={{ ...tdStyle, color: "#94a3b8" }}>{fmtDate(s.signup_at)}</td>
                  <td style={{ ...tdStyle, color: "#94a3b8" }}>{fmtDate(s.next_billing_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <PastryReferrals />
        <PastryApprovals />
      </div>
    </div>
  );
}

function Kpi({ label, value, accent }: { label: string; value: any; accent?: boolean }) {
  return (
    <div style={{ padding: 22, borderRadius: 14, background: "rgba(255,255,255,0.03)", border: `1px solid ${accent ? "rgba(200,169,126,0.35)" : "rgba(255,255,255,0.06)"}` }}>
      <div style={{ color: "#94a3b8", fontSize: 12, textTransform: "uppercase", letterSpacing: 1, fontWeight: 600 }}>{label}</div>
      <div style={{ color: accent ? "#c8a97e" : "#f8fafc", fontSize: 36, fontFamily: "'Instrument Serif', Georgia, serif", fontWeight: 400, marginTop: 6, lineHeight: 1 }}>
        {value}
      </div>
    </div>
  );
}

function fmtDate(iso?: string) {
  if (!iso) return "—";
  try { return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" }); }
  catch { return iso; }
}

const wrapStyle: React.CSSProperties = {
  minHeight: "100vh", padding: "40px 24px 60px",
  background: "radial-gradient(900px 400px at 10% -10%, rgba(200,169,126,0.1), transparent), #0b1020",
  color: "#f8fafc", fontFamily: "system-ui, sans-serif",
};
const kpiGrid: React.CSSProperties = {
  display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 16,
};
const thStyle: React.CSSProperties = {
  textAlign: "left", padding: "12px 14px", color: "#94a3b8",
  fontWeight: 600, fontSize: 12, textTransform: "uppercase", letterSpacing: 1,
};
const tdStyle: React.CSSProperties = { padding: "14px 14px", color: "#f8fafc" };
const refreshBtn: React.CSSProperties = {
  padding: "10px 16px", borderRadius: 10, background: "rgba(255,255,255,0.06)",
  color: "#f8fafc", border: "1px solid rgba(255,255,255,0.1)",
  cursor: "pointer", fontWeight: 600, fontSize: 13, fontFamily: "system-ui",
};
