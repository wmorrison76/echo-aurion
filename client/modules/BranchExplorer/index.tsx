import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  GitBranch, Plus, Trash2, Play, ChevronRight, TrendingUp, TrendingDown,
  ArrowRight, AlertTriangle, Check, BarChart3, Users, Package, Settings,
  Briefcase, UtensilsCrossed, FileText, CircuitBoard, Minus, ChevronDown
} from "lucide-react";

const API = window.location.origin;

const BG = "#04060d";
const SURFACE = "#0a0d17";
const SURFACE_EL = "#121624";
const GOLD = "#c8a97e";
const GOLD_M = "rgba(200,169,126,0.2)";
const GREEN = "#34d399";
const RED = "#ef4444";
const AMBER = "#fbbf24";
const BORDER = "rgba(200,169,126,0.15)";
const BORDER_F = "rgba(200,169,126,0.5)";
const TXT = "#ffffff";
const TXT2 = "#a1a1aa";
const TXT3 = "#71717a";
const MONO: React.CSSProperties = { fontFamily: "'IBM Plex Mono', 'JetBrains Mono', monospace" };

interface ScenarioStep {
  scenario_type: string;
  parameters: Record<string, any>;
  label: string;
}

interface BranchNode {
  step: number;
  label: string;
  scenario_type: string;
  step_deltas: Record<string, number>;
  cumulative_state: Record<string, number>;
  operational_impact?: Record<string, any>;
}

interface BranchResult {
  branch_id: string;
  name: string;
  nodes: BranchNode[];
  summary: {
    total_steps: number;
    baseline: Record<string, number>;
    final_state: Record<string, number>;
    cumulative_deltas: Record<string, number>;
    ebitda_change_pct: number;
    verdict: string;
  };
  narrative: string;
}

const SCENARIO_OPTIONS = [
  { type: "banquet_change", label: "Banquet Cover Change", icon: Users, color: "#a78bfa",
    fields: [
      { key: "cover_delta", label: "Cover Change (+/-)", type: "number", default: 50 },
      { key: "meal_type", label: "Meal Type", type: "select", options: ["plated_dinner", "buffet_dinner", "plated_lunch", "buffet_lunch", "reception", "breakfast"], default: "plated_dinner" },
    ]
  },
  { type: "labor_adjustment", label: "Labor Adjustment", icon: Briefcase, color: "#60a5fa",
    fields: [
      { key: "headcount_delta", label: "Headcount Change (+/-)", type: "number", default: 2 },
      { key: "department", label: "Department", type: "select", options: ["kitchen", "front_of_house", "bar", "banquets", "stewarding", "management"], default: "kitchen" },
      { key: "shift_type", label: "Shift Type", type: "select", options: ["full_time", "part_time", "overtime"], default: "full_time" },
      { key: "period_days", label: "Period (days)", type: "number", default: 30 },
    ]
  },
  { type: "menu_price_change", label: "Menu Price Change", icon: UtensilsCrossed, color: "#f87171",
    fields: [
      { key: "price_change_pct", label: "Price Change %", type: "number", default: 5 },
      { key: "item_category", label: "Category", type: "select", options: ["entrees", "appetizers", "desserts", "beverages", "sides", "specials"], default: "entrees" },
      { key: "demand_elasticity", label: "Demand Elasticity", type: "number", default: -0.3 },
    ]
  },
  { type: "vendor_substitution", label: "Vendor Substitution", icon: FileText, color: "#22d3ee",
    fields: [
      { key: "cost_change_pct", label: "Cost Change %", type: "number", default: -10 },
      { key: "ingredient_category", label: "Category", type: "select", options: ["proteins", "produce", "dairy", "dry_goods", "seafood", "bakery"], default: "proteins" },
      { key: "quality_impact", label: "Quality Impact", type: "select", options: ["positive", "neutral", "negative"], default: "neutral" },
    ]
  },
  { type: "occupancy_shift", label: "Occupancy Change", icon: BarChart3, color: "#34d399",
    fields: [
      { key: "occupancy_delta_pct", label: "Occupancy Change %", type: "number", default: 10 },
      { key: "capture_rate", label: "F&B Capture Rate", type: "number", default: 0.65 },
      { key: "period_days", label: "Period (days)", type: "number", default: 30 },
    ]
  },
  { type: "overtime_cap", label: "Overtime Cap", icon: Settings, color: "#fbbf24",
    fields: [
      { key: "max_weekly_ot_hours", label: "Max Weekly OT Hours", type: "number", default: 10 },
    ]
  },
];

