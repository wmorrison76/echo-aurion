/**
 * FreshMealSystemsPanel — Manufacturing-Grade Orchestration
 * 10-tab panel for meal kits, ready-to-heat, grab-and-go,
 * subscriptions, corporate delivery, hospital discharge nutrition.
 */
import React, { useState, useCallback, useEffect, useMemo } from "react";
import {
  Package,
  Factory,
  Truck,
  Users,
  BarChart3,
  ShieldCheck,
  Thermometer,
  Calendar,
  DollarSign,
  MapPin,
  Plus,
  Loader2,
  Check,
  X,
  AlertTriangle,
  ChevronRight,
  Play,
  Pause,
  RefreshCw,
  ArrowRight,
  Box,
  Layers,
  TrendingUp,
  Settings,
  Zap,
  Clock,
  Target,
} from "lucide-react";
import { cn } from "@/lib/glass";

const API = "";

async function api<T = any>(path: string, opts?: RequestInit): Promise<T> {
  const r = await fetch(`${API}/api/fresh-meals${path}`, {
    headers: { "Content-Type": "application/json" },
    ...opts,
  });
  if (!r.ok) throw new Error(`${r.status} ${r.statusText}`);
  return r.json();
}

function fmtUsd(n: number) { return `$${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`; }
function fmtPct(n: number) { return `${(n * 100).toFixed(1)}%`; }

type TabId = "ops-center" | "overview" | "production" | "assembly" | "packaging" | "subscriptions" | "distribution" | "forecasting" | "margin" | "safety" | "routing";

const TABS: { id: TabId; label: string; icon: React.ElementType }[] = [
  { id: "ops-center", label: "Ops Center", icon: Target },
  { id: "overview", label: "Overview", icon: BarChart3 },
  { id: "production", label: "Production Runs", icon: Factory },
  { id: "assembly", label: "Assembly Lines", icon: Layers },
  { id: "packaging", label: "Packaging Logic", icon: Box },
  { id: "subscriptions", label: "Subscriptions", icon: Users },
  { id: "distribution", label: "Distribution", icon: Truck },
  { id: "forecasting", label: "Forecasting", icon: TrendingUp },
  { id: "margin", label: "Margin Optimizer", icon: DollarSign },
  { id: "safety", label: "Safety Validation", icon: ShieldCheck },
  { id: "routing", label: "Routing Planner", icon: MapPin },
];

