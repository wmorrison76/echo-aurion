import React, { useState, useEffect } from "react";
import {
  BarChart3, TrendingUp, AlertTriangle, DollarSign, Star,
  ArrowUpRight, ArrowDownRight, UtensilsCrossed, Store,
} from "lucide-react";

const API = window.location.origin;
const GET = (p: string) => fetch(`${API}/api/pos-analytics${p}`).then(r => r.json());

const FONT = { fontFamily: "'IBM Plex Sans', system-ui, sans-serif" };
const MONO = { fontFamily: "'IBM Plex Mono', monospace" };
const BG = "#04060d";
const SURFACE = "rgba(255,255,255,0.025)";
const BORDER = "rgba(255,255,255,0.06)";
const ACCENT = "#c8a97e";

const Q_COLORS: Record<string, string> = { star: "#22c55e", puzzle: "#f59e0b", plowhorse: "#3b82f6", dog: "#ef4444" };
const Q_LABELS: Record<string, string> = { star: "Star", puzzle: "Puzzle", plowhorse: "Plowhorse", dog: "Dog" };

type View = "overview" | "items" | "alerts";

export default function POSMenuAnalytics() {
  const [data, setData] = useState<any>(null);
  const [outlets, setOutlets] = useState<any[]>([]);
  const [alerts, setAlerts] = useState<any[]>([]);
  const [selectedOutlet, setSelectedOutlet] = useState<string>("");
  const [view, setView] = useState<View>("overview");

  useEffect(() => {
    Promise.all([
      GET("/menu-items"),
      GET("/outlets"),
      GET("/profit-alerts"),
    ]).then(([d, o, a]) => {
      setData(d);
      setOutlets(o?.outlets || []);
      setAlerts(a?.alerts || []);
    });
  }, []);

  useEffect(() => {
    if (selectedOutlet) {
      GET(`/menu-items?outlet=${encodeURIComponent(selectedOutlet)}`).then(setData);
    } else {
      GET("/menu-items").then(setData);
    }
  }, [selectedOutlet]);

  if (!data) return <div style={{ ...FONT, background: BG, color: "#e2e8f0" }} className="flex items-center justify-center h-full text-sm">Loading analytics...</div>;

  const s = data.summary || {};
  const items = data.items || [];
  const VIEWS = [
    { id: "overview" as View, label: "Overview" },
    { id: "items" as View, label: "All Items" },
    { id: "alerts" as View, label: `Alerts (${alerts.length})` },
  ];

  return (
    <div data-testid="pos-menu-analytics" className="flex flex-col h-full overflow-hidden" style={{ ...FONT, background: BG, color: "#e2e8f0" }}>
      {/* Header */}
      <div className="flex items-center gap-4 px-5 py-2.5" style={{ borderBottom: `1px solid ${BORDER}` }}>
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-md flex items-center justify-center" style={{ background: "rgba(200,169,126,0.1)", border: "1px solid rgba(200,169,126,0.25)" }}>
            <BarChart3 className="w-4 h-4" style={{ color: ACCENT }} />
          </div>
          <div>
            <div className="text-[13px] font-semibold text-white">MENU PERFORMANCE ANALYTICS</div>
            <div className="text-[9px] tracking-[0.15em] uppercase" style={{ ...MONO, color: `${ACCENT}80` }}>
              Active POS Items | Yield-Based Costing | Live Sales Data
            </div>
          </div>
        </div>
        {/* Outlet filter */}
        <select value={selectedOutlet} onChange={e => setSelectedOutlet(e.target.value)}
          className="text-[10px] px-2 py-1 rounded-md border-0 outline-none"
          style={{ background: SURFACE, color: ACCENT, border: `1px solid ${BORDER}` }}
          data-testid="outlet-filter">
          <option value="">All Outlets</option>
          {outlets.map(o => <option key={o.outlet} value={o.outlet}>{o.outlet} ({o.items} items)</option>)}
        </select>
        <div className="flex-1" />
        <div className="flex items-center gap-0.5 p-0.5 rounded-lg" style={{ background: SURFACE, border: `1px solid ${BORDER}` }}>
          {VIEWS.map(v => (
            <button key={v.id} onClick={() => setView(v.id)} data-testid={`analytics-view-${v.id}`}
              className="px-2.5 py-1.5 rounded-md text-[10px] font-medium transition-all"
              style={{
                background: view === v.id ? `${ACCENT}10` : "transparent",
                color: view === v.id ? ACCENT : "rgba(148,163,184,0.5)",
                border: view === v.id ? `1px solid ${ACCENT}25` : "1px solid transparent",
              }}>
              {v.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-auto scrollbar-hide">
        {/* OVERVIEW */}
        {view === "overview" && (
          <div className="p-4 space-y-4">
            {/* KPI cards */}
            <div className="grid grid-cols-6 gap-2">
              <KPI label="Total Revenue" value={`$${(s.total_revenue / 1000).toFixed(0)}K`} color="#22c55e" />
              <KPI label="Total Profit" value={`$${(s.total_profit / 1000).toFixed(0)}K`} color={ACCENT} />
              <KPI label="Avg FC%" value={`${s.avg_food_cost_pct}%`} color={s.avg_food_cost_pct > 32 ? "#ef4444" : "#22c55e"} />
              <KPI label="Avg CM" value={`$${s.avg_contribution_margin?.toFixed(0)}`} color="#3b82f6" />
              <KPI label="Items" value={s.total_items} color="rgba(148,163,184,0.6)" />
              <KPI label="Alerts" value={alerts.length} color={alerts.length > 0 ? "#f59e0b" : "#22c55e"} />
            </div>

            {/* Quadrant summary */}
            <div className="grid grid-cols-4 gap-2">
              {(["star", "puzzle", "plowhorse", "dog"] as const).map(q => (
                <div key={q} className="p-3 rounded-lg" style={{ background: SURFACE, border: `1px solid ${BORDER}` }}>
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-2 h-2 rounded-full" style={{ background: Q_COLORS[q] }} />
                    <span className="text-[11px] font-semibold uppercase" style={{ color: Q_COLORS[q] }}>{Q_LABELS[q]}s</span>
                    <span className="text-lg font-mono font-bold text-white ml-auto">{s[`${q}s`] || 0}</span>
                  </div>
                  <div className="space-y-0.5">
                    {items.filter((i: any) => i.quadrant === q).slice(0, 3).map((i: any, idx: number) => (
                      <div key={idx} className="text-[9px] text-white/50 truncate">{i.name}</div>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {/* Top items table */}
            <div>
              <div className="text-[10px] font-mono uppercase tracking-[0.15em] mb-2" style={{ color: `${ACCENT}60` }}>TOP REVENUE ITEMS</div>
              <div className="rounded-lg overflow-hidden" style={{ border: `1px solid ${BORDER}` }}>
                <table className="w-full text-[10px]">
                  <thead>
                    <tr style={{ background: "rgba(0,0,0,0.3)" }}>
                      <th className="px-3 py-2 text-left" style={{ color: "rgba(148,163,184,0.5)" }}>#</th>
                      <th className="px-3 py-2 text-left" style={{ color: "rgba(148,163,184,0.5)" }}>Item</th>
                      <th className="px-3 py-2 text-center" style={{ color: "rgba(148,163,184,0.5)" }}>Outlet</th>
                      <th className="px-3 py-2 text-right" style={{ color: "rgba(148,163,184,0.5)" }}>Price</th>
                      <th className="px-3 py-2 text-right" style={{ color: "rgba(148,163,184,0.5)" }}>FC%</th>
                      <th className="px-3 py-2 text-right" style={{ color: "rgba(148,163,184,0.5)" }}>CM</th>
                      <th className="px-3 py-2 text-right" style={{ color: "rgba(148,163,184,0.5)" }}>Sold</th>
                      <th className="px-3 py-2 text-right" style={{ color: "rgba(148,163,184,0.5)" }}>Revenue</th>
                      <th className="px-3 py-2 text-center" style={{ color: "rgba(148,163,184,0.5)" }}>Class</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.slice(0, 15).map((item: any, i: number) => (
                      <tr key={i} className="hover:bg-white/[0.02] transition-colors" style={{ borderBottom: `1px solid rgba(255,255,255,0.02)` }}>
                        <td className="px-3 py-2 text-white/30">{i + 1}</td>
                        <td className="px-3 py-2 font-medium text-white">{item.name}</td>
                        <td className="px-3 py-2 text-center"><span className="px-1.5 py-0.5 rounded text-[8px]" style={{ background: "rgba(255,255,255,0.03)", color: "rgba(148,163,184,0.6)" }}>{item.outlet}</span></td>
                        <td className="px-3 py-2 text-right font-mono text-white">${item.price}</td>
                        <td className="px-3 py-2 text-right font-mono" style={{ color: item.food_cost_pct > 35 ? "#ef4444" : item.food_cost_pct > 28 ? "#f59e0b" : "#22c55e" }}>{item.food_cost_pct}%</td>
                        <td className="px-3 py-2 text-right font-mono" style={{ color: ACCENT }}>${item.contribution_margin}</td>
                        <td className="px-3 py-2 text-right font-mono text-white">{item.units_sold}</td>
                        <td className="px-3 py-2 text-right font-mono font-semibold" style={{ color: "#22c55e" }}>${item.total_revenue.toLocaleString()}</td>
                        <td className="px-3 py-2 text-center">
                          <span className="px-1.5 py-0.5 rounded text-[8px] font-semibold uppercase" style={{ background: `${Q_COLORS[item.quadrant]}10`, color: Q_COLORS[item.quadrant], border: `1px solid ${Q_COLORS[item.quadrant]}20` }}>
                            {item.quadrant}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ALL ITEMS */}
        {view === "items" && (
          <div className="p-4">
            <div className="text-[10px] font-mono uppercase tracking-[0.15em] mb-2" style={{ color: `${ACCENT}60` }}>ALL ACTIVE MENU ITEMS ({items.length})</div>
            <div className="rounded-lg overflow-hidden" style={{ border: `1px solid ${BORDER}` }}>
              <table className="w-full text-[10px]">
                <thead>
                  <tr style={{ background: "rgba(0,0,0,0.3)" }}>
                    <th className="px-3 py-2 text-left" style={{ color: "rgba(148,163,184,0.5)" }}>Item</th>
                    <th className="px-2 py-2 text-center" style={{ color: "rgba(148,163,184,0.5)" }}>Outlet</th>
                    <th className="px-2 py-2 text-center" style={{ color: "rgba(148,163,184,0.5)" }}>Category</th>
                    <th className="px-2 py-2 text-right" style={{ color: "rgba(148,163,184,0.5)" }}>Price</th>
                    <th className="px-2 py-2 text-right" style={{ color: "rgba(148,163,184,0.5)" }}>Food Cost</th>
                    <th className="px-2 py-2 text-right" style={{ color: "rgba(148,163,184,0.5)" }}>FC%</th>
                    <th className="px-2 py-2 text-right" style={{ color: "rgba(148,163,184,0.5)" }}>CM</th>
                    <th className="px-2 py-2 text-right" style={{ color: "rgba(148,163,184,0.5)" }}>Units</th>
                    <th className="px-2 py-2 text-right" style={{ color: "rgba(148,163,184,0.5)" }}>Revenue</th>
                    <th className="px-2 py-2 text-right" style={{ color: "rgba(148,163,184,0.5)" }}>Profit</th>
                    <th className="px-2 py-2 text-center" style={{ color: "rgba(148,163,184,0.5)" }}>Class</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item: any, i: number) => (
                    <tr key={i} className="hover:bg-white/[0.02]" style={{ borderBottom: `1px solid rgba(255,255,255,0.02)` }}>
                      <td className="px-3 py-1.5 font-medium text-white text-[9px]">{item.name}</td>
                      <td className="px-2 py-1.5 text-center text-[8px] text-white/40">{item.outlet}</td>
                      <td className="px-2 py-1.5 text-center text-[8px] text-white/40">{item.category}</td>
                      <td className="px-2 py-1.5 text-right font-mono text-white">${item.price}</td>
                      <td className="px-2 py-1.5 text-right font-mono text-white/60">${item.food_cost}</td>
                      <td className="px-2 py-1.5 text-right font-mono" style={{ color: item.food_cost_pct > 35 ? "#ef4444" : "#22c55e" }}>{item.food_cost_pct}%</td>
                      <td className="px-2 py-1.5 text-right font-mono" style={{ color: ACCENT }}>${item.contribution_margin}</td>
                      <td className="px-2 py-1.5 text-right font-mono text-white">{item.units_sold}</td>
                      <td className="px-2 py-1.5 text-right font-mono" style={{ color: "#22c55e" }}>${item.total_revenue.toLocaleString()}</td>
                      <td className="px-2 py-1.5 text-right font-mono" style={{ color: ACCENT }}>${item.total_profit.toLocaleString()}</td>
                      <td className="px-2 py-1.5 text-center">
                        <span className="px-1 py-0.5 rounded text-[7px] font-bold uppercase" style={{ color: Q_COLORS[item.quadrant] }}>{item.quadrant}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ALERTS */}
        {view === "alerts" && (
          <div className="p-4 space-y-2" data-testid="analytics-alerts">
            <div className="text-[10px] font-mono uppercase tracking-[0.15em] mb-2" style={{ color: `${ACCENT}60` }}>PROFIT ALERTS ({alerts.length})</div>
            {alerts.length === 0 ? (
              <div className="text-center py-8 text-white/30 text-sm">No alerts — all items within target thresholds</div>
            ) : alerts.map((a: any, i: number) => (
              <div key={i} className="flex items-center gap-3 px-4 py-3 rounded-lg" style={{
                background: a.alert_type === "high_food_cost" ? "rgba(239,68,68,0.03)" : a.alert_type === "low_margin" ? "rgba(245,158,11,0.03)" : SURFACE,
                border: `1px solid ${a.alert_type === "high_food_cost" ? "rgba(239,68,68,0.1)" : BORDER}`,
              }}>
                <AlertTriangle className="w-4 h-4 shrink-0" style={{ color: a.alert_type === "high_food_cost" ? "#ef4444" : "#f59e0b" }} />
                <div className="flex-1 min-w-0">
                  <div className="text-[11px] font-medium text-white">{a.name} <span className="text-white/40">({a.outlet})</span></div>
                  <div className="text-[9px] text-white/50">{a.message}</div>
                </div>
                <div className="text-right shrink-0">
                  <div className="text-[10px] font-mono" style={{ color: a.food_cost_pct > 35 ? "#ef4444" : "#f59e0b" }}>FC: {a.food_cost_pct}%</div>
                  <div className="text-[9px] font-mono text-white/40">${a.price} | {a.units_sold} sold</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function KPI({ label, value, color }: { label: string; value: any; color: string }) {
  return (
    <div className="p-3 rounded-lg" style={{ background: SURFACE, border: `1px solid ${BORDER}` }}>
      <div className="text-[9px] font-mono uppercase tracking-wider text-white/40 mb-1">{label}</div>
      <div className="text-lg font-mono font-bold" style={{ color }}>{value}</div>
    </div>
  );
}
