/**
 * What-If Scenario Planner
 * Side-by-side event scenario comparison tool for EchoEvents.
 * Connects to /api/scenario-planner/* endpoints.
 */
import React, { useState, useCallback, useEffect } from "react";
import {
  BarChart3,
  Users,
  LayoutGrid,
  ShieldAlert,
  DollarSign,
  Loader2,
  AlertTriangle,
  CheckCircle,
  ArrowLeftRight,
  PlusCircle,
  Trash2,
  Play,
  GraduationCap,
  Building2,
  Zap,
  Clock,
  ChevronDown,
  ChevronRight,
  Info,
} from "lucide-react";
import { cn } from "@/lib/glass";

const API = "";

async function api<T = any>(path: string, opts?: RequestInit): Promise<T> {
  const r = await fetch(`${API}/api/scenario-planner${path}`, {
    headers: { "Content-Type": "application/json" },
    ...opts,
  });
  if (!r.ok) throw new Error(`${r.status} ${r.statusText}`);
  return r.json();
}

function fmt(n: number) { return n.toLocaleString("en-US", { maximumFractionDigits: 0 }); }
function fmtUsd(n: number) { return `$${fmt(n)}`; }
function fmtPct(n: number) { return `${(n * 100).toFixed(1)}%`; }

// ─── Metric Card ───────────────────────────────────────────────────
function MetricCard({ label, valueA, valueB, delta, format = "usd", severity }: {
  label: string; valueA: any; valueB: any; delta?: number; format?: string; severity?: string;
}) {
  const fmtVal = (v: any) => {
    if (v === null || v === undefined) return "—";
    if (format === "usd") return fmtUsd(v);
    if (format === "pct") return fmtPct(v);
    if (format === "number") return fmt(v);
    return String(v);
  };
  const deltaColor = delta === undefined || delta === 0 ? "text-slate-400" : delta > 0 ? "text-emerald-400" : "text-rose-400";
  return (
    <div className="bg-slate-800/50 border border-slate-700/40 rounded-lg p-3">
      <div className="text-xs text-slate-400 uppercase tracking-wider mb-2">{label}</div>
      <div className="grid grid-cols-3 gap-2 items-center">
        <div className="text-sm font-semibold text-cyan-300">{fmtVal(valueA)}</div>
        <div className={cn("text-center text-xs font-mono", deltaColor)}>
          {delta !== undefined ? (delta > 0 ? `+${fmtVal(delta)}` : fmtVal(delta)) : "—"}
        </div>
        <div className="text-sm font-semibold text-amber-300 text-right">{fmtVal(valueB)}</div>
      </div>
    </div>
  );
}

// ─── Risk Badge ────────────────────────────────────────────────────
function RiskBadge({ flag }: { flag: any }) {
  const colors: Record<string, string> = {
    critical: "bg-rose-500/20 text-rose-300 border-rose-500/30",
    high: "bg-orange-500/20 text-orange-300 border-orange-500/30",
    medium: "bg-yellow-500/20 text-yellow-300 border-yellow-500/30",
    low: "bg-slate-600/30 text-slate-300 border-slate-600/40",
  };
  return (
    <div data-testid={`risk-${flag.flag}`} className={cn("rounded-md border px-3 py-2 text-xs", colors[flag.severity] || colors.medium)}>
      <div className="font-semibold flex items-center gap-1">
        <AlertTriangle className="w-3 h-3" />
        {flag.flag.replace(/_/g, " ")}
        <span className="ml-auto uppercase text-[10px] opacity-70">{flag.severity}</span>
      </div>
      <div className="mt-1 opacity-80">{flag.detail}</div>
    </div>
  );
}

// ─── Scenario Form ─────────────────────────────────────────────────
const DEFAULT_SCENARIO = {
  name: "Scenario A", event_type: "wedding", service_style: "buffet", meal_period: "dinner",
  guest_count: 150, tier: "signature", setup_style_id: "banquet_rounds_60",
  room_template_id: "template_ballroom_medium", comfort_tier: "standard",
  program_elements: [] as string[], upgrades: [] as string[], bar_model: "hosted_hourly",
  bar_tier: "premium", bar_hours: 4, bar_demand_level: "moderate", addons: [] as string[],
  av_package_usd: 0, music_entertainment_usd: 0, floral_decor_usd: 0, photography_usd: 0,
  custom_enhancements: [] as any[], concession_percent: 0, concession_reason: "",
  room_rental_usd: 2500, fnb_minimum_usd: 25000, is_outdoor: false, is_training_mode: false,
};

