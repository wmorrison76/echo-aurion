/** iter247 · Unified Reports Hub — single source of truth for managers.
 *
 * Mirrors the most-asked Agilysys reports in one panel. Catalog of 12 reports;
 * each tile opens a viewer with KPIs / table / drill-downs. Built so a GM can
 * see EVERYTHING without bouncing between modules.
 */
import React from "react";

const API = (window as any).location.origin;
const C = {
  bg: "#04060d", surface: "rgba(255,255,255,0.025)", border: "rgba(255,255,255,0.08)",
  accent: "#d4af37", text: "#f5efe4", dim: "#94a3b8", muted: "#5a554d",
  green: "#10b981", red: "#ef4444", amber: "#f59e0b", blue: "#3b82f6",
};
const FONT: React.CSSProperties = { fontFamily: "'Inter', system-ui, sans-serif" };

const fmt$ = (n: number) => `$${(n || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
const fmt$$ = (n: number) => `$${(n || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const fmtN = (n: number) => (n || 0).toLocaleString();
const pct = (n: number) => `${(n || 0).toFixed(1)}%`;

type Report = { id: string; title: string; icon: string; endpoint: string;
                  audience: string[]; tag: string; summary: string };

export default function ReportsHubPanel() {
  const [catalog, setCatalog] = React.useState<Report[]>([]);
  const [active, setActive] = React.useState<Report | null>(null);
  const [filter, setFilter] = React.useState<string>("all");

  React.useEffect(() => {
    fetch(`${API}/api/reports-hub/catalog`).then(r => r.json())
      .then(d => setCatalog(d?.reports || [])).catch(() => undefined);
  }, []);

  const tags = ["all", ...Array.from(new Set(catalog.map(r => r.tag)))];
  const visible = catalog.filter(r => filter === "all" || r.tag === filter);

  return (
    <div data-testid="reports-hub-root" style={{
      ...FONT, display: "flex", height: "100%", background: C.bg, color: C.text,
    }}>
      <aside style={{
        width: 280, padding: "24px 18px", borderRight: `1px solid ${C.border}`,
        background: "linear-gradient(180deg, #0c1018 0%, #04060d 100%)",
        flexShrink: 0, overflowY: "auto",
      }}>
        <div style={{ fontSize: 9, letterSpacing: 4, color: C.accent, fontWeight: 700 }}>
          ONE SOURCE OF TRUTH
        </div>
        <h1 style={{ fontFamily: "'Playfair Display', Georgia, serif",
                       fontSize: 26, fontWeight: 200, margin: "8px 0 18px",
                       letterSpacing: -0.5, color: C.text }}>
          Reports Hub
        </h1>
        <div style={{ fontSize: 11, color: C.dim, marginBottom: 18, lineHeight: 1.6 }}>
          Every report a GM, Exec Chef, Dining Room Manager, or Sous Chef needs — in one place.
          Mirrors the Agilysys admin suite natively.
        </div>
        <div style={{ fontSize: 9, letterSpacing: 2, color: C.dim,
                        fontWeight: 700, marginBottom: 8 }}>FILTER BY TYPE</div>
        {tags.map(t => (
          <button key={t} data-testid={`reports-filter-${t}`}
            onClick={() => setFilter(t)} style={{
              display: "block", width: "100%", textAlign: "left",
              padding: "8px 10px", marginBottom: 3, borderRadius: 5,
              fontSize: 11, fontWeight: 600, fontFamily: "inherit",
              background: filter === t ? "rgba(212,175,55,0.14)" : "transparent",
              border: `1px solid ${filter === t ? `${C.accent}66` : "transparent"}`,
              color: filter === t ? C.accent : C.dim, cursor: "pointer",
              textTransform: "uppercase", letterSpacing: 1,
            }}>{t}</button>
        ))}
      </aside>

      <main style={{ flex: 1, overflowY: "auto", padding: 28 }}>
        {!active && (
          <>
            <div style={{ marginBottom: 24 }}>
              <div style={{ fontSize: 9, letterSpacing: 3, color: C.accent, fontWeight: 700 }}>
                CATALOG · {visible.length} REPORTS
              </div>
              <h2 style={{ fontFamily: "'Playfair Display', Georgia, serif",
                              fontSize: 32, fontWeight: 300, margin: "6px 0 0",
                              letterSpacing: -0.5 }}>
                Pick a report
              </h2>
            </div>
            <div style={{ display: "grid", gap: 14,
                            gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))" }}>
              {visible.map(r => (
                <button key={r.id} data-testid={`report-tile-${r.id}`}
                  onClick={() => setActive(r)} style={{
                    background: C.surface, border: `1px solid ${C.border}`,
                    padding: "18px 16px", borderRadius: 10, cursor: "pointer",
                    color: C.text, textAlign: "left", fontFamily: "inherit",
                    transition: "transform 120ms, border-color 120ms",
                  }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = `${C.accent}88`;
                                            e.currentTarget.style.transform = "translateY(-2px)"; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = C.border;
                                            e.currentTarget.style.transform = "translateY(0)"; }}>
                  <div style={{ fontSize: 24, marginBottom: 8 }}>{r.icon}</div>
                  <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 6 }}>{r.title}</div>
                  <div style={{ fontSize: 11, color: C.dim, lineHeight: 1.5, marginBottom: 8 }}>
                    {r.summary}
                  </div>
                  <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                    {r.audience.slice(0, 3).map(a => (
                      <span key={a} style={{
                        fontSize: 9, padding: "2px 6px", borderRadius: 999,
                        background: "rgba(255,255,255,0.04)", color: C.dim,
                        textTransform: "uppercase", letterSpacing: 1,
                      }}>{a}</span>
                    ))}
                  </div>
                </button>
              ))}
            </div>
          </>
        )}
        {active && <ReportViewer report={active} onClose={() => setActive(null)} />}
      </main>
    </div>
  );
}

