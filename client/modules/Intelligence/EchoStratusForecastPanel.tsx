/**
 * EchoStratusForecastPanel — 6-week director forecasting
 */
import React, { useEffect, useState } from "react";
import { TrendingUp, RefreshCw } from "lucide-react";
import PatternInlineWidget from "./PatternInlineWidget";

const ACCENT = "#c8a97e";
const GREEN = "#22c55e";
const AMBER = "#f59e0b";
const BORDER = "rgba(255,255,255,0.08)";
const SURFACE = "rgba(255,255,255,0.025)";
const API = typeof window !== "undefined" ? window.location.origin : "";

const fmt = (n: any, d = 0) => (typeof n === "number" ? n.toLocaleString(undefined, { maximumFractionDigits: d }) : n ?? "—");

export default function EchoStratusForecastPanel() {
  const [data, setData] = useState<any>(null);
  const [weeks, setWeeks] = useState(6);
  const load = async () => {
    const r = await fetch(`${API}/api/intelligence/stratus/forecast?weeks=${weeks}`).then(r => r.json());
    setData(r);
  };
  useEffect(() => { load(); /* eslint-disable-line */ }, [weeks]);

  return (
    <div className="h-full flex flex-col overflow-hidden" style={{ background: "#04060d", color: "#e2e8f0" }} data-testid="stratus-forecast">
      <div className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: BORDER, background: "#0b1020" }}>
        <div>
          <div className="text-[10px] font-mono uppercase tracking-[0.25em]" style={{ color: `${ACCENT}99` }}>EchoStratus</div>
          <div className="text-[22px] font-semibold text-white mt-0.5 tracking-tight">Director Forecast · {weeks} weeks</div>
          <div className="text-[10px] text-white/40 mt-0.5">Revenue · Covers · Labor · CapEx · Linen demand · Walk-in surges</div>
        </div>
        <div className="flex gap-2">
          <select value={weeks} onChange={e => setWeeks(Number(e.target.value))}
            className="px-2 py-1.5 text-[10px] rounded"
            style={{ background: "rgba(0,0,0,0.4)", border: `1px solid ${BORDER}`, color: "white" }}
            data-testid="weeks-select">
            {[2, 4, 6, 8, 12].map(w => <option key={w} value={w}>{w} weeks</option>)}
          </select>
          <button onClick={load} className="flex items-center gap-1.5 px-3 py-1.5 rounded text-[10px]"
            style={{ background: `${ACCENT}12`, color: ACCENT, border: `1px solid ${ACCENT}30` }}
            data-testid="stratus-refresh">
            <RefreshCw size={12} /> Refresh
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        {/* Pattern Intelligence digest */}
        <PatternInlineWidget days={Math.min(90, weeks * 7)} variant="compact" />

        {data && (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3" data-testid="stratus-totals">
              <div className="rounded p-3" style={{ background: SURFACE, border: `1px solid ${BORDER}` }}>
                <div className="text-[9px] uppercase" style={{ color: "#94a3b8" }}>Forecast Revenue</div>
                <div className="text-[20px] font-semibold" style={{ color: GREEN }}>${fmt(data.totals_6w?.revenue, 0)}</div>
              </div>
              <div className="rounded p-3" style={{ background: SURFACE, border: `1px solid ${BORDER}` }}>
                <div className="text-[9px] uppercase" style={{ color: "#94a3b8" }}>Covers</div>
                <div className="text-[20px] font-semibold text-white">{fmt(data.totals_6w?.covers)}</div>
              </div>
              <div className="rounded p-3" style={{ background: SURFACE, border: `1px solid ${BORDER}` }}>
                <div className="text-[9px] uppercase" style={{ color: "#94a3b8" }}>Labor Cost</div>
                <div className="text-[20px] font-semibold" style={{ color: AMBER }}>${fmt(data.totals_6w?.labor_cost, 0)}</div>
              </div>
              <div className="rounded p-3" style={{ background: SURFACE, border: `1px solid ${BORDER}` }}>
                <div className="text-[9px] uppercase" style={{ color: "#94a3b8" }}>CapEx Risk</div>
                <div className="text-[20px] font-semibold" style={{ color: AMBER }}>${fmt(data.totals_6w?.capex_risk, 0)}</div>
              </div>
              <div className="rounded p-3" style={{ background: SURFACE, border: `1px solid ${BORDER}` }}>
                <div className="text-[9px] uppercase" style={{ color: "#94a3b8" }}>Linen Demand</div>
                <div className="text-[20px] font-semibold text-white">{fmt(data.totals_6w?.linen_demand)}</div>
              </div>
            </div>

            <div className="rounded-lg p-3 overflow-x-auto" style={{ background: SURFACE, border: `1px solid ${BORDER}` }} data-testid="stratus-weekly">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp size={14} style={{ color: ACCENT }} />
                <div className="text-[11px] font-semibold uppercase tracking-[0.2em]" style={{ color: ACCENT }}>Weekly Forecast</div>
              </div>
              <table className="w-full text-[10px]">
                <thead><tr className="text-left border-b border-white/10" style={{ color: "#94a3b8" }}>
                  <th className="py-1">Week</th><th>Revenue</th><th>Covers</th><th>Labor</th><th>Labor %</th><th>CapEx</th><th>Linen</th><th>Surge</th>
                </tr></thead>
                <tbody>
                  {(data.weeks || []).map((w: any) => (
                    <tr key={w.week_start} className="border-b border-white/5">
                      <td className="py-1 text-white">{new Date(w.week_start).toLocaleDateString(undefined, { month: "short", day: "numeric" })}</td>
                      <td style={{ color: GREEN }}>${fmt(w.forecast_revenue, 0)}</td>
                      <td>{fmt(w.forecast_covers)}</td>
                      <td>${fmt(w.forecast_labor_cost, 0)}</td>
                      <td style={{ color: w.forecast_labor_ratio_pct > 38 ? AMBER : "#94a3b8" }}>{w.forecast_labor_ratio_pct}%</td>
                      <td>${fmt(w.forecast_capex_risk, 0)}</td>
                      <td>{fmt(w.forecast_linen_demand_units)}</td>
                      <td style={{ color: w.forecast_walk_in_surge_events > 0 ? AMBER : "#64748b" }}>{w.forecast_walk_in_surge_events || 0}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
