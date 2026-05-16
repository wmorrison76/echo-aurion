/**
 * SpaCommandDashboard
 * -------------------
 * Hospitality-native spa operating brain. 8 zones:
 *   A. Today's Ops      B. Capacity + Yield    C. Revenue
 *   D. Guest Intel      E. Staff + Labor       F. Retail
 *   G. Memberships      H. Reputation + Recovery
 * Plus a live Action Feed synthesized from the KPIs.
 */
import React, { useEffect, useState } from "react";
import {
  Activity, TrendingUp, DollarSign, Users, UserCheck, ShoppingBag,
  BadgePercent, Heart, AlertTriangle, RefreshCw, Wifi, CheckCircle2,
  Clock, Sparkles, ArrowUpRight, ArrowDownRight, Zap,
} from "lucide-react";

const ACCENT = "#c8a97e";
const GREEN = "#22c55e";
const AMBER = "#f59e0b";
const RED = "#ef4444";
const BORDER = "rgba(255,255,255,0.08)";
const SURFACE = "rgba(255,255,255,0.025)";
const API = typeof window !== "undefined" ? window.location.origin : "";

export default function SpaCommandDashboard() {
  const [today, setToday] = useState<any>(null);
  const [util, setUtil] = useState<any>(null);
  const [staff, setStaff] = useState<any>(null);
  const [retail, setRetail] = useState<any>(null);
  const [members, setMembers] = useState<any>(null);
  const [intel, setIntel] = useState<any>(null);
  const [reputation, setReputation] = useState<any>(null);
  const [actions, setActions] = useState<any>(null);
  const [trends, setTrends] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState<string>("");

  const load = async () => {
    setLoading(true);
    try {
      const [a, b, c, d, e, f, g, h] = await Promise.all([
        fetch(`${API}/api/spa-ops/kpis/today`).then(r => r.json()),
        fetch(`${API}/api/spa-ops/utilization`).then(r => r.json()),
        fetch(`${API}/api/spa-ops/staff`).then(r => r.json()),
        fetch(`${API}/api/spa-ops/retail`).then(r => r.json()),
        fetch(`${API}/api/spa-ops/memberships`).then(r => r.json()),
        fetch(`${API}/api/spa-ops/guest-intel`).then(r => r.json()),
        fetch(`${API}/api/spa-ops/reputation`).then(r => r.json()),
        fetch(`${API}/api/spa-ops/actions`).then(r => r.json()),
      ]);
      setToday(a); setUtil(b); setStaff(c); setRetail(d);
      setMembers(e); setIntel(f); setReputation(g); setActions(h);
      const t = await fetch(`${API}/api/spa-ops/kpis/trends?days=14`).then(r => r.json());
      setTrends(t);
      setLastRefresh(new Date().toLocaleTimeString());
    } catch { /* */ }
    setLoading(false);
  };

  useEffect(() => {
    // Ensure demo data
    fetch(`${API}/api/spa-ops/seed-demo`, { method: "POST" }).then(() => load());
    const iv = setInterval(load, 120_000);
    return () => clearInterval(iv);
  }, []);

  return (
    <div className="h-full flex flex-col overflow-hidden" style={{ background: "#04060d", color: "#e2e8f0" }} data-testid="spa-command-dashboard">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: BORDER, background: "#0b1020" }}>
        <div>
          <div className="text-[10px] font-mono uppercase tracking-[0.25em]" style={{ color: `${ACCENT}99` }}>Spa Operations</div>
          <div className="text-[22px] font-semibold text-white mt-0.5 tracking-tight">Command Center</div>
          <div className="text-[10px] text-white/40 mt-0.5">
            Hospitality-native operating brain · refreshes every 2 minutes
            {lastRefresh && <span className="ml-2">· last {lastRefresh}</span>}
          </div>
        </div>
        <button onClick={load} className="flex items-center gap-1.5 px-3 py-1.5 rounded text-[10px] font-medium"
          style={{ background: `${ACCENT}12`, color: ACCENT, border: `1px solid ${ACCENT}30` }} data-testid="spa-dashboard-refresh">
          <RefreshCw className={`w-3 h-3 ${loading ? "animate-spin" : ""}`} /> Refresh
        </button>
      </div>

      <div className="flex-1 overflow-auto p-4 md:p-6 grid grid-cols-12 gap-4 auto-rows-min">
        {/* Row 1 — Key KPIs */}
        <KpiCard icon={<Activity className="w-4 h-4" />} label="Today's Bookings"
          value={today?.bookings?.total ?? "—"}
          sub={`${today?.bookings?.completed ?? 0} completed · ${today?.bookings?.upcoming_today ?? 0} upcoming`}
          tone="accent" className="col-span-12 sm:col-span-6 lg:col-span-3" testid="kpi-bookings" />
        <KpiCard icon={<DollarSign className="w-4 h-4" />} label="Revenue Today"
          value={`$${Math.round(today?.revenue?.total ?? 0).toLocaleString()}`}
          sub={`$${Math.round(today?.revenue?.services ?? 0)} svc · $${Math.round(today?.revenue?.retail ?? 0)} retail`}
          tone="green" className="col-span-12 sm:col-span-6 lg:col-span-3" testid="kpi-revenue" />
        <KpiCard icon={<BadgePercent className="w-4 h-4" />} label="Treatment Room Util"
          value={`${Math.round((today?.utilization?.treatment_room ?? 0) * 100)}%`}
          sub={`${today?.utilization?.rooms_total ?? 0} rooms · target 60%+`}
          tone={pctTone(today?.utilization?.treatment_room, 0.6, 0.35)} className="col-span-12 sm:col-span-6 lg:col-span-3" testid="kpi-room-util" />
        <KpiCard icon={<TrendingUp className="w-4 h-4" />} label="Avg Treatment Rate"
          value={`$${Math.round(today?.revenue?.avg_treatment_rate ?? 0)}`}
          sub={`Retail attach ${Math.round((today?.rates?.retail_attachment ?? 0) * 100)}% · Rev/guest $${Math.round(today?.revenue?.revenue_per_guest ?? 0)}`}
          tone="accent" className="col-span-12 sm:col-span-6 lg:col-span-3" testid="kpi-atr" />

        {/* Row 2 — Action Feed + Trends */}
        <Card title="Action Feed" icon={<Zap className="w-3.5 h-3.5" />} className="col-span-12 lg:col-span-5" testid="zone-actions">
          {actions?.actions?.length ? (
            <div className="space-y-1.5">
              {actions.actions.map((a: any, i: number) => (
                <div key={i} className="flex items-start gap-2 p-2 rounded"
                  style={{ background: SURFACE, border: `1px solid ${sevBorder(a.severity)}` }}>
                  <span className="mt-0.5 shrink-0">
                    {a.severity === "high" ? <AlertTriangle className="w-3.5 h-3.5" style={{ color: RED }} /> :
                     a.severity === "warn" ? <AlertTriangle className="w-3.5 h-3.5" style={{ color: AMBER }} /> :
                     <Sparkles className="w-3.5 h-3.5" style={{ color: ACCENT }} />}
                  </span>
                  <div className="flex-1">
                    <div className="text-[11px] text-white leading-snug">{a.msg}</div>
                    <div className="text-[8px] font-mono uppercase tracking-wider text-white/30 mt-0.5">{a.kind} · {a.severity}</div>
                  </div>
                </div>
              ))}
            </div>
          ) : <Empty note="All targets green." />}
        </Card>

        <Card title="14-Day Revenue Trend" icon={<TrendingUp className="w-3.5 h-3.5" />} className="col-span-12 lg:col-span-7" testid="zone-trends">
          {trends?.points && <SparkBars points={trends.points} />}
        </Card>

        {/* Row 3 — Capacity (Rooms + Therapists) */}
        <Card title="Treatment-Room Utilization" icon={<BadgePercent className="w-3.5 h-3.5" />} className="col-span-12 lg:col-span-6" testid="zone-rooms">
          <div className="space-y-1.5">
            {(util?.rooms || []).map((r: any) => (
              <UtilizationRow key={r.id} label={r.name} sub={r.type} value={r.utilization} bookings={r.bookings} />
            ))}
          </div>
        </Card>
        <Card title="Therapist Load" icon={<UserCheck className="w-3.5 h-3.5" />} className="col-span-12 lg:col-span-6" testid="zone-therapists">
          <div className="space-y-1.5">
            {(util?.therapists || []).map((t: any) => (
              <UtilizationRow key={t.id} label={t.name} sub={`req ratio ${Math.round(t.request_ratio * 100)}%`} value={t.utilization} bookings={t.bookings} />
            ))}
            {util?.daypart_mix && (
              <div className="mt-3 pt-3" style={{ borderTop: `1px solid ${BORDER}` }}>
                <div className="text-[9px] font-mono uppercase tracking-widest text-white/40 mb-1.5">Daypart mix</div>
                <div className="flex gap-1.5 text-[9px]">
                  {Object.entries(util.daypart_mix).map(([k, v]: any) => (
                    <span key={k} className="flex-1 text-center py-1 rounded font-mono"
                      style={{ background: SURFACE, border: `1px solid ${BORDER}` }}>
                      <span className="block text-[8px] uppercase text-white/40">{k}</span>
                      <span className="block text-[12px] text-white font-semibold">{v}</span>
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </Card>

        {/* Row 4 — Staff + Labor */}
        <Card title="Staff Performance Today" icon={<Users className="w-3.5 h-3.5" />} className="col-span-12 lg:col-span-8" testid="zone-staff">
          <table className="w-full text-[11px]">
            <thead>
              <tr className="text-left text-white/40 text-[8px] uppercase tracking-wider">
                <th className="py-1.5">Therapist</th>
                <th>Bookings</th>
                <th>Util</th>
                <th className="text-right">Revenue</th>
                <th className="text-right">Tips</th>
                <th className="text-right">Labor</th>
              </tr>
            </thead>
            <tbody>
              {(staff?.rows || []).map((r: any) => (
                <tr key={r.id} className="border-t" style={{ borderColor: BORDER }}>
                  <td className="py-1.5">
                    <div className="text-white font-medium">{r.name}</div>
                    <div className="text-[8px] text-white/40">{(r.specialties || []).join(" · ")}</div>
                  </td>
                  <td>{r.bookings_today}</td>
                  <td><span style={{ color: pctColor(r.utilization) }}>{Math.round(r.utilization * 100)}%</span></td>
                  <td className="text-right font-mono text-white/85">${Math.round(r.revenue_today)}</td>
                  <td className="text-right text-[9px] text-white/50">${Math.round(r.tip_today)}</td>
                  <td className="text-right text-[9px] text-white/40">${Math.round(r.labor_cost_today)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {staff?.totals && (
            <div className="mt-3 pt-2 grid grid-cols-3 gap-3 text-[10px]" style={{ borderTop: `1px solid ${BORDER}` }}>
              <MiniStat label="Revenue" value={`$${Math.round(staff.totals.revenue_today)}`} />
              <MiniStat label="Labor Cost" value={`$${Math.round(staff.totals.labor_cost_today)}`} />
              <MiniStat label="Labor/Revenue" value={`${Math.round((staff.totals.labor_to_revenue_ratio || 0) * 100)}%`}
                tone={staff.totals.labor_to_revenue_ratio > 0.35 ? "warn" : "good"} />
            </div>
          )}
        </Card>

        <Card title="VIPs & In-House" icon={<Sparkles className="w-3.5 h-3.5" />} className="col-span-12 lg:col-span-4" testid="zone-guest-intel">
          <div className="text-[9px] font-mono uppercase tracking-widest text-white/40 mb-1.5">VIP Today · {intel?.counts?.vip ?? 0}</div>
          {intel?.vip_today?.length ? intel.vip_today.map((g: any, i: number) => (
            <div key={i} className="flex items-center justify-between text-[10px] py-1" style={{ borderTop: i ? `1px solid ${BORDER}` : "none" }}>
              <div>
                <div className="text-white">{g.guest}</div>
                <div className="text-[8px] text-white/40">{g.service}</div>
              </div>
              <div className="text-[9px] font-mono text-white/60">{g.time}</div>
            </div>
          )) : <div className="text-[10px] text-white/30">No VIP arrivals today.</div>}

          <div className="text-[9px] font-mono uppercase tracking-widest text-white/40 mb-1.5 mt-3 pt-3" style={{ borderTop: `1px solid ${BORDER}` }}>
            In-House · {intel?.counts?.in_house ?? 0}
          </div>
          <div className="text-[10px] text-white/55">
            {(intel?.in_house_today || []).slice(0, 5).map((g: any, i: number) => (
              <span key={i} className="inline-block mr-1.5 mb-1 px-1.5 py-0.5 rounded font-mono text-[9px]"
                style={{ background: `${ACCENT}10`, color: ACCENT, border: `1px solid ${ACCENT}25` }}>
                {g.guest} · rm {g.room}
              </span>
            ))}
          </div>

          {intel?.rebook_prompts?.length ? (
            <>
              <div className="text-[9px] font-mono uppercase tracking-widest text-white/40 mb-1.5 mt-3 pt-3" style={{ borderTop: `1px solid ${BORDER}` }}>
                Rebook prompts · {intel.rebook_prompts.length}
              </div>
              {intel.rebook_prompts.slice(0, 4).map((r: any, i: number) => (
                <div key={i} className="text-[9px] text-white/55 py-0.5">
                  {r.guest} — suggest <span style={{ color: ACCENT }}>{r.suggest}</span>
                </div>
              ))}
            </>
          ) : null}
        </Card>

        {/* Row 5 — Retail + Memberships + Reputation */}
        <Card title="Retail & Backbar" icon={<ShoppingBag className="w-3.5 h-3.5" />} className="col-span-12 md:col-span-6 lg:col-span-4" testid="zone-retail">
          <div className="space-y-1.5">
            {(retail?.items || []).map((it: any) => (
              <div key={it.id} className="flex items-center justify-between p-2 rounded" style={{ background: SURFACE, border: `1px solid ${it.low_stock ? RED + "40" : BORDER}` }}>
                <div className="flex-1">
                  <div className="text-[11px] text-white truncate">{it.name}</div>
                  <div className="text-[8px] text-white/40">Stock {it.stock} · margin {Math.round(it.margin_pct * 100)}% · 30d ${it.revenue_30d}</div>
                </div>
                {it.low_stock && <span className="text-[8px] font-mono px-1.5 py-0.5 rounded" style={{ background: `${RED}15`, color: RED, border: `1px solid ${RED}40` }}>LOW</span>}
              </div>
            ))}
          </div>
          <div className="mt-3 pt-2 grid grid-cols-2 gap-2 text-[10px]" style={{ borderTop: `1px solid ${BORDER}` }}>
            <MiniStat label="Attach rate" value={`${Math.round((retail?.attachment_rate_today ?? 0) * 100)}%`}
              tone={retail?.attachment_rate_today > 0.3 ? "good" : "warn"} />
            <MiniStat label="Retail today" value={`$${Math.round(retail?.retail_revenue_today ?? 0)}`} />
          </div>
        </Card>

        <Card title="Memberships" icon={<Heart className="w-3.5 h-3.5" />} className="col-span-12 md:col-span-6 lg:col-span-4" testid="zone-memberships">
          {members?.totals && (
            <div className="grid grid-cols-2 gap-2 mb-3">
              <MiniStat label="Active" value={members.totals.active} />
              <MiniStat label="MRR" value={`$${Math.round(members.totals.monthly_recurring_revenue)}`} tone="good" />
              <MiniStat label="Renewing 30d" value={members.totals.renewing_soon} tone="accent" />
              <MiniStat label="Overdue" value={members.totals.overdue} tone={members.totals.overdue > 0 ? "warn" : "good"} />
              <MiniStat label="Credits out" value={members.totals.liability_credits} />
              <MiniStat label="Redemption" value={`${Math.round(members.totals.redemption_rate * 100)}%`} />
            </div>
          )}
          <div className="text-[9px] font-mono uppercase tracking-widest text-white/40 mb-1">Members at risk</div>
          {(members?.members || []).filter((m: any) => {
            try { return (new Date(m.renews_at).getTime() - Date.now()) < 30 * 86400000; } catch { return false; }
          }).slice(0, 5).map((m: any) => (
            <div key={m.id} className="flex items-center justify-between text-[10px] py-0.5">
              <span className="text-white/70">{m.name}</span>
              <span className="text-[8px] font-mono text-white/40">{m.tier} · ${m.monthly_fee}/mo</span>
            </div>
          ))}
        </Card>

        <Card title="Reputation + Recovery" icon={<CheckCircle2 className="w-3.5 h-3.5" />} className="col-span-12 md:col-span-12 lg:col-span-4" testid="zone-reputation">
          {reputation && (
            <>
              <div className="flex items-center justify-between mb-2">
                <div>
                  <div className="text-[9px] font-mono uppercase tracking-widest text-white/40">NPS</div>
                  <div className="text-[28px] font-bold" style={{ color: (reputation.nps ?? 0) > 50 ? GREEN : (reputation.nps ?? 0) > 0 ? ACCENT : RED }}>
                    {reputation.nps != null ? reputation.nps : "—"}
                  </div>
                </div>
                <div className="text-[10px] text-right text-white/50">
                  <div>{reputation.promoters} promoters</div>
                  <div>{reputation.passives} passives</div>
                  <div>{reputation.detractors} detractors</div>
                </div>
              </div>
              {reputation.recovery_queue?.length > 0 && (
                <>
                  <div className="text-[9px] font-mono uppercase tracking-widest text-white/40 mt-3 mb-1.5">
                    Recovery queue · {reputation.recovery_queue.length}
                  </div>
                  {reputation.recovery_queue.slice(0, 4).map((f: any, i: number) => (
                    <div key={i} className="py-1.5 px-2 rounded mb-1" style={{ background: `${RED}08`, border: `1px solid ${RED}30` }}>
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] text-white">{f.guest_name}</span>
                        <span className="text-[9px] font-mono" style={{ color: RED }}>NPS {f.nps}</span>
                      </div>
                      {f.comment && <div className="text-[9px] text-white/55 mt-0.5 italic">"{f.comment}"</div>}
                    </div>
                  ))}
                </>
              )}
              <div className="text-[9px] font-mono uppercase tracking-widest text-white/40 mt-3 mb-1.5" style={{ borderTop: `1px solid ${BORDER}`, paddingTop: 8 }}>Latest feedback</div>
              {(reputation.feedback || []).slice(0, 3).map((f: any, i: number) => (
                <div key={i} className="flex items-start gap-2 py-1">
                  <span className="text-[9px] font-mono w-6 shrink-0"
                    style={{ color: f.nps >= 9 ? GREEN : f.nps >= 7 ? ACCENT : RED }}>{f.nps}</span>
                  <span className="text-[9px] text-white/55 flex-1 italic">{f.comment || <span className="opacity-50">no comment</span>}</span>
                </div>
              ))}
            </>
          )}
        </Card>
      </div>
    </div>
  );
}

/* ─────────────────────────────── UI helpers ─────────────────────────────── */
function KpiCard({ icon, label, value, sub, tone = "accent", className, testid }: any) {
  const color = tone === "green" ? GREEN : tone === "warn" ? AMBER : tone === "bad" ? RED : ACCENT;
  return (
    <div className={`rounded-xl p-4 ${className || ""}`} style={{ background: "linear-gradient(145deg, #0b1020 0%, #080b14 100%)", border: `1px solid ${BORDER}` }} data-testid={testid}>
      <div className="flex items-center gap-2 mb-2">
        <span style={{ color }}>{icon}</span>
        <span className="text-[9px] font-mono uppercase tracking-widest" style={{ color: `${color}99` }}>{label}</span>
      </div>
      <div className="text-[26px] font-bold tracking-tight" style={{ color: "#ffffff" }}>{value}</div>
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

function UtilizationRow({ label, sub, value, bookings }: { label: string; sub: string; value: number; bookings?: number }) {
  const pct = Math.round(value * 100);
  return (
    <div>
      <div className="flex items-center justify-between text-[10px] mb-0.5">
        <span className="text-white/85 font-medium">{label}</span>
        <span className="font-mono" style={{ color: pctColor(value) }}>
          {pct}%{typeof bookings === "number" ? ` · ${bookings} bk` : ""}
        </span>
      </div>
      <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.05)" }}>
        <div className="h-full transition-all" style={{ width: `${pct}%`, background: pctColor(value) }} />
      </div>
      <div className="text-[8px] text-white/30 mt-0.5">{sub}</div>
    </div>
  );
}

function MiniStat({ label, value, tone }: { label: string; value: any; tone?: string }) {
  const color = tone === "good" ? GREEN : tone === "warn" ? AMBER : tone === "bad" ? RED : ACCENT;
  return (
    <div className="rounded-md px-2 py-1.5" style={{ background: SURFACE, border: `1px solid ${BORDER}` }}>
      <div className="text-[8px] uppercase tracking-widest font-mono text-white/40">{label}</div>
      <div className="text-[13px] font-semibold mt-0.5" style={{ color }}>{value}</div>
    </div>
  );
}

function SparkBars({ points }: { points: any[] }) {
  const max = Math.max(...points.map((p: any) => p.revenue || 0), 1);
  return (
    <div className="flex items-end gap-1 h-32">
      {points.map((p: any, i: number) => {
        const h = Math.max(4, (p.revenue / max) * 100);
        const isToday = p.date === new Date().toISOString().slice(0, 10);
        return (
          <div key={i} className="flex-1 flex flex-col items-center justify-end gap-1 relative group">
            <div className="absolute -top-4 opacity-0 group-hover:opacity-100 transition-opacity text-[8px] font-mono text-white/80 whitespace-nowrap">
              ${Math.round(p.revenue)}
            </div>
            <div className="w-full rounded-sm transition-all"
              style={{
                height: `${h}%`,
                background: isToday ? ACCENT : `${ACCENT}40`,
                boxShadow: isToday ? `0 0 12px ${ACCENT}50` : undefined,
              }} />
            <div className="text-[7px] font-mono text-white/30 -rotate-45 origin-center mt-2">
              {p.date.slice(5)}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function Empty({ note }: { note: string }) {
  return <div className="text-[10px] text-white/40 text-center py-4">{note}</div>;
}

function pctTone(v: number | undefined, good: number, bad: number) {
  if (v == null) return "accent";
  if (v < bad) return "bad";
  if (v < good) return "warn";
  return "green";
}
function pctColor(v: number) {
  if (v >= 0.7) return GREEN; if (v >= 0.4) return ACCENT; if (v >= 0.2) return AMBER; return RED;
}
function sevBorder(s: string) {
  if (s === "high") return `${RED}40`; if (s === "warn") return `${AMBER}40`; return BORDER;
}
