import React, { useState, useEffect } from "react";

const BACKEND = window.location.origin;
async function fetchApi(path: string) {
  const res = await fetch(`${BACKEND}${path}`, { headers: { "Content-Type": "application/json" } });
  if (!res.ok) throw new Error(res.statusText);
  return res.json();
}

export default function EnergyTrackingPanel() {
  const [data, setData] = useState<any>(null);
  const [period, setPeriod] = useState("weekly");

  useEffect(() => {
    fetchApi(`/api/energy/dashboard?period=${period}`).then(setData).catch(() => {});
  }, [period]);

  const outlets = data ? Object.entries(data.by_outlet || {}) as [string, number][] : [];
  const maxVal = outlets.length ? Math.max(...outlets.map(([, v]) => v)) : 1;

  return (
    <div data-testid="energy-tracking-panel" className="flex flex-col h-full overflow-hidden" style={{ background: "#0a0e17" }}>
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3 border-b" style={{ borderColor: "rgba(255,255,255,0.05)" }}>
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 flex items-center justify-center rounded-lg" style={{ background: "linear-gradient(135deg, rgba(245,158,11,0.15), rgba(239,68,68,0.15))", border: "1px solid rgba(245,158,11,0.25)" }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
          </div>
          <div>
            <div className="text-sm font-semibold text-white tracking-wide">Energy & Utility Tracking</div>
            <div className="text-[10px] font-mono text-slate-500 tracking-widest uppercase">Per-Outlet P&L Impact</div>
          </div>
        </div>
        <div className="flex rounded-md overflow-hidden border" style={{ borderColor: "rgba(255,255,255,0.08)" }}>
          {["daily", "weekly", "monthly"].map(p => (
            <button key={p} onClick={() => setPeriod(p)} className="px-3 py-1 text-[10px] font-mono uppercase tracking-wider transition-colors"
              style={{ background: period === p ? "rgba(245,158,11,0.15)" : "transparent", color: period === p ? "#fbbf24" : "#64748b" }}>{p}</button>
          ))}
        </div>
      </div>

      {/* Main KPIs */}
      {data && (
        <div className="grid grid-cols-3 gap-3 px-5 py-3 border-b" style={{ borderColor: "rgba(255,255,255,0.04)" }}>
          <div className="p-4 rounded-lg border" style={{ background: "#1a1f2e", borderColor: "rgba(255,255,255,0.05)" }}>
            <div className="text-[9px] font-mono text-slate-500 uppercase tracking-wider mb-1">Total Consumption</div>
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-mono font-bold text-cyan-400">{(data.total_consumption || 0).toLocaleString()}</span>
              <span className="text-[10px] font-mono text-slate-500">kWh</span>
            </div>
          </div>
          <div className="p-4 rounded-lg border" style={{ background: "#1a1f2e", borderColor: "rgba(255,255,255,0.05)" }}>
            <div className="text-[9px] font-mono text-slate-500 uppercase tracking-wider mb-1">Estimated Cost</div>
            <div className="text-2xl font-mono font-bold text-amber-400">${(data.estimated_cost || 0).toLocaleString()}</div>
          </div>
          <div className="p-4 rounded-lg border" style={{ background: "#1a1f2e", borderColor: "rgba(255,255,255,0.05)" }}>
            <div className="text-[9px] font-mono text-slate-500 uppercase tracking-wider mb-1">Avg Cost/Outlet</div>
            <div className="text-2xl font-mono font-bold text-emerald-400">
              ${outlets.length ? Math.round(data.estimated_cost / outlets.length).toLocaleString() : "—"}
            </div>
          </div>
        </div>
      )}

      {/* Outlet Breakdown */}
      <div className="flex-1 overflow-y-auto px-5 py-4" style={{ scrollbarWidth: "thin", scrollbarColor: "#2a3348 transparent" }}>
        <div className="text-[9px] font-mono text-blue-400 tracking-widest uppercase mb-3">Outlet Consumption Breakdown</div>
        <div className="space-y-3">
          {outlets.map(([outlet, val], i) => {
            const pct = (val / maxVal) * 100;
            const costPct = data ? (val / (data.total_consumption || 1)) * 100 : 0;
            const outletCost = data ? Math.round((costPct / 100) * (data.estimated_cost || 0)) : 0;
            return (
              <div key={outlet} data-testid={`outlet-${i}`} className="p-3 rounded-lg border transition-all hover:-translate-y-px" style={{ background: "#1a1f2e", borderColor: "rgba(255,255,255,0.05)" }}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-white font-medium capitalize">{outlet.replace("outlet-", "").replace(/-/g, " ")}</span>
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-mono text-cyan-400">{val.toLocaleString()} kWh</span>
                    <span className="text-xs font-mono text-amber-400">${outletCost.toLocaleString()}</span>
                  </div>
                </div>
                <div className="h-2 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.04)" }}>
                  <div className="h-full rounded-full transition-all duration-700" style={{ width: `${pct}%`, background: pct > 70 ? "linear-gradient(90deg, #ef4444, #f59e0b)" : pct > 40 ? "linear-gradient(90deg, #f59e0b, #06b6d4)" : "linear-gradient(90deg, #10b981, #06b6d4)" }} />
                </div>
                <div className="flex items-center justify-between mt-1">
                  <span className="text-[9px] font-mono text-slate-600">{costPct.toFixed(1)}% of total</span>
                  <span className="text-[9px] font-mono" style={{ color: pct > 70 ? "#ef4444" : pct > 40 ? "#f59e0b" : "#10b981" }}>
                    {pct > 70 ? "HIGH" : pct > 40 ? "MODERATE" : "EFFICIENT"}
                  </span>
                </div>
              </div>
            );
          })}
          {outlets.length === 0 && <div className="text-center text-sm text-slate-600 py-12">Loading energy data...</div>}
        </div>

        {/* Recommendations */}
        {data && (
          <div className="mt-4">
            <div className="text-[9px] font-mono text-emerald-400 tracking-widest uppercase mb-2">Efficiency Recommendations</div>
            <div className="space-y-1.5">
              {(data.recommendations || [
                "Schedule HVAC pre-cooling during off-peak hours (10pm-6am) to reduce demand charges",
                "Install occupancy sensors in banquet halls — estimated 15% reduction in idle consumption",
                "Negotiate time-of-use rates with utility provider for kitchen equipment startup sequence",
              ]).map((rec: string, i: number) => (
                <div key={i} className="flex items-start gap-2 p-2 rounded border" style={{ background: "rgba(16,185,129,0.04)", borderColor: "rgba(16,185,129,0.1)" }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2" className="mt-0.5 flex-shrink-0"><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
                  <span className="text-[11px] text-slate-300 leading-relaxed">{rec}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
