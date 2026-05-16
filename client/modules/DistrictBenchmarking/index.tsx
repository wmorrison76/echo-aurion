import React, { useState, useEffect } from "react";
import { Building2, TrendingUp, TrendingDown, BarChart3, Map, Trophy, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";

const BACKEND = window.location.origin;
async function api(path: string, opts?: RequestInit) {
  const res = await fetch(`${BACKEND}/api/benchmarking${path}`, {
    headers: { "Content-Type": "application/json" },
    ...opts,
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

type TabId = "overview" | "rankings" | "heatmap";
const TABS: { id: TabId; label: string; icon: React.ElementType }[] = [
  { id: "overview", label: "Enterprise Overview", icon: Building2 },
  { id: "rankings", label: "Rankings", icon: Trophy },
  { id: "heatmap", label: "Heat Map", icon: Map },
];

export default function DistrictBenchmarkingPanel() {
  const [tab, setTab] = useState<TabId>("overview");
  return (
    <div className="flex flex-col h-full overflow-hidden" style={{ background: "#0a0e17" }} data-testid="district-benchmarking-panel">
      <div className="flex items-center gap-3 px-5 py-3 border-b" style={{ borderColor: "rgba(255,255,255,0.05)" }}>
        <div className="w-9 h-9 flex items-center justify-center rounded-lg" style={{ background: "linear-gradient(135deg, rgba(59,130,246,0.15), rgba(168,85,247,0.15))", border: "1px solid rgba(59,130,246,0.25)" }}>
          <Building2 className="w-[18px] h-[18px] text-blue-400" />
        </div>
        <div>
          <div className="text-sm font-semibold text-white tracking-wide">District Benchmarking</div>
          <div className="text-[10px] font-mono text-slate-500 tracking-widest uppercase">Enterprise-Wide Site Comparison</div>
        </div>
      </div>
      <div className="flex border-b px-3 overflow-x-auto" style={{ borderColor: "rgba(255,255,255,0.04)" }}>
        {TABS.map(t => (
          <button key={t.id} data-testid={`bench-tab-${t.id}`} onClick={() => setTab(t.id)}
            className="flex items-center gap-1.5 px-3 py-2.5 text-[11px] font-mono uppercase tracking-wider border-b-2 whitespace-nowrap transition-colors"
            style={{ borderColor: tab === t.id ? "#3b82f6" : "transparent", color: tab === t.id ? "#93c5fd" : "#64748b" }}>
            <t.icon className="w-3.5 h-3.5" /> {t.label}
          </button>
        ))}
      </div>
      <div className="flex-1 overflow-y-auto p-5">
        {tab === "overview" && <OverviewTab />}
        {tab === "rankings" && <RankingsTab />}
        {tab === "heatmap" && <HeatmapTab />}
      </div>
    </div>
  );
}

function OverviewTab() {
  const [data, setData] = useState<any>(null);
  useEffect(() => { api("/sites").then(setData).catch(() => {}); }, []);
  if (!data) return <Loading />;
  const ent = data.enterprise_summary;
  return (
    <div className="space-y-5" data-testid="bench-overview-tab">
      <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
        <Kpi label="Properties" value={data.total_properties} accent="text-blue-400" />
        <Kpi label="Total Outlets" value={data.total_outlets} accent="text-violet-400" />
        <Kpi label="Total Revenue" value={`$${(ent.total_revenue / 1000).toFixed(0)}K`} accent="text-emerald-400" />
        <Kpi label="Avg Margin" value={`${(ent.avg_gross_margin * 100).toFixed(1)}%`} accent="text-cyan-400" />
        <Kpi label="Avg Satisfaction" value={`${ent.avg_satisfaction}/5`} accent="text-amber-400" />
      </div>

      <div className="space-y-2">
        {data.sites.map((site: any, i: number) => (
          <div key={site.property_id} data-testid={`site-card-${i}`}
            className="bg-slate-800/40 rounded-lg border border-slate-700/30 p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-white">{site.name}</span>
                <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-slate-700/40 text-slate-400">{site.type}</span>
                {site.city && <span className="text-[9px] text-slate-500">{site.city}</span>}
              </div>
              <span className="text-xs font-mono text-slate-400">{site.outlets} outlets</span>
            </div>
            <div className="grid grid-cols-3 md:grid-cols-5 gap-3 text-[10px]">
              <MetricCell label="Revenue" value={`$${(site.metrics.monthly_revenue / 1000).toFixed(0)}K`} />
              <MetricCell label="Food Cost" value={`${(site.metrics.food_cost_pct * 100).toFixed(1)}%`}
                color={site.metrics.food_cost_pct > 0.32 ? "text-rose-400" : "text-emerald-400"} />
              <MetricCell label="Margin" value={`${(site.metrics.gross_margin * 100).toFixed(1)}%`}
                color={site.metrics.gross_margin > 0.40 ? "text-emerald-400" : "text-amber-400"} />
              <MetricCell label="Daily Covers" value={site.metrics.daily_covers.toLocaleString()} />
              <MetricCell label="Satisfaction" value={`${site.metrics.guest_satisfaction}/5`}
                color={site.metrics.guest_satisfaction >= 4.5 ? "text-emerald-400" : "text-amber-400"} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function RankingsTab() {
  const [data, setData] = useState<any>(null);
  const [sortBy, setSortBy] = useState("monthly_revenue");
  useEffect(() => { api("/sites").then(setData).catch(() => {}); }, []);
  if (!data) return <Loading />;

  const sortOptions = [
    { key: "monthly_revenue", label: "Revenue", reverse: true },
    { key: "gross_margin", label: "Margin", reverse: true },
    { key: "food_cost_pct", label: "Food Cost (Best)", reverse: false },
    { key: "waste_pct", label: "Waste (Best)", reverse: false },
    { key: "guest_satisfaction", label: "Satisfaction", reverse: true },
    { key: "revenue_per_outlet", label: "Rev/Outlet", reverse: true },
  ];

  const current = sortOptions.find(s => s.key === sortBy) || sortOptions[0];
  const sorted = [...data.sites].sort((a: any, b: any) => {
    const va = a.metrics[sortBy] ?? 0;
    const vb = b.metrics[sortBy] ?? 0;
    return current.reverse ? vb - va : va - vb;
  });

  return (
    <div className="space-y-4" data-testid="bench-rankings-tab">
      <div className="flex flex-wrap gap-1.5">
        {sortOptions.map(opt => (
          <button key={opt.key} data-testid={`sort-${opt.key}`} onClick={() => setSortBy(opt.key)}
            className={cn("text-[10px] font-mono px-2.5 py-1 rounded-lg border transition-colors",
              sortBy === opt.key ? "bg-blue-500/15 text-blue-300 border-blue-500/20" : "bg-slate-800/40 text-slate-500 border-slate-700/30 hover:text-slate-300")}>
            {opt.label}
          </button>
        ))}
      </div>

      <div className="space-y-1.5">
        {sorted.map((site: any, i: number) => {
          const val = site.metrics[sortBy];
          const isPercent = sortBy.includes("pct");
          const display = isPercent ? `${(val * 100).toFixed(1)}%` : sortBy === "guest_satisfaction" ? `${val}/5` : `$${val.toLocaleString()}`;
          const medal = i === 0 ? "text-amber-400" : i === 1 ? "text-slate-300" : i === 2 ? "text-amber-600" : "text-slate-600";

          return (
            <div key={site.property_id} className="flex items-center gap-3 bg-slate-800/30 rounded-lg px-3 py-2 border border-slate-700/20">
              <span className={cn("text-sm font-bold font-mono w-6 text-center", medal)}>#{i + 1}</span>
              <div className="flex-1">
                <span className="text-xs text-white">{site.name}</span>
                <div className="text-[9px] text-slate-500">{site.city} — {site.outlets} outlets</div>
              </div>
              <span className="text-sm font-bold font-mono text-white">{display}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function HeatmapTab() {
  const [data, setData] = useState<any>(null);
  const [metric, setMetric] = useState("food_cost_pct");
  const metrics = ["food_cost_pct", "labor_pct", "gross_margin", "waste_pct", "guest_satisfaction", "revenue_per_outlet"];

  useEffect(() => { api(`/heatmap?metric=${metric}`).then(setData).catch(() => {}); }, [metric]);
  if (!data) return <Loading />;

  return (
    <div className="space-y-4" data-testid="bench-heatmap-tab">
      <div className="flex flex-wrap gap-1.5">
        {metrics.map(m => (
          <button key={m} onClick={() => setMetric(m)}
            className={cn("text-[10px] font-mono px-2.5 py-1 rounded-lg border transition-colors",
              metric === m ? "bg-blue-500/15 text-blue-300 border-blue-500/20" : "bg-slate-800/40 text-slate-500 border-slate-700/30 hover:text-slate-300")}>
            {m.replace(/_/g, " ").replace("pct", "%")}
          </button>
        ))}
      </div>

      <div className="flex items-center gap-2 text-[10px] text-slate-500">
        <span>Enterprise Avg: <span className="text-white font-mono">{data.metric.includes("pct") ? `${(data.enterprise_avg * 100).toFixed(1)}%` : data.enterprise_avg.toLocaleString()}</span></span>
        <span>Range: <span className="font-mono text-slate-400">{data.metric.includes("pct") ? `${(data.min * 100).toFixed(1)}%` : data.min.toLocaleString()} — {data.metric.includes("pct") ? `${(data.max * 100).toFixed(1)}%` : data.max.toLocaleString()}</span></span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
        {data.cells.map((cell: any, i: number) => {
          const hue = cell.heat > 0.66 ? "emerald" : cell.heat > 0.33 ? "amber" : "rose";
          const isPercent = metric.includes("pct");
          const display = isPercent ? `${(cell.value * 100).toFixed(1)}%` : metric === "guest_satisfaction" ? `${cell.value}/5` : `$${cell.value.toLocaleString()}`;

          return (
            <div key={i} data-testid={`heatmap-cell-${i}`}
              className={cn("rounded-lg border p-3 relative overflow-hidden",
                `bg-${hue}-500/10 border-${hue}-500/20`
              )}
              style={{
                background: `rgba(${cell.heat > 0.66 ? "16,185,129" : cell.heat > 0.33 ? "245,158,11" : "239,68,68"}, ${0.05 + cell.heat * 0.12})`,
                borderColor: `rgba(${cell.heat > 0.66 ? "16,185,129" : cell.heat > 0.33 ? "245,158,11" : "239,68,68"}, 0.2)`,
              }}>
              <div className="flex items-center justify-between">
                <span className="text-xs text-white font-medium">{cell.name}</span>
                <span className="text-sm font-bold font-mono text-white">{display}</span>
              </div>
              <div className="mt-1 h-1.5 bg-slate-700/40 rounded-full overflow-hidden">
                <div className="h-full rounded-full transition-all" style={{
                  width: `${Math.max(cell.heat * 100, 5)}%`,
                  background: cell.heat > 0.66 ? "#10b981" : cell.heat > 0.33 ? "#f59e0b" : "#ef4444",
                }} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function MetricCell({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div>
      <div className="text-slate-500">{label}</div>
      <div className={cn("font-mono font-bold", color || "text-white")}>{value}</div>
    </div>
  );
}

function Loading() { return <div className="flex justify-center py-12"><RefreshCw className="w-5 h-5 text-slate-500 animate-spin" /></div>; }
function Kpi({ label, value, accent }: { label: string; value: any; accent: string }) {
  return (
    <div className="bg-slate-800/40 border border-slate-700/30 rounded-lg px-3 py-2">
      <span className="text-[10px] text-slate-500 uppercase tracking-wider">{label}</span>
      <div className={cn("text-lg font-bold", accent)}>{value ?? 0}</div>
    </div>
  );
}
