import React, { useState, useEffect, useCallback } from "react";
import { ShoppingBag, Box, RefreshCw, Plus, X, BarChart3, AlertTriangle, Truck, Package, Check } from "lucide-react";
import { cn } from "@/lib/utils";

const BACKEND = window.location.origin;
async function api(path: string, opts: RequestInit = {}) {
  const res = await fetch(`${BACKEND}/api/micro-market${path}`, { headers: { "Content-Type": "application/json", ...((opts.headers as Record<string, string>) || {}) }, ...opts });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

type TabId = "dashboard" | "kiosks" | "inventory" | "sales" | "replenishment";
const TABS: { id: TabId; label: string; icon: React.ElementType }[] = [
  { id: "dashboard", label: "Dashboard", icon: BarChart3 },
  { id: "kiosks", label: "Kiosks", icon: Box },
  { id: "inventory", label: "Inventory", icon: Package },
  { id: "sales", label: "Sales", icon: ShoppingBag },
  { id: "replenishment", label: "Replenishment", icon: Truck },
];

export default function MicroMarketPanel() {
  const [tab, setTab] = useState<TabId>("dashboard");
  return (
    <div className="flex flex-col h-full overflow-hidden" style={{ background: "#0a0e17" }} data-testid="micro-market-panel">
      <div className="flex items-center gap-3 px-5 py-3 border-b" style={{ borderColor: "rgba(255,255,255,0.05)" }}>
        <div className="w-9 h-9 flex items-center justify-center rounded-lg" style={{ background: "linear-gradient(135deg, rgba(6,182,212,0.15), rgba(59,130,246,0.15))", border: "1px solid rgba(6,182,212,0.25)" }}>
          <ShoppingBag className="w-[18px] h-[18px] text-cyan-400" />
        </div>
        <div>
          <div className="text-sm font-semibold text-white tracking-wide">Micro-Market & Smart Fridge</div>
          <div className="text-[10px] font-mono text-slate-500 tracking-widest uppercase">Unmanned Retail / Auto-Replenishment</div>
        </div>
      </div>
      <div className="flex border-b px-3 overflow-x-auto" style={{ borderColor: "rgba(255,255,255,0.04)" }}>
        {TABS.map(t => (
          <button key={t.id} data-testid={`mm-tab-${t.id}`} onClick={() => setTab(t.id)}
            className="flex items-center gap-1.5 px-3 py-2.5 text-[11px] font-mono uppercase tracking-wider border-b-2 whitespace-nowrap transition-colors"
            style={{ borderColor: tab === t.id ? "#06b6d4" : "transparent", color: tab === t.id ? "#67e8f9" : "#64748b" }}>
            <t.icon className="w-3.5 h-3.5" /> {t.label}
          </button>
        ))}
      </div>
      <div className="flex-1 overflow-y-auto p-5">
        {tab === "dashboard" && <DashboardTab />}
        {tab === "kiosks" && <KiosksTab />}
        {tab === "inventory" && <InventoryTab />}
        {tab === "sales" && <SalesTab />}
        {tab === "replenishment" && <ReplenishTab />}
      </div>
    </div>
  );
}

function DashboardTab() {
  const [data, setData] = useState<any>(null);
  useEffect(() => { api("/dashboard").then(setData).catch(() => {}); }, []);
  if (!data) return <Loading />;
  return (
    <div className="space-y-4" data-testid="mm-dashboard-tab">
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2">
        <Kpi label="Kiosks" value={data.total_kiosks} accent="text-cyan-400" />
        <Kpi label="Revenue" value={`$${data.total_revenue}`} accent="text-emerald-400" />
        <Kpi label="Sales" value={data.total_sales} accent="text-blue-400" />
        <Kpi label="Low Stock" value={data.low_stock_items} accent="text-amber-400" />
        <Kpi label="Out of Stock" value={data.out_of_stock_items} accent="text-rose-400" />
        <Kpi label="Pending Orders" value={data.pending_replenishment} accent="text-violet-400" />
      </div>
      {data.kiosks.length > 0 && (
        <div className="space-y-1.5">
          {data.kiosks.map((k: any) => (
            <div key={k.kiosk_id} className="flex items-center justify-between bg-slate-800/30 rounded-lg px-3 py-2 border border-slate-700/20">
              <div className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-emerald-400" /><span className="text-xs text-white font-medium">{k.name}</span><span className="text-[9px] font-mono text-slate-400">{k.type}</span></div>
              <div className="flex items-center gap-4 text-[10px]"><span className="text-slate-400">{k.location}</span><span className="text-emerald-400 font-mono">${k.revenue}</span><span className="text-slate-400">{k.sales} sales</span></div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function KiosksTab() {
  const [kiosks, setKiosks] = useState<any[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ name: "", kiosk_type: "smart_fridge", location: "", capacity_slots: 50, temperature_zone: "cold" });
  const load = useCallback(() => { api("/kiosks").then(d => setKiosks(d.kiosks || [])).catch(() => {}); }, []);
  useEffect(() => { load(); }, [load]);
  const create = async () => { if (!form.name) return; await api("/kiosks", { method: "POST", body: JSON.stringify(form) }); setShowCreate(false); load(); };
  const TYPES = ["smart_fridge", "micro_market", "vending", "grab_and_go_cooler"];
  const ZONES = ["cold", "frozen", "ambient", "mixed"];
  return (
    <div className="space-y-3" data-testid="mm-kiosks-tab">
      <div className="flex items-center justify-between">
        <span className="text-xs text-slate-400">{kiosks.length} Kiosks</span>
        <button data-testid="mm-create-kiosk-btn" onClick={() => setShowCreate(true)} className="flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-mono rounded border border-cyan-500/30 text-cyan-300 bg-cyan-500/10 hover:bg-cyan-500/20 transition-colors"><Plus className="w-3 h-3" /> Add Kiosk</button>
      </div>
      {showCreate && (
        <div className="p-4 rounded-lg border space-y-3" style={{ background: "#131825", borderColor: "rgba(6,182,212,0.2)" }}>
          <div className="grid grid-cols-2 gap-2">
            <input data-testid="mm-kiosk-name" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Kiosk Name" className="px-2.5 py-1.5 rounded text-xs bg-slate-800/50 border border-slate-600/30 text-white placeholder-slate-500 outline-none" />
            <select value={form.kiosk_type} onChange={e => setForm(f => ({ ...f, kiosk_type: e.target.value }))} className="px-2.5 py-1.5 rounded text-xs bg-slate-800/50 border border-slate-600/30 text-white outline-none">{TYPES.map(t => <option key={t} value={t}>{t.replace("_", " ")}</option>)}</select>
            <input value={form.location} onChange={e => setForm(f => ({ ...f, location: e.target.value }))} placeholder="Location" className="px-2.5 py-1.5 rounded text-xs bg-slate-800/50 border border-slate-600/30 text-white placeholder-slate-500 outline-none" />
            <select value={form.temperature_zone} onChange={e => setForm(f => ({ ...f, temperature_zone: e.target.value }))} className="px-2.5 py-1.5 rounded text-xs bg-slate-800/50 border border-slate-600/30 text-white outline-none">{ZONES.map(z => <option key={z} value={z}>{z}</option>)}</select>
          </div>
          <button data-testid="mm-save-kiosk" onClick={create} disabled={!form.name} className="px-4 py-1.5 rounded text-xs font-mono bg-cyan-600 hover:bg-cyan-500 text-white disabled:opacity-40 transition-colors">Create Kiosk</button>
        </div>
      )}
      {kiosks.map((k, i) => (
        <div key={k.kiosk_id} data-testid={`mm-kiosk-${i}`} className="bg-slate-800/40 rounded-lg border border-slate-700/30 p-3">
          <div className="flex items-center justify-between mb-1"><div className="flex items-center gap-2"><span className="text-xs font-semibold text-white">{k.name}</span><span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-cyan-500/10 text-cyan-300 border border-cyan-500/20">{k.kiosk_type.replace("_", " ")}</span></div><span className="text-[10px] text-slate-500">{k.temperature_zone} · {k.capacity_slots} slots</span></div>
          <div className="flex items-center gap-3 mt-1"><div className="flex-1 h-1.5 bg-slate-700/40 rounded-full overflow-hidden"><div className="h-full bg-cyan-500/60 rounded-full" style={{ width: `${k.fill_rate * 100}%` }} /></div><span className="text-[10px] text-slate-400">{Math.round(k.fill_rate * 100)}% filled</span></div>
        </div>
      ))}
    </div>
  );
}

function InventoryTab() {
  const [items, setItems] = useState<any[]>([]);
  const [kiosks, setKiosks] = useState<any[]>([]);
  const [selKiosk, setSelKiosk] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ kiosk_id: "", product_name: "", sku: "", category: "snack", price: 0, cost: 0, quantity: 10, par_level: 5 });
  const load = useCallback(() => { const qp = selKiosk ? `?kiosk_id=${selKiosk}` : ""; api(`/inventory${qp}`).then(d => setItems(d.items || [])).catch(() => {}); api("/kiosks").then(d => setKiosks(d.kiosks || [])).catch(() => {}); }, [selKiosk]);
  useEffect(() => { load(); }, [load]);
  const add = async () => { if (!form.kiosk_id || !form.product_name) return; await api("/inventory", { method: "POST", body: JSON.stringify(form) }); setShowAdd(false); load(); };
  const CATS = ["snack", "beverage", "meal", "dessert", "fresh_fruit", "salad"];
  return (
    <div className="space-y-3" data-testid="mm-inventory-tab">
      <div className="flex items-center justify-between gap-2">
        <select value={selKiosk} onChange={e => setSelKiosk(e.target.value)} className="px-2.5 py-1.5 rounded text-xs bg-slate-800/50 border border-slate-600/30 text-white outline-none"><option value="">All Kiosks</option>{kiosks.map(k => <option key={k.kiosk_id} value={k.kiosk_id}>{k.name}</option>)}</select>
        <button data-testid="mm-add-inv-btn" onClick={() => setShowAdd(true)} className="flex items-center gap-1 px-3 py-1.5 text-[10px] font-mono rounded border border-emerald-500/30 text-emerald-300 bg-emerald-500/10 hover:bg-emerald-500/20 transition-colors"><Plus className="w-3 h-3" /> Add Item</button>
      </div>
      {showAdd && (
        <div className="p-4 rounded-lg border space-y-2" style={{ background: "#131825", borderColor: "rgba(16,185,129,0.2)" }}>
          <div className="grid grid-cols-3 gap-2">
            <select value={form.kiosk_id} onChange={e => setForm(f => ({ ...f, kiosk_id: e.target.value }))} className="px-2.5 py-1.5 rounded text-xs bg-slate-800/50 border border-slate-600/30 text-white outline-none"><option value="">Kiosk</option>{kiosks.map(k => <option key={k.kiosk_id} value={k.kiosk_id}>{k.name}</option>)}</select>
            <input value={form.product_name} onChange={e => setForm(f => ({ ...f, product_name: e.target.value }))} placeholder="Product Name" className="px-2.5 py-1.5 rounded text-xs bg-slate-800/50 border border-slate-600/30 text-white placeholder-slate-500 outline-none" />
            <select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))} className="px-2.5 py-1.5 rounded text-xs bg-slate-800/50 border border-slate-600/30 text-white outline-none">{CATS.map(c => <option key={c} value={c}>{c.replace("_", " ")}</option>)}</select>
          </div>
          <div className="grid grid-cols-4 gap-2">
            <input type="number" step="0.01" value={form.price} onChange={e => setForm(f => ({ ...f, price: parseFloat(e.target.value) || 0 }))} placeholder="Price" className="px-2.5 py-1.5 rounded text-xs bg-slate-800/50 border border-slate-600/30 text-white outline-none" />
            <input type="number" step="0.01" value={form.cost} onChange={e => setForm(f => ({ ...f, cost: parseFloat(e.target.value) || 0 }))} placeholder="Cost" className="px-2.5 py-1.5 rounded text-xs bg-slate-800/50 border border-slate-600/30 text-white outline-none" />
            <input type="number" value={form.quantity} onChange={e => setForm(f => ({ ...f, quantity: parseInt(e.target.value) || 0 }))} placeholder="Qty" className="px-2.5 py-1.5 rounded text-xs bg-slate-800/50 border border-slate-600/30 text-white outline-none" />
            <input type="number" value={form.par_level} onChange={e => setForm(f => ({ ...f, par_level: parseInt(e.target.value) || 0 }))} placeholder="Par Level" className="px-2.5 py-1.5 rounded text-xs bg-slate-800/50 border border-slate-600/30 text-white outline-none" />
          </div>
          <button onClick={add} disabled={!form.kiosk_id || !form.product_name} className="px-4 py-1.5 rounded text-xs font-mono bg-emerald-600 hover:bg-emerald-500 text-white disabled:opacity-40 transition-colors">Add Item</button>
        </div>
      )}
      <div className="space-y-1.5">
        {items.map((it, i) => {
          const isLow = it.quantity <= it.par_level;
          return (
            <div key={it.inv_id} data-testid={`mm-inv-${i}`} className={cn("flex items-center justify-between rounded-lg px-3 py-2 border", isLow ? "bg-rose-500/5 border-rose-500/20" : "bg-slate-800/30 border-slate-700/20")}>
              <div className="flex items-center gap-2"><span className="text-xs text-white">{it.product_name}</span><span className="text-[9px] font-mono text-slate-400">{it.category}</span>{isLow && <AlertTriangle className="w-3 h-3 text-amber-400" />}</div>
              <div className="flex items-center gap-3 text-[10px]"><span className="text-emerald-400 font-mono">${it.price}</span><span className={cn("font-mono font-bold", isLow ? "text-rose-400" : "text-slate-300")}>{it.quantity}/{it.par_level}</span><span className="text-slate-500">{it.sold_count} sold</span></div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function SalesTab() {
  const [summary, setSummary] = useState<any>(null);
  useEffect(() => { api("/sales/summary").then(setSummary).catch(() => {}); }, []);
  return (
    <div className="space-y-4" data-testid="mm-sales-tab">
      {summary && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            <Kpi label="Sales" value={summary.total_sales} accent="text-cyan-400" />
            <Kpi label="Revenue" value={`$${summary.total_revenue}`} accent="text-emerald-400" />
            <Kpi label="Profit" value={`$${summary.total_profit}`} accent="text-amber-400" />
            <Kpi label="Margin" value={`${(summary.margin_pct * 100).toFixed(1)}%`} accent="text-violet-400" />
          </div>
          {Object.keys(summary.by_product || {}).length > 0 && (
            <div className="bg-slate-800/40 rounded-lg border border-slate-700/30 p-4">
              <h4 className="text-xs font-semibold text-slate-300 mb-2">Sales by Product</h4>
              {Object.entries(summary.by_product).sort(([, a], [, b]) => (b as number) - (a as number)).map(([name, qty]) => (
                <div key={name} className="flex justify-between text-xs py-1 border-b border-slate-700/20 last:border-0">
                  <span className="text-slate-400">{name}</span><span className="text-white font-mono">{String(qty)} units</span>
                </div>
              ))}
            </div>
          )}
        </>
      )}
      {!summary && <div className="text-xs text-slate-500 text-center py-8">No sales data for today</div>}
    </div>
  );
}

function ReplenishTab() {
  const [orders, setOrders] = useState<any[]>([]);
  const load = useCallback(() => { api("/replenishment").then(d => setOrders(d.orders || [])).catch(() => {}); }, []);
  useEffect(() => { load(); }, [load]);
  const fulfill = async (id: string) => { await api(`/replenishment/${id}/fulfill`, { method: "PUT" }); load(); };
  return (
    <div className="space-y-3" data-testid="mm-replenish-tab">
      <div className="text-xs text-slate-400">{orders.length} replenishment orders</div>
      {orders.map((o, i) => (
        <div key={o.replenish_id} data-testid={`mm-replenish-${i}`} className="bg-slate-800/40 rounded-lg border border-slate-700/30 p-3 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 mb-0.5"><span className="text-xs font-semibold text-white">{o.product_name}</span>{o.priority === "high" && <span className="text-[8px] px-1.5 py-0.5 rounded bg-rose-500/15 text-rose-300">URGENT</span>}</div>
            <div className="text-[10px] text-slate-500">Current: {o.current_qty} / Par: {o.par_level} / Reorder: {o.reorder_qty}</div>
          </div>
          {o.status === "pending" ? (
            <button onClick={() => fulfill(o.replenish_id)} className="px-3 py-1 rounded text-[10px] font-mono border border-emerald-500/30 text-emerald-300 bg-emerald-500/10 hover:bg-emerald-500/20 transition-colors flex items-center gap-1"><Check className="w-3 h-3" /> Fulfill</button>
          ) : (
            <span className="text-[10px] font-mono text-emerald-400">FULFILLED</span>
          )}
        </div>
      ))}
      {orders.length === 0 && <div className="text-xs text-slate-500 text-center py-8">No replenishment orders</div>}
    </div>
  );
}

function Loading() { return <div className="flex justify-center py-12"><RefreshCw className="w-5 h-5 text-slate-500 animate-spin" /></div>; }
function Kpi({ label, value, accent }: { label: string; value: any; accent: string }) {
  return (<div className="bg-slate-800/40 border border-slate-700/30 rounded-lg px-3 py-2"><div className="text-[10px] text-slate-500 uppercase tracking-wider">{label}</div><div className={cn("text-lg font-bold", accent)}>{value ?? 0}</div></div>);
}