/* ─── Report viewer ────────────────────────────────────────────────────── */
function ReportViewer({ report, onClose }: { report: Report; onClose: () => void }) {
  const [data, setData] = React.useState<any>(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    setLoading(true);
    fetch(`${API}${report.endpoint}`).then(r => r.json())
      .then(setData).finally(() => setLoading(false));
  }, [report.endpoint]);

  return (
    <div data-testid={`report-viewer-${report.id}`}>
      <button onClick={onClose} data-testid="report-back" style={{
        background: "transparent", border: `1px solid ${C.border}`,
        color: C.dim, padding: "6px 12px", borderRadius: 5, fontSize: 11,
        cursor: "pointer", marginBottom: 16, fontFamily: "inherit",
      }}>← Back to catalog</button>
      <div style={{ marginBottom: 22 }}>
        <div style={{ fontSize: 9, letterSpacing: 3, color: C.accent, fontWeight: 700 }}>
          {report.tag.toUpperCase()} · {report.icon}
        </div>
        <h2 style={{ fontFamily: "'Playfair Display', Georgia, serif",
                        fontSize: 30, fontWeight: 300, margin: "4px 0 4px",
                        letterSpacing: -0.5 }}>
          {report.title}
        </h2>
        <div style={{ fontSize: 12, color: C.dim }}>{report.summary}</div>
        {data?.demo && (
          <div style={{ marginTop: 8, fontSize: 10, color: C.amber,
                          padding: "4px 10px", display: "inline-block",
                          background: "rgba(245,158,11,0.1)",
                          border: `1px solid ${C.amber}55`, borderRadius: 999 }}>
            ⚠ DEMO data — wire real source to flip live
          </div>
        )}
      </div>
      {loading && <div style={{ padding: 60, textAlign: "center", color: C.dim }}>Loading…</div>}
      {!loading && data && <ReportRenderer report={report} data={data} />}
    </div>
  );
}