function fmt$(v: number) { return v >= 0 ? `+$${v.toLocaleString(undefined, {minimumFractionDigits: 0, maximumFractionDigits: 0})}` : `-$${Math.abs(v).toLocaleString(undefined, {minimumFractionDigits: 0, maximumFractionDigits: 0})}`; }

/* ─── Step Editor ─── */
function StepEditor({ step, index, onUpdate, onRemove }: {
  step: ScenarioStep; index: number; onUpdate: (s: ScenarioStep) => void; onRemove: () => void;
}) {
  const scenarioConfig = SCENARIO_OPTIONS.find(s => s.type === step.scenario_type);
  const Icon = scenarioConfig?.icon || Settings;
  const color = scenarioConfig?.color || TXT3;

  return (
    <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }}
      className="rounded-sm overflow-hidden" style={{ background: SURFACE, border: `1px solid ${BORDER}` }}
      data-testid={`branch-step-${index}`}>
      <div className="flex items-center gap-3 px-3 py-2" style={{ borderBottom: `1px solid ${BORDER}` }}>
        <div className="w-6 h-6 rounded-sm flex items-center justify-center" style={{ background: `${color}15`, border: `1px solid ${color}30` }}>
          <Icon className="w-3 h-3" style={{ color }} />
        </div>
        <span className="text-[10px] uppercase tracking-[0.15em] font-semibold" style={{ ...MONO, color }}>{index + 1}</span>
        <select value={step.scenario_type}
          onChange={(e) => {
            const newConfig = SCENARIO_OPTIONS.find(s => s.type === e.target.value);
            const newParams: Record<string, any> = {};
            newConfig?.fields.forEach(f => { newParams[f.key] = f.default; });
            onUpdate({ ...step, scenario_type: e.target.value, label: newConfig?.label || e.target.value, parameters: newParams });
          }}
          className="flex-1 bg-transparent text-[11px] outline-none px-2 py-1 rounded-sm"
          style={{ color: TXT, border: `1px solid ${BORDER}`, ...MONO }}
          data-testid={`step-type-${index}`}>
          {SCENARIO_OPTIONS.map(o => <option key={o.type} value={o.type} style={{ background: SURFACE }}>{o.label}</option>)}
        </select>
        <button onClick={onRemove} className="p-1 hover:bg-white/5 transition-colors" data-testid={`remove-step-${index}`}>
          <Trash2 className="w-3 h-3" style={{ color: TXT3 }} />
        </button>
      </div>
      {/* Parameter Fields */}
      <div className="px-3 py-2 grid grid-cols-2 gap-2">
        {scenarioConfig?.fields.map(f => (
          <div key={f.key}>
            <label className="text-[8px] uppercase tracking-[0.2em] block mb-0.5" style={{ ...MONO, color: TXT3 }}>{f.label}</label>
            {f.type === "select" ? (
              <select value={step.parameters[f.key] ?? f.default}
                onChange={(e) => onUpdate({ ...step, parameters: { ...step.parameters, [f.key]: e.target.value } })}
                className="w-full bg-transparent text-[10px] px-2 py-1 outline-none rounded-sm"
                style={{ color: TXT, border: `1px solid ${BORDER}`, ...MONO }}>
                {(f.options || []).map((o: string) => <option key={o} value={o} style={{ background: SURFACE }}>{o.replace(/_/g, " ")}</option>)}
              </select>
            ) : (
              <input type="number" value={step.parameters[f.key] ?? f.default}
                onChange={(e) => onUpdate({ ...step, parameters: { ...step.parameters, [f.key]: parseFloat(e.target.value) || 0 } })}
                className="w-full bg-transparent text-[10px] px-2 py-1 outline-none rounded-sm"
                style={{ color: TXT, border: `1px solid ${BORDER}`, ...MONO }} />
            )}
          </div>
        ))}
      </div>
    </motion.div>
  );
}

