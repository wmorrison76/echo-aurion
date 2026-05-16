import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  Router, Printer, DollarSign, Search, RefreshCw, ChevronDown,
  MapPin, BarChart3, AlertTriangle, Check, Settings, Zap,
  Wine, Utensils, Coffee, Music, Shield, Car, GlassWater,
  FileText, Layers, ArrowRight, CircleDot,
} from "lucide-react";

const API = window.location.origin;
const GET = (p: string) => fetch(`${API}/api/pos-router${p}`).then(r => r.json());
const POST = (p: string, b: any = {}) =>
  fetch(`${API}/api/pos-router${p}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(b) }).then(r => r.json());
const PUT = (p: string, b: any = {}) =>
  fetch(`${API}/api/pos-router${p}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(b) }).then(r => r.json());

const FONT = { fontFamily: "'IBM Plex Sans', system-ui, sans-serif" };
const MONO = { fontFamily: "'IBM Plex Mono', monospace" };
const BG = "#04060d";
const SURFACE = "rgba(255,255,255,0.025)";
const BORDER = "rgba(255,255,255,0.06)";
const ACCENT = "#c8a97e";
const POS_COLOR = "#22c55e";
const BAR_COLOR = "#a855f7";
const KITCHEN_COLOR = "#f59e0b";

type Tab = "items" | "printers" | "global-bev" | "alerts" | "dashboard";

const GL_COLORS: Record<string, string> = {
  "4100": "#22c55e", "4200": "#a855f7", "4300": "#3b82f6", "4400": "#f59e0b",
  "4500": "#ec4899", "4600": "#14b8a6", "4700": "#64748b",
};

const PRINTER_ICONS: Record<string, { icon: any; color: string }> = {
  kitchen_hot: { icon: Utensils, color: KITCHEN_COLOR },
  kitchen_cold: { icon: Utensils, color: "#3b82f6" },
  pastry: { icon: Coffee, color: "#ec4899" },
  bar: { icon: Wine, color: BAR_COLOR },
  service_bar: { icon: GlassWater, color: "#8b5cf6" },
  expo: { icon: Layers, color: POS_COLOR },
};

