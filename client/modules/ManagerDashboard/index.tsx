import React, { useState, useEffect, useCallback } from "react";

const BACKEND = window.location.origin;

/* ── Utility ── */
function fmt(n: number) {
  if (n === undefined || n === null) return "$0";
  if (Math.abs(n) >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  return "$" + Math.abs(n).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

function pct(n: number) { return `${(n || 0).toFixed(1)}%`; }

/* ── Micro Components ── */
function StatusDot({ severity }: { severity: string }) {
  const c = severity === "critical" ? "#ef4444" : severity === "warning" ? "#f59e0b" : "#10b981";
  return <span style={{ display: "inline-block", width: 8, height: 8, borderRadius: "50%", background: c, marginRight: 8, boxShadow: `0 0 6px ${c}60` }} />;
}

function Gauge({ value, target, warn, critical, label, format }: { value: number; target: number; warn: number; critical: number; label: string; format?: string }) {
  const max = critical * 1.3;
  const pctVal = Math.min((value / max) * 100, 100);
  const color = value >= critical ? "#ef4444" : value >= warn ? "#f59e0b" : "#10b981";
  const display = format === "currency" ? fmt(value) : pct(value);
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
        <span style={{ fontSize: 11, color: "#94a3b8", letterSpacing: "0.04em" }}>{label}</span>
        <span style={{ fontSize: 13, fontWeight: 600, color, fontFamily: "'IBM Plex Mono', monospace" }}>{display}</span>
      </div>
      <div style={{ height: 6, background: "rgba(255,255,255,0.04)", borderRadius: 3, overflow: "hidden", position: "relative" }}>
        <div style={{ height: "100%", width: `${pctVal}%`, background: `linear-gradient(90deg, ${color}80, ${color})`, borderRadius: 3, transition: "width 0.6s ease" }} />
        <div style={{ position: "absolute", left: `${(target / max) * 100}%`, top: -2, width: 2, height: 10, background: "#c8a97e60", borderRadius: 1 }} />
      </div>
      <div style={{ fontSize: 9, color: "#64748b", marginTop: 2 }}>Target: {format === "currency" ? fmt(target) : pct(target)}</div>
    </div>
  );
}

function Badge({ text, variant }: { text: string; variant: "success" | "warning" | "danger" | "info" | "neutral" }) {
  const colors: Record<string, string> = { success: "#10b981", warning: "#f59e0b", danger: "#ef4444", info: "#3b82f6", neutral: "#64748b" };
  const c = colors[variant] || "#64748b";
  return <span style={{ padding: "2px 8px", borderRadius: 4, fontSize: 9, fontWeight: 600, background: `${c}15`, color: c, letterSpacing: "0.04em", textTransform: "uppercase" }}>{text}</span>;
}

/* ── Locked Section Banner ── */
function LockedBanner({ section, requiredAccess, onRequest }: { section: string; requiredAccess: string; onRequest: (s: string) => void }) {
  return (
    <div data-testid={`locked-${section}`} style={{
      display: "flex", alignItems: "center", justifyContent: "space-between",
      padding: "10px 14px", background: "rgba(148,163,184,0.03)",
      border: "1px solid rgba(148,163,184,0.08)", borderRadius: 8, marginBottom: 6,
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
        <span style={{ fontSize: 12, color: "#64748b" }}>{section}</span>
        <span style={{ fontSize: 10, color: "#475569" }}>Requires <b>{requiredAccess}</b> access</span>
      </div>
      <div style={{ display: "flex", gap: 6 }}>
        <button onClick={() => onRequest(section)} style={{ padding: "4px 10px", borderRadius: 4, border: "1px solid rgba(200,169,126,0.3)", background: "transparent", color: "#c8a97e", fontSize: 10, cursor: "pointer", fontWeight: 500 }}>
          Request Access
        </button>
      </div>
    </div>
  );
}

/* ── Invoice Popup Modal ── */
function InvoiceModal({ data, onClose }: { data: any; onClose: () => void }) {
  if (!data) return null;
  const inv = data.invoice || {};
  const po = data.purchase_order;
  const rcv = data.receiving;
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", backdropFilter: "blur(8px)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center" }} onClick={onClose}>
      <div data-testid="invoice-modal" onClick={e => e.stopPropagation()} style={{ background: "#0f1219", border: "1px solid rgba(200,169,126,0.15)", borderRadius: 12, width: 640, maxHeight: "80vh", overflow: "auto", boxShadow: "0 20px 60px rgba(0,0,0,0.5)" }}>
        {/* Header */}
        <div style={{ padding: "16px 20px", borderBottom: "1px solid rgba(255,255,255,0.06)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <div style={{ fontSize: 15, fontWeight: 600, color: "#e2e8f0" }}>{inv.vendor_name}</div>
            <div style={{ fontSize: 11, color: "#c8a97e", fontFamily: "'IBM Plex Mono', monospace" }}>{inv.invoice_number}</div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: 22, fontWeight: 700, color: "#c8a97e", fontFamily: "'IBM Plex Mono', monospace" }}>{fmt(inv.total)}</div>
            <Badge text={inv.status || "unknown"} variant={inv.status === "paid" ? "success" : "warning"} />
          </div>
        </div>

        {/* Metadata grid */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 1, background: "rgba(255,255,255,0.02)", padding: "12px 20px" }}>
          {[
            { l: "Date", v: inv.invoice_date }, { l: "Due", v: inv.due_date },
            { l: "Terms", v: inv.payment_terms }, { l: "GL Code", v: inv.gl_code },
          ].map((m, i) => (
            <div key={i}><div style={{ fontSize: 9, color: "#475569", textTransform: "uppercase", letterSpacing: "0.08em" }}>{m.l}</div><div style={{ fontSize: 12, color: "#e2e8f0", fontFamily: "'IBM Plex Mono', monospace" }}>{m.v || "-"}</div></div>
          ))}
        </div>

        {/* Line items */}
        <div style={{ padding: "12px 20px" }}>
          <div style={{ fontSize: 10, fontWeight: 600, color: "#c8a97e", letterSpacing: "0.08em", marginBottom: 8 }}>LINE ITEMS</div>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11 }}>
            <thead><tr>{["Item", "Qty", "Unit", "Price", "Ext"].map(h => <th key={h} style={{ padding: "6px 8px", textAlign: h === "Item" ? "left" : "right", fontSize: 9, color: "#475569", textTransform: "uppercase", letterSpacing: "0.08em", borderBottom: "1px solid rgba(255,255,255,0.04)" }}>{h}</th>)}</tr></thead>
            <tbody>
              {(inv.line_items || []).map((li: any, i: number) => (
                <tr key={i}>
                  <td style={{ padding: "6px 8px", color: "#94a3b8", borderBottom: "1px solid rgba(255,255,255,0.02)" }}>{li.description}</td>
                  <td style={{ padding: "6px 8px", textAlign: "right", fontFamily: "'IBM Plex Mono', monospace", color: "#e2e8f0", borderBottom: "1px solid rgba(255,255,255,0.02)" }}>{li.quantity_shipped || li.quantity_ordered}</td>
                  <td style={{ padding: "6px 8px", textAlign: "right", color: "#64748b", borderBottom: "1px solid rgba(255,255,255,0.02)" }}>{li.pack_unit}</td>
                  <td style={{ padding: "6px 8px", textAlign: "right", fontFamily: "'IBM Plex Mono', monospace", color: "#94a3b8", borderBottom: "1px solid rgba(255,255,255,0.02)" }}>{fmt(li.unit_price)}</td>
                  <td style={{ padding: "6px 8px", textAlign: "right", fontFamily: "'IBM Plex Mono', monospace", color: "#e2e8f0", fontWeight: 500, borderBottom: "1px solid rgba(255,255,255,0.02)" }}>{fmt(li.extension)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 8, gap: 16 }}>
            <span style={{ fontSize: 11, color: "#64748b" }}>Subtotal: {fmt(inv.subtotal)}</span>
            <span style={{ fontSize: 11, color: "#64748b" }}>Tax: {fmt(inv.tax)}</span>
            <span style={{ fontSize: 13, fontWeight: 700, color: "#c8a97e" }}>Total: {fmt(inv.total)}</span>
          </div>
        </div>

        {/* PO + Receiving chain */}
        <div style={{ padding: "0 20px 16px", display: "flex", gap: 10 }}>
          {po && (
            <div style={{ flex: 1, padding: 10, background: "rgba(59,130,246,0.04)", borderRadius: 6, border: "1px solid rgba(59,130,246,0.1)" }}>
              <div style={{ fontSize: 9, color: "#3b82f6", textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 600 }}>Purchase Order</div>
              <div style={{ fontSize: 11, color: "#e2e8f0", fontFamily: "'IBM Plex Mono', monospace" }}>{po.po_id}</div>
              <div style={{ fontSize: 10, color: "#64748b" }}>{po.vendor_name} &bull; {po.status}</div>
            </div>
          )}
          {rcv && (
            <div style={{ flex: 1, padding: 10, background: "rgba(16,185,129,0.04)", borderRadius: 6, border: "1px solid rgba(16,185,129,0.1)" }}>
              <div style={{ fontSize: 9, color: "#10b981", textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 600 }}>Receiving Log</div>
              <div style={{ fontSize: 11, color: "#e2e8f0" }}>{rcv.received_by}</div>
              <div style={{ fontSize: 10, color: "#64748b" }}>Temp: <span style={{ color: rcv.temperature_check === "pass" ? "#10b981" : "#ef4444" }}>{rcv.temperature_check}</span> &bull; Quality: <span style={{ color: rcv.quality_check === "pass" ? "#10b981" : "#ef4444" }}>{rcv.quality_check}</span></div>
            </div>
          )}
        </div>

        <div style={{ padding: "12px 20px", borderTop: "1px solid rgba(255,255,255,0.04)", textAlign: "right" }}>
          <button onClick={onClose} style={{ padding: "8px 20px", borderRadius: 6, border: "1px solid rgba(200,169,126,0.2)", background: "transparent", color: "#c8a97e", fontSize: 12, cursor: "pointer" }}>Close</button>
        </div>
      </div>
    </div>
  );
}

/* ── Request Access Toast ── */
function AccessRequestToast({ visible, section, onClose }: { visible: boolean; section: string; onClose: () => void }) {
  if (!visible) return null;
  return (
    <div style={{ position: "fixed", bottom: 24, right: 24, background: "#10b981", color: "#fff", padding: "12px 20px", borderRadius: 8, fontSize: 13, zIndex: 1001, boxShadow: "0 8px 24px rgba(0,0,0,0.3)" }}>
      Access request for "{section}" sent to Accounting
      <button onClick={onClose} style={{ marginLeft: 12, background: "transparent", border: "none", color: "#fff", cursor: "pointer", fontWeight: 600 }}>Dismiss</button>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════
   MAIN PANEL
   ═══════════════════════════════════════════════════════════════════════ */
export default function ManagerDashboard() {
  const [userId, setUserId] = useState("usr-mgr-001");
  const [pnl, setPnl] = useState<any>(null);
  const [alerts, setAlerts] = useState<any>(null);
  const [glDrill, setGlDrill] = useState<any>(null);
  const [aiReview, setAiReview] = useState<any>(null);
  const [invoicePopup, setInvoicePopup] = useState<any>(null);
  const [requestToast, setRequestToast] = useState({ visible: false, section: "" });
  const [loading, setLoading] = useState(true);
  const [aiLoading, setAiLoading] = useState(false);
  const [tab, setTab] = useState<string>("pnl");

  const USERS = [
    { id: "usr-mgr-001", label: "Lisa Thompson — Dining Manager" },
    { id: "usr-chef-001", label: "Chef Marcus Laurent — Exec Chef" },
    { id: "usr-fbd-001", label: "Maria Santos — F&B Director" },
    { id: "usr-gm-001", label: "Sarah Mitchell — General Manager" },
    { id: "usr-ctrl-001", label: "David Chen — Controller" },
  ];

  const load = useCallback(async (uid: string) => {
    setLoading(true);
    try {
      const [p, a] = await Promise.all([
        fetch(`${BACKEND}/api/manager/pnl?user_id=${uid}`).then(r => r.json()),
        fetch(`${BACKEND}/api/manager/alerts?user_id=${uid}`).then(r => r.json()),
      ]);
      setPnl(p);
      setAlerts(a);
    } catch (e) { console.error(e); }
    setLoading(false);
  }, []);

  useEffect(() => { load(userId); }, [userId, load]);

  const drillGL = async (code: string) => {
    const res = await fetch(`${BACKEND}/api/manager/gl-drilldown/${code}?user_id=${userId}`);
    setGlDrill(await res.json());
  };

  const openInvoice = async (invId: string) => {
    const res = await fetch(`${BACKEND}/api/simulation/invoices/${invId}`);
    setInvoicePopup(await res.json());
  };

  const requestAccess = async (section: string) => {
    await fetch(`${BACKEND}/api/manager/access-request`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ user_id: userId, requested_section: section, reason: "Need access for monthly review" }),
    });
    setRequestToast({ visible: true, section });
    setTimeout(() => setRequestToast({ visible: false, section: "" }), 4000);
  };

  const loadAiReview = async () => {
    setAiLoading(true);
    try {
      const res = await fetch(`${BACKEND}/api/manager/ai-review?user_id=${userId}`, { method: "POST" });
      setAiReview(await res.json());
    } finally { setAiLoading(false); }
  };

  if (loading) return <div style={{ padding: 40, textAlign: "center", color: "#64748b" }}>Loading your dashboard...</div>;

  const user = pnl?.user || {};
  const lines = pnl?.pnl_lines || [];
  const locked = pnl?.locked_sections || [];
  const kpis = pnl?.kpis || {};
  const summary = pnl?.summary || {};
  const alertList = alerts?.alerts || [];

  const cardStyle: React.CSSProperties = { background: "rgba(255,255,255,0.015)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 10, overflow: "hidden" };
  const TABS = [
    { id: "pnl", label: "My P&L" },
    { id: "alerts", label: `Alerts (${alertList.length})` },
    { id: "drilldown", label: "GL Drill-Down" },
    { id: "ai", label: "AI Review" },
  ];

  return (
    <div style={{ fontFamily: "'IBM Plex Sans', -apple-system, sans-serif", padding: 24, color: "#e2e8f0", minHeight: "100%" }} data-testid="manager-dashboard-panel">
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 18, fontWeight: 300, letterSpacing: "0.12em", color: "#c8a97e", margin: 0 }}>OPERATIONS DASHBOARD</h1>
          <p style={{ fontSize: 11, color: "rgba(148,163,184,0.4)", marginTop: 2 }}>
            {user.name} &bull; {user.role} &bull; {(user.departments || []).join(", ")}
          </p>
        </div>
        <select data-testid="user-selector" value={userId} onChange={e => setUserId(e.target.value)}
          style={{ padding: "6px 12px", borderRadius: 6, border: "1px solid rgba(200,169,126,0.2)", background: "#0f1219", color: "#c8a97e", fontSize: 11, outline: "none" }}>
          {USERS.map(u => <option key={u.id} value={u.id}>{u.label}</option>)}
        </select>
      </div>

      {/* Top KPI bar */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 10, marginBottom: 18 }}>
        <div style={{ ...cardStyle, padding: "14px 16px" }}>
          <div style={{ fontSize: 9, letterSpacing: "0.1em", textTransform: "uppercase", color: "rgba(148,163,184,0.5)" }}>Revenue</div>
          <div style={{ fontSize: 22, fontWeight: 600, color: "#10b981", fontFamily: "'IBM Plex Mono', monospace" }}>{fmt(summary.revenue)}</div>
          <div style={{ fontSize: 10, color: "#64748b" }}>{summary.transactions} txns &bull; {summary.covers} covers</div>
        </div>
        <div style={{ ...cardStyle, padding: "14px 16px" }}>
          <div style={{ fontSize: 9, letterSpacing: "0.1em", textTransform: "uppercase", color: "rgba(148,163,184,0.5)" }}>Avg Check</div>
          <div style={{ fontSize: 22, fontWeight: 600, color: "#8b5cf6", fontFamily: "'IBM Plex Mono', monospace" }}>{fmt(summary.avg_check)}</div>
        </div>
        <div style={{ ...cardStyle, padding: "14px 16px" }}>
          <div style={{ fontSize: 9, letterSpacing: "0.1em", textTransform: "uppercase", color: "rgba(148,163,184,0.5)" }}>Food Cost</div>
          <div style={{ fontSize: 22, fontWeight: 600, color: kpis.food_cost_pct > 25 ? "#ef4444" : "#10b981", fontFamily: "'IBM Plex Mono', monospace" }}>{pct(kpis.food_cost_pct)}</div>
          <div style={{ fontSize: 10, color: "#64748b" }}>Target: 22%</div>
        </div>
        <div style={{ ...cardStyle, padding: "14px 16px" }}>
          <div style={{ fontSize: 9, letterSpacing: "0.1em", textTransform: "uppercase", color: "rgba(148,163,184,0.5)" }}>Hourly Labor</div>
          <div style={{ fontSize: 22, fontWeight: 600, color: kpis.hourly_labor_pct > 28 ? "#ef4444" : kpis.hourly_labor_pct > 25 ? "#f59e0b" : "#10b981", fontFamily: "'IBM Plex Mono', monospace" }}>{pct(kpis.hourly_labor_pct)}</div>
          <div style={{ fontSize: 10, color: "#64748b" }}>Target: 25%</div>
        </div>
        <div style={{ ...cardStyle, padding: "14px 16px", borderLeft: alertList.filter((a: any) => a.severity === "critical").length > 0 ? "3px solid #ef4444" : "3px solid #10b981" }}>
          <div style={{ fontSize: 9, letterSpacing: "0.1em", textTransform: "uppercase", color: "rgba(148,163,184,0.5)" }}>Active Alerts</div>
          <div style={{ fontSize: 22, fontWeight: 600, color: alerts?.critical_count > 0 ? "#ef4444" : "#f59e0b", fontFamily: "'IBM Plex Mono', monospace" }}>{alertList.length}</div>
          <div style={{ fontSize: 10, color: "#ef4444" }}>{alerts?.critical_count || 0} critical</div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: 3, marginBottom: 18, borderBottom: "1px solid rgba(255,255,255,0.04)", paddingBottom: 1 }}>
        {TABS.map(t => (
          <button key={t.id} data-testid={`mgr-tab-${t.id}`} onClick={() => { setTab(t.id); if (t.id === "ai" && !aiReview) loadAiReview(); }}
            style={{ padding: "8px 18px", borderRadius: "6px 6px 0 0", border: "none", cursor: "pointer", fontSize: 11, fontWeight: 500, letterSpacing: "0.03em",
              background: tab === t.id ? "rgba(200,169,126,0.10)" : "transparent", color: tab === t.id ? "#c8a97e" : "#64748b",
              borderBottom: tab === t.id ? "2px solid #c8a97e" : "2px solid transparent" }}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ── P&L TAB ── */}
      {tab === "pnl" && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 320px", gap: 16 }}>
          <div style={cardStyle}>
            <div style={{ padding: "12px 16px", borderBottom: "1px solid rgba(255,255,255,0.04)", display: "flex", justifyContent: "space-between" }}>
              <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase", color: "rgba(200,169,126,0.6)" }}>
                {pnl?.scope === "resort" ? "Resort P&L" : "Department P&L"} — {(user.departments || []).join(", ")}
              </span>
              <Badge text={pnl?.scope || ""} variant="info" />
            </div>
            <div style={{ padding: 16 }}>
              {lines.map((l: any) => (
                <div key={l.id} data-testid={`pnl-line-${l.id}`}
                  onClick={() => l.gl_codes && !l.gl_codes.includes("calc") && drillGL(l.gl_codes.split("-")[0])}
                  style={{ display: "flex", justifyContent: "space-between", alignItems: "center",
                    padding: "10px 12px", marginBottom: 4, borderRadius: 6,
                    cursor: l.gl_codes && !l.gl_codes.includes("calc") ? "pointer" : "default",
                    background: l.type === "profit" ? "rgba(200,169,126,0.04)" : "transparent",
                    borderLeft: l.type === "profit" ? "3px solid #c8a97e" : "3px solid transparent",
                    transition: "background 0.15s",
                  }}
                  onMouseEnter={e => { if (l.gl_codes && !l.gl_codes.includes("calc")) (e.currentTarget as HTMLElement).style.background = "rgba(200,169,126,0.04)"; }}
                  onMouseLeave={e => { if (l.type !== "profit") (e.currentTarget as HTMLElement).style.background = "transparent"; }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <div style={{ width: 3, height: 20, borderRadius: 2, background: l.color }} />
                    <span style={{ fontSize: 13, color: l.type === "profit" ? "#c8a97e" : "#e2e8f0", fontWeight: l.type === "profit" ? 600 : 400 }}>{l.label}</span>
                    {l.gl_codes && !l.gl_codes.includes("calc") && (
                      <span style={{ fontSize: 9, color: "#475569", fontFamily: "'IBM Plex Mono', monospace" }}>GL {l.gl_codes}</span>
                    )}
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    {l.pct_of_revenue && <span style={{ fontSize: 11, color: "#64748b" }}>{pct(l.pct_of_revenue)}</span>}
                    <span style={{ fontSize: 14, fontWeight: 600, fontFamily: "'IBM Plex Mono', monospace",
                      color: l.type === "revenue" ? "#10b981" : l.type === "profit" ? (l.amount >= 0 ? "#c8a97e" : "#ef4444") : "#e2e8f0"
                    }}>
                      {l.type === "expense" ? `-${fmt(l.amount)}` : fmt(l.amount)}
                    </span>
                  </div>
                </div>
              ))}

              {/* Locked sections */}
              {locked.length > 0 && (
                <div style={{ marginTop: 12, borderTop: "1px solid rgba(255,255,255,0.04)", paddingTop: 12 }}>
                  {locked.map((l: any) => (
                    <LockedBanner key={l.id} section={l.label} requiredAccess={l.required_access} onRequest={requestAccess} />
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Right sidebar: Budget gauges */}
          <div>
            <div style={{ ...cardStyle, padding: 16, marginBottom: 12 }}>
              <div style={{ fontSize: 10, fontWeight: 600, color: "#c8a97e", letterSpacing: "0.08em", marginBottom: 14 }}>BUDGET PERFORMANCE</div>
              <Gauge value={kpis.food_cost_pct || 0} target={22} warn={25} critical={28} label="Food Cost %" />
              <Gauge value={kpis.bev_cost_pct || 0} target={18} warn={22} critical={25} label="Beverage Cost %" />
              <Gauge value={kpis.hourly_labor_pct || 0} target={25} warn={28} critical={32} label="Hourly Labor %" />
              <Gauge value={kpis.waste_pct || 0} target={1} warn={1.5} critical={2} label="Waste %" />
            </div>
            <div style={{ ...cardStyle, padding: 16 }}>
              <div style={{ fontSize: 10, fontWeight: 600, color: "#c8a97e", letterSpacing: "0.08em", marginBottom: 10 }}>QUICK STATS</div>
              {[
                { l: "Invoices", v: summary.invoices },
                { l: "Waste Cost", v: fmt(summary.waste) },
              ].map((s, i) => (
                <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "4px 0", fontSize: 12 }}>
                  <span style={{ color: "#64748b" }}>{s.l}</span>
                  <span style={{ color: "#e2e8f0", fontFamily: "'IBM Plex Mono', monospace" }}>{s.v}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── ALERTS TAB ── */}
      {tab === "alerts" && (
        <div>
          {alertList.map((a: any, i: number) => (
            <div key={i} style={{ ...cardStyle, marginBottom: 8, borderLeft: `3px solid ${a.severity === "critical" ? "#ef4444" : a.severity === "warning" ? "#f59e0b" : "#3b82f6"}` }}>
              <div style={{ padding: "12px 16px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                  <div style={{ display: "flex", alignItems: "center" }}>
                    <StatusDot severity={a.severity} />
                    <span style={{ fontSize: 13, fontWeight: 600, color: "#e2e8f0" }}>{a.metric || a.type}</span>
                    <Badge text={a.severity} variant={a.severity === "critical" ? "danger" : a.severity === "warning" ? "warning" : "info"} />
                  </div>
                  {a.impact && <span style={{ fontSize: 11, color: "#c8a97e", fontFamily: "'IBM Plex Mono', monospace" }}>{a.impact}</span>}
                </div>
                <div style={{ fontSize: 12, color: "#94a3b8", marginBottom: 4 }}>{a.message}</div>
                {a.action && <div style={{ fontSize: 11, color: "#64748b", fontStyle: "italic" }}>{a.action}</div>}
                {a.invoice_id && (
                  <button onClick={() => openInvoice(a.invoice_id)} style={{ marginTop: 6, padding: "4px 10px", borderRadius: 4, border: "1px solid rgba(200,169,126,0.2)", background: "transparent", color: "#c8a97e", fontSize: 10, cursor: "pointer" }}>
                    View Invoice
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── GL DRILL-DOWN TAB ── */}
      {tab === "drilldown" && (
        <div>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 14 }}>
            {[
              { c: "4000", l: "Food Rev" }, { c: "4100", l: "Bev Rev" }, { c: "5000", l: "Food COGS" },
              { c: "5100", l: "Bev COGS" }, { c: "6000", l: "BOH Labor" }, { c: "6010", l: "FOH Labor" },
              { c: "7500", l: "Utilities" }, { c: "8000", l: "Marketing" }, { c: "8500", l: "R&M" },
            ].map(g => (
              <button key={g.c} data-testid={`gl-btn-${g.c}`} onClick={() => drillGL(g.c)}
                style={{ padding: "6px 14px", borderRadius: 6, fontSize: 10, cursor: "pointer", fontWeight: 500,
                  border: glDrill?.gl_code === g.c ? "1px solid #c8a97e" : "1px solid rgba(255,255,255,0.06)",
                  background: glDrill?.gl_code === g.c ? "rgba(200,169,126,0.08)" : "transparent",
                  color: glDrill?.gl_code === g.c ? "#c8a97e" : "#64748b" }}>
                {g.c} {g.l}
              </button>
            ))}
          </div>

          {glDrill && (
            <div style={cardStyle}>
              <div style={{ padding: "12px 16px", borderBottom: "1px solid rgba(255,255,255,0.04)", display: "flex", justifyContent: "space-between" }}>
                <div>
                  <span style={{ fontSize: 13, fontWeight: 600, color: "#e2e8f0" }}>{glDrill.gl_info.name}</span>
                  <span style={{ fontSize: 11, color: "#64748b", marginLeft: 8 }}>GL {glDrill.gl_code} &bull; {glDrill.gl_info.category}</span>
                </div>
                <span style={{ fontSize: 16, fontWeight: 600, color: "#c8a97e", fontFamily: "'IBM Plex Mono', monospace" }}>{fmt(glDrill.total)}</span>
              </div>

              {/* GL Entries */}
              <div style={{ maxHeight: 200, overflow: "auto", borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11 }}>
                  <thead><tr>{["Date", "Description", "Amount", "Source"].map(h => <th key={h} style={{ padding: "6px 12px", textAlign: h === "Amount" ? "right" : "left", fontSize: 9, color: "#475569", textTransform: "uppercase", letterSpacing: "0.08em", borderBottom: "1px solid rgba(255,255,255,0.04)" }}>{h}</th>)}</tr></thead>
                  <tbody>
                    {(glDrill.entries || []).slice(0, 15).map((e: any, i: number) => (
                      <tr key={i}>
                        <td style={{ padding: "6px 12px", fontFamily: "'IBM Plex Mono', monospace", color: "#94a3b8", borderBottom: "1px solid rgba(255,255,255,0.02)" }}>{e.date}</td>
                        <td style={{ padding: "6px 12px", color: "#94a3b8", borderBottom: "1px solid rgba(255,255,255,0.02)" }}>{e.description}</td>
                        <td style={{ padding: "6px 12px", textAlign: "right", fontFamily: "'IBM Plex Mono', monospace", color: "#e2e8f0", borderBottom: "1px solid rgba(255,255,255,0.02)" }}>{fmt(e.amount)}</td>
                        <td style={{ padding: "6px 12px", borderBottom: "1px solid rgba(255,255,255,0.02)" }}><Badge text={e.source} variant="neutral" /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Linked invoices */}
              {glDrill.invoices?.length > 0 && (
                <div style={{ padding: 16 }}>
                  <div style={{ fontSize: 10, fontWeight: 600, color: "#c8a97e", letterSpacing: "0.08em", marginBottom: 8 }}>LINKED INVOICES ({glDrill.invoice_count})</div>
                  {glDrill.invoices.slice(0, 8).map((ic: any, i: number) => {
                    const inv = ic.invoice;
                    return (
                      <div key={i} onClick={() => setInvoicePopup(ic)} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 10px", marginBottom: 4, borderRadius: 6, cursor: "pointer", background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.04)", transition: "background 0.15s" }}
                        onMouseEnter={e => (e.currentTarget.style.background = "rgba(200,169,126,0.04)")}
                        onMouseLeave={e => (e.currentTarget.style.background = "rgba(255,255,255,0.02)")}>
                        <div>
                          <span style={{ fontSize: 11, fontFamily: "'IBM Plex Mono', monospace", color: "#c8a97e" }}>{inv.invoice_number}</span>
                          <span style={{ fontSize: 11, color: "#94a3b8", marginLeft: 10 }}>{inv.vendor_name}</span>
                          <span style={{ fontSize: 10, color: "#475569", marginLeft: 10 }}>{inv.invoice_date}</span>
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          {ic.chain_complete && <Badge text="Full chain" variant="success" />}
                          <span style={{ fontSize: 13, fontWeight: 600, fontFamily: "'IBM Plex Mono', monospace", color: "#e2e8f0" }}>{fmt(inv.total)}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── AI REVIEW TAB ── */}
      {tab === "ai" && (
        <div>
          {aiLoading ? (
            <div style={{ textAlign: "center", padding: 40, color: "#64748b" }}>
              <div style={{ fontSize: 13 }}>EchoAi&sup3; is analyzing your department performance...</div>
            </div>
          ) : aiReview ? (
            <div style={{ ...cardStyle, borderLeft: "3px solid #c8a97e" }}>
              <div style={{ padding: "14px 18px", borderBottom: "1px solid rgba(255,255,255,0.04)", display: "flex", justifyContent: "space-between" }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: "#c8a97e" }}>EchoAi&sup3; Executive Review</div>
                  <div style={{ fontSize: 10, color: "#64748b" }}>Personalized for {aiReview.user?.name} &bull; {aiReview.user?.role}</div>
                </div>
                <button onClick={loadAiReview} style={{ padding: "5px 12px", borderRadius: 5, border: "1px solid rgba(200,169,126,0.2)", background: "transparent", color: "#c8a97e", fontSize: 10, cursor: "pointer" }}>Refresh</button>
              </div>
              <div style={{ padding: 18, whiteSpace: "pre-wrap", fontSize: 13, lineHeight: 1.8, color: "rgba(226,232,240,0.85)" }}>
                {aiReview.narrative}
              </div>
            </div>
          ) : (
            <div style={{ textAlign: "center", padding: 40 }}>
              <button onClick={loadAiReview} style={{ padding: "10px 24px", borderRadius: 8, border: "1px solid rgba(200,169,126,0.3)", background: "rgba(200,169,126,0.08)", color: "#c8a97e", fontSize: 13, cursor: "pointer" }}>
                Generate AI Review
              </button>
            </div>
          )}
        </div>
      )}

      {/* Modals */}
      {invoicePopup && <InvoiceModal data={invoicePopup} onClose={() => setInvoicePopup(null)} />}
      <AccessRequestToast visible={requestToast.visible} section={requestToast.section} onClose={() => setRequestToast({ visible: false, section: "" })} />
    </div>
  );
}
