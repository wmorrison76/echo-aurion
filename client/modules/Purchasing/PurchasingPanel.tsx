import React, { useState, useEffect, useCallback } from "react";
import {
  ShoppingCart, DollarSign, AlertTriangle, TrendingUp, Search,
  Calendar, Utensils, Check, Clock, FileText, Package, RefreshCw,
} from "lucide-react";

const API = window.location.origin;
const GET = (p: string) => fetch(`${API}/api/purchasing${p}`).then(r => r.json());
const POST = (p: string, b: any = {}) =>
  fetch(`${API}/api/purchasing${p}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(b) }).then(r => r.json());

const FONT = { fontFamily: "'IBM Plex Sans', system-ui, sans-serif" };
const MONO = { fontFamily: "'IBM Plex Mono', monospace" };
const BG = "#04060d";
const SURFACE = "rgba(255,255,255,0.025)";
const BORDER = "rgba(255,255,255,0.06)";
const ACCENT = "#c8a97e";
const PR_COLOR = "#14b8a6";

type Tab = "prep-list" | "dashboard" | "requisitions";

export default function PurchasingPanel() {
  const [tab, setTab] = useState<Tab>("dashboard");
  const [dashboard, setDashboard] = useState<any>(null);
  const [prepList, setPrepList] = useState<any>(null);
  const [requisitions, setRequisitions] = useState<any[]>([]);
  const [selectedDate, setSelectedDate] = useState("2026-04-13");
  const [selectedOutlet, setSelectedOutlet] = useState("");

  useEffect(() => { GET("/dashboard").then(setDashboard); }, []);

  const loadPrepList = useCallback(async () => {
    let url = `/prep-list?date=${selectedDate}`;
    if (selectedOutlet) url += `&outlet=${encodeURIComponent(selectedOutlet)}`;
    const d = await GET(url);
    setPrepList(d);
  }, [selectedDate, selectedOutlet]);

  useEffect(() => { if (tab === "prep-list") loadPrepList(); }, [tab, loadPrepList]);
  useEffect(() => { if (tab === "requisitions") GET("/requisitions").then(d => setRequisitions(d.requisitions || [])); }, [tab]);

  const createPR = useCallback(async () => {
    if (!prepList) return;
    const items = prepList.prep_list.map((i: any) => ({ ingredient: i.ingredient, qty: i.total_qty, unit: i.unit, cost: i.total_cost }));
    await POST("/requisition", { date: selectedDate, outlet: selectedOutlet || "all", items, total_cost: prepList.total_cost });
    GET("/requisitions").then(d => setRequisitions(d.requisitions || []));
    setTab("requisitions");
  }, [prepList, selectedDate, selectedOutlet]);

  const TABS: { id: Tab; label: string; icon: any }[] = [
    { id: "dashboard", label: "Dashboard", icon: TrendingUp },
    { id: "prep-list", label: "Prep List", icon: FileText },
    { id: "requisitions", label: "Requisitions", icon: ShoppingCart },
  ];

  return (
    <div className="flex flex-col h-full overflow-hidden" style={{ ...FONT, background: BG, color: "#e2e8f0" }} data-testid="purchasing-panel">
      <div style={{ borderBottom: `1px solid ${BORDER}` }}>
        <div className="flex items-center gap-4 px-5 py-2.5">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-md flex items-center justify-center" style={{ background: "rgba(20,184,166,0.1)", border: "1px solid rgba(20,184,166,0.25)" }}>
              <ShoppingCart className="w-4 h-4" style={{ color: PR_COLOR }} />
            </div>
            <div>
              <div className="text-[13px] font-semibold text-white">PURCHASING REQUISITION ENGINE</div>
              <div className="text-[9px] tracking-[0.15em] uppercase" style={{ ...MONO, color: "rgba(20,184,166,0.5)" }}>Forecast-Driven Prep | Shortage Alerts | Purchase Orders</div>
            </div>
          </div>
          <div className="flex-1" />
          <div className="flex items-center gap-0.5 p-0.5 rounded-lg" style={{ background: SURFACE, border: `1px solid ${BORDER}` }}>
            {TABS.map(t => (
              <button key={t.id} onClick={() => setTab(t.id)} data-testid={`pr-tab-${t.id}`}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-md text-[10px] font-medium transition-all"
                style={{ background: tab === t.id ? "rgba(20,184,166,0.08)" : "transparent", color: tab === t.id ? PR_COLOR : "rgba(148,163,184,0.5)", border: tab === t.id ? "1px solid rgba(20,184,166,0.15)" : "1px solid transparent" }}>
                <t.icon className="w-3 h-3" />{t.label}
              </button>
            ))}
          </div>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto">
        {tab === "dashboard" && dashboard && (
          <div className="p-4" data-testid="pr-dashboard">
            <div className="grid grid-cols-4 gap-3 mb-4">
              <SC label="7-Day Food Cost" value={`$${(dashboard.weekly_projected_cost / 1000).toFixed(1)}K`} color={PR_COLOR} />
              <SC label="Outlets Tracked" value={dashboard.outlets_tracked} color="#3b82f6" />
              <SC label="Items w/ Recipes" value={dashboard.ingredients_tracked} color="#f59e0b" />
              <SC label="Pending PRs" value={dashboard.pending_requisitions} color="#a855f7" />
            </div>
            <div className="p-4 rounded-lg" style={{ background: SURFACE, border: `1px solid ${BORDER}` }}>
              <div className="text-[11px] font-semibold mb-3 text-white">7-Day Projected Food Cost</div>
              <div className="flex items-end gap-2 h-[140px]">
                {dashboard.daily_projections?.map((d: any) => {
                  const maxC = Math.max(...(dashboard.daily_projections || []).map((x: any) => x.projected_food_cost));
                  const h = (d.projected_food_cost / maxC) * 120;
                  return (
                    <div key={d.date} className="flex-1 relative" style={{ height: 140 }}>
                      <div className="absolute bottom-0 left-[10%] right-[10%] rounded-t-sm" style={{ height: h, background: "rgba(20,184,166,0.3)", borderTop: "1px solid rgba(20,184,166,0.5)" }} />
                      <div className="absolute top-0 left-0 right-0 text-center text-[8px] font-medium" style={{ ...MONO, color: PR_COLOR }}>${(d.projected_food_cost / 1000).toFixed(1)}K</div>
                      <div className="absolute -bottom-4 left-0 right-0 text-center text-[8px]" style={{ color: "rgba(148,163,184,0.4)" }}>{d.dow}</div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
        {tab === "prep-list" && (
          <div className="p-4" data-testid="prep-list-view">
            <div className="flex items-center gap-3 mb-4">
              <div className="flex items-center gap-1.5 px-2 py-1.5 rounded-md" style={{ background: SURFACE, border: `1px solid ${BORDER}` }}>
                <Calendar className="w-3 h-3" style={{ color: "rgba(148,163,184,0.4)" }} />
                <input type="date" value={selectedDate} onChange={e => setSelectedDate(e.target.value)} className="bg-transparent text-[10px] outline-none text-white" data-testid="prep-date" />
              </div>
              <select value={selectedOutlet} onChange={e => setSelectedOutlet(e.target.value)} className="px-2 py-1.5 rounded-md text-[10px] bg-transparent outline-none" style={{ background: SURFACE, border: `1px solid ${BORDER}`, color: "rgba(148,163,184,0.7)" }} data-testid="prep-outlet">
                <option value="">All Outlets</option>
                <option value="Signature Italian">Signature Italian</option>
                <option value="Rooftop Lounge">Rooftop Lounge</option>
                <option value="Pool Bar & Grill">Pool Bar & Grill</option>
                <option value="Family Dining">Family Dining</option>
              </select>
              <button onClick={loadPrepList} className="px-3 py-1.5 rounded-md text-[10px] font-medium" style={{ background: "rgba(20,184,166,0.1)", color: PR_COLOR, border: "1px solid rgba(20,184,166,0.2)" }}>Generate</button>
              {prepList && <button onClick={createPR} className="px-3 py-1.5 rounded-md text-[10px] font-medium" style={{ background: "rgba(168,85,247,0.1)", color: "#a855f7", border: "1px solid rgba(168,85,247,0.2)" }} data-testid="create-pr-btn">Create PR</button>}
            </div>
            {prepList && (
              <>
                <div className="grid grid-cols-4 gap-2 mb-4">
                  <SC label="Ingredients" value={prepList.total_ingredients} color={PR_COLOR} />
                  <SC label="Total Cost" value={`$${prepList.total_cost.toFixed(2)}`} color="#f59e0b" />
                  <SC label="Shortages" value={prepList.shortage_count} color="#ef4444" />
                  <SC label="Outlets" value={Object.keys(prepList.outlet_breakdown || {}).length} color="#3b82f6" />
                </div>
                <table className="w-full text-[10px]" data-testid="prep-table">
                  <thead><tr style={{ borderBottom: `1px solid ${BORDER}` }}>
                    {["Ingredient", "Qty", "Unit", "$/Unit", "Total", "Sources"].map(h => (
                      <th key={h} className="px-2 py-1.5 text-left text-[9px] font-semibold" style={{ color: "rgba(148,163,184,0.4)" }}>{h}</th>
                    ))}
                  </tr></thead>
                  <tbody>
                    {prepList.prep_list?.map((item: any, i: number) => (
                      <tr key={i} style={{ borderBottom: `1px solid rgba(255,255,255,0.02)` }}>
                        <td className="px-2 py-1.5 font-medium text-white">{item.ingredient}</td>
                        <td className="px-2 py-1.5" style={{ ...MONO, color: PR_COLOR }}>{item.total_qty}</td>
                        <td className="px-2 py-1.5" style={{ color: "rgba(148,163,184,0.5)" }}>{item.unit}</td>
                        <td className="px-2 py-1.5" style={{ ...MONO, color: "rgba(148,163,184,0.5)" }}>${item.cost_per_unit}</td>
                        <td className="px-2 py-1.5 font-medium" style={{ ...MONO, color: ACCENT }}>${item.total_cost.toFixed(2)}</td>
                        <td className="px-2 py-1.5 text-[8px]" style={{ color: "rgba(148,163,184,0.4)" }}>
                          {item.sources?.slice(0, 2).map((s: any) => `${s.outlet.split(" ")[0]}: ${s.covers}cv`).join(" | ")}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </>
            )}
          </div>
        )}
        {tab === "requisitions" && (
          <div className="p-4" data-testid="requisitions-view">
            <div className="text-[11px] font-semibold mb-3 text-white">Purchase Requisitions ({requisitions.length})</div>
            {requisitions.map(r => (
              <div key={r.requisition_id} className="flex items-center gap-3 p-3 rounded-lg mb-2" style={{ background: SURFACE, border: `1px solid ${BORDER}` }}>
                <Package className="w-4 h-4" style={{ color: PR_COLOR }} />
                <div className="flex-1">
                  <div className="text-[11px] font-medium text-white">{r.requisition_id}</div>
                  <div className="text-[9px]" style={{ color: "rgba(148,163,184,0.5)" }}>{r.date} | {r.outlet} | {r.items?.length || 0} items</div>
                </div>
                <span className="text-[12px] font-semibold" style={{ ...MONO, color: ACCENT }}>${r.total_cost?.toFixed(2)}</span>
                <span className="text-[9px] px-2 py-0.5 rounded-full uppercase" style={{ background: r.status === "approved" ? "rgba(34,197,94,0.1)" : "rgba(245,158,11,0.1)", color: r.status === "approved" ? "#22c55e" : "#f59e0b" }}>{r.status}</span>
              </div>
            ))}
            {requisitions.length === 0 && <div className="text-center py-10 text-[11px]" style={{ color: "rgba(148,163,184,0.3)" }}>No requisitions yet. Generate a prep list and create a PR.</div>}
          </div>
        )}
      </div>
    </div>
  );
}

function SC({ label, value, color }: { label: string; value: any; color: string }) {
  return (
    <div className="px-3 py-2.5 rounded-lg" style={{ background: `${color}06`, border: `1px solid ${color}15` }}>
      <div className="text-[16px] font-bold" style={{ fontFamily: "'IBM Plex Mono', monospace", color }}>{value}</div>
      <div className="text-[8px] uppercase tracking-wider" style={{ color: `${color}80` }}>{label}</div>
    </div>
  );
}
