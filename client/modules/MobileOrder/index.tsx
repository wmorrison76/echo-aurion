import React, { useState, useEffect, useCallback } from "react";
import { Smartphone, Box, Clock, BarChart3, Plus, Package, Check, RefreshCw, MapPin, X } from "lucide-react";
import { cn } from "@/lib/utils";

const BACKEND = window.location.origin;
async function api(path: string, opts: RequestInit = {}) {
  const res = await fetch(`${BACKEND}/api/mobile-order${path}`, { headers: { "Content-Type": "application/json", ...((opts.headers as Record<string, string>) || {}) }, ...opts });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

type TabId = "dashboard" | "lockers" | "timeslots" | "orders";
const TABS: { id: TabId; label: string; icon: React.ElementType }[] = [
  { id: "dashboard", label: "Dashboard", icon: BarChart3 },
  { id: "lockers", label: "Lockers", icon: Box },
  { id: "timeslots", label: "Time Slots", icon: Clock },
  { id: "orders", label: "Orders", icon: Package },
];

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-blue-500/15 text-blue-300",
  preparing: "bg-amber-500/15 text-amber-300",
  ready_for_pickup: "bg-emerald-500/15 text-emerald-300",
  picked_up: "bg-slate-500/15 text-slate-400",
  expired: "bg-rose-500/15 text-rose-300",
  cancelled: "bg-slate-600/15 text-slate-500",
};

export default function MobileOrderPanel() {
  const [tab, setTab] = useState<TabId>("dashboard");
  return (
    <div className="flex flex-col h-full overflow-hidden" style={{ background: "#0a0e17" }} data-testid="mobile-order-panel">
      <div className="flex items-center gap-3 px-5 py-3 border-b" style={{ borderColor: "rgba(255,255,255,0.05)" }}>
        <div className="w-9 h-9 flex items-center justify-center rounded-lg" style={{ background: "linear-gradient(135deg, rgba(168,85,247,0.15), rgba(236,72,153,0.15))", border: "1px solid rgba(168,85,247,0.25)" }}>
          <Smartphone className="w-[18px] h-[18px] text-violet-400" />
        </div>
        <div>
          <div className="text-sm font-semibold text-white tracking-wide">Mobile Preorder & Locker Pickup</div>
          <div className="text-[10px] font-mono text-slate-500 tracking-widest uppercase">Timeslot Scheduling / Locker Assignment / Pickup Codes</div>
        </div>
      </div>
      <div className="flex border-b px-3 overflow-x-auto" style={{ borderColor: "rgba(255,255,255,0.04)" }}>
        {TABS.map(t => (
          <button key={t.id} data-testid={`mop-tab-${t.id}`} onClick={() => setTab(t.id)}
            className="flex items-center gap-1.5 px-3 py-2.5 text-[11px] font-mono uppercase tracking-wider border-b-2 whitespace-nowrap transition-colors"
            style={{ borderColor: tab === t.id ? "#a855f7" : "transparent", color: tab === t.id ? "#c4b5fd" : "#64748b" }}>
            <t.icon className="w-3.5 h-3.5" /> {t.label}
          </button>
        ))}
      </div>
      <div className="flex-1 overflow-y-auto p-5">
        {tab === "dashboard" && <DashboardTab />}
        {tab === "lockers" && <LockersTab />}
        {tab === "timeslots" && <TimeslotsTab />}
        {tab === "orders" && <OrdersTab />}
      </div>
    </div>
  );
}

