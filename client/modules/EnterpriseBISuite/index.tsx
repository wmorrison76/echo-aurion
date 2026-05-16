import React, { useState, useEffect } from "react";
const API = window.location.origin;
const C = { bg: "#0b0f1a", card: "#111827", border: "#1e293b", accent: "#c8a97e", green: "#10b981", red: "#ef4444", amber: "#f59e0b", blue: "#3b82f6", purple: "#8b5cf6", cyan: "#06b6d4", text: "#e2e8f0", dim: "#64748b", muted: "#475569" };
const fmt = (n: number) => `$${(n || 0).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
const fmtD = (n: number) => `$${(n || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const pct = (n: number) => `${(n || 0).toFixed(1)}%`;
function Badge({ text, color }: { text: string; color: string }) { return <span style={{ padding: "2px 8px", borderRadius: 4, fontSize: 9, fontWeight: 600, background: `${color}15`, color, textTransform: "uppercase" }}>{text}</span>; }
type Tab = "str" | "pnl" | "portfolio" | "pms" | "digest";

/* ═══ STR COMPETITIVE SET ═══ */
function STRTab() {
  const [data, setData] = useState<any>(null);
  useEffect(() => { fetch(`${API}/api/enterprise-bi/str/dashboard`).then(r => r.json()).then(setData); }, []);
  if (!data) return <div style={{ padding: 40, textAlign: "center", color: C.dim }}>Loading STR Data...</div>;
  const idx = data.indices;
  const idxColor = (v: number) => v > 105 ? C.green : v > 95 ? C.amber : C.red;
  return (
    <div data-testid="str-tab">
      {/* Index Scores */}
      <div style={{ display: "flex", gap: 12, marginBottom: 16 }}>
        {[{ l: "MPI (Occupancy)", v: idx.mpi, d: "Market Penetration Index" }, { l: "ARI (Rate)", v: idx.ari, d: "Average Rate Index" }, { l: "RGI (Revenue)", v: idx.rgi, d: "Revenue Generation Index" }].map(i => (
          <div key={i.l} style={{ flex: 1, background: C.card, border: `1px solid ${C.border}`, borderRadius: 10, padding: 16, textAlign: "center" }}>
            <div style={{ fontSize: 10, color: C.dim, textTransform: "uppercase", marginBottom: 4 }}>{i.l}</div>
            <div style={{ fontSize: 32, fontWeight: 700, color: idxColor(i.v), fontFamily: "'IBM Plex Mono', monospace" }}>{i.v}</div>
            <div style={{ fontSize: 9, color: idxColor(i.v) }}>{i.v > 100 ? "Outperforming" : "Below"} comp set</div>
          </div>
        ))}
      </div>
      {/* Insights */}
      <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
        <Badge text={`Position: ${data.insights.market_position}`} color={data.insights.market_position === "Leading" ? C.green : C.amber} />
        <Badge text={`Rate: ${data.insights.rate_strategy}`} color={data.insights.rate_strategy === "Premium" ? C.green : C.amber} />
        <Badge text={`Share: ${data.insights.occupancy_share}`} color={data.insights.occupancy_share === "Gaining" ? C.green : C.amber} />
        <Badge text={`Rank: #${data.ranking.position} of ${data.ranking.total}`} color={data.ranking.position <= 2 ? C.green : C.amber} />
      </div>
      {/* Comp Set Table */}
      <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 10, padding: 14, marginBottom: 16 }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: C.accent, marginBottom: 8, textTransform: "uppercase" }}>Competitive Set — {data.period}</div>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11 }}>
          <thead><tr style={{ background: "rgba(200,169,126,0.06)" }}>
            {["Property", "Rooms", "Occ %", "ADR", "RevPAR"].map(h => <th key={h} style={{ padding: "8px 10px", textAlign: "left", color: C.accent, fontWeight: 600, fontSize: 10, textTransform: "uppercase", borderBottom: `1px solid ${C.border}` }}>{h}</th>)}
          </tr></thead>
          <tbody>
            {data.comp_set.map((h: any) => (
              <tr key={h.name} style={{ borderBottom: `1px solid ${C.border}30`, background: h.type === "subject" ? `${C.accent}08` : "transparent" }}>
                <td style={{ padding: "8px 10px", color: C.text, fontWeight: h.type === "subject" ? 700 : 400 }}>{h.name} {h.type === "subject" && <Badge text="YOU" color={C.accent} />}</td>
                <td style={{ padding: "8px 10px", color: C.dim }}>{h.rooms}</td>
                <td style={{ padding: "8px 10px", color: C.text, fontFamily: "'IBM Plex Mono', monospace" }}>{pct(h.occupancy)}</td>
                <td style={{ padding: "8px 10px", color: C.accent, fontFamily: "'IBM Plex Mono', monospace" }}>{fmtD(h.adr)}</td>
                <td style={{ padding: "8px 10px", color: C.green, fontFamily: "'IBM Plex Mono', monospace", fontWeight: 700 }}>{fmtD(h.revpar)}</td>
              </tr>
            ))}
            <tr style={{ borderTop: `2px solid ${C.border}`, background: "rgba(200,169,126,0.04)" }}>
              <td style={{ padding: "8px 10px", fontWeight: 700, color: C.dim }}>Comp Set Avg</td>
              <td style={{ padding: "8px 10px" }} />
              <td style={{ padding: "8px 10px", color: C.dim, fontFamily: "'IBM Plex Mono', monospace" }}>{pct(data.comp_set_avg.occupancy)}</td>
              <td style={{ padding: "8px 10px", color: C.dim, fontFamily: "'IBM Plex Mono', monospace" }}>{fmtD(data.comp_set_avg.adr)}</td>
              <td style={{ padding: "8px 10px", color: C.dim, fontFamily: "'IBM Plex Mono', monospace" }}>{fmtD(data.comp_set_avg.revpar)}</td>
            </tr>
          </tbody>
        </table>
      </div>
      {/* 12-Month Trend */}
      <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 10, padding: 14 }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: C.accent, marginBottom: 8, textTransform: "uppercase" }}>12-Month RGI Trend</div>
        <div style={{ display: "flex", alignItems: "flex-end", gap: 4, height: 80, padding: "0 4px" }}>
          {data.trend_12m.map((m: any) => (
            <div key={m.month} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center" }} title={`${m.month}: RGI ${m.rgi}`}>
              <div style={{ width: "80%", height: Math.max(4, (m.rgi / 130) * 60), background: m.rgi >= 100 ? C.green : C.red, borderRadius: "3px 3px 0 0", transition: "height 0.3s" }} />
              <div style={{ width: "100%", height: 1, background: `${C.amber}40`, marginTop: -((100 / 130) * 60) }} />
              <span style={{ fontSize: 7, color: C.muted, marginTop: 2 }}>{m.month.split(" ")[0]}</span>
            </div>
          ))}
        </div>
        <div style={{ fontSize: 9, color: C.dim, marginTop: 4, textAlign: "center" }}>RGI (Revenue Generation Index) — Above 100 = outperforming market</div>
      </div>
    </div>
  );
}