/* ─── Result Node ─── */
function ResultNode({ node, isLast }: { node: BranchNode; isLast: boolean }) {
  const [expanded, setExpanded] = useState(false);
  const config = SCENARIO_OPTIONS.find(s => s.type === node.scenario_type);
  const color = config?.color || TXT3;
  const Icon = config?.icon || Settings;

  const deltas = node.step_deltas || {};
  const mainDelta = deltas.revenue || deltas.ebitda || deltas.labor_cost || 0;
  const isPositive = (deltas.revenue || 0) >= 0 && (deltas.ebitda || 0) >= 0;

  return (
    <div className="relative" data-testid={`result-node-${node.step}`}>
      {/* Connector line */}
      {!isLast && (
        <div className="absolute left-5 top-full w-px h-3" style={{ background: BORDER }} />
      )}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
        transition={{ delay: node.step * 0.15 }}
        className="rounded-sm overflow-hidden" style={{ background: SURFACE, border: `1px solid ${color}25` }}>
        <div className="flex items-center gap-2.5 px-3 py-2 cursor-pointer" onClick={() => setExpanded(!expanded)}
          style={{ borderBottom: expanded ? `1px solid ${BORDER}` : "none" }}>
          <div className="w-5 h-5 rounded-sm flex items-center justify-center" style={{ background: `${color}15` }}>
            <Icon className="w-2.5 h-2.5" style={{ color }} />
          </div>
          <span className="text-[9px] font-bold" style={{ ...MONO, color }}>{node.step}</span>
          <span className="text-[10px] flex-1" style={{ color: TXT2 }}>{node.label}</span>
          {mainDelta !== 0 && (
            <div className="flex items-center gap-1">
              {isPositive ? <TrendingUp className="w-3 h-3" style={{ color: GREEN }} /> : <TrendingDown className="w-3 h-3" style={{ color: RED }} />}
              <span className="text-[9px] font-semibold" style={{ ...MONO, color: isPositive ? GREEN : RED }}>
                {deltas.revenue ? fmt$(deltas.revenue) : ""} {deltas.ebitda ? `EBITDA ${fmt$(deltas.ebitda)}` : ""}
              </span>
            </div>
          )}
          <ChevronDown className={`w-3 h-3 transition-transform ${expanded ? "" : "-rotate-90"}`} style={{ color: TXT3 }} />
        </div>
        {expanded && (
          <div className="px-3 py-2">
            <div className="grid grid-cols-4 gap-2 mb-2">
              {Object.entries(node.cumulative_state || {}).filter(([k]) => ["revenue", "food_cost", "labor_cost", "ebitda"].includes(k)).map(([k, v]) => (
                <div key={k} className="px-2 py-1.5 text-center rounded-sm" style={{ background: `rgba(255,255,255,0.02)`, border: `1px solid rgba(255,255,255,0.04)` }}>
                  <div className="text-[7px] uppercase tracking-[0.15em]" style={{ ...MONO, color: TXT3 }}>{k.replace(/_/g, " ")}</div>
                  <div className="text-[11px] font-semibold" style={{ ...MONO, color: TXT }}>${(v as number).toLocaleString(undefined, { maximumFractionDigits: 0 })}</div>
                  {deltas[k] !== undefined && (
                    <div className="text-[8px]" style={{ ...MONO, color: deltas[k] >= 0 ? GREEN : RED }}>{fmt$(deltas[k])}</div>
                  )}
                </div>
              ))}
            </div>
            {node.cumulative_state?.food_cost_pct !== undefined && (
              <div className="flex items-center gap-3 text-[8px]" style={MONO}>
                <span style={{ color: TXT3 }}>Food: <span style={{ color: node.cumulative_state.food_cost_pct > 22 ? RED : GREEN }}>{node.cumulative_state.food_cost_pct}%</span></span>
                <span style={{ color: TXT3 }}>Labor: <span style={{ color: node.cumulative_state.labor_pct > 32 ? RED : GREEN }}>{node.cumulative_state.labor_pct}%</span></span>
                <span style={{ color: TXT3 }}>Covers: {node.cumulative_state.total_covers?.toLocaleString()}</span>
              </div>
            )}
          </div>
        )}
      </motion.div>
    </div>
  );
}

