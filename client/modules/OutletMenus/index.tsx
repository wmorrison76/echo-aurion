import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  Store, Search, ChevronDown, ChevronRight, Utensils, Wine, Coffee,
  Printer, Layers, MapPin, DollarSign, FileText, Plus, RefreshCw,
  BarChart3, ClipboardList, ArrowRight, Clock, Check, ChefHat,
  GlassWater,
} from "lucide-react";

const API = window.location.origin;
const GET = (p: string) => fetch(`${API}/api/outlet-menus${p}`).then(r => r.json());
const POST = (p: string, b: any = {}) =>
  fetch(`${API}/api/outlet-menus${p}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(b) }).then(r => r.json());

const FONT = { fontFamily: "'IBM Plex Sans', system-ui, sans-serif" };
const MONO = { fontFamily: "'IBM Plex Mono', monospace" };
const BG = "#04060d";
const SURFACE = "rgba(255,255,255,0.025)";
const BORDER = "rgba(255,255,255,0.06)";
const ACCENT = "#c8a97e";
const OUTLET_COLOR = "#f59e0b";

type Tab = "outlets" | "menus" | "assembly" | "test-order";
type Outlet = { outlet_id: string; name: string; type: string; cuisine: string; location: string; has_bar: boolean };

const TYPE_COLORS: Record<string, string> = {
  fine_dining: "#c8a97e", lounge: "#a855f7", casual_dining: "#22c55e", family_dining: "#3b82f6",
};

export default function OutletMenusPanel() {
  const [tab, setTab] = useState<Tab>("outlets");
  const [outlets, setOutlets] = useState<Outlet[]>([]);
  const [menus, setMenus] = useState<any[]>([]);
  const [selectedMenu, setSelectedMenu] = useState<any>(null);
  const [menuItems, setMenuItems] = useState<any[]>([]);
  const [assemblyQueue, setAssemblyQueue] = useState<any[]>([]);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());
  // Test order
  const [orderOutlet, setOrderOutlet] = useState("");
  const [orderItem, setOrderItem] = useState("");
  const [orderTable, setOrderTable] = useState("Table 1");
  const [orderQty, setOrderQty] = useState(1);
  const [orderResult, setOrderResult] = useState<any>(null);

  const loadData = useCallback(async () => {
    const [outRes, menuRes] = await Promise.all([GET("/outlets"), GET("")]);
    setOutlets(outRes.outlets || []);
    setMenus(menuRes.menus || []);
  }, []);

  useEffect(() => { loadData(); }, []);

  const loadMenu = useCallback(async (menuId: string) => {
    const [detail, items] = await Promise.all([GET(`/${menuId}`), GET(`/${menuId}/items`)]);
    setSelectedMenu(detail);
    setMenuItems(items.items || []);
  }, []);

  const loadQueue = useCallback(async () => {
    const q = await GET("/dish-assembly/queue");
    setAssemblyQueue(q.tickets || []);
  }, []);

  useEffect(() => { if (tab === "assembly") loadQueue(); }, [tab]);

  const fireOrder = useCallback(async () => {
    if (!orderItem.trim()) return;
    const result = await POST("/dish-assembly/ticket", {
      item_name: orderItem, outlet_id: orderOutlet, table: orderTable, quantity: orderQty,
    });
    setOrderResult(result);
    loadQueue();
  }, [orderItem, orderOutlet, orderTable, orderQty]);

  const completeTicket = useCallback(async (ticketId: string) => {
    await fetch(`${API}/api/outlet-menus/dish-assembly/${ticketId}/complete`, { method: "PUT" });
    loadQueue();
  }, []);

  const TABS: { id: Tab; label: string; icon: any }[] = [
    { id: "outlets", label: "Outlets", icon: Store },
    { id: "menus", label: "Menus", icon: FileText },
    { id: "assembly", label: "Dish Assembly", icon: ClipboardList },
    { id: "test-order", label: "Test Order", icon: ChefHat },
  ];

  // For test order — get menu items from all menus for selected outlet
  const outletMenuItems = useMemo(() => {
    if (!orderOutlet) return [];
    const outletMenus = menus.filter(m => m.outlet_id === orderOutlet);
    if (outletMenus.length === 0) return [];
    return menuItems;
  }, [orderOutlet, menus, menuItems]);

  return (
    <div className="flex flex-col h-full overflow-hidden" style={{ ...FONT, background: BG, color: "#e2e8f0" }}
      data-testid="outlet-menus-panel">
      {/* Header */}
      <div style={{ borderBottom: `1px solid ${BORDER}` }}>
        <div className="flex items-center gap-4 px-6 py-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-md flex items-center justify-center"
              style={{ background: "rgba(245,158,11,0.1)", border: "1px solid rgba(245,158,11,0.25)" }}>
              <Store className="w-4 h-4" style={{ color: OUTLET_COLOR }} />
            </div>
            <div>
              <div className="text-[13px] font-semibold text-white">OUTLET MENU MANAGER</div>
              <div className="text-[9px] tracking-[0.2em] uppercase" style={{ ...MONO, color: "rgba(245,158,11,0.5)" }}>
                Restaurant Menus | POS Routing | Dish Assembly
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3 ml-4">
            <span className="text-[10px] px-2 py-0.5 rounded" style={{ background: "rgba(245,158,11,0.08)", color: OUTLET_COLOR }}>
              {outlets.filter(o => ["out-signature","out-rooftop","out-poolbar","out-family"].includes(o.outlet_id)).length} Outlets
            </span>
            <span className="text-[10px] px-2 py-0.5 rounded" style={{ background: SURFACE, color: "rgba(148,163,184,0.5)" }}>
              {menus.length} Menus
            </span>
          </div>
          <div className="flex-1" />
          <div className="flex items-center gap-0.5 p-0.5 rounded-lg" style={{ background: SURFACE, border: `1px solid ${BORDER}` }}>
            {TABS.map(t => (
              <button key={t.id} onClick={() => setTab(t.id)} data-testid={`outlet-tab-${t.id}`}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-[10px] font-medium transition-all"
                style={{
                  background: tab === t.id ? "rgba(245,158,11,0.08)" : "transparent",
                  color: tab === t.id ? OUTLET_COLOR : "rgba(148,163,184,0.5)",
                  border: tab === t.id ? "1px solid rgba(245,158,11,0.15)" : "1px solid transparent",
                }}>
                <t.icon className="w-3 h-3" />
                {t.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* OUTLETS */}
        {tab === "outlets" && (
          <div className="p-4" data-testid="outlets-grid">
            <div className="grid grid-cols-2 gap-3">
              {outlets.filter(o => ["out-signature","out-rooftop","out-poolbar","out-family"].includes(o.outlet_id)).map(o => (
                <div key={o.outlet_id} className="p-4 rounded-lg" style={{ background: SURFACE, border: `1px solid ${BORDER}` }}
                  data-testid={`outlet-card-${o.outlet_id}`}>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg flex items-center justify-center"
                      style={{ background: `${TYPE_COLORS[o.type] || OUTLET_COLOR}15`, border: `1px solid ${TYPE_COLORS[o.type] || OUTLET_COLOR}25` }}>
                      {o.has_bar ? <Wine className="w-5 h-5" style={{ color: TYPE_COLORS[o.type] || OUTLET_COLOR }} /> :
                        <Utensils className="w-5 h-5" style={{ color: TYPE_COLORS[o.type] || OUTLET_COLOR }} />}
                    </div>
                    <div>
                      <div className="text-[13px] font-semibold text-white">{o.name}</div>
                      <div className="text-[10px]" style={{ color: "rgba(148,163,184,0.5)" }}>
                        {(o.cuisine || o.type || "").replace(/_/g, " ")}
                      </div>
                    </div>
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-2">
                    <InfoChip icon={MapPin} label="Location" value={o.location || "—"} />
                    <InfoChip icon={Store} label="Type" value={(o.type || "").replace(/_/g, " ")} />
                    <InfoChip icon={Wine} label="Bar" value={o.has_bar ? "Yes" : "No"} />
                    <InfoChip icon={Printer} label="Kitchen" value={(o as any).default_kitchen_printer || "hot"} />
                  </div>
                  <button onClick={() => {
                    const menu = menus.find(m => m.outlet_id === o.outlet_id);
                    if (menu) { loadMenu(menu.menu_id); setTab("menus"); }
                  }} className="mt-3 w-full py-1.5 rounded text-[10px] font-medium transition-all hover:bg-white/5"
                    style={{ border: `1px solid ${BORDER}`, color: OUTLET_COLOR }}
                    data-testid={`view-menu-${o.outlet_id}`}>
                    View Menu
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* MENUS */}
        {tab === "menus" && (
          <div className="flex h-full">
            {/* Menu list sidebar */}
            <div className="w-56 flex-shrink-0 overflow-y-auto py-2" style={{ borderRight: `1px solid ${BORDER}`, background: "rgba(0,0,0,0.2)" }}>
              {menus.map(m => (
                <button key={m.menu_id} onClick={() => loadMenu(m.menu_id)}
                  className="w-full text-left px-3 py-2 transition-colors hover:bg-white/5"
                  style={{ color: selectedMenu?.menu_id === m.menu_id ? OUTLET_COLOR : "rgba(148,163,184,0.6)",
                    borderLeft: selectedMenu?.menu_id === m.menu_id ? `2px solid ${OUTLET_COLOR}` : "2px solid transparent" }}
                  data-testid={`menu-btn-${m.menu_id}`}>
                  <div className="text-[11px] font-medium">{m.name}</div>
                  <div className="text-[9px]" style={{ color: "rgba(148,163,184,0.35)" }}>{m.outlet_id}</div>
                </button>
              ))}
            </div>
            {/* Menu detail */}
            <div className="flex-1 overflow-y-auto p-4">
              {selectedMenu ? (
                <>
                  <div className="mb-4">
                    <div className="text-[15px] font-semibold text-white">{selectedMenu.name}</div>
                    <div className="text-[10px]" style={{ color: "rgba(148,163,184,0.5)" }}>
                      {selectedMenu.outlet_id} | Version: {selectedMenu.version} | {menuItems.length} items
                    </div>
                  </div>
                  {selectedMenu.sections?.map((sec: any) => (
                    <div key={sec.name} className="mb-3">
                      <button onClick={() => setExpandedSections(prev => {
                        const next = new Set(prev);
                        next.has(sec.name) ? next.delete(sec.name) : next.add(sec.name);
                        return next;
                      })} className="flex items-center gap-2 w-full text-left mb-1">
                        {expandedSections.has(sec.name) ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                        <span className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: OUTLET_COLOR }}>{sec.name}</span>
                        <span className="text-[9px]" style={{ color: "rgba(148,163,184,0.3)" }}>({sec.items?.length || 0})</span>
                      </button>
                      {expandedSections.has(sec.name) && (
                        <div className="ml-5 space-y-1">
                          {sec.items?.map((item: any, i: number) => (
                            <div key={i} className="flex items-center gap-2 px-2.5 py-1.5 rounded" style={{ background: SURFACE, border: `1px solid ${BORDER}` }}>
                              <div className="flex-1 min-w-0">
                                <div className="text-[11px] font-medium text-white">{item.name}</div>
                                {item.description && <div className="text-[9px]" style={{ color: "rgba(148,163,184,0.4)" }}>{item.description}</div>}
                                {item.dietary_flags && (
                                  <div className="flex gap-1 mt-0.5">
                                    {item.dietary_flags.map((f: string) => (
                                      <span key={f} className="text-[7px] px-1 rounded font-bold" style={{ background: "rgba(245,158,11,0.08)", color: OUTLET_COLOR }}>{f}</span>
                                    ))}
                                  </div>
                                )}
                              </div>
                              <div className="text-[11px] font-medium flex-shrink-0" style={{ ...MONO, color: ACCENT }}>
                                {typeof item.price === "object" ? `$${item.price.GL} / $${item.price.BTL}` : item.price ? `$${item.price}` : ""}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </>
              ) : (
                <div className="flex flex-col items-center justify-center py-16 text-[11px]" style={{ color: "rgba(148,163,184,0.3)" }}>
                  <FileText className="w-8 h-8 mb-3 opacity-30" />
                  Select a menu from the sidebar
                </div>
              )}
            </div>
          </div>
        )}

        {/* DISH ASSEMBLY QUEUE */}
        {tab === "assembly" && (
          <div className="p-4" data-testid="assembly-queue">
            <div className="flex items-center justify-between mb-3">
              <div className="text-[11px] font-semibold text-white">Dish Assembly Queue ({assemblyQueue.length} tickets)</div>
              <button onClick={loadQueue} className="text-[10px] px-2 py-1 rounded transition" style={{ background: SURFACE, border: `1px solid ${BORDER}`, color: "rgba(148,163,184,0.5)" }}>
                <RefreshCw className="w-3 h-3 inline mr-1" />Refresh
              </button>
            </div>
            <div className="space-y-2">
              {assemblyQueue.map(t => (
                <div key={t.ticket_id} className="p-3 rounded-lg" style={{ background: SURFACE, border: `1px solid ${BORDER}` }}
                  data-testid={`ticket-${t.ticket_id}`}>
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded flex items-center justify-center"
                      style={{ background: t.chit_printer === "bar" ? "rgba(168,85,247,0.1)" : "rgba(245,158,11,0.1)" }}>
                      {t.chit_printer === "bar" ? <Wine className="w-4 h-4" style={{ color: "#a855f7" }} /> :
                        <Utensils className="w-4 h-4" style={{ color: OUTLET_COLOR }} />}
                    </div>
                    <div className="flex-1">
                      <div className="text-[12px] font-semibold text-white">{t.item_name} <span className="text-[10px] font-normal" style={{ color: "rgba(148,163,184,0.5)" }}>x{t.quantity}</span></div>
                      <div className="text-[9px]" style={{ color: "rgba(148,163,184,0.4)" }}>
                        {t.outlet_id} | {t.table} | Printer: {t.chit_printer} | GL: {t.gl_account}
                      </div>
                    </div>
                    <div className="text-[10px]" style={{ ...MONO, color: ACCENT }}>${t.price}</div>
                    <button onClick={() => completeTicket(t.ticket_id)} className="px-2 py-1 rounded text-[9px] font-medium transition hover:bg-green-500/20"
                      style={{ border: "1px solid rgba(34,197,94,0.2)", color: "#22c55e" }} data-testid={`complete-${t.ticket_id}`}>
                      <Check className="w-3 h-3 inline mr-0.5" />Done
                    </button>
                  </div>
                  {t.production_steps && (
                    <div className="mt-2 ml-11 flex items-center gap-1">
                      {t.production_steps.map((s: any, i: number) => (
                        <React.Fragment key={i}>
                          <span className="text-[8px] px-1.5 py-0.5 rounded" style={{ background: "rgba(255,255,255,0.03)", color: "rgba(148,163,184,0.5)" }}>
                            {s.station} <span style={{ ...MONO, color: "rgba(148,163,184,0.3)" }}>({s.time_est})</span>
                          </span>
                          {i < t.production_steps.length - 1 && <ArrowRight className="w-2.5 h-2.5" style={{ color: "rgba(148,163,184,0.2)" }} />}
                        </React.Fragment>
                      ))}
                    </div>
                  )}
                </div>
              ))}
              {assemblyQueue.length === 0 && (
                <div className="flex flex-col items-center justify-center py-16 text-[11px]" style={{ color: "rgba(148,163,184,0.3)" }}>
                  <ClipboardList className="w-8 h-8 mb-3 opacity-30" />
                  No active tickets. Fire a test order to see dish assembly in action.
                </div>
              )}
            </div>
          </div>
        )}

        {/* TEST ORDER */}
        {tab === "test-order" && (
          <div className="p-4 max-w-2xl" data-testid="test-order-form">
            <div className="text-[11px] font-semibold mb-3 text-white">Fire Test Order</div>
            <div className="space-y-3 mb-4">
              <div>
                <label className="text-[9px] font-semibold uppercase mb-1 block" style={{ color: "rgba(148,163,184,0.5)" }}>Outlet</label>
                <select value={orderOutlet} onChange={e => {
                  setOrderOutlet(e.target.value);
                  const menu = menus.find(m => m.outlet_id === e.target.value);
                  if (menu) loadMenu(menu.menu_id);
                }} className="w-full px-3 py-2 rounded-md text-[11px] bg-transparent outline-none"
                  style={{ background: SURFACE, border: `1px solid ${BORDER}`, color: "#e2e8f0" }}
                  data-testid="order-outlet">
                  <option value="">Select outlet...</option>
                  {outlets.filter(o => ["out-signature","out-rooftop","out-poolbar","out-family"].includes(o.outlet_id)).map(o => (
                    <option key={o.outlet_id} value={o.outlet_id}>{o.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-[9px] font-semibold uppercase mb-1 block" style={{ color: "rgba(148,163,184,0.5)" }}>Item Name</label>
                <input value={orderItem} onChange={e => setOrderItem(e.target.value)}
                  placeholder="e.g. Latin Burger, Noir Martini, Lobster Linguine..."
                  className="w-full px-3 py-2 rounded-md text-[11px] bg-transparent outline-none placeholder:text-gray-600"
                  style={{ background: SURFACE, border: `1px solid ${BORDER}`, color: "#e2e8f0" }}
                  data-testid="order-item" />
                {menuItems.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-1.5">
                    {menuItems.slice(0, 12).map((item, i) => (
                      <button key={i} onClick={() => setOrderItem(item.name)}
                        className="text-[8px] px-1.5 py-0.5 rounded hover:bg-white/5 transition"
                        style={{ background: SURFACE, border: `1px solid ${BORDER}`, color: "rgba(148,163,184,0.5)" }}>
                        {item.name}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <div className="flex gap-3">
                <div className="flex-1">
                  <label className="text-[9px] font-semibold uppercase mb-1 block" style={{ color: "rgba(148,163,184,0.5)" }}>Table</label>
                  <input value={orderTable} onChange={e => setOrderTable(e.target.value)}
                    className="w-full px-3 py-2 rounded-md text-[11px] bg-transparent outline-none"
                    style={{ background: SURFACE, border: `1px solid ${BORDER}`, color: "#e2e8f0" }}
                    data-testid="order-table" />
                </div>
                <div className="w-20">
                  <label className="text-[9px] font-semibold uppercase mb-1 block" style={{ color: "rgba(148,163,184,0.5)" }}>Qty</label>
                  <input type="number" value={orderQty} min={1} onChange={e => setOrderQty(parseInt(e.target.value) || 1)}
                    className="w-full px-3 py-2 rounded-md text-[11px] bg-transparent outline-none text-center"
                    style={{ background: SURFACE, border: `1px solid ${BORDER}`, color: "#e2e8f0" }}
                    data-testid="order-qty" />
                </div>
              </div>
              <button onClick={fireOrder} className="w-full py-2.5 rounded-md text-[11px] font-semibold transition-all hover:scale-[1.01]"
                style={{ background: "rgba(245,158,11,0.12)", color: OUTLET_COLOR, border: "1px solid rgba(245,158,11,0.25)" }}
                data-testid="fire-order-btn">
                Fire Order to Kitchen
              </button>
            </div>

            {orderResult && (
              <div className="p-4 rounded-lg" style={{ background: "rgba(245,158,11,0.04)", border: "1px solid rgba(245,158,11,0.1)" }}
                data-testid="order-result">
                <div className="text-[12px] font-semibold text-white mb-2">Dish Assembly Ticket</div>
                <div className="grid grid-cols-3 gap-3 mb-3">
                  <div>
                    <div className="text-[8px] uppercase" style={{ color: "rgba(148,163,184,0.4)" }}>Ticket</div>
                    <div className="text-[11px] font-medium" style={{ ...MONO, color: OUTLET_COLOR }}>{orderResult.ticket_id}</div>
                  </div>
                  <div>
                    <div className="text-[8px] uppercase" style={{ color: "rgba(148,163,184,0.4)" }}>Chit Printer</div>
                    <div className="text-[11px] font-medium text-white">{orderResult.chit_printer}</div>
                  </div>
                  <div>
                    <div className="text-[8px] uppercase" style={{ color: "rgba(148,163,184,0.4)" }}>GL Account</div>
                    <div className="text-[11px] font-medium text-white">{orderResult.gl_account}</div>
                  </div>
                </div>
                <div className="text-[9px] font-semibold mb-1.5" style={{ color: "rgba(148,163,184,0.5)" }}>PRODUCTION STEPS</div>
                <div className="space-y-1">
                  {orderResult.production_steps?.map((s: any) => (
                    <div key={s.step} className="flex items-center gap-2 px-2.5 py-1.5 rounded" style={{ background: SURFACE, border: `1px solid ${BORDER}` }}>
                      <span className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold" style={{ background: "rgba(245,158,11,0.1)", color: OUTLET_COLOR }}>{s.step}</span>
                      <span className="text-[10px] text-white flex-1">{s.action}</span>
                      <span className="text-[9px] px-1.5 py-0.5 rounded" style={{ background: "rgba(168,85,247,0.06)", color: "#a855f7" }}>{s.station}</span>
                      <span className="text-[9px]" style={{ ...MONO, color: "rgba(148,163,184,0.4)" }}>{s.time_est}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function InfoChip({ icon: Icon, label, value }: { icon: any; label: string; value: string }) {
  return (
    <div className="flex items-center gap-1.5 px-2 py-1 rounded" style={{ background: "rgba(255,255,255,0.015)" }}>
      <Icon className="w-2.5 h-2.5 flex-shrink-0" style={{ color: "rgba(148,163,184,0.3)" }} />
      <span className="text-[8px]" style={{ color: "rgba(148,163,184,0.35)" }}>{label}:</span>
      <span className="text-[9px] text-white">{value}</span>
    </div>
  );
}
