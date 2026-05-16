import React, { useState, useEffect, useCallback } from "react";
import {
  Building2, UtensilsCrossed, BarChart3, MapPin, Clock,
  Plus, X, Trash2, RefreshCw, Target, TrendingUp, Scale,
  ShoppingCart, AlertTriangle, Users, Layers, ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";

const BACKEND = window.location.origin;
async function api(path: string, opts: RequestInit = {}) {
  const res = await fetch(`${BACKEND}/api/cafeteria${path}`, { headers: { "Content-Type": "application/json", ...((opts.headers as Record<string, string>) || {}) }, ...opts });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

type TabId = "overview" | "locations" | "meal-periods" | "menus" | "transactions" | "waste" | "kpis";

const TABS: { id: TabId; label: string; icon: React.ElementType }[] = [
  { id: "overview", label: "Overview", icon: BarChart3 },
  { id: "locations", label: "Locations", icon: MapPin },
  { id: "meal-periods", label: "Meal Periods", icon: Clock },
  { id: "menus", label: "Cycle Menus", icon: UtensilsCrossed },
  { id: "transactions", label: "Transactions", icon: ShoppingCart },
  { id: "waste", label: "Waste Tracker", icon: Trash2 },
  { id: "kpis", label: "KPI Engine", icon: Target },
];

const MODE_COLORS: Record<string, string> = {
  k12_school_cafeteria: "#f59e0b",
  higher_ed_dining: "#3b82f6",
  employee_dining_staff_cafeteria: "#10b981",
  healthcare_staff_retail: "#ef4444",
  luxury_resort_employee_dining: "#a855f7",
};

export default function CafeteriaPanel() {
  const [tab, setTab] = useState<TabId>("overview");

  const renderTab = () => {
    switch (tab) {
      case "overview": return <OverviewTab />;
      case "locations": return <LocationsTab />;
      case "meal-periods": return <MealPeriodsTab />;
      case "menus": return <MenusTab />;
      case "transactions": return <TransactionsTab />;
      case "waste": return <WasteTab />;
      case "kpis": return <KPIsTab />;
    }
  };

  return (
    <div className="flex flex-col h-full overflow-hidden" style={{ background: "#0a0e17" }} data-testid="cafeteria-panel">
      <div className="flex items-center gap-3 px-5 py-3 border-b" style={{ borderColor: "rgba(255,255,255,0.05)" }}>
        <div className="w-9 h-9 flex items-center justify-center rounded-lg" style={{ background: "linear-gradient(135deg, rgba(16,185,129,0.15), rgba(59,130,246,0.15))", border: "1px solid rgba(16,185,129,0.25)" }}>
          <Building2 className="w-[18px] h-[18px] text-emerald-400" />
        </div>
        <div>
          <div className="text-sm font-semibold text-white tracking-wide">Cafeteria & Employee Dining</div>
          <div className="text-[10px] font-mono text-slate-500 tracking-widest uppercase">5 Operating Modes / Institutional Foodservice</div>
        </div>
      </div>

      <div className="flex border-b px-3 overflow-x-auto" style={{ borderColor: "rgba(255,255,255,0.04)" }}>
        {TABS.map(t => (
          <button key={t.id} data-testid={`caf-tab-${t.id}`} onClick={() => setTab(t.id)}
            className="flex items-center gap-1.5 px-3 py-2.5 text-[11px] font-mono uppercase tracking-wider transition-colors border-b-2 whitespace-nowrap"
            style={{ borderColor: tab === t.id ? "#10b981" : "transparent", color: tab === t.id ? "#6ee7b7" : "#64748b" }}>
            <t.icon className="w-3.5 h-3.5" /> {t.label}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto p-5">{renderTab()}</div>
    </div>
  );
}

// ─── Overview ───────────────────────────────────────────────
function OverviewTab() {
  const [data, setData] = useState<any>(null);
  useEffect(() => { api("/overview").then(setData).catch(() => {}); }, []);
  if (!data) return <Loading />;

  return (
    <div className="space-y-5" data-testid="caf-overview-tab">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Kpi label="Locations" value={data.total_locations} accent="text-emerald-400" />
        <Kpi label="Seat Capacity" value={data.total_seat_capacity} accent="text-blue-400" />
        <Kpi label="Today Txns" value={data.today_transactions} accent="text-cyan-400" />
        <Kpi label="Today Revenue" value={`$${data.today_revenue.toFixed(2)}`} accent="text-amber-400" />
      </div>

      <div>
        <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Operating Modes</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
          {(data.available_modes || []).map((m: any) => (
            <div key={m.mode_id} className="bg-slate-800/40 rounded-lg border border-slate-700/30 p-3">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-2 h-2 rounded-full" style={{ background: MODE_COLORS[m.mode_id] || "#94a3b8" }} />
                <span className="text-xs font-semibold text-white">{m.name}</span>
              </div>
              <div className="text-[9px] font-mono text-slate-500 mb-1">OBJECTIVES</div>
              <div className="flex flex-wrap gap-1 mb-2">
                {(m.objectives || []).slice(0, 4).map((o: string) => (
                  <span key={o} className="px-1.5 py-0.5 rounded text-[8px] bg-slate-700/40 text-slate-300">{o}</span>
                ))}
              </div>
              <div className="text-[9px] font-mono text-slate-500 mb-1">METRICS</div>
              <div className="flex flex-wrap gap-1">
                {(m.metrics || []).slice(0, 3).map((met: string) => (
                  <span key={met} className="px-1.5 py-0.5 rounded text-[8px] bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">{met}</span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {data.locations.length > 0 && (
        <div>
          <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Active Locations</h3>
          <div className="space-y-1.5">
            {data.locations.map((loc: any) => (
              <div key={loc.location_id} className="flex items-center justify-between bg-slate-800/30 rounded-lg px-3 py-2 border border-slate-700/20">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full" style={{ background: MODE_COLORS[loc.mode_id] || "#94a3b8" }} />
                  <span className="text-xs text-white font-medium">{loc.name}</span>
                  <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-slate-700/40 text-slate-400">{loc.mode_name}</span>
                </div>
                <span className="text-[10px] text-slate-500">{loc.seat_capacity} seats · {loc.operating_hours}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Locations ──────────────────────────────────────────────
function LocationsTab() {
  const [locations, setLocations] = useState<any[]>([]);
  const [modes, setModes] = useState<any[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ name: "", mode_id: "", building: "", floor: "", seat_capacity: 100, operating_hours: "06:00-20:00" });

  const load = useCallback(() => {
    api("/locations").then(d => setLocations(d.locations || [])).catch(() => {});
    api("/overview").then(d => setModes(d.available_modes || [])).catch(() => {});
  }, []);
  useEffect(() => { load(); }, [load]);

  const create = async () => {
    if (!form.name || !form.mode_id) return;
    await api("/locations", { method: "POST", body: JSON.stringify(form) });
    setForm({ name: "", mode_id: "", building: "", floor: "", seat_capacity: 100, operating_hours: "06:00-20:00" });
    setShowCreate(false);
    load();
  };

  return (
    <div className="space-y-3" data-testid="caf-locations-tab">
      <div className="flex items-center justify-between">
        <span className="text-xs text-slate-400">{locations.length} Locations</span>
        <button data-testid="caf-create-location-btn" onClick={() => setShowCreate(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-mono rounded border border-emerald-500/30 text-emerald-300 bg-emerald-500/10 hover:bg-emerald-500/20 transition-colors">
          <Plus className="w-3 h-3" /> Add Location
        </button>
      </div>

      {showCreate && (
        <div className="p-4 rounded-lg border space-y-3" style={{ background: "#131825", borderColor: "rgba(16,185,129,0.2)" }}>
          <div className="flex justify-between items-center">
            <span className="text-xs font-semibold text-emerald-300">New Cafeteria Location</span>
            <button onClick={() => setShowCreate(false)}><X className="w-3.5 h-3.5 text-slate-500" /></button>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <input data-testid="caf-loc-name" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              placeholder="Location Name" className="px-2.5 py-1.5 rounded text-xs bg-slate-800/50 border border-slate-600/30 text-white placeholder-slate-500 outline-none" />
            <select data-testid="caf-loc-mode" value={form.mode_id} onChange={e => setForm(f => ({ ...f, mode_id: e.target.value }))}
              className="px-2.5 py-1.5 rounded text-xs bg-slate-800/50 border border-slate-600/30 text-white outline-none">
              <option value="">Select Mode</option>
              {modes.map(m => <option key={m.mode_id} value={m.mode_id}>{m.name}</option>)}
            </select>
            <input value={form.building} onChange={e => setForm(f => ({ ...f, building: e.target.value }))}
              placeholder="Building" className="px-2.5 py-1.5 rounded text-xs bg-slate-800/50 border border-slate-600/30 text-white placeholder-slate-500 outline-none" />
            <input value={form.floor} onChange={e => setForm(f => ({ ...f, floor: e.target.value }))}
              placeholder="Floor" className="px-2.5 py-1.5 rounded text-xs bg-slate-800/50 border border-slate-600/30 text-white placeholder-slate-500 outline-none" />
            <input type="number" value={form.seat_capacity} onChange={e => setForm(f => ({ ...f, seat_capacity: parseInt(e.target.value) || 0 }))}
              placeholder="Seat Capacity" className="px-2.5 py-1.5 rounded text-xs bg-slate-800/50 border border-slate-600/30 text-white placeholder-slate-500 outline-none" />
            <input value={form.operating_hours} onChange={e => setForm(f => ({ ...f, operating_hours: e.target.value }))}
              placeholder="Hours (06:00-20:00)" className="px-2.5 py-1.5 rounded text-xs bg-slate-800/50 border border-slate-600/30 text-white placeholder-slate-500 outline-none font-mono" />
          </div>
          <button data-testid="caf-save-location" onClick={create} disabled={!form.name || !form.mode_id}
            className="px-4 py-1.5 rounded text-xs font-mono bg-emerald-600 hover:bg-emerald-500 text-white disabled:opacity-40 transition-colors">
            Create Location
          </button>
        </div>
      )}

      {locations.map((loc, i) => (
        <div key={loc.location_id} data-testid={`caf-location-${i}`} className="bg-slate-800/40 rounded-lg border border-slate-700/30 p-4">
          <div className="flex items-center justify-between mb-1.5">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full" style={{ background: MODE_COLORS[loc.mode_id] || "#94a3b8" }} />
              <span className="text-sm font-semibold text-white">{loc.name}</span>
              <span className="text-[9px] font-mono px-1.5 py-0.5 rounded" style={{ background: `${MODE_COLORS[loc.mode_id] || '#94a3b8'}15`, color: MODE_COLORS[loc.mode_id] || '#94a3b8', border: `1px solid ${MODE_COLORS[loc.mode_id] || '#94a3b8'}30` }}>
                {loc.mode_name}
              </span>
            </div>
            <span className="text-[10px] text-slate-500">{loc.seat_capacity} seats</span>
          </div>
          <div className="text-[10px] text-slate-500">{loc.building}{loc.floor ? `, Floor ${loc.floor}` : ""} · {loc.operating_hours}</div>
        </div>
      ))}
    </div>
  );
}

// ─── Meal Periods ───────────────────────────────────────────
function MealPeriodsTab() {
  const [periods, setPeriods] = useState<any[]>([]);
  const [locations, setLocations] = useState<any[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ location_id: "", period_name: "lunch", start_time: "11:00", end_time: "14:00", max_covers: 200, subsidy_per_meal: 0 });

  const load = useCallback(() => {
    api("/meal-periods").then(d => setPeriods(d.meal_periods || [])).catch(() => {});
    api("/locations").then(d => setLocations(d.locations || [])).catch(() => {});
  }, []);
  useEffect(() => { load(); }, [load]);

  const create = async () => {
    if (!form.location_id) return;
    await api("/meal-periods", { method: "POST", body: JSON.stringify(form) });
    setShowCreate(false);
    load();
  };

  const PERIOD_NAMES = ["breakfast", "lunch", "dinner", "late_night", "grab_and_go", "snack"];

  return (
    <div className="space-y-3" data-testid="caf-meal-periods-tab">
      <div className="flex items-center justify-between">
        <span className="text-xs text-slate-400">{periods.length} Meal Periods</span>
        <button data-testid="caf-create-period-btn" onClick={() => setShowCreate(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-mono rounded border border-blue-500/30 text-blue-300 bg-blue-500/10 hover:bg-blue-500/20 transition-colors">
          <Plus className="w-3 h-3" /> Add Period
        </button>
      </div>
      {showCreate && (
        <div className="p-4 rounded-lg border space-y-3" style={{ background: "#131825", borderColor: "rgba(59,130,246,0.2)" }}>
          <div className="grid grid-cols-3 gap-2">
            <select value={form.location_id} onChange={e => setForm(f => ({ ...f, location_id: e.target.value }))}
              className="px-2.5 py-1.5 rounded text-xs bg-slate-800/50 border border-slate-600/30 text-white outline-none">
              <option value="">Select Location</option>
              {locations.map(l => <option key={l.location_id} value={l.location_id}>{l.name}</option>)}
            </select>
            <select value={form.period_name} onChange={e => setForm(f => ({ ...f, period_name: e.target.value }))}
              className="px-2.5 py-1.5 rounded text-xs bg-slate-800/50 border border-slate-600/30 text-white outline-none capitalize">
              {PERIOD_NAMES.map(p => <option key={p} value={p}>{p.replace("_", " ")}</option>)}
            </select>
            <input type="number" value={form.max_covers} onChange={e => setForm(f => ({ ...f, max_covers: parseInt(e.target.value) || 0 }))}
              placeholder="Max Covers" className="px-2.5 py-1.5 rounded text-xs bg-slate-800/50 border border-slate-600/30 text-white outline-none" />
          </div>
          <div className="grid grid-cols-3 gap-2">
            <input value={form.start_time} onChange={e => setForm(f => ({ ...f, start_time: e.target.value }))}
              placeholder="Start (11:00)" className="px-2.5 py-1.5 rounded text-xs bg-slate-800/50 border border-slate-600/30 text-white outline-none font-mono" />
            <input value={form.end_time} onChange={e => setForm(f => ({ ...f, end_time: e.target.value }))}
              placeholder="End (14:00)" className="px-2.5 py-1.5 rounded text-xs bg-slate-800/50 border border-slate-600/30 text-white outline-none font-mono" />
            <input type="number" step="0.01" value={form.subsidy_per_meal} onChange={e => setForm(f => ({ ...f, subsidy_per_meal: parseFloat(e.target.value) || 0 }))}
              placeholder="Subsidy/meal ($)" className="px-2.5 py-1.5 rounded text-xs bg-slate-800/50 border border-slate-600/30 text-white outline-none" />
          </div>
          <button onClick={create} disabled={!form.location_id} className="px-4 py-1.5 rounded text-xs font-mono bg-blue-600 hover:bg-blue-500 text-white disabled:opacity-40 transition-colors">
            Create Period
          </button>
        </div>
      )}
      {periods.map((p, i) => {
        const loc = locations.find(l => l.location_id === p.location_id);
        return (
          <div key={p.period_id} data-testid={`caf-period-${i}`} className="flex items-center justify-between bg-slate-800/40 rounded-lg border border-slate-700/30 px-4 py-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-white capitalize">{p.period_name.replace("_", " ")}</span>
                <span className="text-[9px] font-mono text-slate-400">{p.start_time} - {p.end_time}</span>
              </div>
              <div className="text-[10px] text-slate-500">{loc?.name || p.location_id} · Max {p.max_covers} covers</div>
            </div>
            {p.subsidy_per_meal > 0 && <span className="text-[10px] font-mono text-emerald-400">${p.subsidy_per_meal}/meal subsidy</span>}
          </div>
        );
      })}
    </div>
  );
}

// ─── Menus ──────────────────────────────────────────────────
function MenusTab() {
  const [menus, setMenus] = useState<any[]>([]);
  const [locations, setLocations] = useState<any[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ location_id: "", cycle_name: "", items: [] as { name: string; category: string; price: number }[] });
  const [itemName, setItemName] = useState("");
  const [itemCat, setItemCat] = useState("entree");
  const [itemPrice, setItemPrice] = useState(0);

  const load = useCallback(() => {
    api("/menus").then(d => setMenus(d.menus || [])).catch(() => {});
    api("/locations").then(d => setLocations(d.locations || [])).catch(() => {});
  }, []);
  useEffect(() => { load(); }, [load]);

  const addItem = () => {
    if (!itemName) return;
    setForm(f => ({ ...f, items: [...f.items, { name: itemName, category: itemCat, price: itemPrice }] }));
    setItemName(""); setItemPrice(0);
  };

  const create = async () => {
    if (!form.location_id || !form.cycle_name) return;
    await api("/menus", { method: "POST", body: JSON.stringify(form) });
    setShowCreate(false);
    setForm({ location_id: "", cycle_name: "", items: [] });
    load();
  };

  const CATEGORIES = ["entree", "side", "soup", "salad", "dessert", "beverage", "grab_and_go"];

  return (
    <div className="space-y-3" data-testid="caf-menus-tab">
      <div className="flex items-center justify-between">
        <span className="text-xs text-slate-400">{menus.length} Cycle Menus</span>
        <button data-testid="caf-create-menu-btn" onClick={() => setShowCreate(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-mono rounded border border-violet-500/30 text-violet-300 bg-violet-500/10 hover:bg-violet-500/20 transition-colors">
          <Plus className="w-3 h-3" /> Add Menu
        </button>
      </div>
      {showCreate && (
        <div className="p-4 rounded-lg border space-y-3" style={{ background: "#131825", borderColor: "rgba(139,92,246,0.2)" }}>
          <div className="grid grid-cols-2 gap-2">
            <select value={form.location_id} onChange={e => setForm(f => ({ ...f, location_id: e.target.value }))}
              className="px-2.5 py-1.5 rounded text-xs bg-slate-800/50 border border-slate-600/30 text-white outline-none">
              <option value="">Select Location</option>
              {locations.map(l => <option key={l.location_id} value={l.location_id}>{l.name}</option>)}
            </select>
            <input value={form.cycle_name} onChange={e => setForm(f => ({ ...f, cycle_name: e.target.value }))}
              placeholder="Cycle Name (Week 1)" className="px-2.5 py-1.5 rounded text-xs bg-slate-800/50 border border-slate-600/30 text-white placeholder-slate-500 outline-none" />
          </div>
          <div className="flex gap-2 items-end">
            <input value={itemName} onChange={e => setItemName(e.target.value)} placeholder="Item Name"
              className="flex-1 px-2.5 py-1.5 rounded text-xs bg-slate-800/50 border border-slate-600/30 text-white placeholder-slate-500 outline-none" />
            <select value={itemCat} onChange={e => setItemCat(e.target.value)}
              className="px-2.5 py-1.5 rounded text-xs bg-slate-800/50 border border-slate-600/30 text-white outline-none capitalize">
              {CATEGORIES.map(c => <option key={c} value={c}>{c.replace("_", " ")}</option>)}
            </select>
            <input type="number" step="0.01" value={itemPrice} onChange={e => setItemPrice(parseFloat(e.target.value) || 0)}
              className="w-20 px-2.5 py-1.5 rounded text-xs bg-slate-800/50 border border-slate-600/30 text-white outline-none" placeholder="$" />
            <button onClick={addItem} className="px-2 py-1.5 rounded text-xs bg-slate-700/50 text-slate-300 border border-slate-600/30 hover:bg-slate-600/50 transition-colors">+ Item</button>
          </div>
          {form.items.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {form.items.map((it, i) => (
                <span key={i} className="px-2 py-0.5 rounded text-[9px] font-mono bg-violet-500/10 text-violet-300 border border-violet-500/20 flex items-center gap-1">
                  {it.name} ({it.category}) ${it.price}
                  <button onClick={() => setForm(f => ({ ...f, items: f.items.filter((_, j) => j !== i) }))}><X className="w-2.5 h-2.5" /></button>
                </span>
              ))}
            </div>
          )}
          <button onClick={create} disabled={!form.location_id || !form.cycle_name}
            className="px-4 py-1.5 rounded text-xs font-mono bg-violet-600 hover:bg-violet-500 text-white disabled:opacity-40 transition-colors">
            Create Menu
          </button>
        </div>
      )}
      {menus.map((m, i) => {
        const loc = locations.find(l => l.location_id === m.location_id);
        return (
          <div key={m.menu_id} data-testid={`caf-menu-${i}`} className="bg-slate-800/40 rounded-lg border border-slate-700/30 p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <UtensilsCrossed className="w-3.5 h-3.5 text-violet-400" />
                <span className="text-xs font-semibold text-white">{m.cycle_name}</span>
                <span className="text-[9px] font-mono text-slate-400">{loc?.name || m.location_id}</span>
              </div>
              <span className="text-[10px] text-slate-500">{(m.items || []).length} items</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {(m.items || []).map((item: any, j: number) => (
                <span key={j} className="px-2 py-0.5 rounded text-[9px] bg-slate-700/30 text-slate-300">
                  {item.name} <span className="text-slate-500">${item.price}</span>
                </span>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Transactions ───────────────────────────────────────────
function TransactionsTab() {
  const [summary, setSummary] = useState<any>(null);
  const [locations, setLocations] = useState<any[]>([]);
  const [selectedLoc, setSelectedLoc] = useState("");
  const [showRecord, setShowRecord] = useState(false);
  const [form, setForm] = useState({ location_id: "", employee_id: "", total: 0, payment_method: "subsidy" });

  const load = useCallback(() => {
    const locFilter = selectedLoc ? `?location_id=${selectedLoc}` : "";
    api(`/transactions/summary${locFilter}`).then(setSummary).catch(() => {});
    api("/locations").then(d => setLocations(d.locations || [])).catch(() => {});
  }, [selectedLoc]);
  useEffect(() => { load(); }, [load]);

  const record = async () => {
    if (!form.location_id) return;
    await api("/transactions", { method: "POST", body: JSON.stringify(form) });
    setShowRecord(false);
    load();
  };

  const METHODS = ["subsidy", "cash", "card", "meal_plan"];

  return (
    <div className="space-y-4" data-testid="caf-transactions-tab">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <select value={selectedLoc} onChange={e => setSelectedLoc(e.target.value)}
            className="px-2.5 py-1.5 rounded text-xs bg-slate-800/50 border border-slate-600/30 text-white outline-none">
            <option value="">All Locations</option>
            {locations.map(l => <option key={l.location_id} value={l.location_id}>{l.name}</option>)}
          </select>
        </div>
        <button data-testid="caf-record-tx-btn" onClick={() => setShowRecord(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-mono rounded border border-cyan-500/30 text-cyan-300 bg-cyan-500/10 hover:bg-cyan-500/20 transition-colors">
          <Plus className="w-3 h-3" /> Record Transaction
        </button>
      </div>
      {showRecord && (
        <div className="p-4 rounded-lg border space-y-3" style={{ background: "#131825", borderColor: "rgba(6,182,212,0.2)" }}>
          <div className="grid grid-cols-2 gap-2">
            <select value={form.location_id} onChange={e => setForm(f => ({ ...f, location_id: e.target.value }))}
              className="px-2.5 py-1.5 rounded text-xs bg-slate-800/50 border border-slate-600/30 text-white outline-none">
              <option value="">Select Location</option>
              {locations.map(l => <option key={l.location_id} value={l.location_id}>{l.name}</option>)}
            </select>
            <input value={form.employee_id} onChange={e => setForm(f => ({ ...f, employee_id: e.target.value }))}
              placeholder="Employee ID" className="px-2.5 py-1.5 rounded text-xs bg-slate-800/50 border border-slate-600/30 text-white placeholder-slate-500 outline-none" />
            <input type="number" step="0.01" value={form.total} onChange={e => setForm(f => ({ ...f, total: parseFloat(e.target.value) || 0 }))}
              placeholder="Total $" className="px-2.5 py-1.5 rounded text-xs bg-slate-800/50 border border-slate-600/30 text-white outline-none" />
            <select value={form.payment_method} onChange={e => setForm(f => ({ ...f, payment_method: e.target.value }))}
              className="px-2.5 py-1.5 rounded text-xs bg-slate-800/50 border border-slate-600/30 text-white outline-none capitalize">
              {METHODS.map(m => <option key={m} value={m}>{m.replace("_", " ")}</option>)}
            </select>
          </div>
          <button onClick={record} disabled={!form.location_id} className="px-4 py-1.5 rounded text-xs font-mono bg-cyan-600 hover:bg-cyan-500 text-white disabled:opacity-40 transition-colors">
            Record
          </button>
        </div>
      )}
      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Kpi label="Transactions" value={summary.total_transactions} accent="text-cyan-400" />
          <Kpi label="Revenue" value={`$${summary.total_revenue}`} accent="text-emerald-400" />
          <Kpi label="Avg Ticket" value={`$${summary.avg_ticket}`} accent="text-amber-400" />
          <Kpi label="Date" value={summary.date} accent="text-slate-300" />
        </div>
      )}
      {summary && Object.keys(summary.by_payment_method || {}).length > 0 && (
        <div className="bg-slate-800/40 rounded-lg border border-slate-700/30 p-4">
          <h4 className="text-xs font-semibold text-slate-300 mb-2">Payment Method Breakdown</h4>
          <div className="space-y-1.5">
            {Object.entries(summary.by_payment_method).map(([method, count]) => (
              <div key={method} className="flex items-center justify-between text-xs">
                <span className="text-slate-400 capitalize">{method.replace("_", " ")}</span>
                <span className="text-white font-semibold">{String(count)}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Waste Tracker ──────────────────────────────────────────
function WasteTab() {
  const [summary, setSummary] = useState<any>(null);
  const [locations, setLocations] = useState<any[]>([]);
  const [showLog, setShowLog] = useState(false);
  const [form, setForm] = useState({ location_id: "", item_name: "", quantity_lbs: 0, reason: "overproduction" });

  const load = useCallback(() => {
    api("/waste/summary").then(setSummary).catch(() => {});
    api("/locations").then(d => setLocations(d.locations || [])).catch(() => {});
  }, []);
  useEffect(() => { load(); }, [load]);

  const log = async () => {
    if (!form.location_id || !form.item_name) return;
    await api("/waste", { method: "POST", body: JSON.stringify(form) });
    setShowLog(false);
    load();
  };

  const REASONS = ["overproduction", "expired", "damaged", "plate_waste", "prep_trim", "spoilage"];

  return (
    <div className="space-y-4" data-testid="caf-waste-tab">
      <div className="flex items-center justify-between">
        <span className="text-xs text-slate-400">{summary?.total_entries || 0} waste entries</span>
        <button data-testid="caf-log-waste-btn" onClick={() => setShowLog(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-mono rounded border border-rose-500/30 text-rose-300 bg-rose-500/10 hover:bg-rose-500/20 transition-colors">
          <Plus className="w-3 h-3" /> Log Waste
        </button>
      </div>
      {showLog && (
        <div className="p-4 rounded-lg border space-y-3" style={{ background: "#131825", borderColor: "rgba(244,63,94,0.2)" }}>
          <div className="grid grid-cols-2 gap-2">
            <select value={form.location_id} onChange={e => setForm(f => ({ ...f, location_id: e.target.value }))}
              className="px-2.5 py-1.5 rounded text-xs bg-slate-800/50 border border-slate-600/30 text-white outline-none">
              <option value="">Select Location</option>
              {locations.map(l => <option key={l.location_id} value={l.location_id}>{l.name}</option>)}
            </select>
            <input value={form.item_name} onChange={e => setForm(f => ({ ...f, item_name: e.target.value }))}
              placeholder="Item Name" className="px-2.5 py-1.5 rounded text-xs bg-slate-800/50 border border-slate-600/30 text-white placeholder-slate-500 outline-none" />
            <input type="number" step="0.1" value={form.quantity_lbs} onChange={e => setForm(f => ({ ...f, quantity_lbs: parseFloat(e.target.value) || 0 }))}
              placeholder="Quantity (lbs)" className="px-2.5 py-1.5 rounded text-xs bg-slate-800/50 border border-slate-600/30 text-white outline-none" />
            <select value={form.reason} onChange={e => setForm(f => ({ ...f, reason: e.target.value }))}
              className="px-2.5 py-1.5 rounded text-xs bg-slate-800/50 border border-slate-600/30 text-white outline-none capitalize">
              {REASONS.map(r => <option key={r} value={r}>{r.replace("_", " ")}</option>)}
            </select>
          </div>
          <button onClick={log} disabled={!form.location_id || !form.item_name}
            className="px-4 py-1.5 rounded text-xs font-mono bg-rose-600 hover:bg-rose-500 text-white disabled:opacity-40 transition-colors">
            Log Waste
          </button>
        </div>
      )}
      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          <Kpi label="Total Waste" value={`${summary.total_waste_lbs} lbs`} accent="text-rose-400" />
          <Kpi label="Entries" value={summary.total_entries} accent="text-slate-300" />
          <Kpi label="Avg/Entry" value={`${summary.avg_per_entry} lbs`} accent="text-amber-400" />
        </div>
      )}
      {summary && Object.keys(summary.by_reason || {}).length > 0 && (
        <div className="bg-slate-800/40 rounded-lg border border-slate-700/30 p-4">
          <h4 className="text-xs font-semibold text-slate-300 mb-2">Waste by Reason</h4>
          <div className="space-y-2">
            {Object.entries(summary.by_reason).sort(([, a], [, b]) => (b as number) - (a as number)).map(([reason, lbs]) => {
              const pct = summary.total_waste_lbs > 0 ? ((lbs as number) / summary.total_waste_lbs) * 100 : 0;
              return (
                <div key={reason}>
                  <div className="flex justify-between text-[10px] mb-0.5">
                    <span className="text-slate-400 capitalize">{reason.replace("_", " ")}</span>
                    <span className="text-slate-300">{String(lbs)} lbs ({pct.toFixed(0)}%)</span>
                  </div>
                  <div className="h-1 bg-slate-700/40 rounded-full overflow-hidden">
                    <div className="h-full bg-rose-500/50 rounded-full" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── KPI Engine ─────────────────────────────────────────────
function KPIsTab() {
  const [locations, setLocations] = useState<any[]>([]);
  const [selectedLoc, setSelectedLoc] = useState("");
  const [kpis, setKpis] = useState<any>(null);

  useEffect(() => { api("/locations").then(d => setLocations(d.locations || [])).catch(() => {}); }, []);

  const loadKpis = async (locId: string) => {
    setSelectedLoc(locId);
    if (!locId) { setKpis(null); return; }
    try { setKpis(await api(`/kpis/${locId}`)); } catch { setKpis(null); }
  };

  return (
    <div className="space-y-4" data-testid="caf-kpis-tab">
      <select data-testid="caf-kpi-selector" value={selectedLoc} onChange={e => loadKpis(e.target.value)}
        className="px-3 py-2 rounded text-xs bg-slate-800/50 border border-slate-600/30 text-white outline-none w-full max-w-xs">
        <option value="">Select a location to view KPIs</option>
        {locations.map(l => <option key={l.location_id} value={l.location_id}>{l.name} ({l.mode_name})</option>)}
      </select>

      {kpis && (
        <>
          <div className="flex items-center gap-2 mb-1">
            <Target className="w-4 h-4 text-emerald-400" />
            <span className="text-sm font-semibold text-white">{kpis.location}</span>
            <span className="text-[10px] font-mono text-slate-400">{kpis.mode} · {kpis.date}</span>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Kpi label="Meals Served" value={kpis.meals_served} accent="text-emerald-400" />
            <Kpi label="Revenue" value={`$${kpis.revenue}`} accent="text-blue-400" />
            <Kpi label="Cost/Meal" value={`$${kpis.cost_per_meal}`} accent="text-cyan-400" />
            <Kpi label="Waste" value={`${kpis.waste_lbs} lbs`} accent="text-rose-400" />
            <Kpi label="Participation" value={`${(kpis.participation_rate * 100).toFixed(0)}%`} accent="text-amber-400" />
            <Kpi label="Subsidy Rate" value={`${(kpis.subsidy_rate * 100).toFixed(0)}%`} accent="text-violet-400" />
            <Kpi label="Waste/Meal" value={`${kpis.waste_per_meal} lbs`} accent="text-rose-300" />
            <Kpi label="Seat Util." value={`${(kpis.seat_utilization * 100).toFixed(0)}%`} accent="text-slate-300" />
          </div>
          <div className="bg-slate-800/40 rounded-lg border border-slate-700/30 p-4">
            <div className="text-[9px] font-mono text-slate-500 mb-2">MODE OBJECTIVES</div>
            <div className="flex flex-wrap gap-1.5 mb-3">
              {(kpis.mode_objectives || []).map((o: string) => (
                <span key={o} className="px-2 py-0.5 rounded text-[9px] bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">{o}</span>
              ))}
            </div>
            <div className="text-[9px] font-mono text-slate-500 mb-2">SUCCESS METRICS</div>
            <div className="flex flex-wrap gap-1.5">
              {(kpis.mode_metrics || []).map((m: string) => (
                <span key={m} className="px-2 py-0.5 rounded text-[9px] bg-blue-500/10 text-blue-300 border border-blue-500/20">{m}</span>
              ))}
            </div>
          </div>
        </>
      )}
      {!kpis && selectedLoc && <div className="text-xs text-slate-500 text-center py-6">Loading KPIs...</div>}
      {!selectedLoc && <div className="text-xs text-slate-500 text-center py-6">Select a location above to view mode-specific KPIs</div>}
    </div>
  );
}

// ─── Shared Components ──────────────────────────────────────
function Loading() {
  return <div className="flex items-center justify-center py-12"><RefreshCw className="w-5 h-5 text-slate-500 animate-spin" /></div>;
}

function Kpi({ label, value, accent }: { label: string; value: any; accent: string }) {
  return (
    <div className="bg-slate-800/40 border border-slate-700/30 rounded-lg px-3 py-2">
      <div className="text-[10px] text-slate-500 uppercase tracking-wider">{label}</div>
      <div className={cn("text-lg font-bold", accent)}>{value ?? 0}</div>
    </div>
  );
}