/* ─── Main Branch Explorer ─── */
export default function BranchExplorer() {
  const [steps, setSteps] = useState<ScenarioStep[]>([]);
  const [branchName, setBranchName] = useState("");
  const [result, setResult] = useState<BranchResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState<any[]>([]);
  const [showHistory, setShowHistory] = useState(false);

  useEffect(() => {
    fetch(`${API}/api/echoai3/simulation/branches`).then(r => r.json()).then(d => setHistory(d.branches || [])).catch(() => {});
  }, [result]);

  const addStep = () => {
    const defaults = SCENARIO_OPTIONS[0];
    const params: Record<string, any> = {};
    defaults.fields.forEach(f => { params[f.key] = f.default; });
    setSteps([...steps, { scenario_type: defaults.type, parameters: params, label: defaults.label }]);
  };

  const updateStep = (i: number, s: ScenarioStep) => {
    const copy = [...steps]; copy[i] = s; setSteps(copy);
  };

  const removeStep = (i: number) => setSteps(steps.filter((_, idx) => idx !== i));

  const runBranch = async () => {
    if (steps.length === 0) return;
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch(`${API}/api/echoai3/simulation/branch`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ steps, name: branchName || undefined }),
      }).then(r => r.json());
      setResult(res);
    } catch { /* noop */ }
    setLoading(false);
  };

  const loadBranch = async (bid: string) => {
    try {
      const res = await fetch(`${API}/api/echoai3/simulation/branch/${bid}`).then(r => r.json());
      if (res.branch_id) setResult(res);
      setShowHistory(false);
    } catch { /* noop */ }
  };

  return (
    <div className="flex h-full overflow-hidden" style={{ background: BG, color: TXT }} data-testid="branch-explorer">
      {/* Left: Step Builder */}
      <div className="w-[340px] flex flex-col shrink-0" style={{ borderRight: `1px solid ${BORDER}` }}>
        {/* Header */}
        <div className="flex items-center gap-2 px-4 py-3" style={{ borderBottom: `1px solid ${BORDER}` }}>
          <GitBranch className="w-4 h-4" style={{ color: GOLD }} />
          <div>
            <div className="text-[12px] font-semibold tracking-tight" style={{ color: TXT }}>Scenario Branch Explorer</div>
            <div className="text-[8px] uppercase tracking-[0.2em]" style={{ ...MONO, color: TXT3 }}>Multi-Step Decision Analysis</div>
          </div>
        </div>

        {/* Branch Name */}
        <div className="px-3 pt-3 pb-2">
          <input value={branchName} onChange={e => setBranchName(e.target.value)}
            placeholder="Branch name (optional)..."
            className="w-full bg-transparent text-[11px] px-2 py-1.5 outline-none rounded-sm"
            style={{ color: TXT, border: `1px solid ${BORDER}`, ...MONO }}
            data-testid="branch-name-input" />
        </div>

        {/* Steps List */}
        <div className="flex-1 overflow-y-auto px-3 space-y-2 pb-3" style={{ scrollbarWidth: "thin", scrollbarColor: `${BORDER} transparent` }}>
          <AnimatePresence>
            {steps.map((s, i) => (
              <React.Fragment key={i}>
                <StepEditor step={s} index={i} onUpdate={(u) => updateStep(i, u)} onRemove={() => removeStep(i)} />
                {i < steps.length - 1 && (
                  <div className="flex justify-center">
                    <div className="flex items-center gap-1">
                      <div className="w-px h-2" style={{ background: GOLD }} />
                      <ArrowRight className="w-3 h-3" style={{ color: GOLD, opacity: 0.4 }} />
                      <div className="w-px h-2" style={{ background: GOLD }} />
                    </div>
                  </div>
                )}
              </React.Fragment>
            ))}
          </AnimatePresence>

          {steps.length === 0 && (
            <div className="flex flex-col items-center justify-center py-8">
              <GitBranch className="w-8 h-8 mb-2" style={{ color: TXT3, opacity: 0.2 }} />
              <p className="text-[10px] text-center" style={{ ...MONO, color: TXT3 }}>Add scenario steps to build<br/>a decision tree</p>
            </div>
          )}
        </div>

        {/* Action Bar */}
        <div className="px-3 py-2 space-y-1.5" style={{ borderTop: `1px solid ${BORDER}` }}>
          <button onClick={addStep} className="w-full flex items-center justify-center gap-2 px-3 py-2 transition-all hover:brightness-110 rounded-sm"
            style={{ background: `rgba(255,255,255,0.03)`, border: `1px solid ${BORDER}`, color: TXT2 }}
            data-testid="add-step-btn">
            <Plus className="w-3 h-3" />
            <span className="text-[10px] uppercase tracking-[0.15em]" style={MONO}>Add Scenario Step</span>
          </button>
          <button onClick={runBranch} disabled={steps.length === 0 || loading}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 transition-all hover:brightness-110 rounded-sm"
            style={{ background: steps.length > 0 ? GOLD_M : "rgba(255,255,255,0.02)", border: `1px solid ${steps.length > 0 ? GOLD : BORDER}`, color: steps.length > 0 ? GOLD : TXT3, opacity: loading ? 0.5 : 1 }}
            data-testid="run-branch-btn">
            <Play className="w-3.5 h-3.5" />
            <span className="text-[10px] uppercase tracking-[0.15em] font-semibold" style={MONO}>
              {loading ? "Analyzing..." : `Execute ${steps.length} Step${steps.length !== 1 ? "s" : ""}`}
            </span>
          </button>
          <button onClick={() => setShowHistory(!showHistory)}
            className="w-full text-[9px] uppercase tracking-[0.15em] text-center py-1 hover:bg-white/5 transition-colors"
            style={{ ...MONO, color: TXT3 }}
            data-testid="branch-history-btn">
            {history.length} Previous Branches
          </button>
        </div>

        {/* History Drawer */}
        {showHistory && history.length > 0 && (
          <div className="px-3 pb-2 space-y-1 max-h-40 overflow-y-auto" style={{ borderTop: `1px solid ${BORDER}` }}>
            {history.map(h => (
              <button key={h.branch_id} onClick={() => loadBranch(h.branch_id)}
                className="w-full text-left px-2 py-1.5 hover:bg-white/5 transition-colors rounded-sm"
                style={{ border: `1px solid ${BORDER}` }}>
                <div className="text-[10px] truncate" style={{ color: TXT2 }}>{h.name}</div>
                <div className="flex items-center gap-2 text-[8px]" style={MONO}>
                  <span style={{ color: h.summary?.verdict === "FAVORABLE" ? GREEN : h.summary?.verdict === "UNFAVORABLE" ? RED : TXT3 }}>
                    {h.summary?.verdict}
                  </span>
                  <span style={{ color: TXT3 }}>{h.summary?.total_steps} steps</span>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Right: Results */}
      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto" style={{ scrollbarWidth: "thin", scrollbarColor: `${BORDER} transparent` }}>
        {!result ? (
          <div className="flex-1 flex flex-col items-center justify-center px-8">
            <motion.div className="w-16 h-16 rounded-sm flex items-center justify-center mb-4"
              style={{ background: `linear-gradient(135deg, ${SURFACE}, ${SURFACE_EL})`, border: `1px solid ${BORDER}` }}
              animate={{ boxShadow: [`0 0 0px ${GOLD_M}`, `0 0 20px ${GOLD_M}`, `0 0 0px ${GOLD_M}`] }}
              transition={{ duration: 4, repeat: Infinity }}>
              <GitBranch className="w-7 h-7" style={{ color: GOLD, opacity: 0.5 }} />
            </motion.div>
            <p className="text-[12px] font-light mb-1" style={{ color: TXT }}>Decision Tree Analysis</p>
            <p className="text-[9px] uppercase tracking-[0.2em] text-center max-w-xs" style={{ ...MONO, color: TXT3 }}>
              Chain multiple scenarios to see compounding impacts across revenue, costs, labor, and EBITDA
            </p>
          </div>
        ) : (
          <div className="p-4 space-y-3">
            {/* Summary Header */}
            <div className="rounded-sm overflow-hidden" style={{ background: SURFACE, border: `1px solid ${BORDER}` }}>
              <div className="flex items-center gap-3 px-4 py-3" style={{ borderBottom: `1px solid ${BORDER}` }}>
                <CircuitBoard className="w-4 h-4" style={{ color: GOLD }} />
                <div className="flex-1">
                  <div className="text-[12px] font-semibold" style={{ color: TXT }}>{result.name}</div>
                  <div className="text-[8px] uppercase tracking-[0.2em]" style={{ ...MONO, color: TXT3 }}>
                    {result.summary.total_steps} steps analyzed
                  </div>
                </div>
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-sm" style={{
                  background: result.summary.verdict === "FAVORABLE" ? "rgba(52,211,153,0.06)" : result.summary.verdict === "UNFAVORABLE" ? "rgba(239,68,68,0.06)" : "rgba(255,255,255,0.03)",
                  border: `1px solid ${result.summary.verdict === "FAVORABLE" ? GREEN : result.summary.verdict === "UNFAVORABLE" ? RED : BORDER}30`,
                }}>
                  {result.summary.verdict === "FAVORABLE" ? <TrendingUp className="w-3.5 h-3.5" style={{ color: GREEN }} /> : <TrendingDown className="w-3.5 h-3.5" style={{ color: RED }} />}
                  <span className="text-[10px] font-bold uppercase tracking-[0.1em]" style={{ ...MONO, color: result.summary.verdict === "FAVORABLE" ? GREEN : RED }}>
                    {result.summary.verdict} ({result.summary.ebitda_change_pct > 0 ? "+" : ""}{result.summary.ebitda_change_pct}%)
                  </span>
                </div>
              </div>

              {/* Cumulative Impact Grid */}
              <div className="px-4 py-3">
                <div className="grid grid-cols-5 gap-2">
                  {[
                    { label: "Revenue", key: "revenue", baseline: result.summary.baseline.revenue, final: result.summary.final_state.revenue, delta: result.summary.cumulative_deltas.revenue },
                    { label: "Food Cost", key: "food_cost", baseline: result.summary.baseline.food_cost, final: result.summary.final_state.food_cost, delta: result.summary.cumulative_deltas.food_cost },
                    { label: "Labor", key: "labor_cost", baseline: result.summary.baseline.labor_cost, final: result.summary.final_state.labor_cost, delta: result.summary.cumulative_deltas.labor_cost },
                    { label: "EBITDA", key: "ebitda", baseline: result.summary.baseline.ebitda, final: result.summary.final_state.ebitda, delta: result.summary.cumulative_deltas.ebitda },
                    { label: "Covers", key: "total_covers", baseline: result.summary.baseline.total_covers, final: result.summary.final_state.total_covers, delta: result.summary.cumulative_deltas.total_covers },
                  ].map(m => {
                    const isMoney = m.key !== "total_covers";
                    const deltaColor = m.key === "food_cost" || m.key === "labor_cost"
                      ? (m.delta <= 0 ? GREEN : RED)
                      : (m.delta >= 0 ? GREEN : RED);
                    return (
                      <div key={m.key} className="px-2.5 py-2 text-center rounded-sm" style={{ background: "rgba(255,255,255,0.02)", border: `1px solid rgba(255,255,255,0.04)` }}>
                        <div className="text-[7px] uppercase tracking-[0.2em] mb-1" style={{ ...MONO, color: TXT3 }}>{m.label}</div>
                        <div className="text-[13px] font-semibold" style={{ ...MONO, color: TXT }}>
                          {isMoney ? `$${Math.round(m.final).toLocaleString()}` : Math.round(m.final).toLocaleString()}
                        </div>
                        <div className="text-[8px] mt-0.5" style={{ ...MONO, color: deltaColor }}>
                          {m.delta >= 0 ? "+" : ""}{isMoney ? `$${Math.round(m.delta).toLocaleString()}` : Math.round(m.delta).toLocaleString()}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* AI Narrative */}
            {result.narrative && (
              <div className="rounded-sm px-4 py-3" style={{ background: SURFACE, border: `1px solid ${BORDER}` }}>
                <div className="text-[8px] uppercase tracking-[0.2em] mb-1.5" style={{ ...MONO, color: GOLD }}>AI Analysis</div>
                <p className="text-[11px] leading-relaxed" style={{ color: TXT2 }}>{result.narrative}</p>
              </div>
            )}

            {/* Decision Tree Nodes */}
            <div>
              <div className="text-[8px] uppercase tracking-[0.25em] mb-2 px-1" style={{ ...MONO, color: TXT3 }}>Decision Path</div>
              {/* Baseline node */}
              <div className="relative mb-3">
                <div className="rounded-sm px-3 py-2 flex items-center gap-2" style={{ background: `${GOLD}08`, border: `1px solid ${GOLD}20` }}>
                  <div className="w-2 h-2 rounded-full" style={{ background: GOLD }} />
                  <span className="text-[10px] font-semibold" style={{ ...MONO, color: GOLD }}>BASELINE</span>
                  <span className="text-[9px] ml-auto" style={{ ...MONO, color: TXT3 }}>
                    Rev ${Math.round(result.summary.baseline.revenue).toLocaleString()} | EBITDA ${Math.round(result.summary.baseline.ebitda).toLocaleString()}
                  </span>
                </div>
                <div className="absolute left-5 top-full w-px h-3" style={{ background: BORDER }} />
              </div>
              {/* Step Nodes */}
              <div className="space-y-3 pl-0">
                {result.nodes.map((node, i) => (
                  <ResultNode key={node.step} node={node} isLast={i === result.nodes.length - 1} />
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