function ScenarioForm({ scenario, onChange, label, rooms, styles, footprints, vendorAssets, packages }: {
  scenario: any; onChange: (s: any) => void; label: string;
  rooms: any[]; styles: any[]; footprints: any[]; vendorAssets: any[]; packages: any;
}) {
  const set = (k: string, v: any) => onChange({ ...scenario, [k]: v });
  const toggleArr = (k: string, val: string) => {
    const arr = scenario[k] || [];
    set(k, arr.includes(val) ? arr.filter((x: string) => x !== val) : [...arr, val]);
  };

  const [showAdvanced, setShowAdvanced] = useState(false);
  const [showVendor, setShowVendor] = useState(false);

  return (
    <div data-testid={`scenario-form-${label.toLowerCase().replace(/\s/g, "-")}`} className="space-y-3">
      <div className="flex items-center gap-2 mb-2">
        <div className={cn("w-3 h-3 rounded-full", label.includes("A") ? "bg-cyan-400" : "bg-amber-400")} />
        <input className="bg-transparent text-lg font-semibold text-slate-100 border-b border-slate-600 outline-none w-full" value={scenario.name} onChange={e => set("name", e.target.value)} />
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="text-[10px] text-slate-500 uppercase">Event Type</label>
          <select className="w-full bg-slate-700/60 text-slate-200 rounded px-2 py-1.5 text-sm border border-slate-600/50" value={scenario.event_type} onChange={e => set("event_type", e.target.value)}>
            {["wedding","corporate","social","holiday","nonprofit"].map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        <div>
          <label className="text-[10px] text-slate-500 uppercase">Service Style</label>
          <select className="w-full bg-slate-700/60 text-slate-200 rounded px-2 py-1.5 text-sm border border-slate-600/50" value={scenario.service_style} onChange={e => set("service_style", e.target.value)}>
            {["buffet","plated","stations","family_style","cocktail_reception"].map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        <div>
          <label className="text-[10px] text-slate-500 uppercase">Guests</label>
          <input type="number" className="w-full bg-slate-700/60 text-slate-200 rounded px-2 py-1.5 text-sm border border-slate-600/50" value={scenario.guest_count} onChange={e => set("guest_count", +e.target.value)} />
        </div>
        <div>
          <label className="text-[10px] text-slate-500 uppercase">Tier</label>
          <select className="w-full bg-slate-700/60 text-slate-200 rounded px-2 py-1.5 text-sm border border-slate-600/50" value={scenario.tier} onChange={e => set("tier", e.target.value)}>
            {(packages?.tiers || ["classic","elevated","signature","luxury"]).map((t: string) => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="text-[10px] text-slate-500 uppercase">Room</label>
          <select className="w-full bg-slate-700/60 text-slate-200 rounded px-2 py-1.5 text-sm border border-slate-600/50" value={scenario.room_template_id} onChange={e => set("room_template_id", e.target.value)}>
            {rooms.map(r => <option key={r.room_id} value={r.room_id}>{r.label} ({r.gross_sqft} sqft)</option>)}
          </select>
        </div>
        <div>
          <label className="text-[10px] text-slate-500 uppercase">Setup Style</label>
          <select className="w-full bg-slate-700/60 text-slate-200 rounded px-2 py-1.5 text-sm border border-slate-600/50" value={scenario.setup_style_id} onChange={e => set("setup_style_id", e.target.value)}>
            {styles.map(s => <option key={s.setup_style_id} value={s.setup_style_id}>{s.label}</option>)}
          </select>
        </div>
      </div>

      {/* Bar */}
      <div className="grid grid-cols-3 gap-2">
        <div>
          <label className="text-[10px] text-slate-500 uppercase">Bar Model</label>
          <select className="w-full bg-slate-700/60 text-slate-200 rounded px-2 py-1.5 text-sm border border-slate-600/50" value={scenario.bar_model} onChange={e => set("bar_model", e.target.value)}>
            <option value="">None</option>
            <option value="hosted_hourly">Hosted Hourly</option>
            <option value="cash_bar">Cash Bar</option>
            <option value="consumption">Consumption</option>
          </select>
        </div>
        <div>
          <label className="text-[10px] text-slate-500 uppercase">Bar Tier</label>
          <select className="w-full bg-slate-700/60 text-slate-200 rounded px-2 py-1.5 text-sm border border-slate-600/50" value={scenario.bar_tier} onChange={e => set("bar_tier", e.target.value)}>
            {["house","call","premium","luxury"].map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        <div>
          <label className="text-[10px] text-slate-500 uppercase">Bar Hours</label>
          <input type="number" className="w-full bg-slate-700/60 text-slate-200 rounded px-2 py-1.5 text-sm border border-slate-600/50" value={scenario.bar_hours} onChange={e => set("bar_hours", +e.target.value)} />
        </div>
      </div>

      {/* Vendor Assets Toggle */}
      <button onClick={() => setShowVendor(!showVendor)} className="w-full flex items-center gap-2 text-xs text-slate-400 hover:text-slate-200 py-1">
        {showVendor ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
        <Zap className="w-3 h-3" /> AV / Decor / Vendor Assets ({(scenario.program_elements || []).length} selected)
      </button>
      {showVendor && (
        <div className="max-h-40 overflow-y-auto bg-slate-800/40 rounded p-2 space-y-1">
          {vendorAssets.map((a: any) => (
            <label key={a.asset_id} className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer hover:bg-slate-700/30 rounded px-1 py-0.5">
              <input type="checkbox" checked={(scenario.program_elements || []).includes(a.asset_id)} onChange={() => toggleArr("program_elements", a.asset_id)} className="rounded" />
              <span>{a.name}</span>
              <span className="text-slate-500 ml-auto">{a.typical_footprint_sqft}sqft</span>
            </label>
          ))}
        </div>
      )}

      {/* Advanced Toggle */}
      <button onClick={() => setShowAdvanced(!showAdvanced)} className="w-full flex items-center gap-2 text-xs text-slate-400 hover:text-slate-200 py-1">
        {showAdvanced ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
        Advanced (Concessions, Enhancements, F&B Min)
      </button>
      {showAdvanced && (
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-[10px] text-slate-500 uppercase">F&B Minimum</label>
            <input type="number" className="w-full bg-slate-700/60 text-slate-200 rounded px-2 py-1.5 text-sm border border-slate-600/50" value={scenario.fnb_minimum_usd} onChange={e => set("fnb_minimum_usd", +e.target.value)} />
          </div>
          <div>
            <label className="text-[10px] text-slate-500 uppercase">Room Rental</label>
            <input type="number" className="w-full bg-slate-700/60 text-slate-200 rounded px-2 py-1.5 text-sm border border-slate-600/50" value={scenario.room_rental_usd} onChange={e => set("room_rental_usd", +e.target.value)} />
          </div>
          <div>
            <label className="text-[10px] text-slate-500 uppercase">Concession %</label>
            <input type="number" className="w-full bg-slate-700/60 text-slate-200 rounded px-2 py-1.5 text-sm border border-slate-600/50" value={scenario.concession_percent} onChange={e => set("concession_percent", +e.target.value)} />
          </div>
          <div>
            <label className="text-[10px] text-slate-500 uppercase">AV Package $</label>
            <input type="number" className="w-full bg-slate-700/60 text-slate-200 rounded px-2 py-1.5 text-sm border border-slate-600/50" value={scenario.av_package_usd} onChange={e => set("av_package_usd", +e.target.value)} />
          </div>
          <div className="flex items-center gap-2 col-span-2">
            <input type="checkbox" checked={scenario.is_outdoor} onChange={e => set("is_outdoor", e.target.checked)} className="rounded" />
            <label className="text-xs text-slate-300">Outdoor Event</label>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Result Panel ──────────────────────────────────────────────────
function ResultPanel({ result, color }: { result: any; color: string }) {
  if (!result) return null;
  const f = result.financials || {};
  const s = result.staffing_estimate || {};
  const rc = result.room_capacity || {};
  const m = result.margin_analysis || {};
  const va = result.vendor_analysis || {};
  const tp = result.throughput_analysis || {};

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2">
        <div className="bg-slate-800/60 rounded p-3 border border-slate-700/40">
          <div className="text-[10px] text-slate-500 uppercase">Net Total</div>
          <div className={cn("text-2xl font-bold", color)}>{fmtUsd(f.net_total)}</div>
          <div className="text-xs text-slate-400">{fmtUsd(f.total_pp)}/pp</div>
        </div>
        <div className="bg-slate-800/60 rounded p-3 border border-slate-700/40">
          <div className="text-[10px] text-slate-500 uppercase">Margin</div>
          <div className={cn("text-2xl font-bold", m.margin_healthy ? "text-emerald-400" : "text-rose-400")}>{fmtPct(m.est_margin_pct)}</div>
          <div className="text-xs text-slate-400">Target: {fmtPct(m.target_margin_pct)}</div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2 text-center">
        <div className="bg-slate-800/40 rounded p-2">
          <Users className="w-4 h-4 mx-auto text-blue-400 mb-1" />
          <div className="text-sm font-semibold text-slate-100">{s.total}</div>
          <div className="text-[10px] text-slate-500">Total Staff</div>
          <div className="text-[9px] text-slate-600">FOH {s.foh} | BOH {s.boh}</div>
        </div>
        <div className="bg-slate-800/40 rounded p-2">
          <Building2 className="w-4 h-4 mx-auto text-violet-400 mb-1" />
          <div className={cn("text-sm font-semibold", rc.guest_count_fits ? "text-emerald-300" : "text-rose-300")}>{rc.comfortable_capacity}</div>
          <div className="text-[10px] text-slate-500">Capacity</div>
        </div>
        <div className="bg-slate-800/40 rounded p-2">
          <Clock className="w-4 h-4 mx-auto text-orange-400 mb-1" />
          <div className={cn("text-sm font-semibold", tp.timeline_feasible ? "text-emerald-300" : "text-rose-300")}>{tp.est_clear_minutes || 0}m</div>
          <div className="text-[10px] text-slate-500">Clear Time</div>
        </div>
      </div>

      {/* Throughput Engine Details */}
      {tp.plates_to_clear > 0 && (
        <div data-testid="throughput-analysis" className="bg-slate-800/30 border border-slate-700/30 rounded-lg p-3">
          <div className="text-xs text-slate-400 mb-2 flex items-center gap-1"><Clock className="w-3 h-3" /> Throughput Analysis</div>
          <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
            <div className="flex justify-between"><span className="text-slate-500">Plates to clear</span><span className="text-slate-200">{tp.plates_to_clear}</span></div>
            <div className="flex justify-between"><span className="text-slate-500">Clearers available</span><span className="text-slate-200">{tp.available_clearers}</span></div>
            <div className="flex justify-between"><span className="text-slate-500">Rate/min</span><span className="text-slate-200">{tp.plate_clear_rate_per_min}/server</span></div>
            <div className="flex justify-between"><span className="text-slate-500">Distance factor</span><span className="text-slate-200">{tp.distance_multiplier}x</span></div>
            <div className="flex justify-between"><span className="text-slate-500">Dish pit racks</span><span className="text-slate-200">{tp.dish_pit_racks}</span></div>
            <div className="flex justify-between"><span className="text-slate-500">Dish pit time</span><span className="text-slate-200">{tp.dish_pit_time_minutes}m</span></div>
            <div className="flex justify-between col-span-2"><span className="text-slate-500">Course pacing total</span><span className="text-slate-200">{tp.total_course_pacing_minutes}min (salad+entree+dessert+coffee)</span></div>
          </div>
        </div>
      )}

      {/* Staffing Breakdown */}
      {s.captains > 0 && (
        <div className="bg-slate-800/30 border border-slate-700/30 rounded-lg p-3">
          <div className="text-xs text-slate-400 mb-2 flex items-center gap-1"><Users className="w-3 h-3" /> Staff Breakdown</div>
          <div className="grid grid-cols-3 gap-1 text-xs text-center">
            {[
              { label: "Servers", val: s.foh - (s.bartenders || 0) - (s.captains || 0) - (s.bussers || 0) - (s.station_staff || 0) },
              { label: "Captains", val: s.captains },
              { label: "Bussers", val: s.bussers },
              { label: "Bartenders", val: s.bartenders },
              { label: "Stations", val: s.station_staff },
              { label: "BOH", val: s.boh || result.staffing_estimate?.boh },
            ].filter(x => x.val > 0).map((item, i) => (
              <div key={i} className="bg-slate-800/50 rounded py-1">
                <div className="font-semibold text-slate-200">{item.val}</div>
                <div className="text-[9px] text-slate-500">{item.label}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Vendor Dependencies */}
      {va.dependency_triggers && va.dependency_triggers.length > 0 && (
        <div>
          <div className="text-xs text-slate-400 mb-1 flex items-center gap-1"><Zap className="w-3 h-3" /> Vendor Dependencies</div>
          <div className="space-y-1">
            {va.dependency_triggers.map((d: any, i: number) => (
              <div key={i} className={cn("text-xs rounded px-2 py-1 border",
                d.priority === "critical" ? "bg-rose-500/10 border-rose-500/30 text-rose-300" :
                d.priority === "high" ? "bg-orange-500/10 border-orange-500/30 text-orange-300" :
                "bg-slate-700/30 border-slate-600/30 text-slate-300"
              )}>
                <span className="font-semibold">{d.trigger}</span>
                <div className="text-[10px] opacity-70 mt-0.5">{d.requires.join(", ")}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Risk Flags */}
      {result.risk_flags && result.risk_flags.length > 0 && (
        <div>
          <div className="text-xs text-slate-400 mb-1 flex items-center gap-1"><ShieldAlert className="w-3 h-3" /> Risk Flags</div>
          <div className="space-y-1">
            {result.risk_flags.map((f: any, i: number) => <RiskBadge key={i} flag={f} />)}
          </div>
        </div>
      )}

      {/* Min Spend */}
      {result.minimum_spend && (
        <div className={cn("text-xs rounded px-3 py-2 border", result.minimum_spend.meets_minimum ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-300" : "bg-rose-500/10 border-rose-500/30 text-rose-300")}>
          {result.minimum_spend.meets_minimum ? <CheckCircle className="w-3 h-3 inline mr-1" /> : <AlertTriangle className="w-3 h-3 inline mr-1" />}
          F&B {fmtUsd(result.minimum_spend.fnb_actual)} / Min {fmtUsd(result.minimum_spend.fnb_minimum)}
          {!result.minimum_spend.meets_minimum && ` — Shortfall: ${fmtUsd(result.minimum_spend.shortfall)}`}
        </div>
      )}
    </div>
  );
}

// ─── Main Component ────────────────────────────────────────────────
export default function ScenarioPlanner() {
  const [scenarioA, setScenarioA] = useState({ ...DEFAULT_SCENARIO, name: "Scenario A" });
  const [scenarioB, setScenarioB] = useState({ ...DEFAULT_SCENARIO, name: "Scenario B", guest_count: 250, tier: "luxury", service_style: "stations" });
  const [resultA, setResultA] = useState<any>(null);
  const [resultB, setResultB] = useState<any>(null);
  const [deltas, setDeltas] = useState<any>(null);
  const [summary, setSummary] = useState("");
  const [loading, setLoading] = useState(false);
  const [rooms, setRooms] = useState<any[]>([]);
  const [styles, setStyles] = useState<any[]>([]);
  const [footprints, setFootprints] = useState<any[]>([]);
  const [vendorAssets, setVendorAssets] = useState<any[]>([]);
  const [packages, setPackages] = useState<any>(null);
  const [training, setTraining] = useState<any[]>([]);
  const [savedScenarios, setSavedScenarios] = useState<any[]>([]);
  const [tab, setTab] = useState<"compare" | "training" | "saved">("compare");

  // Load reference data
  useEffect(() => {
    api("/room-templates").then(d => setRooms(d.templates || []));
    api("/setup-styles").then(d => setStyles(d.styles || []));
    api("/footprints").then(d => setFootprints(d.footprints || []));
    api("/vendor-assets").then(d => setVendorAssets(d.assets || []));
    api("/packages").then(d => setPackages(d));
    api("/training").then(d => setTraining(d.training_scenarios || []));
    api("/scenarios").then(d => setSavedScenarios(d.scenarios || []));
  }, []);

  const runComparison = useCallback(async () => {
    setLoading(true);
    try {
      const resp = await api("/compare", {
        method: "POST",
        body: JSON.stringify({ scenario_a: scenarioA, scenario_b: scenarioB }),
      });
      setResultA(resp.scenario_a);
      setResultB(resp.scenario_b);
      setDeltas(resp.deltas);
      setSummary(resp.comparison_summary);
    } catch (e: any) {
      console.error(e);
    }
    setLoading(false);
  }, [scenarioA, scenarioB]);

  const loadTraining = (preset: any) => {
    setScenarioA({ ...DEFAULT_SCENARIO, ...preset, name: "Training Scenario" });
    setScenarioB({ ...DEFAULT_SCENARIO, name: "Your Variation" });
    setTab("compare");
  };

  return (
    <div data-testid="scenario-planner-panel" className="h-full flex flex-col bg-slate-900 text-slate-100">
      {/* Header */}
      <div className="flex-shrink-0 border-b border-slate-700/60 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold tracking-tight">What-If Scenario Planner</h1>
            <p className="text-sm text-slate-400 mt-0.5">Compare event scenarios side-by-side with full operational + financial projections</p>
          </div>
          <div className="flex gap-2">
            {[
              { id: "compare" as const, label: "Compare", icon: ArrowLeftRight },
              { id: "training" as const, label: "Training", icon: GraduationCap },
              { id: "saved" as const, label: "Saved", icon: BarChart3 },
            ].map(t => (
              <button key={t.id} data-testid={`tab-${t.id}`} onClick={() => setTab(t.id)}
                className={cn("flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm transition-colors",
                  tab === t.id ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/30" : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50")}>
                <t.icon className="w-3.5 h-3.5" />
                {t.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6">
        {tab === "compare" && (
          <div className="space-y-6">
            {/* Side-by-side forms */}
            <div className="grid grid-cols-2 gap-6">
              <div className="bg-slate-800/30 border border-cyan-500/20 rounded-xl p-4">
                <ScenarioForm scenario={scenarioA} onChange={setScenarioA} label="Scenario A" rooms={rooms} styles={styles} footprints={footprints} vendorAssets={vendorAssets} packages={packages} />
              </div>
              <div className="bg-slate-800/30 border border-amber-500/20 rounded-xl p-4">
                <ScenarioForm scenario={scenarioB} onChange={setScenarioB} label="Scenario B" rooms={rooms} styles={styles} footprints={footprints} vendorAssets={vendorAssets} packages={packages} />
              </div>
            </div>

            {/* Run Button */}
            <div className="flex justify-center">
              <button data-testid="run-comparison-btn" onClick={runComparison} disabled={loading}
                className="flex items-center gap-2 px-8 py-3 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-semibold rounded-xl shadow-lg shadow-cyan-500/20 disabled:opacity-50 transition-all">
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Play className="w-5 h-5" />}
                Run Comparison
              </button>
            </div>

            {/* Results */}
            {resultA && resultB && (
              <div className="space-y-4">
                {/* Summary */}
                {summary && (
                  <div data-testid="comparison-summary" className="bg-slate-800/60 border border-slate-700/50 rounded-xl p-4 text-center">
                    <div className="text-sm text-slate-300">{summary}</div>
                  </div>
                )}

                {/* Delta Grid */}
                {deltas && (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <MetricCard label="Net Total" valueA={resultA.financials?.net_total} valueB={resultB.financials?.net_total} delta={deltas.net_total} />
                    <MetricCard label="Per Person" valueA={resultA.financials?.total_pp} valueB={resultB.financials?.total_pp} delta={deltas.total_pp} />
                    <MetricCard label="F&B Total" valueA={resultA.financials?.fnb_total} valueB={resultB.financials?.fnb_total} delta={deltas.fnb_total} />
                    <MetricCard label="Staff" valueA={resultA.staffing_estimate?.total} valueB={resultB.staffing_estimate?.total} delta={deltas.total_staff} format="number" />
                    <MetricCard label="Margin" valueA={resultA.margin_analysis?.est_margin_pct} valueB={resultB.margin_analysis?.est_margin_pct} delta={deltas.margin_pct_pp} format="pct" />
                    <MetricCard label="Clear Time" valueA={`${resultA.throughput_analysis?.est_clear_minutes || 0}m`} valueB={`${resultB.throughput_analysis?.est_clear_minutes || 0}m`} delta={deltas.clear_time_delta} format="number" />
                    <MetricCard label="Dish Pit" valueA={`${resultA.throughput_analysis?.dish_pit_time_minutes || 0}m`} valueB={`${resultB.throughput_analysis?.dish_pit_time_minutes || 0}m`} delta={deltas.dish_pit_delta} format="number" />
                    <MetricCard label="Room Fit" valueA={resultA.room_capacity?.guest_count_fits ? "Fits" : "OVER"} valueB={resultB.room_capacity?.guest_count_fits ? "Fits" : "OVER"} />
                  </div>
                )}

                {/* Side-by-side results */}
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <div className="text-sm font-semibold text-cyan-300 mb-2 flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-cyan-400" /> {resultA.scenario_name}</div>
                    <ResultPanel result={resultA} color="text-cyan-300" />
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-amber-300 mb-2 flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-amber-400" /> {resultB.scenario_name}</div>
                    <ResultPanel result={resultB} color="text-amber-300" />
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {tab === "training" && (
          <div className="space-y-4">
            <div className="text-sm text-slate-400 mb-4">Pre-built training scenarios to learn cost structures, margin targets, and operational complexity.</div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {training.map(t => (
                <div key={t.training_id} data-testid={`training-${t.training_id}`} className="bg-slate-800/50 border border-slate-700/40 rounded-xl p-4 hover:border-cyan-500/30 transition-colors">
                  <div className="flex items-start justify-between mb-2">
                    <div className="text-sm font-semibold text-slate-100">{t.title}</div>
                    <span className={cn("text-[10px] px-2 py-0.5 rounded-full uppercase",
                      t.difficulty === "beginner" ? "bg-emerald-500/20 text-emerald-300" :
                      t.difficulty === "intermediate" ? "bg-amber-500/20 text-amber-300" :
                      "bg-rose-500/20 text-rose-300")}>{t.difficulty}</span>
                  </div>
                  <p className="text-xs text-slate-400 mb-3">{t.description}</p>
                  <div className="flex flex-wrap gap-1 mb-3">
                    {(t.learning_goals || []).map((g: string, i: number) => (
                      <span key={i} className="text-[10px] bg-slate-700/50 text-slate-300 rounded px-1.5 py-0.5">{g}</span>
                    ))}
                  </div>
                  <button onClick={() => loadTraining(t.preset)} className="w-full flex items-center justify-center gap-1 py-1.5 rounded-md bg-cyan-600/20 text-cyan-300 text-xs hover:bg-cyan-600/30 transition-colors">
                    <Play className="w-3 h-3" /> Load Scenario
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {tab === "saved" && (
          <div className="space-y-4">
            <div className="text-sm text-slate-400 mb-4">Previously built scenarios. Click to view details.</div>
            {savedScenarios.length === 0 ? (
              <div className="text-center py-12 text-slate-500">No saved scenarios yet. Run a comparison to save one.</div>
            ) : (
              <div className="space-y-2">
                {savedScenarios.map((s, i) => (
                  <div key={i} className="bg-slate-800/50 border border-slate-700/40 rounded-lg p-3 flex items-center justify-between">
                    <div>
                      <div className="text-sm font-semibold text-slate-200">{s.scenario_name}</div>
                      <div className="text-xs text-slate-400">{s.input?.event_type} | {s.input?.guest_count} guests | {s.input?.tier} | {s.created_at?.split("T")[0]}</div>
                    </div>
                    <div className="text-sm font-semibold text-emerald-400">{fmtUsd(s.financials?.net_total || 0)}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
