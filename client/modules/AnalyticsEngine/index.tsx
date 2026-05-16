import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  BarChart, Bar, LineChart, Line, AreaChart, Area, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
  ScatterChart, Scatter, RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
} from "recharts";

const API = window.location.origin;

/* ═══════════════════════════ UTILITIES ═══════════════════════════ */
const fmt = (n: number) => {
  if (n == null) return "$0";
  if (Math.abs(n) >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (Math.abs(n) >= 1_000) return `$${(n / 1_000).toFixed(1)}K`;
  return `$${n.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
};
const pct = (n: number) => `${(n || 0).toFixed(1)}%`;
const mins = (n: number) => `${(n || 0).toFixed(0)}m`;

const C = {
  bg: "#0b0f1a", card: "#111827", cardBorder: "#1e293b",
  accent: "#c8a97e", accentDim: "rgba(200,169,126,0.15)",
  green: "#10b981", red: "#ef4444", amber: "#f59e0b",
  blue: "#3b82f6", purple: "#8b5cf6", cyan: "#06b6d4",
  text: "#e2e8f0", textDim: "#64748b", textMuted: "#475569",
  chartGrid: "#1e293b",
};
const PAL = ["#c8a97e", "#3b82f6", "#10b981", "#f59e0b", "#8b5cf6", "#06b6d4", "#ef4444", "#ec4899"];

/* ═══════════════════════════ REPORT IDS ═══════════════════════════ */
type ReportId = "home" | "sales-by-hour" | "sales-by-item" | "sales-vs-labor" | "menu-engineering" | "prime-cost" | "server-performance" | "daily-comparison" | "sales-trend" | "heatmap" | "daypart" | "category-mix" | "speed-of-service" | "guest-analytics" | "outlet-comparison" | "waste-variance" | "forecast";

interface ReportCategory { id: string; label: string; icon: string; reports: { id: ReportId; label: string }[]; }

const REPORT_NAV: ReportCategory[] = [
  { id: "overview", label: "Overview", icon: "M3 13h8V3H3v10zm0 8h8v-6H3v6zm10 0h8V11h-8v10zm0-18v6h8V3h-8z", reports: [{ id: "home", label: "Dashboard Home" }] },
  { id: "sales", label: "Sales", icon: "M16 6l2.29 2.29-4.88 4.88-4-4L2 16.59 3.41 18l6-6 4 4 6.3-6.29L22 12V6z", reports: [{ id: "home", label: "Daily Sales" }, { id: "sales-by-hour", label: "Sales by Hour" }, { id: "sales-by-item", label: "Sales by Item" }, { id: "heatmap", label: "Revenue Heatmap" }, { id: "daypart", label: "Daypart Analysis" }, { id: "category-mix", label: "Category Mix" }] },
  { id: "labor", label: "Labor", icon: "M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5z", reports: [{ id: "sales-vs-labor", label: "Sales vs. Labor" }, { id: "speed-of-service", label: "Speed of Service" }] },
  { id: "profit", label: "Profit", icon: "M11.8 10.9c-2.27-.59-3-1.2-3-2.15 0-1.09 1.01-1.85 2.7-1.85 1.78 0 2.44.85 2.5 2.1h2.21c-.07-1.72-1.12-3.3-3.21-3.81V3h-3v2.16c-1.94.42-3.5 1.68-3.5 3.61 0 2.31 1.91 3.46 4.7 4.13 2.5.6 3 1.48 3 2.41 0 .69-.49 1.79-2.7 1.79-2.06 0-2.87-.92-2.98-2.1h-2.2c.12 2.19 1.76 3.42 3.68 3.83V21h3v-2.15c1.95-.37 3.5-1.5 3.5-3.55 0-2.84-2.43-3.81-4.7-4.4z", reports: [{ id: "menu-engineering", label: "Menu Engineering" }, { id: "prime-cost", label: "Prime Cost" }, { id: "waste-variance", label: "Waste & Variance" }] },
  { id: "guests", label: "Guests", icon: "M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z", reports: [{ id: "guest-analytics", label: "Guest Insights" }, { id: "server-performance", label: "Server Performance" }] },
  { id: "comparisons", label: "Comparisons", icon: "M9.01 14H2v2h7.01v3L13 15l-3.99-4v3zm5.98-1v-3H22V8h-7.01V5L11 9l3.99 4z", reports: [{ id: "daily-comparison", label: "Weekly Comparison" }, { id: "outlet-comparison", label: "Outlet Scorecard" }] },
  { id: "trends", label: "Trends & Forecast", icon: "M3.5 18.49l6-6.01 4 4L22 6.92l-1.41-1.41-7.09 7.97-4-4L2 16.99z", reports: [{ id: "sales-trend", label: "Sales Trends" }, { id: "forecast", label: "AI Revenue Forecast" }] },
];

/* ═══════════════════════════ SHARED COMPONENTS ═══════════════════════════ */
function SvgIcon({ path, size = 18, color = C.textDim }: { path: string; size?: number; color?: string }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill={color}><path d={path} /></svg>;
}

function KpiCard({ label, value, subValue, change, sparkData }: { label: string; value: string; subValue?: string; change?: number; sparkData?: number[] }) {
  return (
    <div data-testid={`kpi-${label.toLowerCase().replace(/\s/g, "-")}`} style={{ background: C.card, border: `1px solid ${C.cardBorder}`, borderRadius: 10, padding: "14px 18px", flex: "1 1 180px", minWidth: 170, position: "relative", overflow: "hidden" }}>
      <div style={{ fontSize: 10, color: C.textDim, textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 600, marginBottom: 6 }}>{label}</div>
      <div style={{ fontSize: 24, fontWeight: 700, color: C.text, fontFamily: "'IBM Plex Mono', monospace", lineHeight: 1.1 }}>{value}</div>
      {subValue && <div style={{ fontSize: 11, color: C.textMuted, marginTop: 3 }}>{subValue}</div>}
      {change !== undefined && (
        <div style={{ display: "flex", alignItems: "center", gap: 4, marginTop: 5 }}>
          <span style={{ fontSize: 11, fontWeight: 600, color: change >= 0 ? C.green : C.red }}>{change >= 0 ? "+" : ""}{change.toFixed(1)}%</span>
          <span style={{ fontSize: 10, color: C.textDim }}>vs prior</span>
        </div>
      )}
      {sparkData && sparkData.length > 0 && (
        <div style={{ position: "absolute", bottom: 0, right: 0, width: 80, height: 30, opacity: 0.3 }}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={sparkData.map((v, i) => ({ v, i }))}>
              <Area type="monotone" dataKey="v" stroke={C.accent} fill={C.accentDim} strokeWidth={1.5} dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}

function DataTable({ columns, rows, maxHeight = 400 }: { columns: { key: string; label: string; align?: string; format?: (v: any) => string }[]; rows: any[]; maxHeight?: number }) {
  return (
    <div style={{ overflowY: "auto", maxHeight, borderRadius: 8, border: `1px solid ${C.cardBorder}` }} data-testid="analytics-data-table">
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
        <thead>
          <tr style={{ background: "rgba(200,169,126,0.06)", position: "sticky", top: 0, zIndex: 2 }}>
            {columns.map(c => (
              <th key={c.key} style={{ padding: "10px 12px", textAlign: (c.align as any) || "left", color: C.accent, fontWeight: 600, fontSize: 10, textTransform: "uppercase", letterSpacing: "0.06em", borderBottom: `1px solid ${C.cardBorder}`, background: C.card }}>{c.label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} style={{ background: i % 2 === 0 ? "transparent" : "rgba(255,255,255,0.015)" }} onMouseEnter={e => (e.currentTarget.style.background = "rgba(200,169,126,0.05)")} onMouseLeave={e => (e.currentTarget.style.background = i % 2 === 0 ? "transparent" : "rgba(255,255,255,0.015)")}>
              {columns.map(c => (
                <td key={c.key} style={{ padding: "8px 12px", borderBottom: `1px solid ${C.cardBorder}40`, color: C.text, textAlign: (c.align as any) || "left" }}>{c.format ? c.format(r[c.key]) : r[c.key]}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ChartCard({ title, children, height = 280, action }: { title: string; children: React.ReactNode; height?: number; action?: React.ReactNode }) {
  return (
    <div style={{ background: C.card, border: `1px solid ${C.cardBorder}`, borderRadius: 10, padding: "16px 20px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: C.accent, textTransform: "uppercase", letterSpacing: "0.04em" }}>{title}</div>
        {action}
      </div>
      <div style={{ height }}>{children}</div>
    </div>
  );
}

function SectionHeader({ title }: { title: string }) {
  return <div style={{ fontSize: 14, fontWeight: 700, color: C.text, marginBottom: 12, display: "flex", alignItems: "center", gap: 8 }}><div style={{ width: 3, height: 18, background: C.accent, borderRadius: 2 }} />{title}</div>;
}

function LoadingPulse() {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: 200, gap: 8 }}>
      {[0, 1, 2].map(i => (<div key={i} style={{ width: 8, height: 8, borderRadius: "50%", background: C.accent, animation: `pulse 1.2s ease-in-out ${i * 0.2}s infinite` }} />))}
      <style>{`@keyframes pulse { 0%,80%,100% { opacity:.3; transform:scale(.8) } 40% { opacity:1; transform:scale(1.2) } }`}</style>
    </div>
  );
}

function ExportButton({ data, filename }: { data: any; filename: string }) {
  const exportCSV = () => {
    if (!data || !Array.isArray(data) || data.length === 0) return;
    const keys = Object.keys(data[0]);
    const csv = [keys.join(","), ...data.map((r: any) => keys.map(k => JSON.stringify(r[k] ?? "")).join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = `${filename}.csv`; a.click();
    URL.revokeObjectURL(url);
  };
  return <button onClick={exportCSV} data-testid="export-csv-btn" style={{ padding: "4px 12px", borderRadius: 6, border: `1px solid ${C.cardBorder}`, background: "transparent", color: C.textDim, fontSize: 10, cursor: "pointer", fontWeight: 600 }}>Export CSV</button>;
}

/* ═══════════════════════════ DATE RANGE PICKER ═══════════════════════════ */
function DateRangePicker({ onRangeChange }: { onRangeChange: (preset: string) => void }) {
  const [active, setActive] = useState("mtd");
  const presets = [{ id: "today", label: "Today" }, { id: "7d", label: "7d" }, { id: "14d", label: "14d" }, { id: "30d", label: "30d" }, { id: "mtd", label: "MTD" }, { id: "ytd", label: "YTD" }];
  return (
    <div style={{ display: "flex", gap: 4, marginBottom: 16 }} data-testid="date-range-picker">
      {presets.map(p => (
        <button key={p.id} onClick={() => { setActive(p.id); onRangeChange(p.id); }} data-testid={`range-${p.id}`} style={{ padding: "5px 12px", borderRadius: 6, border: `1px solid ${active === p.id ? C.accent : C.cardBorder}`, background: active === p.id ? C.accentDim : "transparent", color: active === p.id ? C.accent : C.textDim, fontSize: 11, fontWeight: 600, cursor: "pointer", transition: "all 0.2s" }}>{p.label}</button>
      ))}
    </div>
  );
}

/* ═══════════════════════════ REPORT VIEWS ═══════════════════════════ */

function HomeReport() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => { fetch(`${API}/api/analytics/home`).then(r => r.json()).then(d => { setData(d); setLoading(false); }).catch(() => setLoading(false)); }, []);
  if (loading) return <LoadingPulse />;
  if (!data || data.error) return <div style={{ color: C.textDim, padding: 40, textAlign: "center" }}>No sales data available. Run the POS simulation first.</div>;
  const k = data.kpis;
  const sparkWeek = (data.sales_this_week || []).map((d: any) => d.revenue);
  return (
    <div data-testid="analytics-home">
      <SectionHeader title="Today's Performance" />
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 24 }}>
        <KpiCard label="Today Revenue" value={fmt(k.today_revenue)} change={k.sdlw.change_pct} sparkData={sparkWeek} />
        <KpiCard label="Covers" value={String(k.today_covers)} sparkData={sparkWeek.map((_: any, i: number) => (data.sales_this_week || [])[i]?.covers || 0)} />
        <KpiCard label="Avg Check" value={fmt(k.today_avg_check)} />
        <KpiCard label="Week-to-Date" value={fmt(k.week_to_date.revenue)} change={k.week_to_date.change_pct} />
        <KpiCard label="Month-to-Date" value={fmt(k.month_to_date.revenue)} />
        <KpiCard label="Labor %" value={pct(k.labor_pct)} subValue={k.labor_pct <= 30 ? "On target" : "Above target"} />
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 24 }}>
        <ChartCard title="Sales This Week">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data.sales_this_week}><CartesianGrid strokeDasharray="3 3" stroke={C.chartGrid} /><XAxis dataKey="day" tick={{ fill: C.textDim, fontSize: 11 }} axisLine={false} /><YAxis tick={{ fill: C.textDim, fontSize: 10 }} axisLine={false} tickFormatter={v => fmt(v)} /><Tooltip contentStyle={{ background: C.card, border: `1px solid ${C.cardBorder}`, borderRadius: 8, fontSize: 12, color: C.text }} formatter={(v: any) => [fmt(v), "Revenue"]} /><Bar dataKey="revenue" fill={C.accent} radius={[4, 4, 0, 0]} /></BarChart>
          </ResponsiveContainer>
        </ChartCard>
        <ChartCard title="Covers This Week">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data.sales_this_week}><CartesianGrid strokeDasharray="3 3" stroke={C.chartGrid} /><XAxis dataKey="day" tick={{ fill: C.textDim, fontSize: 11 }} axisLine={false} /><YAxis tick={{ fill: C.textDim, fontSize: 10 }} axisLine={false} /><Tooltip contentStyle={{ background: C.card, border: `1px solid ${C.cardBorder}`, borderRadius: 8, fontSize: 12, color: C.text }} /><Area type="monotone" dataKey="covers" stroke={C.blue} fill="rgba(59,130,246,0.15)" strokeWidth={2} /></AreaChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>
      <SectionHeader title="Sales by Revenue Center" />
      <DataTable columns={[{ key: "outlet", label: "Outlet" }, { key: "gross", label: "Gross Sales", align: "right", format: v => fmt(v) }, { key: "covers", label: "Covers", align: "right" }, { key: "avg_check", label: "Avg Check", align: "right", format: v => fmt(v) }]} rows={data.sales_by_outlet || []} />
    </div>
  );
}

function SalesByHourReport() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => { fetch(`${API}/api/analytics/sales-by-hour`).then(r => r.json()).then(d => { setData(d); setLoading(false); }).catch(() => setLoading(false)); }, []);
  if (loading) return <LoadingPulse />;
  if (!data) return null;
  return (
    <div data-testid="analytics-sales-by-hour">
      <SectionHeader title="Sales by Hour" />
      {data.peak_hour?.label && (<div style={{ marginBottom: 16, padding: "10px 16px", background: C.accentDim, borderRadius: 8, display: "inline-flex", alignItems: "center", gap: 8 }}><span style={{ fontSize: 11, color: C.textDim }}>Peak Hour:</span><span style={{ fontSize: 13, fontWeight: 700, color: C.accent }}>{data.peak_hour.label}</span><span style={{ fontSize: 11, color: C.textDim }}>({fmt(data.peak_hour.revenue)} / {data.peak_hour.covers} covers)</span></div>)}
      <ChartCard title="Hourly Revenue Distribution" height={340} action={<ExportButton data={data.hourly} filename="sales-by-hour" />}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data.hourly}><CartesianGrid strokeDasharray="3 3" stroke={C.chartGrid} /><XAxis dataKey="label" tick={{ fill: C.textDim, fontSize: 10 }} axisLine={false} /><YAxis tick={{ fill: C.textDim, fontSize: 10 }} axisLine={false} tickFormatter={v => fmt(v)} /><Tooltip contentStyle={{ background: C.card, border: `1px solid ${C.cardBorder}`, borderRadius: 8, fontSize: 12, color: C.text }} formatter={(v: any, name: string) => [name === "revenue" ? fmt(v) : v, name === "revenue" ? "Revenue" : "Covers"]} /><Bar dataKey="revenue" fill={C.accent} radius={[3, 3, 0, 0]} /><Bar dataKey="covers" fill={C.blue} radius={[3, 3, 0, 0]} /></BarChart>
        </ResponsiveContainer>
      </ChartCard>
    </div>
  );
}

function SalesByItemReport() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => { fetch(`${API}/api/analytics/sales-by-item?limit=25`).then(r => r.json()).then(d => { setData(d); setLoading(false); }).catch(() => setLoading(false)); }, []);
  if (loading) return <LoadingPulse />;
  if (!data) return null;
  return (
    <div data-testid="analytics-sales-by-item">
      <SectionHeader title={`Sales by Item (${data.total_items} items)`} />
      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 16, marginBottom: 20 }}>
        <ChartCard title="Top 10 Items by Revenue" height={300}>
          <ResponsiveContainer width="100%" height="100%"><BarChart data={(data.items || []).slice(0, 10)} layout="vertical"><CartesianGrid strokeDasharray="3 3" stroke={C.chartGrid} /><XAxis type="number" tick={{ fill: C.textDim, fontSize: 10 }} tickFormatter={v => fmt(v)} axisLine={false} /><YAxis dataKey="name" type="category" tick={{ fill: C.textDim, fontSize: 10 }} width={120} axisLine={false} /><Tooltip contentStyle={{ background: C.card, border: `1px solid ${C.cardBorder}`, borderRadius: 8, fontSize: 12, color: C.text }} formatter={(v: any) => [fmt(v), "Revenue"]} /><Bar dataKey="revenue" fill={C.accent} radius={[0, 4, 4, 0]} /></BarChart></ResponsiveContainer>
        </ChartCard>
        <ChartCard title="Food Cost Distribution" height={300}>
          <ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={(data.items || []).slice(0, 6)} dataKey="food_cost" nameKey="name" cx="50%" cy="50%" outerRadius={90} innerRadius={50} strokeWidth={0}>{(data.items || []).slice(0, 6).map((_: any, i: number) => <Cell key={i} fill={PAL[i % PAL.length]} />)}</Pie><Tooltip contentStyle={{ background: C.card, border: `1px solid ${C.cardBorder}`, borderRadius: 8, fontSize: 12, color: C.text }} formatter={(v: any) => [fmt(v), "Food Cost"]} /></PieChart></ResponsiveContainer>
        </ChartCard>
      </div>
      <DataTable columns={[{ key: "name", label: "Item" }, { key: "category", label: "Category" }, { key: "qty", label: "Qty", align: "right" }, { key: "revenue", label: "Revenue", align: "right", format: v => fmt(v) }, { key: "food_cost", label: "Food Cost", align: "right", format: v => fmt(v) }, { key: "margin", label: "Margin", align: "right", format: v => fmt(v) }, { key: "fc_pct", label: "FC%", align: "right", format: v => pct(v) }]} rows={data.items || []} />
    </div>
  );
}

function HeatmapReport() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => { fetch(`${API}/api/analytics/heatmap`).then(r => r.json()).then(d => { setData(d); setLoading(false); }).catch(() => setLoading(false)); }, []);
  if (loading) return <LoadingPulse />;
  if (!data) return null;
  const heatColor = (intensity: number) => {
    if (intensity < 0.15) return "rgba(200,169,126,0.05)";
    if (intensity < 0.3) return "rgba(200,169,126,0.15)";
    if (intensity < 0.5) return "rgba(200,169,126,0.3)";
    if (intensity < 0.7) return "rgba(200,169,126,0.5)";
    if (intensity < 0.85) return "rgba(200,169,126,0.7)";
    return "rgba(200,169,126,0.9)";
  };
  const hours = data.hours || [];
  const days = data.days || [];
  const cellMap: Record<string, any> = {};
  (data.cells || []).forEach((c: any) => { cellMap[`${c.day_idx}-${c.hour}`] = c; });
  return (
    <div data-testid="analytics-heatmap">
      <SectionHeader title="Revenue Heatmap (Day x Hour)" />
      <div style={{ background: C.card, border: `1px solid ${C.cardBorder}`, borderRadius: 10, padding: 20, overflowX: "auto" }}>
        <div style={{ display: "grid", gridTemplateColumns: `60px repeat(${hours.length}, 1fr)`, gap: 2, minWidth: 700 }}>
          <div />
          {hours.map((h: number) => (<div key={h} style={{ textAlign: "center", fontSize: 9, color: C.textDim, padding: "4px 0" }}>{h}:00</div>))}
          {days.map((day: string, di: number) => (
            <React.Fragment key={day}>
              <div style={{ fontSize: 11, color: C.text, fontWeight: 600, display: "flex", alignItems: "center", paddingRight: 8 }}>{day}</div>
              {hours.map((h: number) => {
                const cell = cellMap[`${di}-${h}`] || {};
                return (
                  <div key={h} title={`${day} ${h}:00 — ${fmt(cell.revenue || 0)} / ${cell.covers || 0} covers`} style={{ background: heatColor(cell.intensity || 0), borderRadius: 3, height: 32, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 8, color: (cell.intensity || 0) > 0.5 ? "#0b0f1a" : C.textDim, fontWeight: 600, cursor: "default", transition: "all 0.15s" }}>
                    {(cell.intensity || 0) > 0.2 ? fmt(cell.revenue || 0) : ""}
                  </div>
                );
              })}
            </React.Fragment>
          ))}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 14, justifyContent: "center" }}>
          <span style={{ fontSize: 9, color: C.textDim }}>Low</span>
          {[0.05, 0.15, 0.3, 0.5, 0.7, 0.9].map((v, i) => (<div key={i} style={{ width: 24, height: 10, borderRadius: 2, background: `rgba(200,169,126,${v})` }} />))}
          <span style={{ fontSize: 9, color: C.textDim }}>High ({fmt(data.max_revenue)})</span>
        </div>
      </div>
    </div>
  );
}

function DaypartReport() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => { fetch(`${API}/api/analytics/daypart`).then(r => r.json()).then(d => { setData(d); setLoading(false); }).catch(() => setLoading(false)); }, []);
  if (loading) return <LoadingPulse />;
  if (!data) return null;
  return (
    <div data-testid="analytics-daypart">
      <SectionHeader title="Daypart Analysis" />
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 20 }}>
        {(data.dayparts || []).map((dp: any, i: number) => (
          <div key={dp.daypart} style={{ background: C.card, border: `1px solid ${C.cardBorder}`, borderRadius: 10, padding: 16, borderTop: `3px solid ${PAL[i]}` }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: C.text, marginBottom: 8 }}>{dp.daypart}</div>
            <div style={{ fontSize: 9, color: C.textDim, marginBottom: 10 }}>{dp.hours}</div>
            <div style={{ fontSize: 22, fontWeight: 700, color: PAL[i], fontFamily: "'IBM Plex Mono', monospace" }}>{fmt(dp.revenue)}</div>
            <div style={{ fontSize: 10, color: C.textDim, marginTop: 4 }}>{dp.revenue_pct}% of total</div>
            <div style={{ marginTop: 10, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
              <div><div style={{ fontSize: 9, color: C.textDim }}>Covers</div><div style={{ fontSize: 13, fontWeight: 600, color: C.text }}>{dp.covers}</div></div>
              <div><div style={{ fontSize: 9, color: C.textDim }}>Avg Check</div><div style={{ fontSize: 13, fontWeight: 600, color: C.text }}>{fmt(dp.avg_check)}</div></div>
              <div><div style={{ fontSize: 9, color: C.textDim }}>Txns</div><div style={{ fontSize: 13, fontWeight: 600, color: C.text }}>{dp.transactions}</div></div>
              <div><div style={{ fontSize: 9, color: C.textDim }}>Tips</div><div style={{ fontSize: 13, fontWeight: 600, color: C.text }}>{fmt(dp.tips)}</div></div>
            </div>
          </div>
        ))}
      </div>
      <ChartCard title="Revenue by Daypart" height={260}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data.dayparts}><CartesianGrid strokeDasharray="3 3" stroke={C.chartGrid} /><XAxis dataKey="daypart" tick={{ fill: C.textDim, fontSize: 11 }} axisLine={false} /><YAxis tick={{ fill: C.textDim, fontSize: 10 }} axisLine={false} tickFormatter={v => fmt(v)} /><Tooltip contentStyle={{ background: C.card, border: `1px solid ${C.cardBorder}`, borderRadius: 8, fontSize: 12, color: C.text }} formatter={(v: any) => [fmt(v)]} /><Bar dataKey="revenue" radius={[4, 4, 0, 0]}>{(data.dayparts || []).map((_: any, i: number) => <Cell key={i} fill={PAL[i]} />)}</Bar></BarChart>
        </ResponsiveContainer>
      </ChartCard>
    </div>
  );
}

function CategoryMixReport() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => { fetch(`${API}/api/analytics/category-mix`).then(r => r.json()).then(d => { setData(d); setLoading(false); }).catch(() => setLoading(false)); }, []);
  if (loading) return <LoadingPulse />;
  if (!data) return null;
  return (
    <div data-testid="analytics-category-mix">
      <SectionHeader title="Category Mix Analysis" />
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 20 }}>
        <ChartCard title="Revenue Mix" height={280}>
          <ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={data.categories || []} dataKey="revenue" nameKey="category" cx="50%" cy="50%" outerRadius={100} innerRadius={55} strokeWidth={0} label={({ category, mix_pct }: any) => `${category} ${mix_pct}%`}>{(data.categories || []).map((_: any, i: number) => <Cell key={i} fill={PAL[i % PAL.length]} />)}</Pie><Tooltip contentStyle={{ background: C.card, border: `1px solid ${C.cardBorder}`, borderRadius: 8, fontSize: 12, color: C.text }} formatter={(v: any) => [fmt(v)]} /></PieChart></ResponsiveContainer>
        </ChartCard>
        <ChartCard title="Category Trends (14d)" height={280}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data.trend || []}>
              <CartesianGrid strokeDasharray="3 3" stroke={C.chartGrid} /><XAxis dataKey="date" tick={{ fill: C.textDim, fontSize: 9 }} axisLine={false} tickFormatter={v => v?.slice(5)} /><YAxis tick={{ fill: C.textDim, fontSize: 10 }} axisLine={false} tickFormatter={v => fmt(v)} /><Tooltip contentStyle={{ background: C.card, border: `1px solid ${C.cardBorder}`, borderRadius: 8, fontSize: 11, color: C.text }} formatter={(v: any) => [fmt(v)]} />
              {(data.categories || []).slice(0, 5).map((cat: any, i: number) => (<Area key={cat.category} type="monotone" dataKey={cat.category} stackId="1" stroke={PAL[i]} fill={PAL[i]} fillOpacity={0.3} strokeWidth={1.5} />))}
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>
      <DataTable columns={[{ key: "category", label: "Category" }, { key: "revenue", label: "Revenue", align: "right", format: v => fmt(v) }, { key: "mix_pct", label: "Mix %", align: "right", format: v => pct(v) }, { key: "qty", label: "Qty", align: "right" }, { key: "food_cost", label: "Food Cost", align: "right", format: v => fmt(v) }, { key: "margin", label: "Margin", align: "right", format: v => fmt(v) }, { key: "fc_pct", label: "FC%", align: "right", format: v => pct(v) }]} rows={data.categories || []} />
    </div>
  );
}

function SalesVsLaborReport() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => { fetch(`${API}/api/analytics/sales-vs-labor`).then(r => r.json()).then(d => { setData(d); setLoading(false); }).catch(() => setLoading(false)); }, []);
  if (loading) return <LoadingPulse />;
  if (!data) return null;
  return (
    <div data-testid="analytics-sales-vs-labor">
      <SectionHeader title="Sales vs. Labor (14-Day)" />
      <ChartCard title="Daily Sales vs Labor Cost" height={340} action={<ExportButton data={data.data} filename="sales-vs-labor" />}>
        <ResponsiveContainer width="100%" height="100%"><BarChart data={data.data}><CartesianGrid strokeDasharray="3 3" stroke={C.chartGrid} /><XAxis dataKey="day" tick={{ fill: C.textDim, fontSize: 11 }} axisLine={false} /><YAxis tick={{ fill: C.textDim, fontSize: 10 }} axisLine={false} tickFormatter={v => fmt(v)} /><Tooltip contentStyle={{ background: C.card, border: `1px solid ${C.cardBorder}`, borderRadius: 8, fontSize: 12, color: C.text }} formatter={(v: any, name: string) => [fmt(v), name === "sales" ? "Sales" : "Labor"]} /><Legend wrapperStyle={{ fontSize: 11, color: C.textDim }} /><Bar dataKey="sales" fill={C.accent} radius={[3, 3, 0, 0]} name="Sales" /><Bar dataKey="labor" fill={C.blue} radius={[3, 3, 0, 0]} name="Labor" /></BarChart></ResponsiveContainer>
      </ChartCard>
      <div style={{ marginTop: 16 }}><DataTable columns={[{ key: "date", label: "Date" }, { key: "day", label: "Day" }, { key: "sales", label: "Sales", align: "right", format: v => fmt(v) }, { key: "labor", label: "Labor", align: "right", format: v => fmt(v) }, { key: "labor_pct", label: "Labor %", align: "right", format: v => pct(v) }]} rows={data.data || []} /></div>
    </div>
  );
}

function SpeedOfServiceReport() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => { fetch(`${API}/api/analytics/speed-of-service`).then(r => r.json()).then(d => { setData(d); setLoading(false); }).catch(() => setLoading(false)); }, []);
  if (loading) return <LoadingPulse />;
  if (!data) return null;
  return (
    <div data-testid="analytics-speed-of-service">
      <SectionHeader title="Speed of Service" />
      <div style={{ display: "flex", gap: 12, marginBottom: 20 }}>
        <KpiCard label="Overall Avg" value={`${data.overall_avg_mins} min`} />
        <KpiCard label="Total Tickets" value={String(data.total_tickets)} />
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
        <ChartCard title="Avg Ticket Time by Hour" height={280}>
          <ResponsiveContainer width="100%" height="100%"><BarChart data={data.by_hour}><CartesianGrid strokeDasharray="3 3" stroke={C.chartGrid} /><XAxis dataKey="label" tick={{ fill: C.textDim, fontSize: 10 }} axisLine={false} /><YAxis tick={{ fill: C.textDim, fontSize: 10 }} axisLine={false} /><Tooltip contentStyle={{ background: C.card, border: `1px solid ${C.cardBorder}`, borderRadius: 8, fontSize: 12, color: C.text }} formatter={(v: any) => [`${v} min`]} /><Bar dataKey="avg_mins" fill={C.cyan} radius={[3, 3, 0, 0]} /></BarChart></ResponsiveContainer>
        </ChartCard>
        <ChartCard title="Avg Ticket Time by Day" height={280}>
          <ResponsiveContainer width="100%" height="100%"><BarChart data={data.by_day}><CartesianGrid strokeDasharray="3 3" stroke={C.chartGrid} /><XAxis dataKey="day" tick={{ fill: C.textDim, fontSize: 11 }} axisLine={false} /><YAxis tick={{ fill: C.textDim, fontSize: 10 }} axisLine={false} /><Tooltip contentStyle={{ background: C.card, border: `1px solid ${C.cardBorder}`, borderRadius: 8, fontSize: 12, color: C.text }} formatter={(v: any) => [`${v} min`]} /><Bar dataKey="avg_mins" fill={C.purple} radius={[3, 3, 0, 0]} /></BarChart></ResponsiveContainer>
        </ChartCard>
      </div>
      <DataTable columns={[{ key: "outlet", label: "Outlet" }, { key: "avg_mins", label: "Avg Time (min)", align: "right" }, { key: "tickets", label: "Tickets", align: "right" }]} rows={data.by_outlet || []} />
    </div>
  );
}

function MenuEngineeringReport() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => { fetch(`${API}/api/analytics/menu-engineering`).then(r => r.json()).then(d => { setData(d); setLoading(false); }).catch(() => setLoading(false)); }, []);
  if (loading) return <LoadingPulse />;
  if (!data || !data.items) return null;
  const classColors: Record<string, string> = { star: C.accent, plowhorse: C.blue, puzzle: C.purple, dog: C.red };
  const classLabels: Record<string, string> = { star: "Star", plowhorse: "Plowhorse", puzzle: "Puzzle", dog: "Dog" };
  // Scatter data for quadrant chart
  const scatterData = (data.items || []).map((item: any) => ({ name: item.name, x: item.qty, y: item.margin_pct, classification: item.classification, revenue: item.revenue }));
  return (
    <div data-testid="analytics-menu-engineering">
      <SectionHeader title="Menu Engineering Matrix" />
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 20 }}>
        {Object.entries(data.summary || {}).map(([cls, count]) => (
          <div key={cls} style={{ background: C.card, border: `1px solid ${C.cardBorder}`, borderRadius: 8, padding: "12px 20px", display: "flex", alignItems: "center", gap: 10, borderLeft: `3px solid ${classColors[cls]}` }}>
            <div style={{ fontSize: 22, fontWeight: 700, color: classColors[cls], fontFamily: "'IBM Plex Mono', monospace" }}>{count as number}</div>
            <div><div style={{ fontSize: 12, fontWeight: 600, color: C.text }}>{classLabels[cls]}</div><div style={{ fontSize: 9, color: C.textDim }}>{cls === "star" ? "High pop + High margin" : cls === "plowhorse" ? "High pop + Low margin" : cls === "puzzle" ? "Low pop + High margin" : "Low pop + Low margin"}</div></div>
          </div>
        ))}
      </div>
      <ChartCard title="Menu Engineering Quadrant (Popularity vs Margin %)" height={320}>
        <ResponsiveContainer width="100%" height="100%">
          <ScatterChart>
            <CartesianGrid strokeDasharray="3 3" stroke={C.chartGrid} />
            <XAxis type="number" dataKey="x" name="Qty Sold" tick={{ fill: C.textDim, fontSize: 10 }} axisLine={false} label={{ value: "Popularity (Qty Sold)", position: "bottom", fill: C.textDim, fontSize: 10 }} />
            <YAxis type="number" dataKey="y" name="Margin %" tick={{ fill: C.textDim, fontSize: 10 }} axisLine={false} label={{ value: "Margin %", angle: -90, position: "insideLeft", fill: C.textDim, fontSize: 10 }} />
            <Tooltip contentStyle={{ background: C.card, border: `1px solid ${C.cardBorder}`, borderRadius: 8, fontSize: 11, color: C.text }} formatter={(v: any, name: string) => [name === "Margin %" ? `${v}%` : v, name]} labelFormatter={(_, payload) => payload?.[0]?.payload?.name || ""} />
            {["star", "plowhorse", "puzzle", "dog"].map(cls => (<Scatter key={cls} name={classLabels[cls]} data={scatterData.filter((d: any) => d.classification === cls)} fill={classColors[cls]} />))}
          </ScatterChart>
        </ResponsiveContainer>
      </ChartCard>
      <div style={{ marginTop: 16 }}><DataTable columns={[{ key: "name", label: "Item" }, { key: "category", label: "Category" }, { key: "classification", label: "Class", format: v => classLabels[v] || v }, { key: "qty", label: "Qty Sold", align: "right" }, { key: "revenue", label: "Revenue", align: "right", format: v => fmt(v) }, { key: "margin", label: "Margin", align: "right", format: v => fmt(v) }, { key: "margin_pct", label: "Margin %", align: "right", format: v => pct(v) }, { key: "fc_pct", label: "FC%", align: "right", format: v => pct(v) }]} rows={data.items || []} /></div>
    </div>
  );
}

function PrimeCostReport() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => { fetch(`${API}/api/analytics/prime-cost`).then(r => r.json()).then(d => { setData(d); setLoading(false); }).catch(() => setLoading(false)); }, []);
  if (loading) return <LoadingPulse />;
  if (!data) return null;
  const statusColor = data.status === "on_target" ? C.green : C.red;
  // Waterfall chart data
  const waterfall = [
    { name: "Revenue", value: data.revenue, fill: C.accent },
    { name: "Food COGS", value: -data.cogs.food, fill: C.red },
    { name: "Bev COGS", value: -data.cogs.beverage, fill: C.amber },
    { name: "Hourly Labor", value: -data.labor.hourly, fill: C.blue },
    { name: "Mgmt Labor", value: -data.labor.management, fill: C.purple },
    { name: "Benefits", value: -data.labor.benefits, fill: C.cyan },
    { name: "Gross Profit", value: data.revenue - data.prime_cost, fill: C.green },
  ];
  return (
    <div data-testid="analytics-prime-cost">
      <SectionHeader title="Prime Cost Analysis" />
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 24 }}>
        <KpiCard label="Total Revenue" value={fmt(data.revenue)} />
        <KpiCard label="Prime Cost" value={fmt(data.prime_cost)} subValue={`${pct(data.prime_cost_pct)} of revenue`} />
        <KpiCard label="Gross Profit" value={fmt(data.revenue - data.prime_cost)} subValue={`${pct(100 - data.prime_cost_pct)} margin`} />
        <KpiCard label="Target" value="65.0%" subValue={data.status === "on_target" ? "On target" : "Over target"} />
      </div>
      <ChartCard title="Revenue Waterfall (Revenue to Profit)" height={320}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={waterfall}><CartesianGrid strokeDasharray="3 3" stroke={C.chartGrid} /><XAxis dataKey="name" tick={{ fill: C.textDim, fontSize: 10 }} axisLine={false} /><YAxis tick={{ fill: C.textDim, fontSize: 10 }} axisLine={false} tickFormatter={v => fmt(Math.abs(v))} /><Tooltip contentStyle={{ background: C.card, border: `1px solid ${C.cardBorder}`, borderRadius: 8, fontSize: 12, color: C.text }} formatter={(v: any) => [fmt(Math.abs(v))]} /><Bar dataKey="value" radius={[3, 3, 0, 0]}>{waterfall.map((e, i) => <Cell key={i} fill={e.fill} />)}</Bar></BarChart>
        </ResponsiveContainer>
      </ChartCard>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginTop: 16, marginBottom: 16 }}>
        <div style={{ background: C.card, border: `1px solid ${C.cardBorder}`, borderRadius: 10, padding: 20 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: C.accent, marginBottom: 16, textTransform: "uppercase", letterSpacing: "0.04em" }}>Cost of Goods Sold</div>
          {[{ label: "Food COGS", value: data.cogs.food }, { label: "Beverage COGS", value: data.cogs.beverage }].map(item => (
            <div key={item.label} style={{ marginBottom: 14 }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}><span style={{ fontSize: 11, color: C.textDim }}>{item.label}</span><span style={{ fontSize: 13, fontWeight: 600, color: C.text, fontFamily: "'IBM Plex Mono', monospace" }}>{fmt(item.value)}</span></div>
              <div style={{ height: 6, background: "rgba(255,255,255,0.04)", borderRadius: 3 }}><div style={{ height: "100%", width: `${Math.min((item.value / (data.revenue * 0.4)) * 100, 100)}%`, background: `linear-gradient(90deg, ${C.amber}80, ${C.amber})`, borderRadius: 3, transition: "width 0.6s" }} /></div>
            </div>
          ))}
          <div style={{ borderTop: `1px solid ${C.cardBorder}`, paddingTop: 10, display: "flex", justifyContent: "space-between" }}><span style={{ fontSize: 11, fontWeight: 600, color: C.textDim }}>Total COGS</span><span style={{ fontSize: 14, fontWeight: 700, color: C.amber, fontFamily: "'IBM Plex Mono', monospace" }}>{fmt(data.cogs.total)} ({pct(data.cogs.pct)})</span></div>
        </div>
        <div style={{ background: C.card, border: `1px solid ${C.cardBorder}`, borderRadius: 10, padding: 20 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: C.accent, marginBottom: 16, textTransform: "uppercase", letterSpacing: "0.04em" }}>Labor Costs</div>
          {[{ label: "Hourly Labor", value: data.labor.hourly }, { label: "Management", value: data.labor.management }, { label: "Benefits", value: data.labor.benefits }].map(item => (
            <div key={item.label} style={{ marginBottom: 14 }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}><span style={{ fontSize: 11, color: C.textDim }}>{item.label}</span><span style={{ fontSize: 13, fontWeight: 600, color: C.text, fontFamily: "'IBM Plex Mono', monospace" }}>{fmt(item.value)}</span></div>
              <div style={{ height: 6, background: "rgba(255,255,255,0.04)", borderRadius: 3 }}><div style={{ height: "100%", width: `${Math.min((item.value / (data.revenue * 0.35)) * 100, 100)}%`, background: `linear-gradient(90deg, ${C.blue}80, ${C.blue})`, borderRadius: 3, transition: "width 0.6s" }} /></div>
            </div>
          ))}
          <div style={{ borderTop: `1px solid ${C.cardBorder}`, paddingTop: 10, display: "flex", justifyContent: "space-between" }}><span style={{ fontSize: 11, fontWeight: 600, color: C.textDim }}>Total Labor</span><span style={{ fontSize: 14, fontWeight: 700, color: C.blue, fontFamily: "'IBM Plex Mono', monospace" }}>{fmt(data.labor.total)} ({pct(data.labor.pct)})</span></div>
        </div>
      </div>
      <div style={{ background: C.card, border: `2px solid ${statusColor}30`, borderRadius: 10, padding: "16px 24px", display: "flex", alignItems: "center", justifyContent: "space-between" }}><div style={{ display: "flex", alignItems: "center", gap: 12 }}><div style={{ width: 12, height: 12, borderRadius: "50%", background: statusColor, boxShadow: `0 0 10px ${statusColor}40` }} /><span style={{ fontSize: 14, fontWeight: 600, color: C.text }}>Prime Cost</span></div><span style={{ fontSize: 24, fontWeight: 700, color: statusColor, fontFamily: "'IBM Plex Mono', monospace" }}>{pct(data.prime_cost_pct)}</span></div>
    </div>
  );
}

function WasteVarianceReport() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => { fetch(`${API}/api/analytics/waste-variance`).then(r => r.json()).then(d => { setData(d); setLoading(false); }).catch(() => setLoading(false)); }, []);
  if (loading) return <LoadingPulse />;
  if (!data) return null;
  const varianceColor = data.variance_pct > 5 ? C.red : data.variance_pct > 2 ? C.amber : C.green;
  return (
    <div data-testid="analytics-waste-variance">
      <SectionHeader title="Waste & Variance Analysis" />
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 20 }}>
        <KpiCard label="Theoretical Cost" value={fmt(data.theoretical_cost)} />
        <KpiCard label="Actual COGS" value={fmt(data.actual_cogs)} />
        <KpiCard label="Variance" value={fmt(data.variance)} subValue={`${data.variance_pct}% over theoretical`} />
        <KpiCard label="Total Waste" value={fmt(data.total_waste)} />
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
        <ChartCard title="Theoretical vs Actual by Category" height={280}>
          <ResponsiveContainer width="100%" height="100%"><BarChart data={data.by_category}><CartesianGrid strokeDasharray="3 3" stroke={C.chartGrid} /><XAxis dataKey="category" tick={{ fill: C.textDim, fontSize: 10 }} axisLine={false} /><YAxis tick={{ fill: C.textDim, fontSize: 10 }} axisLine={false} tickFormatter={v => fmt(v)} /><Tooltip contentStyle={{ background: C.card, border: `1px solid ${C.cardBorder}`, borderRadius: 8, fontSize: 12, color: C.text }} formatter={(v: any) => [fmt(v)]} /><Bar dataKey="theoretical" fill={C.accent} name="Theoretical" radius={[3, 3, 0, 0]} /><Bar dataKey="revenue" fill={C.blue} name="Revenue" radius={[3, 3, 0, 0]} /></BarChart></ResponsiveContainer>
        </ChartCard>
        {data.waste_breakdown && data.waste_breakdown.length > 0 ? (
          <ChartCard title="Waste by Reason" height={280}>
            <ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={data.waste_breakdown} dataKey="cost" nameKey="reason" cx="50%" cy="50%" outerRadius={90} innerRadius={50} strokeWidth={0}>{data.waste_breakdown.map((_: any, i: number) => <Cell key={i} fill={PAL[i % PAL.length]} />)}</Pie><Tooltip contentStyle={{ background: C.card, border: `1px solid ${C.cardBorder}`, borderRadius: 8, fontSize: 12, color: C.text }} formatter={(v: any) => [fmt(v)]} /></PieChart></ResponsiveContainer>
          </ChartCard>
        ) : (
          <div style={{ background: C.card, border: `1px solid ${C.cardBorder}`, borderRadius: 10, padding: 20, display: "flex", alignItems: "center", justifyContent: "center", color: C.textDim, fontSize: 12 }}>No waste data logged yet</div>
        )}
      </div>
      <div style={{ background: C.card, border: `2px solid ${varianceColor}30`, borderRadius: 10, padding: "16px 24px", display: "flex", alignItems: "center", justifyContent: "space-between" }}><div style={{ display: "flex", alignItems: "center", gap: 12 }}><div style={{ width: 12, height: 12, borderRadius: "50%", background: varianceColor, boxShadow: `0 0 10px ${varianceColor}40` }} /><span style={{ fontSize: 14, fontWeight: 600, color: C.text }}>Food Cost Variance</span></div><span style={{ fontSize: 24, fontWeight: 700, color: varianceColor, fontFamily: "'IBM Plex Mono', monospace" }}>{data.variance_pct}%</span></div>
    </div>
  );
}

function GuestAnalyticsReport() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => { fetch(`${API}/api/analytics/guest-analytics`).then(r => r.json()).then(d => { setData(d); setLoading(false); }).catch(() => setLoading(false)); }, []);
  if (loading) return <LoadingPulse />;
  if (!data) return null;
  return (
    <div data-testid="analytics-guest-analytics">
      <SectionHeader title="Guest Insights" />
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 20 }}>
        <KpiCard label="Total Covers" value={String(data.total_covers)} sparkData={(data.covers_trend || []).map((d: any) => d.covers)} />
        <KpiCard label="Avg Daily Covers" value={String(data.avg_daily_covers)} />
        <KpiCard label="Days Tracked" value={String(data.total_days)} />
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
        <ChartCard title="Party Size Distribution" height={260}>
          <ResponsiveContainer width="100%" height="100%"><BarChart data={data.party_size_distribution}><CartesianGrid strokeDasharray="3 3" stroke={C.chartGrid} /><XAxis dataKey="size" tick={{ fill: C.textDim, fontSize: 11 }} axisLine={false} /><YAxis tick={{ fill: C.textDim, fontSize: 10 }} axisLine={false} /><Tooltip contentStyle={{ background: C.card, border: `1px solid ${C.cardBorder}`, borderRadius: 8, fontSize: 12, color: C.text }} /><Bar dataKey="count" fill={C.accent} radius={[4, 4, 0, 0]}>{(data.party_size_distribution || []).map((_: any, i: number) => <Cell key={i} fill={PAL[i % PAL.length]} />)}</Bar></BarChart></ResponsiveContainer>
        </ChartCard>
        <ChartCard title="Covers Trend (14d)" height={260}>
          <ResponsiveContainer width="100%" height="100%"><AreaChart data={data.covers_trend}><CartesianGrid strokeDasharray="3 3" stroke={C.chartGrid} /><XAxis dataKey="date" tick={{ fill: C.textDim, fontSize: 9 }} axisLine={false} tickFormatter={v => v?.slice(5)} /><YAxis tick={{ fill: C.textDim, fontSize: 10 }} axisLine={false} /><Tooltip contentStyle={{ background: C.card, border: `1px solid ${C.cardBorder}`, borderRadius: 8, fontSize: 12, color: C.text }} /><Area type="monotone" dataKey="covers" stroke={C.blue} fill="rgba(59,130,246,0.2)" strokeWidth={2} /></AreaChart></ResponsiveContainer>
        </ChartCard>
      </div>
      <SectionHeader title="Covers by Server" />
      <DataTable columns={[{ key: "server", label: "Server" }, { key: "covers", label: "Covers", align: "right" }, { key: "txns", label: "Tables", align: "right" }, { key: "covers_per_txn", label: "Covers/Table", align: "right" }, { key: "revenue_per_cover", label: "Rev/Cover", align: "right", format: v => fmt(v) }]} rows={data.server_covers || []} />
    </div>
  );
}

function ServerPerformanceReport() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => { fetch(`${API}/api/analytics/server-performance`).then(r => r.json()).then(d => { setData(d); setLoading(false); }).catch(() => setLoading(false)); }, []);
  if (loading) return <LoadingPulse />;
  if (!data) return null;
  return (
    <div data-testid="analytics-server-performance">
      <SectionHeader title={`Server Performance (${data.total_servers} staff)`} />
      <ChartCard title="Revenue by Server" height={300} action={<ExportButton data={data.servers} filename="server-performance" />}>
        <ResponsiveContainer width="100%" height="100%"><BarChart data={(data.servers || []).slice(0, 12)}><CartesianGrid strokeDasharray="3 3" stroke={C.chartGrid} /><XAxis dataKey="server" tick={{ fill: C.textDim, fontSize: 9 }} axisLine={false} angle={-30} textAnchor="end" height={60} /><YAxis tick={{ fill: C.textDim, fontSize: 10 }} axisLine={false} tickFormatter={v => fmt(v)} /><Tooltip contentStyle={{ background: C.card, border: `1px solid ${C.cardBorder}`, borderRadius: 8, fontSize: 12, color: C.text }} formatter={(v: any, name: string) => [fmt(v), name === "revenue" ? "Revenue" : "Tips"]} /><Bar dataKey="revenue" fill={C.accent} radius={[3, 3, 0, 0]} /><Bar dataKey="tips" fill={C.green} radius={[3, 3, 0, 0]} /></BarChart></ResponsiveContainer>
      </ChartCard>
      <div style={{ marginTop: 16 }}><DataTable columns={[{ key: "server", label: "Server" }, { key: "revenue", label: "Revenue", align: "right", format: v => fmt(v) }, { key: "covers", label: "Covers", align: "right" }, { key: "transactions", label: "Txns", align: "right" }, { key: "avg_check", label: "Avg Check", align: "right", format: v => fmt(v) }, { key: "tips", label: "Tips", align: "right", format: v => fmt(v) }, { key: "tip_pct", label: "Tip %", align: "right", format: v => pct(v) }]} rows={data.servers || []} /></div>
    </div>
  );
}

function DailyComparisonReport() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => { fetch(`${API}/api/analytics/daily-comparison`).then(r => r.json()).then(d => { setData(d); setLoading(false); }).catch(() => setLoading(false)); }, []);
  if (loading) return <LoadingPulse />;
  if (!data || !data.comparison?.length) return <div style={{ color: C.textDim, padding: 40, textAlign: "center" }}>Need at least 7 days of POS data for comparison.</div>;
  const chartData = data.comparison.map((c: any) => ({ day: c.day, "This Week": c.this_week.revenue, "Last Week": c.last_week.revenue }));
  return (
    <div data-testid="analytics-daily-comparison">
      <SectionHeader title="This Week vs. Last Week" />
      <ChartCard title="Revenue Comparison" height={320}>
        <ResponsiveContainer width="100%" height="100%"><BarChart data={chartData}><CartesianGrid strokeDasharray="3 3" stroke={C.chartGrid} /><XAxis dataKey="day" tick={{ fill: C.textDim, fontSize: 11 }} axisLine={false} /><YAxis tick={{ fill: C.textDim, fontSize: 10 }} axisLine={false} tickFormatter={v => fmt(v)} /><Tooltip contentStyle={{ background: C.card, border: `1px solid ${C.cardBorder}`, borderRadius: 8, fontSize: 12, color: C.text }} formatter={(v: any) => [fmt(v)]} /><Legend wrapperStyle={{ fontSize: 11 }} /><Bar dataKey="This Week" fill={C.accent} radius={[3, 3, 0, 0]} /><Bar dataKey="Last Week" fill={C.textMuted} radius={[3, 3, 0, 0]} /></BarChart></ResponsiveContainer>
      </ChartCard>
      <div style={{ marginTop: 16 }}><DataTable columns={[{ key: "day", label: "Day" }, { key: "this_week", label: "This Week", align: "right", format: (v: any) => fmt(v?.revenue ?? 0) }, { key: "last_week", label: "Last Week", align: "right", format: (v: any) => fmt(v?.revenue ?? 0) }, { key: "revenue_change", label: "Change", align: "right", format: v => fmt(v) }, { key: "change_pct", label: "Change %", align: "right", format: v => `${v >= 0 ? "+" : ""}${pct(v)}` }]} rows={data.comparison || []} /></div>
    </div>
  );
}

function OutletComparisonReport() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => { fetch(`${API}/api/analytics/outlet-comparison`).then(r => r.json()).then(d => { setData(d); setLoading(false); }).catch(() => setLoading(false)); }, []);
  if (loading) return <LoadingPulse />;
  if (!data || !data.outlets?.length) return null;
  // Normalize for radar chart (0-100 scale)
  const maxRevenue = Math.max(...data.outlets.map((o: any) => o.revenue));
  const maxCheck = Math.max(...data.outlets.map((o: any) => o.avg_check));
  const maxCovers = Math.max(...data.outlets.map((o: any) => o.covers_per_day));
  const radarData = [
    { metric: "Revenue", ...Object.fromEntries(data.outlets.map((o: any) => [o.outlet, Math.round((o.revenue / maxRevenue) * 100)])) },
    { metric: "Avg Check", ...Object.fromEntries(data.outlets.map((o: any) => [o.outlet, Math.round((o.avg_check / maxCheck) * 100)])) },
    { metric: "Covers/Day", ...Object.fromEntries(data.outlets.map((o: any) => [o.outlet, Math.round((o.covers_per_day / maxCovers) * 100)])) },
    { metric: "Tip %", ...Object.fromEntries(data.outlets.map((o: any) => [o.outlet, Math.round(o.tip_pct * 5)])) },
    { metric: "Items/Cover", ...Object.fromEntries(data.outlets.map((o: any) => [o.outlet, Math.round(o.items_per_cover * 25)])) },
    { metric: "FC% (inv)", ...Object.fromEntries(data.outlets.map((o: any) => [o.outlet, Math.round(Math.max(0, 100 - o.fc_pct * 2))])) },
  ];
  return (
    <div data-testid="analytics-outlet-comparison">
      <SectionHeader title="Outlet Comparison Scorecard" />
      <ChartCard title="Multi-Metric Radar" height={340}>
        <ResponsiveContainer width="100%" height="100%">
          <RadarChart data={radarData}>
            <PolarGrid stroke={C.chartGrid} />
            <PolarAngleAxis dataKey="metric" tick={{ fill: C.textDim, fontSize: 10 }} />
            <PolarRadiusAxis tick={false} domain={[0, 100]} axisLine={false} />
            {data.outlets.map((o: any, i: number) => (<Radar key={o.outlet} name={o.outlet} dataKey={o.outlet} stroke={PAL[i]} fill={PAL[i]} fillOpacity={0.15} strokeWidth={2} />))}
            <Legend wrapperStyle={{ fontSize: 11 }} />
            <Tooltip contentStyle={{ background: C.card, border: `1px solid ${C.cardBorder}`, borderRadius: 8, fontSize: 11, color: C.text }} />
          </RadarChart>
        </ResponsiveContainer>
      </ChartCard>
      <div style={{ marginTop: 16 }}><DataTable columns={[{ key: "outlet", label: "Outlet" }, { key: "revenue", label: "Revenue", align: "right", format: v => fmt(v) }, { key: "avg_check", label: "Avg Check", align: "right", format: v => fmt(v) }, { key: "fc_pct", label: "FC%", align: "right", format: v => pct(v) }, { key: "tip_pct", label: "Tip %", align: "right", format: v => pct(v) }, { key: "covers_per_day", label: "Covers/Day", align: "right" }, { key: "items_per_cover", label: "Items/Cover", align: "right" }]} rows={data.outlets || []} /></div>
    </div>
  );
}

function SalesTrendReport() {
  const [data, setData] = useState<any>(null);
  const [groupBy, setGroupBy] = useState<"outlet" | "category" | "item">("outlet");
  const [loading, setLoading] = useState(true);
  const load = useCallback((gb: string) => { setLoading(true); fetch(`${API}/api/analytics/sales-trend?group_by=${gb}&days=14`).then(r => r.json()).then(d => { setData(d); setLoading(false); }).catch(() => setLoading(false)); }, []);
  useEffect(() => { load(groupBy); }, [groupBy, load]);
  if (loading) return <LoadingPulse />;
  if (!data) return null;
  const trendEntries = Object.entries(data.trends || {}).slice(0, 6);
  const chartData = (data.dates || []).map((d: string) => { const row: any = { date: d.slice(5) }; trendEntries.forEach(([name, vals]: [string, any]) => { const found = vals.find((v: any) => v.date === d); row[name] = found?.revenue || 0; }); return row; });
  return (
    <div data-testid="analytics-sales-trend">
      <SectionHeader title="Sales Trends" />
      <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
        {(["outlet", "category", "item"] as const).map(g => (<button key={g} data-testid={`trend-group-${g}`} onClick={() => setGroupBy(g)} style={{ padding: "6px 16px", borderRadius: 6, border: `1px solid ${groupBy === g ? C.accent : C.cardBorder}`, background: groupBy === g ? C.accentDim : "transparent", color: groupBy === g ? C.accent : C.textDim, fontSize: 11, fontWeight: 600, cursor: "pointer", textTransform: "capitalize", transition: "all 0.2s" }}>{g}</button>))}
      </div>
      <ChartCard title={`Trend by ${groupBy}`} height={360}>
        <ResponsiveContainer width="100%" height="100%"><LineChart data={chartData}><CartesianGrid strokeDasharray="3 3" stroke={C.chartGrid} /><XAxis dataKey="date" tick={{ fill: C.textDim, fontSize: 10 }} axisLine={false} /><YAxis tick={{ fill: C.textDim, fontSize: 10 }} axisLine={false} tickFormatter={v => fmt(v)} /><Tooltip contentStyle={{ background: C.card, border: `1px solid ${C.cardBorder}`, borderRadius: 8, fontSize: 11, color: C.text }} formatter={(v: any) => [fmt(v)]} /><Legend wrapperStyle={{ fontSize: 10 }} />{trendEntries.map(([name], i) => (<Line key={name} type="monotone" dataKey={name} stroke={PAL[i % PAL.length]} strokeWidth={2} dot={false} />))}</LineChart></ResponsiveContainer>
      </ChartCard>
    </div>
  );
}

function ForecastReport() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => { fetch(`${API}/api/analytics/forecast`).then(r => r.json()).then(d => { setData(d); setLoading(false); }).catch(() => setLoading(false)); }, []);
  if (loading) return <LoadingPulse />;
  if (!data) return null;
  const combined = [...(data.actual || []).map((d: any) => ({ ...d, type: "actual" })), ...(data.forecast || []).map((d: any) => ({ date: d.date, revenue: d.predicted, predicted: d.predicted, confidence_low: d.confidence_low, confidence_high: d.confidence_high, type: "forecast" }))];
  const chartData = combined.map(d => ({ date: d.date?.slice(5), actual: d.type === "actual" ? d.revenue : undefined, forecast: d.type === "forecast" ? d.predicted : undefined, low: d.confidence_low, high: d.confidence_high }));
  return (
    <div data-testid="analytics-forecast">
      <SectionHeader title="AI Revenue Forecast (7-Day)" />
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 20 }}>
        <KpiCard label="Method" value="SMA7+Trend" subValue="Seasonal day-of-week adjusted" />
        <KpiCard label="7-Day MA" value={fmt(data.ma7)} />
        <KpiCard label="Daily Trend" value={fmt(data.daily_trend)} subValue={data.daily_trend >= 0 ? "Upward" : "Downward"} />
      </div>
      <ChartCard title="Actual vs Forecast with Confidence Band" height={360}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke={C.chartGrid} />
            <XAxis dataKey="date" tick={{ fill: C.textDim, fontSize: 10 }} axisLine={false} />
            <YAxis tick={{ fill: C.textDim, fontSize: 10 }} axisLine={false} tickFormatter={v => fmt(v)} />
            <Tooltip contentStyle={{ background: C.card, border: `1px solid ${C.cardBorder}`, borderRadius: 8, fontSize: 11, color: C.text }} formatter={(v: any, name: string) => [v != null ? fmt(v) : "—", name]} />
            <Area type="monotone" dataKey="high" stroke="none" fill="rgba(200,169,126,0.08)" />
            <Area type="monotone" dataKey="low" stroke="none" fill={C.bg} />
            <Line type="monotone" dataKey="actual" stroke={C.accent} strokeWidth={2.5} dot={{ r: 3, fill: C.accent }} connectNulls={false} />
            <Line type="monotone" dataKey="forecast" stroke={C.cyan} strokeWidth={2.5} strokeDasharray="6 3" dot={{ r: 3, fill: C.cyan }} connectNulls={false} />
          </AreaChart>
        </ResponsiveContainer>
      </ChartCard>
      <div style={{ marginTop: 16 }}><DataTable columns={[{ key: "date", label: "Date" }, { key: "day", label: "Day" }, { key: "predicted", label: "Forecast", align: "right", format: v => fmt(v) }, { key: "confidence_low", label: "Low (85%)", align: "right", format: v => fmt(v) }, { key: "confidence_high", label: "High (115%)", align: "right", format: v => fmt(v) }]} rows={data.forecast || []} /></div>
    </div>
  );
}

/* ═══════════════════════════ REPORT ROUTER ═══════════════════════════ */
const REPORT_COMPONENTS: Record<ReportId, React.FC> = {
  "home": HomeReport,
  "sales-by-hour": SalesByHourReport,
  "sales-by-item": SalesByItemReport,
  "heatmap": HeatmapReport,
  "daypart": DaypartReport,
  "category-mix": CategoryMixReport,
  "sales-vs-labor": SalesVsLaborReport,
  "speed-of-service": SpeedOfServiceReport,
  "menu-engineering": MenuEngineeringReport,
  "prime-cost": PrimeCostReport,
  "waste-variance": WasteVarianceReport,
  "guest-analytics": GuestAnalyticsReport,
  "server-performance": ServerPerformanceReport,
  "daily-comparison": DailyComparisonReport,
  "outlet-comparison": OutletComparisonReport,
  "sales-trend": SalesTrendReport,
  "forecast": ForecastReport,
};

/* ═══════════════════════════ MAIN LAYOUT ═══════════════════════════ */
export default function AnalyticsEngine() {
  const [activeReport, setActiveReport] = useState<ReportId>("home");
  const [expandedCat, setExpandedCat] = useState<string>("overview");
  const ReportComponent = REPORT_COMPONENTS[activeReport] || HomeReport;

  return (
    <div data-testid="analytics-engine" style={{ display: "flex", height: "100%", background: C.bg, color: C.text, fontFamily: "'Inter', -apple-system, sans-serif", borderRadius: 10, overflow: "hidden" }}>
      {/* Internal Report Sidebar */}
      <div style={{ width: 220, minWidth: 220, borderRight: `1px solid ${C.cardBorder}`, background: "rgba(17,24,39,0.6)", display: "flex", flexDirection: "column", overflowY: "auto" }} data-testid="analytics-report-nav">
        <div style={{ padding: "16px 16px 12px", borderBottom: `1px solid ${C.cardBorder}` }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill={C.accent}><path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zM9 17H7v-7h2v7zm4 0h-2V7h2v10zm4 0h-2v-4h2v4z" /></svg>
            <span style={{ fontSize: 14, fontWeight: 700, color: C.accent, letterSpacing: "-0.01em" }}>Analytics</span>
          </div>
          <div style={{ fontSize: 10, color: C.textDim }}>Enterprise Hospitality BI</div>
          <div style={{ fontSize: 9, color: C.textMuted, marginTop: 4 }}>17 reports across 7 categories</div>
        </div>
        <div style={{ flex: 1, padding: "8px 0" }}>
          {REPORT_NAV.map(cat => (
            <div key={cat.id}>
              <button onClick={() => setExpandedCat(expandedCat === cat.id ? "" : cat.id)} style={{ width: "100%", display: "flex", alignItems: "center", gap: 8, padding: "8px 16px", background: expandedCat === cat.id ? "rgba(200,169,126,0.06)" : "transparent", border: "none", color: expandedCat === cat.id ? C.accent : C.textDim, cursor: "pointer", fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", transition: "all 0.15s" }} data-testid={`analytics-cat-${cat.id}`}>
                <SvgIcon path={cat.icon} size={16} color={expandedCat === cat.id ? C.accent : C.textDim} />
                <span>{cat.label}</span>
                <svg width="12" height="12" viewBox="0 0 24 24" fill={C.textDim} style={{ marginLeft: "auto", transform: expandedCat === cat.id ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.2s" }}><path d="M7 10l5 5 5-5z" /></svg>
              </button>
              {expandedCat === cat.id && (
                <div style={{ padding: "2px 0 6px" }}>
                  {cat.reports.map(report => (
                    <button key={report.id} onClick={() => setActiveReport(report.id)} data-testid={`analytics-report-${report.id}`} style={{ width: "100%", display: "block", textAlign: "left", padding: "7px 16px 7px 40px", background: activeReport === report.id ? "rgba(200,169,126,0.12)" : "transparent", border: "none", color: activeReport === report.id ? C.accent : C.text, cursor: "pointer", fontSize: 12, fontWeight: activeReport === report.id ? 600 : 400, borderLeft: activeReport === report.id ? `2px solid ${C.accent}` : "2px solid transparent", transition: "all 0.15s" }}>{report.label}</button>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
        <div style={{ padding: "12px 16px", borderTop: `1px solid ${C.cardBorder}`, fontSize: 9, color: C.textMuted }}>Powered by LUCCCA Analytics Engine</div>
      </div>
      {/* Main Content Area */}
      <div style={{ flex: 1, overflowY: "auto", padding: "20px 28px" }} data-testid="analytics-content">
        <ReportComponent />
      </div>
    </div>
  );
}
