import React, { useState, useEffect, useCallback } from "react";

const BACKEND = window.location.origin;
function fmt(n: number) { if (!n && n !== 0) return "$0"; if (Math.abs(n) >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`; return "$" + n.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 }); }

function Badge({ text, variant }: { text: string; variant: string }) {
  const c: Record<string, string> = { success: "#10b981", warning: "#f59e0b", danger: "#ef4444", info: "#3b82f6", neutral: "#64748b", favorable: "#10b981", unfavorable: "#ef4444" };
  const color = c[variant] || "#64748b";
  return <span style={{ padding: "2px 8px", borderRadius: 4, fontSize: 9, fontWeight: 600, background: `${color}15`, color, letterSpacing: "0.04em", textTransform: "uppercase" }}>{text}</span>;
}

export default function BudgetCenter() {
  const [tab, setTab] = useState("flash");
  const [flash, setFlash] = useState<any>(null);
  const [budget, setBudget] = useState<any>(null);
  const [variance, setVariance] = useState<any>(null);
  const [twelveMonth, setTwelveMonth] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Budget builder form
  const [drivers, setDrivers] = useState({
    avg_daily_covers: 225, avg_check: 85, food_cost_target_pct: 22,
    bev_cost_target_pct: 18, hourly_labor_target_pct: 25, growth_rate_pct: 3,
    banquet_events_per_month: 6, banquet_avg_revenue: 12000,
    mgmt_salary_monthly: 22000, benefits_monthly: 18500, rent_monthly: 28000,
    utilities_base: 8500, marketing_monthly: 4500, maintenance_monthly: 3500, insurance_monthly: 4200,
  });

  // Forecast adjustment form
  const [adjMonth, setAdjMonth] = useState(5);
  const [adjDrivers, setAdjDrivers] = useState<Record<string, number>>({});
  const [adjCommentary, setAdjCommentary] = useState("");
  const [adjResult, setAdjResult] = useState<any>(null);

  const load = useCallback(async () => {
    try {
      const [fl, va, tm] = await Promise.all([
        fetch(`${BACKEND}/api/budget/daily-flash`).then(r => r.json()),
        fetch(`${BACKEND}/api/budget/variance`).then(r => r.json()),
        fetch(`${BACKEND}/api/budget/12-month-view`).then(r => r.json()),
      ]);
      setFlash(fl);
      setVariance(va);
      setTwelveMonth(tm);
    } catch (e) { console.error(e); }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const buildBudget = async () => {
    const res = await fetch(`${BACKEND}/api/budget/build?budget_name=FY2027%20Operating%20Budget`, {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(drivers),
    });
    const data = await res.json();
    setBudget(data);
    load(); // Refresh variance & 12-month
  };

  const adjustForecast = async () => {
    const res = await fetch(`${BACKEND}/api/budget/forecast/adjust`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ month: adjMonth, driver_changes: adjDrivers, commentary: adjCommentary, adjusted_by: "Director" }),
    });
    setAdjResult(await res.json());
    load();
  };

  if (loading) return <div style={{ padding: 40, textAlign: "center", color: "#64748b" }}>Loading Budget Center...</div>;

  const card: React.CSSProperties = { background: "rgba(255,255,255,0.015)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 10, overflow: "hidden", marginBottom: 14 };
  const cardHead: React.CSSProperties = { padding: "12px 16px", borderBottom: "1px solid rgba(255,255,255,0.04)", display: "flex", justifyContent: "space-between", alignItems: "center" };
  const cardTitle: React.CSSProperties = { fontSize: 11, fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase" as const, color: "rgba(200,169,126,0.6)" };
  const th: React.CSSProperties = { padding: "8px 12px", textAlign: "left", fontSize: 9, letterSpacing: "0.08em", textTransform: "uppercase", color: "rgba(148,163,184,0.4)", borderBottom: "1px solid rgba(255,255,255,0.04)" };
  const td: React.CSSProperties = { padding: "8px 12px", borderBottom: "1px solid rgba(255,255,255,0.02)", fontSize: 11, color: "#94a3b8" };
  const mono: React.CSSProperties = { fontFamily: "'IBM Plex Mono', monospace" };
  const inputStyle: React.CSSProperties = { width: 90, padding: "6px 8px", borderRadius: 4, border: "1px solid rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.02)", color: "#e2e8f0", fontSize: 12, ...mono, outline: "none", textAlign: "right" };

  const TABS = [
    { id: "flash", l: "Daily Flash" }, { id: "budget", l: "Budget Builder" },
    { id: "12month", l: "12-Month View" }, { id: "variance", l: "Budget vs Actual" },
    { id: "forecast", l: "Adjust Forecast" },
  ];

  const y = flash?.yesterday || {};
  const mtd = flash?.mtd || {};

  return (
    <div style={{ fontFamily: "'IBM Plex Sans', -apple-system, sans-serif", padding: 24, color: "#e2e8f0" }} data-testid="budget-center-panel">
      <div style={{ marginBottom: 16 }}>
        <h1 style={{ fontSize: 18, fontWeight: 300, letterSpacing: "0.12em", color: "#c8a97e", margin: 0 }}>BUDGET & FORECAST CENTER</h1>
        <p style={{ fontSize: 11, color: "rgba(148,163,184,0.4)", marginTop: 2 }}>Daily Flash &bull; Driver-Based Budget &bull; 12-Month View &bull; Forecast Adjustments</p>
      </div>

      <div style={{ display: "flex", gap: 3, marginBottom: 16, borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
        {TABS.map(t => (
          <button key={t.id} data-testid={`bc-tab-${t.id}`} onClick={() => setTab(t.id)}
            style={{ padding: "8px 18px", border: "none", cursor: "pointer", fontSize: 11, fontWeight: 500, borderRadius: "6px 6px 0 0",
              background: tab === t.id ? "rgba(200,169,126,0.10)" : "transparent", color: tab === t.id ? "#c8a97e" : "#64748b",
              borderBottom: tab === t.id ? "2px solid #c8a97e" : "2px solid transparent" }}>{t.l}</button>
        ))}
      </div>

      {/* DAILY FLASH */}
      {tab === "flash" && flash && (
        <div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
            <div style={card}>
              <div style={cardHead}><span style={cardTitle}>Yesterday &mdash; {flash.day_label}</span></div>
              <div style={{ padding: 16 }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginBottom: 16 }}>
                  {[
                    { l: "Revenue", v: fmt(y.revenue), c: "#10b981" },
                    { l: "Covers", v: y.covers, c: "#3b82f6" },
                    { l: "Avg Check", v: fmt(y.avg_check), c: "#8b5cf6" },
                    { l: "Food Cost", v: `${y.food_cost_pct}%`, c: y.food_cost_pct > 25 ? "#ef4444" : "#10b981" },
                    { l: "Labor", v: fmt(y.labor_cost), c: "#f59e0b" },
                    { l: "OT Hours", v: y.overtime_hours, c: y.overtime_hours > 5 ? "#ef4444" : "#10b981" },
                  ].map((k, i) => (
                    <div key={i}>
                      <div style={{ fontSize: 9, letterSpacing: "0.1em", textTransform: "uppercase", color: "rgba(148,163,184,0.5)" }}>{k.l}</div>
                      <div style={{ fontSize: 20, fontWeight: 600, color: k.c, ...mono }}>{k.v}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div style={card}>
              <div style={cardHead}><span style={cardTitle}>Month-to-Date</span></div>
              <div style={{ padding: 16 }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
                  {[
                    { l: "Revenue", v: fmt(mtd.revenue), c: "#10b981" },
                    { l: "Covers", v: mtd.covers?.toLocaleString(), c: "#3b82f6" },
                    { l: "Avg Check", v: fmt(mtd.avg_check), c: "#8b5cf6" },
                    { l: "Txns", v: mtd.transactions?.toLocaleString(), c: "#64748b" },
                    { l: "Food Cost", v: `${mtd.food_cost_pct}%`, c: mtd.food_cost_pct > 25 ? "#ef4444" : "#10b981" },
                    { l: "Food $", v: fmt(mtd.food_cost), c: "#ef4444" },
                  ].map((k, i) => (
                    <div key={i}>
                      <div style={{ fontSize: 9, letterSpacing: "0.1em", textTransform: "uppercase", color: "rgba(148,163,184,0.5)" }}>{k.l}</div>
                      <div style={{ fontSize: 20, fontWeight: 600, color: k.c, ...mono }}>{k.v}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Alerts */}
          {(flash.alerts || []).length > 0 && (
            <div style={{ marginTop: 4 }}>
              {flash.alerts.map((a: any, i: number) => (
                <div key={i} style={{ ...card, borderLeft: `3px solid ${a.severity === "critical" ? "#ef4444" : a.severity === "warning" ? "#f59e0b" : "#3b82f6"}`, marginBottom: 6 }}>
                  <div style={{ padding: "10px 14px", fontSize: 12, color: "#94a3b8" }}>
                    <Badge text={a.severity} variant={a.severity === "critical" ? "danger" : a.severity === "warning" ? "warning" : "info"} />
                    <span style={{ marginLeft: 8 }}>{a.message}</span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Deliveries */}
          <div style={{ ...card, marginTop: 8 }}>
            <div style={cardHead}><span style={cardTitle}>Recent Deliveries</span></div>
            <div style={{ padding: 12 }}>
              {(flash.recent_deliveries || []).map((d: any, i: number) => (
                <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: "1px solid rgba(255,255,255,0.02)" }}>
                  <span style={{ fontSize: 12, color: "#e2e8f0" }}>{d.vendor}</span>
                  <div style={{ display: "flex", gap: 12 }}>
                    <span style={{ fontSize: 11, color: "#64748b" }}>{d.date}</span>
                    <span style={{ ...mono, fontSize: 12, fontWeight: 600, color: "#c8a97e" }}>{fmt(d.total)}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* BUDGET BUILDER */}
      {tab === "budget" && (
        <div>
          <div style={{ ...card }}>
            <div style={cardHead}><span style={cardTitle}>Revenue Drivers</span></div>
            <div style={{ padding: 16, display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14 }}>
              {[
                { k: "avg_daily_covers", l: "Avg Daily Covers", t: "number" },
                { k: "avg_check", l: "Avg Check ($)", t: "number" },
                { k: "growth_rate_pct", l: "Growth Rate (%)", t: "number" },
                { k: "banquet_events_per_month", l: "Banquet Events/Mo", t: "number" },
                { k: "banquet_avg_revenue", l: "Avg Banquet Rev ($)", t: "number" },
              ].map(d => (
                <div key={d.k}>
                  <label style={{ fontSize: 10, color: "#64748b", display: "block", marginBottom: 4 }}>{d.l}</label>
                  <input type="number" value={(drivers as any)[d.k]} onChange={e => setDrivers({ ...drivers, [d.k]: parseFloat(e.target.value) || 0 })} style={inputStyle} />
                </div>
              ))}
            </div>
          </div>
          <div style={{ ...card }}>
            <div style={cardHead}><span style={cardTitle}>Cost Targets (% of Revenue)</span></div>
            <div style={{ padding: 16, display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14 }}>
              {[
                { k: "food_cost_target_pct", l: "Food Cost %" },
                { k: "bev_cost_target_pct", l: "Bev Cost %" },
                { k: "hourly_labor_target_pct", l: "Hourly Labor %" },
              ].map(d => (
                <div key={d.k}>
                  <label style={{ fontSize: 10, color: "#64748b", display: "block", marginBottom: 4 }}>{d.l}</label>
                  <input type="number" value={(drivers as any)[d.k]} onChange={e => setDrivers({ ...drivers, [d.k]: parseFloat(e.target.value) || 0 })} style={inputStyle} />
                </div>
              ))}
            </div>
          </div>
          <button data-testid="build-budget-btn" onClick={buildBudget}
            style={{ padding: "10px 28px", borderRadius: 8, border: "1px solid rgba(200,169,126,0.4)", background: "rgba(200,169,126,0.08)", color: "#c8a97e", fontSize: 13, cursor: "pointer", fontWeight: 500 }}>
            Build Annual Budget
          </button>

          {budget && (
            <div style={{ ...card, marginTop: 14 }}>
              <div style={cardHead}>
                <span style={cardTitle}>{budget.name}</span>
                <Badge text={budget.status} variant="info" />
              </div>
              <div style={{ padding: 12 }}>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10, marginBottom: 12 }}>
                  {[
                    { l: "Revenue", v: fmt(budget.annual?.revenue), c: "#10b981" },
                    { l: "EBITDA", v: `${fmt(budget.annual?.ebitda)} (${budget.annual?.ebitda_margin_pct}%)`, c: "#c8a97e" },
                    { l: "Food Cost", v: `${budget.annual?.food_cost_pct}%`, c: "#ef4444" },
                    { l: "Covers", v: budget.annual?.covers?.toLocaleString(), c: "#3b82f6" },
                  ].map((k, i) => (
                    <div key={i} style={{ padding: 10, background: "rgba(255,255,255,0.02)", borderRadius: 6 }}>
                      <div style={{ fontSize: 9, color: "#475569", textTransform: "uppercase", letterSpacing: "0.08em" }}>{k.l}</div>
                      <div style={{ fontSize: 16, fontWeight: 600, color: k.c, ...mono }}>{k.v}</div>
                    </div>
                  ))}
                </div>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead><tr><th style={th}>Month</th><th style={{ ...th, textAlign: "right" }}>Revenue</th><th style={{ ...th, textAlign: "right" }}>EBITDA</th><th style={{ ...th, textAlign: "right" }}>Margin</th><th style={{ ...th, textAlign: "right" }}>Covers</th></tr></thead>
                  <tbody>
                    {Object.values(budget.months || {}).map((m: any) => (
                      <tr key={m.month}>
                        <td style={{ ...td, fontWeight: 500, color: "#e2e8f0" }}>{m.month_name}</td>
                        <td style={{ ...td, ...mono, textAlign: "right" }}>{fmt(m.revenue?.total)}</td>
                        <td style={{ ...td, ...mono, textAlign: "right", color: m.ebitda >= 0 ? "#10b981" : "#ef4444" }}>{fmt(m.ebitda)}</td>
                        <td style={{ ...td, ...mono, textAlign: "right" }}>{m.ebitda_margin_pct}%</td>
                        <td style={{ ...td, ...mono, textAlign: "right" }}>{m.drivers?.covers?.toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 12-MONTH VIEW */}
      {tab === "12month" && twelveMonth && (
        <div style={card}>
          <div style={cardHead}>
            <span style={cardTitle}>{twelveMonth.budget_name} &mdash; 12-Month View</span>
          </div>
          <div style={{ overflow: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 900 }}>
              <thead>
                <tr>
                  <th style={th}>Month</th>
                  <th style={{ ...th, textAlign: "right" }}>Budget Rev</th>
                  <th style={{ ...th, textAlign: "right" }}>Budget EBITDA</th>
                  <th style={{ ...th, textAlign: "right" }}>Forecast Rev</th>
                  <th style={{ ...th, textAlign: "right" }}>Forecast EBITDA</th>
                  <th style={th}>Adjusted By</th>
                  <th style={th}>Commentary</th>
                </tr>
              </thead>
              <tbody>
                {(twelveMonth.months || []).map((m: any) => (
                  <tr key={m.month} style={{ background: m.has_adjustment ? "rgba(200,169,126,0.03)" : undefined }}>
                    <td style={{ ...td, fontWeight: 500, color: "#e2e8f0" }}>{m.month_name}</td>
                    <td style={{ ...td, ...mono, textAlign: "right" }}>{fmt(m.budget?.revenue)}</td>
                    <td style={{ ...td, ...mono, textAlign: "right", color: m.budget?.ebitda >= 0 ? "#10b981" : "#ef4444" }}>{fmt(m.budget?.ebitda)}</td>
                    <td style={{ ...td, ...mono, textAlign: "right", color: "#c8a97e" }}>{m.forecast ? fmt(m.forecast.revenue) : "-"}</td>
                    <td style={{ ...td, ...mono, textAlign: "right", color: m.forecast?.ebitda >= 0 ? "#10b981" : "#ef4444" }}>{m.forecast ? fmt(m.forecast.ebitda) : "-"}</td>
                    <td style={{ ...td, fontSize: 10 }}>{m.forecast?.adjusted_by || "-"}</td>
                    <td style={{ ...td, fontSize: 10, maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{m.forecast?.commentary || "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* BUDGET VS ACTUAL */}
      {tab === "variance" && variance && !variance.error && (
        <div style={card}>
          <div style={cardHead}>
            <span style={cardTitle}>{variance.budget_name} &mdash; {variance.period}</span>
          </div>
          <div style={{ padding: 12 }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead><tr><th style={th}>Line</th><th style={{ ...th, textAlign: "right" }}>Actual</th><th style={{ ...th, textAlign: "right" }}>Budget</th><th style={{ ...th, textAlign: "right" }}>Variance $</th><th style={{ ...th, textAlign: "right" }}>Variance %</th><th style={th}>Status</th></tr></thead>
              <tbody>
                {Object.entries(variance.lines || {}).map(([k, v]: [string, any]) => (
                  <tr key={k}>
                    <td style={{ ...td, fontWeight: 500, color: "#e2e8f0", textTransform: "capitalize" }}>{k.replace(/_/g, " ")}</td>
                    <td style={{ ...td, ...mono, textAlign: "right" }}>{fmt(v.actual)}</td>
                    <td style={{ ...td, ...mono, textAlign: "right" }}>{fmt(v.budget)}</td>
                    <td style={{ ...td, ...mono, textAlign: "right", color: v.status === "favorable" ? "#10b981" : "#ef4444" }}>{v.variance >= 0 ? "+" : ""}{fmt(v.variance)}</td>
                    <td style={{ ...td, ...mono, textAlign: "right" }}>{v.variance_pct >= 0 ? "+" : ""}{v.variance_pct}%</td>
                    <td style={td}><Badge text={v.status} variant={v.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* FORECAST ADJUSTMENT */}
      {tab === "forecast" && (
        <div>
          <div style={card}>
            <div style={cardHead}><span style={cardTitle}>Adjust Monthly Forecast</span></div>
            <div style={{ padding: 16 }}>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14, marginBottom: 14 }}>
                <div>
                  <label style={{ fontSize: 10, color: "#64748b", display: "block", marginBottom: 4 }}>Month</label>
                  <select value={adjMonth} onChange={e => setAdjMonth(parseInt(e.target.value))}
                    style={{ ...inputStyle, width: "100%" }}>
                    {["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"].map((m, i) => (
                      <option key={i} value={i + 1}>{m}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: 10, color: "#64748b", display: "block", marginBottom: 4 }}>Avg Check ($)</label>
                  <input type="number" placeholder="85" onChange={e => setAdjDrivers({ ...adjDrivers, avg_check: parseFloat(e.target.value) || 0 })} style={inputStyle} />
                </div>
                <div>
                  <label style={{ fontSize: 10, color: "#64748b", display: "block", marginBottom: 4 }}>Daily Covers</label>
                  <input type="number" placeholder="225" onChange={e => setAdjDrivers({ ...adjDrivers, avg_daily_covers: parseInt(e.target.value) || 0 })} style={inputStyle} />
                </div>
                <div>
                  <label style={{ fontSize: 10, color: "#64748b", display: "block", marginBottom: 4 }}>Food Cost %</label>
                  <input type="number" placeholder="22" onChange={e => setAdjDrivers({ ...adjDrivers, food_cost_target_pct: parseFloat(e.target.value) || 0 })} style={inputStyle} />
                </div>
              </div>
              <div style={{ marginBottom: 14 }}>
                <label style={{ fontSize: 10, color: "#64748b", display: "block", marginBottom: 4 }}>Commentary / Reason for Adjustment</label>
                <textarea value={adjCommentary} onChange={e => setAdjCommentary(e.target.value)} placeholder="e.g., Spring promotions expected to lift covers 10%..."
                  style={{ width: "100%", padding: 10, borderRadius: 6, border: "1px solid rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.02)", color: "#e2e8f0", fontSize: 12, resize: "vertical", minHeight: 60, outline: "none" }} />
              </div>
              <button data-testid="adjust-forecast-btn" onClick={adjustForecast}
                style={{ padding: "8px 20px", borderRadius: 6, border: "1px solid rgba(200,169,126,0.4)", background: "rgba(200,169,126,0.08)", color: "#c8a97e", fontSize: 12, cursor: "pointer" }}>
                Apply Adjustment
              </button>
            </div>
          </div>

          {adjResult && !adjResult.error && (
            <div style={{ ...card, borderLeft: "3px solid #c8a97e" }}>
              <div style={cardHead}><span style={cardTitle}>{adjResult.month_name} Forecast Adjustment</span></div>
              <div style={{ padding: 16 }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 14, marginBottom: 14 }}>
                  <div style={{ padding: 12, background: "rgba(255,255,255,0.02)", borderRadius: 6 }}>
                    <div style={{ fontSize: 9, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.08em" }}>Original Revenue</div>
                    <div style={{ fontSize: 18, fontWeight: 600, color: "#94a3b8", ...mono }}>{fmt(adjResult.original?.revenue)}</div>
                  </div>
                  <div style={{ padding: 12, background: "rgba(200,169,126,0.04)", borderRadius: 6 }}>
                    <div style={{ fontSize: 9, color: "#c8a97e", textTransform: "uppercase", letterSpacing: "0.08em" }}>Adjusted Revenue</div>
                    <div style={{ fontSize: 18, fontWeight: 600, color: "#c8a97e", ...mono }}>{fmt(adjResult.adjusted?.revenue)}</div>
                  </div>
                  <div style={{ padding: 12, background: "rgba(255,255,255,0.02)", borderRadius: 6 }}>
                    <div style={{ fontSize: 9, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.08em" }}>Variance</div>
                    <div style={{ fontSize: 18, fontWeight: 600, color: adjResult.variance?.revenue >= 0 ? "#10b981" : "#ef4444", ...mono }}>
                      {adjResult.variance?.revenue >= 0 ? "+" : ""}{fmt(adjResult.variance?.revenue)} ({adjResult.variance?.revenue_pct >= 0 ? "+" : ""}{adjResult.variance?.revenue_pct}%)
                    </div>
                  </div>
                </div>
                {adjResult.commentary && (
                  <div style={{ padding: 10, background: "rgba(255,255,255,0.02)", borderRadius: 6, fontSize: 12, color: "#94a3b8", fontStyle: "italic" }}>
                    "{adjResult.commentary}" — {adjResult.adjusted_by}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
