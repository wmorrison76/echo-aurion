/**
 * HousekeepingCommandDashboard
 * ----------------------------
 * Real-time occupancy readiness command center.
 */
import React, { useEffect, useState } from "react";
import {
  Activity, AlertTriangle, Home, Users, Sparkles, CheckCircle2, Clock,
  RefreshCw, Shirt, Gauge, PlayCircle,
} from "lucide-react";
import { useLiveEvents } from "@/hooks/useLiveEvents";

const ACCENT = "#c8a97e";
const GREEN = "#22c55e";
const AMBER = "#f59e0b";
const RED = "#ef4444";
const BLUE = "#60a5fa";
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

const statusColor: Record<string, string> = {
  ready: GREEN, inspected: GREEN, dirty: AMBER, in_progress: BLUE,
  ooo: RED, oos: "#a855f7", pickup: "#60a5fa", refused: "#f97316",
};

export default function HousekeepingCommandDashboard() {
  const [kpis, setKpis] = useState<any>(null);
  const [today, setToday] = useState<any>(null);
  const [arrivals, setArrivals] = useState<any>(null);
  const [attendants, setAttendants] = useState<any>(null);
  const [linen, setLinen] = useState<any>(null);
  const [turnover, setTurnover] = useState<any>(null);
  const [signals, setSignals] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState("");
  const [assignBusy, setAssignBusy] = useState(false);
  const [assignMsg, setAssignMsg] = useState("");

  const load = async () => {
    setLoading(true);
    try {
      const [k, t, a, at, l, tv, sg] = await Promise.all([
        fetch(`${API}/api/hskp-ops/kpis`).then(r => r.json()),
        fetch(`${API}/api/hskp-ops/today`).then(r => r.json()),
        fetch(`${API}/api/hskp-ops/arrival-priority`).then(r => r.json()),
        fetch(`${API}/api/hskp-ops/attendants`).then(r => r.json()),
        fetch(`${API}/api/hskp-ops/linen`).then(r => r.json()),
        fetch(`${API}/api/hskp-ops/turnover`).then(r => r.json()),
        fetch(`${API}/api/hskp-ops/guest-signals`).then(r => r.json()),
      ]);
      setKpis(k); setToday(t); setArrivals(a); setAttendants(at);
      setLinen(l); setTurnover(tv); setSignals(sg);
      setLastRefresh(new Date().toLocaleTimeString());
    } catch { /* */ }
    setLoading(false);
  };

  useEffect(() => {
    fetch(`${API}/api/hskp-ops/seed`, { method: "POST" }).then(() => load());
    const iv = setInterval(load, 120_000);
    return () => clearInterval(iv);
  }, []);

  useLiveEvents(["hskp.", "concierge.", "eng."], () => load());

  const runAutoAssign = async () => {
    setAssignBusy(true);
    setAssignMsg("");
    try {
      const res = await fetch(`${API}/api/hskp-ops/assignments/auto`, { method: "POST" }).then(r => r.json());
      setAssignMsg(`Assigned ${res.count} rooms across ${new Set((res.assignments || []).map((a: any) => a.attendant_id)).size} attendants`);
    } catch {
      setAssignMsg("Auto-assign failed");
    }
    setAssignBusy(false);
  };

  return (
    <div className="h-full flex flex-col overflow-hidden" style={{ background: "#04060d", color: "#e2e8f0" }} data-testid="hskp-command-dashboard">
      <div className="flex items-center justify-between px-4 sm:px-6 py-4 border-b flex-wrap gap-2" style={{ borderColor: BORDER, background: "#0b1020" }}>
        <div>
          <div className="text-[10px] font-mono uppercase tracking-[0.25em]" style={{ color: `${ACCENT}99` }}>Housekeeping</div>
          <div className="text-[22px] font-semibold text-white mt-0.5 tracking-tight">Occupancy Readiness Command</div>
          <div className="text-[10px] text-white/40 mt-0.5">
            Rooms · Attendants · Linen · Guest Signals · refreshes every 2 minutes
            {lastRefresh && <span className="ml-2">· last {lastRefresh}</span>}
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={runAutoAssign} disabled={assignBusy}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded text-[10px] font-medium"
            style={{ background: `${BLUE}18`, color: BLUE, border: `1px solid ${BLUE}40` }}
            data-testid="hskp-auto-assign">
            <PlayCircle size={12} /> Auto-Assign
          </button>
          <button onClick={load}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded text-[10px] font-medium"
            style={{ background: `${ACCENT}12`, color: ACCENT, border: `1px solid ${ACCENT}30` }}
            data-testid="hskp-dashboard-refresh">
            <RefreshCw size={12} className={loading ? "animate-spin" : ""} /> Refresh
          </button>
        </div>
      </div>

      {assignMsg && (
        <div className="px-6 py-2 text-[10px]" style={{ background: `${GREEN}10`, borderBottom: `1px solid ${GREEN}30`, color: GREEN }} data-testid="hskp-assign-message">
          {assignMsg}
        </div>
      )}

      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        {kpis && (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3" data-testid="hskp-kpi-grid">
            <Card label="Ready" value={`${kpis.rooms_ready}/${kpis.rooms_total}`} tone="good" testid="hskp-kpi-ready" />
            <Card label="Dirty" value={fmt(kpis.rooms_dirty)} tone={kpis.rooms_dirty > 20 ? "warn" : ""} testid="hskp-kpi-dirty" />
            <Card label="Arrival Not Ready" value={fmt(kpis.arrival_rooms_not_ready)} tone={kpis.arrival_rooms_not_ready > 5 ? "bad" : "warn"} testid="hskp-kpi-arr-not-ready" />
            <Card label="Revenue at Risk" value={`$${fmt(kpis.revenue_at_risk_usd, 0)}`} sub="not-ready arrivals" tone="bad" testid="hskp-kpi-revenue-risk" />
            <Card label="Cleaned Today" value={fmt(kpis.rooms_cleaned_today)} sub={`${kpis.active_attendants} active`} testid="hskp-kpi-cleaned" />
            <Card label="Inspection Pass" value={`${fmt(kpis.inspection_pass_rate, 1)}%`} tone={kpis.inspection_pass_rate > 92 ? "good" : "warn"} testid="hskp-kpi-inspection" />
          </div>
        )}

        {/* Arrival Priority + Turnover Forecast + Linen */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="rounded-lg p-3" style={{ background: SURFACE, border: `1px solid ${BORDER}` }} data-testid="hskp-arrival-priority">
            <div className="flex items-center gap-2 mb-2">
              <Users size={14} style={{ color: ACCENT }} />
              <div className="text-[11px] font-semibold uppercase tracking-[0.2em]" style={{ color: ACCENT }}>Arrival Priority</div>
            </div>
            <div className="max-h-64 overflow-y-auto">
              {(arrivals?.items || []).slice(0, 10).map((a: any) => (
                <div key={a.id} className="py-1.5 border-b border-white/5">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] text-white">
                      #{a.room_no} {a.vip && <span style={{ color: AMBER }}>★VIP</span>}
                    </span>
                    <span className="text-[10px]" style={{ color: a.ready ? GREEN : RED }}>{a.ready ? "ready" : a.room_status}</span>
                  </div>
                  <div className="text-[9px]" style={{ color: "#64748b" }}>
                    {a.guest_name} · {a.loyalty_tier} · score {a.priority_score}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-lg p-3" style={{ background: SURFACE, border: `1px solid ${BORDER}` }} data-testid="hskp-turnover">
            <div className="flex items-center gap-2 mb-2">
              <Gauge size={14} style={{ color: ACCENT }} />
              <div className="text-[11px] font-semibold uppercase tracking-[0.2em]" style={{ color: ACCENT }}>Turnover Intelligence</div>
            </div>
            {turnover && (
              <>
                <div className="grid grid-cols-3 gap-2 mb-3">
                  <div className="rounded p-2" style={{ background: "rgba(0,0,0,0.3)" }}>
                    <div className="text-[8px]" style={{ color: "#94a3b8" }}>Clean min</div>
                    <div className="text-[14px] font-semibold text-white">{fmt(turnover.avg_clean_minutes, 1)}</div>
                  </div>
                  <div className="rounded p-2" style={{ background: "rgba(0,0,0,0.3)" }}>
                    <div className="text-[8px]" style={{ color: "#94a3b8" }}>Inspect min</div>
                    <div className="text-[14px] font-semibold text-white">{fmt(turnover.avg_inspect_minutes, 1)}</div>
                  </div>
                  <div className="rounded p-2" style={{ background: "rgba(0,0,0,0.3)" }}>
                    <div className="text-[8px]" style={{ color: "#94a3b8" }}>Release min</div>
                    <div className="text-[14px] font-semibold text-white">{fmt(turnover.avg_release_to_ready_minutes, 1)}</div>
                  </div>
                </div>
                <div className="text-[9px]" style={{ color: "#94a3b8" }}>
                  Arrival readiness forecast: <span style={{ color: ACCENT }}>{turnover.arrival_readiness_forecast_time ? new Date(turnover.arrival_readiness_forecast_time).toLocaleTimeString() : "—"}</span>
                </div>
                <div className="text-[9px] mt-1" style={{ color: "#94a3b8" }}>{turnover.not_ready_count} rooms queued</div>
                <div className="mt-3">
                  <div className="text-[9px] uppercase" style={{ color: "#94a3b8" }}>By Floor</div>
                  {Object.entries(turnover.by_floor_readiness || {}).map(([f, pct]: any) => (
                    <div key={f} className="flex items-center gap-2 mt-1">
                      <span className="text-[10px]" style={{ color: "#94a3b8", width: 24 }}>F{f}</span>
                      <div style={{ flex: 1, height: 6, background: "rgba(255,255,255,0.08)", borderRadius: 3 }}>
                        <div style={{ width: `${pct}%`, height: "100%", background: pct > 70 ? GREEN : AMBER, borderRadius: 3 }} />
                      </div>
                      <span className="text-[10px]" style={{ color: "#94a3b8", width: 32 }}>{pct}%</span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>

          <div className="rounded-lg p-3" style={{ background: SURFACE, border: `1px solid ${BORDER}` }} data-testid="hskp-linen">
            <div className="flex items-center gap-2 mb-2">
              <Shirt size={14} style={{ color: ACCENT }} />
              <div className="text-[11px] font-semibold uppercase tracking-[0.2em]" style={{ color: ACCENT }}>Linen Levels</div>
            </div>
            <div className="space-y-1.5">
              {(linen?.items || []).map((it: any) => (
                <div key={it.item}>
                  <div className="flex justify-between text-[10px]">
                    <span className="text-white">{it.item.replace(/_/g, " ")}</span>
                    <span style={{ color: it.shortage ? RED : "#94a3b8" }}>{it.on_hand}/{it.par_level}</span>
                  </div>
                  <div style={{ height: 4, background: "rgba(255,255,255,0.08)", borderRadius: 2 }}>
                    <div style={{ width: `${Math.min(100, it.pct_of_par)}%`, height: "100%", background: it.shortage ? RED : GREEN, borderRadius: 2 }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Attendants + Guest Signals */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="rounded-lg p-3" style={{ background: SURFACE, border: `1px solid ${BORDER}` }} data-testid="hskp-attendants">
            <div className="flex items-center gap-2 mb-2">
              <Activity size={14} style={{ color: ACCENT }} />
              <div className="text-[11px] font-semibold uppercase tracking-[0.2em]" style={{ color: ACCENT }}>Attendant Productivity</div>
            </div>
            <table className="w-full text-[10px]">
              <thead>
                <tr className="text-left border-b border-white/10" style={{ color: "#94a3b8" }}>
                  <th className="py-1">Name</th><th>Floor</th><th>Shift</th><th>Today</th><th>Avg min</th><th>Pass %</th>
                </tr>
              </thead>
              <tbody>
                {(attendants?.items || []).map((a: any) => (
                  <tr key={a.id} className="border-b border-white/5">
                    <td className="py-1 text-white">{a.name}</td>
                    <td>{a.floor_primary}</td>
                    <td>{a.shift}</td>
                    <td style={{ color: GREEN }}>{a.rooms_cleaned_today}</td>
                    <td>{a.avg_clean_minutes}</td>
                    <td style={{ color: (a.inspection_pass_rate || 0) > 0.93 ? GREEN : AMBER }}>{Math.round((a.inspection_pass_rate || 0) * 100)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="rounded-lg p-3" style={{ background: SURFACE, border: `1px solid ${BORDER}` }} data-testid="hskp-guest-signals">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle size={14} style={{ color: AMBER }} />
              <div className="text-[11px] font-semibold uppercase tracking-[0.2em]" style={{ color: ACCENT }}>Guest Signals</div>
            </div>
            <div className="mb-2 flex gap-2">
              {signals && Object.entries(signals.severity_counts || {}).map(([s, c]: any) => (
                <div key={s} className="rounded px-2 py-1 text-[10px]" style={{ background: "rgba(0,0,0,0.3)", color: s === "high" ? RED : s === "medium" ? AMBER : "#94a3b8" }}>
                  {s}: {c}
                </div>
              ))}
            </div>
            <div className="max-h-56 overflow-y-auto">
              {(signals?.items || []).slice(0, 10).map((sig: any) => (
                <div key={sig.id} className="py-1.5 border-b border-white/5">
                  <div className="flex justify-between">
                    <span className="text-[10px] text-white">#{sig.room_no} · {sig.signal_type}</span>
                    <span className="text-[9px]" style={{ color: sig.severity === "high" ? RED : sig.severity === "medium" ? AMBER : "#94a3b8" }}>{sig.severity}</span>
                  </div>
                  <div className="text-[9px]" style={{ color: "#64748b" }}>{sig.message}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Status distribution */}
        {today && (
          <div className="rounded-lg p-3" style={{ background: SURFACE, border: `1px solid ${BORDER}` }} data-testid="hskp-status-distribution">
            <div className="flex items-center gap-2 mb-2">
              <Home size={14} style={{ color: ACCENT }} />
              <div className="text-[11px] font-semibold uppercase tracking-[0.2em]" style={{ color: ACCENT }}>Room Status Distribution</div>
            </div>
            <div className="grid grid-cols-8 gap-2">
              {Object.entries(today.status_counts || {}).map(([s, c]: any) => (
                <div key={s} className="rounded p-2 text-center" style={{ background: "rgba(0,0,0,0.3)", borderTop: `2px solid ${statusColor[s] || "#94a3b8"}` }}>
                  <div className="text-[8px] uppercase" style={{ color: "#94a3b8" }}>{s}</div>
                  <div className="text-[16px] font-semibold" style={{ color: statusColor[s] || "#94a3b8" }}>{c}</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
