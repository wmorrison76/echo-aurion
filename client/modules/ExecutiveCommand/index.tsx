import React, { useState, useEffect, useCallback } from "react";

const BACKEND = window.location.origin;
function fmt(n: number) { if (!n && n !== 0) return "$0"; return "$" + Math.abs(n).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 }); }

/* ── Health Ring SVG ── */
function HealthRing({ score, size = 100, label }: { score: number | null; size?: number; label?: string }) {
  if (score === null) return <div style={{ width: size, height: size, display: "flex", alignItems: "center", justifyContent: "center", color: "#475569", fontSize: 10 }}>No Data</div>;
  const r = (size - 10) / 2;
  const c = 2 * Math.PI * r;
  const offset = c - (score / 100) * c;
  const color = score >= 75 ? "#10b981" : score >= 50 ? "#f59e0b" : "#ef4444";
  const bg = score >= 75 ? "rgba(16,185,129,0.06)" : score >= 50 ? "rgba(245,158,11,0.06)" : "rgba(239,68,68,0.06)";
  return (
    <div style={{ position: "relative", width: size, height: size }}>
      <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
        <circle cx={size/2} cy={size/2} r={r} fill={bg} stroke="rgba(255,255,255,0.04)" strokeWidth="5" />
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth="5" strokeDasharray={c} strokeDashoffset={offset} strokeLinecap="round" style={{ transition: "stroke-dashoffset 1s ease" }} />
      </svg>
      <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
        <div style={{ fontSize: size * 0.28, fontWeight: 700, color, fontFamily: "'IBM Plex Mono', monospace" }}>{score}</div>
        {label && <div style={{ fontSize: 8, color: "#64748b", letterSpacing: "0.06em", textTransform: "uppercase" }}>{label}</div>}
      </div>
    </div>
  );
}

function Badge({ text, variant }: { text: string; variant: string }) {
  const c: Record<string, string> = { success: "#10b981", healthy: "#10b981", warning: "#f59e0b", danger: "#ef4444", critical: "#ef4444", info: "#3b82f6", neutral: "#64748b", no_data: "#475569" };
  const color = c[variant] || "#64748b";
  return <span style={{ padding: "2px 8px", borderRadius: 4, fontSize: 9, fontWeight: 600, background: `${color}15`, color, letterSpacing: "0.04em", textTransform: "uppercase" }}>{text}</span>;
}

function StatusDot({ status }: { status: string }) {
  const c = status === "healthy" ? "#10b981" : status === "warning" ? "#f59e0b" : status === "critical" ? "#ef4444" : "#475569";
  return <span style={{ display: "inline-block", width: 8, height: 8, borderRadius: "50%", background: c, boxShadow: `0 0 8px ${c}40`, marginRight: 6 }} />;
}

/* ═══════════════════════════════════════════════════════════
   MAIN EXECUTIVE COMMAND CENTER
   ═══════════════════════════════════════════════════════════ */
