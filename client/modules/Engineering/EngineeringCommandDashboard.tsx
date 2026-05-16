/**
 * EngineeringCommandDashboard
 * ---------------------------
 * Predictive maintenance + uptime + utility + CapEx intelligence.
 */
import React, { useEffect, useState } from "react";
import {
  Activity, AlertTriangle, CheckCircle2, Clock, RefreshCw, Wrench, Zap,
} from "lucide-react";
import { useLiveEvents } from "@/hooks/useLiveEvents";

const ACCENT = "#c8a97e";
const GREEN = "#22c55e";
const AMBER = "#f59e0b";
const RED = "#ef4444";
const BORDER = "rgba(255,255,255,0.08)";
const SURFACE = "rgba(255,255,255,0.025)";
const API = typeof window !== "undefined" ? window.location.origin : "";

const fmt = (n: any, d = 0) => (typeof n === "number" ? n.toLocaleString(undefined, { maximumFractionDigits: d }) : n ?? "—");

function Card({ label, value, sub, tone, testid }: any) {
  const toneColor = tone === "bad" ? RED : tone === "warn" ? AMBER : tone === "good" ? GREEN : ACCENT;
  return (
    <div className="rounded-lg p-3" style={{ background: SURFACE, border: `1px solid ${BORDER}` }} data-testid={testid}>
      <div className="text-[9px] uppercase tracking-[0.2em]" style={{ color: "#94a3b8" }}>{label}</div>
      <div className="text-[22px] font-semibold mt-1" style={{ color: toneColor }}>{value}</div>
      {sub && <div className="text-[10px] mt-0.5" style={{ color: "#64748b" }}>{sub}</div>}
    </div>
  );
}

