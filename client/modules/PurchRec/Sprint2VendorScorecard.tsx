/**
 * Vendor Scorecard + Contract-Rate Compliance (PurchRec Sprint 2)
 *
 * Endpoints: /api/vendor-scorecard/*
 */
import React, { useEffect, useState } from "react";
import { Award, FileSearch, AlertTriangle, TrendingUp } from "lucide-react";

const API = window.location.origin;

export default function VendorScorecard() {
  const [tab, setTab] = useState<"scorecards" | "violations">("scorecards");
  return (
    <div data-testid="vendor-scorecard" style={{
      minHeight: "100%",
      background: "var(--aurion-panel-bg, #0a0e17)",
      color: "var(--aurion-text-primary, #e2e8f0)",
      fontFamily: "system-ui, sans-serif",
    }}>
      <div style={{ padding: "20px 28px 12px", borderBottom: "1px solid var(--aurion-border)" }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0 }}>Vendor Scorecard</h1>
        <div style={{ marginTop: 4, fontSize: 12, color: "var(--aurion-text-secondary)" }}>
          Performance grades · contract compliance · rebate recovery pipeline.
        </div>
      </div>
      <div style={{ display: "flex", gap: 2, padding: "0 28px", borderBottom: "1px solid var(--aurion-border)" }}>
        <TabBtn id="scorecards" label="Scorecards" icon={<Award size={14} />} active={tab === "scorecards"} onClick={() => setTab("scorecards")} />
        <TabBtn id="violations" label="Contract Violations" icon={<FileSearch size={14} />} active={tab === "violations"} onClick={() => setTab("violations")} />
      </div>
      <div style={{ padding: "18px 28px 48px" }}>
        {tab === "scorecards" ? <ScorecardsTab /> : <ViolationsTab />}
      </div>
    </div>
  );
}

function TabBtn({ id, label, icon, active, onClick }: { id: string; label: string; icon: React.ReactNode; active: boolean; onClick: () => void }) {
  return (
    <button data-testid={`vendor-tab-${id}`} onClick={onClick}
      style={{
        display: "flex", alignItems: "center", gap: 8,
        padding: "12px 16px", border: "none", background: "transparent",
        color: active ? "var(--aurion-accent)" : "var(--aurion-text-secondary)",
        borderBottom: `2px solid ${active ? "var(--aurion-accent)" : "transparent"}`,
        fontSize: 13, fontWeight: active ? 600 : 500, cursor: "pointer",
      }}>{icon} {label}</button>
  );
}