export default function ExecutiveCommand() {
  const [userId, setUserId] = useState("usr-chef-001");
  const [overview, setOverview] = useState<any>(null);
  const [selectedOutlet, setSelectedOutlet] = useState<string | null>(null);
  const [outletDetail, setOutletDetail] = useState<any>(null);
  const [comparison, setComparison] = useState<any>(null);
  const [briefing, setBriefing] = useState<any>(null);
  const [briefingLoading, setBriefingLoading] = useState(false);
  const [tab, setTab] = useState("health");
  const [loading, setLoading] = useState(true);
  // Threshold editor
  const [editThresholds, setEditThresholds] = useState(false);
  const [thresholds, setThresholds] = useState<any>(null);

  const USERS = [
    { id: "usr-chef-001", label: "Chef Marcus Laurent — Exec Chef" },
    { id: "usr-fbd-001", label: "Maria Santos — F&B Director" },
    { id: "usr-gm-001", label: "Sarah Mitchell — General Manager" },
    { id: "usr-owner-001", label: "James Wellington III — Owner" },
  ];

  const load = useCallback(async (uid: string) => {
    setLoading(true);
    try {
      const [ov, comp, th] = await Promise.all([
        fetch(`${BACKEND}/api/executive/health-overview?user_id=${uid}`).then(r => r.json()),
        fetch(`${BACKEND}/api/executive/compare?user_id=${uid}`).then(r => r.json()),
        fetch(`${BACKEND}/api/executive/thresholds?user_id=${uid}`).then(r => r.json()),
      ]);
      setOverview(ov);
      setComparison(comp);
      setThresholds(th.thresholds);
    } catch (e) { console.error(e); }
    setLoading(false);
  }, []);

  useEffect(() => { load(userId); }, [userId, load]);

  const loadOutlet = async (oid: string) => {
    setSelectedOutlet(oid);
    setTab("detail");
    const res = await fetch(`${BACKEND}/api/executive/outlet/${oid}?user_id=${userId}`);
    setOutletDetail(await res.json());
  };

  const loadBriefing = async () => {
    setBriefingLoading(true);
    try {
      const res = await fetch(`${BACKEND}/api/executive/morning-briefing?user_id=${userId}`, { method: "POST" });
      setBriefing(await res.json());
    } finally { setBriefingLoading(false); }
  };

  const saveThresholds = async () => {
    await fetch(`${BACKEND}/api/executive/thresholds`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ user_id: userId, thresholds }),
    });
    setEditThresholds(false);
    load(userId);
  };

  if (loading) return <div style={{ padding: 40, textAlign: "center", color: "#64748b" }}>Loading Executive Command Center...</div>;

  const card: React.CSSProperties = { background: "rgba(255,255,255,0.015)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 10, overflow: "hidden" };
  const th_s: React.CSSProperties = { padding: "8px 12px", textAlign: "left", fontSize: 9, letterSpacing: "0.08em", textTransform: "uppercase", color: "rgba(148,163,184,0.4)", borderBottom: "1px solid rgba(255,255,255,0.04)" };
  const td_s: React.CSSProperties = { padding: "8px 12px", borderBottom: "1px solid rgba(255,255,255,0.02)", fontSize: 11, color: "#94a3b8" };
  const mono: React.CSSProperties = { fontFamily: "'IBM Plex Mono', monospace" };
  const outlets = overview?.outlets || [];
  const TABS = [
    { id: "health", l: "Health Overview" },
    { id: "detail", l: selectedOutlet ? `${outlets.find((o: any) => o.outlet_id === selectedOutlet)?.name || "Outlet"}` : "Outlet Detail" },
    { id: "compare", l: "Compare Outlets" },
    { id: "briefing", l: "Morning Briefing" },
    { id: "thresholds", l: "Alert Settings" },
  ];

  return (
    <div style={{ fontFamily: "'IBM Plex Sans', -apple-system, sans-serif", padding: 24, color: "#e2e8f0", minHeight: "100%" }} data-testid="executive-command-panel">
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 18 }}>
        <div>
          <h1 style={{ fontSize: 18, fontWeight: 300, letterSpacing: "0.12em", color: "#c8a97e", margin: 0 }}>EXECUTIVE COMMAND CENTER</h1>
          <p style={{ fontSize: 11, color: "rgba(148,163,184,0.4)", marginTop: 2 }}>
            {overview?.user?.name} &bull; {overview?.user?.role} &bull; {overview?.outlet_count} outlets
          </p>
        </div>
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <select data-testid="exec-user-select" value={userId} onChange={e => setUserId(e.target.value)}
            style={{ padding: "6px 12px", borderRadius: 6, border: "1px solid rgba(200,169,126,0.2)", background: "#0f1219", color: "#c8a97e", fontSize: 11, outline: "none" }}>
            {USERS.map(u => <option key={u.id} value={u.id}>{u.label}</option>)}
          </select>
        </div>
      </div>

      {/* Resort Health Banner */}
      <div style={{ display: "flex", alignItems: "center", gap: 20, marginBottom: 18, padding: "14px 20px", ...card, borderLeft: `3px solid ${overview?.resort_health >= 75 ? "#10b981" : overview?.resort_health >= 50 ? "#f59e0b" : "#ef4444"}` }}>
        <HealthRing score={overview?.resort_health} size={70} label="Resort" />
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: "#e2e8f0" }}>Overall Resort Health</div>
          <div style={{ fontSize: 11, color: "#64748b" }}>
            {overview?.critical_count} critical &bull; {overview?.warning_count} warning &bull; {outlets.filter((o: any) => o.status === "healthy").length} healthy
          </div>
        </div>
        <div style={{ display: "flex", gap: 12 }}>
          {outlets.filter((o: any) => o.health_score !== null).map((o: any) => (
            <div key={o.outlet_id} onClick={() => loadOutlet(o.outlet_id)}
              style={{ textAlign: "center", cursor: "pointer", padding: "6px 10px", borderRadius: 8, background: selectedOutlet === o.outlet_id ? "rgba(200,169,126,0.08)" : "transparent", transition: "background 0.15s" }}
              onMouseEnter={e => (e.currentTarget.style.background = "rgba(200,169,126,0.06)")}
              onMouseLeave={e => { if (selectedOutlet !== o.outlet_id) e.currentTarget.style.background = "transparent"; }}>
              <HealthRing score={o.health_score} size={48} />
              <div style={{ fontSize: 9, color: "#94a3b8", marginTop: 4, maxWidth: 60, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{o.name.split(" ")[0]}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: 3, marginBottom: 16, borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
        {TABS.map(t => (
          <button key={t.id} data-testid={`exec-tab-${t.id}`} onClick={() => { setTab(t.id); if (t.id === "briefing" && !briefing) loadBriefing(); }}
            style={{ padding: "8px 18px", border: "none", cursor: "pointer", fontSize: 11, fontWeight: 500, borderRadius: "6px 6px 0 0",
              background: tab === t.id ? "rgba(200,169,126,0.10)" : "transparent", color: tab === t.id ? "#c8a97e" : "#64748b",
              borderBottom: tab === t.id ? "2px solid #c8a97e" : "2px solid transparent" }}>{t.l}</button>
        ))}
      </div>

      {/* ── HEALTH OVERVIEW TAB ── */}
      {tab === "health" && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 14 }}>
          {outlets.map((o: any) => (
            <div key={o.outlet_id} data-testid={`outlet-card-${o.outlet_id}`}
              onClick={() => o.health_score !== null && loadOutlet(o.outlet_id)}
              style={{ ...card, cursor: o.health_score !== null ? "pointer" : "default", transition: "border-color 0.2s, transform 0.15s",
                borderColor: selectedOutlet === o.outlet_id ? "rgba(200,169,126,0.3)" : undefined }}
              onMouseEnter={e => { if (o.health_score !== null) { (e.currentTarget as HTMLElement).style.borderColor = "rgba(200,169,126,0.2)"; (e.currentTarget as HTMLElement).style.transform = "translateY(-2px)"; } }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = "rgba(255,255,255,0.06)"; (e.currentTarget as HTMLElement).style.transform = "none"; }}>
              <div style={{ padding: "16px 18px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <StatusDot status={o.status} />
                      <span style={{ fontSize: 13, fontWeight: 600, color: "#e2e8f0" }}>{o.name}</span>
                    </div>
                    <div style={{ fontSize: 10, color: "#64748b", marginTop: 2 }}>{o.type}</div>
                  </div>
                  <HealthRing score={o.health_score} size={56} />
                </div>

                {o.metrics ? (
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
                    {[
                      { l: "Revenue", v: fmt(o.metrics.revenue), c: "#10b981" },
                      { l: "Food Cost", v: `${o.metrics.food_cost_pct}%`, c: o.metrics.food_cost_pct > 26 ? "#ef4444" : "#10b981" },
                      { l: "Avg Check", v: fmt(o.metrics.avg_check), c: "#8b5cf6" },
                      { l: "Covers", v: o.metrics.covers, c: "#3b82f6" },
                      { l: "Bev Cost", v: `${o.metrics.bev_cost_pct}%`, c: "#06b6d4" },
                      { l: "Waste", v: `${o.metrics.waste_pct}%`, c: o.metrics.waste_pct > 1.5 ? "#ef4444" : "#10b981" },
                    ].map((m, i) => (
                      <div key={i}>
                        <div style={{ fontSize: 8, letterSpacing: "0.08em", textTransform: "uppercase", color: "rgba(148,163,184,0.4)" }}>{m.l}</div>
                        <div style={{ fontSize: 13, fontWeight: 600, color: m.c, ...mono }}>{m.v}</div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div style={{ textAlign: "center", color: "#475569", fontSize: 11, padding: 10 }}>No POS data for this outlet</div>
                )}

                {o.alerts?.length > 0 && (
                  <div style={{ marginTop: 10, borderTop: "1px solid rgba(255,255,255,0.04)", paddingTop: 8 }}>
                    {o.alerts.map((a: any, i: number) => (
                      <div key={i} style={{ fontSize: 10, color: a.severity === "critical" ? "#fca5a5" : "#fbbf24", marginBottom: 2 }}>
                        <StatusDot status={a.severity} /> {a.metric}: {a.value}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── OUTLET DETAIL TAB ── */}
      {tab === "detail" && outletDetail && !outletDetail.error && (
        <div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 14 }}>
            {/* Metrics */}
            <div style={card}>
              <div style={{ padding: "12px 16px", borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase", color: "rgba(200,169,126,0.6)" }}>{outletDetail.name} — KPIs</span>
              </div>
              <div style={{ padding: 16, display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
                {[
                  { l: "Revenue", v: fmt(outletDetail.metrics?.revenue), c: "#10b981" },
                  { l: "Food Cost", v: `${outletDetail.metrics?.food_cost_pct}%`, c: "#ef4444" },
                  { l: "Bev Cost", v: `${outletDetail.metrics?.bev_cost_pct}%`, c: "#06b6d4" },
                  { l: "Covers", v: outletDetail.metrics?.covers, c: "#3b82f6" },
                  { l: "Avg Check", v: fmt(outletDetail.metrics?.avg_check), c: "#8b5cf6" },
                  { l: "Waste", v: `${outletDetail.metrics?.waste_pct}%`, c: "#f59e0b" },
                ].map((m, i) => (
                  <div key={i}>
                    <div style={{ fontSize: 9, color: "#475569", textTransform: "uppercase", letterSpacing: "0.08em" }}>{m.l}</div>
                    <div style={{ fontSize: 20, fontWeight: 600, color: m.c, ...mono }}>{m.v}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Labor */}
            <div style={card}>
              <div style={{ padding: "12px 16px", borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase", color: "rgba(200,169,126,0.6)" }}>Labor</span>
              </div>
              <div style={{ padding: 12 }}>
                {(outletDetail.labor || []).map((l: any, i: number) => (
                  <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "8px 4px", borderBottom: "1px solid rgba(255,255,255,0.02)" }}>
                    <span style={{ fontSize: 12, color: "#e2e8f0" }}>{l.department}</span>
                    <div style={{ display: "flex", gap: 14 }}>
                      <span style={{ fontSize: 11, color: "#64748b" }}>{l.total_hours}hrs</span>
                      <span style={{ fontSize: 11, color: l.ot_pct > 5 ? "#ef4444" : "#10b981", ...mono }}>{l.ot_pct}% OT</span>
                      <span style={{ fontSize: 12, fontWeight: 600, color: "#c8a97e", ...mono }}>{fmt(l.total_cost)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Top Items */}
          <div style={{ ...card, marginBottom: 14 }}>
            <div style={{ padding: "12px 16px", borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
              <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase", color: "rgba(200,169,126,0.6)" }}>Top Menu Items</span>
            </div>
            <div style={{ maxHeight: 220, overflow: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead><tr><th style={th_s}>Item</th><th style={{ ...th_s, textAlign: "right" }}>Qty</th><th style={{ ...th_s, textAlign: "right" }}>Revenue</th><th style={{ ...th_s, textAlign: "right" }}>FC%</th><th style={{ ...th_s, textAlign: "right" }}>Margin</th></tr></thead>
                <tbody>
                  {(outletDetail.metrics?.top_items || []).map((item: any, i: number) => (
                    <tr key={i}>
                      <td style={{ ...td_s, fontWeight: 500, color: "#f1f5f9" }}>{item.name}</td>
                      <td style={{ ...td_s, ...mono, textAlign: "right" }}>{item.qty}</td>
                      <td style={{ ...td_s, ...mono, textAlign: "right" }}>{fmt(item.revenue)}</td>
                      <td style={{ ...td_s, ...mono, textAlign: "right", color: item.food_cost_pct > 30 ? "#ef4444" : "#10b981" }}>{item.food_cost_pct}%</td>
                      <td style={{ ...td_s, ...mono, textAlign: "right", color: "#10b981" }}>{fmt(item.margin)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* 7-Day Trend */}
          <div style={card}>
            <div style={{ padding: "12px 16px", borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
              <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase", color: "rgba(200,169,126,0.6)" }}>7-Day Trend</span>
            </div>
            <div style={{ padding: 12 }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead><tr><th style={th_s}>Date</th><th style={{ ...th_s, textAlign: "right" }}>Revenue</th><th style={{ ...th_s, textAlign: "right" }}>Covers</th><th style={{ ...th_s, textAlign: "right" }}>Txns</th></tr></thead>
                <tbody>
                  {(outletDetail.metrics?.trend || []).map((d: any, i: number) => (
                    <tr key={i}>
                      <td style={{ ...td_s, ...mono }}>{d.date}</td>
                      <td style={{ ...td_s, ...mono, textAlign: "right" }}>{fmt(d.revenue)}</td>
                      <td style={{ ...td_s, ...mono, textAlign: "right" }}>{d.covers}</td>
                      <td style={{ ...td_s, ...mono, textAlign: "right" }}>{d.txns}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
      {tab === "detail" && !outletDetail && (
        <div style={{ textAlign: "center", padding: 40, color: "#64748b" }}>Click an outlet from Health Overview to view details</div>
      )}

      {/* ── COMPARE TAB ── */}
      {tab === "compare" && comparison && (
        <div style={card}>
          <div style={{ padding: "12px 16px", borderBottom: "1px solid rgba(255,255,255,0.04)", display: "flex", justifyContent: "space-between" }}>
            <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase", color: "rgba(200,169,126,0.6)" }}>Cross-Outlet Comparison</span>
            {comparison.needs_attention?.length > 0 && <Badge text={`${comparison.needs_attention.length} need attention`} variant="warning" />}
          </div>
          <div style={{ overflow: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead><tr><th style={th_s}>Outlet</th><th style={th_s}>Type</th><th style={{ ...th_s, textAlign: "center" }}>Health</th><th style={{ ...th_s, textAlign: "right" }}>Revenue</th><th style={{ ...th_s, textAlign: "right" }}>FC%</th><th style={{ ...th_s, textAlign: "right" }}>Bev%</th><th style={{ ...th_s, textAlign: "right" }}>Avg Check</th><th style={{ ...th_s, textAlign: "right" }}>Covers</th></tr></thead>
              <tbody>
                {(comparison.comparison || []).map((c: any, i: number) => (
                  <tr key={i} onClick={() => loadOutlet(c.outlet_id)} style={{ cursor: "pointer" }}
                    onMouseEnter={e => (e.currentTarget.style.background = "rgba(200,169,126,0.03)")}
                    onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
                    <td style={{ ...td_s, fontWeight: 500, color: "#f1f5f9" }}><StatusDot status={c.health >= 75 ? "healthy" : c.health >= 50 ? "warning" : "critical"} /> {c.name}</td>
                    <td style={td_s}><Badge text={c.type} variant="neutral" /></td>
                    <td style={{ ...td_s, textAlign: "center" }}><span style={{ ...mono, fontWeight: 700, color: c.health >= 75 ? "#10b981" : c.health >= 50 ? "#f59e0b" : "#ef4444" }}>{c.health}</span></td>
                    <td style={{ ...td_s, ...mono, textAlign: "right" }}>{fmt(c.revenue)}</td>
                    <td style={{ ...td_s, ...mono, textAlign: "right", color: c.food_cost_pct > 26 ? "#ef4444" : "#10b981" }}>{c.food_cost_pct}%</td>
                    <td style={{ ...td_s, ...mono, textAlign: "right" }}>{c.bev_cost_pct}%</td>
                    <td style={{ ...td_s, ...mono, textAlign: "right" }}>{fmt(c.avg_check)}</td>
                    <td style={{ ...td_s, ...mono, textAlign: "right" }}>{c.covers}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── MORNING BRIEFING TAB ── */}
      {tab === "briefing" && (
        <div>
          {briefingLoading ? (
            <div style={{ textAlign: "center", padding: 40, color: "#64748b" }}>EchoAi&sup3; is preparing your morning briefing...</div>
          ) : briefing ? (
            <div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: 10, marginBottom: 14 }}>
                {(briefing.outlet_summary || []).map((o: any, i: number) => (
                  <div key={i} style={{ ...card, padding: "12px 14px", borderLeft: `3px solid ${o.status === "healthy" ? "#10b981" : o.status === "warning" ? "#f59e0b" : "#ef4444"}` }}>
                    <div style={{ fontSize: 11, fontWeight: 500, color: "#e2e8f0" }}>{o.name}</div>
                    <div style={{ fontSize: 18, fontWeight: 700, color: o.health >= 75 ? "#10b981" : o.health >= 50 ? "#f59e0b" : "#ef4444", ...mono }}>{o.health}</div>
                    {o.alerts > 0 && <div style={{ fontSize: 9, color: "#ef4444" }}>{o.alerts} alerts</div>}
                  </div>
                ))}
              </div>

              {briefing.ot_alerts?.length > 0 && (
                <div style={{ ...card, borderLeft: "3px solid #f59e0b", marginBottom: 14 }}>
                  <div style={{ padding: "10px 14px", fontSize: 11, fontWeight: 600, color: "#f59e0b", letterSpacing: "0.06em" }}>OVERTIME RISKS</div>
                  <div style={{ padding: "0 14px 12px" }}>
                    {briefing.ot_alerts.map((a: string, i: number) => (
                      <div key={i} style={{ fontSize: 11, color: "#94a3b8", marginBottom: 2 }}>&bull; {a}</div>
                    ))}
                  </div>
                </div>
              )}

              <div style={{ ...card, borderLeft: "3px solid #c8a97e" }} data-testid="morning-briefing">
                <div style={{ padding: "12px 16px", borderBottom: "1px solid rgba(255,255,255,0.04)", display: "flex", justifyContent: "space-between" }}>
                  <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase", color: "rgba(200,169,126,0.6)" }}>EchoAi&sup3; Morning Briefing</span>
                  <button onClick={loadBriefing} style={{ padding: "4px 10px", borderRadius: 4, border: "1px solid rgba(200,169,126,0.2)", background: "transparent", color: "#c8a97e", fontSize: 10, cursor: "pointer" }}>Refresh</button>
                </div>
                <div style={{ padding: 18, whiteSpace: "pre-wrap", fontSize: 13, lineHeight: 1.8, color: "rgba(226,232,240,0.85)" }}>
                  {briefing.narrative}
                </div>
              </div>
            </div>
          ) : (
            <div style={{ textAlign: "center", padding: 40 }}>
              <button onClick={loadBriefing} style={{ padding: "10px 24px", borderRadius: 8, border: "1px solid rgba(200,169,126,0.3)", background: "rgba(200,169,126,0.08)", color: "#c8a97e", fontSize: 13, cursor: "pointer" }}>
                Generate Morning Briefing
              </button>
            </div>
          )}
        </div>
      )}

      {/* ── THRESHOLDS TAB ── */}
      {tab === "thresholds" && thresholds && (
        <div style={card}>
          <div style={{ padding: "12px 16px", borderBottom: "1px solid rgba(255,255,255,0.04)", display: "flex", justifyContent: "space-between" }}>
            <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase", color: "rgba(200,169,126,0.6)" }}>Alert Thresholds</span>
            <button data-testid="save-thresholds-btn" onClick={editThresholds ? saveThresholds : () => setEditThresholds(true)}
              style={{ padding: "5px 14px", borderRadius: 5, border: "1px solid rgba(200,169,126,0.3)", background: editThresholds ? "rgba(200,169,126,0.15)" : "transparent", color: "#c8a97e", fontSize: 10, cursor: "pointer" }}>
              {editThresholds ? "Save" : "Edit"}
            </button>
          </div>
          <div style={{ padding: 16 }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead><tr><th style={th_s}>Metric</th><th style={{ ...th_s, textAlign: "center", color: "#10b981" }}>Green (Healthy)</th><th style={{ ...th_s, textAlign: "center", color: "#f59e0b" }}>Amber (Warning)</th><th style={{ ...th_s, textAlign: "center", color: "#ef4444" }}>Red (Critical)</th></tr></thead>
              <tbody>
                {Object.entries(thresholds).map(([key, vals]: [string, any]) => (
                  <tr key={key}>
                    <td style={{ ...td_s, fontWeight: 500, color: "#e2e8f0", textTransform: "capitalize" }}>{key.replace(/_/g, " ")}</td>
                    {["green", "amber", "red"].map(level => (
                      <td key={level} style={{ ...td_s, textAlign: "center" }}>
                        {editThresholds ? (
                          <input type="number" value={vals[level]} onChange={e => setThresholds({ ...thresholds, [key]: { ...vals, [level]: parseFloat(e.target.value) || 0 } })}
                            style={{ width: 60, padding: "4px 6px", borderRadius: 4, border: "1px solid rgba(255,255,255,0.1)", background: "rgba(255,255,255,0.02)", color: "#e2e8f0", fontSize: 12, ...mono, textAlign: "center", outline: "none" }} />
                        ) : (
                          <span style={{ ...mono, color: level === "green" ? "#10b981" : level === "amber" ? "#f59e0b" : "#ef4444" }}>{vals[level]}</span>
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
            <div style={{ marginTop: 12, fontSize: 11, color: "#64748b" }}>
              Values below Green are healthy. Between Green and Amber trigger warnings. Above Red is critical.
              For avg check and covers, higher values are better.
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
