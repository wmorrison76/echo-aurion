/**
 * Banquet Intelligence - Knowledge Engine Dashboard
 * Interactive operational intelligence panel for cross-module banquet planning.
 * Connects to /api/knowledge-engine/* endpoints.
 */
import React, { useState, useCallback, useEffect } from "react";
import {
  Brain,
  Users,
  LayoutGrid,
  ShieldAlert,
  ShoppingCart,
  DollarSign,
  ChevronRight,
  Loader2,
  AlertTriangle,
  CheckCircle,
  Info,
  BookOpen,
  Utensils,
  Clock,
  Layers,
  Package,
  TrendingUp,
  FileText,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/glass";

const API = "";

type TabId = "overview" | "staffing" | "layout" | "risk" | "purchasing" | "pricing" | "lifecycle" | "culinary";

interface DomainSummary { domain_id: string; filename: string; schema_version: string; updated_at: string }

// Fetch helper
async function api<T = any>(path: string, opts?: RequestInit): Promise<T> {
  const r = await fetch(`${API}/api/knowledge-engine${path}`, {
    headers: { "Content-Type": "application/json" },
    ...opts,
  });
  if (!r.ok) throw new Error(`${r.status} ${r.statusText}`);
  return r.json();
}

// ─── Sub-components ────────────────────────────────────────────────

function KpiCard({ label, value, sub, icon: Icon, color = "text-emerald-400" }: { label: string; value: string | number; sub?: string; icon: any; color?: string }) {
  return (
    <div data-testid={`kpi-${label.toLowerCase().replace(/\s+/g, "-")}`} className="bg-slate-800/60 border border-slate-700/50 rounded-lg p-4 flex items-start gap-3">
      <div className={cn("p-2 rounded-lg bg-slate-700/50", color)}><Icon className="w-4 h-4" /></div>
      <div>
        <div className="text-xs text-slate-400 uppercase tracking-wider">{label}</div>
        <div className="text-xl font-semibold text-slate-100 mt-0.5">{value}</div>
        {sub && <div className="text-xs text-slate-500 mt-0.5">{sub}</div>}
      </div>
    </div>
  );
}

function SeverityBadge({ level }: { level: string }) {
  const map: Record<string, string> = {
    critical: "bg-red-500/20 text-red-400 border-red-500/30",
    high: "bg-orange-500/20 text-orange-400 border-orange-500/30",
    medium: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
    low: "bg-green-500/20 text-green-400 border-green-500/30",
  };
  return <span className={cn("text-xs px-2 py-0.5 rounded-full border", map[level] || map.low)}>{level}</span>;
}

// ─── Overview Tab ──────────────────────────────────────────────────

function OverviewTab() {
  const [domains, setDomains] = useState<DomainSummary[]>([]);
  const [ontology, setOntology] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([api("/domains"), api("/ontology")])
      .then(([d, o]) => { setDomains(d.domains); setOntology(o); })
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="flex items-center justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-slate-400" /></div>;

  return (
    <div data-testid="overview-tab" className="space-y-6">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <KpiCard label="Domains" value={domains.length} sub="Knowledge layers" icon={Layers} color="text-cyan-400" />
        <KpiCard label="Modules" value={ontology ? Object.keys(ontology.module_map).length : 0} sub="Connected" icon={Brain} color="text-violet-400" />
        <KpiCard label="Shared Keys" value={ontology?.shared_primary_keys?.length || 0} sub="Cross-module" icon={Package} color="text-amber-400" />
        <KpiCard label="Graph Edges" value={ontology?.event_graph_edges?.length || 0} sub="Relationships" icon={TrendingUp} color="text-emerald-400" />
      </div>

      <div>
        <h3 className="text-sm font-medium text-slate-300 mb-3">Knowledge Domains</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {domains.map((d) => (
            <div key={d.domain_id} className="bg-slate-800/40 border border-slate-700/40 rounded-lg p-3 flex items-center gap-3">
              <BookOpen className="w-4 h-4 text-slate-500 shrink-0" />
              <div className="min-w-0">
                <div className="text-sm font-medium text-slate-200 truncate">{d.domain_id.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase())}</div>
                <div className="text-xs text-slate-500 truncate">{d.filename}</div>
              </div>
              <span className="ml-auto text-xs text-slate-600">v{d.schema_version}</span>
            </div>
          ))}
        </div>
      </div>

      {ontology && (
        <div>
          <h3 className="text-sm font-medium text-slate-300 mb-3">Module Coverage Map</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {Object.entries(ontology.module_map).map(([mod, caps]: any) => (
              <div key={mod} className="bg-slate-800/40 border border-slate-700/40 rounded-lg p-3">
                <div className="text-sm font-semibold text-cyan-400">{mod}</div>
                <div className="flex flex-wrap gap-1 mt-1.5">
                  {caps.map((c: string) => (
                    <span key={c} className="text-[10px] bg-slate-700/60 text-slate-400 px-1.5 py-0.5 rounded">{c}</span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Staffing Calculator Tab ───────────────────────────────────────

function StaffingTab() {
  const [form, setForm] = useState({ guest_count: 150, service_style: "standard_buffet", event_type: "corporate", luxury_tier: "classic", station_count: 2, action_station_count: 0, cold_station_count: 1, bar_count: 1, is_outdoor: false, has_room_flip: false, event_duration_hours: 3, high_dietary_complexity: false });
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const calculate = useCallback(async () => {
    setLoading(true);
    try { setResult(await api("/recommend/staffing", { method: "POST", body: JSON.stringify(form) })); } catch (e) { console.error(e); } finally { setLoading(false); }
  }, [form]);

  const updateField = (k: string, v: any) => setForm((p) => ({ ...p, [k]: v }));

  return (
    <div data-testid="staffing-tab" className="space-y-5">
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <label className="block"><span className="text-xs text-slate-400">Guest Count</span><input data-testid="staffing-guest-count" type="number" value={form.guest_count} onChange={(e) => updateField("guest_count", +e.target.value)} className="w-full mt-1 bg-slate-800 border border-slate-700 rounded px-3 py-1.5 text-sm text-slate-200" /></label>
        <label className="block"><span className="text-xs text-slate-400">Service Style</span>
          <select data-testid="staffing-service-style" value={form.service_style} onChange={(e) => updateField("service_style", e.target.value)} className="w-full mt-1 bg-slate-800 border border-slate-700 rounded px-3 py-1.5 text-sm text-slate-200">
            <option value="standard_buffet">Standard Buffet</option><option value="luxury_buffet">Luxury Buffet</option><option value="multi_station_reception">Multi-Station Reception</option>
          </select></label>
        <label className="block"><span className="text-xs text-slate-400">Luxury Tier</span>
          <select data-testid="staffing-luxury-tier" value={form.luxury_tier} onChange={(e) => updateField("luxury_tier", e.target.value)} className="w-full mt-1 bg-slate-800 border border-slate-700 rounded px-3 py-1.5 text-sm text-slate-200">
            <option value="classic">Classic</option><option value="elevated">Elevated</option><option value="signature">Signature</option><option value="luxury">Luxury</option>
          </select></label>
        <label className="block"><span className="text-xs text-slate-400">Stations</span><input type="number" value={form.station_count} onChange={(e) => updateField("station_count", +e.target.value)} className="w-full mt-1 bg-slate-800 border border-slate-700 rounded px-3 py-1.5 text-sm text-slate-200" /></label>
        <label className="block"><span className="text-xs text-slate-400">Action Stations</span><input type="number" value={form.action_station_count} onChange={(e) => updateField("action_station_count", +e.target.value)} className="w-full mt-1 bg-slate-800 border border-slate-700 rounded px-3 py-1.5 text-sm text-slate-200" /></label>
        <label className="block"><span className="text-xs text-slate-400">Bar Count</span><input type="number" value={form.bar_count} onChange={(e) => updateField("bar_count", +e.target.value)} className="w-full mt-1 bg-slate-800 border border-slate-700 rounded px-3 py-1.5 text-sm text-slate-200" /></label>
        <label className="block"><span className="text-xs text-slate-400">Duration (hrs)</span><input type="number" step="0.5" value={form.event_duration_hours} onChange={(e) => updateField("event_duration_hours", +e.target.value)} className="w-full mt-1 bg-slate-800 border border-slate-700 rounded px-3 py-1.5 text-sm text-slate-200" /></label>
        <label className="flex items-center gap-2 mt-4"><input type="checkbox" checked={form.is_outdoor} onChange={(e) => updateField("is_outdoor", e.target.checked)} className="rounded" /><span className="text-xs text-slate-400">Outdoor</span></label>
        <label className="flex items-center gap-2 mt-4"><input type="checkbox" checked={form.has_room_flip} onChange={(e) => updateField("has_room_flip", e.target.checked)} className="rounded" /><span className="text-xs text-slate-400">Room Flip</span></label>
      </div>
      <button data-testid="staffing-calculate-btn" onClick={calculate} disabled={loading} className="bg-cyan-600 hover:bg-cyan-500 text-white px-5 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors disabled:opacity-50">
        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Users className="w-4 h-4" />} Calculate Staffing
      </button>

      {result && (
        <div className="space-y-4 mt-2">
          <div className="grid grid-cols-3 gap-3">
            <KpiCard label="FOH Staff" value={result.totals.adjusted_foh} icon={Users} color="text-cyan-400" />
            <KpiCard label="BOH Staff" value={result.totals.adjusted_boh} icon={Utensils} color="text-orange-400" />
            <KpiCard label="Total Staff" value={result.totals.total_staff} sub={`${result.totals.complexity_multiplier}x multiplier`} icon={Users} color="text-emerald-400" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <h4 className="text-xs text-slate-400 uppercase mb-2">FOH Breakdown</h4>
              {Object.entries(result.foh_breakdown).map(([role, d]: any) => (
                <div key={role} className="flex justify-between text-sm py-1 border-b border-slate-800"><span className="text-slate-300">{role.replace(/_/g, " ")}</span><span className="text-slate-100 font-medium">{d.count}</span></div>
              ))}
            </div>
            <div>
              <h4 className="text-xs text-slate-400 uppercase mb-2">BOH Breakdown</h4>
              {Object.entries(result.boh_breakdown).map(([role, d]: any) => (
                <div key={role} className="flex justify-between text-sm py-1 border-b border-slate-800"><span className="text-slate-300">{role.replace(/_/g, " ")}</span><span className="text-slate-100 font-medium">{d.count}</span></div>
              ))}
            </div>
          </div>
          {result.active_complexity_factors.length > 0 && (
            <div>
              <h4 className="text-xs text-slate-400 uppercase mb-2">Active Complexity Factors</h4>
              {result.active_complexity_factors.map((f: any, i: number) => (
                <div key={i} className="flex items-start gap-2 text-sm py-1"><AlertTriangle className="w-3.5 h-3.5 text-amber-500 mt-0.5 shrink-0" /><span className="text-slate-300"><strong>{f.factor}:</strong> {f.effect}</span></div>
              ))}
            </div>
          )}
          <div className="bg-slate-800/40 border border-slate-700/30 rounded-lg p-3"><p className="text-xs text-slate-400 italic">{result.explainability}</p></div>
        </div>
      )}
    </div>
  );
}

// ─── Layout Advisor Tab ────────────────────────────────────────────

function LayoutTab() {
  const [form, setForm] = useState({ guest_count: 150, service_style: "buffet", room_sqft: 3000, station_types: ["self_serve_buffet_segment", "carving_station"], is_outdoor: false, has_bar: true, luxury_tier: "classic" });
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const calculate = useCallback(async () => {
    setLoading(true);
    try { setResult(await api("/recommend/layout", { method: "POST", body: JSON.stringify(form) })); } catch (e) { console.error(e); } finally { setLoading(false); }
  }, [form]);

  const stationOptions = ["self_serve_buffet_segment", "carving_station", "omelet_station", "pasta_action_station", "dessert_self_serve", "coffee_station"];

  return (
    <div data-testid="layout-tab" className="space-y-5">
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <label className="block"><span className="text-xs text-slate-400">Guest Count</span><input data-testid="layout-guest-count" type="number" value={form.guest_count} onChange={(e) => setForm(p => ({ ...p, guest_count: +e.target.value }))} className="w-full mt-1 bg-slate-800 border border-slate-700 rounded px-3 py-1.5 text-sm text-slate-200" /></label>
        <label className="block"><span className="text-xs text-slate-400">Luxury Tier</span>
          <select value={form.luxury_tier} onChange={(e) => setForm(p => ({ ...p, luxury_tier: e.target.value }))} className="w-full mt-1 bg-slate-800 border border-slate-700 rounded px-3 py-1.5 text-sm text-slate-200">
            <option value="classic">Classic</option><option value="elevated">Elevated</option><option value="signature">Signature</option><option value="luxury">Luxury</option>
          </select></label>
        <label className="flex items-center gap-2 mt-4"><input type="checkbox" checked={form.has_bar} onChange={(e) => setForm(p => ({ ...p, has_bar: e.target.checked }))} className="rounded" /><span className="text-xs text-slate-400">Has Bar</span></label>
      </div>
      <div>
        <span className="text-xs text-slate-400 block mb-1.5">Station Types</span>
        <div className="flex flex-wrap gap-2">
          {stationOptions.map((s) => (
            <button key={s} onClick={() => setForm(p => ({ ...p, station_types: p.station_types.includes(s) ? p.station_types.filter(x => x !== s) : [...p.station_types, s] }))}
              className={cn("text-xs px-2.5 py-1 rounded-full border transition-colors", form.station_types.includes(s) ? "bg-cyan-600/20 border-cyan-500/50 text-cyan-300" : "bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-600")}>
              {s.replace(/_/g, " ")}
            </button>
          ))}
        </div>
      </div>
      <button data-testid="layout-calculate-btn" onClick={calculate} disabled={loading} className="bg-violet-600 hover:bg-violet-500 text-white px-5 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors disabled:opacity-50">
        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <LayoutGrid className="w-4 h-4" />} Analyze Layout
      </button>

      {result && (
        <div className="space-y-4 mt-2">
          <div className="grid grid-cols-2 gap-3">
            <KpiCard label="Pattern" value={result.recommended_pattern.replace(/_/g, " ")} icon={LayoutGrid} color="text-violet-400" />
            <KpiCard label="Lines Needed" value={result.lines_needed} icon={Layers} color="text-cyan-400" />
          </div>
          {result.likely_pinch_points.length > 0 && (
            <div>
              <h4 className="text-xs text-slate-400 uppercase mb-2">Likely Pinch Points</h4>
              {result.likely_pinch_points.map((p: any, i: number) => (
                <div key={i} className="flex items-start gap-2 text-sm py-1.5 border-b border-slate-800"><AlertTriangle className="w-3.5 h-3.5 text-amber-500 mt-0.5 shrink-0" /><div><span className="text-slate-200 font-medium">{p.type.replace(/_/g, " ")}</span><span className="text-slate-500 ml-2 text-xs">{p.description}</span></div></div>
              ))}
            </div>
          )}
          {result.throughput_analysis.length > 0 && (
            <div>
              <h4 className="text-xs text-slate-400 uppercase mb-2">Throughput Analysis</h4>
              {result.throughput_analysis.map((t: any, i: number) => (
                <div key={i} className="flex items-center justify-between text-sm py-1.5 border-b border-slate-800">
                  <span className="text-slate-300">{t.station.replace(/_/g, " ")}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-slate-400 text-xs">{t.base_rate_gpm} guests/min</span>
                    <span className={cn("text-xs font-medium", t.alert ? "text-red-400" : "text-green-400")}>{t.estimated_minutes_to_serve} min</span>
                    {t.alert && <AlertTriangle className="w-3 h-3 text-red-400" />}
                  </div>
                </div>
              ))}
            </div>
          )}
          <div className="bg-slate-800/40 border border-slate-700/30 rounded-lg p-3"><p className="text-xs text-slate-400 italic">{result.explainability}</p></div>
        </div>
      )}
    </div>
  );
}

// ─── Risk Assessment Tab ───────────────────────────────────────────

function RiskTab() {
  const [form, setForm] = useState({ event_type: "wedding", service_style: "buffet", guest_count: 200, is_outdoor: false, has_weather_plan: true, custom_menu_within_72h: false, guest_count_growth_pct: 0, action_station_count: 1, has_power_plan: true, luxury_tier: "classic", guarantee_provided: true, late_guarantee: false });
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const calculate = useCallback(async () => {
    setLoading(true);
    try { setResult(await api("/recommend/risk-assessment", { method: "POST", body: JSON.stringify(form) })); } catch (e) { console.error(e); } finally { setLoading(false); }
  }, [form]);

  return (
    <div data-testid="risk-tab" className="space-y-5">
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <label className="block"><span className="text-xs text-slate-400">Guest Count</span><input data-testid="risk-guest-count" type="number" value={form.guest_count} onChange={(e) => setForm(p => ({ ...p, guest_count: +e.target.value }))} className="w-full mt-1 bg-slate-800 border border-slate-700 rounded px-3 py-1.5 text-sm text-slate-200" /></label>
        <label className="block"><span className="text-xs text-slate-400">Event Type</span>
          <select value={form.event_type} onChange={(e) => setForm(p => ({ ...p, event_type: e.target.value }))} className="w-full mt-1 bg-slate-800 border border-slate-700 rounded px-3 py-1.5 text-sm text-slate-200">
            <option value="wedding">Wedding</option><option value="corporate">Corporate</option><option value="social">Social</option><option value="holiday">Holiday</option>
          </select></label>
        <label className="block"><span className="text-xs text-slate-400">Growth Since Lock %</span><input type="number" value={form.guest_count_growth_pct} onChange={(e) => setForm(p => ({ ...p, guest_count_growth_pct: +e.target.value }))} className="w-full mt-1 bg-slate-800 border border-slate-700 rounded px-3 py-1.5 text-sm text-slate-200" /></label>
      </div>
      <div className="flex flex-wrap gap-3">
        {(["is_outdoor", "has_weather_plan", "custom_menu_within_72h", "has_power_plan", "late_guarantee"] as const).map(k => (
          <label key={k} className="flex items-center gap-1.5"><input type="checkbox" checked={(form as any)[k]} onChange={(e) => setForm(p => ({ ...p, [k]: e.target.checked }))} className="rounded" /><span className="text-xs text-slate-400">{k.replace(/_/g, " ")}</span></label>
        ))}
      </div>
      <button data-testid="risk-calculate-btn" onClick={calculate} disabled={loading} className="bg-red-600 hover:bg-red-500 text-white px-5 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors disabled:opacity-50">
        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldAlert className="w-4 h-4" />} Assess Risk
      </button>

      {result && (
        <div className="space-y-4 mt-2">
          <div className="grid grid-cols-2 gap-3">
            <div className={cn("p-4 rounded-lg border text-center", result.overall_risk_level === "critical" ? "bg-red-900/20 border-red-500/40" : result.overall_risk_level === "high" ? "bg-orange-900/20 border-orange-500/40" : result.overall_risk_level === "medium" ? "bg-yellow-900/20 border-yellow-500/40" : "bg-green-900/20 border-green-500/40")}>
              <div className="text-3xl font-bold text-slate-100">{result.risk_score}</div>
              <div className="text-xs text-slate-400 mt-1">Risk Score</div>
              <SeverityBadge level={result.overall_risk_level} />
            </div>
            <KpiCard label="Flags" value={result.risk_flags.length} sub="Issues detected" icon={AlertTriangle} color="text-orange-400" />
          </div>
          {result.risk_flags.length > 0 && (
            <div>
              <h4 className="text-xs text-slate-400 uppercase mb-2">Risk Flags</h4>
              {result.risk_flags.map((f: any, i: number) => (
                <div key={i} className="bg-slate-800/40 border border-slate-700/30 rounded-lg p-3 mb-2">
                  <div className="flex items-center gap-2 mb-1"><SeverityBadge level={f.severity} /><span className="text-sm text-slate-200 font-medium">{f.trigger.replace(/_/g, " ")}</span></div>
                  <div className="flex flex-wrap gap-1">{f.dimensions.map((d: string) => <span key={d} className="text-[10px] bg-slate-700/60 text-slate-400 px-1.5 py-0.5 rounded">{d}</span>)}</div>
                </div>
              ))}
            </div>
          )}
          <div className="bg-slate-800/40 border border-slate-700/30 rounded-lg p-3"><p className="text-xs text-slate-400 italic">{result.explainability}</p></div>
        </div>
      )}
    </div>
  );
}

// ─── Pricing Tab ───────────────────────────────────────────────────

function PricingTab() {
  const [form, setForm] = useState({ event_type: "wedding", service_style: "buffet", meal_period: "dinner", guest_count: 150, tier: "signature", upgrades: [] as string[], bar_model: "hosted_hourly", bar_tier: "premium", bar_hours: 4, bar_demand_level: "moderate", addons: [] as string[], concession_percent: 0, concession_reason: "" });
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [upgrades, setUpgrades] = useState<any>(null);

  useEffect(() => { api("/upgrades").then(setUpgrades); }, []);

  const calculate = useCallback(async () => {
    setLoading(true);
    try { setResult(await api("/recommend/pricing", { method: "POST", body: JSON.stringify(form) })); } catch (e) { console.error(e); } finally { setLoading(false); }
  }, [form]);

  const toggleUpgrade = (id: string) => setForm(p => ({ ...p, upgrades: p.upgrades.includes(id) ? p.upgrades.filter(x => x !== id) : [...p.upgrades, id] }));

  return (
    <div data-testid="pricing-tab" className="space-y-5">
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <label className="block"><span className="text-xs text-slate-400">Guest Count</span><input data-testid="pricing-guest-count" type="number" value={form.guest_count} onChange={(e) => setForm(p => ({ ...p, guest_count: +e.target.value }))} className="w-full mt-1 bg-slate-800 border border-slate-700 rounded px-3 py-1.5 text-sm text-slate-200" /></label>
        <label className="block"><span className="text-xs text-slate-400">Event Type</span>
          <select value={form.event_type} onChange={(e) => setForm(p => ({ ...p, event_type: e.target.value }))} className="w-full mt-1 bg-slate-800 border border-slate-700 rounded px-3 py-1.5 text-sm text-slate-200">
            <option value="wedding">Wedding</option><option value="corporate">Corporate</option><option value="social">Social</option><option value="holiday">Holiday</option>
          </select></label>
        <label className="block"><span className="text-xs text-slate-400">Tier</span>
          <select data-testid="pricing-tier" value={form.tier} onChange={(e) => setForm(p => ({ ...p, tier: e.target.value }))} className="w-full mt-1 bg-slate-800 border border-slate-700 rounded px-3 py-1.5 text-sm text-slate-200">
            <option value="classic">Classic</option><option value="elevated">Elevated</option><option value="signature">Signature</option><option value="luxury">Luxury</option>
          </select></label>
        <label className="block"><span className="text-xs text-slate-400">Bar Model</span>
          <select value={form.bar_model} onChange={(e) => setForm(p => ({ ...p, bar_model: e.target.value }))} className="w-full mt-1 bg-slate-800 border border-slate-700 rounded px-3 py-1.5 text-sm text-slate-200">
            <option value="">None</option><option value="hosted_hourly">Hosted Hourly</option><option value="hosted_flat_event">Hosted Flat</option><option value="consumption_bar">Consumption</option><option value="cash_bar">Cash Bar</option>
          </select></label>
        <label className="block"><span className="text-xs text-slate-400">Bar Hours</span><input type="number" step="0.5" value={form.bar_hours} onChange={(e) => setForm(p => ({ ...p, bar_hours: +e.target.value }))} className="w-full mt-1 bg-slate-800 border border-slate-700 rounded px-3 py-1.5 text-sm text-slate-200" /></label>
        <label className="block"><span className="text-xs text-slate-400">Concession %</span><input type="number" value={form.concession_percent} onChange={(e) => setForm(p => ({ ...p, concession_percent: +e.target.value }))} className="w-full mt-1 bg-slate-800 border border-slate-700 rounded px-3 py-1.5 text-sm text-slate-200" /></label>
      </div>

      {upgrades && (
        <div>
          <span className="text-xs text-slate-400 block mb-1.5">Upgrades</span>
          <div className="flex flex-wrap gap-1.5">
            {[...(upgrades.food_upgrades || []), ...(upgrades.beverage_upgrades || [])].map((u: any) => (
              <button key={u.upgrade_id} onClick={() => toggleUpgrade(u.upgrade_id)}
                className={cn("text-xs px-2 py-1 rounded-full border transition-colors", form.upgrades.includes(u.upgrade_id) ? "bg-emerald-600/20 border-emerald-500/50 text-emerald-300" : "bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-600")}>
                {u.name} (+${u.example_add_usd})
              </button>
            ))}
          </div>
        </div>
      )}

      <button data-testid="pricing-calculate-btn" onClick={calculate} disabled={loading} className="bg-emerald-600 hover:bg-emerald-500 text-white px-5 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors disabled:opacity-50">
        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <DollarSign className="w-4 h-4" />} Calculate Pricing
      </button>

      {result && (
        <div className="space-y-4 mt-2">
          <div className="bg-slate-800/50 border border-slate-700/40 rounded-xl p-4">
            <div className="text-sm text-slate-400 mb-1">{result.matched_package?.name || "No match"}</div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold text-emerald-400">${result.estimate.net_total.toLocaleString()}</span>
              <span className="text-sm text-slate-500">net total</span>
            </div>
            <div className="grid grid-cols-4 gap-2 mt-3 text-center">
              <div><div className="text-lg font-semibold text-slate-200">${result.estimate.base_pp}</div><div className="text-[10px] text-slate-500">Base/pp</div></div>
              <div><div className="text-lg font-semibold text-slate-200">${result.estimate.upgrades_pp}</div><div className="text-[10px] text-slate-500">Upgrades/pp</div></div>
              <div><div className="text-lg font-semibold text-slate-200">${result.estimate.bar_pp}</div><div className="text-[10px] text-slate-500">Bar/pp</div></div>
              <div><div className="text-lg font-semibold text-slate-200">${result.estimate.total_pp}</div><div className="text-[10px] text-slate-500">Total/pp</div></div>
            </div>
          </div>
          {result.estimate.concession_amount > 0 && (
            <div className="flex items-center gap-2 text-sm bg-amber-900/20 border border-amber-600/30 rounded-lg p-3">
              <Info className="w-4 h-4 text-amber-400" />
              <span className="text-amber-300">Concession: -${result.estimate.concession_amount.toLocaleString()} ({result.estimate.concession_approval_tier} approval required)</span>
            </div>
          )}
          {result.margin_guardrails.warnings.length > 0 && (
            <div>{result.margin_guardrails.warnings.map((w: any, i: number) => (
              <div key={i} className="flex items-start gap-2 text-sm py-1 text-red-400"><AlertTriangle className="w-3.5 h-3.5 mt-0.5" />{w.logic}</div>
            ))}</div>
          )}
          {result.operational_impacts.length > 0 && (
            <div>
              <h4 className="text-xs text-slate-400 uppercase mb-2">Operational Impacts</h4>
              {result.operational_impacts.map((o: any, i: number) => (
                <div key={i} className="bg-slate-800/40 border border-slate-700/30 rounded p-2 mb-1 text-xs">
                  <span className="text-slate-300 font-medium">{o.sales_choice}:</span>
                  {o.foh_effect && <span className="text-slate-400 ml-1">FOH: {o.foh_effect}</span>}
                  {o.boh_effect && <span className="text-slate-400 ml-1">| BOH: {o.boh_effect}</span>}
                </div>
              ))}
            </div>
          )}
          <div className="bg-slate-800/40 border border-slate-700/30 rounded-lg p-3"><p className="text-xs text-slate-400 italic">{result.explainability}</p></div>
        </div>
      )}
    </div>
  );
}

// ─── Purchasing Tab ────────────────────────────────────────────────

function PurchasingTab() {
  const [form, setForm] = useState({ guest_count: 150, event_type: "corporate", service_style: "buffet", luxury_tier: "classic", is_outdoor: false, high_alcohol: false, family_heavy: false, child_count: 0, vendor_meals: 5, staff_meals: 10 });
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const calculate = useCallback(async () => {
    setLoading(true);
    try { setResult(await api("/recommend/purchasing", { method: "POST", body: JSON.stringify(form) })); } catch (e) { console.error(e); } finally { setLoading(false); }
  }, [form]);

  return (
    <div data-testid="purchasing-tab" className="space-y-5">
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <label className="block"><span className="text-xs text-slate-400">Guest Count</span><input type="number" value={form.guest_count} onChange={(e) => setForm(p => ({ ...p, guest_count: +e.target.value }))} className="w-full mt-1 bg-slate-800 border border-slate-700 rounded px-3 py-1.5 text-sm text-slate-200" /></label>
        <label className="block"><span className="text-xs text-slate-400">Children</span><input type="number" value={form.child_count} onChange={(e) => setForm(p => ({ ...p, child_count: +e.target.value }))} className="w-full mt-1 bg-slate-800 border border-slate-700 rounded px-3 py-1.5 text-sm text-slate-200" /></label>
        <label className="block"><span className="text-xs text-slate-400">Vendor Meals</span><input type="number" value={form.vendor_meals} onChange={(e) => setForm(p => ({ ...p, vendor_meals: +e.target.value }))} className="w-full mt-1 bg-slate-800 border border-slate-700 rounded px-3 py-1.5 text-sm text-slate-200" /></label>
      </div>
      <div className="flex flex-wrap gap-3">
        {(["is_outdoor", "high_alcohol", "family_heavy"] as const).map(k => (
          <label key={k} className="flex items-center gap-1.5"><input type="checkbox" checked={(form as any)[k]} onChange={(e) => setForm(p => ({ ...p, [k]: e.target.checked }))} className="rounded" /><span className="text-xs text-slate-400">{k.replace(/_/g, " ")}</span></label>
        ))}
      </div>
      <button data-testid="purchasing-calculate-btn" onClick={calculate} disabled={loading} className="bg-amber-600 hover:bg-amber-500 text-white px-5 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors disabled:opacity-50">
        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShoppingCart className="w-4 h-4" />} Analyze Purchasing
      </button>

      {result && (
        <div className="space-y-4 mt-2">
          <div className="grid grid-cols-2 gap-3">
            <KpiCard label="Adult Equiv." value={result.adult_equivalent_guest_count} icon={Users} color="text-amber-400" />
            <KpiCard label="Confidence" value={result.procurement_confidence.level.replace(/_/g, " ")} icon={CheckCircle} color="text-emerald-400" />
          </div>
          {result.active_contingency_triggers.length > 0 && (
            <div>
              <h4 className="text-xs text-slate-400 uppercase mb-2">Contingency Triggers</h4>
              {result.active_contingency_triggers.map((t: any, i: number) => (
                <div key={i} className="flex items-start gap-2 text-sm py-1.5 border-b border-slate-800"><AlertTriangle className="w-3.5 h-3.5 text-amber-500 mt-0.5 shrink-0" /><div><span className="text-slate-200 font-medium">{t.trigger}:</span><span className="text-slate-400 ml-1">{t.impact}</span></div></div>
              ))}
            </div>
          )}
          <div>
            <h4 className="text-xs text-slate-400 uppercase mb-2">Support Items Checklist</h4>
            <div className="flex flex-wrap gap-1.5">{result.support_items_checklist.map((item: string) => (
              <span key={item} className="text-[10px] bg-slate-700/60 text-slate-300 px-2 py-0.5 rounded-full">{item}</span>
            ))}</div>
          </div>
          <div>
            <h4 className="text-xs text-slate-400 uppercase mb-2">Pull Sheet Sections</h4>
            <div className="grid grid-cols-3 gap-1">{result.pull_sheet_sections.map((s: string) => (
              <div key={s} className="text-xs text-slate-300 bg-slate-800/40 border border-slate-700/30 rounded px-2 py-1">{s.replace(/_/g, " ")}</div>
            ))}</div>
          </div>
          <div className="bg-slate-800/40 border border-slate-700/30 rounded-lg p-3"><p className="text-xs text-slate-400 italic">{result.explainability}</p></div>
        </div>
      )}
    </div>
  );
}

// ─── Lifecycle Tab ─────────────────────────────────────────────────

function LifecycleTab() {
  const [stages, setStages] = useState<any[]>([]);
  const [selected, setSelected] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api("/recommend/lifecycle-stages").then(d => { setStages(d.stages); setLoading(false); });
  }, []);

  const selectStage = async (stageId: string) => {
    const d = await api(`/recommend/lifecycle-stage/${stageId}`);
    setSelected(d);
  };

  if (loading) return <div className="flex items-center justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-slate-400" /></div>;

  return (
    <div data-testid="lifecycle-tab" className="space-y-4">
      <div className="flex flex-wrap gap-1.5">
        {stages.map((s, i) => (
          <button key={s.stage_id} onClick={() => selectStage(s.stage_id)}
            className={cn("text-xs px-3 py-1.5 rounded-lg border transition-colors flex items-center gap-1", selected?.stage?.stage_id === s.stage_id ? "bg-cyan-600/20 border-cyan-500/50 text-cyan-300" : "bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-600")}>
            <span className="w-4 h-4 rounded-full bg-slate-700 flex items-center justify-center text-[9px] font-bold text-slate-300">{i + 1}</span>
            {s.name}
          </button>
        ))}
      </div>
      {selected && (
        <div className="bg-slate-800/40 border border-slate-700/40 rounded-xl p-4 space-y-3">
          <div><h3 className="text-lg font-semibold text-slate-100">{selected.stage.name}</h3><p className="text-sm text-slate-400 mt-1">{selected.stage.objective}</p></div>
          {selected.stage.required_fields && (
            <div><h4 className="text-xs text-slate-400 uppercase mb-1">Required Fields</h4><div className="flex flex-wrap gap-1">{selected.stage.required_fields.map((f: string) => <span key={f} className="text-[10px] bg-cyan-900/30 text-cyan-300 px-1.5 py-0.5 rounded">{f}</span>)}</div></div>
          )}
          {selected.stage.outputs && (
            <div><h4 className="text-xs text-slate-400 uppercase mb-1">Outputs</h4><div className="flex flex-wrap gap-1">{selected.stage.outputs.map((f: string) => <span key={f} className="text-[10px] bg-emerald-900/30 text-emerald-300 px-1.5 py-0.5 rounded">{f}</span>)}</div></div>
          )}
          {selected.stage.risks_to_flag && (
            <div><h4 className="text-xs text-slate-400 uppercase mb-1">Risks to Flag</h4>{selected.stage.risks_to_flag.map((r: string) => <div key={r} className="flex items-start gap-1 text-xs text-amber-300 py-0.5"><AlertTriangle className="w-3 h-3 mt-0.5 shrink-0" />{r}</div>)}</div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Culinary Profiles Tab ─────────────────────────────────────────

function CulinaryTab() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { api("/recommend/culinary-profiles").then(d => { setData(d); setLoading(false); }); }, []);

  if (loading) return <div className="flex items-center justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-slate-400" /></div>;
  if (!data) return null;

  return (
    <div data-testid="culinary-tab" className="space-y-5">
      <div>
        <h3 className="text-sm font-medium text-slate-300 mb-3">Item Behavior Profiles</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {data.item_behavior_profiles.map((p: any) => (
            <div key={p.profile} className="bg-slate-800/40 border border-slate-700/40 rounded-lg p-3">
              <div className="text-sm font-semibold text-slate-200">{p.profile.replace(/_/g, " ")}</div>
              <div className="mt-2 space-y-1">
                <div className="flex flex-wrap gap-1">{p.strengths.map((s: string) => <span key={s} className="text-[10px] bg-green-900/30 text-green-300 px-1.5 py-0.5 rounded">{s}</span>)}</div>
                <div className="flex flex-wrap gap-1">{p.risks.map((r: string) => <span key={r} className="text-[10px] bg-red-900/30 text-red-300 px-1.5 py-0.5 rounded">{r}</span>)}</div>
              </div>
              <div className="text-[10px] text-slate-500 mt-1">Best for: {p.best_use.join(", ")}</div>
            </div>
          ))}
        </div>
      </div>
      <div>
        <h3 className="text-sm font-medium text-slate-300 mb-2">Menu Balancing Rules</h3>
        <div className="space-y-1">{data.menu_balancing_rules.map((r: string, i: number) => <div key={i} className="flex items-start gap-2 text-xs text-slate-300"><CheckCircle className="w-3 h-3 text-emerald-500 mt-0.5 shrink-0" />{r}</div>)}</div>
      </div>
      <div>
        <h3 className="text-sm font-medium text-slate-300 mb-2">Common Failure Modes</h3>
        <div className="space-y-1">{data.common_failure_modes.map((f: string, i: number) => <div key={i} className="flex items-start gap-2 text-xs text-slate-300"><AlertTriangle className="w-3 h-3 text-red-400 mt-0.5 shrink-0" />{f}</div>)}</div>
      </div>
    </div>
  );
}

// ─── Tab definitions ───────────────────────────────────────────────

const TABS: { id: TabId; label: string; icon: any; color: string }[] = [
  { id: "overview", label: "Overview", icon: Brain, color: "text-cyan-400" },
  { id: "staffing", label: "Staffing", icon: Users, color: "text-blue-400" },
  { id: "layout", label: "Layout", icon: LayoutGrid, color: "text-violet-400" },
  { id: "risk", label: "Risk", icon: ShieldAlert, color: "text-red-400" },
  { id: "pricing", label: "Pricing", icon: DollarSign, color: "text-emerald-400" },
  { id: "purchasing", label: "Purchasing", icon: ShoppingCart, color: "text-amber-400" },
  { id: "lifecycle", label: "Lifecycle", icon: Clock, color: "text-indigo-400" },
  { id: "culinary", label: "Culinary", icon: Utensils, color: "text-orange-400" },
];

// ─── Main Component ────────────────────────────────────────────────

export default function BanquetIntelligence() {
  const [tab, setTab] = useState<TabId>("overview");

  return (
    <div data-testid="banquet-intelligence-panel" className="h-full flex flex-col bg-slate-900 text-slate-100">
      {/* Header */}
      <div className="px-5 py-4 border-b border-slate-800/60 bg-slate-900/80 backdrop-blur-sm">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-gradient-to-br from-cyan-600/20 to-violet-600/20 border border-cyan-500/20">
            <Brain className="w-5 h-5 text-cyan-400" />
          </div>
          <div>
            <h1 className="text-lg font-semibold text-slate-100">Banquet Intelligence</h1>
            <p className="text-xs text-slate-500">Unified Knowledge Engine - 10 Domains</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="px-4 py-2 border-b border-slate-800/40 flex gap-1 overflow-x-auto scrollbar-thin">
        {TABS.map((t) => (
          <button key={t.id} data-testid={`tab-${t.id}`} onClick={() => setTab(t.id)}
            className={cn("flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all",
              tab === t.id ? "bg-slate-800 border border-slate-700/60 text-slate-100" : "text-slate-500 hover:text-slate-300 hover:bg-slate-800/40")}>
            <t.icon className={cn("w-3.5 h-3.5", tab === t.id ? t.color : "")} />
            {t.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-5">
        {tab === "overview" && <OverviewTab />}
        {tab === "staffing" && <StaffingTab />}
        {tab === "layout" && <LayoutTab />}
        {tab === "risk" && <RiskTab />}
        {tab === "pricing" && <PricingTab />}
        {tab === "purchasing" && <PurchasingTab />}
        {tab === "lifecycle" && <LifecycleTab />}
        {tab === "culinary" && <CulinaryTab />}
      </div>
    </div>
  );
}