function ScorecardsTab() {
  const [data, setData] = useState<any>(null);
  useEffect(() => { (async () => setData(await (await fetch(`${API}/api/vendor-scorecard/scorecards`)).json()))(); }, []);
  if (!data) return <div style={{ padding: 40, color: "var(--aurion-text-muted)" }}>Loading…</div>;
  const s = data.summary;
  return (
    <div style={{ display: "grid", gap: 18 }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12 }}>
        <Stat label="Vendors" value={s.vendors} />
        <Stat label="Period spend" value={`$${s.total_spend_usd.toLocaleString()}`} />
        <Stat label="Rebate pipeline" value={`$${s.rebate_recovery_pipeline_usd.toLocaleString()}`} tone="ok" icon={<TrendingUp size={14} />} />
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(360px, 1fr))", gap: 12 }}>
        {data.scorecards.map((c: any) => (
          <div key={c.vendor_id} data-testid={`scorecard-${c.vendor_id}`} style={{
            padding: 14, borderRadius: 10,
            background: "var(--aurion-surface)", border: "1px solid var(--aurion-border)",
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
              <strong style={{ fontSize: 15 }}>{c.vendor_name}</strong>
              <span style={{
                fontSize: 18, fontWeight: 800,
                color: c.overall_grade === "A" ? "var(--aurion-healthy)"
                     : c.overall_grade === "B" ? "var(--aurion-accent)"
                     : c.overall_grade === "C" ? "var(--aurion-watch)" : "var(--aurion-critical)",
              }}>{c.overall_grade}</span>
            </div>
            <div style={{ fontSize: 11, color: "var(--aurion-text-muted)", marginBottom: 10 }}>
              Spend ${c.spend_period_usd.toLocaleString()} · {c.period}
            </div>
            <Bar label="On-time %" value={c.on_time_pct} />
            <Bar label="Fill rate %" value={c.fill_rate_pct} />
            <Bar label="Invoice accuracy %" value={c.avg_invoice_accuracy_pct} />
            <div style={{ marginTop: 10, fontSize: 11, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
              <span><span style={{ color: "var(--aurion-text-muted)" }}>Quality complaints:</span> <strong>{c.quality_complaints}</strong></span>
              <span><span style={{ color: "var(--aurion-text-muted)" }}>Short ships:</span> <strong>{c.short_ships}</strong></span>
              <span><span style={{ color: "var(--aurion-text-muted)" }}>Avg lead:</span> <strong>{c.avg_lead_time_hrs}h</strong></span>
              <span><span style={{ color: "var(--aurion-text-muted)" }}>Rebate eligible:</span> <strong style={{ color: "var(--aurion-healthy)" }}>${c.rebate_eligible_usd.toLocaleString()}</strong></span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ViolationsTab() {
  const [data, setData] = useState<any>(null);
  useEffect(() => { (async () => setData(await (await fetch(`${API}/api/vendor-scorecard/violations`)).json()))(); }, []);
  if (!data) return <div style={{ padding: 40, color: "var(--aurion-text-muted)" }}>Loading…</div>;
  return (
    <div style={{ display: "grid", gap: 18 }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12 }}>
        <Stat label="Violations" value={data.summary.violations} tone={data.summary.violations > 0 ? "warn" : "ok"} icon={<AlertTriangle size={14} />} />
        <Stat label="Estimated overcharge" value={`$${data.summary.estimated_overcharge_usd.toLocaleString()}`} tone="warn" />
        <Stat label="Critical" value={data.summary.critical} tone="warn" />
        <Stat label="Warn" value={data.summary.warn} />
      </div>
      <div style={{
        padding: 14, borderRadius: 10,
        background: "var(--aurion-surface-elevated)", border: "1px solid var(--aurion-border)",
      }}>
        <table style={{ width: "100%", fontSize: 12, borderCollapse: "collapse" }}>
          <thead style={{ color: "var(--aurion-text-muted)", textAlign: "left" }}>
            <tr>
              <th style={th}>Vendor</th>
              <th style={th}>SKU</th>
              <th style={th}>Description</th>
              <th style={thNum}>Contract $</th>
              <th style={thNum}>Invoice $</th>
              <th style={thNum}>Drift %</th>
              <th style={thNum}>Extra cost</th>
              <th style={th}>Severity</th>
            </tr>
          </thead>
          <tbody>
            {data.violations.map((v: any) => (
              <tr key={v.invoice_id + v.sku} style={{ borderTop: "1px solid var(--aurion-border)" }}>
                <td style={td}>{v.vendor_name}</td>
                <td style={td}><code>{v.sku}</code></td>
                <td style={td}>{v.description}</td>
                <td style={tdNum}>${v.contract_unit_price.toFixed(2)}</td>
                <td style={tdNum}>${v.invoiced_unit_price.toFixed(2)}</td>
                <td style={{ ...tdNum, color: v.severity === "critical" ? "var(--aurion-critical)" : "var(--aurion-watch)" }}>{v.drift_pct.toFixed(1)}%</td>
                <td style={tdNum}>${v.extra_cost_usd.toFixed(2)}</td>
                <td style={td}>
                  <span style={{
                    padding: "2px 8px", borderRadius: 4, fontSize: 10, fontWeight: 700, letterSpacing: 1, textTransform: "uppercase",
                    background: v.severity === "critical" ? "rgba(239,68,68,0.14)" : "rgba(245,158,11,0.14)",
                    color: v.severity === "critical" ? "var(--aurion-critical)" : "var(--aurion-watch)",
                  }}>{v.severity}</span>
                </td>
              </tr>
            ))}
            {data.violations.length === 0 && (
              <tr><td colSpan={8} style={{ padding: 30, textAlign: "center", color: "var(--aurion-text-muted)" }}>
                ✓ All invoices within contract tolerance.
              </td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Stat({ label, value, icon, tone }: { label: string; value: any; icon?: React.ReactNode; tone?: "ok" | "warn" }) {
  const color = tone === "warn" ? "var(--aurion-watch)" : tone === "ok" ? "var(--aurion-healthy)" : "var(--aurion-accent)";
  return (
    <div style={{ padding: 12, borderRadius: 10, background: "var(--aurion-surface)", border: "1px solid var(--aurion-border)" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 10, textTransform: "uppercase", letterSpacing: 1.4, color: "var(--aurion-text-muted)", marginBottom: 4 }}>
        {icon} {label}
      </div>
      <div style={{ fontSize: 22, fontWeight: 700, color }}>{value}</div>
    </div>
  );
}

function Bar({ label, value }: { label: string; value: number }) {
  const pct = Math.max(0, Math.min(100, value));
  const color = pct >= 95 ? "var(--aurion-healthy)" : pct >= 88 ? "var(--aurion-accent)" : pct >= 80 ? "var(--aurion-watch)" : "var(--aurion-critical)";
  return (
    <div style={{ marginBottom: 6 }}>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, marginBottom: 2 }}>
        <span style={{ color: "var(--aurion-text-muted)" }}>{label}</span>
        <span style={{ fontWeight: 700, color }}>{value.toFixed(1)}%</span>
      </div>
      <div style={{ height: 6, borderRadius: 3, background: "var(--aurion-subtle)", overflow: "hidden" }}>
        <div style={{ width: `${pct}%`, height: "100%", background: color }} />
      </div>
    </div>
  );
}

const th: React.CSSProperties = { padding: "6px 8px", fontWeight: 500, fontSize: 11, textTransform: "uppercase", letterSpacing: 1 };
const thNum: React.CSSProperties = { ...th, textAlign: "right" };
const td: React.CSSProperties = { padding: "8px" };
const tdNum: React.CSSProperties = { ...td, textAlign: "right", fontVariantNumeric: "tabular-nums" };