export default function EngineeringCommandDashboard() {
  const [kpis, setKpis] = useState<any>(null);
  const [today, setToday] = useState<any>(null);
  const [assets, setAssets] = useState<any>(null);
  const [pm, setPm] = useState<any>(null);
  const [capex, setCapex] = useState<any>(null);
  const [util, setUtil] = useState<any>(null);
  const [productivity, setProductivity] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState("");

  const load = async () => {
    setLoading(true);
    try {
      const [k, t, a, p, c, u, pr] = await Promise.all([
        fetch(`${API}/api/eng-ops/kpis`).then(r => r.json()),
        fetch(`${API}/api/eng-ops/today`).then(r => r.json()),
        fetch(`${API}/api/eng-ops/assets`).then(r => r.json()),
        fetch(`${API}/api/eng-ops/pm-schedule`).then(r => r.json()),
        fetch(`${API}/api/eng-ops/capex-forecast`).then(r => r.json()),
        fetch(`${API}/api/eng-ops/utilities`).then(r => r.json()),
        fetch(`${API}/api/eng-ops/technician-productivity`).then(r => r.json()),
      ]);
      setKpis(k); setToday(t); setAssets(a); setPm(p); setCapex(c); setUtil(u); setProductivity(pr);
      setLastRefresh(new Date().toLocaleTimeString());
    } catch { /* */ }
    setLoading(false);
  };

  useEffect(() => {
    fetch(`${API}/api/eng-ops/seed`, { method: "POST" }).then(() => load());
    const iv = setInterval(load, 120_000);
    return () => clearInterval(iv);
  }, []);

  useLiveEvents(["eng.", "hskp.issue."], () => load());

  const sevColor = (s: string) => ({ critical: RED, high: AMBER, medium: "#60a5fa", low: "#94a3b8" }[s] || "#94a3b8");

  return (
    <div className="h-full flex flex-col overflow-hidden" style={{ background: "#04060d", color: "#e2e8f0" }} data-testid="eng-command-dashboard">
      {/* Header */}
      <div className="flex items-center justify-between px-4 sm:px-6 py-4 border-b flex-wrap gap-2" style={{ borderColor: BORDER, background: "#0b1020" }}>
        <div>
          <div className="text-[10px] font-mono uppercase tracking-[0.25em]" style={{ color: `${ACCENT}99` }}>Engineering</div>
          <div className="text-[22px] font-semibold text-white mt-0.5 tracking-tight">Command Center</div>
          <div className="text-[10px] text-white/40 mt-0.5">
            Predictive maintenance + uptime + CapEx · refreshes every 2 minutes
            {lastRefresh && <span className="ml-2">· last {lastRefresh}</span>}
          </div>
        </div>
        <button
          onClick={load}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded text-[10px] font-medium"
          style={{ background: `${ACCENT}12`, color: ACCENT, border: `1px solid ${ACCENT}30` }}
          data-testid="eng-dashboard-refresh"
        >
          <RefreshCw size={12} className={loading ? "animate-spin" : ""} /> Refresh
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        {/* KPI Row */}
        {kpis && (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3" data-testid="eng-kpi-grid">
            <Card label="Open Tickets" value={fmt(kpis.open_ticket_count)} tone={kpis.open_ticket_count > 10 ? "warn" : "good"} testid="eng-kpi-open" />
            <Card label="Completion 30d" value={`${fmt(kpis.work_order_completion_rate, 1)}%`} tone={kpis.work_order_completion_rate > 85 ? "good" : "warn"} testid="eng-kpi-completion" />
            <Card label="Avg Response" value={`${fmt(kpis.avg_response_minutes, 0)}m`} sub="open → assigned" testid="eng-kpi-response" />
            <Card label="PM Compliance" value={`${fmt(kpis.pm_compliance_rate, 1)}%`} sub={`${kpis.pm_overdue_count} overdue`} tone={kpis.pm_compliance_rate > 90 ? "good" : "warn"} testid="eng-kpi-pm" />
            <Card label="Rooms OOO" value={fmt(kpis.rooms_ooo_count)} tone={kpis.rooms_ooo_count > 3 ? "bad" : "warn"} testid="eng-kpi-ooo" />
            <Card label="CapEx Exposure" value={`$${fmt(kpis.capex_exposure_30d, 0)}`} sub="probability-weighted" tone="warn" testid="eng-kpi-capex" />
          </div>
        )}

        {/* 3-col: Today Board | PM Due | Asset Risk */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Today's ops */}
          <div className="rounded-lg p-3" style={{ background: SURFACE, border: `1px solid ${BORDER}` }} data-testid="eng-today-board">
            <div className="flex items-center gap-2 mb-2">
              <Activity size={14} style={{ color: ACCENT }} />
              <div className="text-[11px] font-semibold uppercase tracking-[0.2em]" style={{ color: ACCENT }}>Today's Board</div>
            </div>
            {today && (
              <>
                <div className="grid grid-cols-4 gap-2 mb-3">
                  {["critical", "high", "medium", "low"].map(s => (
                    <div key={s} className="rounded p-2" style={{ background: "rgba(0,0,0,0.3)", borderLeft: `2px solid ${sevColor(s)}` }}>
                      <div className="text-[8px] uppercase" style={{ color: "#94a3b8" }}>{s}</div>
                      <div className="text-[18px] font-semibold" style={{ color: sevColor(s) }}>{today.open_by_severity?.[s] || 0}</div>
                    </div>
                  ))}
                </div>
                <div className="text-[9px]" style={{ color: "#94a3b8" }}>Revenue at Risk: <span style={{ color: RED }}>${fmt(today.revenue_at_risk_total, 2)}</span></div>
                <div className="mt-2 max-h-40 overflow-y-auto">
                  {(today.open_tickets || []).slice(0, 6).map((wo: any) => (
                    <div key={wo.id} className="text-[10px] py-1 border-b border-white/5 flex justify-between">
                      <span className="truncate">{wo.title}</span>
                      <span style={{ color: sevColor(wo.severity) }}>{wo.severity}</span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* PM Schedule */}
          <div className="rounded-lg p-3" style={{ background: SURFACE, border: `1px solid ${BORDER}` }} data-testid="eng-pm-schedule">
            <div className="flex items-center gap-2 mb-2">
              <Clock size={14} style={{ color: ACCENT }} />
              <div className="text-[11px] font-semibold uppercase tracking-[0.2em]" style={{ color: ACCENT }}>PM Schedule</div>
            </div>
            <div className="max-h-64 overflow-y-auto">
              {(pm?.items || []).slice(0, 10).map((p: any) => (
                <div key={p.id} className="py-1.5 border-b border-white/5">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] font-medium text-white">{p.asset_name}</span>
                    <span className="text-[9px]" style={{ color: p.status === "overdue" ? RED : "#94a3b8" }}>{p.status}</span>
                  </div>
                  <div className="text-[9px]" style={{ color: "#64748b" }}>{p.task} · {new Date(p.next_due).toLocaleDateString()}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Asset Risk */}
          <div className="rounded-lg p-3" style={{ background: SURFACE, border: `1px solid ${BORDER}` }} data-testid="eng-asset-risk">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle size={14} style={{ color: AMBER }} />
              <div className="text-[11px] font-semibold uppercase tracking-[0.2em]" style={{ color: ACCENT }}>Asset Risk</div>
            </div>
            <div className="max-h-64 overflow-y-auto">
              {(capex?.items || []).slice(0, 10).map((a: any) => {
                const fp = a.failure_probability || 0;
                return (
                  <div key={a.asset_id} className="py-1.5 border-b border-white/5">
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] text-white truncate">{a.name}</span>
                      <span className="text-[10px]" style={{ color: fp > 0.7 ? RED : fp > 0.4 ? AMBER : GREEN }}>{Math.round(fp * 100)}%</span>
                    </div>
                    <div className="text-[9px]" style={{ color: "#64748b" }}>${fmt(a.replacement_cost)} · repl ~{a.projected_replacement_year}</div>
                  </div>
                );
              })}
            </div>
            {capex && (
              <div className="mt-2 pt-2 border-t border-white/10 text-[9px]" style={{ color: "#94a3b8" }}>
                <div>12m CapEx: <span style={{ color: AMBER }}>${fmt(capex.total_12m_capex, 0)}</span></div>
                <div>36m CapEx: <span style={{ color: AMBER }}>${fmt(capex.total_36m_capex, 0)}</span></div>
              </div>
            )}
          </div>
        </div>

        {/* Technicians & Utilities */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="rounded-lg p-3" style={{ background: SURFACE, border: `1px solid ${BORDER}` }} data-testid="eng-tech-productivity">
            <div className="flex items-center gap-2 mb-2">
              <Wrench size={14} style={{ color: ACCENT }} />
              <div className="text-[11px] font-semibold uppercase tracking-[0.2em]" style={{ color: ACCENT }}>Technician Productivity (30d)</div>
            </div>
            <table className="w-full text-[10px]">
              <thead>
                <tr className="text-left border-b border-white/10" style={{ color: "#94a3b8" }}>
                  <th className="py-1">Tech</th><th>Spec</th><th>Closed</th><th>Assigned</th><th>Avg Hr</th><th>Score</th>
                </tr>
              </thead>
              <tbody>
                {(productivity?.items || []).map((t: any) => (
                  <tr key={t.id} className="border-b border-white/5">
                    <td className="py-1 text-white">{t.name}</td>
                    <td style={{ color: "#94a3b8" }}>{t.specialty}</td>
                    <td style={{ color: GREEN }}>{t.tickets_closed_30d}</td>
                    <td>{t.tickets_assigned_30d}</td>
                    <td>{t.avg_resolution_hours}</td>
                    <td style={{ color: t.productivity_score > 80 ? GREEN : AMBER }}>{t.productivity_score}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="rounded-lg p-3" style={{ background: SURFACE, border: `1px solid ${BORDER}` }} data-testid="eng-utilities">
            <div className="flex items-center gap-2 mb-2">
              <Zap size={14} style={{ color: ACCENT }} />
              <div className="text-[11px] font-semibold uppercase tracking-[0.2em]" style={{ color: ACCENT }}>Utilities (14d)</div>
            </div>
            <div className="space-y-2">
              {util && util.summary && Object.entries(util.summary).map(([meter, stats]: any) => (
                <div key={meter} className="flex justify-between items-center py-1 border-b border-white/5">
                  <span className="text-[10px] text-white">{meter.replace(/_/g, " ")}</span>
                  <span className="text-[10px]" style={{ color: "#94a3b8" }}>
                    avg {fmt(stats.avg)} · max {fmt(stats.max)} · min {fmt(stats.min)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
