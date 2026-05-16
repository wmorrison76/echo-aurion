/**
 * Production Command Center
 * Live production planning & procurement dashboard that connects to:
 * - /api/maestro-production/* (production plans, orders, inventory, vendors)
 * - /api/buffet-planner/* (buffet-specific quantity planning)
 */
import React, { useState, useCallback, useEffect } from "react";
import {
  ChefHat,
  Package,
  Truck,
  Clock,
  AlertTriangle,
  CheckCircle,
  RefreshCw,
  Loader2,
  Layers,
  Warehouse,
  ShoppingCart,
  BarChart3,
  Calendar,
  Users,
  ArrowRight,
  Flame,
  Snowflake,
  Beef,
  CookingPot,
} from "lucide-react";
import { cn } from "@/lib/glass";

// Station icon/color mapping
const STATION_META: Record<string, { icon: React.ReactNode; color: string; bg: string }> = {
  hot: { icon: <Flame className="w-4 h-4" />, color: "text-orange-500", bg: "bg-orange-500/10 border-orange-500/30" },
  cold: { icon: <Snowflake className="w-4 h-4" />, color: "text-cyan-500", bg: "bg-cyan-500/10 border-cyan-500/30" },
  butcher: { icon: <Beef className="w-4 h-4" />, color: "text-red-500", bg: "bg-red-500/10 border-red-500/30" },
  saucier: { icon: <CookingPot className="w-4 h-4" />, color: "text-amber-600", bg: "bg-amber-500/10 border-amber-500/30" },
};

interface ProductionPlan {
  plan_id: string;
  production_date: string;
  total_beos: number;
  total_events: number;
  events: Array<{ event_id: string; event_name: string; guest_count: number; event_date: string; menu_items: number }>;
  consolidated_ingredients_count: number;
  duplicate_prep_alerts: Array<{ ingredient: string; shared_across: string[]; total_qty: number; unit: string; message: string }>;
  stations: Record<string, { station: string; description: string; total_items: number }>;
  timeline: { milestones?: Array<{ time: string; label: string }>; order_deadline?: string; delivery_deadline?: string; ready_on_carts?: string; earliest_event?: string };
  inventory_status: { total_ingredients: number; covered: number; shortages: number; shortage_details: any[] };
}

interface StationSheet {
  station: string;
  description: string;
  total_items: number;
  items: Array<{ ingredient: string; total_qty: number; unit: string; events: string[]; dishes: string[]; consolidated: boolean }>;
}

interface PurchaseOrder {
  vendor_name: string;
  delivery_deadline: string;
  total_items: number;
  items: Array<{ ingredient_name: string; order_qty: number; unit: string; on_hand: number; net_need: number; events: string[] }>;
}