/* ═══ P&L WATERFALL ═══ */
function PnLTab() {
  const [data, setData] = useState<any>(null);
  useEffect(() => { fetch(`${API}/api/enterprise-bi/pnl/waterfall`).then(r => r.json()).then(setData); }, []);
  if (!data) return <div style={{ padding: 40, textAlign: "center", color: C.dim }}>Loading P&L...</div>;
  const w = data.waterfall;
  const s = data.summary;
  const maxAbs = Math.max(...w.map((d: any) => Math.abs(d.value)));

  return (
    <div data-testid="pnl-tab">
      {/* KPIs */}
      <div style={{ display: "flex", gap: 10, marginBottom: 16 }}>
        {[{ l: "Total Revenue", v: fmt(s.total_revenue), c: C.accent }, { l: "Gross Profit", v: `${fmt(s.gross_profit)} (${pct(s.gross_margin)})`, c: C.green }, { l: "GOP", v: `${fmt(s.gop)} (${pct(s.gop_margin)})`, c: "#22c55e" }, { l: "Net Income", v: `${fmt(s.net_income)} (${pct(s.net_margin)})`, c: s.net_income >= 0 ? C.green : C.red }].map(k => (
          <div key={k.l} style={{ flex: 1, background: C.card, border: `1px solid ${C.border}`, borderRadius: 8, padding: "10px 14px" }}>
            <div style={{ fontSize: 9, color: C.dim, textTransform: "uppercase", marginBottom: 4 }}>{k.l}</div>
            <div style={{ fontSize: 16, fontWeight: 700, color: k.c, fontFamily: "'IBM Plex Mono', monospace" }}>{k.v}</div>
          </div>
        ))}
      </div>
      {/* Waterfall Chart */}
      <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 10, padding: 16, marginBottom: 16 }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: C.accent, marginBottom: 12, textTransform: "uppercase" }}>P&L Waterfall</div>
        <div style={{ display: "flex", alignItems: "center", gap: 3, height: 140, padding: "0 4px" }}>
          {w.map((item: any, i: number) => {
            const isPositive = item.value >= 0;
            const barH = Math.max(4, Math.abs(item.value) / maxAbs * 100);
            const isTotal = item.type === "total" || item.type === "subtotal" || item.type === "final";
            return (
              <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: isPositive ? "center" : "center", height: 140, justifyContent: "flex-end" }} title={`${item.label}: ${fmt(item.value)}`}>
                {isPositive && <div style={{ width: "70%", height: barH, background: item.color, borderRadius: "3px 3px 0 0", opacity: isTotal ? 1 : 0.8, border: isTotal ? `1px solid ${item.color}` : "none" }} />}
                {!isPositive && <div style={{ width: "70%", height: barH, background: item.color, borderRadius: "0 0 3px 3px", opacity: 0.7 }} />}
                <span style={{ fontSize: 6, color: C.muted, marginTop: 2, textAlign: "center", lineHeight: 1.1, maxWidth: 50, overflow: "hidden" }}>{item.label.split(" ")[0]}</span>
              </div>
            );
          })}
        </div>
      </div>
      {/* Department P&L */}
      <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 10, padding: 14 }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: C.accent, marginBottom: 8, textTransform: "uppercase" }}>Department P&L</div>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11 }}>
          <thead><tr>{["Department", "Revenue", "COGS", "Profit", "Margin"].map(h => <th key={h} style={{ padding: "6px 10px", textAlign: "left", color: C.accent, fontWeight: 600, fontSize: 10, borderBottom: `1px solid ${C.border}` }}>{h}</th>)}</tr></thead>
          <tbody>{(data.department_pnl || []).map((d: any) => (
            <tr key={d.dept} style={{ borderBottom: `1px solid ${C.border}20` }}>
              <td style={{ padding: "6px 10px", color: C.text, fontWeight: 600 }}>{d.dept}</td>
              <td style={{ padding: "6px 10px", color: C.accent, fontFamily: "'IBM Plex Mono', monospace" }}>{fmt(d.revenue)}</td>
              <td style={{ padding: "6px 10px", color: C.red, fontFamily: "'IBM Plex Mono', monospace" }}>{fmt(d.cost)}</td>
              <td style={{ padding: "6px 10px", color: C.green, fontFamily: "'IBM Plex Mono', monospace" }}>{fmt(d.profit)}</td>
              <td style={{ padding: "6px 10px", color: d.margin >= 70 ? C.green : C.amber }}>{pct(d.margin)}</td>
            </tr>
          ))}</tbody>
        </table>
      </div>
    </div>
  );
}