export default function POSRouterPanel() {
  const [tab, setTab] = useState<Tab>("dashboard");
  const [dashboard, setDashboard] = useState<any>(null);
  const [items, setItems] = useState<any[]>([]);
  const [printers, setPrinters] = useState<any[]>([]);
  const [revCenters, setRevCenters] = useState<any[]>([]);
  const [alerts, setAlerts] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterSource, setFilterSource] = useState("");
  const [filterPrinter, setFilterPrinter] = useState("");
  const [filterGlobal, setFilterGlobal] = useState("");
  const [selectedOutlet, setSelectedOutlet] = useState("");
  const [loading, setLoading] = useState(false);

  const loadDashboard = useCallback(async () => {
    const d = await GET("/dashboard");
    setDashboard(d);
  }, []);

  const loadItems = useCallback(async () => {
    setLoading(true);
    let url = "/items?limit=300";
    if (filterSource) url += `&source=${filterSource}`;
    if (filterPrinter) url += `&printer=${filterPrinter}`;
    if (filterGlobal === "true") url += `&is_global=true`;
    if (selectedOutlet) url += `&outlet=${selectedOutlet}`;
    const d = await GET(url);
    setItems(d.items || []);
    setLoading(false);
  }, [filterSource, filterPrinter, filterGlobal, selectedOutlet]);

  useEffect(() => { loadDashboard(); }, []);
  useEffect(() => { if (tab === "items" || tab === "global-bev") loadItems(); }, [tab, loadItems]);
  useEffect(() => {
    if (tab === "printers") GET("/printers").then(d => setPrinters(d.printers || []));
    if (tab === "printers") GET("/revenue-centers").then(d => setRevCenters(d.revenue_centers || []));
    if (tab === "alerts") GET("/supplier-alerts").then(d => setAlerts(d));
  }, [tab]);

  const setPrinterForItem = useCallback(async (itemId: string, printer: string) => {
    await PUT(`/items/${itemId}/printer`, { printer, outlet: selectedOutlet || "" });
    loadItems();
  }, [selectedOutlet, loadItems]);

  const filteredItems = useMemo(() => {
    if (!searchQuery.trim()) return items;
    const q = searchQuery.toLowerCase();
    return items.filter(i => i.name?.toLowerCase().includes(q) || i.category?.toLowerCase().includes(q));
  }, [items, searchQuery]);

  const TABS: { id: Tab; label: string; icon: any }[] = [
    { id: "dashboard", label: "Dashboard", icon: BarChart3 },
    { id: "items", label: "POS Items", icon: FileText },
    { id: "printers", label: "Chit Printers", icon: Printer },
    { id: "global-bev", label: "Global Beverages", icon: Wine },
    { id: "alerts", label: "Supplier Alerts", icon: AlertTriangle },
  ];

  return (
    <div className="flex flex-col h-full overflow-hidden" style={{ ...FONT, background: BG, color: "#e2e8f0" }}
      data-testid="pos-router-panel">
      {/* Header */}
      <div style={{ borderBottom: `1px solid ${BORDER}` }}>
        <div className="flex items-center gap-4 px-6 py-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-md flex items-center justify-center"
              style={{ background: "rgba(34,197,94,0.1)", border: "1px solid rgba(34,197,94,0.25)" }}>
              <Router className="w-4 h-4" style={{ color: POS_COLOR }} />
            </div>
            <div>
              <div className="text-[13px] font-semibold text-white">POS AUTO-ROUTER</div>
              <div className="text-[9px] tracking-[0.2em] uppercase" style={{ ...MONO, color: "rgba(34,197,94,0.5)" }}>
                Menu Items | Chit Printers | GL Routing | Supplier Alerts
              </div>
            </div>
          </div>
          <div className="flex-1" />
          <div className="flex items-center gap-0.5 p-0.5 rounded-lg" style={{ background: SURFACE, border: `1px solid ${BORDER}` }}>
            {TABS.map(t => (
              <button key={t.id} onClick={() => setTab(t.id)} data-testid={`pos-tab-${t.id}`}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-[10px] font-medium transition-all"
                style={{
                  background: tab === t.id ? "rgba(34,197,94,0.08)" : "transparent",
                  color: tab === t.id ? POS_COLOR : "rgba(148,163,184,0.5)",
                  border: tab === t.id ? "1px solid rgba(34,197,94,0.15)" : "1px solid transparent",
                }}>
                <t.icon className="w-3 h-3" />
                {t.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* DASHBOARD */}
        {tab === "dashboard" && dashboard && (
          <div className="p-5" data-testid="pos-dashboard">
            <div className="grid grid-cols-4 gap-3 mb-5">
              <StatCard label="Total POS Items" value={dashboard.total_pos_items} color={POS_COLOR} />
              <StatCard label="Global Beverages" value={dashboard.global_beverages} color={BAR_COLOR} />
              <StatCard label="Chit Printers" value={dashboard.chit_printers} color={KITCHEN_COLOR} />
              <StatCard label="Revenue Centers" value={dashboard.revenue_centers} color="#3b82f6" />
            </div>
            <div className="grid grid-cols-3 gap-4">
              {/* By Source */}
              <div className="p-3 rounded-lg" style={{ background: SURFACE, border: `1px solid ${BORDER}` }}>
                <div className="text-[10px] font-semibold uppercase tracking-wider mb-2" style={{ color: "rgba(148,163,184,0.5)" }}>By Source</div>
                {Object.entries(dashboard.by_source).map(([k, v]: [string, any]) => (
                  <div key={k} className="flex items-center justify-between py-1">
                    <span className="text-[10px]" style={{ color: "rgba(148,163,184,0.6)" }}>{k.replace(/_/g, " ")}</span>
                    <span className="text-[11px] font-medium" style={{ ...MONO, color: v > 0 ? POS_COLOR : "rgba(148,163,184,0.3)" }}>{v as number}</span>
                  </div>
                ))}
              </div>
              {/* By GL */}
              <div className="p-3 rounded-lg" style={{ background: SURFACE, border: `1px solid ${BORDER}` }}>
                <div className="text-[10px] font-semibold uppercase tracking-wider mb-2" style={{ color: "rgba(148,163,184,0.5)" }}>By GL Account</div>
                {Object.entries(dashboard.by_gl_account).map(([k, v]: [string, any]) => {
                  const names: Record<string, string> = { "4100": "Food Cost", "4200": "Beverage Cost", "4300": "AV Revenue", "4400": "Room Rental" };
                  return (
                    <div key={k} className="flex items-center justify-between py-1">
                      <div className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full" style={{ background: GL_COLORS[k] || "#666" }} />
                        <span className="text-[10px]" style={{ color: "rgba(148,163,184,0.6)" }}>{k} {names[k] || ""}</span>
                      </div>
                      <span className="text-[11px] font-medium" style={{ ...MONO, color: GL_COLORS[k] || "#666" }}>{v as number}</span>
                    </div>
                  );
                })}
              </div>
              {/* By Printer */}
              <div className="p-3 rounded-lg" style={{ background: SURFACE, border: `1px solid ${BORDER}` }}>
                <div className="text-[10px] font-semibold uppercase tracking-wider mb-2" style={{ color: "rgba(148,163,184,0.5)" }}>By Chit Printer</div>
                {Object.entries(dashboard.by_chit_printer).map(([k, v]: [string, any]) => {
                  const pi = PRINTER_ICONS[k] || { icon: Printer, color: "#666" };
                  const Icon = pi.icon;
                  return (
                    <div key={k} className="flex items-center justify-between py-1">
                      <div className="flex items-center gap-1.5">
                        <Icon className="w-3 h-3" style={{ color: pi.color }} />
                        <span className="text-[10px]" style={{ color: "rgba(148,163,184,0.6)" }}>{k.replace(/_/g, " ")}</span>
                      </div>
                      <span className="text-[11px] font-medium" style={{ ...MONO, color: pi.color }}>{v as number}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* POS ITEMS */}
        {(tab === "items" || tab === "global-bev") && (
          <div className="p-4">
            <div className="flex items-center gap-3 mb-3 flex-wrap">
              <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md flex-1 max-w-xs"
                style={{ background: SURFACE, border: `1px solid ${BORDER}` }}>
                <Search className="w-3 h-3" style={{ color: "rgba(148,163,184,0.4)" }} />
                <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                  placeholder="Search items..." className="flex-1 bg-transparent text-[11px] outline-none text-white placeholder:text-gray-600"
                  data-testid="pos-search" />
              </div>
              <select value={filterSource} onChange={e => setFilterSource(e.target.value)}
                className="px-2 py-1.5 rounded-md text-[10px] bg-transparent outline-none"
                style={{ background: SURFACE, border: `1px solid ${BORDER}`, color: "rgba(148,163,184,0.7)" }}
                data-testid="filter-source">
                <option value="">All Sources</option>
                <option value="banquet_catalog">Banquet Catalog</option>
                <option value="mixology_rd">Mixology R&D</option>
                <option value="wine_list">Wine List</option>
                <option value="manual">Manual</option>
              </select>
              <select value={filterPrinter} onChange={e => setFilterPrinter(e.target.value)}
                className="px-2 py-1.5 rounded-md text-[10px] bg-transparent outline-none"
                style={{ background: SURFACE, border: `1px solid ${BORDER}`, color: "rgba(148,163,184,0.7)" }}
                data-testid="filter-printer">
                <option value="">All Printers</option>
                <option value="kitchen_hot">Kitchen Hot</option>
                <option value="kitchen_cold">Kitchen Cold</option>
                <option value="pastry">Pastry</option>
                <option value="bar">Bar</option>
                <option value="expo">Expo</option>
              </select>
              <select value={selectedOutlet} onChange={e => setSelectedOutlet(e.target.value)}
                className="px-2 py-1.5 rounded-md text-[10px] bg-transparent outline-none"
                style={{ background: SURFACE, border: `1px solid ${BORDER}`, color: "rgba(148,163,184,0.7)" }}
                data-testid="select-outlet">
                <option value="">Default Routing</option>
                <option value="banquet">Banquet</option>
                <option value="restaurant">Restaurant</option>
                <option value="pool_bar">Pool Bar</option>
                <option value="lounge">Lounge</option>
                <option value="room_service">In-Room Dining</option>
              </select>
              <span className="text-[10px]" style={{ ...MONO, color: POS_COLOR }}>{filteredItems.length} items</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full" data-testid="pos-items-table">
                <thead>
                  <tr style={{ borderBottom: `1px solid ${BORDER}` }}>
                    {["Item", "Source", "GL", "Price", "Type", "Chit Printer", "Global", "Outlets"].map(h => (
                      <th key={h} className="text-left px-2 py-1.5 text-[9px] font-semibold uppercase tracking-wider"
                        style={{ color: "rgba(148,163,184,0.4)" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredItems.slice(0, 100).map(item => {
                    const pi = PRINTER_ICONS[item.effective_printer || item.chit_printer] || { icon: Printer, color: "#666" };
                    const PIcon = pi.icon;
                    return (
                      <tr key={item.item_id || item.source_id} className="hover:bg-white/[0.02] transition-colors"
                        style={{ borderBottom: `1px solid rgba(255,255,255,0.02)` }}
                        data-testid={`pos-item-row-${(item.name || "").toLowerCase().replace(/\s+/g, '-').slice(0, 30)}`}>
                        <td className="px-2 py-1.5">
                          <div className="text-[10px] font-medium text-white">{item.name}</div>
                          {item.description && <div className="text-[8px]" style={{ color: "rgba(148,163,184,0.35)" }}>{item.description?.slice(0, 60)}</div>}
                        </td>
                        <td className="px-2 py-1.5 text-[9px]" style={{ color: "rgba(148,163,184,0.5)" }}>
                          {(item.source || "").replace(/_/g, " ")}
                        </td>
                        <td className="px-2 py-1.5">
                          <span className="text-[9px] px-1.5 py-0.5 rounded" style={{
                            background: `${GL_COLORS[item.gl_account] || "#666"}15`,
                            color: GL_COLORS[item.gl_account] || "#666",
                          }}>{item.gl_account} {item.gl_name?.split(" ")[0]}</span>
                        </td>
                        <td className="px-2 py-1.5 text-[10px] font-medium" style={{ ...MONO, color: ACCENT }}>
                          ${item.price?.toFixed?.(2) || item.price || "—"}
                          {item.price_type && item.price_type !== "per_item" && (
                            <span className="text-[7px] ml-0.5" style={{ color: "rgba(148,163,184,0.4)" }}>/{item.price_type.replace("per_", "")}</span>
                          )}
                        </td>
                        <td className="px-2 py-1.5 text-[9px]" style={{ color: "rgba(148,163,184,0.5)" }}>
                          {(item.item_type || "").replace(/_/g, " ")}
                        </td>
                        <td className="px-2 py-1.5">
                          <select value={item.effective_printer || item.chit_printer || ""}
                            onChange={e => item.item_id && setPrinterForItem(item.item_id, e.target.value)}
                            className="px-1.5 py-0.5 rounded text-[9px] bg-transparent outline-none cursor-pointer"
                            style={{ background: `${pi.color}10`, border: `1px solid ${pi.color}25`, color: pi.color }}
                            data-testid={`printer-select-${(item.name || "").toLowerCase().replace(/\s+/g, '-').slice(0, 20)}`}>
                            <option value="kitchen_hot">Kitchen Hot</option>
                            <option value="kitchen_cold">Kitchen Cold</option>
                            <option value="pastry">Pastry</option>
                            <option value="bar">Bar</option>
                            <option value="service_bar">Service Bar</option>
                            <option value="expo">Expo</option>
                          </select>
                        </td>
                        <td className="px-2 py-1.5">
                          {item.is_global && (
                            <span className="text-[8px] px-1.5 py-0.5 rounded-full font-semibold"
                              style={{ background: "rgba(168,85,247,0.1)", color: BAR_COLOR }}>GLOBAL</span>
                          )}
                        </td>
                        <td className="px-2 py-1.5 text-[8px]" style={{ color: "rgba(148,163,184,0.4)" }}>
                          {(item.outlets || []).join(", ")}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* CHIT PRINTERS */}
        {tab === "printers" && (
          <div className="p-4">
            <div className="text-[11px] font-semibold mb-3 text-white">Chit Printers ({printers.length})</div>
            <div className="grid grid-cols-3 gap-3 mb-6">
              {printers.map(p => {
                const pi = PRINTER_ICONS[p.type] || { icon: Printer, color: "#666" };
                const PIcon = pi.icon;
                return (
                  <div key={p.id} className="p-3 rounded-lg" style={{ background: SURFACE, border: `1px solid ${BORDER}` }}
                    data-testid={`printer-card-${p.id}`}>
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-7 h-7 rounded-md flex items-center justify-center" style={{ background: `${pi.color}15`, border: `1px solid ${pi.color}25` }}>
                        <PIcon className="w-3.5 h-3.5" style={{ color: pi.color }} />
                      </div>
                      <div>
                        <div className="text-[11px] font-medium text-white">{p.name}</div>
                        <div className="text-[8px] uppercase" style={{ color: pi.color }}>{p.type.replace(/_/g, " ")}</div>
                      </div>
                    </div>
                    <div className="text-[9px]" style={{ color: "rgba(148,163,184,0.4)" }}>
                      <div><MapPin className="w-2.5 h-2.5 inline mr-1" />{p.location}</div>
                      <div className="mt-0.5">{p.routes_to}</div>
                    </div>
                    <div className="mt-2 flex items-center gap-1">
                      <span className={`w-1.5 h-1.5 rounded-full ${p.active ? "bg-green-500" : "bg-red-500"}`} />
                      <span className="text-[8px]" style={{ color: p.active ? POS_COLOR : "#ef4444" }}>
                        {p.active ? "Active" : "Inactive"}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="text-[11px] font-semibold mb-3 text-white">Revenue Centers ({revCenters.length})</div>
            <div className="grid grid-cols-5 gap-2">
              {revCenters.map(rc => (
                <div key={rc.id} className="p-2.5 rounded-lg" style={{ background: SURFACE, border: `1px solid ${BORDER}` }}
                  data-testid={`rc-card-${rc.code}`}>
                  <div className="text-[12px] font-semibold" style={{ ...MONO, color: POS_COLOR }}>{rc.code}</div>
                  <div className="text-[10px] text-white">{rc.name}</div>
                  <div className="text-[8px] uppercase" style={{ color: "rgba(148,163,184,0.4)" }}>{rc.type}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* SUPPLIER ALERTS */}
        {tab === "alerts" && alerts && (
          <div className="p-4" data-testid="supplier-alerts">
            <div className="flex items-center gap-4 mb-4">
              <StatCard label="Total Alerts" value={alerts.total_alerts} color="#ef4444" />
              <StatCard label="Critical" value={alerts.critical} color="#ef4444" />
              <StatCard label="Warning" value={alerts.warning} color="#f59e0b" />
              <StatCard label="Ingredients Tracked" value={alerts.ingredients_tracked} color="#3b82f6" />
            </div>
            <div className="space-y-1">
              {alerts.alerts?.slice(0, 30).map((a: any, i: number) => (
                <div key={i} className="flex items-center gap-3 px-3 py-2 rounded-lg"
                  style={{ background: SURFACE, border: `1px solid ${a.severity === "critical" ? "rgba(239,68,68,0.15)" : a.severity === "warning" ? "rgba(245,158,11,0.15)" : BORDER}` }}>
                  <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0"
                    style={{ color: a.severity === "critical" ? "#ef4444" : a.severity === "warning" ? "#f59e0b" : "#64748b" }} />
                  <div className="flex-1">
                    <div className="text-[11px] font-medium text-white">{a.ingredient_name}</div>
                    <div className="text-[9px]" style={{ color: "rgba(148,163,184,0.5)" }}>
                      Used in {a.recipes_affected} recipe{a.recipes_affected > 1 ? "s" : ""}: {a.recipe_names?.slice(0, 3).join(", ")}
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <div className="text-[10px] font-medium" style={{ ...MONO, color: a.severity === "critical" ? "#ef4444" : "#f59e0b" }}>
                      {a.on_hand} / {a.par_level}
                    </div>
                    <div className="text-[8px]" style={{ color: "rgba(148,163,184,0.4)" }}>on-hand / par</div>
                  </div>
                  {a.estimated_reorder_cost > 0 && (
                    <div className="text-[9px] flex-shrink-0" style={{ ...MONO, color: ACCENT }}>
                      ${a.estimated_reorder_cost.toFixed(2)}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({ label, value, color }: { label: string; value: any; color: string }) {
  return (
    <div className="px-4 py-3 rounded-lg" style={{ background: `${color}08`, border: `1px solid ${color}15` }}>
      <div className="text-[20px] font-bold" style={{ fontFamily: "'IBM Plex Mono', monospace", color }}>{value}</div>
      <div className="text-[9px] uppercase tracking-wider" style={{ color: `${color}80` }}>{label}</div>
    </div>
  );
}
