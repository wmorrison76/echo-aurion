import React, { useState, useEffect, useCallback } from "react";

const BACKEND = window.location.origin;

function Badge({ text, variant }: { text: string; variant: string }) {
  const c: Record<string, string> = { success: "#10b981", warning: "#f59e0b", danger: "#ef4444", critical: "#ef4444", info: "#3b82f6", neutral: "#64748b", high: "#f59e0b", medium: "#3b82f6", low: "#64748b", open: "#3b82f6", in_progress: "#f59e0b", completed: "#10b981" };
  const color = c[variant] || "#64748b";
  return <span style={{ padding: "2px 8px", borderRadius: 4, fontSize: 9, fontWeight: 600, background: `${color}15`, color, letterSpacing: "0.04em", textTransform: "uppercase" }}>{text}</span>;
}

function StatusDot({ status }: { status: string }) {
  const c = status === "operational" ? "#10b981" : status === "needs_repair" ? "#ef4444" : "#f59e0b";
  return <span style={{ display: "inline-block", width: 8, height: 8, borderRadius: "50%", background: c, boxShadow: `0 0 6px ${c}40`, marginRight: 6 }} />;
}

export default function EngineeringDash() {
  const [dash, setDash] = useState<any>(null);
  const [equipment, setEquipment] = useState<any>(null);
  const [pmSchedule, setPmSchedule] = useState<any>(null);
  const [tab, setTab] = useState("overview");
  const [loading, setLoading] = useState(true);
  const [woForm, setWoForm] = useState({ title: "", description: "", wo_type: "corrective", priority: "medium", location: "" });

  const load = useCallback(async () => {
    try {
      const [d, eq, pm] = await Promise.all([
        fetch(`${BACKEND}/api/engineering/dashboard`).then(r => r.json()),
        fetch(`${BACKEND}/api/engineering/equipment`).then(r => r.json()),
        fetch(`${BACKEND}/api/engineering/pm-schedule`).then(r => r.json()),
      ]);
      setDash(d);
      setEquipment(eq);
      setPmSchedule(pm);
    } catch (e) { console.error(e); }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const createWO = async () => {
    await fetch(`${BACKEND}/api/engineering/work-orders`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify(woForm),
    });
    setWoForm({ title: "", description: "", wo_type: "corrective", priority: "medium", location: "" });
    load();
  };

  if (loading) return <div style={{ padding: 40, textAlign: "center", color: "#64748b" }}>Loading Engineering Dashboard...</div>;

  const card: React.CSSProperties = { background: "rgba(255,255,255,0.015)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 10, overflow: "hidden", marginBottom: 14 };
  const cardHead: React.CSSProperties = { padding: "12px 16px", borderBottom: "1px solid rgba(255,255,255,0.04)", display: "flex", justifyContent: "space-between", alignItems: "center" };
  const cardTitle: React.CSSProperties = { fontSize: 11, fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase" as const, color: "rgba(200,169,126,0.6)" };
  const th: React.CSSProperties = { padding: "8px 12px", textAlign: "left", fontSize: 9, letterSpacing: "0.08em", textTransform: "uppercase", color: "rgba(148,163,184,0.4)", borderBottom: "1px solid rgba(255,255,255,0.04)" };
  const td: React.CSSProperties = { padding: "8px 12px", borderBottom: "1px solid rgba(255,255,255,0.02)", fontSize: 11, color: "#94a3b8" };
  const mono: React.CSSProperties = { fontFamily: "'IBM Plex Mono', monospace" };
  const inputStyle: React.CSSProperties = { width: "100%", padding: "8px 10px", borderRadius: 6, border: "1px solid rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.02)", color: "#e2e8f0", fontSize: 12, outline: "none" };
  const wo = dash?.work_orders || {};
  const orders = dash?.recent_orders || [];
  const equips = equipment?.equipment || [];
  const pmDue = pmSchedule?.due_now || [];
  const pmUp = pmSchedule?.upcoming || [];

  const TABS = [
    { id: "overview", l: "Overview" },
    { id: "orders", l: `Work Orders (${wo.open || 0})` },
    { id: "equipment", l: `Equipment (${equips.length})` },
    { id: "pm", l: `PM Schedule (${pmDue.length} due)` },
    { id: "create", l: "New Work Order" },
  ];

  return (
    <div style={{ fontFamily: "'IBM Plex Sans', -apple-system, sans-serif", padding: 24, color: "#e2e8f0" }} data-testid="engineering-dashboard">
      <div style={{ marginBottom: 16 }}>
        <h1 style={{ fontSize: 18, fontWeight: 300, letterSpacing: "0.12em", color: "#c8a97e", margin: 0 }}>ENGINEERING OPERATIONS</h1>
        <p style={{ fontSize: 11, color: "rgba(148,163,184,0.4)", marginTop: 2 }}>Work Orders &bull; Equipment Registry &bull; PM Schedules &bull; Maintenance Alerts</p>
      </div>

      {/* KPIs */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 10, marginBottom: 16 }}>
        {[
          { l: "Open", v: wo.open || 0, c: "#3b82f6" },
          { l: "In Progress", v: wo.in_progress || 0, c: "#f59e0b" },
          { l: "Critical", v: wo.critical_open || 0, c: wo.critical_open > 0 ? "#ef4444" : "#10b981" },
          { l: "Completed", v: wo.completed || 0, c: "#10b981" },
          { l: "Equipment", v: equips.length, c: "#8b5cf6" },
        ].map((k, i) => (
          <div key={i} style={{ ...card, padding: "14px 16px", marginBottom: 0 }}>
            <div style={{ fontSize: 9, letterSpacing: "0.1em", textTransform: "uppercase", color: "rgba(148,163,184,0.5)" }}>{k.l}</div>
            <div style={{ fontSize: 24, fontWeight: 600, color: k.c, ...mono }}>{k.v}</div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: 3, marginBottom: 16, borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
        {TABS.map(t => (
          <button key={t.id} data-testid={`eng-tab-${t.id}`} onClick={() => setTab(t.id)}
            style={{ padding: "8px 18px", border: "none", cursor: "pointer", fontSize: 11, fontWeight: 500, borderRadius: "6px 6px 0 0",
              background: tab === t.id ? "rgba(200,169,126,0.10)" : "transparent", color: tab === t.id ? "#c8a97e" : "#64748b",
              borderBottom: tab === t.id ? "2px solid #c8a97e" : "2px solid transparent" }}>{t.l}</button>
        ))}
      </div>

      {/* Overview */}
      {tab === "overview" && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
          <div style={card}>
            <div style={cardHead}><span style={cardTitle}>Recent Work Orders</span></div>
            <div style={{ padding: 12 }}>
              {orders.map((o: any, i: number) => (
                <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 0", borderBottom: "1px solid rgba(255,255,255,0.03)" }}>
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 500, color: "#f1f5f9" }}>{o.title}</div>
                    <div style={{ fontSize: 10, color: "#64748b" }}>{o.location} &bull; {o.wo_type}</div>
                  </div>
                  <div style={{ display: "flex", gap: 6 }}>
                    <Badge text={o.priority} variant={o.priority} />
                    <Badge text={o.status} variant={o.status} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div style={card}>
            <div style={cardHead}><span style={cardTitle}>PM Due Soon ({pmDue.length})</span></div>
            <div style={{ padding: 12 }}>
              {pmDue.length === 0 ? (
                <div style={{ textAlign: "center", color: "#10b981", padding: 20, fontSize: 12 }}>All PMs up to date</div>
              ) : pmDue.map((pm: any, i: number) => (
                <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid rgba(255,255,255,0.03)" }}>
                  <div>
                    <div style={{ fontSize: 12, color: "#f1f5f9" }}>{pm.name}</div>
                    <div style={{ fontSize: 10, color: "#64748b" }}>{pm.location} &bull; {pm.category}</div>
                  </div>
                  <Badge text={pm.status} variant={pm.status === "overdue" ? "danger" : "warning"} />
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Work Orders */}
      {tab === "orders" && (
        <div style={card}>
          <div style={{ maxHeight: 400, overflow: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead><tr><th style={th}>WO #</th><th style={th}>Title</th><th style={th}>Type</th><th style={th}>Priority</th><th style={th}>Location</th><th style={th}>Status</th></tr></thead>
              <tbody>
                {orders.map((o: any, i: number) => (
                  <tr key={i}>
                    <td style={{ ...td, ...mono, fontSize: 10, color: "#c8a97e" }}>{o.wo_id}</td>
                    <td style={{ ...td, fontWeight: 500, color: "#f1f5f9" }}>{o.title}</td>
                    <td style={td}><Badge text={o.wo_type} variant="neutral" /></td>
                    <td style={td}><Badge text={o.priority} variant={o.priority} /></td>
                    <td style={td}>{o.location}</td>
                    <td style={td}><Badge text={o.status} variant={o.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Equipment */}
      {tab === "equipment" && (
        <div style={card}>
          <div style={{ maxHeight: 400, overflow: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead><tr><th style={th}>Equipment</th><th style={th}>Category</th><th style={th}>Location</th><th style={th}>Model</th><th style={th}>PM Freq</th><th style={th}>Status</th></tr></thead>
              <tbody>
                {equips.map((eq: any, i: number) => (
                  <tr key={i}>
                    <td style={{ ...td, fontWeight: 500, color: "#f1f5f9" }}><StatusDot status={eq.status} />{eq.name}</td>
                    <td style={td}><Badge text={eq.category} variant="neutral" /></td>
                    <td style={td}>{eq.location}</td>
                    <td style={{ ...td, ...mono, fontSize: 10 }}>{eq.model_number}</td>
                    <td style={{ ...td, ...mono }}>{eq.pm_frequency_days}d</td>
                    <td style={td}><Badge text={eq.status} variant="success" /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* PM Schedule */}
      {tab === "pm" && (
        <div>
          {pmDue.length > 0 && (
            <div style={{ ...card, borderLeft: "3px solid #ef4444" }}>
              <div style={cardHead}><span style={{ ...cardTitle, color: "#ef4444" }}>Due / Overdue</span></div>
              <div style={{ padding: 12 }}>
                {pmDue.map((pm: any, i: number) => (
                  <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid rgba(255,255,255,0.03)" }}>
                    <div><span style={{ fontWeight: 500, color: "#f1f5f9" }}>{pm.name}</span> <span style={{ color: "#64748b", fontSize: 11 }}>({pm.category})</span></div>
                    <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                      <span style={{ ...mono, fontSize: 11, color: "#ef4444" }}>{pm.days_until}d</span>
                      <Badge text={pm.status} variant={pm.status === "overdue" ? "danger" : "warning"} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          {pmUp.length > 0 && (
            <div style={card}>
              <div style={cardHead}><span style={cardTitle}>Upcoming</span></div>
              <div style={{ padding: 12 }}>
                {pmUp.map((pm: any, i: number) => (
                  <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: "1px solid rgba(255,255,255,0.03)" }}>
                    <div><span style={{ color: "#e2e8f0", fontSize: 12 }}>{pm.name}</span> <span style={{ color: "#64748b", fontSize: 10 }}>{pm.location}</span></div>
                    <span style={{ ...mono, fontSize: 11, color: "#64748b" }}>in {pm.days_until}d — {pm.next_pm}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Create Work Order */}
      {tab === "create" && (
        <div style={card}>
          <div style={cardHead}><span style={cardTitle}>Create Work Order</span></div>
          <div style={{ padding: 16 }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
              <div><label style={{ fontSize: 10, color: "#64748b", display: "block", marginBottom: 4 }}>Title</label><input value={woForm.title} onChange={e => setWoForm({ ...woForm, title: e.target.value })} placeholder="Walk-in cooler alarm" style={inputStyle} /></div>
              <div><label style={{ fontSize: 10, color: "#64748b", display: "block", marginBottom: 4 }}>Location</label><input value={woForm.location} onChange={e => setWoForm({ ...woForm, location: e.target.value })} placeholder="Main Kitchen" style={inputStyle} /></div>
              <div><label style={{ fontSize: 10, color: "#64748b", display: "block", marginBottom: 4 }}>Type</label>
                <select value={woForm.wo_type} onChange={e => setWoForm({ ...woForm, wo_type: e.target.value })} style={inputStyle}>
                  {["preventive", "corrective", "emergency", "guest_request", "inspection", "capital_project"].map(t => <option key={t} value={t}>{t}</option>)}
                </select></div>
              <div><label style={{ fontSize: 10, color: "#64748b", display: "block", marginBottom: 4 }}>Priority</label>
                <select value={woForm.priority} onChange={e => setWoForm({ ...woForm, priority: e.target.value })} style={inputStyle}>
                  {["low", "medium", "high", "critical"].map(p => <option key={p} value={p}>{p}</option>)}
                </select></div>
            </div>
            <div style={{ marginBottom: 12 }}>
              <label style={{ fontSize: 10, color: "#64748b", display: "block", marginBottom: 4 }}>Description</label>
              <textarea value={woForm.description} onChange={e => setWoForm({ ...woForm, description: e.target.value })} placeholder="Detailed description..." style={{ ...inputStyle, minHeight: 80, resize: "vertical" }} />
            </div>
            <button data-testid="create-wo-btn" onClick={createWO} style={{ padding: "8px 20px", borderRadius: 6, border: "1px solid rgba(200,169,126,0.3)", background: "rgba(200,169,126,0.08)", color: "#c8a97e", fontSize: 12, cursor: "pointer" }}>
              Submit Work Order
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
