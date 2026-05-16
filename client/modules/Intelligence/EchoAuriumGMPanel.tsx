/**
 * EchoAuriumGMPanel — executive roll-up for GM
 * Reads /api/intelligence/aurium/gm
 */
import React, { useEffect, useState } from "react";
import { Gauge, AlertTriangle, RefreshCw, TrendingUp, TrendingDown, Crown } from "lucide-react";
import PatternInlineWidget from "./PatternInlineWidget";
import Sparkline from "./Sparkline";

const ACCENT = "#c8a97e";
const GREEN = "#22c55e";
const AMBER = "#f59e0b";
const RED = "#ef4444";
const BLUE = "#60a5fa";
const BORDER = "rgba(255,255,255,0.08)";
const SURFACE = "rgba(255,255,255,0.025)";
const API = typeof window !== "undefined" ? window.location.origin : "";

const fmt = (n: any, d = 0) => (typeof n === "number" ? n.toLocaleString(undefined, { maximumFractionDigits: d }) : n ?? "—");

export default function EchoAuriumGMPanel() {
  const [data, setData] = useState<any>(null);
  const [trend, setTrend] = useState<any>(null);
  const load = async () => {
    const r = await fetch(`${API}/api/intelligence/aurium/gm?use_llm=true`).then(r => r.json());
    setData(r);
    try {
      const t = await fetch(`${API}/api/patterns/revenue-at-risk/trend?hours=168`).then(r => r.json());
      setTrend(t);
    } catch { /* optional */ }
  };
  useEffect(() => { load(); const iv = setInterval(load, 120_000); return () => clearInterval(iv); }, []);

  if (!data) return <div style={{ background: "#04060d", color: "#94a3b8", padding: 40 }}>Loading…</div>;
  const score = data.composite_health_score || 0;
  const scoreColor = score > 85 ? GREEN : score > 70 ? AMBER : RED;

  return (
    <div className="h-full flex flex-col overflow-hidden" style={{ background: "#04060d", color: "#e2e8f0" }} data-testid="aurium-gm">
      <div className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: BORDER, background: "#0b1020" }}>
        <div>
          <div className="text-[10px] font-mono uppercase tracking-[0.25em]" style={{ color: `${ACCENT}99` }}>EchoAurium</div>
          <div className="text-[22px] font-semibold text-white mt-0.5 tracking-tight">GM Executive Roll-up</div>
          <div className="text-[10px] text-white/40 mt-0.5">Composite health across Spa · Engineering · Housekeeping · FOH · IRD · Concierge</div>
        </div>
        <button onClick={load} className="flex items-center gap-1.5 px-3 py-1.5 rounded text-[10px]"
          style={{ background: `${ACCENT}12`, color: ACCENT, border: `1px solid ${ACCENT}30` }}
          data-testid="aurium-refresh">
          <RefreshCw size={12} /> Refresh
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        {/* LLM Narrative */}
        {data.narrative && (
          <div className="rounded-lg p-4" style={{ background: `${ACCENT}0d`, border: `1px solid ${ACCENT}40` }} data-testid="aurium-narrative">
            <div className="flex items-center gap-2 mb-2">
              <div className="text-[11px] font-semibold uppercase tracking-[0.2em]" style={{ color: ACCENT }}>EchoAi³ Executive Narrative</div>
              <span className="text-[9px] px-1.5 py-0.5 rounded" style={{ background: `${ACCENT}22`, color: ACCENT }}>claude sonnet 4.5</span>
            </div>
            <div className="text-[12px] leading-relaxed whitespace-pre-wrap" style={{ color: "#e2e8f0" }}>{data.narrative}</div>
          </div>
        )}

        {/* Hero — composite health score + revenue-at-risk (CFO signal) */}
        <div className="rounded-lg p-4 sm:p-6 flex flex-col sm:flex-row items-center gap-4 sm:gap-8" style={{ background: SURFACE, border: `1px solid ${BORDER}` }} data-testid="aurium-hero">
          <div className="flex flex-col items-center">
            <div className="text-[10px] uppercase tracking-[0.25em]" style={{ color: "#94a3b8" }}>Composite Health</div>
            <div className="text-[56px] sm:text-[72px] font-bold mt-1 leading-none" style={{ color: scoreColor }}>{score}</div>
            <div className="text-[10px]" style={{ color: "#94a3b8" }}>out of 100</div>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-5 gap-4 sm:gap-6 flex-1 w-full">
            <div>
              <div className="text-[9px] uppercase" style={{ color: "#94a3b8" }}>Readiness</div>
              <div className="text-[20px] font-semibold" style={{ color: data.readiness_pct > 80 ? GREEN : AMBER }}>{data.readiness_pct}%</div>
              <div className="text-[9px]" style={{ color: "#64748b" }}>{data.rooms_ready} ready · {data.rooms_ooo} OOO</div>
            </div>
            <div>
              <div className="text-[9px] uppercase" style={{ color: "#94a3b8" }}>Engineering Load</div>
              <div className="text-[20px] font-semibold" style={{ color: data.engineering_critical > 0 ? RED : GREEN }}>{data.engineering_open}</div>
              <div className="text-[9px]" style={{ color: "#64748b" }}>{data.engineering_critical} critical</div>
            </div>
            <div>
              <div className="text-[9px] uppercase" style={{ color: "#94a3b8" }}>FOH 24h</div>
              <div className="text-[20px] font-semibold" style={{ color: GREEN }}>${fmt(data.foh_revenue_24h, 0)}</div>
              <div className="text-[9px]" style={{ color: "#64748b" }}>{data.foh_covers_24h} covers</div>
            </div>
            <div>
              <div className="text-[9px] uppercase" style={{ color: "#94a3b8" }}>Concierge</div>
              <div className="text-[20px] font-semibold" style={{ color: data.concierge_open > 5 ? AMBER : GREEN }}>{data.concierge_24h}</div>
              <div className="text-[9px]" style={{ color: "#64748b" }}>{data.concierge_open} open</div>
            </div>
            <div data-testid="revenue-at-risk"
              onClick={() => window.dispatchEvent(new CustomEvent("open-panel", { detail: { id: "pattern-intelligence" } }))}
              style={{ cursor: "pointer" }}>
              <div className="text-[9px] uppercase flex items-center gap-1" style={{ color: "#94a3b8" }}>
                <AlertTriangle size={9} /> Revenue at Risk · 14d
              </div>
              <div className="flex items-baseline gap-2">
                <div className="text-[20px] font-semibold" style={{ color: (data.revenue_at_risk_usd || 0) > 10000 ? RED : (data.revenue_at_risk_usd || 0) > 3000 ? AMBER : GREEN }}>
                  ${fmt(data.revenue_at_risk_usd || 0, 0)}
                </div>
                {trend?.delta_24h_usd != null && trend.delta_24h_usd !== 0 && (
                  <div className="text-[10px] flex items-center gap-0.5" style={{ color: trend.delta_24h_usd > 0 ? RED : GREEN }} data-testid="rar-delta">
                    {trend.delta_24h_usd > 0 ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
                    {trend.delta_24h_usd > 0 ? "+" : ""}${fmt(Math.abs(trend.delta_24h_usd), 0)} 24h
                  </div>
                )}
              </div>
              {trend?.points && trend.points.length >= 2 && (
                <div className="mt-1">
                  <Sparkline
                    points={trend.points.map((p: any) => p.usd)}
                    width={140}
                    height={24}
                    strokeColor={(data.revenue_at_risk_usd || 0) > 10000 ? RED : ACCENT}
                    fillColor={(data.revenue_at_risk_usd || 0) > 10000 ? "rgba(239,68,68,0.15)" : "rgba(200,169,126,0.15)"}
                  />
                </div>
              )}
              <div className="text-[9px] underline" style={{ color: "#c8a97e" }}>drill into patterns →</div>
            </div>
          </div>
        </div>

        {/* Pattern Intelligence digest */}
        <PatternInlineWidget days={30} variant="full" />

        {/* High-severity alerts */}
        <div className="rounded-lg p-4" style={{ background: SURFACE, border: `1px solid ${BORDER}` }} data-testid="aurium-alerts">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle size={14} style={{ color: RED }} />
            <div className="text-[11px] font-semibold uppercase tracking-[0.2em]" style={{ color: RED }}>High-severity Alerts</div>
          </div>
          {(data.high_severity_alerts || []).length === 0 ? (
            <div className="text-[10px]" style={{ color: GREEN }}>✓ No high-severity alerts. Property running smoothly.</div>
          ) : (
            (data.high_severity_alerts || []).map((a: any, idx: number) => (
              <div key={idx} className="py-2 border-b border-white/5">
                <div className="text-[11px] font-semibold text-white">{a.headline}</div>
                <div className="text-[10px]" style={{ color: "#94a3b8" }}>{a.action}</div>
                {a.cross_module && (
                  <div className="text-[9px] mt-1" style={{ color: "#64748b" }}>cross-module: {a.cross_module.join(", ")}</div>
                )}
              </div>
            ))
          )}
        </div>

        {/* Additional metrics */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="rounded p-3" style={{ background: SURFACE, border: `1px solid ${BORDER}` }}>
            <div className="text-[9px] uppercase" style={{ color: "#94a3b8" }}>Spa Bookings 24h</div>
            <div className="text-[20px] font-semibold text-white">{data.spa_bookings_24h}</div>
          </div>
          <div className="rounded p-3" style={{ background: SURFACE, border: `1px solid ${BORDER}` }}>
            <div className="text-[9px] uppercase" style={{ color: "#94a3b8" }}>IRD Revenue 24h</div>
            <div className="text-[20px] font-semibold" style={{ color: GREEN }}>${fmt(data.ird_revenue_24h, 0)}</div>
          </div>
          <div className="rounded p-3" style={{ background: SURFACE, border: `1px solid ${BORDER}` }}>
            <div className="text-[9px] uppercase" style={{ color: "#94a3b8" }}>Timestamp</div>
            <div className="text-[12px] text-white mt-1.5">{new Date(data.ts).toLocaleTimeString()}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