function ReportRenderer({ report, data }: { report: Report; data: any }) {
  // Snapshot
  if (report.id === "r12-gm-snapshot") {
    const k = data.kpis || {};
    return (
      <div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)",
                          gap: 12, marginBottom: 22 }}>
          <Kpi label="Net Sales" value={fmt$(k.net_sales)} accent={C.accent} />
          <Kpi label="Covers" value={fmtN(k.covers)} />
          <Kpi label="Avg Check" value={fmt$$(k.avg_check)} />
          <Kpi label="Labor %" value={pct(k.labor_pct)}
            accent={k.labor_pct > 32 ? C.red : k.labor_pct > 28 ? C.amber : C.green} />
          <Kpi label="Comps" value={fmt$(k.comps)} accent={C.amber} />
          <Kpi label="Voids" value={fmt$(k.void_amount)} accent={C.amber} />
          <Kpi label="Labor Cost" value={fmt$(k.labor_cost)} />
          <Kpi label="Active Staff" value={fmtN(k.active_employees)} />
        </div>
        <SectionTitle>TOP 3 OUTLETS · NET SALES</SectionTitle>
        {(data.outlets_top3 || []).map((o: any) => (
          <Row key={o.outlet_id} cols={[o.outlet_name, fmt$(o.net_sales),
              `${o.covers} covers`, `${fmt$$(o.avg_check)} avg`]} />
        ))}
        {(data.outlets_alert || []).length > 0 && (
          <>
            <SectionTitle accent={C.red}>🚨 LABOR ALERT</SectionTitle>
            {data.outlets_alert.map((o: any) => (
              <Row key={o.outlet_id} cols={[o.outlet_name, pct(o.labor_pct),
                  fmt$(o.labor_cost)]} status={C.red} />
            ))}
          </>
        )}
        <SectionTitle>TOP 5 ITEMS</SectionTitle>
        {(data.top_items || []).map((it: any) => (
          <Row key={it.name} cols={[it.name, `${it.qty} sold`,
              fmt$(it.revenue), pct(it.margin_pct)]} />
        ))}
      </div>
    );
  }
  // Sales by Profit Center / Tax / Labor / Covers — table form
  if (data.rows) {
    const cols = data.rows[0] ? Object.keys(data.rows[0]).filter(k => !k.endsWith("_id")) : [];
    return (
      <div>
        {data.totals && (
          <div style={{ display: "grid",
                            gridTemplateColumns: `repeat(${Object.keys(data.totals).length}, 1fr)`,
                            gap: 12, marginBottom: 22 }}>
            {Object.entries(data.totals).map(([k, v]: [string, any]) => (
              <Kpi key={k} label={k.replace(/_/g, " ")}
                value={typeof v === "number" && k.includes("sales")
                          ? fmt$(v) : typeof v === "number" ? fmtN(v) : String(v)}
                accent={C.accent} />
            ))}
          </div>
        )}
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              {cols.map(c => (
                <th key={c} style={{
                  textAlign: "left", padding: "10px 8px",
                  fontSize: 10, letterSpacing: 1, color: C.dim, fontWeight: 700,
                  textTransform: "uppercase",
                  borderBottom: `1px solid ${C.border}`,
                }}>{c.replace(/_/g, " ")}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.rows.map((r: any, i: number) => (
              <tr key={i} style={{ borderBottom: `1px solid ${C.border}` }}>
                {cols.map(c => {
                  const v = r[c];
                  const isMoney = typeof v === "number" &&
                                       (c.includes("sales") || c.includes("amount") ||
                                        c.includes("revenue") || c.includes("cost") ||
                                        c.includes("tip") || c.includes("comp"));
                  const isPct = typeof v === "number" && c.includes("pct");
                  return (
                    <td key={c} style={{ padding: "10px 8px", fontSize: 12 }}>
                      {isMoney ? fmt$(v) : isPct ? pct(v)
                                              : typeof v === "number" ? fmtN(v) : String(v ?? "—")}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }
  // Heatmap
  if (data.grid) {
    return (
      <div>
        <SectionTitle>HOURLY HEAT MAP · {data.date}</SectionTitle>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                <th style={{ padding: 8, fontSize: 10, color: C.dim, textAlign: "left" }}>Outlet</th>
                {(data.grid[0]?.hours || []).map((h: any) => (
                  <th key={h.hour} style={{ padding: 6, fontSize: 9, color: C.dim }}>{h.hour}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.grid.map((g: any) => (
                <tr key={g.outlet_id}>
                  <td style={{ padding: 6, fontSize: 11, fontWeight: 600 }}>{g.outlet_name}</td>
                  {g.hours.map((h: any) => {
                    const intensity = Math.min(h.sales / 1500, 1);
                    return (
                      <td key={h.hour} title={`${h.hour}: ${fmt$(h.sales)} · ${h.covers} covers`}
                        style={{
                          padding: 0, width: 28, height: 28,
                          background: `rgba(212,175,55,${intensity * 0.7})`,
                          textAlign: "center", fontSize: 9, color: intensity > 0.6 ? "#000" : C.dim,
                        }}>{h.sales > 100 ? Math.round(h.sales / 100) : ""}</td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }
  // Roster
  if (data.active) {
    return (
      <div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)",
                          gap: 12, marginBottom: 22 }}>
          <Kpi label="Active" value={fmtN(data.active_count)} accent={C.green} />
          <Kpi label="Inactive" value={fmtN(data.inactive_count)} accent={C.dim} />
        </div>
        <SectionTitle>BY JOB CODE</SectionTitle>
        {(data.by_job_code || []).map((j: any) => (
          <Row key={j.job_code} cols={[j.job_code, `${j.headcount} active`]} />
        ))}
      </div>
    );
  }
  // Terminal status
  if (data.online !== undefined) {
    return (
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
        <Kpi label="Online" value={fmtN(data.online)} accent={C.green} />
        <Kpi label="Offline" value={fmtN(data.offline)} accent={C.red} />
        <Kpi label="Total" value={fmtN(data.total)} />
      </div>
    );
  }
  return <pre style={{ color: C.dim, fontSize: 10 }}>{JSON.stringify(data, null, 2)}</pre>;
}

/* ─── primitives ───────────────────────────────────────────────────────── */
function Kpi({ label, value, accent }: { label: string; value: string; accent?: string }) {
  return (
    <div style={{
      padding: 14, borderRadius: 8, background: C.surface,
      border: `1px solid ${C.border}`,
    }}>
      <div style={{ fontSize: 22, fontWeight: 600, color: accent || C.text, marginBottom: 4 }}>{value}</div>
      <div style={{ fontSize: 9, letterSpacing: 1, color: C.dim,
                      textTransform: "uppercase" }}>{label}</div>
    </div>
  );
}
function SectionTitle({ children, accent }: { children: React.ReactNode; accent?: string }) {
  return (
    <div style={{ fontSize: 9, letterSpacing: 3, fontWeight: 700,
                    color: accent || C.accent, margin: "20px 0 10px" }}>{children}</div>
  );
}
function Row({ cols, status }: { cols: any[]; status?: string }) {
  return (
    <div style={{
      display: "grid", gridTemplateColumns: `repeat(${cols.length}, 1fr)`, gap: 12,
      padding: "10px 12px", marginBottom: 4, borderRadius: 6,
      background: C.surface, border: `1px solid ${status ? `${status}55` : C.border}`,
      fontSize: 12,
    }}>
      {cols.map((c, i) => <div key={i} style={{ color: i === 0 ? C.text : C.dim }}>{c}</div>)}
    </div>
  );
}
