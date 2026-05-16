import React, { useState, useEffect } from "react";

const BACKEND = window.location.origin;
function fmt(n: number) { if (!n && n !== 0) return "$0"; return "$" + Math.abs(n).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 }); }

function Badge({ text, variant }: { text: string; variant: string }) {
  const c: Record<string, string> = { success: "#10b981", warning: "#f59e0b", danger: "#ef4444", info: "#3b82f6", neutral: "#64748b" };
  const color = c[variant] || "#64748b";
  return <span style={{ padding: "2px 8px", borderRadius: 4, fontSize: 9, fontWeight: 600, background: `${color}15`, color, letterSpacing: "0.04em", textTransform: "uppercase" }}>{text}</span>;
}

function KPI({ label, value, sub, color }: { label: string; value: string | number; sub?: string; color?: string }) {
  return (
    <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 10, padding: "14px 16px" }}>
      <div style={{ fontSize: 9, letterSpacing: "0.1em", textTransform: "uppercase", color: "rgba(148,163,184,0.5)", marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 22, fontWeight: 600, color: color || "#e2e8f0", fontFamily: "'IBM Plex Mono', monospace" }}>{value}</div>
      {sub && <div style={{ fontSize: 10, color: "rgba(148,163,184,0.5)", marginTop: 2 }}>{sub}</div>}
    </div>
  );
}

