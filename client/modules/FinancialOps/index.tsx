import React, { useState, useEffect, useCallback } from "react";

const BACKEND = window.location.origin;

function fmt(n: number) {
  if (!n && n !== 0) return "$0";
  return "$" + n.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

function KPI({ label, value, sub, color }: { label: string; value: string | number; sub?: string; color?: string }) {
  return (
    <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 10, padding: "16px 18px", minWidth: 140 }}>
      <div style={{ fontSize: 10, letterSpacing: "0.1em", textTransform: "uppercase", color: "rgba(148,163,184,0.5)", marginBottom: 6 }}>{label}</div>
      <div style={{ fontSize: 22, fontWeight: 600, color: color || "#e2e8f0", fontFamily: "'IBM Plex Mono', monospace" }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: "rgba(148,163,184,0.5)", marginTop: 4 }}>{sub}</div>}
    </div>
  );
}

function Badge({ text, variant }: { text: string; variant: "success" | "warning" | "danger" | "info" | "neutral" }) {
  const colors = { success: "#10b981", warning: "#f59e0b", danger: "#ef4444", info: "#3b82f6", neutral: "#64748b" };
  const c = colors[variant] || "#64748b";
  return <span style={{ padding: "2px 8px", borderRadius: 4, fontSize: 10, fontWeight: 600, background: `${c}15`, color: c, letterSpacing: "0.03em" }}>{text}</span>;
}

