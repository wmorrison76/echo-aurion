/**
 * PatternIntelligencePanel
 * -------------------------
 * EchoStratus remediation command center. Mines cross-module recurring
 * issues, asset failure clusters, outlet drift, and repeat-guest
 * complaints. Surfaces team notifications + LLM remediation narrative.
 */
import React, { useEffect, useState } from "react";
import {
  AlertTriangle, Bell, RefreshCw, TrendingUp, Users, Wrench,
  Crown, ChevronRight, Sparkles,
} from "lucide-react";
import { useLiveEvents } from "@/hooks/useLiveEvents";

const ACCENT = "#c8a97e";
const GREEN = "#22c55e";
const AMBER = "#f59e0b";
const RED = "#ef4444";
const BLUE = "#60a5fa";
const PURPLE = "#a855f7";
const BORDER = "rgba(255,255,255,0.08)";
const SURFACE = "rgba(255,255,255,0.025)";
const API = typeof window !== "undefined" ? window.location.origin : "";

const fmt = (n: any, d = 0) => (typeof n === "number" ? n.toLocaleString(undefined, { maximumFractionDigits: d }) : n ?? "—");

export default function PatternIntelligencePanel() {
  const [recurring, setRecurring] = useState<any>(null);
  const [guests, setGuests] = useState<any>(null);
  const [assets, setAssets] = useState<any>(null);
  const [drift, setDrift] = useState<any>(null);
  const [stratus, setStratus] = useState<any>(null);
  const [notifs, setNotifs] = useState<any>(null);
  const [rar, setRar] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [days, setDays] = useState(30);

  const load = async () => {
    setLoading(true);
    try {
      const [r, g, a, d, n, rr] = await Promise.all([
        fetch(`${API}/api/patterns/recurring-issues?days=${days}`).then(r => r.json()),
        fetch(`${API}/api/patterns/guest-complaint-history?days=${days * 3}`).then(r => r.json()),
        fetch(`${API}/api/patterns/asset-failure-clusters?days=${days * 3}`).then(r => r.json()),
        fetch(`${API}/api/patterns/outlet-drift?days=14`).then(r => r.json()),
        fetch(`${API}/api/concierge/team-notifications?limit=30`).then(r => r.json()),
        fetch(`${API}/api/patterns/revenue-at-risk?days=${days}&horizon_days=14`).then(r => r.json()),
      ]);
      setRecurring(r); setGuests(g); setAssets(a); setDrift(d); setNotifs(n); setRar(rr);
    } catch {}
    setLoading(false);
  };

  const loadStratus = async () => {
    setLoading(true);
    try {
      const r = await fetch(`${API}/api/patterns/stratus-recommendations?days=${days}&use_llm=true`).then(r => r.json());
      setStratus(r);
    } catch {}
    setLoading(false);
  };

  useEffect(() => { load(); /* eslint-disable-line */ }, [days]);
  useLiveEvents(["stratus.", "patterns.", "concierge.", "eng."], () => load());

  const ackNotif = async (id: string) => {
    await fetch(`${API}/api/concierge/team-notifications/${id}/ack`, { method: "POST" });
    load();
  };

  const assignNotif = async (id: string) => {
    const note = window.prompt("Optional note for the owner team:", "") || undefined;
    await fetch(`${API}/api/concierge/team-notifications/${id}/assign`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ note }),
    });
    load();
  };

  const dismissPattern = async (room_no: string, category: string) => {
    if (!window.confirm(`Dismiss the ${category} pattern in room ${room_no}? A new ticket will re-surface it automatically.`)) return;
    await fetch(`${API}/api/patterns/dismiss`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ room_no, category, reason: "Resolved by owning team" }),
    });
    load();
  };

  return (
    <div className="h-full flex flex-col overflow-hidden" style={{ background: "#04060d", color: "#e2e8f0" }} data-testid="patterns-panel">
      <div className="flex items-center justify-between px-4 sm:px-6 py-4 border-b flex-wrap gap-2" style={{ borderColor: BORDER, background: "#0b1020" }}>
        <div>
          <div className="text-[10px] font-mono uppercase tracking-[0.25em]" style={{ color: `${ACCENT}99` }}>EchoStratus · Patterns</div>
          <div className="text-[18px] sm:text-[22px] font-semibold text-white mt-0.5 tracking-tight">Recurring-Issue Intelligence</div>
          <div className="text-[10px] text-white/40 mt-0.5 hidden sm:block">Mines concierge · engineering · hskp · FOH for cross-module patterns + remediation plans</div>
        </div>
        <div className="flex gap-2">
          <select value={days} onChange={e => setDays(Number(e.target.value))}
            className="px-2 py-1.5 text-[10px] rounded"
            style={{ background: "rgba(0,0,0,0.4)", border: `1px solid ${BORDER}`, color: "white" }}
            data-testid="window-select">
            {[14, 30, 60, 90].map(d => <option key={d} value={d}>{d} days</option>)}
          </select>
          <button onClick={loadStratus} disabled={loading}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded text-[10px] font-semibold"
            style={{ background: ACCENT, color: "#04060d" }}
            data-testid="run-stratus">
            <Sparkles size={12} /> Run EchoStratus LLM
          </button>
          <button onClick={load} className="flex items-center gap-1.5 px-3 py-1.5 rounded text-[10px]"
            style={{ background: `${ACCENT}12`, color: ACCENT, border: `1px solid ${ACCENT}30` }}
            data-testid="refresh">
            <RefreshCw size={12} className={loading ? "animate-spin" : ""} /> Refresh
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        {/* LLM Remediation Narrative */}
        {stratus?.narrative && (
          <div className="rounded-lg p-4" style={{ background: `${ACCENT}0d`, border: `1px solid ${ACCENT}40` }} data-testid="stratus-narrative">
            <div className="flex items-center gap-2 mb-2">
              <Sparkles size={14} style={{ color: ACCENT }} />
              <div className="text-[11px] font-semibold uppercase tracking-[0.2em]" style={{ color: ACCENT }}>EchoStratus Remediation Plan</div>
              <span className="text-[9px] px-1.5 py-0.5 rounded" style={{ background: `${ACCENT}22`, color: ACCENT }}>claude sonnet 4.5</span>
            </div>
            <div className="text-[12px] leading-relaxed whitespace-pre-wrap" style={{ color: "#e2e8f0" }}>{stratus.narrative}</div>
          </div>
        )}

        {/* Team Notifications */}
        {notifs?.items?.length > 0 && (
          <div className="rounded-lg p-3" style={{ background: SURFACE, border: `1px solid ${BORDER}` }} data-testid="team-notifs">
            <div className="flex items-center gap-2 mb-2">
              <Bell size={14} style={{ color: AMBER }} />
              <div className="text-[11px] font-semibold uppercase tracking-[0.2em]" style={{ color: ACCENT }}>Team Notifications ({notifs.items.filter((n: any) => !n.acknowledged).length} open)</div>
            </div>
            <div className="max-h-56 overflow-y-auto">
              {notifs.items.slice(0, 15).map((n: any) => (
                <div key={n.id} className="py-1.5 border-b border-white/5 flex items-center gap-2 text-[10px]">
                  <span className="px-2 py-0.5 rounded" style={{ background: n.acknowledged ? "rgba(34,197,94,0.15)" : "rgba(245,158,11,0.15)", color: n.acknowledged ? GREEN : AMBER }}>
                    {n.acknowledged ? "ack" : "new"}
                  </span>
                  <span className="text-white">→ {n.to}</span>
                  <span style={{ color: "#94a3b8" }} className="flex-1 truncate">{n.reason}{n.room_no && ` · Rm ${n.room_no}`}{n.guest_name && ` · ${n.guest_name}`}</span>
                  {!n.acknowledged && (
                    <>
                      <button onClick={() => assignNotif(n.id)}
                        className="px-2 py-0.5 rounded text-[9px]"
                        style={{ background: `${BLUE}22`, color: BLUE }}
                        data-testid={`assign-${n.id}`}>
                        assign
                      </button>
                      <button onClick={() => ackNotif(n.id)}
                        className="px-2 py-0.5 rounded text-[9px]"
                        style={{ background: `${GREEN}22`, color: GREEN }}
                        data-testid={`ack-${n.id}`}>
                        ack
                      </button>
                    </>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Revenue-at-Risk drill down (CFO signal) */}
        {rar && rar.total_at_risk_usd > 0 && (
          <div className="rounded-lg p-3" style={{ background: SURFACE, border: `1px solid ${BORDER}` }} data-testid="revenue-at-risk-panel">
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <AlertTriangle size={14} style={{ color: AMBER }} />
              <div className="text-[11px] font-semibold uppercase tracking-[0.2em]" style={{ color: ACCENT }}>Revenue at Risk · {rar.horizon_days}d horizon</div>
              <div className="text-[18px] font-bold ml-auto" style={{ color: rar.total_at_risk_usd > 10000 ? RED : AMBER }} data-testid="rar-total">
                ${fmt(rar.total_at_risk_usd, 0)}
              </div>
            </div>
            {rar.by_kind && (
              <div className="flex gap-2 flex-wrap mb-2">
                {Object.entries(rar.by_kind).map(([k, v]: any) => (
                  <span key={k} className="text-[9px] px-2 py-0.5 rounded" style={{ background: `${ACCENT}18`, color: ACCENT }}>
                    {k.replace("_", " ")}: ${fmt(v, 0)}
                  </span>
                ))}
              </div>
            )}
            <div className="max-h-[220px] overflow-y-auto">
              {(rar.rows || []).slice(0, 10).map((row: any, i: number) => (
                <div key={i} className="flex items-center justify-between py-1 border-b border-white/5 text-[10px]">
                  <div>
                    <span className="text-white">{row.target}</span>
                    <span className="ml-2" style={{ color: "#64748b" }}>
                      {row.kind === "recurring_room" && `${row.count}× · ADR $${fmt(row.adr, 0)}`}
                      {row.kind === "repeat_guest" && `${row.complaint_count} complaints · ${Math.round(row.churn_probability * 100)}% churn`}
                      {row.kind === "asset_cluster" && `${row.count} WOs`}
                      {row.kind === "outlet_drift" && `+${row.drift_minutes}m drift`}
                    </span>
                  </div>
                  <span className="font-semibold" style={{ color: row.at_risk_usd > 1500 ? RED : AMBER }}>
                    ${fmt(row.at_risk_usd, 0)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Stratus plans */}
        {stratus?.plans?.length > 0 && (
          <div className="rounded-lg p-3" style={{ background: SURFACE, border: `1px solid ${BORDER}` }} data-testid="stratus-plans">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp size={14} style={{ color: ACCENT }} />
              <div className="text-[11px] font-semibold uppercase tracking-[0.2em]" style={{ color: ACCENT }}>Remediation Plans ({stratus.plans.length})</div>
              {stratus.preventive_work_orders?.length > 0 && (
                <span className="text-[9px] px-1.5 py-0.5 rounded ml-2" style={{ background: `${GREEN}22`, color: GREEN }} data-testid="preventive-wo-count">
                  {stratus.preventive_work_orders.length} preventive WO auto-created
                </span>
              )}
            </div>
            {stratus.plans.map((p: any) => (
              <div key={p.id} className="py-2 border-b border-white/5">
                <div className="flex items-center gap-2 text-[11px]">
                  <span className="px-2 py-0.5 rounded text-[9px]" style={{ background: `${BLUE}20`, color: BLUE }}>{p.pattern_source}</span>
                  <span className="text-white font-semibold">{p.target}</span>
                  {p.preventive_work_order && (
                    <span className="px-1.5 py-0.5 rounded text-[9px]" style={{ background: `${GREEN}22`, color: GREEN }}>
                      WO {p.preventive_work_order}
                    </span>
                  )}
                  <span className="ml-auto px-2 py-0.5 rounded text-[9px]" style={{ background: p.priority === "high" ? `${RED}20` : `${AMBER}20`, color: p.priority === "high" ? RED : AMBER }}>{p.priority}</span>
                </div>
                <div className="text-[10px] mt-1" style={{ color: "#94a3b8" }}>{p.recommended_action}</div>
                <div className="text-[9px] mt-0.5" style={{ color: "#64748b" }}>
                  owner: {p.owner_domain}{p.recurrence_count && ` · ${p.recurrence_count}× in window`}{p.estimated_impact_usd > 0 && ` · est impact $${fmt(p.estimated_impact_usd, 0)}`}
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Recurring by room+category */}
          <div className="rounded-lg p-3" style={{ background: SURFACE, border: `1px solid ${BORDER}` }} data-testid="recurring-issues">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle size={14} style={{ color: AMBER }} />
              <div className="text-[11px] font-semibold uppercase tracking-[0.2em]" style={{ color: ACCENT }}>Recurring Issues by Room ({recurring?.count || 0})</div>
            </div>
            <div className="max-h-80 overflow-y-auto">
              {(recurring?.items || []).slice(0, 15).map((r: any) => (
                <div key={`${r.room_no}-${r.category}`} className="py-1.5 border-b border-white/5">
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] text-white font-semibold">Room {r.room_no}</span>
                    <span className="text-[10px]" style={{ color: "#94a3b8" }}>· {r.category}</span>
                    <span className="ml-auto text-[14px] font-bold" style={{ color: r.count >= 4 ? RED : AMBER }}>{r.count}×</span>
                    <button onClick={() => dismissPattern(r.room_no, r.category)}
                      title="Dismiss (resolved)"
                      className="px-1.5 py-0.5 rounded text-[9px]"
                      style={{ background: `${GREEN}18`, color: GREEN, border: `1px solid ${GREEN}33` }}
                      data-testid={`dismiss-${r.room_no}-${r.category}`}>
                      ✓
                    </button>
                  </div>
                  <div className="text-[9px]" style={{ color: "#64748b" }}>
                    sources: {(r.sources || []).join(", ")} · first {r.first_seen && new Date(r.first_seen).toLocaleDateString()}
                  </div>
                </div>
              ))}
              {(!recurring?.items || recurring.items.length === 0) && (
                <div className="text-[10px] py-4 text-center" style={{ color: "#64748b" }}>No room-scoped recurrences in window.</div>
              )}
            </div>
          </div>

          {/* Guest complaint history */}
          <div className="rounded-lg p-3" style={{ background: SURFACE, border: `1px solid ${BORDER}` }} data-testid="guest-complaints">
            <div className="flex items-center gap-2 mb-2">
              <Users size={14} style={{ color: PURPLE }} />
              <div className="text-[11px] font-semibold uppercase tracking-[0.2em]" style={{ color: ACCENT }}>Guest Repeat Complaints ({guests?.count || 0})</div>
            </div>
            <div className="max-h-80 overflow-y-auto">
              {(guests?.items || []).slice(0, 15).map((g: any) => (
                <div key={g.guest_name} className="py-1.5 border-b border-white/5">
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] text-white font-semibold">{g.guest_name}</span>
                    {g.vip && <Crown size={10} style={{ color: PURPLE }} />}
                    {g.loyalty_tier && <span className="text-[9px] px-1 rounded" style={{ background: "rgba(255,255,255,0.06)", color: "#94a3b8" }}>{g.loyalty_tier}</span>}
                    <span className="ml-auto text-[14px] font-bold" style={{ color: g.count >= 4 ? RED : AMBER }}>{g.count}×</span>
                  </div>
                  <div className="text-[9px]" style={{ color: "#64748b" }}>
                    cats: {Object.keys(g.categories || {}).join(", ")}
                    {g.lifetime_revenue && ` · lifetime $${fmt(g.lifetime_revenue, 0)}`}
                  </div>
                </div>
              ))}
              {(!guests?.items || guests.items.length === 0) && (
                <div className="text-[10px] py-4 text-center" style={{ color: "#64748b" }}>No repeat guests in window.</div>
              )}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Asset clusters */}
          <div className="rounded-lg p-3" style={{ background: SURFACE, border: `1px solid ${BORDER}` }} data-testid="asset-clusters">
            <div className="flex items-center gap-2 mb-2">
              <Wrench size={14} style={{ color: BLUE }} />
              <div className="text-[11px] font-semibold uppercase tracking-[0.2em]" style={{ color: ACCENT }}>Asset Failure Clusters</div>
            </div>
            <div className="space-y-1">
              {(assets?.items || []).slice(0, 8).map((a: any) => (
                <div key={a.category} className="flex items-center justify-between py-1 border-b border-white/5 text-[10px]">
                  <span className="text-white capitalize">{a.category.replace(/_/g, " ")}</span>
                  <span style={{ color: "#94a3b8" }}>${fmt(a.avg_revenue_at_risk, 0)} avg</span>
                  <span className="font-semibold" style={{ color: a.count >= 10 ? RED : AMBER }}>{a.count}×</span>
                </div>
              ))}
            </div>
          </div>

          {/* Outlet drift */}
          <div className="rounded-lg p-3" style={{ background: SURFACE, border: `1px solid ${BORDER}` }} data-testid="outlet-drift">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp size={14} style={{ color: RED }} />
              <div className="text-[11px] font-semibold uppercase tracking-[0.2em]" style={{ color: ACCENT }}>Outlet Pacing Drift</div>
            </div>
            {(drift?.items || []).length === 0 ? (
              <div className="text-[10px] py-2" style={{ color: GREEN }}>✓ No significant drift detected.</div>
            ) : (
              (drift?.items || []).map((d: any) => (
                <div key={d.outlet_slug} className="py-1.5 border-b border-white/5 text-[10px]">
                  <div className="flex items-center justify-between">
                    <span className="text-white">{d.outlet_name}</span>
                    <span style={{ color: RED }}>+{d.drift_minutes}m</span>
                  </div>
                  <div style={{ color: "#64748b" }}>{d.old_period_avg_variance} → {d.new_period_avg_variance}</div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