/* ── CULINARY DASHBOARD ── */
function CulinaryDash({ data }: { data: any }) {
  const k = data.kpis || {};
  const card: React.CSSProperties = { background: "rgba(255,255,255,0.015)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 10, overflow: "hidden", marginBottom: 14 };
  const th: React.CSSProperties = { padding: "8px 12px", textAlign: "left", fontSize: 9, letterSpacing: "0.08em", textTransform: "uppercase", color: "rgba(148,163,184,0.4)", borderBottom: "1px solid rgba(255,255,255,0.04)" };
  const td: React.CSSProperties = { padding: "8px 12px", borderBottom: "1px solid rgba(255,255,255,0.02)", fontSize: 11, color: "#94a3b8" };
  const mono: React.CSSProperties = { fontFamily: "'IBM Plex Mono', monospace" };

  return (
    <div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10, marginBottom: 16 }}>
        <KPI label="Food Cost" value={`${k.food_cost_pct}%`} sub={fmt(k.food_cost)} color={k.food_cost_pct > 26 ? "#ef4444" : "#10b981"} />
        <KPI label="Waste" value={`${k.waste_pct}%`} sub={fmt(k.waste)} color={k.waste_pct > 1.5 ? "#ef4444" : "#10b981"} />
        <KPI label="Kitchen Labor" value={fmt(k.kitchen_labor)} sub={`${k.overtime_hours}hrs OT`} color="#f59e0b" />
        <KPI label="Menu Items" value={k.menu_items_active} color="#8b5cf6" />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
        <div style={card}>
          <div style={{ padding: "12px 16px", borderBottom: "1px solid rgba(255,255,255,0.04)" }}><span style={{ fontSize: 11, fontWeight: 600, color: "rgba(200,169,126,0.6)", letterSpacing: "0.06em", textTransform: "uppercase" }}>Menu Mix — Top Items</span></div>
          <div style={{ maxHeight: 300, overflow: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead><tr><th style={th}>Item</th><th style={{ ...th, textAlign: "right" }}>Qty</th><th style={{ ...th, textAlign: "right" }}>Revenue</th><th style={{ ...th, textAlign: "right" }}>FC%</th><th style={{ ...th, textAlign: "right" }}>Margin</th></tr></thead>
              <tbody>
                {(data.menu_mix || []).map((m: any, i: number) => (
                  <tr key={i}>
                    <td style={{ ...td, fontWeight: 500, color: "#f1f5f9" }}>{m.name}</td>
                    <td style={{ ...td, ...mono, textAlign: "right" }}>{m.qty}</td>
                    <td style={{ ...td, ...mono, textAlign: "right" }}>{fmt(m.revenue)}</td>
                    <td style={{ ...td, ...mono, textAlign: "right", color: m.fc_pct > 30 ? "#ef4444" : "#10b981" }}>{m.fc_pct}%</td>
                    <td style={{ ...td, ...mono, textAlign: "right", color: "#10b981" }}>{fmt(m.margin)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div>
          <div style={card}>
            <div style={{ padding: "12px 16px", borderBottom: "1px solid rgba(255,255,255,0.04)" }}><span style={{ fontSize: 11, fontWeight: 600, color: "rgba(200,169,126,0.6)", letterSpacing: "0.06em", textTransform: "uppercase" }}>Recent Deliveries</span></div>
            <div style={{ padding: 12 }}>
              {(data.recent_deliveries || []).map((d: any, i: number) => (
                <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: "1px solid rgba(255,255,255,0.03)" }}>
                  <span style={{ fontSize: 12, color: "#e2e8f0" }}>{d.vendor}</span>
                  <span style={{ ...mono, fontSize: 12, color: "#c8a97e" }}>{fmt(d.total)}</span>
                </div>
              ))}
            </div>
          </div>
          <div style={card}>
            <div style={{ padding: "12px 16px", borderBottom: "1px solid rgba(255,255,255,0.04)" }}><span style={{ fontSize: 11, fontWeight: 600, color: "rgba(200,169,126,0.6)", letterSpacing: "0.06em", textTransform: "uppercase" }}>Waste Breakdown</span></div>
            <div style={{ padding: 12 }}>
              {Object.entries(data.waste_breakdown || {}).map(([reason, cost]: [string, any], i) => (
                <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: "1px solid rgba(255,255,255,0.03)" }}>
                  <span style={{ fontSize: 12, color: "#e2e8f0", textTransform: "capitalize" }}>{reason.replace(/_/g, " ")}</span>
                  <span style={{ ...mono, fontSize: 12, color: "#ef4444" }}>{fmt(cost)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── PASTRY DASHBOARD ── */
function PastryDash({ data }: { data: any }) {
  const k = data.kpis || {};
  const card: React.CSSProperties = { background: "rgba(255,255,255,0.015)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 10, overflow: "hidden", marginBottom: 14 };
  return (
    <div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10, marginBottom: 16 }}>
        <KPI label="Outlets Served" value={k.outlets_served} color="#3b82f6" />
        <KPI label="Dessert Revenue" value={fmt(k.dessert_revenue)} color="#c8a97e" />
        <KPI label="Items Sold" value={k.dessert_items_sold} color="#8b5cf6" />
        <KPI label="Wedding Events" value={k.wedding_events} color="#f59e0b" />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
        <div style={card}>
          <div style={{ padding: "12px 16px", borderBottom: "1px solid rgba(255,255,255,0.04)" }}><span style={{ fontSize: 11, fontWeight: 600, color: "rgba(200,169,126,0.6)", letterSpacing: "0.06em", textTransform: "uppercase" }}>Commissary Production</span></div>
          <div style={{ padding: 12 }}>
            {(data.commissary_configs || []).map((c: any, i: number) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 0", borderBottom: "1px solid rgba(255,255,255,0.03)" }}>
                <span style={{ color: "#10b981", fontWeight: 500 }}>{c.producing}</span>
                <span style={{ color: "#c8a97e" }}>&rarr;</span>
                <span style={{ color: "#3b82f6", fontWeight: 500 }}>{c.receiving}</span>
                <span style={{ fontSize: 10, color: "#64748b", marginLeft: "auto" }}>{(c.products || []).join(", ")}</span>
              </div>
            ))}
          </div>
        </div>

        <div style={card}>
          <div style={{ padding: "12px 16px", borderBottom: "1px solid rgba(255,255,255,0.04)" }}><span style={{ fontSize: 11, fontWeight: 600, color: "rgba(200,169,126,0.6)", letterSpacing: "0.06em", textTransform: "uppercase" }}>Wedding Cake Pipeline</span></div>
          <div style={{ padding: 12 }}>
            {(data.wedding_pipeline || []).length === 0 ? (
              <div style={{ textAlign: "center", color: "#64748b", padding: 20, fontSize: 12 }}>No upcoming wedding events</div>
            ) : (data.wedding_pipeline || []).map((w: any, i: number) => (
              <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid rgba(255,255,255,0.03)" }}>
                <span style={{ color: "#f1f5f9", fontSize: 12 }}>{w.name}</span>
                <div style={{ display: "flex", gap: 10 }}>
                  <span style={{ fontSize: 11, color: "#64748b" }}>{w.date}</span>
                  <span style={{ fontSize: 11, color: "#c8a97e" }}>{w.guests} guests</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── F&B DIRECTOR DASHBOARD ── */
function FBDirectorDash({ data }: { data: any }) {
  const k = data.kpis || {};
  const card: React.CSSProperties = { background: "rgba(255,255,255,0.015)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 10, overflow: "hidden", marginBottom: 14 };
  const th: React.CSSProperties = { padding: "8px 12px", textAlign: "left", fontSize: 9, letterSpacing: "0.08em", textTransform: "uppercase", color: "rgba(148,163,184,0.4)", borderBottom: "1px solid rgba(255,255,255,0.04)" };
  const td: React.CSSProperties = { padding: "8px 12px", borderBottom: "1px solid rgba(255,255,255,0.02)", fontSize: 11, color: "#94a3b8" };
  const mono: React.CSSProperties = { fontFamily: "'IBM Plex Mono', monospace" };

  return (
    <div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: 10, marginBottom: 16 }}>
        <KPI label="Revenue" value={fmt(k.total_revenue)} color="#10b981" />
        <KPI label="EBITDA" value={fmt(k.ebitda)} sub={`${k.ebitda_margin_pct}%`} color="#c8a97e" />
        <KPI label="Food Rev" value={fmt(k.food_revenue)} color="#3b82f6" />
        <KPI label="Bev Rev" value={fmt(k.bev_revenue)} color="#8b5cf6" />
        <KPI label="Banquet Rev" value={fmt(k.banquet_revenue)} color="#f59e0b" />
        <KPI label="Covers" value={k.total_covers?.toLocaleString()} sub={`${fmt(k.avg_check)} avg`} color="#06b6d4" />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
        <div style={card}>
          <div style={{ padding: "12px 16px", borderBottom: "1px solid rgba(255,255,255,0.04)" }}><span style={{ fontSize: 11, fontWeight: 600, color: "rgba(200,169,126,0.6)", letterSpacing: "0.06em", textTransform: "uppercase" }}>Outlet Performance</span></div>
          <div style={{ maxHeight: 250, overflow: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead><tr><th style={th}>Outlet</th><th style={{ ...th, textAlign: "right" }}>Revenue</th><th style={{ ...th, textAlign: "right" }}>Covers</th><th style={{ ...th, textAlign: "right" }}>Avg Check</th><th style={{ ...th, textAlign: "right" }}>FC%</th></tr></thead>
              <tbody>
                {(data.outlet_summary || []).map((o: any, i: number) => (
                  <tr key={i}>
                    <td style={{ ...td, fontWeight: 500, color: "#f1f5f9" }}>{o.outlet_id}</td>
                    <td style={{ ...td, ...mono, textAlign: "right" }}>{fmt(o.revenue)}</td>
                    <td style={{ ...td, ...mono, textAlign: "right" }}>{o.covers}</td>
                    <td style={{ ...td, ...mono, textAlign: "right" }}>{fmt(o.avg_check)}</td>
                    <td style={{ ...td, ...mono, textAlign: "right", color: o.food_cost_pct > 26 ? "#ef4444" : "#10b981" }}>{o.food_cost_pct}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div style={card}>
          <div style={{ padding: "12px 16px", borderBottom: "1px solid rgba(255,255,255,0.04)" }}><span style={{ fontSize: 11, fontWeight: 600, color: "rgba(200,169,126,0.6)", letterSpacing: "0.06em", textTransform: "uppercase" }}>Top Beverages</span></div>
          <div style={{ maxHeight: 250, overflow: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead><tr><th style={th}>Item</th><th style={{ ...th, textAlign: "right" }}>Qty</th><th style={{ ...th, textAlign: "right" }}>Revenue</th><th style={{ ...th, textAlign: "right" }}>Margin</th></tr></thead>
              <tbody>
                {(data.beverage_program || []).map((b: any, i: number) => (
                  <tr key={i}>
                    <td style={{ ...td, fontWeight: 500, color: "#f1f5f9" }}>{b.name}</td>
                    <td style={{ ...td, ...mono, textAlign: "right" }}>{b.qty}</td>
                    <td style={{ ...td, ...mono, textAlign: "right" }}>{fmt(b.revenue)}</td>
                    <td style={{ ...td, ...mono, textAlign: "right", color: "#10b981" }}>{fmt(b.margin)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── EVENTS DASHBOARD ── */
function EventsDash({ data }: { data: any }) {
  const k = data.kpis || {};
  const card: React.CSSProperties = { background: "rgba(255,255,255,0.015)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 10, overflow: "hidden", marginBottom: 14 };

  return (
    <div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10, marginBottom: 16 }}>
        <KPI label="Total Events" value={k.total_events} color="#8b5cf6" />
        <KPI label="Revenue" value={fmt(k.total_revenue)} color="#10b981" />
        <KPI label="Total Guests" value={k.total_guests?.toLocaleString()} sub={`${k.avg_guest_count} avg`} color="#3b82f6" />
        <KPI label="On Calendar" value={k.calendar_events} color="#c8a97e" />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
        <div style={card}>
          <div style={{ padding: "12px 16px", borderBottom: "1px solid rgba(255,255,255,0.04)" }}><span style={{ fontSize: 11, fontWeight: 600, color: "rgba(200,169,126,0.6)", letterSpacing: "0.06em", textTransform: "uppercase" }}>BEO Pipeline</span></div>
          <div style={{ padding: 12 }}>
            {Object.entries(data.pipeline || {}).map(([stage, count]: [string, any], i) => (
              <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid rgba(255,255,255,0.03)" }}>
                <span style={{ color: "#e2e8f0", fontSize: 12, textTransform: "capitalize" }}>{stage.replace(/_/g, " ")}</span>
                <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 14, fontWeight: 600, color: "#c8a97e" }}>{count}</span>
              </div>
            ))}
          </div>
        </div>

        <div style={card}>
          <div style={{ padding: "12px 16px", borderBottom: "1px solid rgba(255,255,255,0.04)" }}><span style={{ fontSize: 11, fontWeight: 600, color: "rgba(200,169,126,0.6)", letterSpacing: "0.06em", textTransform: "uppercase" }}>Event Types</span></div>
          <div style={{ padding: 12 }}>
            {Object.entries(data.event_types || {}).map(([type, count]: [string, any], i) => (
              <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: "1px solid rgba(255,255,255,0.03)" }}>
                <span style={{ color: "#e2e8f0", fontSize: 12 }}>{type}</span>
                <Badge text={`${count}`} variant="info" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════
   MAIN PANEL — Routes based on selected department
   ═══════════════════════════════════════════════ */
export default function DeptDashboard() {
  const [dept, setDept] = useState("culinary");
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const DEPTS = [
    { id: "culinary", label: "Culinary", color: "#ef4444" },
    { id: "pastry", label: "Pastry", color: "#f59e0b" },
    { id: "fb-director", label: "F&B Director", color: "#3b82f6" },
    { id: "events", label: "Events", color: "#8b5cf6" },
  ];

  useEffect(() => {
    setLoading(true);
    fetch(`${BACKEND}/api/dept-dash/${dept}`)
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, [dept]);

  const TITLES: Record<string, string> = {
    culinary: "CULINARY OPERATIONS", pastry: "PASTRY & BAKERY",
    "fb-director": "F&B DIRECTOR COMMAND", events: "EVENTS & CATERING",
  };
  const SUBS: Record<string, string> = {
    culinary: "Menu Mix &bull; Food Cost Trending &bull; Waste &bull; Deliveries &bull; Labor",
    pastry: "Production Schedule &bull; Commissary Transfers &bull; Wedding Cakes &bull; Par Levels",
    "fb-director": "All-Outlet P&L &bull; Beverage Program &bull; Banquet Forecast &bull; Labor Overview",
    events: "BEO Pipeline &bull; Calendar &bull; Revenue Forecast &bull; Event Types",
  };

  return (
    <div style={{ fontFamily: "'IBM Plex Sans', -apple-system, sans-serif", padding: 24, color: "#e2e8f0" }} data-testid="dept-dashboard-panel">
      <div style={{ marginBottom: 16 }}>
        <h1 style={{ fontSize: 18, fontWeight: 300, letterSpacing: "0.12em", color: "#c8a97e", margin: 0 }}>{TITLES[dept] || "DEPARTMENT DASHBOARD"}</h1>
        <p style={{ fontSize: 11, color: "rgba(148,163,184,0.4)", marginTop: 2 }} dangerouslySetInnerHTML={{ __html: SUBS[dept] || "" }} />
      </div>

      <div style={{ display: "flex", gap: 3, marginBottom: 16, borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
        {DEPTS.map(d => (
          <button key={d.id} data-testid={`dept-tab-${d.id}`} onClick={() => setDept(d.id)}
            style={{ padding: "8px 18px", border: "none", cursor: "pointer", fontSize: 11, fontWeight: 500, borderRadius: "6px 6px 0 0",
              background: dept === d.id ? `${d.color}15` : "transparent", color: dept === d.id ? d.color : "#64748b",
              borderBottom: dept === d.id ? `2px solid ${d.color}` : "2px solid transparent" }}>
            {d.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div style={{ textAlign: "center", padding: 40, color: "#64748b" }}>Loading {dept} dashboard...</div>
      ) : data ? (
        <>
          {dept === "culinary" && <CulinaryDash data={data} />}
          {dept === "pastry" && <PastryDash data={data} />}
          {dept === "fb-director" && <FBDirectorDash data={data} />}
          {dept === "events" && <EventsDash data={data} />}
        </>
      ) : null}
    </div>
  );
}
