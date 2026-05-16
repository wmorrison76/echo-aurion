import React, { useState, useEffect } from "react";
const API = window.location.origin;
const C = { bg: "#0b0f1a", card: "#111827", border: "#1e293b", accent: "#c8a97e", green: "#10b981", red: "#ef4444", amber: "#f59e0b", blue: "#3b82f6", purple: "#8b5cf6", text: "#e2e8f0", dim: "#64748b", muted: "#475569" };
const fmt = (n: number) => `$${(n || 0).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
const fmtD = (n: number) => `$${(n || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const pct = (n: number) => `${(n || 0).toFixed(1)}%`;
function VarBadge({ v }: { v: any }) {
  if (!v) return null;
  const positive = v.amount >= 0;
  return <span style={{ fontSize: 10, fontWeight: 600, color: positive ? C.green : C.red }}>{positive ? "+" : ""}{v.pct}%</span>;
}
function Badge({ text, color }: { text: string; color: string }) { return <span style={{ padding: "2px 8px", borderRadius: 4, fontSize: 9, fontWeight: 600, background: `${color}15`, color, textTransform: "uppercase" }}>{text}</span>; }

export default function GMFlashReport() {
  const [data, setData] = useState<any>(null);
  useEffect(() => { fetch(`${API}/api/daily-reports/gm-flash`).then(r => r.json()).then(setData); }, []);
  if (!data) return <div data-testid="gm-flash-panel" style={{ height: "100%", background: C.bg, padding: 40, textAlign: "center", color: C.dim, borderRadius: 10 }}>Loading Flash Report...</div>;

  const y = data.yesterday;
  const mtd = data.mtd;
  const ops = data.operations;
  const cs = data.comp_set;

  return (
    <div data-testid="gm-flash-panel" style={{ height: "100%", background: C.bg, color: C.text, fontFamily: "'Inter', sans-serif", borderRadius: 10, overflow: "hidden", display: "flex", flexDirection: "column" }}>
      {/* Header */}
      <div style={{ padding: "10px 20px", borderBottom: `1px solid ${C.border}`, background: "rgba(200,169,126,0.04)", display: "flex", justifyContent: "space-between", alignItems: "center", flexShrink: 0 }}>
        <div>
          <div style={{ fontSize: 16, fontWeight: 700, color: C.accent }}>GM Daily Flash Report</div>
          <div style={{ fontSize: 10, color: C.dim }}>Report Date: {data.report_date} | Generated: {data.report_time} UTC</div>
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          <Badge text="LIVE" color={C.green} />
        </div>
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: "16px 20px" }}>
        {/* ── Yesterday's Performance ── */}
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: C.accent, marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.08em" }}>Yesterday's Performance</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 10 }}>
            {[
              { l: "Occupancy", v: pct(y.occupancy_pct), b: pct(y.budget.occupancy_pct), var: y.variance.occupancy },
              { l: "ADR", v: fmtD(y.adr), b: fmtD(y.budget.adr), var: y.variance.adr },
              { l: "RevPAR", v: fmtD(y.revpar), b: fmtD(y.budget.revpar), var: y.variance.revpar },
              { l: "TRevPAR", v: fmtD(y.trevpar), b: "—" },
              { l: "GOPPAR", v: fmtD(y.goppar), b: "—" },
            ].map(kpi => (
              <div key={kpi.l} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 8, padding: "10px 12px" }}>
                <div style={{ fontSize: 9, color: C.dim, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 4 }}>{kpi.l}</div>
                <div style={{ fontSize: 20, fontWeight: 700, color: C.text, fontFamily: "'IBM Plex Mono', monospace" }}>{kpi.v}</div>
                <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4 }}>
                  <span style={{ fontSize: 9, color: C.muted }}>Budget: {kpi.b}</span>
                  {kpi.var && <VarBadge v={kpi.var} />}
                </div>
              </div>
            ))}
          </div>
          {/* Revenue Summary */}
          <div style={{ display: "flex", gap: 10, marginTop: 10 }}>
            {[{ l: "Room Revenue", v: y.room_revenue, var: y.variance.room_revenue }, { l: "F&B Revenue", v: y.fb_revenue }, { l: "Spa Revenue", v: y.spa_revenue }, { l: "Total Revenue", v: y.total_revenue, var: y.variance.total_revenue }].map(r => (
              <div key={r.l} style={{ flex: 1, background: C.card, border: `1px solid ${C.border}`, borderRadius: 8, padding: "8px 12px" }}>
                <div style={{ fontSize: 9, color: C.dim, textTransform: "uppercase" }}>{r.l}</div>
                <div style={{ fontSize: 16, fontWeight: 700, color: C.accent, fontFamily: "'IBM Plex Mono', monospace" }}>{fmt(r.v)}</div>
                {r.var && <VarBadge v={r.var} />}
              </div>
            ))}
          </div>
        </div>

        {/* ── MTD & Comp Set ── */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 16 }}>
          {/* MTD */}
          <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 10, padding: 14 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: C.accent, marginBottom: 8, textTransform: "uppercase" }}>Month-to-Date (Day {mtd.days_elapsed})</div>
            <table style={{ width: "100%", fontSize: 11, borderCollapse: "collapse" }}>
              <thead><tr>{["Metric", "Actual", "Budget", "Var", "LY", "vs LY"].map(h => <th key={h} style={{ padding: "4px 6px", textAlign: "left", color: C.dim, fontSize: 9, fontWeight: 600, textTransform: "uppercase", borderBottom: `1px solid ${C.border}` }}>{h}</th>)}</tr></thead>
              <tbody>
                {[{ m: "Occupancy", a: pct(mtd.occupancy_pct), b: pct(mtd.budget_occupancy), v: mtd.variance_vs_budget.occupancy, ly: pct(mtd.ly_occupancy), vly: mtd.variance_vs_ly.occupancy },
                  { m: "ADR", a: fmtD(mtd.adr), b: fmtD(mtd.budget_adr), v: mtd.variance_vs_budget.adr, ly: fmtD(mtd.ly_adr), vly: mtd.variance_vs_ly.adr },
                  { m: "RevPAR", a: fmtD(mtd.revpar), b: fmtD(mtd.budget_revpar), v: mtd.variance_vs_budget.revpar, ly: fmtD(mtd.ly_revpar), vly: mtd.variance_vs_ly.revpar },
                ].map(r => (
                  <tr key={r.m} style={{ borderBottom: `1px solid ${C.border}20` }}>
                    <td style={{ padding: "5px 6px", color: C.text, fontWeight: 600 }}>{r.m}</td>
                    <td style={{ padding: "5px 6px", color: C.text, fontFamily: "'IBM Plex Mono', monospace" }}>{r.a}</td>
                    <td style={{ padding: "5px 6px", color: C.dim }}>{r.b}</td>
                    <td style={{ padding: "5px 6px" }}><VarBadge v={r.v} /></td>
                    <td style={{ padding: "5px 6px", color: C.dim }}>{r.ly}</td>
                    <td style={{ padding: "5px 6px" }}><VarBadge v={r.vly} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Comp Set */}
          <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 10, padding: 14 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: C.accent, marginBottom: 8, textTransform: "uppercase" }}>Competitive Set Index</div>
            <table style={{ width: "100%", fontSize: 11, borderCollapse: "collapse" }}>
              <thead><tr>{["", "Our Hotel", "Comp Set", "Market", "Index"].map(h => <th key={h} style={{ padding: "4px 6px", textAlign: "left", color: C.dim, fontSize: 9, fontWeight: 600, textTransform: "uppercase", borderBottom: `1px solid ${C.border}` }}>{h}</th>)}</tr></thead>
              <tbody>
                {[{ m: "Occupancy", us: pct(cs.our_hotel.occupancy), cs: pct(cs.comp_set_avg.occupancy), mk: pct(cs.market.occupancy), idx: cs.penetration_index.occupancy },
                  { m: "ADR", us: fmtD(cs.our_hotel.adr), cs: fmtD(cs.comp_set_avg.adr), mk: fmtD(cs.market.adr), idx: cs.penetration_index.adr },
                  { m: "RevPAR", us: fmtD(cs.our_hotel.revpar), cs: fmtD(cs.comp_set_avg.revpar), mk: fmtD(cs.market.revpar), idx: cs.penetration_index.revpar },
                ].map(r => (
                  <tr key={r.m} style={{ borderBottom: `1px solid ${C.border}20` }}>
                    <td style={{ padding: "5px 6px", color: C.text, fontWeight: 600 }}>{r.m}</td>
                    <td style={{ padding: "5px 6px", color: C.accent, fontFamily: "'IBM Plex Mono', monospace", fontWeight: 700 }}>{r.us}</td>
                    <td style={{ padding: "5px 6px", color: C.dim }}>{r.cs}</td>
                    <td style={{ padding: "5px 6px", color: C.muted }}>{r.mk}</td>
                    <td style={{ padding: "5px 6px", color: r.idx >= 100 ? C.green : C.red, fontWeight: 700, fontFamily: "'IBM Plex Mono', monospace" }}>{r.idx}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* ── Operations + VIP + Departments ── */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 14, marginBottom: 16 }}>
          {/* Operations */}
          <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 10, padding: 14 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: C.accent, marginBottom: 8, textTransform: "uppercase" }}>Today's Operations</div>
            {[{ l: "Arrivals", v: ops.arrivals, c: C.blue }, { l: "Departures", v: ops.departures, c: C.amber }, { l: "Stayovers", v: ops.stayovers, c: C.text }, { l: "No-Shows", v: ops.no_shows, c: ops.no_shows > 0 ? C.red : C.dim }, { l: "Walk-Ins", v: ops.walk_ins, c: C.green }, { l: "OOO Rooms", v: ops.ooo_rooms, c: C.dim }, { l: "Comp Rooms", v: ops.comp_rooms, c: C.dim }].map(o => (
              <div key={o.l} style={{ display: "flex", justifyContent: "space-between", padding: "3px 0" }}>
                <span style={{ fontSize: 11, color: C.dim }}>{o.l}</span>
                <span style={{ fontSize: 12, fontWeight: 700, color: o.c, fontFamily: "'IBM Plex Mono', monospace" }}>{o.v}</span>
              </div>
            ))}
          </div>

          {/* VIP In-House */}
          <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 10, padding: 14 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: C.amber, marginBottom: 8, textTransform: "uppercase" }}>VIP In-House ({ops.vip_in_house.length})</div>
            {ops.vip_in_house.map((v: any) => (
              <div key={v.room} style={{ marginBottom: 8, padding: "6px 0", borderBottom: `1px solid ${C.border}20` }}>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ fontSize: 11, fontWeight: 600, color: C.text }}>{v.name}</span>
                  <Badge text={v.status} color={v.status === "VVIP" ? C.red : C.amber} />
                </div>
                <div style={{ fontSize: 10, color: C.dim }}>Rm {v.room} | {v.nights_remaining} nights left</div>
                <div style={{ fontSize: 9, color: C.muted, marginTop: 2 }}>{v.notes}</div>
              </div>
            ))}
          </div>

          {/* Department Revenue */}
          <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 10, padding: 14 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: C.accent, marginBottom: 8, textTransform: "uppercase" }}>Departmental Revenue</div>
            {(data.departments || []).map((d: any) => (
              <div key={d.name} style={{ display: "flex", justifyContent: "space-between", padding: "3px 0", borderBottom: `1px solid ${C.border}10` }}>
                <span style={{ fontSize: 10, color: C.text }}>{d.name}</span>
                <div style={{ display: "flex", gap: 8 }}>
                  <span style={{ fontSize: 10, fontWeight: 600, color: C.accent, fontFamily: "'IBM Plex Mono', monospace" }}>{fmt(d.actual)}</span>
                  <VarBadge v={d.variance} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── Pace + 7-Day Trend ── */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
          {/* Pace */}
          <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 10, padding: 14 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: C.accent, marginBottom: 8, textTransform: "uppercase" }}>Pace Report (OTB vs LY)</div>
            <div style={{ display: "flex", gap: 12, marginBottom: 10 }}>
              {[{ l: "OTB Rooms", v: data.pace.current_month_otb.rooms, c: C.accent }, { l: "LY Rooms", v: data.pace.same_time_ly.rooms, c: C.dim }, { l: "Variance", v: `+${data.pace.variance.rooms}`, c: C.green }].map(p => (
                <div key={p.l} style={{ flex: 1, textAlign: "center" }}>
                  <div style={{ fontSize: 9, color: C.dim, textTransform: "uppercase" }}>{p.l}</div>
                  <div style={{ fontSize: 16, fontWeight: 700, color: p.c, fontFamily: "'IBM Plex Mono', monospace" }}>{p.v}</div>
                </div>
              ))}
            </div>
            {(data.pace.next_30_days || []).map((w: any) => (
              <div key={w.period} style={{ display: "flex", justifyContent: "space-between", padding: "4px 0", borderBottom: `1px solid ${C.border}20` }}>
                <span style={{ fontSize: 10, color: C.text }}>{w.period}</span>
                <div style={{ display: "flex", gap: 12 }}>
                  <span style={{ fontSize: 10, color: C.accent, fontFamily: "'IBM Plex Mono', monospace" }}>{w.otb_rooms} rms</span>
                  <span style={{ fontSize: 10, color: C.dim }}>(LY: {w.ly_rooms})</span>
                  <span style={{ fontSize: 10, fontWeight: 600, color: C.green }}>{fmt(w.otb_rev)}</span>
                </div>
              </div>
            ))}
          </div>

          {/* 7-Day Trend */}
          <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 10, padding: 14 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: C.accent, marginBottom: 8, textTransform: "uppercase" }}>7-Day Performance Trend</div>
            {(data.trend_7d || []).map((d: any) => (
              <div key={d.date} style={{ display: "flex", justifyContent: "space-between", padding: "4px 0", borderBottom: `1px solid ${C.border}20` }}>
                <span style={{ fontSize: 10, color: C.text, fontWeight: 600, width: 40 }}>{d.date}</span>
                <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 4, marginLeft: 8 }}>
                  <div style={{ height: 6, borderRadius: 3, background: C.accent, width: `${d.occupancy}%`, transition: "width 0.3s" }} />
                  <span style={{ fontSize: 9, color: C.dim }}>{d.occupancy}%</span>
                </div>
                <span style={{ fontSize: 10, color: C.muted, fontFamily: "'IBM Plex Mono', monospace", width: 60, textAlign: "right" }}>{fmtD(d.adr)}</span>
                <span style={{ fontSize: 10, color: C.accent, fontFamily: "'IBM Plex Mono', monospace", width: 60, textAlign: "right" }}>{fmtD(d.revpar)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