/* ═══ PORTFOLIO ═══ */
function PortfolioTab() {
  const [data, setData] = useState<any>(null);
  useEffect(() => { fetch(`${API}/api/enterprise-bi/portfolio/dashboard`).then(r => r.json()).then(setData); }, []);
  if (!data) return <div style={{ padding: 40, textAlign: "center", color: C.dim }}>Loading Portfolio...</div>;
  const ps = data.portfolio_summary;
  return (
    <div data-testid="portfolio-tab">
      <div style={{ display: "flex", gap: 10, marginBottom: 16 }}>
        {[{ l: "Properties", v: ps.total_properties, c: C.accent }, { l: "Total Rooms", v: ps.total_rooms, c: C.blue }, { l: "Portfolio Revenue", v: fmt(ps.total_revenue), c: C.green }, { l: "Avg Occupancy", v: pct(ps.avg_occupancy), c: C.amber }, { l: "Avg RevPAR", v: fmtD(ps.avg_revpar), c: C.accent }, { l: "Avg GOP%", v: pct(ps.avg_gop_margin), c: C.green }].map(k => (
          <div key={k.l} style={{ flex: 1, background: C.card, border: `1px solid ${C.border}`, borderRadius: 8, padding: "8px 12px" }}>
            <div style={{ fontSize: 9, color: C.dim, textTransform: "uppercase", marginBottom: 2 }}>{k.l}</div>
            <div style={{ fontSize: 16, fontWeight: 700, color: k.c, fontFamily: "'IBM Plex Mono', monospace" }}>{k.v}</div>
          </div>
        ))}
      </div>
      {/* Property Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 12 }}>
        {data.properties.map((p: any) => (
          <div key={p.id} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 10, padding: 14, borderLeft: `3px solid ${p.id === "prop-main" ? C.accent : C.blue}` }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: C.text }}>{p.name}</div>
              {p.data_source === "live_mongodb" && <Badge text="LIVE" color={C.green} />}
            </div>
            <div style={{ fontSize: 10, color: C.dim, marginBottom: 8 }}>{p.location} | {p.rooms} rooms | {p.type}</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 6 }}>
              {[{ l: "Occ", v: pct(p.occupancy) }, { l: "ADR", v: fmtD(p.adr) }, { l: "RevPAR", v: fmtD(p.revpar) }].map(m => (
                <div key={m.l}><div style={{ fontSize: 8, color: C.dim }}>{m.l}</div><div style={{ fontSize: 12, fontWeight: 700, color: C.text, fontFamily: "'IBM Plex Mono', monospace" }}>{m.v}</div></div>
              ))}
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6, padding: "4px 0", borderTop: `1px solid ${C.border}30` }}>
              <span style={{ fontSize: 10, color: C.accent }}>{fmt(p.total_revenue)} rev</span>
              <span style={{ fontSize: 10, color: C.green }}>GOP {pct(p.gop_margin)}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ═══ PMS DATA ═══ */
function PMSTab() {
  const [arrivals, setArrivals] = useState<any>(null);
  const [pace, setPace] = useState<any>(null);
  const [mix, setMix] = useState<any>(null);
  useEffect(() => {
    fetch(`${API}/api/enterprise-bi/pms/arrivals`).then(r => r.json()).then(setArrivals);
    fetch(`${API}/api/enterprise-bi/pms/otb-pace`).then(r => r.json()).then(setPace);
    fetch(`${API}/api/enterprise-bi/pms/guest-mix`).then(r => r.json()).then(setMix);
  }, []);
  if (!arrivals) return <div style={{ padding: 40, textAlign: "center", color: C.dim }}>Loading PMS Data...</div>;
  return (
    <div data-testid="pms-tab">
      {/* Arrivals KPIs */}
      <div style={{ display: "flex", gap: 10, marginBottom: 16 }}>
        {[{ l: "Today's Arrivals", v: arrivals.total_arrivals, c: C.blue }, { l: "VIP Arrivals", v: arrivals.vip_arrivals?.length || 0, c: C.amber }, { l: "Special Requests", v: arrivals.special_requests?.length || 0, c: C.purple }, { l: "Projected Rev", v: fmt(arrivals.projected_revenue), c: C.green }].map(k => (
          <div key={k.l} style={{ flex: 1, background: C.card, border: `1px solid ${C.border}`, borderRadius: 8, padding: "10px 14px" }}>
            <div style={{ fontSize: 9, color: C.dim, textTransform: "uppercase", marginBottom: 4 }}>{k.l}</div>
            <div style={{ fontSize: 20, fontWeight: 700, color: k.c, fontFamily: "'IBM Plex Mono', monospace" }}>{k.v}</div>
          </div>
        ))}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 16 }}>
        {/* Room Type Mix */}
        <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 10, padding: 14 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: C.accent, marginBottom: 8, textTransform: "uppercase" }}>Arrivals by Room Type</div>
          {Object.entries(arrivals.by_room_type || {}).sort((a: any, b: any) => b[1] - a[1]).map(([rt, count]: any) => (
            <div key={rt} style={{ display: "flex", justifyContent: "space-between", padding: "4px 0", borderBottom: `1px solid ${C.border}20` }}>
              <span style={{ fontSize: 11, color: C.text }}>{rt}</span>
              <span style={{ fontSize: 11, fontWeight: 700, color: C.accent, fontFamily: "'IBM Plex Mono', monospace" }}>{count}</span>
            </div>
          ))}
        </div>
        {/* Source Mix */}
        {mix && (
        <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 10, padding: 14 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: C.accent, marginBottom: 8, textTransform: "uppercase" }}>Guest Mix by Source</div>
          {(mix.by_source || []).map((s: any) => (
            <div key={s.source_id} style={{ display: "flex", justifyContent: "space-between", padding: "4px 0", borderBottom: `1px solid ${C.border}20` }}>
              <span style={{ fontSize: 11, color: C.text }}>{s.source}</span>
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <span style={{ fontSize: 10, color: C.dim }}>{s.reservations} res</span>
                <span style={{ fontSize: 10, color: C.accent }}>{pct(s.pct_of_total)}</span>
                <span style={{ fontSize: 10, fontWeight: 600, color: C.green, fontFamily: "'IBM Plex Mono', monospace" }}>{fmt(s.revenue)}</span>
              </div>
            </div>
          ))}
        </div>)}
      </div>
      {/* OTB Pace */}
      {pace && (
      <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 10, padding: 14 }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: C.accent, marginBottom: 8, textTransform: "uppercase" }}>21-Day OTB Pace</div>
        <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
          <span style={{ fontSize: 10, color: C.dim }}>Total Room Nights: <strong style={{ color: C.text }}>{pace.summary.total_room_nights}</strong></span>
          <span style={{ fontSize: 10, color: C.dim }}>Revenue: <strong style={{ color: C.accent }}>{fmt(pace.summary.total_revenue)}</strong></span>
          <span style={{ fontSize: 10, color: C.dim }}>Avg Occ: <strong style={{ color: C.green }}>{pct(pace.summary.avg_occupancy)}</strong></span>
        </div>
        <div style={{ display: "flex", alignItems: "flex-end", gap: 2, height: 60 }}>
          {(pace.pace || []).map((d: any) => (
            <div key={d.date} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center" }} title={`${d.date} (${d.day_of_week}): ${d.rooms_otb} rooms, ${pct(d.occupancy_otb)} occ`}>
              <div style={{ width: "70%", height: Math.max(2, d.occupancy_otb * 0.6), background: d.occupancy_otb >= 80 ? C.green : d.occupancy_otb >= 60 ? C.amber : C.red, borderRadius: "2px 2px 0 0" }} />
              <span style={{ fontSize: 6, color: C.muted }}>{d.day_of_week}</span>
            </div>
          ))}
        </div>
      </div>)}
    </div>
  );
}