export default function ProductionCommandCenter() {
  const [prodDate, setProdDate] = useState(() => {
    const d = new Date();
    return d.toISOString().split("T")[0];
  });
  const [lookahead, setLookahead] = useState(3);
  const [plan, setPlan] = useState<ProductionPlan | null>(null);
  const [sheets, setSheets] = useState<Record<string, StationSheet> | null>(null);
  const [orders, setOrders] = useState<{ purchase_orders: PurchaseOrder[]; chef_flags: any[]; items_from_commissary: any[]; po_ids: string[] } | null>(null);
  const [loading, setLoading] = useState(false);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [activeStation, setActiveStation] = useState<string | null>(null);
  const [view, setView] = useState<"overview" | "sheets" | "orders" | "timeline" | "inventory">("overview");

  const generatePlan = useCallback(async () => {
    setLoading(true);
    setPlan(null);
    setSheets(null);
    setOrders(null);
    try {
      const res = await fetch("/api/maestro-production/generate-plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ production_date: prodDate, lookahead_days: lookahead }),
      });
      if (res.ok) {
        const data = await res.json();
        setPlan(data);
        // Fetch sheets
        const sheetsRes = await fetch(`/api/maestro-production/sheets/${prodDate}`);
        if (sheetsRes.ok) {
          const sheetsData = await sheetsRes.json();
          setSheets(sheetsData.stations || {});
          const stationKeys = Object.keys(sheetsData.stations || {});
          if (stationKeys.length > 0) setActiveStation(stationKeys[0]);
        }
      }
    } catch (e) {
      console.error("Production plan error:", e);
    }
    setLoading(false);
  }, [prodDate, lookahead]);

  const generateOrders = useCallback(async () => {
    if (!plan) return;
    setOrdersLoading(true);
    try {
      const res = await fetch(`/api/maestro-production/generate-orders/${prodDate}`, { method: "POST" });
      if (res.ok) {
        setOrders(await res.json());
        setView("orders");
      }
    } catch (e) {
      console.error("Order generation error:", e);
    }
    setOrdersLoading(false);
  }, [plan, prodDate]);

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 sm:px-6 space-y-6" data-testid="production-command-center">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end gap-4">
        <div className="flex-1">
          <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
            <Layers className="w-5 h-5 text-primary" />
            Production Command Center
          </h2>
          <p className="text-sm text-foreground/60 mt-1">
            Consolidate BEOs, assign stations, generate purchase orders
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <label className="text-xs text-foreground/60">Date</label>
            <input
              type="date"
              value={prodDate}
              onChange={(e) => setProdDate(e.target.value)}
              className="px-2 py-1.5 text-sm rounded-lg border border-border/30 bg-background text-foreground"
              data-testid="production-date-input"
            />
          </div>
          <div className="flex items-center gap-2">
            <label className="text-xs text-foreground/60">Days</label>
            <select
              value={lookahead}
              onChange={(e) => setLookahead(Number(e.target.value))}
              className="px-2 py-1.5 text-sm rounded-lg border border-border/30 bg-background text-foreground"
              data-testid="lookahead-select"
            >
              {[1, 2, 3, 5, 7].map((d) => (
                <option key={d} value={d}>{d} day{d > 1 ? "s" : ""}</option>
              ))}
            </select>
          </div>
          <button
            onClick={generatePlan}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors"
            data-testid="generate-plan-btn"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
            Generate Plan
          </button>
        </div>
      </div>

      {/* Plan Results */}
      {plan && (
        <>
          {/* KPI Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-3" data-testid="production-kpi-cards">
            <div className="rounded-xl border border-border/20 bg-background/40 backdrop-blur-sm p-4">
              <p className="text-[10px] uppercase tracking-wider text-foreground/50">BEOs</p>
              <p className="text-2xl font-bold text-foreground" data-testid="kpi-total-beos">{plan.total_beos}</p>
              <p className="text-xs text-foreground/40">{plan.total_events} events</p>
            </div>
            <div className="rounded-xl border border-border/20 bg-background/40 backdrop-blur-sm p-4">
              <p className="text-[10px] uppercase tracking-wider text-foreground/50">Ingredients</p>
              <p className="text-2xl font-bold text-foreground" data-testid="kpi-ingredients">{plan.consolidated_ingredients_count}</p>
              <p className="text-xs text-foreground/40">consolidated</p>
            </div>
            <div className="rounded-xl border border-border/20 bg-background/40 backdrop-blur-sm p-4">
              <p className="text-[10px] uppercase tracking-wider text-foreground/50">Stations</p>
              <p className="text-2xl font-bold text-foreground" data-testid="kpi-stations">{Object.keys(plan.stations).length}</p>
              <p className="text-xs text-foreground/40">{Object.keys(plan.stations).join(", ")}</p>
            </div>
            <div className="rounded-xl border border-border/20 bg-background/40 backdrop-blur-sm p-4">
              <p className="text-[10px] uppercase tracking-wider text-foreground/50">Duplicates</p>
              <p className="text-2xl font-bold text-amber-500" data-testid="kpi-duplicates">{plan.duplicate_prep_alerts.length}</p>
              <p className="text-xs text-foreground/40">consolidation saves</p>
            </div>
            <div className="rounded-xl border border-border/20 bg-background/40 backdrop-blur-sm p-4">
              <p className="text-[10px] uppercase tracking-wider text-foreground/50">Shortages</p>
              <p className={cn("text-2xl font-bold", plan.inventory_status.shortages > 0 ? "text-red-500" : "text-emerald-500")} data-testid="kpi-shortages">
                {plan.inventory_status.shortages}
              </p>
              <p className="text-xs text-foreground/40">{plan.inventory_status.covered} covered</p>
            </div>
          </div>

          {/* View Tabs */}
          <div className="flex items-center gap-1 p-1 rounded-lg bg-background/40 border border-border/20 w-fit" data-testid="production-view-tabs">
            {([
              { id: "overview", label: "Overview", icon: BarChart3 },
              { id: "sheets", label: "Station Sheets", icon: ChefHat },
              { id: "orders", label: "Purchase Orders", icon: ShoppingCart },
              { id: "timeline", label: "Timeline", icon: Clock },
              { id: "inventory", label: "Inventory", icon: Warehouse },
            ] as const).map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setView(tab.id)}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors",
                    view === tab.id ? "bg-primary text-primary-foreground" : "text-foreground/60 hover:text-foreground hover:bg-background/60"
                  )}
                  data-testid={`tab-${tab.id}`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {tab.label}
                </button>
              );
            })}
          </div>

          {/* Overview View */}
          {view === "overview" && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Events */}
              <div className="rounded-xl border border-border/20 bg-background/40 backdrop-blur-sm overflow-hidden">
                <div className="px-4 py-3 border-b border-border/10 flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-primary" />
                  <h3 className="text-sm font-semibold text-foreground">Events in Window</h3>
                </div>
                <div className="divide-y divide-border/10">
                  {plan.events.map((ev, i) => (
                    <div key={i} className="px-4 py-3 flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-foreground">{ev.event_name}</p>
                        <p className="text-xs text-foreground/50">{ev.event_date} — {ev.menu_items} items</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-bold text-foreground flex items-center gap-1">
                          <Users className="w-3 h-3" /> {ev.guest_count}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Duplicate Prep Alerts */}
              <div className="rounded-xl border border-border/20 bg-background/40 backdrop-blur-sm overflow-hidden">
                <div className="px-4 py-3 border-b border-border/10 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-500" />
                  <h3 className="text-sm font-semibold text-foreground">Consolidation Alerts</h3>
                </div>
                <div className="divide-y divide-border/10">
                  {plan.duplicate_prep_alerts.length === 0 ? (
                    <p className="px-4 py-6 text-sm text-foreground/40 text-center">No duplicate prep detected</p>
                  ) : (
                    plan.duplicate_prep_alerts.map((d, i) => (
                      <div key={i} className="px-4 py-3">
                        <div className="flex items-start gap-2">
                          <CheckCircle className="w-4 h-4 text-emerald-500 mt-0.5 flex-shrink-0" />
                          <div>
                            <p className="text-sm font-medium text-foreground">{d.ingredient}</p>
                            <p className="text-xs text-foreground/60">{d.message}</p>
                            <p className="text-xs text-foreground/40 mt-0.5">Total: {d.total_qty} {d.unit} across {d.shared_across.join(", ")}</p>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Station Overview */}
              <div className="rounded-xl border border-border/20 bg-background/40 backdrop-blur-sm overflow-hidden lg:col-span-2">
                <div className="px-4 py-3 border-b border-border/10 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <ChefHat className="w-4 h-4 text-primary" />
                    <h3 className="text-sm font-semibold text-foreground">Station Breakdown</h3>
                  </div>
                  <button
                    onClick={() => setView("sheets")}
                    className="text-xs text-primary hover:underline flex items-center gap-1"
                  >
                    View sheets <ArrowRight className="w-3 h-3" />
                  </button>
                </div>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 p-4">
                  {Object.entries(plan.stations).map(([key, station]) => {
                    const meta = STATION_META[key] || STATION_META.hot;
                    return (
                      <button
                        key={key}
                        onClick={() => { setActiveStation(key); setView("sheets"); }}
                        className={cn("rounded-lg border p-4 text-left transition-all hover:scale-[1.02]", meta.bg)}
                        data-testid={`station-card-${key}`}
                      >
                        <div className="flex items-center gap-2 mb-2">
                          <span className={meta.color}>{meta.icon}</span>
                          <span className="text-xs font-bold uppercase tracking-wider text-foreground">{key}</span>
                        </div>
                        <p className="text-2xl font-bold text-foreground">{station.total_items}</p>
                        <p className="text-[10px] text-foreground/50 mt-1 line-clamp-2">{station.description}</p>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Generate Orders Button */}
              <div className="lg:col-span-2 flex justify-center">
                <button
                  onClick={generateOrders}
                  disabled={ordersLoading}
                  className="flex items-center gap-2 px-6 py-3 text-sm font-medium rounded-xl bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50 transition-colors shadow-lg"
                  data-testid="generate-orders-btn"
                >
                  {ordersLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Truck className="w-4 h-4" />}
                  Generate Purchase Orders
                </button>
              </div>
            </div>
          )}

          {/* Station Sheets View */}
          {view === "sheets" && sheets && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 flex-wrap">
                {Object.keys(sheets).map((key) => {
                  const meta = STATION_META[key] || STATION_META.hot;
                  return (
                    <button
                      key={key}
                      onClick={() => setActiveStation(key)}
                      className={cn(
                        "flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold uppercase rounded-lg border transition-colors",
                        activeStation === key ? meta.bg + " " + meta.color : "border-border/20 text-foreground/60 hover:bg-background/60"
                      )}
                      data-testid={`sheet-tab-${key}`}
                    >
                      {meta.icon} {key} ({sheets[key]?.total_items || 0})
                    </button>
                  );
                })}
              </div>

              {activeStation && sheets[activeStation] && (
                <div className="rounded-xl border border-border/20 bg-background/40 backdrop-blur-sm overflow-hidden" data-testid="station-sheet-detail">
                  <div className="px-4 py-3 border-b border-border/10">
                    <h3 className="text-sm font-semibold text-foreground uppercase tracking-wide">
                      {activeStation} Station — {sheets[activeStation].description}
                    </h3>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-border/10 text-xs text-foreground/50">
                          <th className="text-left px-4 py-2">Item</th>
                          <th className="text-right px-4 py-2">Qty</th>
                          <th className="text-right px-4 py-2">Unit</th>
                          <th className="text-left px-4 py-2">Events</th>
                          <th className="text-center px-4 py-2">Consolidated</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border/10">
                        {sheets[activeStation].items.map((item, i) => (
                          <tr key={i} className={cn("hover:bg-background/60", item.consolidated && "bg-amber-500/5")}>
                            <td className="px-4 py-2.5 font-medium text-foreground">{item.ingredient}</td>
                            <td className="px-4 py-2.5 text-right font-mono text-foreground">
                              {item.total_qty >= 16 ? `${(item.total_qty / 16).toFixed(1)} lb` : `${item.total_qty} ${item.unit}`}
                            </td>
                            <td className="px-4 py-2.5 text-right text-foreground/60">{item.unit}</td>
                            <td className="px-4 py-2.5 text-foreground/60 text-xs">{item.events.join(", ")}</td>
                            <td className="px-4 py-2.5 text-center">
                              {item.consolidated && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-600 text-[10px] font-medium">
                                  <CheckCircle className="w-3 h-3" /> MERGED
                                </span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Purchase Orders View */}
          {view === "orders" && (
            <div className="space-y-4">
              {!orders ? (
                <div className="rounded-xl border border-border/20 bg-background/40 p-8 text-center">
                  <ShoppingCart className="w-8 h-8 text-foreground/30 mx-auto mb-3" />
                  <p className="text-sm text-foreground/50">No orders generated yet.</p>
                  <button
                    onClick={generateOrders}
                    disabled={ordersLoading}
                    className="mt-3 flex items-center gap-2 px-4 py-2 text-sm rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 mx-auto"
                    data-testid="generate-orders-inline-btn"
                  >
                    {ordersLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Truck className="w-4 h-4" />}
                    Generate Orders
                  </button>
                </div>
              ) : (
                <>
                  {orders.chef_flags.length > 0 && (
                    <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-4">
                      <h4 className="text-sm font-semibold text-amber-600 mb-2 flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4" /> Chef Verification Required
                      </h4>
                      {orders.chef_flags.map((f: any, i: number) => (
                        <p key={i} className="text-xs text-foreground/70 ml-6">{f.message}</p>
                      ))}
                    </div>
                  )}

                  {orders.items_from_commissary.length > 0 && (
                    <div className="rounded-xl border border-blue-500/30 bg-blue-500/5 p-4">
                      <h4 className="text-sm font-semibold text-blue-600 mb-2 flex items-center gap-2">
                        <Warehouse className="w-4 h-4" /> Commissary Pulls
                      </h4>
                      {orders.items_from_commissary.map((c: any, i: number) => (
                        <p key={i} className="text-xs text-foreground/70 ml-6">{c.ingredient}: {c.qty} {c.unit} from commissary</p>
                      ))}
                    </div>
                  )}

                  {orders.purchase_orders.map((po, idx) => (
                    <div key={idx} className="rounded-xl border border-border/20 bg-background/40 backdrop-blur-sm overflow-hidden" data-testid={`purchase-order-${idx}`}>
                      <div className="px-4 py-3 border-b border-border/10 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Truck className="w-4 h-4 text-emerald-500" />
                          <h3 className="text-sm font-semibold text-foreground">{po.vendor_name}</h3>
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 font-medium">
                            {po.total_items} items
                          </span>
                        </div>
                        <p className="text-xs text-foreground/50">Deliver by: {po.delivery_deadline?.slice(0, 16)}</p>
                      </div>
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="border-b border-border/10 text-xs text-foreground/50">
                              <th className="text-left px-4 py-2">Item</th>
                              <th className="text-right px-4 py-2">Order Qty</th>
                              <th className="text-right px-4 py-2">On Hand</th>
                              <th className="text-right px-4 py-2">Net Need</th>
                              <th className="text-left px-4 py-2">Events</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-border/10">
                            {po.items.map((item, i) => (
                              <tr key={i} className="hover:bg-background/60">
                                <td className="px-4 py-2.5 font-medium text-foreground">{item.ingredient_name}</td>
                                <td className="px-4 py-2.5 text-right font-mono font-bold text-foreground">{item.order_qty} {item.unit}</td>
                                <td className="px-4 py-2.5 text-right text-foreground/60">{item.on_hand} {item.unit}</td>
                                <td className="px-4 py-2.5 text-right text-foreground/60">{item.net_need} {item.unit}</td>
                                <td className="px-4 py-2.5 text-foreground/60 text-xs">{item.events?.join(", ")}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  ))}
                </>
              )}
            </div>
          )}

          {/* Timeline View */}
          {view === "timeline" && plan.timeline?.milestones && (
            <div className="rounded-xl border border-border/20 bg-background/40 backdrop-blur-sm p-6" data-testid="production-timeline">
              <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
                <Clock className="w-4 h-4 text-primary" /> Production Timeline
              </h3>
              <div className="relative ml-4">
                <div className="absolute left-2 top-0 bottom-0 w-px bg-border/30" />
                {plan.timeline.milestones.map((m, i) => {
                  const dt = new Date(m.time);
                  const isNow = new Date() > dt;
                  return (
                    <div key={i} className="relative flex items-start gap-4 mb-6 last:mb-0">
                      <div className={cn(
                        "w-4 h-4 rounded-full border-2 flex-shrink-0 z-10",
                        isNow ? "bg-emerald-500 border-emerald-500" : "bg-background border-border/50"
                      )} />
                      <div>
                        <p className="text-sm font-medium text-foreground">{m.label}</p>
                        <p className="text-xs text-foreground/50">
                          {dt.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}
                          {" at "}
                          {dt.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Inventory View */}
          {view === "inventory" && (
            <div className="space-y-4">
              {plan.inventory_status.shortage_details.length > 0 ? (
                <div className="rounded-xl border border-red-500/30 bg-red-500/5 p-4" data-testid="shortage-alerts">
                  <h4 className="text-sm font-semibold text-red-600 mb-3 flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4" /> Shortage Alerts ({plan.inventory_status.shortages})
                  </h4>
                  <div className="space-y-2">
                    {plan.inventory_status.shortage_details.map((s: any, i: number) => (
                      <div key={i} className="flex items-center justify-between px-3 py-2 rounded-lg bg-background/40">
                        <span className="text-sm font-medium text-foreground">{s.ingredient}</span>
                        <div className="text-right">
                          <p className="text-xs text-red-500 font-mono">Need: {s.needed} {s.unit} | Have: {s.on_hand} | Short: {s.shortage}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-6 text-center" data-testid="inventory-ok">
                  <CheckCircle className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
                  <p className="text-sm font-medium text-emerald-600">All {plan.inventory_status.total_ingredients} ingredients covered or will be ordered</p>
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* Empty State */}
      {!plan && !loading && (
        <div className="rounded-xl border border-border/20 bg-background/40 backdrop-blur-sm p-12 text-center" data-testid="production-empty-state">
          <Package className="w-12 h-12 text-foreground/20 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-foreground/70">No Production Plan Generated</h3>
          <p className="text-sm text-foreground/40 mt-2 max-w-md mx-auto">
            Select a production date and click "Generate Plan" to consolidate all BEOs,
            assign station tasks, and check inventory against guaranteed counts.
          </p>
        </div>
      )}
    </div>
  );
}