// ─── Ops Center Tab (Real-Time Production Command Center) ──────────
function OpsCenterTab() {
  const [data, setData] = useState<any>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);

  const load = useCallback(async () => {
    setRefreshing(true);
    try { const d = await api("/ops-dashboard"); setData(d); }
    catch { /* ignore */ }
    setRefreshing(false);
  }, []);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(load, 15000);
    return () => clearInterval(interval);
  }, [autoRefresh, load]);

  if (!data) return <Loading />;

  const prod = data.production || {};
  const lanes = data.lanes || {};
  const delivery = data.delivery || {};
  const subs = data.subscriptions || {};
  const alerts = data.alerts || [];
  const channelDist = data.channel_product_distribution || {};

  const sevColors: Record<string, string> = {
    critical: "bg-rose-500/15 border-rose-500/30 text-rose-300",
    urgent: "bg-amber-500/15 border-amber-500/30 text-amber-300",
    warning: "bg-yellow-500/10 border-yellow-500/30 text-yellow-300",
  };

  const laneStatusColors: Record<string, string> = {
    overloaded: "text-rose-400",
    busy: "text-amber-400",
    available: "text-emerald-400",
    idle: "text-slate-500",
  };

  return (
    <div className="space-y-5" data-testid="ops-center-tab">
      {/* Header bar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-xs text-slate-400">Live | Updated {data.timestamp?.split("T")[1]?.split(".")[0] || "now"}</span>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setAutoRefresh(a => !a)} className={cn("text-[10px] px-2 py-1 rounded border", autoRefresh ? "border-emerald-500/30 text-emerald-300 bg-emerald-500/10" : "border-slate-600 text-slate-400")}>
            {autoRefresh ? "Auto-refresh ON" : "Auto-refresh OFF"}
          </button>
          <button onClick={load} disabled={refreshing} className="flex items-center gap-1 px-2 py-1 bg-slate-700/40 text-slate-300 rounded text-[10px] border border-slate-600/40 hover:bg-slate-700/60">
            <RefreshCw className={cn("w-3 h-3", refreshing && "animate-spin")} /> Refresh
          </button>
        </div>
      </div>

      {/* Alerts banner */}
      {alerts.length > 0 && (
        <div className="space-y-1.5">
          {alerts.slice(0, 4).map((a: any, i: number) => (
            <div key={i} className={cn("flex items-center gap-2 text-xs rounded-lg px-3 py-2 border", sevColors[a.severity] || sevColors.warning)}>
              <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
              <span className="font-medium">{a.source}</span>
              <span className="opacity-80">{a.message}</span>
            </div>
          ))}
          {alerts.length > 4 && <div className="text-[10px] text-slate-500 pl-2">+ {alerts.length - 4} more alerts</div>}
        </div>
      )}

      {/* Production KPIs */}
      <div>
        <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Production Pipeline</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-2">
          <MiniKpi label="In Progress" value={prod.in_progress} accent="text-emerald-400" />
          <MiniKpi label="Scheduled" value={prod.scheduled} accent="text-blue-400" />
          <MiniKpi label="Paused" value={prod.paused} accent="text-amber-400" />
          <MiniKpi label="Kits in Queue" value={prod.kits_in_queue?.toLocaleString()} accent="text-cyan-400" />
          <MiniKpi label="Produced Today" value={prod.kits_produced_today?.toLocaleString()} accent="text-emerald-300" />
          <MiniKpi label="Pending Labor Hrs" value={prod.labor_hours_pending} accent="text-violet-400" />
        </div>
      </div>

      {/* Active Runs + Lane Utilization side by side */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Active runs */}
        <div className="bg-slate-800/40 rounded-lg border border-slate-700/30 p-4">
          <h3 className="text-xs font-semibold text-slate-300 mb-3 flex items-center gap-1.5"><Factory className="w-3.5 h-3.5 text-cyan-400" /> Active Runs</h3>
          {(prod.active_runs || []).length === 0 && <div className="text-xs text-slate-500 text-center py-4">No active runs</div>}
          <div className="space-y-2">
            {(prod.active_runs || []).map((r: any) => (
              <div key={r.run_id} data-testid={`ops-run-${r.run_id}`} className="bg-slate-700/20 rounded-lg px-3 py-2">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-semibold text-slate-200">{r.name}</span>
                  <div className="flex items-center gap-2">
                    {r.priority === "urgent" && <Zap className="w-3 h-3 text-amber-400" />}
                    <span className={cn("text-[10px] px-1.5 py-0.5 rounded-full",
                      r.status === "in_progress" ? "bg-emerald-500/15 text-emerald-300" :
                      r.status === "scheduled" ? "bg-blue-500/15 text-blue-300" :
                      "bg-slate-500/15 text-slate-300"
                    )}>{r.status.replace("_", " ")}</span>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex-1 h-1.5 bg-slate-600/40 rounded-full overflow-hidden">
                    <div className="h-full bg-cyan-500/70 rounded-full transition-all" style={{ width: `${Math.min(r.progress_pct * 100, 100)}%` }} />
                  </div>
                  <span className="text-[10px] text-slate-400 w-8 text-right">{Math.round(r.progress_pct * 100)}%</span>
                </div>
                <div className="flex gap-4 mt-1 text-[10px] text-slate-500">
                  <span>{r.total_kits} kits</span>
                  <span>{r.est_hours}h est</span>
                  <span>{r.kits_produced} produced</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Lane utilization */}
        <div className="bg-slate-800/40 rounded-lg border border-slate-700/30 p-4">
          <h3 className="text-xs font-semibold text-slate-300 mb-1 flex items-center gap-1.5"><Layers className="w-3.5 h-3.5 text-violet-400" /> Lane Utilization</h3>
          <div className="text-[10px] text-slate-500 mb-3">Avg: {Math.round(lanes.avg_utilization * 100)}% across {lanes.total_active} lanes</div>
          {(lanes.lanes || []).length === 0 && <div className="text-xs text-slate-500 text-center py-4">No active lanes</div>}
          <div className="space-y-2">
            {(lanes.lanes || []).map((l: any) => (
              <div key={l.lane_id} data-testid={`ops-lane-${l.lane_id}`} className="bg-slate-700/20 rounded-lg px-3 py-2">
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-slate-200">{l.lane_name}</span>
                    <span className="text-[9px] bg-slate-600/40 text-slate-400 rounded px-1.5 py-0.5">{l.lane_type}</span>
                  </div>
                  <span className={cn("text-[10px] font-semibold", laneStatusColors[l.status])}>{l.status.toUpperCase()}</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex-1 h-1.5 bg-slate-600/40 rounded-full overflow-hidden">
                    <div className={cn("h-full rounded-full transition-all",
                      l.status === "overloaded" ? "bg-rose-500/70" :
                      l.status === "busy" ? "bg-amber-500/70" :
                      l.status === "available" ? "bg-emerald-500/70" : "bg-slate-600/50"
                    )} style={{ width: `${Math.min(l.utilization_pct * 100, 100)}%` }} />
                  </div>
                  <span className="text-[10px] text-slate-400 w-8 text-right">{Math.round(l.utilization_pct * 100)}%</span>
                </div>
                <div className="flex gap-4 mt-1 text-[10px] text-slate-500">
                  <span>{l.assigned_runs} runs</span>
                  <span>{l.kits_assigned}/{l.max_capacity_8h} kits (8h cap)</span>
                  <span>{l.effective_throughput}/hr</span>
                  {l.bottleneck && <span className="text-amber-400">BN: {l.bottleneck}</span>}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Delivery + Subscriptions + Channel Distribution */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Delivery summary */}
        <div className="bg-slate-800/40 rounded-lg border border-slate-700/30 p-4">
          <h3 className="text-xs font-semibold text-slate-300 mb-3 flex items-center gap-1.5"><Truck className="w-3.5 h-3.5 text-blue-400" /> Delivery Pipeline</h3>
          <div className="space-y-2">
            <div className="flex justify-between text-xs"><span className="text-slate-400">Routes</span><span className="text-slate-200 font-semibold">{delivery.total_routes}</span></div>
            <div className="flex justify-between text-xs"><span className="text-slate-400">Total Stops</span><span className="text-slate-200 font-semibold">{delivery.total_stops}</span></div>
            <div className="flex justify-between text-xs"><span className="text-slate-400">Distance</span><span className="text-slate-200 font-semibold">{delivery.total_distance_miles} mi</span></div>
            <div className="flex justify-between text-xs"><span className="text-slate-400">Delivery Cost</span><span className="text-emerald-400 font-semibold">{fmtUsd(delivery.total_delivery_cost || 0)}</span></div>
            <div className="flex justify-between text-xs"><span className="text-slate-400">Cold Chain</span><span className="text-cyan-400 font-semibold">{delivery.cold_chain_routes} routes</span></div>
          </div>
        </div>

        {/* Subscription pipeline */}
        <div className="bg-slate-800/40 rounded-lg border border-slate-700/30 p-4">
          <h3 className="text-xs font-semibold text-slate-300 mb-3 flex items-center gap-1.5"><Users className="w-3.5 h-3.5 text-emerald-400" /> Subscription Pipeline</h3>
          <div className="space-y-2">
            <div className="flex justify-between text-xs"><span className="text-slate-400">Active Subs</span><span className="text-slate-200 font-semibold">{subs.active}</span></div>
            <div className="flex justify-between text-xs"><span className="text-slate-400">Meals Next Cycle</span><span className="text-cyan-400 font-semibold">{subs.meals_next_cycle}</span></div>
            {Object.entries(subs.by_plan || {}).map(([plan, info]: [string, any]) => (
              <div key={plan} className="flex justify-between text-xs"><span className="text-slate-400 capitalize">{plan}</span><span className="text-slate-300">{info.subscribers} subs / {info.meals} meals</span></div>
            ))}
          </div>
        </div>

        {/* Channel distribution */}
        <div className="bg-slate-800/40 rounded-lg border border-slate-700/30 p-4">
          <h3 className="text-xs font-semibold text-slate-300 mb-3 flex items-center gap-1.5"><BarChart3 className="w-3.5 h-3.5 text-amber-400" /> Channel Mix</h3>
          {Object.keys(channelDist).length === 0 && <div className="text-xs text-slate-500 text-center py-4">No products yet</div>}
          <div className="space-y-2">
            {Object.entries(channelDist).map(([ch, count]) => {
              const maxVal = Math.max(...Object.values(channelDist).map(Number), 1);
              const pct = (Number(count) / maxVal) * 100;
              return (
                <div key={ch}>
                  <div className="flex justify-between text-[10px] mb-0.5"><span className="text-slate-400">{ch.replace(/_/g, " ")}</span><span className="text-slate-300">{String(count)}</span></div>
                  <div className="h-1 bg-slate-700/40 rounded-full overflow-hidden"><div className="h-full bg-amber-500/50 rounded-full" style={{ width: `${pct}%` }} /></div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

function MiniKpi({ label, value, accent }: { label: string; value: any; accent: string }) {
  return (
    <div className="bg-slate-800/40 border border-slate-700/30 rounded-lg px-3 py-2">
      <div className="text-[10px] text-slate-500 uppercase tracking-wider">{label}</div>
      <div className={cn("text-lg font-bold", accent)}>{value ?? 0}</div>
    </div>
  );
}

// ─── Overview Tab ──────────────────────────────────────────────────
function OverviewTab() {
  const [data, setData] = useState<any>(null);
  useEffect(() => { api("/overview").then(setData); }, []);
  if (!data) return <Loading />;
  const ch = data.available_channels || [];
  const zones = data.assembly_zones || [];
  return (
    <div className="space-y-4" data-testid="overview-tab">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KpiCard label="Products" value={data.total_products} icon={Package} color="text-cyan-400" />
        <KpiCard label="Active Runs" value={data.active_production_runs} icon={Factory} color="text-amber-400" />
        <KpiCard label="Assembly Lanes" value={data.active_assembly_lanes} icon={Layers} color="text-violet-400" />
        <KpiCard label="Subscriptions" value={data.active_subscriptions} icon={Users} color="text-emerald-400" />
        <KpiCard label="Routes" value={data.total_routes} icon={Truck} color="text-blue-400" />
        <KpiCard label="Kits Produced" value={data.completed_kits_total} icon={Box} color="text-orange-400" />
        <KpiCard label="Runs Completed" value={data.completed_runs_total} icon={Check} color="text-green-400" />
        <KpiCard label="KB Loaded" value={data.knowledge_base_loaded ? "Yes" : "No"} icon={Zap} color="text-rose-400" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-slate-800/40 rounded-lg p-4 border border-slate-700/30">
          <h3 className="text-sm font-semibold text-slate-200 mb-3">Distribution Channels</h3>
          <div className="space-y-2">
            {ch.map((c: string) => <div key={c} className="text-xs text-slate-300 bg-slate-700/30 rounded px-3 py-1.5">{c.replace(/_/g, " ")}</div>)}
          </div>
        </div>
        <div className="bg-slate-800/40 rounded-lg p-4 border border-slate-700/30">
          <h3 className="text-sm font-semibold text-slate-200 mb-3">Assembly Zones (EchoLayout)</h3>
          <div className="flex flex-wrap gap-2">
            {zones.map((z: string) => <span key={z} className="text-xs bg-violet-500/15 text-violet-300 rounded-lg px-2.5 py-1">{z.replace(/_/g, " ")}</span>)}
          </div>
          <h4 className="text-xs text-slate-400 mt-3 mb-2">Lane Throughput Reference</h4>
          <div className="grid grid-cols-3 gap-2 text-center text-xs">
            {Object.entries(data.lane_throughput_reference || {}).map(([k, v]) => (
              <div key={k} className="bg-slate-700/30 rounded p-2"><div className="text-slate-200 font-semibold">{String(v)}</div><div className="text-[10px] text-slate-500">{k.replace(/_/g, " ")}</div></div>
            ))}
          </div>
        </div>
      </div>
      {Object.keys(data.product_type_distribution || {}).length > 0 && (
        <div className="bg-slate-800/40 rounded-lg p-4 border border-slate-700/30">
          <h3 className="text-sm font-semibold text-slate-200 mb-3">Product Type Distribution</h3>
          <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
            {Object.entries(data.product_type_distribution).map(([k, v]) => (
              <div key={k} className="bg-slate-700/30 rounded p-2 text-center"><div className="text-lg font-bold text-cyan-300">{String(v)}</div><div className="text-[10px] text-slate-500">{k.replace(/_/g, " ")}</div></div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Production Runs Tab ───────────────────────────────────────────
function ProductionTab() {
  const [runs, setRuns] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [lanes, setLanes] = useState<any[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: "", product_ids: [] as string[], quantities: {} as Record<string, number>, lane_id: "", priority: "normal" });

  const load = useCallback(async () => {
    const [r, p, l] = await Promise.all([api("/production-runs"), api("/products"), api("/assembly-lanes")]);
    setRuns(r.runs || []); setProducts(p.products || []); setLanes(l.lanes || []);
  }, []);
  useEffect(() => { load(); }, [load]);

  const create = async () => {
    await api("/production-runs", { method: "POST", body: JSON.stringify(form) });
    setShowForm(false); load();
  };
  const updateStatus = async (runId: string, status: string) => {
    await api(`/production-runs/${runId}/status?status=${status}`, { method: "PUT" }); load();
  };

  const toggleProduct = (pid: string) => {
    setForm(f => {
      const ids = f.product_ids.includes(pid) ? f.product_ids.filter(x => x !== pid) : [...f.product_ids, pid];
      const q = { ...f.quantities };
      if (!q[pid]) q[pid] = 50;
      return { ...f, product_ids: ids, quantities: q };
    });
  };

  const statusColors: Record<string, string> = { scheduled: "text-blue-300 bg-blue-500/15", in_progress: "text-amber-300 bg-amber-500/15", completed: "text-emerald-300 bg-emerald-500/15", paused: "text-slate-300 bg-slate-500/15", cancelled: "text-rose-300 bg-rose-500/15" };

  return (
    <div className="space-y-4" data-testid="production-tab">
      <div className="flex justify-between items-center">
        <h3 className="text-sm font-semibold text-slate-200">Production Runs</h3>
        <button onClick={() => setShowForm(!showForm)} className="flex items-center gap-1 px-3 py-1.5 bg-cyan-600/20 text-cyan-300 rounded-lg text-xs border border-cyan-500/30 hover:bg-cyan-600/30"><Plus className="w-3 h-3" /> New Run</button>
      </div>
      {showForm && (
        <div className="bg-slate-800/50 border border-slate-700/40 rounded-lg p-4 space-y-3">
          <input placeholder="Run name" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className="w-full bg-slate-700/60 text-slate-200 rounded px-3 py-1.5 text-sm border border-slate-600/50" />
          <div className="text-xs text-slate-400 mb-1">Select products:</div>
          <div className="max-h-32 overflow-y-auto space-y-1">
            {products.map(p => (
              <label key={p.product_id} className="flex items-center gap-2 text-xs text-slate-300 hover:bg-slate-700/30 rounded px-2 py-1 cursor-pointer">
                <input type="checkbox" checked={form.product_ids.includes(p.product_id)} onChange={() => toggleProduct(p.product_id)} />
                <span className="flex-1">{p.name}</span>
                {form.product_ids.includes(p.product_id) && (
                  <input type="number" value={form.quantities[p.product_id] || 50} onChange={e => setForm(f => ({ ...f, quantities: { ...f.quantities, [p.product_id]: +e.target.value } }))} className="w-16 bg-slate-700 rounded px-1 py-0.5 text-xs" />
                )}
              </label>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-2">
            <select value={form.lane_id} onChange={e => setForm(f => ({ ...f, lane_id: e.target.value }))} className="bg-slate-700/60 text-slate-200 rounded px-2 py-1.5 text-sm border border-slate-600/50">
              <option value="">Auto-assign lane</option>
              {lanes.map(l => <option key={l.lane_id} value={l.lane_id}>{l.name} ({l.effective_throughput_per_hour}/hr)</option>)}
            </select>
            <select value={form.priority} onChange={e => setForm(f => ({ ...f, priority: e.target.value }))} className="bg-slate-700/60 text-slate-200 rounded px-2 py-1.5 text-sm border border-slate-600/50">
              <option value="low">Low</option><option value="normal">Normal</option><option value="urgent">Urgent</option>
            </select>
          </div>
          <button onClick={create} disabled={!form.name || form.product_ids.length === 0} className="px-4 py-1.5 bg-cyan-600 text-white rounded text-xs disabled:opacity-50">Create Run</button>
        </div>
      )}
      <div className="space-y-2">
        {runs.map(r => (
          <div key={r.run_id} data-testid={`run-${r.run_id}`} className="bg-slate-800/40 border border-slate-700/30 rounded-lg p-3">
            <div className="flex items-center justify-between mb-2">
              <div><span className="text-sm font-semibold text-slate-100">{r.name}</span><span className={cn("ml-2 text-[10px] px-2 py-0.5 rounded-full", statusColors[r.status])}>{r.status}</span></div>
              <div className="flex gap-1">
                {r.status === "scheduled" && <button onClick={() => updateStatus(r.run_id, "in_progress")} className="p-1 rounded bg-emerald-600/20 text-emerald-300 hover:bg-emerald-600/30"><Play className="w-3 h-3" /></button>}
                {r.status === "in_progress" && <button onClick={() => updateStatus(r.run_id, "completed")} className="p-1 rounded bg-blue-600/20 text-blue-300 hover:bg-blue-600/30"><Check className="w-3 h-3" /></button>}
                {r.status === "in_progress" && <button onClick={() => updateStatus(r.run_id, "paused")} className="p-1 rounded bg-amber-600/20 text-amber-300 hover:bg-amber-600/30"><Pause className="w-3 h-3" /></button>}
              </div>
            </div>
            <div className="grid grid-cols-4 gap-2 text-xs text-center">
              <div className="bg-slate-700/30 rounded p-1.5"><div className="font-semibold text-slate-200">{r.total_kits}</div><div className="text-[9px] text-slate-500">Total Kits</div></div>
              <div className="bg-slate-700/30 rounded p-1.5"><div className="font-semibold text-slate-200">{r.total_components}</div><div className="text-[9px] text-slate-500">Components</div></div>
              <div className="bg-slate-700/30 rounded p-1.5"><div className="font-semibold text-slate-200">{r.est_production_hours}h</div><div className="text-[9px] text-slate-500">Est Time</div></div>
              <div className="bg-slate-700/30 rounded p-1.5"><div className="font-semibold text-slate-200">{r.est_labor_hours}h</div><div className="text-[9px] text-slate-500">Labor Hrs</div></div>
            </div>
            {r.lane_warnings?.length > 0 && r.lane_warnings.map((w: string, i: number) => (
              <div key={i} className="mt-1 text-[10px] text-amber-300 flex items-center gap-1"><AlertTriangle className="w-3 h-3" />{w}</div>
            ))}
          </div>
        ))}
        {runs.length === 0 && <div className="text-xs text-slate-500 text-center py-8">No production runs yet</div>}
      </div>
    </div>
  );
}

// ─── Assembly Lines Tab ────────────────────────────────────────────
function AssemblyTab() {
  const [lanes, setLanes] = useState<any[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: "", lane_type: "linear", max_throughput_per_hour: 180 });
  const [throughput, setThroughput] = useState<any>(null);
  const [selectedLane, setSelectedLane] = useState("");

  const load = useCallback(async () => { const d = await api("/assembly-lanes"); setLanes(d.lanes || []); }, []);
  useEffect(() => { load(); }, [load]);

  const create = async () => {
    await api("/assembly-lanes", { method: "POST", body: JSON.stringify(form) }); setShowForm(false); load();
  };

  const analyzeThroughput = async (laneId: string) => {
    setSelectedLane(laneId);
    const d = await api(`/assembly-lanes/${laneId}/throughput?kits_needed=500`);
    setThroughput(d);
  };

  return (
    <div className="space-y-4" data-testid="assembly-tab">
      <div className="flex justify-between items-center">
        <h3 className="text-sm font-semibold text-slate-200">Assembly Lines</h3>
        <button onClick={() => setShowForm(!showForm)} className="flex items-center gap-1 px-3 py-1.5 bg-cyan-600/20 text-cyan-300 rounded-lg text-xs border border-cyan-500/30"><Plus className="w-3 h-3" /> New Lane</button>
      </div>
      {showForm && (
        <div className="bg-slate-800/50 border border-slate-700/40 rounded-lg p-4 space-y-3">
          <input placeholder="Lane name" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className="w-full bg-slate-700/60 text-slate-200 rounded px-3 py-1.5 text-sm border border-slate-600/50" />
          <div className="grid grid-cols-2 gap-2">
            <select value={form.lane_type} onChange={e => setForm(f => ({ ...f, lane_type: e.target.value }))} className="bg-slate-700/60 text-slate-200 rounded px-2 py-1.5 text-sm border border-slate-600/50">
              <option value="linear">Linear</option><option value="u_shape">U-Shape</option><option value="carousel">Carousel</option><option value="pod_cell">Pod Cell</option>
            </select>
            <input type="number" placeholder="Kits/hr" value={form.max_throughput_per_hour} onChange={e => setForm(f => ({ ...f, max_throughput_per_hour: +e.target.value }))} className="bg-slate-700/60 text-slate-200 rounded px-2 py-1.5 text-sm border border-slate-600/50" />
          </div>
          <button onClick={create} disabled={!form.name} className="px-4 py-1.5 bg-cyan-600 text-white rounded text-xs disabled:opacity-50">Create Lane</button>
        </div>
      )}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {lanes.map(l => (
          <div key={l.lane_id} data-testid={`lane-${l.lane_id}`} className="bg-slate-800/40 border border-slate-700/30 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-semibold text-slate-100">{l.name}</span>
              <span className="text-[10px] bg-violet-500/15 text-violet-300 rounded-full px-2 py-0.5">{l.lane_type}</span>
            </div>
            <div className="grid grid-cols-3 gap-2 text-xs text-center mb-3">
              <div className="bg-slate-700/30 rounded p-1.5"><div className="font-semibold text-slate-200">{l.station_count}</div><div className="text-[9px] text-slate-500">Stations</div></div>
              <div className="bg-slate-700/30 rounded p-1.5"><div className="font-semibold text-emerald-300">{l.effective_throughput_per_hour}/hr</div><div className="text-[9px] text-slate-500">Effective</div></div>
              <div className="bg-slate-700/30 rounded p-1.5"><div className="font-semibold text-amber-300">{l.bottleneck_station || "None"}</div><div className="text-[9px] text-slate-500">Bottleneck</div></div>
            </div>
            <div className="flex flex-wrap gap-1 mb-2">
              {(l.stations || []).map((s: any) => <span key={s.station_id} className="text-[9px] bg-slate-700/50 text-slate-300 rounded px-1.5 py-0.5">{s.name}</span>)}
            </div>
            <button onClick={() => analyzeThroughput(l.lane_id)} className="text-xs text-cyan-400 hover:text-cyan-300">Analyze throughput for 500 kits</button>
            {throughput && selectedLane === l.lane_id && (
              <div className="mt-2 bg-slate-700/30 rounded p-3 text-xs space-y-1">
                <div className="flex justify-between"><span className="text-slate-400">Hours needed:</span><span className="text-slate-200">{throughput.hours_needed}</span></div>
                <div className="flex justify-between"><span className="text-slate-400">Shifts needed:</span><span className="text-slate-200">{throughput.shifts_needed}</span></div>
                <div className="flex justify-between"><span className="text-slate-400">Staff/shift:</span><span className="text-slate-200">{throughput.staff_per_shift}</span></div>
                <div className="flex justify-between"><span className="text-slate-400">Total labor hrs:</span><span className="text-slate-200">{throughput.total_labor_hours}</span></div>
                <div className={cn("flex justify-between font-semibold", throughput.can_complete_in_single_shift ? "text-emerald-300" : "text-amber-300")}>
                  <span>Single shift?</span><span>{throughput.can_complete_in_single_shift ? "Yes" : "No"}</span>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
      {lanes.length === 0 && <div className="text-xs text-slate-500 text-center py-8">No assembly lanes configured</div>}
    </div>
  );
}

// ─── Packaging Tab ─────────────────────────────────────────────────
function PackagingTab() {
  const [options, setOptions] = useState<any>(null);
  const [validation, setValidation] = useState<any>(null);
  const [selPkg, setSelPkg] = useState("insulated_box");
  const [selZone, setSelZone] = useState("chilled");

  useEffect(() => { api("/packaging-options").then(setOptions); }, []);

  const validate = async () => {
    const d = await api("/packaging/validate", { method: "POST", body: JSON.stringify({ packaging_type: selPkg, cold_chain_zone: selZone }) });
    setValidation(d);
  };

  if (!options) return <Loading />;
  return (
    <div className="space-y-4" data-testid="packaging-tab">
      <h3 className="text-sm font-semibold text-slate-200">Packaging Options & Cold Chain Logic</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {(options.packaging_types || []).map((p: any) => (
          <div key={p.type} className={cn("bg-slate-800/40 border rounded-lg p-3 cursor-pointer transition-colors", selPkg === p.type ? "border-cyan-500/40" : "border-slate-700/30 hover:border-slate-600")} onClick={() => setSelPkg(p.type)}>
            <div className="flex items-center justify-between"><span className="text-sm font-semibold text-slate-200">{p.type.replace(/_/g, " ")}</span><span className="text-xs text-emerald-400">{fmtUsd(p.cost)}</span></div>
            <div className="text-[10px] text-slate-400 mt-1">{p.description}</div>
            <div className="flex gap-1 mt-2">{p.zones.map((z: string) => <span key={z} className="text-[9px] bg-slate-700/50 text-slate-300 rounded px-1.5 py-0.5">{z}</span>)}</div>
          </div>
        ))}
      </div>
      <div className="bg-slate-800/40 border border-slate-700/30 rounded-lg p-4">
        <h4 className="text-xs text-slate-400 mb-3">Cold Chain Additives</h4>
        <div className="grid grid-cols-3 gap-3">
          {Object.entries(options.cold_chain_additives || {}).map(([zone, info]: [string, any]) => (
            <div key={zone} className={cn("rounded-lg p-3 border cursor-pointer text-center transition-colors", selZone === zone ? "border-cyan-500/40 bg-cyan-500/10" : "border-slate-700/30 bg-slate-800/30")} onClick={() => setSelZone(zone)}>
              <Thermometer className="w-4 h-4 mx-auto text-cyan-400 mb-1" />
              <div className="text-sm font-semibold text-slate-200 capitalize">{zone}</div>
              <div className="text-xs text-slate-400">{info.additive.replace(/_/g, " ")}</div>
              <div className="text-xs text-emerald-400">{fmtUsd(info.cost_per_kit)}/kit</div>
            </div>
          ))}
        </div>
      </div>
      <div className="flex items-center gap-3">
        <button onClick={validate} className="px-4 py-1.5 bg-cyan-600/20 text-cyan-300 rounded text-xs border border-cyan-500/30 hover:bg-cyan-600/30">Validate Selection</button>
        <span className="text-xs text-slate-500">Selected: {selPkg} + {selZone}</span>
      </div>
      {validation && (
        <div className={cn("rounded-lg p-4 border", validation.valid ? "bg-emerald-500/10 border-emerald-500/20" : "bg-rose-500/10 border-rose-500/20")}>
          <div className="flex items-center gap-2 mb-2">{validation.valid ? <Check className="w-4 h-4 text-emerald-400" /> : <AlertTriangle className="w-4 h-4 text-rose-400" />}<span className="text-sm font-semibold text-slate-200">{validation.valid ? "Valid Configuration" : "Issues Found"}</span><span className="ml-auto text-xs text-emerald-400">{fmtUsd(validation.packaging_cost)}/unit</span></div>
          {validation.issues?.map((i: any, idx: number) => <div key={idx} className={cn("text-xs rounded px-2 py-1 mt-1", i.severity === "critical" ? "bg-rose-500/15 text-rose-300" : "bg-amber-500/15 text-amber-300")}>{i.message}</div>)}
          {validation.recommendations?.map((r: string, idx: number) => <div key={idx} className="text-xs text-cyan-300 mt-1">Recommendation: {r}</div>)}
        </div>
      )}
    </div>
  );
}

// ─── Subscriptions Tab ─────────────────────────────────────────────
function SubscriptionsTab() {
  const [subs, setSubs] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ customer_name: "", customer_email: "", plan_type: "weekly", meals_per_delivery: 4, dietary_preferences: [] as string[], delivery_day: "monday" });

  const load = useCallback(async () => {
    const [s, st] = await Promise.all([api("/subscriptions"), api("/subscriptions/stats")]);
    setSubs(s.subscriptions || []); setStats(st);
  }, []);
  useEffect(() => { load(); }, [load]);

  const create = async () => { await api("/subscriptions", { method: "POST", body: JSON.stringify(form) }); setShowForm(false); load(); };
  const skip = async (id: string) => { await api(`/subscriptions/${id}/skip`, { method: "PUT" }); load(); };
  const cancel = async (id: string) => { await api(`/subscriptions/${id}/cancel`, { method: "PUT" }); load(); };

  return (
    <div className="space-y-4" data-testid="subscriptions-tab">
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <KpiCard label="Active" value={stats.active} icon={Users} color="text-emerald-400" />
          <KpiCard label="Cancelled" value={stats.cancelled} icon={X} color="text-rose-400" />
          <KpiCard label="Churn Rate" value={fmtPct(stats.churn_rate)} icon={TrendingUp} color="text-amber-400" />
          <KpiCard label="Meals/Cycle" value={stats.total_meals_per_cycle} icon={Package} color="text-cyan-400" />
        </div>
      )}
      <div className="flex justify-between items-center">
        <h3 className="text-sm font-semibold text-slate-200">Subscriptions</h3>
        <button onClick={() => setShowForm(!showForm)} className="flex items-center gap-1 px-3 py-1.5 bg-cyan-600/20 text-cyan-300 rounded-lg text-xs border border-cyan-500/30"><Plus className="w-3 h-3" /> New Subscription</button>
      </div>
      {showForm && (
        <div className="bg-slate-800/50 border border-slate-700/40 rounded-lg p-4 space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <input placeholder="Customer name" value={form.customer_name} onChange={e => setForm(f => ({ ...f, customer_name: e.target.value }))} className="bg-slate-700/60 text-slate-200 rounded px-2 py-1.5 text-sm border border-slate-600/50" />
            <input placeholder="Email" value={form.customer_email} onChange={e => setForm(f => ({ ...f, customer_email: e.target.value }))} className="bg-slate-700/60 text-slate-200 rounded px-2 py-1.5 text-sm border border-slate-600/50" />
            <select value={form.plan_type} onChange={e => setForm(f => ({ ...f, plan_type: e.target.value }))} className="bg-slate-700/60 text-slate-200 rounded px-2 py-1.5 text-sm border border-slate-600/50">
              <option value="weekly">Weekly</option><option value="biweekly">Biweekly</option><option value="monthly">Monthly</option>
            </select>
            <input type="number" placeholder="Meals per delivery" value={form.meals_per_delivery} onChange={e => setForm(f => ({ ...f, meals_per_delivery: +e.target.value }))} className="bg-slate-700/60 text-slate-200 rounded px-2 py-1.5 text-sm border border-slate-600/50" />
          </div>
          <button onClick={create} disabled={!form.customer_name || !form.customer_email} className="px-4 py-1.5 bg-cyan-600 text-white rounded text-xs disabled:opacity-50">Create</button>
        </div>
      )}
      <div className="space-y-2">
        {subs.map(s => (
          <div key={s.subscription_id} data-testid={`sub-${s.subscription_id}`} className="bg-slate-800/40 border border-slate-700/30 rounded-lg p-3 flex items-center justify-between">
            <div>
              <div className="text-sm font-semibold text-slate-100">{s.customer_name}<span className={cn("ml-2 text-[10px] px-2 py-0.5 rounded-full", s.active ? "bg-emerald-500/15 text-emerald-300" : "bg-rose-500/15 text-rose-300")}>{s.status}</span></div>
              <div className="text-xs text-slate-400">{s.plan_type} | {s.meals_per_delivery} meals | {s.delivery_day} | Next: {s.next_delivery_date}</div>
            </div>
            {s.active && (
              <div className="flex gap-1">
                <button onClick={() => skip(s.subscription_id)} className="px-2 py-1 bg-amber-600/20 text-amber-300 rounded text-[10px]">Skip</button>
                <button onClick={() => cancel(s.subscription_id)} className="px-2 py-1 bg-rose-600/20 text-rose-300 rounded text-[10px]">Cancel</button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Distribution Tab ──────────────────────────────────────────────
function DistributionTab() {
  const [channels, setChannels] = useState<any[]>([]);
  useEffect(() => { api("/distribution/channels").then(d => setChannels(d.channels || [])); }, []);
  return (
    <div className="space-y-4" data-testid="distribution-tab">
      <h3 className="text-sm font-semibold text-slate-200">Multi-Channel Distribution</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {channels.map(c => (
          <div key={c.channel_id} className="bg-slate-800/40 border border-slate-700/30 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2"><Truck className="w-4 h-4 text-cyan-400" /><span className="text-sm font-semibold text-slate-200">{c.label}</span></div>
            <div className="grid grid-cols-2 gap-2 text-xs text-center">
              <div className="bg-slate-700/30 rounded p-1.5"><div className="font-semibold text-slate-200">{c.product_count}</div><div className="text-[9px] text-slate-500">Products</div></div>
              <div className="bg-slate-700/30 rounded p-1.5"><div className="font-semibold text-slate-200">{c.active_runs}</div><div className="text-[9px] text-slate-500">Active Runs</div></div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Forecasting Tab ───────────────────────────────────────────────
function ForecastingTab() {
  const [forecast, setForecast] = useState<any>(null);
  const [weeks, setWeeks] = useState(4);
  const [loading, setLoading] = useState(false);

  const generate = async () => {
    setLoading(true);
    const d = await api("/forecast", { method: "POST", body: JSON.stringify({ horizon_weeks: weeks }) });
    setForecast(d); setLoading(false);
  };

  return (
    <div className="space-y-4" data-testid="forecasting-tab">
      <div className="flex items-center gap-3">
        <h3 className="text-sm font-semibold text-slate-200">Demand Forecast</h3>
        <input type="number" value={weeks} onChange={e => setWeeks(+e.target.value)} min={1} max={12} className="w-16 bg-slate-700/60 text-slate-200 rounded px-2 py-1 text-xs border border-slate-600/50" />
        <span className="text-xs text-slate-400">weeks</span>
        <button onClick={generate} disabled={loading} className="flex items-center gap-1 px-3 py-1.5 bg-cyan-600/20 text-cyan-300 rounded text-xs border border-cyan-500/30">
          {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : <TrendingUp className="w-3 h-3" />} Generate
        </button>
      </div>
      {forecast && (
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-3">
            <KpiCard label="Total Meals" value={forecast.total_forecast_meals} icon={Package} color="text-cyan-400" />
            <KpiCard label="Ingredient Orders" value={forecast.est_ingredient_orders} icon={Box} color="text-amber-400" />
            <KpiCard label="Waste Risk" value={forecast.waste_risk_level} icon={AlertTriangle} color={forecast.waste_risk_level === "low" ? "text-emerald-400" : "text-amber-400"} />
          </div>
          <div className="bg-slate-800/40 border border-slate-700/30 rounded-lg p-4">
            <h4 className="text-xs text-slate-400 mb-3">Weekly Breakdown</h4>
            <div className="space-y-2">
              {(forecast.weekly_breakdown || []).map((w: any) => {
                const max = Math.max(...(forecast.weekly_breakdown || []).map((x: any) => x.forecast_meals), 1);
                const pct = (w.forecast_meals / max) * 100;
                return (
                  <div key={w.week} className="flex items-center gap-3">
                    <span className="text-xs text-slate-400 w-14">Week {w.week}</span>
                    <div className="flex-1 h-3 bg-slate-700/30 rounded-full overflow-hidden"><div className="h-full bg-cyan-500/60 rounded-full" style={{ width: `${pct}%` }} /></div>
                    <span className="text-xs text-slate-200 w-12 text-right">{w.forecast_meals}</span>
                  </div>
                );
              })}
            </div>
          </div>
          <div className="text-[10px] text-slate-500">Growth factor: {forecast.growth_factor}x/week | Skip probability: {fmtPct(forecast.skip_probability)}</div>
        </div>
      )}
    </div>
  );
}

// ─── Margin Optimizer Tab ──────────────────────────────────────────
function MarginTab() {
  const [products, setProducts] = useState<any[]>([]);
  const [analysis, setAnalysis] = useState<any>(null);
  const [form, setForm] = useState({ product_id: "", quantity: 100, channel: "direct_to_consumer", shipping_zone: 1 });

  useEffect(() => { api("/products").then(d => setProducts(d.products || [])); }, []);

  const analyze = async () => {
    const d = await api("/margin-analysis", { method: "POST", body: JSON.stringify(form) });
    setAnalysis(d);
  };

  return (
    <div className="space-y-4" data-testid="margin-tab">
      <h3 className="text-sm font-semibold text-slate-200">Margin Optimizer (EchoAurum)</h3>
      <div className="bg-slate-800/50 border border-slate-700/40 rounded-lg p-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          <select value={form.product_id} onChange={e => setForm(f => ({ ...f, product_id: e.target.value }))} className="bg-slate-700/60 text-slate-200 rounded px-2 py-1.5 text-sm border border-slate-600/50">
            <option value="">Generic Kit</option>
            {products.map(p => <option key={p.product_id} value={p.product_id}>{p.name}</option>)}
          </select>
          <input type="number" value={form.quantity} onChange={e => setForm(f => ({ ...f, quantity: +e.target.value }))} className="bg-slate-700/60 text-slate-200 rounded px-2 py-1.5 text-sm border border-slate-600/50" placeholder="Quantity" />
          <select value={form.channel} onChange={e => setForm(f => ({ ...f, channel: e.target.value }))} className="bg-slate-700/60 text-slate-200 rounded px-2 py-1.5 text-sm border border-slate-600/50">
            <option value="direct_to_consumer">DTC</option><option value="retail_distribution">Retail</option><option value="corporate_delivery">Corporate</option><option value="hospital_discharge_meals">Hospital</option><option value="fitness_subscription_meals">Fitness</option>
          </select>
          <select value={form.shipping_zone} onChange={e => setForm(f => ({ ...f, shipping_zone: +e.target.value }))} className="bg-slate-700/60 text-slate-200 rounded px-2 py-1.5 text-sm border border-slate-600/50">
            {[1,2,3,4,5].map(z => <option key={z} value={z}>Zone {z}</option>)}
          </select>
        </div>
        <button onClick={analyze} className="mt-3 px-4 py-1.5 bg-cyan-600/20 text-cyan-300 rounded text-xs border border-cyan-500/30 hover:bg-cyan-600/30">Analyze Margin</button>
      </div>
      {analysis && (
        <div className="space-y-3">
          <div className={cn("bg-slate-800/40 border rounded-lg p-4", analysis.healthy ? "border-emerald-500/20" : "border-rose-500/20")}>
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-semibold text-slate-200">{analysis.product_name}</span>
              <span className={cn("text-lg font-bold", analysis.healthy ? "text-emerald-400" : "text-rose-400")}>{fmtPct(analysis.unit_economics.margin_pct)}</span>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
              {[
                { label: "Ingredients", value: analysis.unit_economics.ingredient_cost, color: "text-orange-300" },
                { label: "Packaging", value: analysis.unit_economics.packaging_cost, color: "text-violet-300" },
                { label: "Shipping", value: analysis.unit_economics.shipping_cost, color: "text-blue-300" },
                { label: "Labor", value: analysis.unit_economics.labor_cost, color: "text-cyan-300" },
              ].map(i => (
                <div key={i.label} className="bg-slate-700/30 rounded p-2 text-center"><div className={cn("font-semibold", i.color)}>{fmtUsd(i.value)}</div><div className="text-[9px] text-slate-500">{i.label}</div></div>
              ))}
            </div>
            <div className="flex justify-between mt-3 text-xs">
              <span className="text-slate-400">Total cost: <span className="text-slate-200">{fmtUsd(analysis.unit_economics.total_cost)}</span></span>
              <span className="text-slate-400">Price: <span className="text-slate-200">{fmtUsd(analysis.unit_economics.effective_price)}</span></span>
              <span className="text-slate-400">Margin: <span className={cn("font-semibold", analysis.healthy ? "text-emerald-300" : "text-rose-300")}>{fmtUsd(analysis.unit_economics.gross_margin)}</span></span>
            </div>
          </div>
          {analysis.volume_economics && (
            <div className="bg-slate-800/40 border border-slate-700/30 rounded-lg p-4">
              <h4 className="text-xs text-slate-400 mb-2">Volume Economics ({analysis.volume_economics.quantity} units)</h4>
              <div className="grid grid-cols-3 gap-3 text-xs text-center">
                <div className="bg-slate-700/30 rounded p-2"><div className="text-slate-200 font-semibold">{fmtUsd(analysis.volume_economics.total_revenue)}</div><div className="text-[9px] text-slate-500">Revenue</div></div>
                <div className="bg-slate-700/30 rounded p-2"><div className="text-slate-200 font-semibold">{fmtUsd(analysis.volume_economics.total_cost)}</div><div className="text-[9px] text-slate-500">Cost</div></div>
                <div className="bg-slate-700/30 rounded p-2"><div className="text-emerald-300 font-semibold">{fmtUsd(analysis.volume_economics.total_profit)}</div><div className="text-[9px] text-slate-500">Profit</div></div>
              </div>
            </div>
          )}
          {analysis.warning && <div className="text-xs text-rose-300 flex items-center gap-1"><AlertTriangle className="w-3 h-3" />{analysis.warning}</div>}
        </div>
      )}
    </div>
  );
}

// ─── Safety Tab ────────────────────────────────────────────────────
function SafetyTab() {
  const [records, setRecords] = useState<any[]>([]);
  const [checkType, setCheckType] = useState("pre_production");
  const [lastResult, setLastResult] = useState<any>(null);

  useEffect(() => { api("/safety/records").then(d => setRecords(d.records || [])); }, []);

  const runCheck = async () => {
    const d = await api("/safety/check", { method: "POST", body: JSON.stringify({ check_type: checkType }) });
    setLastResult(d);
    api("/safety/records").then(d2 => setRecords(d2.records || []));
  };

  return (
    <div className="space-y-4" data-testid="safety-tab">
      <div className="flex items-center gap-3">
        <h3 className="text-sm font-semibold text-slate-200">Safety Validation (TraceLedger)</h3>
        <select value={checkType} onChange={e => setCheckType(e.target.value)} className="bg-slate-700/60 text-slate-200 rounded px-2 py-1.5 text-xs border border-slate-600/50">
          <option value="pre_production">Pre-Production</option><option value="in_process">In-Process</option><option value="final">Final QA</option><option value="cold_chain">Cold Chain</option>
        </select>
        <button onClick={runCheck} className="flex items-center gap-1 px-3 py-1.5 bg-emerald-600/20 text-emerald-300 rounded text-xs border border-emerald-500/30"><ShieldCheck className="w-3 h-3" /> Run Check</button>
      </div>
      {lastResult && (
        <div className={cn("rounded-lg p-4 border", lastResult.overall_pass ? "bg-emerald-500/10 border-emerald-500/20" : "bg-rose-500/10 border-rose-500/20")}>
          <div className="flex items-center gap-2 mb-3"><ShieldCheck className="w-4 h-4" /><span className="text-sm font-semibold text-slate-200">{lastResult.check_type.replace(/_/g, " ")} — {lastResult.overall_pass ? "ALL PASS" : "ISSUES"}</span></div>
          <div className="space-y-1">
            {lastResult.checks?.map((c: any, i: number) => (
              <div key={i} className="flex items-center gap-2 text-xs"><Check className={cn("w-3 h-3", c.status === "pass" ? "text-emerald-400" : "text-rose-400")} /><span className="text-slate-300">{c.check}</span><span className="text-slate-500 ml-auto">{c.target}</span></div>
            ))}
          </div>
        </div>
      )}
      <div className="space-y-2">
        <h4 className="text-xs text-slate-400">Recent Records</h4>
        {records.map(r => (
          <div key={r.record_id} className="bg-slate-800/40 border border-slate-700/30 rounded-lg p-3 flex items-center justify-between">
            <div><span className="text-xs font-semibold text-slate-200">{r.check_type.replace(/_/g, " ")}</span><span className={cn("ml-2 text-[10px]", r.overall_pass ? "text-emerald-300" : "text-rose-300")}>{r.overall_pass ? "PASS" : "FAIL"}</span></div>
            <span className="text-[10px] text-slate-500">{r.created_at?.split("T")[0]}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Routing Tab ───────────────────────────────────────────────────
function RoutingTab() {
  const [routes, setRoutes] = useState<any[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: "", channel: "direct_to_consumer", vehicle_type: "refrigerated_van", cold_chain_required: true, stops: [{ address: "123 Main St", distance_miles: 15, delivery_window: "9am-12pm" }] });

  const load = useCallback(async () => { const d = await api("/routes"); setRoutes(d.routes || []); }, []);
  useEffect(() => { load(); }, [load]);

  const create = async () => { await api("/routes", { method: "POST", body: JSON.stringify(form) }); setShowForm(false); load(); };
  const addStop = () => setForm(f => ({ ...f, stops: [...f.stops, { address: "", distance_miles: 10, delivery_window: "" }] }));

  return (
    <div className="space-y-4" data-testid="routing-tab">
      <div className="flex justify-between items-center">
        <h3 className="text-sm font-semibold text-slate-200">Delivery Routing Planner</h3>
        <button onClick={() => setShowForm(!showForm)} className="flex items-center gap-1 px-3 py-1.5 bg-cyan-600/20 text-cyan-300 rounded-lg text-xs border border-cyan-500/30"><Plus className="w-3 h-3" /> New Route</button>
      </div>
      {showForm && (
        <div className="bg-slate-800/50 border border-slate-700/40 rounded-lg p-4 space-y-3">
          <div className="grid grid-cols-3 gap-2">
            <input placeholder="Route name" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className="bg-slate-700/60 text-slate-200 rounded px-2 py-1.5 text-sm border border-slate-600/50" />
            <select value={form.channel} onChange={e => setForm(f => ({ ...f, channel: e.target.value }))} className="bg-slate-700/60 text-slate-200 rounded px-2 py-1.5 text-sm border border-slate-600/50">
              <option value="direct_to_consumer">DTC</option><option value="retail_distribution">Retail</option><option value="corporate_delivery">Corporate</option><option value="hospital_discharge_meals">Hospital</option>
            </select>
            <select value={form.vehicle_type} onChange={e => setForm(f => ({ ...f, vehicle_type: e.target.value }))} className="bg-slate-700/60 text-slate-200 rounded px-2 py-1.5 text-sm border border-slate-600/50">
              <option value="refrigerated_van">Refrigerated Van</option><option value="insulated_truck">Insulated Truck</option><option value="bike_courier">Bike Courier</option>
            </select>
          </div>
          <div className="text-xs text-slate-400">Stops:</div>
          {form.stops.map((s, i) => (
            <div key={i} className="grid grid-cols-3 gap-2">
              <input placeholder="Address" value={s.address} onChange={e => { const stops = [...form.stops]; stops[i] = { ...stops[i], address: e.target.value }; setForm(f => ({ ...f, stops })); }} className="bg-slate-700/60 text-slate-200 rounded px-2 py-1 text-xs border border-slate-600/50" />
              <input type="number" placeholder="Miles" value={s.distance_miles} onChange={e => { const stops = [...form.stops]; stops[i] = { ...stops[i], distance_miles: +e.target.value }; setForm(f => ({ ...f, stops })); }} className="bg-slate-700/60 text-slate-200 rounded px-2 py-1 text-xs border border-slate-600/50" />
              <input placeholder="Window" value={s.delivery_window} onChange={e => { const stops = [...form.stops]; stops[i] = { ...stops[i], delivery_window: e.target.value }; setForm(f => ({ ...f, stops })); }} className="bg-slate-700/60 text-slate-200 rounded px-2 py-1 text-xs border border-slate-600/50" />
            </div>
          ))}
          <button onClick={addStop} className="text-xs text-cyan-400 hover:text-cyan-300">+ Add stop</button>
          <button onClick={create} disabled={!form.name} className="px-4 py-1.5 bg-cyan-600 text-white rounded text-xs disabled:opacity-50">Create Route</button>
        </div>
      )}
      <div className="space-y-2">
        {routes.map(r => (
          <div key={r.route_id} data-testid={`route-${r.route_id}`} className="bg-slate-800/40 border border-slate-700/30 rounded-lg p-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-semibold text-slate-100">{r.name}</span>
              <span className="text-[10px] bg-cyan-500/15 text-cyan-300 rounded-full px-2 py-0.5">{r.channel?.replace(/_/g, " ")}</span>
            </div>
            <div className="grid grid-cols-4 gap-2 text-xs text-center">
              <div className="bg-slate-700/30 rounded p-1.5"><div className="font-semibold text-slate-200">{r.stop_count}</div><div className="text-[9px] text-slate-500">Stops</div></div>
              <div className="bg-slate-700/30 rounded p-1.5"><div className="font-semibold text-slate-200">{r.total_distance_miles}mi</div><div className="text-[9px] text-slate-500">Distance</div></div>
              <div className="bg-slate-700/30 rounded p-1.5"><div className="font-semibold text-slate-200">{r.est_time_hours}h</div><div className="text-[9px] text-slate-500">Est Time</div></div>
              <div className="bg-slate-700/30 rounded p-1.5"><div className="font-semibold text-emerald-300">{fmtUsd(r.total_route_cost)}</div><div className="text-[9px] text-slate-500">Cost</div></div>
            </div>
          </div>
        ))}
        {routes.length === 0 && <div className="text-xs text-slate-500 text-center py-8">No routes configured</div>}
      </div>
    </div>
  );
}

// ─── Shared Components ─────────────────────────────────────────────
function KpiCard({ label, value, icon: Icon, color }: { label: string; value: any; icon: React.ElementType; color: string }) {
  return (
    <div className="bg-slate-800/40 border border-slate-700/30 rounded-lg p-3">
      <div className="flex items-center gap-2 mb-1"><Icon className={cn("w-4 h-4", color)} /><span className="text-[10px] text-slate-500 uppercase tracking-wider">{label}</span></div>
      <div className="text-xl font-bold text-slate-100">{value}</div>
    </div>
  );
}

function Loading() {
  return <div className="flex items-center justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-cyan-400" /></div>;
}

// ─── Main Component ────────────────────────────────────────────────
export default function FreshMealSystems() {
  const [tab, setTab] = useState<TabId>("ops-center");

  const renderTab = () => {
    switch (tab) {
      case "ops-center": return <OpsCenterTab />;
      case "overview": return <OverviewTab />;
      case "production": return <ProductionTab />;
      case "assembly": return <AssemblyTab />;
      case "packaging": return <PackagingTab />;
      case "subscriptions": return <SubscriptionsTab />;
      case "distribution": return <DistributionTab />;
      case "forecasting": return <ForecastingTab />;
      case "margin": return <MarginTab />;
      case "safety": return <SafetyTab />;
      case "routing": return <RoutingTab />;
    }
  };

  return (
    <div data-testid="fresh-meal-systems-panel" className="h-full flex flex-col bg-slate-900 text-slate-100">
      <div className="flex-shrink-0 border-b border-slate-700/60 px-6 py-4">
        <h1 className="text-xl font-bold tracking-tight flex items-center gap-2"><Factory className="w-5 h-5 text-cyan-400" /> Fresh Meal Systems</h1>
        <p className="text-sm text-slate-400 mt-0.5">Manufacturing-grade orchestration for meal kits, subscriptions, grab-and-go, and multi-channel fulfillment</p>
      </div>
      <div className="flex-shrink-0 border-b border-slate-700/40 px-4 flex gap-0.5 overflow-x-auto">
        {TABS.map(t => (
          <button key={t.id} data-testid={`fms-tab-${t.id}`} onClick={() => setTab(t.id)}
            className={cn("flex items-center gap-1.5 px-3 py-2.5 text-xs whitespace-nowrap border-b-2 transition-colors",
              tab === t.id ? "border-cyan-400 text-cyan-300" : "border-transparent text-slate-400 hover:text-slate-200")}>
            <t.icon className="w-3.5 h-3.5" />{t.label}
          </button>
        ))}
      </div>
      <div className="flex-1 overflow-y-auto p-6">{renderTab()}</div>
    </div>
  );
}
