/**
 * SpaScheduleIntelligencePanel
 * ----------------------------
 * Action-oriented schedule intelligence for spa leadership.
 */
import React, { useEffect, useState } from "react";
import { Zap, TrendingUp, Clock, ArrowUpRight, RefreshCw, Calendar } from "lucide-react";

const ACCENT = "#c8a97e";
const GREEN = "#22c55e";
const AMBER = "#f59e0b";
const RED = "#ef4444";
const BORDER = "rgba(255,255,255,0.08)";
const SURFACE = "rgba(255,255,255,0.025)";
const API = typeof window !== "undefined" ? window.location.origin : "";

export default function SpaScheduleIntelligencePanel() {
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [recs, setRecs] = useState<any>(null);
  const [gaps, setGaps] = useState<any>(null);
  const [premium, setPremium] = useState<any>(null);
  const [upsell, setUpsell] = useState<any>(null);
  const [rebalance, setRebalance] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    const q = `?date=${date}`;
    const [r, g, p, u, b] = await Promise.all([
      fetch(`${API}/api/spa-schedule/recommendations${q}`).then(x => x.json()),
      fetch(`${API}/api/spa-schedule/gaps${q}`).then(x => x.json()),
      fetch(`${API}/api/spa-schedule/premium-slots${q}`).then(x => x.json()),
      fetch(`${API}/api/spa-schedule/upsell${q}`).then(x => x.json()),
      fetch(`${API}/api/spa-schedule/rebalance${q}`).then(x => x.json()),
    ]);
    setRecs(r); setGaps(g); setPremium(p); setUpsell(u); setRebalance(b);
    setLoading(false);
  };
  useEffect(() => { load(); }, [date]);

  const sev = (s: string) => s === "high" ? RED : s === "warn" ? AMBER : ACCENT;

  return (
    <div className="h-full flex flex-col overflow-hidden" style={{ background: "#04060d", color: "#e2e8f0" }} data-testid="spa-schedule-intel-panel">
      <div className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: BORDER, background: "#0b1020" }}>
        <div>
          <div className="text-[10px] font-mono uppercase tracking-[0.25em] flex items-center gap-2" style={{ color: `${ACCENT}99` }}>
            <Zap className="w-3 h-3" /> Spa Schedule Intelligence
          </div>
          <div className="text-[18px] font-semibold text-white mt-0.5">Action Layer</div>
          <div className="text-[10px] text-white/40 mt-0.5">Fill gaps · protect premium · upsell · rebalance</div>
        </div>
        <div className="flex items-center gap-2">
          <input type="date" value={date} onChange={e => setDate(e.target.value)}
            className="px-2 py-1.5 rounded text-[11px] text-white bg-transparent outline-none"
            style={{ border: `1px solid ${BORDER}`, colorScheme: "dark" }} data-testid="schedule-intel-date" />
          <button onClick={load} className="p-2 rounded hover:bg-white/[0.05]">
            <RefreshCw className={`w-3.5 h-3.5 text-white/60 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-6 grid grid-cols-12 gap-4 auto-rows-min">
        {/* KPI strip */}
        <KpiTile icon={<Clock className="w-4 h-4" />} label="Open Slots" value={gaps?.open_slot_count ?? "—"}
          sub={`${gaps?.premium_open ?? 0} premium`} tone={gaps?.premium_open > 3 ? "bad" : "accent"}
          className="col-span-6 lg:col-span-3" />
        <KpiTile icon={<TrendingUp className="w-4 h-4" />} label="Premium Fill"
          value={`${Math.round((premium?.fill_rate ?? 0) * 100)}%`}
          sub={premium?.protection_status}
          tone={premium?.protection_status === "exposed" ? "warn" : premium?.protection_status === "tight" ? "good" : "accent"}
          className="col-span-6 lg:col-span-3" />
        <KpiTile icon={<ArrowUpRight className="w-4 h-4" />} label="Upsell Potential"
          value={`$${Math.round(upsell?.potential_revenue ?? 0)}`}
          sub={`${upsell?.count ?? 0} opportunities`} tone="good"
          className="col-span-6 lg:col-span-3" />
        <KpiTile icon={<Calendar className="w-4 h-4" />} label="Exposure"
          value={gaps?.exposure_score ?? "—"} sub="premium-weighted 3x"
          tone="accent" className="col-span-6 lg:col-span-3" />

        {/* Recommendations */}
        <Card title="Prioritized Actions" icon={<Zap className="w-3.5 h-3.5" />} className="col-span-12 lg:col-span-7" testid="schedule-recs">
          {recs?.recommendations?.map((r: any, i: number) => (
            <div key={i} className="p-3 rounded mb-2" style={{ background: SURFACE, border: `1px solid ${sev(r.severity)}35` }}>
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold text-white">{r.title}</span>
                <span className="text-[8px] uppercase font-mono px-1.5 py-0.5 rounded"
                  style={{ background: `${sev(r.severity)}18`, color: sev(r.severity) }}>{r.kind}</span>
              </div>
              <div className="text-[10px] text-white/65 mt-1">{r.action}</div>
            </div>
          ))}
        </Card>

        {/* Gaps by hour */}
        <Card title="Open Slots by Hour" icon={<Clock className="w-3.5 h-3.5" />} className="col-span-12 lg:col-span-5" testid="schedule-gaps-hour">
          {gaps?.by_hour?.length ? (
            <div className="flex items-end gap-1 h-32">
              {gaps.by_hour.map((h: any) => {
                const isPremium = (gaps.premium_hours || []).includes(h.hour);
                const max = Math.max(...gaps.by_hour.map((x: any) => x.open_slots), 1);
                const hpct = Math.max(4, (h.open_slots / max) * 100);
                return (
                  <div key={h.hour} className="flex-1 flex flex-col items-center justify-end gap-1">
                    <div className="text-[8px] font-mono text-white/50">{h.open_slots}</div>
                    <div className="w-full rounded-sm transition-all"
                      style={{
                        height: `${hpct}%`,
                        background: isPremium ? ACCENT : `${ACCENT}35`,
                        boxShadow: isPremium ? `0 0 8px ${ACCENT}40` : undefined,
                      }} />
                    <div className="text-[7px] font-mono text-white/30">{h.hour}</div>
                  </div>
                );
              })}
            </div>
          ) : <Empty />}
          <div className="text-[9px] text-white/40 mt-3">Gold bars = premium hours (10, 11, 14, 15, 17, 18).</div>
        </Card>

        {/* Upsell list */}
        <Card title="Upsell Opportunities" icon={<ArrowUpRight className="w-3.5 h-3.5" />} className="col-span-12 lg:col-span-7" testid="schedule-upsell">
          {upsell?.recommendations?.length ? (
            <table className="w-full text-[11px]">
              <thead><tr className="text-left text-white/40 text-[8px] uppercase tracking-wider">
                <th className="py-1.5">Guest</th><th>Current</th><th>Suggest</th><th className="text-right">Uplift</th>
              </tr></thead>
              <tbody>
                {upsell.recommendations.map((r: any, i: number) => (
                  <tr key={i} className="border-t" style={{ borderColor: BORDER }}>
                    <td className="py-1.5">
                      <div className="text-white">{r.guest || "—"}</div>
                      <div className="text-[8px] text-white/40">rm {r.room_number || "—"}</div>
                    </td>
                    <td className="text-white/70">{r.current.name}<div className="text-[8px] text-white/40">${r.current.price}</div></td>
                    <td style={{ color: ACCENT }}>{r.suggested.name}<div className="text-[8px] text-white/40">${r.suggested.price}</div></td>
                    <td className="text-right font-bold" style={{ color: GREEN }}>+${r.uplift_usd}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : <Empty note="No upsells for this date." />}
        </Card>

        {/* Rebalance */}
        <Card title="Rebalance Moves" icon={<RefreshCw className="w-3.5 h-3.5" />} className="col-span-12 lg:col-span-5" testid="schedule-rebalance">
          {rebalance?.moves?.length ? (
            <div className="space-y-2">
              {rebalance.moves.map((m: any, i: number) => (
                <div key={i} className="p-2.5 rounded" style={{ background: SURFACE, border: `1px solid ${BORDER}` }}>
                  <div className="flex items-center gap-2 text-[11px]">
                    <span className="text-white/70">{m.from_therapist.name}</span>
                    <span className="text-white/30">→</span>
                    <span className="text-white">{m.to_therapist.name}</span>
                  </div>
                  <div className="text-[9px] text-white/50 mt-0.5">{m.suggestion}</div>
                  <div className="text-[8px] font-mono text-white/35 mt-0.5">
                    util {Math.round(m.from_therapist.util * 100)}% → {Math.round(m.to_therapist.util * 100)}%
                  </div>
                </div>
              ))}
            </div>
          ) : <Empty note="No rebalancing needed — loads are balanced." />}
          {rebalance?.under_requested_therapists?.length > 0 && (
            <div className="mt-3 pt-3" style={{ borderTop: `1px solid ${BORDER}` }}>
              <div className="text-[9px] uppercase font-mono tracking-widest text-white/40 mb-1.5">Coaching needed</div>
              {rebalance.under_requested_therapists.map((t: any) => (
                <div key={t.id} className="flex items-center justify-between text-[10px] py-0.5">
                  <span className="text-white/70">{t.name}</span>
                  <span className="text-[9px] font-mono" style={{ color: AMBER }}>req {Math.round(t.request_ratio * 100)}%</span>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}

function KpiTile({ icon, label, value, sub, tone = "accent", className }: any) {
  const c = tone === "good" ? GREEN : tone === "warn" ? AMBER : tone === "bad" ? RED : ACCENT;
  return (
    <div className={`rounded-xl p-4 ${className || ""}`} style={{ background: "linear-gradient(145deg,#0b1020 0%,#080b14 100%)", border: `1px solid ${BORDER}` }}>
      <div className="flex items-center gap-2 mb-2"><span style={{ color: c }}>{icon}</span>
        <span className="text-[9px] font-mono uppercase tracking-widest" style={{ color: `${c}99` }}>{label}</span></div>
      <div className="text-[24px] font-bold text-white">{value}</div>
      <div className="text-[9px] text-white/40 mt-1">{sub}</div>
    </div>
  );
}

function Card({ title, icon, className, children, testid }: any) {
  return (
    <div className={`rounded-xl p-4 ${className || ""}`} style={{ background: "#0b1020", border: `1px solid ${BORDER}` }} data-testid={testid}>
      <div className="flex items-center gap-2 mb-3 pb-2" style={{ borderBottom: `1px solid ${BORDER}` }}>
        <span style={{ color: ACCENT }}>{icon}</span>
        <div className="text-[10px] font-semibold uppercase tracking-wider text-white">{title}</div>
      </div>
      {children}
    </div>
  );
}

function Empty({ note }: { note?: string }) {
  return <div className="text-[10px] text-white/35 text-center py-4">{note || "No data."}</div>;
}