/* ═══ DIGEST ═══ */
function DigestTab() {
  const [preview, setPreview] = useState<any>(null);
  const [settings, setSettings] = useState<any>(null);
  const [history, setHistory] = useState<any>(null);
  const [newEmail, setNewEmail] = useState("");
  const [sending, setSending] = useState(false);
  const [sendResult, setSendResult] = useState<any>(null);
  const load = () => {
    fetch(`${API}/api/enterprise-bi/digest/preview`).then(r => r.json()).then(setPreview);
    fetch(`${API}/api/enterprise-bi/digest/settings`).then(r => r.json()).then(setSettings);
    fetch(`${API}/api/enterprise-bi/digest/history`).then(r => r.json()).then(setHistory);
  };
  useEffect(load, []);

  const addRecipient = () => {
    if (!newEmail || !newEmail.includes("@")) return;
    const updated = { ...settings, recipients: [...(settings?.recipients || []), newEmail] };
    fetch(`${API}/api/enterprise-bi/digest/settings`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(updated) })
      .then(r => r.json()).then(() => { setNewEmail(""); load(); });
  };
  const removeRecipient = (email: string) => {
    const updated = { ...settings, recipients: (settings?.recipients || []).filter((e: string) => e !== email) };
    fetch(`${API}/api/enterprise-bi/digest/settings`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(updated) })
      .then(r => r.json()).then(load);
  };
  const toggleEnabled = () => {
    const updated = { ...settings, enabled: !settings?.enabled };
    fetch(`${API}/api/enterprise-bi/digest/settings`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(updated) })
      .then(r => r.json()).then(load);
  };
  const sendNow = () => {
    setSending(true); setSendResult(null);
    fetch(`${API}/api/enterprise-bi/digest/send`, { method: "POST" })
      .then(r => r.json()).then(r => { setSendResult(r); setSending(false); load(); });
  };

  if (!preview) return <div style={{ padding: 40, textAlign: "center", color: C.dim }}>Loading Digest...</div>;

  return (
    <div data-testid="digest-tab" style={{ display: "grid", gridTemplateColumns: "1fr 340px", gap: 16, height: "100%" }}>
      {/* Email Preview */}
      <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 10, overflow: "hidden", display: "flex", flexDirection: "column" }}>
        <div style={{ padding: "10px 16px", borderBottom: `1px solid ${C.border}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: C.accent, textTransform: "uppercase" }}>Email Preview</span>
          <Badge text="Monday 7 AM" color={C.cyan} />
        </div>
        <div style={{ flex: 1, overflowY: "auto", padding: 16 }}>
          <div dangerouslySetInnerHTML={{ __html: preview.html }} />
        </div>
      </div>

      {/* Settings & History */}
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {/* Send Button */}
        <button data-testid="digest-send-now" onClick={sendNow} disabled={sending} style={{ width: "100%", padding: "10px 16px", borderRadius: 8, border: `1px solid ${C.accent}`, background: `${C.accent}18`, color: C.accent, fontSize: 12, fontWeight: 700, cursor: sending ? "wait" : "pointer", textTransform: "uppercase", letterSpacing: 1 }}>
          {sending ? "Sending..." : "Send Digest Now"}
        </button>
        {sendResult && (
          <div style={{ padding: "8px 12px", borderRadius: 6, background: sendResult.status === "sent" ? `${C.green}12` : `${C.amber}12`, fontSize: 11, color: sendResult.status === "sent" ? C.green : C.amber }}>
            {sendResult.status === "sent" ? `Sent to ${sendResult.digest?.recipients?.length || 0} recipients` : sendResult.reason || "Check settings"}
          </div>
        )}

        {/* Settings */}
        <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 10, padding: 14 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: C.accent, textTransform: "uppercase" }}>Settings</span>
            <button data-testid="digest-toggle" onClick={toggleEnabled} style={{ padding: "3px 10px", borderRadius: 12, border: "none", background: settings?.enabled ? C.green : C.red, color: "#fff", fontSize: 9, fontWeight: 700, cursor: "pointer" }}>
              {settings?.enabled ? "ENABLED" : "DISABLED"}
            </button>
          </div>
          <div style={{ fontSize: 10, color: C.dim, marginBottom: 8 }}>Recipients</div>
          {(settings?.recipients || []).map((email: string) => (
            <div key={email} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "4px 0", borderBottom: `1px solid ${C.border}20` }}>
              <span style={{ fontSize: 11, color: C.text }}>{email}</span>
              <button onClick={() => removeRecipient(email)} style={{ background: "none", border: "none", color: C.red, cursor: "pointer", fontSize: 10, padding: "2px 6px" }}>remove</button>
            </div>
          ))}
          <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
            <input data-testid="digest-email-input" value={newEmail} onChange={e => setNewEmail(e.target.value)} onKeyDown={e => e.key === "Enter" && addRecipient()} placeholder="gm@resort.com" style={{ flex: 1, padding: "6px 10px", borderRadius: 6, border: `1px solid ${C.border}`, background: C.bg, color: C.text, fontSize: 11 }} />
            <button data-testid="digest-add-recipient" onClick={addRecipient} style={{ padding: "6px 12px", borderRadius: 6, border: `1px solid ${C.accent}40`, background: `${C.accent}10`, color: C.accent, fontSize: 10, fontWeight: 600, cursor: "pointer" }}>Add</button>
          </div>
        </div>

        {/* History */}
        <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 10, padding: 14, flex: 1, overflowY: "auto" }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: C.accent, textTransform: "uppercase", marginBottom: 8 }}>Send History</div>
          {(!history?.history || history.history.length === 0) && <div style={{ fontSize: 11, color: C.dim, textAlign: "center", padding: 16 }}>No digests sent yet</div>}
          {(history?.history || []).map((h: any) => (
            <div key={h.id} style={{ padding: "8px 0", borderBottom: `1px solid ${C.border}20` }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 2 }}>
                <span style={{ fontSize: 10, color: C.text }}>{new Date(h.sent_at).toLocaleDateString()} {new Date(h.sent_at).toLocaleTimeString()}</span>
                <Badge text={h.trigger} color={h.trigger === "scheduled" ? C.cyan : C.amber} />
              </div>
              <div style={{ fontSize: 10, color: C.dim }}>{h.recipients?.length || 0} recipients | RGI: {h.data_snapshot?.rgi} | GOP: ${(h.data_snapshot?.gop || 0).toLocaleString()}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ═══ MAIN ═══ */
export default function EnterpriseBISuite() {
  const [tab, setTab] = useState<Tab>("str");
  const tabs: { id: Tab; label: string }[] = [
    { id: "str", label: "Comp Set (STR)" },
    { id: "pnl", label: "P&L Waterfall" },
    { id: "portfolio", label: "Portfolio" },
    { id: "pms", label: "PMS Bridge" },
    { id: "digest", label: "Weekly Digest" },
  ];
  return (
    <div data-testid="enterprise-bi-panel" style={{ height: "100%", background: C.bg, color: C.text, fontFamily: "'Inter', sans-serif", borderRadius: 10, overflow: "hidden", display: "flex", flexDirection: "column" }}>
      <div style={{ padding: "10px 20px", borderBottom: `1px solid ${C.border}`, background: "rgba(200,169,126,0.04)", flexShrink: 0, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ fontSize: 16, fontWeight: 700, color: C.accent }}>Enterprise BI Suite</div>
        <div style={{ display: "flex", gap: 4 }}>
          {tabs.map(t => <button key={t.id} onClick={() => setTab(t.id)} data-testid={`bi-tab-${t.id}`} style={{ padding: "5px 14px", borderRadius: 6, border: `1px solid ${tab === t.id ? C.accent : "transparent"}`, background: tab === t.id ? `${C.accent}15` : "transparent", color: tab === t.id ? C.accent : C.dim, fontSize: 11, fontWeight: 600, cursor: "pointer" }}>{t.label}</button>)}
        </div>
      </div>
      <div style={{ flex: 1, overflowY: "auto", padding: "16px 20px" }}>
        {tab === "str" && <STRTab />}
        {tab === "pnl" && <PnLTab />}
        {tab === "portfolio" && <PortfolioTab />}
        {tab === "pms" && <PMSTab />}
        {tab === "digest" && <DigestTab />}
      </div>
    </div>
  );
}