function DashboardTab() {
  const [data, setData] = useState<any>(null);
  useEffect(() => { api("/dashboard").then(setData).catch(() => {}); }, []);
  if (!data) return <Loading />;
  return (
    <div className="space-y-4" data-testid="mop-dashboard-tab">
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2">
        <Kpi label="Lockers" value={data.total_lockers} accent="text-violet-400" />
        <Kpi label="Compartments" value={data.total_compartments} accent="text-blue-400" />
        <Kpi label="Occupied" value={data.occupied_compartments} accent="text-amber-400" />
        <Kpi label="Today Orders" value={data.today_orders} accent="text-cyan-400" />
        <Kpi label="Revenue" value={`$${data.today_revenue}`} accent="text-emerald-400" />
      </div>
      {Object.keys(data.by_status || {}).length > 0 && (
        <div className="flex gap-2">
          {Object.entries(data.by_status).map(([st, count]) => (
            <div key={st} className={cn("px-3 py-1.5 rounded-lg text-[10px] font-mono", STATUS_COLORS[st] || "bg-slate-600/15 text-slate-400")}>
              {st.replace("_", " ")}: {String(count)}
            </div>
          ))}
        </div>
      )}
      {data.lockers.length > 0 && (
        <div className="space-y-1.5">
          {data.lockers.map((lk: any) => (
            <div key={lk.locker_id} className="flex items-center justify-between bg-slate-800/30 rounded-lg px-3 py-2 border border-slate-700/20">
              <div className="flex items-center gap-2"><Box className="w-3.5 h-3.5 text-violet-400" /><span className="text-xs text-white font-medium">{lk.name}</span><span className="text-[9px] font-mono text-slate-400">{lk.type}</span></div>
              <div className="flex items-center gap-3 text-[10px]"><span className="text-slate-400">{lk.location}</span><span className="text-slate-300">{lk.compartments} slots</span></div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function LockersTab() {
  const [lockers, setLockers] = useState<any[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ name: "", location: "", total_compartments: 12, locker_type: "heated" });
  const load = useCallback(() => { api("/lockers").then(d => setLockers(d.lockers || [])).catch(() => {}); }, []);
  useEffect(() => { load(); }, [load]);
  const create = async () => { if (!form.name) return; await api("/lockers", { method: "POST", body: JSON.stringify(form) }); setShowCreate(false); load(); };
  const TYPES = ["heated", "refrigerated", "ambient", "combo"];
  return (
    <div className="space-y-3" data-testid="mop-lockers-tab">
      <div className="flex items-center justify-between">
        <span className="text-xs text-slate-400">{lockers.length} Lockers</span>
        <button data-testid="mop-create-locker-btn" onClick={() => setShowCreate(true)} className="flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-mono rounded border border-violet-500/30 text-violet-300 bg-violet-500/10 hover:bg-violet-500/20 transition-colors"><Plus className="w-3 h-3" /> Add Locker</button>
      </div>
      {showCreate && (
        <div className="p-4 rounded-lg border space-y-3" style={{ background: "#131825", borderColor: "rgba(168,85,247,0.2)" }}>
          <div className="grid grid-cols-2 gap-2">
            <input data-testid="mop-locker-name" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Locker Name" className="px-2.5 py-1.5 rounded text-xs bg-slate-800/50 border border-slate-600/30 text-white placeholder-slate-500 outline-none" />
            <input value={form.location} onChange={e => setForm(f => ({ ...f, location: e.target.value }))} placeholder="Location" className="px-2.5 py-1.5 rounded text-xs bg-slate-800/50 border border-slate-600/30 text-white placeholder-slate-500 outline-none" />
            <input type="number" value={form.total_compartments} onChange={e => setForm(f => ({ ...f, total_compartments: parseInt(e.target.value) || 12 }))} placeholder="Compartments" className="px-2.5 py-1.5 rounded text-xs bg-slate-800/50 border border-slate-600/30 text-white outline-none" />
            <select value={form.locker_type} onChange={e => setForm(f => ({ ...f, locker_type: e.target.value }))} className="px-2.5 py-1.5 rounded text-xs bg-slate-800/50 border border-slate-600/30 text-white outline-none">{TYPES.map(t => <option key={t} value={t}>{t}</option>)}</select>
          </div>
          <button data-testid="mop-save-locker" onClick={create} disabled={!form.name} className="px-4 py-1.5 rounded text-xs font-mono bg-violet-600 hover:bg-violet-500 text-white disabled:opacity-40 transition-colors">Create Locker</button>
        </div>
      )}
      {lockers.map((lk, i) => (
        <div key={lk.locker_id} data-testid={`mop-locker-${i}`} className="bg-slate-800/40 rounded-lg border border-slate-700/30 p-3">
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-2"><span className="text-xs font-semibold text-white">{lk.name}</span><span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-violet-500/10 text-violet-300 border border-violet-500/20">{lk.locker_type}</span></div>
            <span className="text-[10px] text-slate-500">{lk.location}</span>
          </div>
          <div className="flex items-center gap-3 mt-1"><div className="flex-1 h-1.5 bg-slate-700/40 rounded-full overflow-hidden"><div className="h-full bg-violet-500/60 rounded-full" style={{ width: `${(lk.occupied / Math.max(lk.total_compartments, 1)) * 100}%` }} /></div><span className="text-[10px] text-slate-400">{lk.occupied}/{lk.total_compartments} occupied</span></div>
        </div>
      ))}
    </div>
  );
}

function TimeslotsTab() {
  const [slots, setSlots] = useState<any[]>([]);
  const [lockers, setLockers] = useState<any[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ locker_id: "", date: new Date().toISOString().split("T")[0], time_start: "11:30", time_end: "12:00", max_orders: 10 });
  const load = useCallback(() => { api("/timeslots").then(d => setSlots(d.timeslots || [])).catch(() => {}); api("/lockers").then(d => setLockers(d.lockers || [])).catch(() => {}); }, []);
  useEffect(() => { load(); }, [load]);
  const create = async () => { if (!form.locker_id) return; await api("/timeslots", { method: "POST", body: JSON.stringify(form) }); setShowCreate(false); load(); };
  return (
    <div className="space-y-3" data-testid="mop-timeslots-tab">
      <div className="flex items-center justify-between">
        <span className="text-xs text-slate-400">{slots.length} Time Slots</span>
        <button data-testid="mop-create-slot-btn" onClick={() => setShowCreate(true)} className="flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-mono rounded border border-blue-500/30 text-blue-300 bg-blue-500/10 hover:bg-blue-500/20 transition-colors"><Plus className="w-3 h-3" /> Add Slot</button>
      </div>
      {showCreate && (
        <div className="p-4 rounded-lg border space-y-3" style={{ background: "#131825", borderColor: "rgba(59,130,246,0.2)" }}>
          <div className="grid grid-cols-2 gap-2">
            <select value={form.locker_id} onChange={e => setForm(f => ({ ...f, locker_id: e.target.value }))} className="px-2.5 py-1.5 rounded text-xs bg-slate-800/50 border border-slate-600/30 text-white outline-none"><option value="">Select Locker</option>{lockers.map(l => <option key={l.locker_id} value={l.locker_id}>{l.name}</option>)}</select>
            <input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} className="px-2.5 py-1.5 rounded text-xs bg-slate-800/50 border border-slate-600/30 text-white outline-none" />
            <input value={form.time_start} onChange={e => setForm(f => ({ ...f, time_start: e.target.value }))} placeholder="Start (11:30)" className="px-2.5 py-1.5 rounded text-xs bg-slate-800/50 border border-slate-600/30 text-white outline-none font-mono" />
            <input value={form.time_end} onChange={e => setForm(f => ({ ...f, time_end: e.target.value }))} placeholder="End (12:00)" className="px-2.5 py-1.5 rounded text-xs bg-slate-800/50 border border-slate-600/30 text-white outline-none font-mono" />
          </div>
          <button onClick={create} disabled={!form.locker_id} className="px-4 py-1.5 rounded text-xs font-mono bg-blue-600 hover:bg-blue-500 text-white disabled:opacity-40 transition-colors">Create Slot</button>
        </div>
      )}
      {slots.map((s, i) => (
        <div key={s.slot_id} data-testid={`mop-slot-${i}`} className="flex items-center justify-between bg-slate-800/40 rounded-lg border border-slate-700/30 px-3 py-2">
          <div className="flex items-center gap-3"><Clock className="w-3.5 h-3.5 text-blue-400" /><span className="text-xs text-white font-mono">{s.time_start} - {s.time_end}</span><span className="text-[9px] text-slate-400">{s.date}</span></div>
          <div className="flex items-center gap-2"><span className={cn("text-[10px] font-mono", s.available > 0 ? "text-emerald-400" : "text-rose-400")}>{s.available}/{s.max_orders} available</span></div>
        </div>
      ))}
    </div>
  );
}

function OrdersTab() {
  const [orders, setOrders] = useState<any[]>([]);
  const [lockers, setLockers] = useState<any[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ employee_id: "", guest_name: "", locker_id: "", items: [{ name: "Grilled Chicken Wrap", quantity: 1, price: 9.50 }], payment_method: "meal_plan" });
  const [pickupCode, setPickupCode] = useState("");
  const load = useCallback(() => { api("/orders").then(d => setOrders(d.orders || [])).catch(() => {}); api("/lockers").then(d => setLockers(d.lockers || [])).catch(() => {}); }, []);
  useEffect(() => { load(); }, [load]);

  const createOrder = async () => {
    if (!form.locker_id) return;
    await api("/orders", { method: "POST", body: JSON.stringify(form) });
    setShowCreate(false);
    load();
  };

  const updateStatus = async (orderId: string, status: string) => { await api(`/orders/${orderId}/status?status=${status}`, { method: "PUT" }); load(); };
  const verifyPickup = async () => { if (!pickupCode) return; try { await api(`/pickup/${pickupCode}`, { method: "POST" }); setPickupCode(""); load(); } catch {} };

  return (
    <div className="space-y-3" data-testid="mop-orders-tab">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <input value={pickupCode} onChange={e => setPickupCode(e.target.value.toUpperCase())} placeholder="Pickup Code" className="w-28 px-2.5 py-1.5 rounded text-xs bg-slate-800/50 border border-slate-600/30 text-white placeholder-slate-500 outline-none font-mono uppercase" />
          <button data-testid="mop-verify-pickup" onClick={verifyPickup} disabled={!pickupCode} className="px-3 py-1.5 text-[10px] font-mono rounded border border-emerald-500/30 text-emerald-300 bg-emerald-500/10 hover:bg-emerald-500/20 transition-colors disabled:opacity-40"><Check className="w-3 h-3 inline mr-1" />Verify</button>
        </div>
        <button data-testid="mop-create-order-btn" onClick={() => setShowCreate(true)} className="flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-mono rounded border border-violet-500/30 text-violet-300 bg-violet-500/10 hover:bg-violet-500/20 transition-colors"><Plus className="w-3 h-3" /> New Order</button>
      </div>
      {showCreate && (
        <div className="p-4 rounded-lg border space-y-3" style={{ background: "#131825", borderColor: "rgba(168,85,247,0.2)" }}>
          <div className="grid grid-cols-3 gap-2">
            <input value={form.guest_name} onChange={e => setForm(f => ({ ...f, guest_name: e.target.value }))} placeholder="Guest/Employee Name" className="px-2.5 py-1.5 rounded text-xs bg-slate-800/50 border border-slate-600/30 text-white placeholder-slate-500 outline-none" />
            <select value={form.locker_id} onChange={e => setForm(f => ({ ...f, locker_id: e.target.value }))} className="px-2.5 py-1.5 rounded text-xs bg-slate-800/50 border border-slate-600/30 text-white outline-none"><option value="">Select Locker</option>{lockers.map(l => <option key={l.locker_id} value={l.locker_id}>{l.name}</option>)}</select>
            <select value={form.payment_method} onChange={e => setForm(f => ({ ...f, payment_method: e.target.value }))} className="px-2.5 py-1.5 rounded text-xs bg-slate-800/50 border border-slate-600/30 text-white outline-none">{["meal_plan", "card", "badge", "cash"].map(m => <option key={m} value={m}>{m.replace("_", " ")}</option>)}</select>
          </div>
          <button onClick={createOrder} disabled={!form.locker_id} className="px-4 py-1.5 rounded text-xs font-mono bg-violet-600 hover:bg-violet-500 text-white disabled:opacity-40 transition-colors">Place Order</button>
        </div>
      )}
      {orders.map((o, i) => (
        <div key={o.order_id} data-testid={`mop-order-${i}`} className="bg-slate-800/40 rounded-lg border border-slate-700/30 p-3">
          <div className="flex items-center justify-between mb-1.5">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-white">{o.guest_name || o.employee_id || "Guest"}</span>
              <span className={cn("text-[9px] font-mono px-1.5 py-0.5 rounded", STATUS_COLORS[o.status])}>{o.status.replace("_", " ")}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono text-violet-400 font-bold">{o.pickup_code}</span>
              <span className="text-[10px] text-emerald-400 font-mono">${o.total}</span>
            </div>
          </div>
          <div className="flex items-center gap-3 text-[10px] text-slate-500 mb-2">
            <span>{o.locker_name} / Slot #{o.compartment_number}</span>
            <span>{o.item_count} items</span>
            <span>{o.payment_method.replace("_", " ")}</span>
          </div>
          <div className="flex gap-1.5">
            {o.status === "pending" && <button onClick={() => updateStatus(o.order_id, "preparing")} className="px-2 py-0.5 rounded text-[9px] font-mono bg-amber-500/10 text-amber-300 border border-amber-500/20 hover:bg-amber-500/20">Start Prep</button>}
            {o.status === "preparing" && <button onClick={() => updateStatus(o.order_id, "ready_for_pickup")} className="px-2 py-0.5 rounded text-[9px] font-mono bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 hover:bg-emerald-500/20">Mark Ready</button>}
            {(o.status === "pending" || o.status === "preparing") && <button onClick={() => updateStatus(o.order_id, "cancelled")} className="px-2 py-0.5 rounded text-[9px] font-mono bg-rose-500/10 text-rose-300 border border-rose-500/20 hover:bg-rose-500/20">Cancel</button>}
          </div>
        </div>
      ))}
    </div>
  );
}

function Loading() { return <div className="flex justify-center py-12"><RefreshCw className="w-5 h-5 text-slate-500 animate-spin" /></div>; }
function Kpi({ label, value, accent }: { label: string; value: any; accent: string }) {
  return (<div className="bg-slate-800/40 border border-slate-700/30 rounded-lg px-3 py-2"><div className="text-[10px] text-slate-500 uppercase tracking-wider">{label}</div><div className={cn("text-lg font-bold", accent)}>{value ?? 0}</div></div>);
}