export default function FinancialOpsPanel() {
  const [tab, setTab] = useState<string>("overview");
  const [simRunning, setSimRunning] = useState(false);
  const [hasSim, setHasSim] = useState(false);
  const [analytics, setAnalytics] = useState<any>(null);
  const [forecast, setForecast] = useState<any>(null);
  const [invoices, setInvoices] = useState<any>(null);
  const [pipeline, setPipeline] = useState<any>(null);
  const [gaps, setGaps] = useState<any>(null);
  const [drilldown, setDrilldown] = useState<any>(null);
  const [drillCat, setDrillCat] = useState<string>("");
  const [selectedInv, setSelectedInv] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const status = await fetch(`${BACKEND}/api/simulation/status`).then(r => r.json());
      setHasSim(status.pos_transactions > 0);
      if (status.pos_transactions > 0) {
        const [inv, pipe, gap, anal, fc] = await Promise.all([
          fetch(`${BACKEND}/api/simulation/invoices?limit=50`).then(r => r.json()),
          fetch(`${BACKEND}/api/simulation/purchasing-pipeline`).then(r => r.json()),
          fetch(`${BACKEND}/api/simulation/gap-analysis`).then(r => r.json()),
          fetch(`${BACKEND}/api/echoai3/analytics/business-review`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ include_ai_narrative: true }) }).then(r => r.json()),
          fetch(`${BACKEND}/api/echoai3/analytics/next-month-forecast`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ horizon_days: 30, include_ai: true }) }).then(r => r.json()),
        ]);
        setInvoices(inv);
        setPipeline(pipe);
        setGaps(gap);
        setAnalytics(anal);
        setForecast(fc);
      }
    } catch (e) { console.error("FinOps load error:", e); }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const runSim = async () => {
    setSimRunning(true);
    try {
      await fetch(`${BACKEND}/api/simulation/run-30-days`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ days: 30, clear_existing: true, seed: 42 }) });
      await load();
    } finally { setSimRunning(false); }
  };

  const loadDrill = async (cat: string) => {
    setDrillCat(cat);
    const res = await fetch(`${BACKEND}/api/simulation/pnl-drilldown?category=${cat}`);
    setDrilldown(await res.json());
  };

  const loadInvDetail = async (invId: string) => {
    const res = await fetch(`${BACKEND}/api/simulation/invoices/${invId}`);
    setSelectedInv(await res.json());
  };

  if (loading) return <div style={{ padding: 40, textAlign: "center", color: "#64748b" }}>Loading Financial Operations...</div>;

  const TABS = ["overview", "invoices", "purchasing", "analytics", "forecast", "gaps"];
  const TAB_LABELS: Record<string, string> = { overview: "P&L Overview", invoices: "Invoice Vault", purchasing: "Purchasing Pipeline", analytics: "AI Analytics", forecast: "Next Month Forecast", gaps: "Gap Analysis" };
  const ps = analytics?.period_summary || {};
  const cs = analytics?.cost_structure || {};
  const ops = analytics?.operations || {};
  const recs = analytics?.recommendations || [];
  const dow = analytics?.day_of_week_analysis || [];
  const topItems = analytics?.top_menu_items || [];
  const vendors = analytics?.vendor_analysis || [];
  const gapList = gaps?.gaps || [];
  const fkpi = gaps?.financial_kpis || {};
  const pipeData = pipeline?.pipeline || [];
  const pipeSummary = pipeline?.summary || {};
  const invList = invoices?.invoices || [];
  const fcs = forecast?.summary || {};
  const weekly = forecast?.weekly_forecast || [];

  const baseStyle: React.CSSProperties = { fontFamily: "'IBM Plex Sans', -apple-system, sans-serif", padding: 24, color: "#e2e8f0", minHeight: "100%" };
  const cardStyle: React.CSSProperties = { background: "rgba(255,255,255,0.015)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 10, marginBottom: 16, overflow: "hidden" };
  const cardHead: React.CSSProperties = { padding: "12px 16px", borderBottom: "1px solid rgba(255,255,255,0.04)", display: "flex", justifyContent: "space-between", alignItems: "center" };
  const cardTitle: React.CSSProperties = { fontSize: 12, fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase" as const, color: "rgba(200,169,126,0.6)" };
  const tableStyle: React.CSSProperties = { width: "100%", borderCollapse: "collapse" as const, fontSize: 12 };
  const thStyle: React.CSSProperties = { padding: "8px 12px", textAlign: "left" as const, fontSize: 10, letterSpacing: "0.08em", textTransform: "uppercase" as const, color: "rgba(148,163,184,0.4)", borderBottom: "1px solid rgba(255,255,255,0.04)" };
  const tdStyle: React.CSSProperties = { padding: "8px 12px", borderBottom: "1px solid rgba(255,255,255,0.02)", color: "#94a3b8" };
  const monoStyle: React.CSSProperties = { fontFamily: "'IBM Plex Mono', monospace" };

  return (
    <div style={baseStyle} data-testid="financial-ops-panel">
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 20, fontWeight: 300, letterSpacing: "0.15em", color: "#c8a97e", margin: 0 }}>FINANCIAL OPERATIONS</h1>
        <p style={{ fontSize: 11, color: "rgba(148,163,184,0.4)", marginTop: 4 }}>30-Day Simulation &bull; P&L Drill-Down &bull; Invoice Vault &bull; EchoAi&sup3; Intelligence</p>
      </div>

      {!hasSim ? (
        <div style={{ ...cardStyle, textAlign: "center", padding: 60 }}>
          <div style={{ fontSize: 16, color: "#c8a97e", marginBottom: 8 }}>No Simulation Data</div>
          <p style={{ color: "#64748b", maxWidth: 440, margin: "0 auto 20px", lineHeight: 1.6, fontSize: 13 }}>
            Run a 30-day restaurant simulation to generate POS transactions, invoices, GL entries, purchase orders, labor schedules, and waste tracking.
          </p>
          <button data-testid="run-sim-btn" onClick={runSim} disabled={simRunning}
            style={{ padding: "10px 28px", borderRadius: 8, border: "1px solid rgba(200,169,126,0.4)", background: "rgba(200,169,126,0.1)", color: "#c8a97e", fontSize: 13, cursor: "pointer", fontWeight: 500 }}>
            {simRunning ? "Generating 30 days of data..." : "Run 30-Day Simulation"}
          </button>
        </div>
      ) : (
        <>
          {/* Tabs */}
          <div style={{ display: "flex", gap: 4, marginBottom: 20, flexWrap: "wrap", alignItems: "center" }}>
            {TABS.map(t => (
              <button key={t} data-testid={`tab-${t}`} onClick={() => setTab(t)}
                style={{ padding: "7px 16px", borderRadius: 6, border: "none", cursor: "pointer", fontSize: 11, fontWeight: 500, letterSpacing: "0.03em",
                  background: tab === t ? "rgba(200,169,126,0.12)" : "transparent", color: tab === t ? "#c8a97e" : "#64748b",
                  borderBottom: tab === t ? "2px solid #c8a97e" : "2px solid transparent" }}>
                {TAB_LABELS[t]}
              </button>
            ))}
            <button data-testid="rerun-btn" onClick={runSim} disabled={simRunning}
              style={{ marginLeft: "auto", padding: "6px 12px", borderRadius: 6, border: "1px solid rgba(200,169,126,0.15)", background: "transparent", color: "#c8a97e", fontSize: 10, cursor: "pointer" }}>
              {simRunning ? "Running..." : "Re-run"}
            </button>
          </div>

          {/* P&L OVERVIEW */}
          {tab === "overview" && (
            <div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: 10, marginBottom: 20 }}>
                <KPI label="Revenue" value={fmt(ps.total_revenue)} sub={`${ops.total_transactions} txns`} color="#10b981" />
                <KPI label="Gross Profit" value={fmt(ps.gross_profit)} sub={`${((ps.gross_profit||0)/(ps.total_revenue||1)*100).toFixed(1)}%`} color="#3b82f6" />
                <KPI label="EBITDA" value={fmt(ps.ebitda)} sub={`${ps.ebitda_margin_pct}% margin`} color={ps.ebitda >= 0 ? "#c8a97e" : "#ef4444"} />
                <KPI label="Food Cost" value={`${cs.food_cost_pct}%`} sub={fmt(cs.food_cogs)} color={cs.food_cost_pct > 28 ? "#ef4444" : "#10b981"} />
                <KPI label="Labor" value={`${cs.labor_pct}%`} sub={fmt(cs.labor_total)} color={cs.labor_pct > 32 ? "#ef4444" : "#f59e0b"} />
                <KPI label="Avg Check" value={fmt(ops.avg_check)} sub={`${ops.total_covers} covers`} color="#8b5cf6" />
              </div>

              {/* Drill-down buttons */}
              <div style={{ fontSize: 12, fontWeight: 600, color: "#c8a97e", marginBottom: 10, letterSpacing: "0.05em" }}>P&L DRILL-DOWN</div>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 14 }}>
                {[
                  { k: "food_revenue", l: "Food Rev", c: "#10b981" }, { k: "bev_revenue", l: "Bev Rev", c: "#06b6d4" },
                  { k: "banquet_revenue", l: "Banquet", c: "#c8a97e" }, { k: "food_cogs", l: "Food COGS", c: "#ef4444" },
                  { k: "labor", l: "Labor", c: "#f59e0b" }, { k: "rent", l: "Rent", c: "#8b5cf6" }, { k: "utilities", l: "Utilities", c: "#64748b" },
                ].map(c => (
                  <button key={c.k} data-testid={`drill-${c.k}`} onClick={() => loadDrill(c.k)}
                    style={{ padding: "5px 12px", borderRadius: 5, border: drillCat === c.k ? `1px solid ${c.c}` : "1px solid rgba(255,255,255,0.06)",
                      background: drillCat === c.k ? `${c.c}12` : "transparent", color: drillCat === c.k ? c.c : "#64748b", fontSize: 10, cursor: "pointer", fontWeight: 500 }}>
                    {c.l}
                  </button>
                ))}
              </div>

              {drilldown && (
                <div style={cardStyle}>
                  <div style={cardHead}>
                    <span style={cardTitle}>{drilldown.category} &mdash; {fmt(drilldown.total)}</span>
                    <Badge text={`${drilldown.entry_count} entries`} variant="info" />
                  </div>
                  <div style={{ padding: 12, maxHeight: 250, overflow: "auto" }}>
                    <table style={tableStyle}>
                      <thead><tr><th style={thStyle}>Date</th><th style={thStyle}>GL</th><th style={thStyle}>Description</th><th style={{ ...thStyle, textAlign: "right" }}>Amount</th><th style={thStyle}>Source</th></tr></thead>
                      <tbody>
                        {(drilldown.entries || []).slice(0, 25).map((e: any, i: number) => (
                          <tr key={i}>
                            <td style={{ ...tdStyle, ...monoStyle, fontSize: 11 }}>{e.date}</td>
                            <td style={{ ...tdStyle, ...monoStyle, fontSize: 11 }}>{e.gl_code}</td>
                            <td style={{ ...tdStyle, fontSize: 11 }}>{e.description}</td>
                            <td style={{ ...tdStyle, ...monoStyle, textAlign: "right" }}>{fmt(e.amount)}</td>
                            <td style={tdStyle}><Badge text={e.source} variant="neutral" /></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Top menu items */}
              <div style={{ fontSize: 12, fontWeight: 600, color: "#c8a97e", margin: "18px 0 10px", letterSpacing: "0.05em" }}>TOP MENU ITEMS</div>
              <div style={cardStyle}>
                <div style={{ maxHeight: 260, overflow: "auto" }}>
                  <table style={tableStyle} data-testid="top-items-table">
                    <thead><tr><th style={thStyle}>Item</th><th style={{ ...thStyle, textAlign: "right" }}>Qty</th><th style={{ ...thStyle, textAlign: "right" }}>Revenue</th><th style={{ ...thStyle, textAlign: "right" }}>FC%</th><th style={{ ...thStyle, textAlign: "right" }}>Margin</th></tr></thead>
                    <tbody>
                      {topItems.map((item: any, i: number) => (
                        <tr key={i}>
                          <td style={{ ...tdStyle, fontWeight: 500, color: "#f1f5f9" }}>{item.name}</td>
                          <td style={{ ...tdStyle, ...monoStyle, textAlign: "right" }}>{item.qty}</td>
                          <td style={{ ...tdStyle, ...monoStyle, textAlign: "right" }}>{fmt(item.revenue)}</td>
                          <td style={{ ...tdStyle, ...monoStyle, textAlign: "right", color: item.food_cost_pct > 30 ? "#ef4444" : "#10b981" }}>{item.food_cost_pct}%</td>
                          <td style={{ ...tdStyle, ...monoStyle, textAlign: "right", color: "#10b981" }}>{fmt(item.margin)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* INVOICE VAULT */}
          {tab === "invoices" && (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
              <div style={cardStyle}>
                <div style={cardHead}><span style={cardTitle}>Invoice Vault</span><Badge text={`${invList.length} invoices`} variant="info" /></div>
                <div style={{ maxHeight: 550, overflow: "auto" }}>
                  <table style={tableStyle}>
                    <thead><tr><th style={thStyle}>Invoice #</th><th style={thStyle}>Vendor</th><th style={thStyle}>Date</th><th style={{ ...thStyle, textAlign: "right" }}>Total</th><th style={thStyle}>Status</th></tr></thead>
                    <tbody>
                      {invList.map((inv: any) => (
                        <tr key={inv.invoice_id} onClick={() => loadInvDetail(inv.invoice_id)} style={{ cursor: "pointer", background: selectedInv?.invoice?.invoice_id === inv.invoice_id ? "rgba(200,169,126,0.04)" : undefined }}>
                          <td style={{ ...tdStyle, ...monoStyle, fontSize: 10, color: "#c8a97e" }}>{inv.invoice_number}</td>
                          <td style={{ ...tdStyle, fontSize: 11 }}>{inv.vendor_name}</td>
                          <td style={{ ...tdStyle, ...monoStyle, fontSize: 10 }}>{inv.invoice_date}</td>
                          <td style={{ ...tdStyle, ...monoStyle, textAlign: "right" }}>{fmt(inv.total)}</td>
                          <td style={tdStyle}><Badge text={inv.status} variant={inv.status === "paid" ? "success" : "warning"} /></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div style={cardStyle}>
                <div style={cardHead}><span style={cardTitle}>Invoice Detail</span></div>
                <div style={{ padding: 16, maxHeight: 550, overflow: "auto" }}>
                  {selectedInv?.invoice ? (
                    <div>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 }}>
                        <div><div style={{ fontSize: 9, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.08em" }}>Vendor</div><div style={{ color: "#f1f5f9", fontWeight: 500, fontSize: 13 }}>{selectedInv.invoice.vendor_name}</div></div>
                        <div><div style={{ fontSize: 9, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.08em" }}>Invoice #</div><div style={{ ...monoStyle, color: "#c8a97e", fontSize: 13 }}>{selectedInv.invoice.invoice_number}</div></div>
                        <div><div style={{ fontSize: 9, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.08em" }}>Date</div><div style={monoStyle}>{selectedInv.invoice.invoice_date}</div></div>
                        <div><div style={{ fontSize: 9, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.08em" }}>Due</div><div style={monoStyle}>{selectedInv.invoice.due_date}</div></div>
                        <div><div style={{ fontSize: 9, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.08em" }}>PO</div><div style={{ ...monoStyle, color: "#3b82f6", fontSize: 10 }}>{selectedInv.invoice.po_id}</div></div>
                        <div><div style={{ fontSize: 9, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.08em" }}>Total</div><div style={{ color: "#c8a97e", fontWeight: 700, fontSize: 20, ...monoStyle }}>{fmt(selectedInv.invoice.total)}</div></div>
                      </div>

                      <div style={{ fontSize: 10, fontWeight: 600, color: "#c8a97e", letterSpacing: "0.08em", marginBottom: 6 }}>LINE ITEMS</div>
                      <table style={{ ...tableStyle, fontSize: 11 }}>
                        <thead><tr><th style={thStyle}>Item</th><th style={{ ...thStyle, textAlign: "right" }}>Qty</th><th style={thStyle}>Unit</th><th style={{ ...thStyle, textAlign: "right" }}>Price</th><th style={{ ...thStyle, textAlign: "right" }}>Ext</th></tr></thead>
                        <tbody>
                          {(selectedInv.invoice.line_items || []).map((li: any, i: number) => (
                            <tr key={i}>
                              <td style={tdStyle}>{li.description}</td>
                              <td style={{ ...tdStyle, ...monoStyle, textAlign: "right" }}>{li.quantity_shipped || li.quantity_ordered}</td>
                              <td style={tdStyle}>{li.pack_unit}</td>
                              <td style={{ ...tdStyle, ...monoStyle, textAlign: "right" }}>{fmt(li.unit_price)}</td>
                              <td style={{ ...tdStyle, ...monoStyle, textAlign: "right" }}>{fmt(li.extension)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>

                      {selectedInv.discrepancies?.length > 0 && (
                        <div style={{ marginTop: 12, padding: 10, background: "rgba(239,68,68,0.04)", borderRadius: 6, border: "1px solid rgba(239,68,68,0.12)" }}>
                          <div style={{ fontSize: 10, fontWeight: 600, color: "#ef4444", marginBottom: 4 }}>DISCREPANCIES</div>
                          {selectedInv.discrepancies.map((d: any, i: number) => (
                            <div key={i} style={{ fontSize: 11, color: "#fca5a5" }}>{d.item}: ordered {d.ordered}, shipped {d.shipped} ({d.type})</div>
                          ))}
                        </div>
                      )}

                      {selectedInv.receiving_log && (
                        <div style={{ marginTop: 10, padding: 10, background: "rgba(16,185,129,0.04)", borderRadius: 6 }}>
                          <div style={{ fontSize: 9, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.08em" }}>Receiving</div>
                          <div style={{ color: "#10b981", fontSize: 12 }}>
                            {selectedInv.receiving_log.received_by} &bull; Temp: {selectedInv.receiving_log.temperature_check} &bull; Quality: {selectedInv.receiving_log.quality_check}
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div style={{ textAlign: "center", color: "#64748b", padding: 40 }}>Select an invoice to view details, line items, PO linkage, and receiving log</div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* PURCHASING PIPELINE */}
          {tab === "purchasing" && (
            <div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10, marginBottom: 16 }}>
                <KPI label="Purchase Orders" value={pipeSummary.total_pos} color="#3b82f6" />
                <KPI label="Received" value={pipeSummary.total_received} color="#10b981" />
                <KPI label="Invoiced" value={pipeSummary.total_invoiced} color="#c8a97e" />
                <KPI label="Fully Linked" value={`${pipeSummary.fully_linked} (${((pipeSummary.fully_linked||0)/(pipeSummary.total_pos||1)*100).toFixed(0)}%)`} color="#8b5cf6" />
              </div>
              <div style={cardStyle}>
                <div style={cardHead}><span style={cardTitle}>PO &rarr; Receiving &rarr; Invoice Pipeline</span></div>
                <div style={{ maxHeight: 450, overflow: "auto" }}>
                  <table style={tableStyle} data-testid="pipeline-table">
                    <thead><tr><th style={thStyle}>PO</th><th style={thStyle}>Vendor</th><th style={thStyle}>Date</th><th style={{ ...thStyle, textAlign: "right" }}>Total</th><th style={thStyle}>Received</th><th style={thStyle}>Invoiced</th><th style={thStyle}>Status</th></tr></thead>
                    <tbody>
                      {pipeData.map((p: any, i: number) => (
                        <tr key={i} onClick={() => p.invoice_id && loadInvDetail(p.invoice_id)} style={{ cursor: p.invoice_id ? "pointer" : undefined }}>
                          <td style={{ ...tdStyle, ...monoStyle, fontSize: 10 }}>{p.po_id?.slice(0, 12)}</td>
                          <td style={{ ...tdStyle, fontSize: 11 }}>{p.vendor}</td>
                          <td style={{ ...tdStyle, ...monoStyle, fontSize: 10 }}>{p.po_date}</td>
                          <td style={{ ...tdStyle, ...monoStyle, textAlign: "right" }}>{fmt(p.po_total)}</td>
                          <td style={tdStyle}><Badge text={p.received ? "Yes" : "No"} variant={p.received ? "success" : "danger"} /></td>
                          <td style={tdStyle}><Badge text={p.invoiced ? "Yes" : "No"} variant={p.invoiced ? "success" : "danger"} /></td>
                          <td style={tdStyle}><Badge text={p.complete ? "Complete" : "Partial"} variant={p.complete ? "success" : "warning"} /></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* AI ANALYTICS */}
          {tab === "analytics" && analytics && (
            <div>
              <div style={{ fontSize: 12, fontWeight: 600, color: "#c8a97e", marginBottom: 10, letterSpacing: "0.05em" }}>ECHOAI&sup3; OPERATIONAL RECOMMENDATIONS</div>
              {recs.map((r: any, i: number) => (
                <div key={i} style={{ ...cardStyle, borderLeft: `3px solid ${r.priority === "critical" ? "#ef4444" : r.priority === "high" ? "#f59e0b" : "#3b82f6"}` }}>
                  <div style={{ padding: 14 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                      <span style={{ fontSize: 13, fontWeight: 600, color: "#f1f5f9" }}>{r.area}</span>
                      <Badge text={r.priority} variant={r.priority === "critical" ? "danger" : r.priority === "high" ? "warning" : "info"} />
                    </div>
                    <div style={{ display: "flex", gap: 16, marginBottom: 8, fontSize: 11 }}>
                      <span><span style={{ color: "#64748b" }}>Current: </span><span style={{ color: "#ef4444" }}>{r.current}</span></span>
                      <span><span style={{ color: "#64748b" }}>Target: </span><span style={{ color: "#10b981" }}>{r.target}</span></span>
                      <span><span style={{ color: "#64748b" }}>Impact: </span><span style={{ color: "#c8a97e" }}>{r.impact}</span></span>
                    </div>
                    <div style={{ fontSize: 11, color: "#94a3b8" }}>
                      {(r.actions || []).map((a: string, j: number) => <div key={j} style={{ marginBottom: 2 }}>&bull; {a}</div>)}
                    </div>
                  </div>
                </div>
              ))}

              <div style={{ fontSize: 12, fontWeight: 600, color: "#c8a97e", margin: "18px 0 10px", letterSpacing: "0.05em" }}>VENDOR SPEND ANALYSIS</div>
              <div style={cardStyle}>
                <div style={{ maxHeight: 250, overflow: "auto" }}>
                  <table style={tableStyle}>
                    <thead><tr><th style={thStyle}>Vendor</th><th style={thStyle}>Category</th><th style={{ ...thStyle, textAlign: "right" }}>Invoices</th><th style={{ ...thStyle, textAlign: "right" }}>Spend</th><th style={{ ...thStyle, textAlign: "right" }}>%</th></tr></thead>
                    <tbody>
                      {vendors.map((v: any, i: number) => (
                        <tr key={i}>
                          <td style={{ ...tdStyle, fontWeight: 500, color: "#f1f5f9" }}>{v.vendor}</td>
                          <td style={tdStyle}><Badge text={v.category} variant="neutral" /></td>
                          <td style={{ ...tdStyle, ...monoStyle, textAlign: "right" }}>{v.invoice_count}</td>
                          <td style={{ ...tdStyle, ...monoStyle, textAlign: "right" }}>{fmt(v.total_spend)}</td>
                          <td style={{ ...tdStyle, ...monoStyle, textAlign: "right", color: "#c8a97e" }}>{v.pct_of_total}%</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {analytics.ai_narrative && (
                <>
                  <div style={{ fontSize: 12, fontWeight: 600, color: "#c8a97e", margin: "18px 0 10px", letterSpacing: "0.05em" }}>ECHOAI&sup3; INTELLIGENCE BRIEFING</div>
                  <div style={{ ...cardStyle, borderLeft: "3px solid #c8a97e" }} data-testid="ai-narrative">
                    <div style={{ padding: 16, whiteSpace: "pre-wrap", fontSize: 12, lineHeight: 1.7, color: "rgba(226,232,240,0.8)" }}>
                      {analytics.ai_narrative}
                    </div>
                  </div>
                </>
              )}
            </div>
          )}

          {/* FORECAST */}
          {tab === "forecast" && forecast && (
            <div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10, marginBottom: 16 }}>
                <KPI label="Forecast Revenue" value={fmt(fcs.forecast_revenue)} color="#c8a97e" />
                <KPI label="Forecast Profit" value={fmt(fcs.forecast_profit)} color={fcs.forecast_profit >= 0 ? "#10b981" : "#ef4444"} />
                <KPI label="Forecast Covers" value={fcs.forecast_covers?.toLocaleString()} color="#3b82f6" />
                <KPI label="Season" value={fcs.seasonality_factor} sub={forecast.comparison_to_current?.season_impact} color="#8b5cf6" />
              </div>

              <div style={{ fontSize: 12, fontWeight: 600, color: "#c8a97e", marginBottom: 10, letterSpacing: "0.05em" }}>WEEKLY FORECAST — {forecast.forecast_period?.month}</div>
              <div style={cardStyle}>
                <table style={tableStyle} data-testid="weekly-forecast">
                  <thead><tr><th style={thStyle}>Week</th><th style={{ ...thStyle, textAlign: "right" }}>Revenue</th><th style={{ ...thStyle, textAlign: "right" }}>Cost</th><th style={{ ...thStyle, textAlign: "right" }}>Profit</th><th style={{ ...thStyle, textAlign: "right" }}>Covers</th><th style={{ ...thStyle, textAlign: "right" }}>Confidence</th></tr></thead>
                  <tbody>
                    {weekly.map((w: any, i: number) => (
                      <tr key={i}>
                        <td style={{ ...tdStyle, fontWeight: 500 }}>{w.week}</td>
                        <td style={{ ...tdStyle, ...monoStyle, textAlign: "right" }}>{fmt(w.revenue)}</td>
                        <td style={{ ...tdStyle, ...monoStyle, textAlign: "right", color: "#ef4444" }}>{fmt(w.cost)}</td>
                        <td style={{ ...tdStyle, ...monoStyle, textAlign: "right", color: w.profit >= 0 ? "#10b981" : "#ef4444" }}>{fmt(w.profit)}</td>
                        <td style={{ ...tdStyle, ...monoStyle, textAlign: "right" }}>{w.covers}</td>
                        <td style={{ ...tdStyle, ...monoStyle, textAlign: "right", color: "#c8a97e" }}>{(w.avg_confidence * 100).toFixed(0)}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {forecast.ai_forecast && (
                <>
                  <div style={{ fontSize: 12, fontWeight: 600, color: "#c8a97e", margin: "18px 0 10px", letterSpacing: "0.05em" }}>ECHOAI&sup3; FORECAST INTELLIGENCE</div>
                  <div style={{ ...cardStyle, borderLeft: "3px solid #3b82f6" }} data-testid="ai-forecast">
                    <div style={{ padding: 16, whiteSpace: "pre-wrap", fontSize: 12, lineHeight: 1.7, color: "rgba(226,232,240,0.8)" }}>
                      {forecast.ai_forecast}
                    </div>
                  </div>
                </>
              )}
            </div>
          )}

          {/* GAP ANALYSIS */}
          {tab === "gaps" && (
            <div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10, marginBottom: 16 }}>
                <KPI label="Revenue" value={fmt(fkpi.total_revenue)} color="#10b981" />
                <KPI label="EBITDA" value={fmt(fkpi.ebitda)} color={fkpi.ebitda >= 0 ? "#c8a97e" : "#ef4444"} />
                <KPI label="Food Cost" value={`${fkpi.food_cost_pct}%`} color={fkpi.food_cost_pct > 28 ? "#ef4444" : "#10b981"} />
                <KPI label="Issues Found" value={gapList.length} color={gaps?.critical_count > 0 ? "#ef4444" : "#f59e0b"} />
              </div>

              <div style={{ fontSize: 12, fontWeight: 600, color: "#c8a97e", marginBottom: 10, letterSpacing: "0.05em" }}>SYSTEM GAPS</div>
              {gapList.map((g: any, i: number) => (
                <div key={i} style={{ ...cardStyle, borderLeft: `3px solid ${g.severity === "critical" ? "#ef4444" : g.severity === "high" ? "#f59e0b" : g.severity === "medium" ? "#3b82f6" : "#10b981"}` }}>
                  <div style={{ padding: "10px 14px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div><span style={{ fontWeight: 600, color: "#f1f5f9", marginRight: 8 }}>{g.area}</span><span style={{ color: "#94a3b8", fontSize: 12 }}>{g.issue}</span></div>
                    <Badge text={g.severity} variant={g.severity === "critical" ? "danger" : g.severity === "high" ? "warning" : g.severity === "medium" ? "info" : "success"} />
                  </div>
                </div>
              ))}

              <div style={{ fontSize: 12, fontWeight: 600, color: "#c8a97e", margin: "18px 0 10px", letterSpacing: "0.05em" }}>DATA VOLUMES</div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10 }}>
                {Object.entries(gaps?.data_volumes || {}).map(([k, v]: [string, any]) => (
                  <KPI key={k} label={k.replace(/_/g, " ")} value={v.toLocaleString()} color="#94a3b8" />
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
