/**
 * FOHCommandDashboard — 3 role layers (Director · GM · Dining Room Mgr)
 * Driven by /api/foh-ops
 */
import React, { useEffect, useState } from "react";
import { ChefHat, TrendingUp, Users, AlertTriangle, RefreshCw, Wine, Gauge, Star } from "lucide-react";
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

type Role = "director" | "gm" | "dining_mgr";

export default function FOHCommandDashboard() {
  const [role, setRole] = useState<Role>("director");
  const [outlets, setOutlets] = useState<any>(null);
  const [selectedOutlet, setSelectedOutlet] = useState<string>("pier-top");
  const [kpis, setKpis] = useState<any>(null);
  const [director, setDirector] = useState<any>(null);
  const [gmView, setGmView] = useState<any>(null);
  const [floor, setFloor] = useState<any>(null);
  const [bev, setBev] = useState<any>(null);
  const [ai3, setAi3] = useState<any>(null);
  const [lastRefresh, setLastRefresh] = useState("");

  const load = async () => {
    try {
      const [k, d, b, a] = await Promise.all([
        fetch(`${API}/api/foh-ops/kpis`).then(r => r.json()),
        fetch(`${API}/api/foh-ops/director`).then(r => r.json()),
        fetch(`${API}/api/foh-ops/beverage-performance`).then(r => r.json()),
        fetch(`${API}/api/intelligence/ai3/foh`).then(r => r.json()),
      ]);
      setKpis(k); setDirector(d); setBev(b); setAi3(a);
      if (!outlets) setOutlets(await fetch(`${API}/api/foh-ops/outlets`).then(r => r.json()));
      if (role === "gm" && selectedOutlet) {
        setGmView(await fetch(`${API}/api/foh-ops/outlet/${selectedOutlet}`).then(r => r.json()));
      }
      if (role === "dining_mgr" && selectedOutlet) {
        setFloor(await fetch(`${API}/api/foh-ops/outlet/${selectedOutlet}/floor`).then(r => r.json()));
      }
      setLastRefresh(new Date().toLocaleTimeString());
    } catch {}
  };

  useEffect(() => {
    fetch(`${API}/api/foh-ops/seed`, { method: "POST" }).then(() => load());
    const iv = setInterval(load, 120_000);
    return () => clearInterval(iv);
  }, []);

  useEffect(() => { load(); /* eslint-disable-line */ }, [role, selectedOutlet]);

  useLiveEvents(["foh.", "concierge.", "eng.", "hskp."], () => load());

  return (
    <div className="h-full flex flex-col overflow-hidden" style={{ background: "#04060d", color: "#e2e8f0" }} data-testid="foh-command-dashboard">
      <div className="flex items-center justify-between px-4 sm:px-6 py-4 border-b flex-wrap gap-2" style={{ borderColor: BORDER, background: "#0b1020" }}>
        <div>
          <div className="text-[10px] font-mono uppercase tracking-[0.25em]" style={{ color: `${ACCENT}99` }}>FOH Service</div>
          <div className="text-[22px] font-semibold text-white mt-0.5 tracking-tight">Command Dashboard</div>
          <div className="text-[10px] text-white/40 mt-0.5">
            Multi-outlet service execution · Director / GM / Dining Room Manager · refreshes every 2 min
            {lastRefresh && <span className="ml-2">· last {lastRefresh}</span>}
          </div>
        </div>
        <div className="flex gap-2 items-center">
          {/* Role selector */}
          <div className="flex gap-0 rounded overflow-hidden" style={{ border: `1px solid ${BORDER}` }}>
            {(["director", "gm", "dining_mgr"] as Role[]).map(r => (
              <button
                key={r}
                onClick={() => setRole(r)}
                className="px-3 py-1.5 text-[10px] font-medium uppercase"
                style={{ background: role === r ? `${ACCENT}22` : "transparent", color: role === r ? ACCENT : "#94a3b8" }}
                data-testid={`role-${r}`}
              >
                {r.replace("_", " ")}
              </button>
            ))}
          </div>
          {role !== "director" && (
            <select value={selectedOutlet} onChange={e => setSelectedOutlet(e.target.value)}
              className="px-2 py-1.5 text-[10px] rounded"
              style={{ background: "rgba(0,0,0,0.4)", border: `1px solid ${BORDER}`, color: "white" }}
              data-testid="outlet-select">
              {(outlets?.items || []).map((o: any) => (
                <option key={o.slug} value={o.slug}>{o.name}</option>
              ))}
            </select>
          )}
          <button onClick={load} className="flex items-center gap-1.5 px-3 py-1.5 rounded text-[10px] font-medium"
            style={{ background: `${ACCENT}12`, color: ACCENT, border: `1px solid ${ACCENT}30` }}
            data-testid="foh-refresh">
            <RefreshCw size={12} /> Refresh
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        {kpis && (
          <div className="grid grid-cols-6 gap-3" data-testid="foh-kpi-grid">
            <Card label="Revenue 24h" value={`$${fmt(kpis.total_revenue_24h, 0)}`} tone="good" testid="foh-kpi-revenue" />
            <Card label="Covers/hr" value={fmt(kpis.covers_per_hour, 1)} testid="foh-kpi-coverhr" />
            <Card label="Check Avg" value={`$${fmt(kpis.check_average, 0)}`} testid="foh-kpi-check" />
            <Card label="Turn Time" value={`${fmt(kpis.avg_turn_time_minutes, 0)}m`} testid="foh-kpi-turn" />
            <Card label="Bev Attach" value={`${fmt(kpis.beverage_attachment_pct, 1)}%`} tone={kpis.beverage_attachment_pct > 60 ? "good" : "warn"} testid="foh-kpi-bev" />
            <Card label="Dessert Attach" value={`${fmt(kpis.dessert_attachment_pct, 1)}%`} testid="foh-kpi-dessert" />
          </div>
        )}

        {/* AI³ Insights */}
        {ai3 && ai3.insights?.length > 0 && (
          <div className="rounded-lg p-3" style={{ background: `${AMBER}10`, border: `1px solid ${AMBER}40` }} data-testid="foh-ai3-insights">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle size={14} style={{ color: AMBER }} />
              <div className="text-[11px] font-semibold uppercase tracking-[0.2em]" style={{ color: AMBER }}>EchoAi³ Insights</div>
            </div>
            {ai3.insights.map((i: any, idx: number) => (
              <div key={idx} className="py-1.5 border-b border-white/5">
                <div className="text-[11px] text-white">{i.headline}</div>
                <div className="text-[9px]" style={{ color: "#94a3b8" }}>{i.action} · cross-module: {(i.cross_module || []).join(", ")}</div>
              </div>
            ))}
          </div>
        )}

        {role === "director" && director && (
          <>
            <div className="rounded-lg p-3" style={{ background: SURFACE, border: `1px solid ${BORDER}` }} data-testid="director-outlet-ranking">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp size={14} style={{ color: ACCENT }} />
                <div className="text-[11px] font-semibold uppercase tracking-[0.2em]" style={{ color: ACCENT }}>Outlet Performance · 24h</div>
              </div>
              <table className="w-full text-[10px]">
                <thead><tr className="text-left border-b border-white/10" style={{ color: "#94a3b8" }}>
                  <th className="py-1">Outlet</th><th>Covers</th><th>Revenue</th><th>Rev/Seat</th><th>Check Avg</th><th>Bev %</th>
                </tr></thead>
                <tbody>
                  {director.outlet_ranking.map((o: any) => (
                    <tr key={o.outlet_slug} className="border-b border-white/5">
                      <td className="py-1 text-white">{o.outlet_name}{o.vip_outlet && <Star size={10} style={{ color: AMBER, display: "inline", marginLeft: 4 }} />}</td>
                      <td>{o.covers_24h}</td>
                      <td style={{ color: GREEN }}>${fmt(o.revenue_24h, 0)}</td>
                      <td>${fmt(o.revenue_per_seat, 1)}</td>
                      <td>${fmt(o.check_avg, 0)}</td>
                      <td style={{ color: o.bev_attach_pct > 60 ? GREEN : AMBER }}>{o.bev_attach_pct}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="rounded-lg p-3" style={{ background: SURFACE, border: `1px solid ${BORDER}` }} data-testid="director-vip-arrivals">
                <div className="flex items-center gap-2 mb-2">
                  <Star size={14} style={{ color: AMBER }} />
                  <div className="text-[11px] font-semibold uppercase tracking-[0.2em]" style={{ color: ACCENT }}>VIP Arrivals</div>
                </div>
                {(director.vip_arrivals || []).length === 0 && <div className="text-[10px]" style={{ color: "#64748b" }}>None scheduled.</div>}
                {(director.vip_arrivals || []).map((r: any) => (
                  <div key={r.id} className="py-1 border-b border-white/5 flex justify-between text-[10px]">
                    <span className="text-white">{r.guest_name} · party {r.party_size}</span>
                    <span style={{ color: ACCENT }}>{r.outlet_slug} · {new Date(r.eta).toLocaleTimeString()}</span>
                  </div>
                ))}
              </div>

              <div className="rounded-lg p-3" style={{ background: SURFACE, border: `1px solid ${BORDER}` }} data-testid="director-bottlenecks">
                <div className="flex items-center gap-2 mb-2">
                  <AlertTriangle size={14} style={{ color: AMBER }} />
                  <div className="text-[11px] font-semibold uppercase tracking-[0.2em]" style={{ color: ACCENT }}>Cross-Outlet Bottlenecks</div>
                </div>
                {(director.top_bottlenecks || []).map((b: any) => (
                  <div key={b.outlet_slug} className="py-1 border-b border-white/5 flex justify-between text-[10px]">
                    <span className="text-white">{b.outlet_slug}</span>
                    <span style={{ color: AMBER }}>+{b.avg_variance_min}m ticket variance</span>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        {role === "gm" && gmView && (
          <>
            <div className="grid grid-cols-4 gap-3">
              <Card label="Covers Forecast" value={gmView.covers_forecast} testid="gm-covers" />
              <Card label="Projected Turns" value={fmt(gmView.projected_turns, 1)} testid="gm-turns" />
              <Card label="Avg Turn" value={`${fmt(gmView.avg_turn_time, 0)}m`} testid="gm-turn-time" />
              <Card label="Bev Attach" value={`${gmView.bev_attach_pct}%`} tone={gmView.bev_attach_pct > 55 ? "good" : "warn"} testid="gm-bev" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="rounded-lg p-3" style={{ background: SURFACE, border: `1px solid ${BORDER}` }} data-testid="gm-section-load">
                <div className="text-[11px] font-semibold uppercase tracking-[0.2em] mb-2" style={{ color: ACCENT }}>Section Load</div>
                {gmView.section_load.map((s: any) => (
                  <div key={s.server} className="py-1 border-b border-white/5 flex justify-between text-[10px]">
                    <span className="text-white">{s.server}</span>
                    <span style={{ color: s.overload ? RED : "#94a3b8" }}>{s.tables} tables · ${fmt(s.sales_today, 0)} · {s.bev_attach_pct}%</span>
                  </div>
                ))}
              </div>
              <div className="rounded-lg p-3" style={{ background: SURFACE, border: `1px solid ${BORDER}` }} data-testid="gm-allergies">
                <div className="text-[11px] font-semibold uppercase tracking-[0.2em] mb-2" style={{ color: ACCENT }}>Allergy Alerts</div>
                {(gmView.allergy_alerts || []).length === 0 && <div className="text-[10px]" style={{ color: "#64748b" }}>None.</div>}
                {(gmView.allergy_alerts || []).map((r: any) => (
                  <div key={r.id} className="py-1 border-b border-white/5 text-[10px]">
                    <span className="text-white">{r.guest_name}</span>
                    <span className="ml-2" style={{ color: AMBER }}>{(r.allergy_flags || []).join(", ")}</span>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        {role === "dining_mgr" && floor && (
          <>
            <div className="grid grid-cols-3 gap-3">
              <Card label="Arrivals 15 min" value={(floor.arrivals_15min || []).length} tone="warn" testid="dm-arr15" />
              <Card label="Arrivals 30 min" value={(floor.arrivals_30min || []).length} testid="dm-arr30" />
              <Card label="Arrivals 60 min" value={(floor.arrivals_60min || []).length} testid="dm-arr60" />
            </div>
            <div className="rounded-lg p-3" style={{ background: SURFACE, border: `1px solid ${BORDER}` }} data-testid="dm-recent-tickets">
              <div className="text-[11px] font-semibold uppercase tracking-[0.2em] mb-2" style={{ color: ACCENT }}>Recent Ticket Timings</div>
              <table className="w-full text-[10px]">
                <thead><tr className="text-left border-b border-white/10" style={{ color: "#94a3b8" }}>
                  <th className="py-1">Table</th><th>App</th><th>Entrée</th><th>Dessert</th><th>Total</th><th>Variance</th>
                </tr></thead>
                <tbody>
                  {(floor.recent_tickets || []).map((t: any) => (
                    <tr key={t.id} className="border-b border-white/5">
                      <td className="py-1 text-white">{t.table_no}</td>
                      <td>{t.app_minutes}m</td>
                      <td>{t.entree_minutes}m</td>
                      <td>{t.dessert_minutes}m</td>
                      <td>{t.total_minutes}m</td>
                      <td style={{ color: t.ticket_time_variance > 3 ? RED : t.ticket_time_variance < -2 ? GREEN : "#94a3b8" }}>
                        {t.ticket_time_variance > 0 ? "+" : ""}{t.ticket_time_variance}m
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}

        {/* Beverage always */}
        {bev && (
          <div className="rounded-lg p-3" style={{ background: SURFACE, border: `1px solid ${BORDER}` }} data-testid="bev-performance">
            <div className="flex items-center gap-2 mb-2">
              <Wine size={14} style={{ color: ACCENT }} />
              <div className="text-[11px] font-semibold uppercase tracking-[0.2em]" style={{ color: ACCENT }}>Beverage Performance · 24h · ${fmt(bev.total_revenue, 0)}</div>
            </div>
            <div className="grid grid-cols-6 gap-2 mb-3">
              {Object.entries(bev.by_category || {}).map(([c, v]: any) => (
                <div key={c} className="rounded p-2 text-[10px]" style={{ background: "rgba(0,0,0,0.3)" }}>
                  <div style={{ color: "#94a3b8" }}>{c.replace("_", " ")}</div>
                  <div className="text-white font-semibold">${fmt(v.revenue, 0)}</div>
                  <div style={{ color: "#64748b" }}>{v.qty} units</div>
                </div>
              ))}
            </div>
            <div className="text-[9px] uppercase mb-1" style={{ color: "#94a3b8" }}>Top servers</div>
            {(bev.server_ranking || []).slice(0, 5).map((s: any) => (
              <div key={s.server_id} className="py-1 border-b border-white/5 flex justify-between text-[10px]">
                <span className="text-white">{s.name}</span>
                <span style={{ color: ACCENT }}>${fmt(s.revenue, 0)} · {s.paired} paired</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
