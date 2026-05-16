import "@fontsource/ibm-plex-sans/400.css";
import "@fontsource/ibm-plex-sans/500.css";
import "@fontsource/ibm-plex-sans/600.css";
import "@fontsource/ibm-plex-mono/400.css";
import React, { useState, useEffect, useCallback } from "react";
import {
  TrendingUp, TrendingDown, AlertTriangle, Activity, BarChart3,
  ChevronRight, RefreshCw, Gauge, Target, Shield, Zap, Brain,
  ArrowUpRight, ArrowDownRight, Clock, DollarSign, Users,
  Layers, CircleDot, ChevronDown, FileText, Calculator,
  Calendar, Package, Sparkles, SlidersHorizontal, PieChart,
  Wallet, Building2, Wine, UtensilsCrossed, Plus, Check,
  TrendingDown as TDown, ChevronUp
} from "lucide-react";
import { cn } from "@/lib/utils";

const API = window.location.origin;
const S = (path: string) => fetch(`${API}/api/echo-stratus${path}`).then(r => r.json());
const SP = (path: string, body: any) => fetch(`${API}/api/echo-stratus${path}`, {
  method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body)
}).then(r => r.json());

type View = "executive" | "forecast" | "scenarios" | "signals" | "recommendations" | "portfolio" | "risk" | "budget" | "capex" | "activations" | "ask" | "projects" | "aurum" | "integrations" | "review";

const FONT = { fontFamily: "'IBM Plex Sans', system-ui, sans-serif" };
const MONO = { fontFamily: "'IBM Plex Mono', monospace" };
const BG = "#04060d";
const SURFACE = "rgba(255,255,255,0.025)";
const BORDER = "rgba(255,255,255,0.06)";
const ACCENT = "#c8a97e"; // Warm brass/gold
const ACCENT_DIM = "rgba(200,169,126,0.12)";

export default function EchoStratusPanel() {
  const [view, setView] = useState<View>("executive");

  return (
    <div className="flex flex-col h-full overflow-hidden" style={{ ...FONT, background: BG, color: "#e2e8f0" }}
      data-testid="echo-stratus-panel">
      <TopBar view={view} onViewChange={setView} />
      <div className="flex-1 overflow-y-auto" style={{ scrollbarWidth: "thin", scrollbarColor: `${BORDER} transparent` }}>
        {view === "executive" && <ExecutiveView />}
        {view === "forecast" && <ForecastView />}
        {view === "scenarios" && <ScenarioView />}
        {view === "signals" && <SignalView />}
        {view === "recommendations" && <RecommendationView />}
        {view === "portfolio" && <PortfolioView />}
        {view === "risk" && <RiskView />}
        {view === "budget" && <BudgetView />}
        {view === "capex" && <CapexView />}
        {view === "activations" && <ActivationsView />}
        {view === "ask" && <AskView />}
        {view === "projects" && <ProjectView />}
        {view === "aurum" && <AurumView />}
        {view === "integrations" && <IntegrationsView />}
        {view === "review" && <MonthlyReviewView />}
      </div>
    </div>
  );
}

const NAV_ITEMS: { id: View; label: string; icon: any }[] = [
  { id: "executive", label: "Executive", icon: Gauge },
  { id: "ask", label: "Ask", icon: Brain },
  { id: "budget", label: "Budget", icon: Wallet },
  { id: "aurum", label: "Actuals", icon: PieChart },
  { id: "review", label: "Review", icon: FileText },
  { id: "forecast", label: "Forecast", icon: TrendingUp },
  { id: "scenarios", label: "What-If", icon: SlidersHorizontal },
  { id: "projects", label: "Projects", icon: Building2 },
  { id: "capex", label: "CapEx", icon: Calculator },
  { id: "activations", label: "Events", icon: Sparkles },
  { id: "signals", label: "Signals", icon: Zap },
  { id: "recommendations", label: "Actions", icon: Target },
  { id: "portfolio", label: "Portfolio", icon: BarChart3 },
  { id: "risk", label: "Risk", icon: Shield },
  { id: "integrations", label: "POS/GL", icon: Layers },
];

function TopBar({ view, onViewChange }: { view: View; onViewChange: (v: View) => void }) {
  return (
    <div style={{ borderBottom: `1px solid ${BORDER}` }}>
      <div className="flex items-center gap-4 px-6 py-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-md flex items-center justify-center"
            style={{ background: ACCENT_DIM, border: `1px solid rgba(200,169,126,0.25)` }}>
            <Brain className="w-4 h-4" style={{ color: ACCENT }} />
          </div>
          <div>
            <div className="text-[13px] font-semibold tracking-wide text-white" style={FONT}>ECHOSTRATUS</div>
            <div className="text-[9px] tracking-[0.2em] uppercase" style={{ ...MONO, color: "rgba(200,169,126,0.6)" }}>
              Predictive Intelligence
            </div>
          </div>
        </div>
        <div className="flex-1" />
        <div className="flex items-center gap-0.5 p-0.5 rounded-lg" style={{ background: SURFACE, border: `1px solid ${BORDER}` }}>
          {NAV_ITEMS.map(n => (
            <button key={n.id} data-testid={`nav-${n.id}`}
              onClick={() => onViewChange(n.id)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[11px] font-medium transition-all"
              style={{
                ...FONT,
                background: view === n.id ? ACCENT_DIM : "transparent",
                color: view === n.id ? ACCENT : "rgba(148,163,184,0.7)",
                border: view === n.id ? `1px solid rgba(200,169,126,0.2)` : "1px solid transparent",
              }}>
              <n.icon className="w-3 h-3" />
              {n.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ─── Executive Dashboard ──────────────────────── */

function ExecutiveView() {
  const [data, setData] = useState<any>(null);
  const [narrative, setNarrative] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [narrativeLoading, setNarrativeLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    setNarrativeLoading(true);
    // Load dashboard data first (fast), narrative separately (slow LLM call)
    S("/executive/dashboard")
      .then(d => { setData(d); setLoading(false); })
      .catch(e => { console.error(e); setLoading(false); });
    SP("/executive/narrative", {})
      .then(n => { setNarrative(n); setNarrativeLoading(false); })
      .catch(e => { console.error(e); setNarrativeLoading(false); });
  }, []);

  if (loading || !data) return <Loading />;
  const k = data.kpis;
  const p = data.projections;
  const c = data.confidence;

  return (
    <div className="p-6 space-y-6" data-testid="executive-dashboard">
      <div className="flex items-center justify-between">
        <SectionLabel label="Executive Overview" />
        <div className="flex items-center gap-2">
          <button onClick={() => {
            const url = `${window.location.origin}/api/echo-stratus/report/executive-pdf`;
            window.open(url, '_blank');
          }} data-testid="export-pdf-btn"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded text-[10px] transition-all hover:scale-[1.02]"
            style={{ ...MONO, background: "rgba(200,169,126,0.08)", color: ACCENT, border: `1px solid rgba(200,169,126,0.15)` }}>
            <FileText className="w-3 h-3" /> Board Report
          </button>
          <ConfidenceBadge confidence={c.forecast} sources={c.data_sources_active} />
        </div>
      </div>

      {/* Primary KPIs */}
      <div className="grid grid-cols-5 gap-3">
        <KPICard label="Revenue" value={fmt$(k.revenue.value)} delta="+2.1%" positive />
        <KPICard label="EBITDA" value={fmt$(k.ebitda.value)} delta={`${k.margin.value}% margin`} positive={k.margin.value >= 20} />
        <KPICard label="Food Cost" value={`${k.food_cost_pct.value}%`} delta="Target: 14-18%" positive={k.food_cost_pct.value <= 18 && k.food_cost_pct.value >= 14} />
        <KPICard label="Labor" value={`${k.labor_pct.value}%`} delta="Target: <30%" positive={k.labor_pct.value <= 30} />
        <KPICard label="Pipeline" value={fmt$(k.pipeline_value.value)} delta={`${data.pipeline.confirmed} confirmed`} positive />
      </div>

      {/* Projections + Seasonality */}
      <div className="grid grid-cols-3 gap-3">
        <div className="col-span-2 rounded-lg p-4" style={{ background: SURFACE, border: `1px solid ${BORDER}` }}>
          <div className="text-[10px] uppercase tracking-widest mb-3" style={{ ...MONO, color: "rgba(200,169,126,0.5)" }}>
            30-Day Projection
          </div>
          <div className="grid grid-cols-4 gap-4">
            <MiniKPI label="Revenue" value={fmt$(p["30d_revenue"])} />
            <MiniKPI label="Cost" value={fmt$(p["30d_cost"])} />
            <MiniKPI label="EBITDA" value={fmt$(p["30d_ebitda"])} />
            <MiniKPI label="Margin" value={`${p["30d_margin"]}%`} />
          </div>
          <div className="flex items-center gap-3 mt-3 pt-3" style={{ borderTop: `1px solid ${BORDER}` }}>
            <div className="text-[10px]" style={{ ...MONO, color: "rgba(148,163,184,0.5)" }}>Seasonality</div>
            <SeasonBar current={p.seasonality_current} next={p.seasonality_next} />
            <div className="text-[10px]" style={{ ...MONO, color: p.seasonality_trend === "rising" ? "#10b981" : p.seasonality_trend === "falling" ? "#ef4444" : "#94a3b8" }}>
              {p.seasonality_trend === "rising" ? "Ascending" : p.seasonality_trend === "falling" ? "Declining" : "Stable"}
            </div>
          </div>
        </div>
        <div className="rounded-lg p-4" style={{ background: SURFACE, border: `1px solid ${BORDER}` }}>
          <div className="text-[10px] uppercase tracking-widest mb-3" style={{ ...MONO, color: "rgba(200,169,126,0.5)" }}>
            Cost Structure
          </div>
          <div className="space-y-2">
            {Object.entries(data.cost_structure).filter(([k]) => k !== "total").map(([key, val]: any) => (
              <div key={key} className="flex justify-between items-center text-[11px]">
                <span style={{ color: "rgba(148,163,184,0.6)" }}>{key.replace("_", " ").replace(/\b\w/g, (l: string) => l.toUpperCase())}</span>
                <span style={{ ...MONO, color: "#e2e8f0" }}>{fmt$(val)}</span>
              </div>
            ))}
            <div className="flex justify-between items-center text-xs pt-2" style={{ borderTop: `1px solid ${BORDER}` }}>
              <span className="font-medium text-white">Total</span>
              <span className="font-semibold text-white" style={MONO}>{fmt$(data.cost_structure.total)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Executive Narrative */}
      <div className="rounded-lg p-5" style={{ background: SURFACE, border: `1px solid ${BORDER}`, borderLeft: `3px solid ${ACCENT}` }} data-testid="executive-narrative">
        <div className="flex items-center gap-2 mb-3">
          <Brain className="w-3.5 h-3.5" style={{ color: ACCENT }} />
          <span className="text-[10px] uppercase tracking-widest" style={{ ...MONO, color: "rgba(200,169,126,0.5)" }}>
            AI Executive Summary
          </span>
          {narrativeLoading && <RefreshCw className="w-3 h-3 animate-spin ml-1" style={{ color: "rgba(200,169,126,0.4)" }} />}
        </div>
        {narrative ? (
          <div className="text-[13px] leading-relaxed whitespace-pre-line" style={{ color: "rgba(226,232,240,0.85)" }}>
            {narrative.narrative}
          </div>
        ) : narrativeLoading ? (
          <div className="text-[11px] italic" style={{ color: "rgba(148,163,184,0.4)" }}>
            Generating executive intelligence briefing...
          </div>
        ) : null}
      </div>
    </div>
  );
}

/* ─── Forecast View ────────────────────────────── */

function ForecastView() {
  const [data, setData] = useState<any>(null);
  const [horizon, setHorizon] = useState("30d");
  const [loading, setLoading] = useState(true);
  const [domains, setDomains] = useState<any>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [f, d] = await Promise.all([SP("/forecast", { horizon }), S("/forecast/domains")]);
      setData(f);
      setDomains(d);
    } catch (e) { console.error(e); }
    setLoading(false);
  }, [horizon]);

  useEffect(() => { load(); }, [load]);

  if (loading || !data) return <Loading />;
  const s = data.summary;

  return (
    <div className="p-6 space-y-5" data-testid="forecast-view">
      <div className="flex items-center justify-between">
        <SectionLabel label="Forecast Engine" />
        <div className="flex gap-1 p-0.5 rounded-md" style={{ background: SURFACE, border: `1px solid ${BORDER}` }}>
          {(domains?.horizons || []).map((h: any) => (
            <button key={h.id} data-testid={`horizon-${h.id}`}
              onClick={() => setHorizon(h.id)}
              className="px-2.5 py-1 rounded text-[10px] transition-all"
              style={{
                ...MONO,
                background: horizon === h.id ? ACCENT_DIM : "transparent",
                color: horizon === h.id ? ACCENT : "rgba(148,163,184,0.5)",
              }}>
              {h.label.split(" ")[0]}
            </button>
          ))}
        </div>
      </div>

      {/* Summary KPIs */}
      <div className="grid grid-cols-5 gap-3">
        <KPICard label="Forecast Revenue" value={fmt$(s.total_forecast_revenue)} />
        <KPICard label="Forecast Profit" value={fmt$(s.total_forecast_profit)} positive />
        <KPICard label="Avg Margin" value={`${s.avg_margin_pct}%`} positive={s.avg_margin_pct >= 15} />
        <KPICard label="Confidence" value={`${(s.avg_confidence * 100).toFixed(0)}%`} positive={s.avg_confidence >= 0.7} />
        <KPICard label="Covers" value={s.total_covers.toLocaleString()} />
      </div>

      {/* Forecast Timeline */}
      <div className="rounded-lg p-4" style={{ background: SURFACE, border: `1px solid ${BORDER}` }}>
        <div className="text-[10px] uppercase tracking-widest mb-3" style={{ ...MONO, color: "rgba(200,169,126,0.5)" }}>
          Revenue Forecast — {data.horizon} Horizon
        </div>
        <div className="flex items-end gap-[2px] h-32">
          {data.periods.map((p: any, i: number) => {
            const maxRev = Math.max(...data.periods.map((pp: any) => pp.revenue));
            const h = maxRev > 0 ? (p.revenue / maxRev * 100) : 0;
            return (
              <div key={i} className="flex-1 flex flex-col items-center justify-end gap-1 group relative">
                <div className="w-full rounded-t transition-all duration-200 group-hover:opacity-80"
                  style={{
                    height: `${h}%`,
                    minHeight: "2px",
                    background: `linear-gradient(180deg, ${ACCENT} 0%, rgba(200,169,126,0.3) 100%)`,
                    opacity: 0.3 + p.confidence * 0.7,
                  }} />
                {i % Math.max(1, Math.floor(data.periods.length / 8)) === 0 && (
                  <div className="text-[8px] truncate" style={{ ...MONO, color: "rgba(148,163,184,0.3)" }}>
                    {p.date.slice(5)}
                  </div>
                )}
              </div>
            );
          })}
        </div>
        <div className="flex justify-between mt-2 text-[9px]" style={{ ...MONO, color: "rgba(148,163,184,0.3)" }}>
          <span>Certainty band visualized via bar opacity</span>
          <span>Avg confidence: {(s.avg_confidence * 100).toFixed(0)}%</span>
        </div>
      </div>
    </div>
  );
}

/* ─── Scenario View ────────────────────────────── */

function ScenarioView() {
  const [templates, setTemplates] = useState<any[]>([]);
  const [result, setResult] = useState<any>(null);
  const [running, setRunning] = useState(false);

  useEffect(() => { S("/scenarios/templates").then(d => setTemplates(d.templates || [])); }, []);

  const runScenario = async (t: any) => {
    setRunning(true);
    setResult(null);
    try {
      const r = await SP("/scenarios/simulate", { scenario_type: t.type, parameters: t.default_params, name: t.name });
      setResult(r);
    } catch (e) { console.error(e); }
    setRunning(false);
  };

  return (
    <div className="p-6 space-y-5" data-testid="scenario-view">
      <SectionLabel label="Scenario Simulation Engine" />

      <div className="grid grid-cols-5 gap-3">
        {templates.map(t => (
          <button key={t.type} data-testid={`scenario-${t.type}`}
            onClick={() => runScenario(t)}
            className="rounded-lg p-3.5 text-left transition-all hover:scale-[1.01]"
            style={{ background: SURFACE, border: `1px solid ${BORDER}` }}>
            <div className="text-xs font-medium text-white mb-1" style={FONT}>{t.name}</div>
            <div className="text-[10px] leading-snug" style={{ color: "rgba(148,163,184,0.5)" }}>{t.description}</div>
          </button>
        ))}
      </div>

      {running && <div className="flex items-center gap-2 py-8 justify-center"><RefreshCw className="w-4 h-4 animate-spin" style={{ color: ACCENT }} /><span className="text-xs" style={{ color: "rgba(148,163,184,0.5)" }}>Simulating...</span></div>}

      {result && (
        <div className="rounded-lg p-5 space-y-4" style={{ background: SURFACE, border: `1px solid ${BORDER}` }} data-testid="scenario-result">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-semibold text-white">{result.scenario_name}</div>
              <div className="text-[10px]" style={{ ...MONO, color: "rgba(148,163,184,0.4)" }}>Confidence: {(result.confidence * 100).toFixed(0)}%</div>
            </div>
            <div className="text-right">
              <div className="text-xl font-bold" style={{ ...MONO, color: result.impact.ebitda_change >= 0 ? "#10b981" : "#ef4444" }}>
                {result.impact.ebitda_change >= 0 ? "+" : ""}{fmt$(result.impact.ebitda_change)}
              </div>
              <div className="text-[10px]" style={{ ...MONO, color: "rgba(148,163,184,0.4)" }}>EBITDA Impact ({result.impact.ebitda_change_pct}%)</div>
            </div>
          </div>

          <div className="grid grid-cols-4 gap-3">
            <ImpactCard label="Revenue" value={result.impact.revenue_change} />
            <ImpactCard label="Cost" value={result.impact.cost_change} />
            <ImpactCard label="Labor" value={result.impact.labor_change} />
            <ImpactCard label="Food Cost" value={result.impact.food_cost_change} />
          </div>

          <div className="grid grid-cols-3 gap-3">
            {Object.entries(result.action_plan).map(([k, v]: any) => (
              <div key={k} className="rounded-md p-3" style={{ background: "rgba(200,169,126,0.04)", border: `1px solid rgba(200,169,126,0.1)` }}>
                <div className="text-[9px] uppercase tracking-widest mb-1" style={{ ...MONO, color: ACCENT }}>{k}</div>
                <div className="text-[11px] leading-snug" style={{ color: "rgba(226,232,240,0.7)" }}>{v}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── Signals View ─────────────────────────────── */

function SignalView() {
  const [data, setData] = useState<any>(null);
  useEffect(() => { S("/signals").then(setData); }, []);
  if (!data) return <Loading />;

  return (
    <div className="p-6 space-y-5" data-testid="signal-view">
      <div className="flex items-center justify-between">
        <SectionLabel label="Signal Detection" />
        <div className="text-[10px]" style={{ ...MONO, color: "rgba(148,163,184,0.4)" }}>
          Reliability Index: {data.reliability_index || "N/A"}
        </div>
      </div>

      {data.signals.length === 0 ? (
        <div className="rounded-lg p-8 text-center" style={{ background: SURFACE, border: `1px solid ${BORDER}` }}>
          <Zap className="w-6 h-6 mx-auto mb-2" style={{ color: "rgba(16,185,129,0.4)" }} />
          <div className="text-sm text-white font-medium mb-1">All Clear</div>
          <div className="text-[11px]" style={{ color: "rgba(148,163,184,0.4)" }}>No anomalies or risk signals detected. Operations within normal parameters.</div>
        </div>
      ) : (
        <div className="space-y-2">
          {data.signals.map((s: any, i: number) => (
            <SignalCard key={i} signal={s} />
          ))}
        </div>
      )}
    </div>
  );
}

function SignalCard({ signal: s }: { signal: any }) {
  const colors: Record<string, string> = { critical: "#ef4444", high: "#f59e0b", medium: "#3b82f6", low: "#94a3b8", info: "#10b981" };
  const c = colors[s.severity] || "#94a3b8";
  return (
    <div className="rounded-lg p-4" style={{ background: SURFACE, border: `1px solid ${BORDER}`, borderLeft: `3px solid ${c}` }}>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[9px] px-1.5 py-0.5 rounded uppercase font-medium" style={{ ...MONO, background: `${c}15`, color: c }}>{s.severity}</span>
            <span className="text-xs font-medium text-white">{s.title}</span>
          </div>
          <div className="text-[11px] leading-snug mb-2" style={{ color: "rgba(226,232,240,0.6)" }}>{s.description}</div>
          <div className="text-[10px]" style={{ color: "rgba(200,169,126,0.6)" }}>Action: {s.action}</div>
        </div>
        <div className="text-right shrink-0 ml-4">
          <div className="text-sm font-bold" style={{ ...MONO, color: c }}>{s.metric_value}{s.metric_unit === "%" ? "%" : ""}</div>
          <div className="text-[9px]" style={{ ...MONO, color: "rgba(148,163,184,0.3)" }}>{s.time_horizon}</div>
        </div>
      </div>
    </div>
  );
}

/* ─── Recommendations View ─────────────────────── */

function RecommendationView() {
  const [data, setData] = useState<any>(null);
  useEffect(() => { S("/recommendations").then(setData); }, []);
  if (!data) return <Loading />;

  return (
    <div className="p-6 space-y-5" data-testid="recommendations-view">
      <div className="flex items-center justify-between">
        <SectionLabel label="Strategic Recommendations" />
        <div className="text-[11px] font-medium" style={{ ...MONO, color: ACCENT }}>
          Est. Total Impact: {fmt$(data.total_estimated_impact)}
        </div>
      </div>
      <div className="space-y-3">
        {data.recommendations.map((r: any, i: number) => (
          <div key={i} className="rounded-lg p-4" style={{ background: SURFACE, border: `1px solid ${BORDER}` }}
            data-testid={`rec-${r.id}`}>
            <div className="flex items-start justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="text-[9px] px-1.5 py-0.5 rounded uppercase" style={{
                  ...MONO,
                  background: r.priority === "high" ? "rgba(200,169,126,0.12)" : SURFACE,
                  color: r.priority === "high" ? ACCENT : "rgba(148,163,184,0.5)",
                  border: `1px solid ${r.priority === "high" ? "rgba(200,169,126,0.2)" : BORDER}`,
                }}>{r.priority}</span>
                <span className="text-xs font-semibold text-white">{r.title}</span>
              </div>
              <div className="text-right">
                <div className="text-sm font-bold" style={{ ...MONO, color: "#10b981" }}>{fmt$(r.estimated_impact)}</div>
                <div className="text-[9px]" style={{ ...MONO, color: "rgba(148,163,184,0.3)" }}>ROI: {r.roi_estimate_pct}%</div>
              </div>
            </div>
            <div className="text-[11px] leading-snug mb-2" style={{ color: "rgba(226,232,240,0.6)" }}>{r.description}</div>
            <div className="flex items-center gap-4 text-[10px]" style={{ ...MONO, color: "rgba(148,163,184,0.4)" }}>
              <span>Confidence: {(r.confidence * 100).toFixed(0)}%</span>
              <span>Risk: {r.risk_level}</span>
              <span>Horizon: {r.time_horizon}</span>
              <span>Type: {r.impact_type.replace(/_/g, " ")}</span>
            </div>
            <div className="mt-2 pt-2 text-[10px]" style={{ borderTop: `1px solid ${BORDER}`, color: "rgba(200,169,126,0.5)" }}>
              {r.action}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─── Portfolio View ───────────────────────────── */

function PortfolioView() {
  const [data, setData] = useState<any>(null);
  useEffect(() => { S("/portfolio/overview").then(setData); }, []);
  if (!data) return <Loading />;
  const p = data.portfolio;

  return (
    <div className="p-6 space-y-5" data-testid="portfolio-view">
      <SectionLabel label="Portfolio Intelligence" />
      <div className="grid grid-cols-4 gap-3">
        <KPICard label="Portfolio Revenue" value={fmt$(p.total_revenue)} />
        <KPICard label="EBITDA" value={fmt$(p.ebitda)} positive />
        <KPICard label="Outlets" value={String(p.total_outlets)} />
        <KPICard label="Events" value={String(p.total_events)} />
      </div>

      {/* Outlet Performance */}
      <div className="rounded-lg p-4" style={{ background: SURFACE, border: `1px solid ${BORDER}` }}>
        <div className="text-[10px] uppercase tracking-widest mb-3" style={{ ...MONO, color: "rgba(200,169,126,0.5)" }}>
          Outlet Performance Ranking
        </div>
        <div className="space-y-1">
          {data.outlets.map((o: any, i: number) => (
            <div key={i} className="flex items-center gap-3 py-2 px-2 rounded" style={{ background: i === 0 ? "rgba(200,169,126,0.04)" : "transparent" }}>
              <span className="text-[10px] w-5 text-center font-medium" style={{ ...MONO, color: i === 0 ? ACCENT : "rgba(148,163,184,0.3)" }}>#{i + 1}</span>
              <span className="text-xs text-white flex-1 font-medium">{o.name}</span>
              <span className="text-[10px]" style={{ ...MONO, color: "rgba(148,163,184,0.4)" }}>{o.type}</span>
              <span className="text-[11px] w-20 text-right" style={{ ...MONO, color: "#e2e8f0" }}>{fmt$(o.revenue)}</span>
              <span className="text-[11px] w-14 text-right" style={{ ...MONO, color: o.margin_pct >= 20 ? "#10b981" : "#f59e0b" }}>{o.margin_pct}%</span>
              <div className="w-16 h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.05)" }}>
                <div className="h-full rounded-full" style={{ width: `${Math.min(100, o.utilization_pct)}%`, background: ACCENT }} />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Optimization Opportunities */}
      <div className="grid grid-cols-3 gap-3">
        {Object.entries(data.optimization_opportunities).map(([key, val]: any) => (
          <div key={key} className="rounded-lg p-3.5" style={{ background: "rgba(200,169,126,0.03)", border: `1px solid rgba(200,169,126,0.08)` }}>
            <div className="text-[10px] uppercase tracking-widest mb-1.5" style={{ ...MONO, color: ACCENT }}>{key.replace(/_/g, " ")}</div>
            <div className="text-[11px] leading-snug" style={{ color: "rgba(226,232,240,0.6)" }}>{val.description}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─── Risk Radar View ──────────────────────────── */

function RiskView() {
  const [data, setData] = useState<any>(null);
  useEffect(() => { S("/portfolio/risk-radar").then(setData); }, []);
  if (!data) return <Loading />;

  const severityColors: Record<string, string> = { high: "#ef4444", medium: "#f59e0b", low: "#10b981" };

  return (
    <div className="p-6 space-y-5" data-testid="risk-view">
      <div className="flex items-center justify-between">
        <SectionLabel label="Risk Exposure Radar" />
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-md" style={{
          background: `${severityColors[data.overall_severity]}10`,
          border: `1px solid ${severityColors[data.overall_severity]}30`,
        }}>
          <Shield className="w-3.5 h-3.5" style={{ color: severityColors[data.overall_severity] }} />
          <span className="text-[11px] font-medium" style={{ color: severityColors[data.overall_severity] }}>
            Overall: {data.overall_severity.toUpperCase()} ({data.overall_risk_score})
          </span>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        {data.dimensions.map((d: any, i: number) => {
          const c = severityColors[d.severity] || "#94a3b8";
          return (
            <div key={i} className="rounded-lg p-4" style={{ background: SURFACE, border: `1px solid ${BORDER}` }}>
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-medium text-white">{d.label}</span>
                <span className="text-[9px] px-1.5 py-0.5 rounded uppercase" style={{ ...MONO, background: `${c}15`, color: c }}>
                  {d.severity}
                </span>
              </div>
              <div className="relative h-2 rounded-full overflow-hidden mb-2" style={{ background: "rgba(255,255,255,0.05)" }}>
                <div className="absolute inset-y-0 left-0 rounded-full transition-all" style={{ width: `${d.score}%`, background: c }} />
              </div>
              <div className="flex justify-between">
                <span className="text-[10px]" style={{ color: "rgba(148,163,184,0.4)" }}>{d.detail}</span>
                <span className="text-[10px] font-bold" style={{ ...MONO, color: c }}>{d.score}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}


/* ─── Budget & Forecast View ──────────────────── */

const MONTH_LABELS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

function BudgetView() {
  const [budget, setBudget] = useState<any>(null);
  const [budgets, setBudgets] = useState<any[]>([]);
  const [variance, setVariance] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [showAssumptions, setShowAssumptions] = useState(false);
  const [assumptions, setAssumptions] = useState<any>({});
  const [savingAssumptions, setSavingAssumptions] = useState(false);

  useEffect(() => {
    S("/budget/list").then(d => {
      setBudgets(d.budgets || []);
      if (d.budgets?.length > 0) {
        S(`/budget/${d.budgets[0].id}`).then(b => {
          setBudget(b);
          setAssumptions(b.assumptions || {});
          S(`/budget/${d.budgets[0].id}/variance`).then(setVariance);
        });
      }
      setLoading(false);
    });
  }, []);

  const createBudget = async () => {
    setCreating(true);
    const b = await SP("/budget/create", { fiscal_year: 2026, name: "FY2026 Operating Budget" });
    setBudget(b);
    setAssumptions(b.assumptions || {});
    setBudgets(prev => [b, ...prev]);
    const v = await S(`/budget/${b.id}/variance`);
    setVariance(v);
    setCreating(false);
  };

  const updateAssumptions = async () => {
    if (!budget) return;
    setSavingAssumptions(true);
    const result = await SP("/budget/update-assumptions", { budget_id: budget.id, assumptions });
    setBudget((prev: any) => ({ ...prev, annual: result.annual, assumptions }));
    const v = await S(`/budget/${budget.id}/variance`);
    setVariance(v);
    setSavingAssumptions(false);
  };

  if (loading) return <Loading />;
  if (!budget) {
    return (
      <div className="p-6 space-y-5" data-testid="budget-view">
        <SectionLabel label="Annual Budget & Forecast" />
        <div className="rounded-lg p-8 text-center" style={{ background: SURFACE, border: `1px solid ${BORDER}` }}>
          <Wallet className="w-8 h-8 mx-auto mb-3" style={{ color: ACCENT }} />
          <div className="text-sm text-white font-medium mb-2">No Budget Created</div>
          <div className="text-[11px] mb-4" style={{ color: "rgba(148,163,184,0.5)" }}>
            Create your first annual operating budget based on historical performance and growth assumptions.
          </div>
          <button onClick={createBudget} disabled={creating} data-testid="create-budget-btn"
            className="px-4 py-2 rounded-md text-xs font-medium transition-all"
            style={{ background: ACCENT_DIM, color: ACCENT, border: `1px solid rgba(200,169,126,0.3)` }}>
            {creating ? "Building..." : "Create FY2026 Budget"}
          </button>
        </div>
      </div>
    );
  }

  const a = budget.annual;
  const months = budget.months;

  return (
    <div className="p-6 space-y-5" data-testid="budget-view">
      <div className="flex items-center justify-between">
        <SectionLabel label={budget.name} />
        <div className="flex items-center gap-2">
          <span className="text-[9px] px-2 py-0.5 rounded uppercase" style={{
            ...MONO, background: budget.status === "draft" ? "rgba(245,158,11,0.1)" : "rgba(16,185,129,0.1)",
            color: budget.status === "draft" ? "#f59e0b" : "#10b981", border: `1px solid ${budget.status === "draft" ? "rgba(245,158,11,0.2)" : "rgba(16,185,129,0.2)"}`,
          }}>{budget.status}</span>
          <button onClick={() => setShowAssumptions(!showAssumptions)} data-testid="toggle-assumptions"
            className="flex items-center gap-1 px-2 py-1 rounded text-[10px]"
            style={{ ...MONO, background: SURFACE, color: "rgba(148,163,184,0.5)", border: `1px solid ${BORDER}` }}>
            <SlidersHorizontal className="w-3 h-3" /> Assumptions
          </button>
        </div>
      </div>

      {/* Assumptions Panel */}
      {showAssumptions && (
        <div className="rounded-lg p-4 space-y-3" style={{ background: "rgba(200,169,126,0.03)", border: `1px solid rgba(200,169,126,0.1)` }}
          data-testid="assumptions-panel">
          <div className="text-[9px] uppercase tracking-widest" style={{ ...MONO, color: ACCENT }}>Budget Drivers & Assumptions</div>
          <div className="grid grid-cols-4 gap-3">
            {[
              { key: "revenue_growth_pct", label: "Revenue Growth %", min: -10, max: 20, step: 0.5 },
              { key: "food_inflation_pct", label: "Food Inflation %", min: 0, max: 15, step: 0.5 },
              { key: "labor_increase_pct", label: "Labor Increase %", min: 0, max: 10, step: 0.5 },
              { key: "occupancy_target_pct", label: "Occupancy Target %", min: 50, max: 100, step: 1 },
              { key: "avg_check_growth_pct", label: "Check Avg Growth %", min: -5, max: 15, step: 0.5 },
              { key: "event_volume_change_pct", label: "Event Volume %", min: -20, max: 50, step: 1 },
              { key: "new_activations_count", label: "New Activations #", min: 0, max: 20, step: 1 },
              { key: "capex_budget", label: "CapEx Budget $", min: 0, max: 500000, step: 5000 },
            ].map(s => (
              <div key={s.key}>
                <div className="text-[9px] mb-1" style={{ color: "rgba(148,163,184,0.4)" }}>{s.label}</div>
                <div className="flex items-center gap-2">
                  <input type="range" min={s.min} max={s.max} step={s.step}
                    value={assumptions[s.key] ?? 0}
                    onChange={e => setAssumptions((p: any) => ({ ...p, [s.key]: parseFloat(e.target.value) }))}
                    className="flex-1 h-1 appearance-none rounded-full cursor-pointer"
                    style={{ accentColor: ACCENT, background: BORDER }}
                  />
                  <span className="text-[10px] w-12 text-right font-medium" style={{ ...MONO, color: ACCENT }}>
                    {s.key === "capex_budget" ? fmt$(assumptions[s.key] ?? 0) : `${assumptions[s.key] ?? 0}`}
                  </span>
                </div>
              </div>
            ))}
          </div>
          <button onClick={updateAssumptions} disabled={savingAssumptions} data-testid="apply-assumptions"
            className="px-3 py-1.5 rounded text-[10px] font-medium"
            style={{ background: ACCENT_DIM, color: ACCENT, border: `1px solid rgba(200,169,126,0.2)` }}>
            {savingAssumptions ? "Recalculating..." : "Apply & Recalculate"}
          </button>
        </div>
      )}

      {/* Annual Summary KPIs */}
      <div className="grid grid-cols-6 gap-2">
        <KPICard label="Annual Revenue" value={fmt$(a.total_revenue)} positive />
        <KPICard label="Food Cost" value={fmt$(a.total_food_cost)} delta={`${a.food_cost_pct}%`} positive={a.food_cost_pct <= 20} />
        <KPICard label="Bev Cost" value={fmt$(a.total_beverage_cost)} />
        <KPICard label="Labor" value={fmt$(a.total_labor)} delta={`${a.labor_pct}%`} positive={a.labor_pct <= 30} />
        <KPICard label="EBITDA" value={fmt$(a.total_ebitda)} delta={`${a.ebitda_margin_pct}%`} positive />
        <KPICard label="Covers" value={a.total_covers?.toLocaleString()} />
      </div>

      {/* Budget vs Actual Variance */}
      {variance && (
        <div className="rounded-lg p-4" style={{ background: SURFACE, border: `1px solid ${BORDER}` }} data-testid="variance-panel">
          <div className="flex items-center justify-between mb-3">
            <div className="text-[10px] uppercase tracking-widest" style={{ ...MONO, color: "rgba(200,169,126,0.5)" }}>
              Budget vs Actual (YTD)
            </div>
            <div className="flex items-center gap-2">
              <span className={`text-[10px] px-2 py-0.5 rounded ${variance.pace.on_pace ? "text-emerald-400" : "text-red-400"}`}
                style={{ ...MONO, background: variance.pace.on_pace ? "rgba(16,185,129,0.1)" : "rgba(239,68,68,0.1)" }}>
                {variance.pace.pace_pct}% of pace
              </span>
            </div>
          </div>
          <div className="grid grid-cols-6 gap-2">
            {Object.entries(variance.ytd_variance).map(([key, v]: any) => (
              <div key={key} className="rounded-md p-2.5" style={{ background: "rgba(255,255,255,0.015)", border: `1px solid ${BORDER}` }}>
                <div className="text-[8px] uppercase tracking-widest mb-1" style={{ color: "rgba(148,163,184,0.3)" }}>
                  {key.replace(/_/g, " ")}
                </div>
                <div className="text-[11px] font-semibold" style={{ ...MONO, color: "#e2e8f0" }}>{fmt$(v.actual)}</div>
                <div className="text-[9px]" style={{ ...MONO, color: v.status === "favorable" ? "rgba(16,185,129,0.7)" : "rgba(239,68,68,0.7)" }}>
                  {v.variance_pct > 0 ? "+" : ""}{v.variance_pct}% {v.status === "favorable" ? "F" : "U"}
                </div>
              </div>
            ))}
          </div>
          {/* Alerts */}
          {variance.alerts?.length > 0 && (
            <div className="mt-3 space-y-1.5">
              {variance.alerts.map((al: any, i: number) => (
                <div key={i} className="flex items-start gap-2 p-2 rounded" style={{
                  background: al.severity === "critical" ? "rgba(239,68,68,0.05)" : al.severity === "warning" ? "rgba(245,158,11,0.05)" : "rgba(16,185,129,0.05)",
                  border: `1px solid ${al.severity === "critical" ? "rgba(239,68,68,0.15)" : al.severity === "warning" ? "rgba(245,158,11,0.15)" : "rgba(16,185,129,0.15)"}`,
                }}>
                  <AlertTriangle className="w-3 h-3 mt-0.5 shrink-0" style={{
                    color: al.severity === "critical" ? "#ef4444" : al.severity === "warning" ? "#f59e0b" : "#10b981"
                  }} />
                  <div>
                    <div className="text-[10px]" style={{ color: "rgba(226,232,240,0.7)" }}>{al.message}</div>
                    <div className="text-[9px] mt-0.5" style={{ color: "rgba(200,169,126,0.5)" }}>{al.action}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Monthly P&L Grid */}
      <div className="rounded-lg overflow-hidden" style={{ background: SURFACE, border: `1px solid ${BORDER}` }} data-testid="monthly-pnl">
        <div className="overflow-x-auto">
          <table className="w-full text-[10px]" style={MONO}>
            <thead>
              <tr style={{ borderBottom: `1px solid ${BORDER}` }}>
                <th className="text-left px-3 py-2 sticky left-0" style={{ background: "#0a0d14", color: "rgba(200,169,126,0.5)", minWidth: "120px" }}>P&L Line</th>
                {MONTH_LABELS.map(m => (
                  <th key={m} className="text-right px-2 py-2" style={{ color: "rgba(148,163,184,0.4)", minWidth: "70px" }}>{m}</th>
                ))}
                <th className="text-right px-3 py-2 font-bold" style={{ color: ACCENT, minWidth: "85px" }}>Annual</th>
              </tr>
            </thead>
            <tbody>
              <PnLRow label="Revenue" months={months} field="revenue" sub="total" isHeader accent />
              <PnLRow label="  Restaurant" months={months} field="revenue" sub="restaurant" />
              <PnLRow label="  Banquet" months={months} field="revenue" sub="banquet" />
              <PnLRow label="  Bar & Lounge" months={months} field="revenue" sub="bar_lounge" />
              <PnLRow label="  Catering" months={months} field="revenue" sub="catering" />
              <PnLRow label="  Other" months={months} field="revenue" sub="other" />
              <PnLRow label="Cost of Sales" months={months} field="cost_of_sales" sub="total" isHeader />
              <PnLRow label="  Food" months={months} field="cost_of_sales" sub="food" />
              <PnLRow label="  Beverage" months={months} field="cost_of_sales" sub="beverage" />
              <PnLRow label="Gross Profit" months={months} field="gross_profit" isHeader accent />
              <PnLRow label="Labor" months={months} field="labor" sub="total" isHeader />
              <PnLRow label="  FOH" months={months} field="labor" sub="foh" />
              <PnLRow label="  BOH" months={months} field="labor" sub="boh" />
              <PnLRow label="  Management" months={months} field="labor" sub="management" />
              <PnLRow label="  Benefits" months={months} field="labor" sub="benefits" />
              <PnLRow label="Operating Expenses" months={months} field="operating_expenses" sub="total" isHeader />
              <PnLRow label="EBITDA" months={months} field="ebitda" isHeader accent />
              <tr style={{ borderTop: `1px solid ${BORDER}` }}>
                <td className="px-3 py-1.5 sticky left-0" style={{ background: "#0a0d14", color: "rgba(148,163,184,0.3)" }}>EBITDA %</td>
                {MONTH_LABELS.map((_, i) => (
                  <td key={i} className="text-right px-2 py-1.5" style={{ color: "rgba(16,185,129,0.6)" }}>
                    {months[String(i + 1)]?.ebitda_margin_pct}%
                  </td>
                ))}
                <td className="text-right px-3 py-1.5 font-bold" style={{ color: "#10b981" }}>{a.ebitda_margin_pct}%</td>
              </tr>
              {/* Driver Row */}
              <tr style={{ borderTop: `1px solid rgba(200,169,126,0.1)` }}>
                <td className="px-3 py-1.5 sticky left-0" style={{ background: "#0a0d14", color: "rgba(200,169,126,0.4)" }}>Covers</td>
                {MONTH_LABELS.map((_, i) => (
                  <td key={i} className="text-right px-2 py-1.5" style={{ color: "rgba(200,169,126,0.5)" }}>
                    {months[String(i + 1)]?.drivers?.covers?.toLocaleString() ?? "–"}
                  </td>
                ))}
                <td className="text-right px-3 py-1.5 font-bold" style={{ color: ACCENT }}>{a.total_covers?.toLocaleString()}</td>
              </tr>
              <tr>
                <td className="px-3 py-1.5 sticky left-0" style={{ background: "#0a0d14", color: "rgba(200,169,126,0.4)" }}>Avg Check</td>
                {MONTH_LABELS.map((_, i) => (
                  <td key={i} className="text-right px-2 py-1.5" style={{ color: "rgba(200,169,126,0.5)" }}>
                    ${months[String(i + 1)]?.drivers?.avg_check?.toFixed(0) ?? "–"}
                  </td>
                ))}
                <td className="text-right px-3 py-1.5 font-bold" style={{ color: ACCENT }}>
                  ${(a.total_revenue / Math.max(a.total_covers, 1)).toFixed(0)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function PnLRow({ label, months, field, sub, isHeader, accent }: {
  label: string; months: any; field: string; sub?: string; isHeader?: boolean; accent?: boolean;
}) {
  const getValue = (m: any) => {
    if (sub) return m?.[field]?.[sub] ?? 0;
    return m?.[field] ?? 0;
  };
  const annual = Object.keys(months).reduce((sum, k) => sum + getValue(months[k]), 0);
  return (
    <tr style={{ borderTop: isHeader ? `1px solid ${BORDER}` : undefined }}>
      <td className="px-3 py-1.5 sticky left-0" style={{
        background: "#0a0d14",
        color: isHeader ? (accent ? ACCENT : "#e2e8f0") : "rgba(148,163,184,0.4)",
        fontWeight: isHeader ? 600 : 400,
      }}>{label}</td>
      {MONTH_LABELS.map((_, i) => (
        <td key={i} className="text-right px-2 py-1.5" style={{
          color: isHeader ? (accent ? "rgba(200,169,126,0.8)" : "rgba(226,232,240,0.8)") : "rgba(148,163,184,0.45)",
          fontWeight: isHeader ? 500 : 400,
        }}>
          {fmt$Short(getValue(months[String(i + 1)]))}
        </td>
      ))}
      <td className="text-right px-3 py-1.5" style={{
        color: accent ? ACCENT : isHeader ? "#e2e8f0" : "rgba(148,163,184,0.5)",
        fontWeight: isHeader ? 700 : 500,
      }}>
        {fmt$Short(annual)}
      </td>
    </tr>
  );
}

/* ─── Capital Investment / Breakeven View ─────── */

function CapexView() {
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    name: "Restaurant Table (4-Top)", item_type: "table", cost: 4000,
    seats: 4, turns_per_day: 2.0, avg_check: 65, useful_life_years: 7,
    operating_days_per_year: 350, food_cost_pct: 16, labor_cost_pct: 28, maintenance_annual: 100,
  });

  const analyze = async () => {
    setLoading(true);
    const r = await SP("/capex/analyze", form);
    setResult(r);
    setLoading(false);
  };

  useEffect(() => { analyze(); }, []);

  const updateForm = (key: string, val: any) => setForm(p => ({ ...p, [key]: val }));

  return (
    <div className="p-6 space-y-5" data-testid="capex-view">
      <SectionLabel label="Capital Investment ROI & Breakeven" />

      {/* Input Controls */}
      <div className="rounded-lg p-4" style={{ background: SURFACE, border: `1px solid ${BORDER}` }} data-testid="capex-inputs">
        <div className="grid grid-cols-6 gap-3 mb-3">
          {[
            { key: "name", label: "Item Name", type: "text" },
            { key: "cost", label: "Cost ($)", type: "number", step: 100 },
            { key: "seats", label: "Seats / Capacity", type: "number", step: 1 },
            { key: "turns_per_day", label: "Turns / Day", type: "number", step: 0.5 },
            { key: "avg_check", label: "Avg Check ($)", type: "number", step: 5 },
            { key: "useful_life_years", label: "Useful Life (Yrs)", type: "number", step: 1 },
          ].map(f => (
            <div key={f.key}>
              <div className="text-[9px] mb-1" style={{ color: "rgba(148,163,184,0.4)" }}>{f.label}</div>
              <input type={f.type} value={(form as any)[f.key]}
                onChange={e => updateForm(f.key, f.type === "number" ? parseFloat(e.target.value) || 0 : e.target.value)}
                step={f.step}
                className="w-full px-2 py-1.5 rounded text-[11px] outline-none"
                style={{ ...MONO, background: "rgba(255,255,255,0.03)", border: `1px solid ${BORDER}`, color: "#e2e8f0" }}
              />
            </div>
          ))}
        </div>
        <div className="grid grid-cols-6 gap-3 mb-3">
          {[
            { key: "food_cost_pct", label: "Food Cost %", min: 5, max: 40, step: 0.5 },
            { key: "labor_cost_pct", label: "Labor Cost %", min: 10, max: 45, step: 0.5 },
            { key: "operating_days_per_year", label: "Operating Days/Yr", min: 200, max: 365, step: 5 },
            { key: "maintenance_annual", label: "Annual Maint. ($)", min: 0, max: 5000, step: 50 },
          ].map(s => (
            <div key={s.key}>
              <div className="text-[9px] mb-1" style={{ color: "rgba(148,163,184,0.4)" }}>{s.label}</div>
              <div className="flex items-center gap-2">
                <input type="range" min={s.min} max={s.max} step={s.step}
                  value={(form as any)[s.key]}
                  onChange={e => updateForm(s.key, parseFloat(e.target.value))}
                  className="flex-1 h-1 appearance-none rounded-full cursor-pointer"
                  style={{ accentColor: ACCENT, background: BORDER }}
                />
                <span className="text-[10px] w-10 text-right" style={{ ...MONO, color: ACCENT }}>
                  {s.key.includes("pct") ? `${(form as any)[s.key]}%` : (form as any)[s.key]}
                </span>
              </div>
            </div>
          ))}
          <div className="col-span-2 flex items-end">
            <button onClick={analyze} disabled={loading} data-testid="run-capex"
              className="w-full px-3 py-1.5 rounded text-[10px] font-medium transition-all"
              style={{ background: ACCENT_DIM, color: ACCENT, border: `1px solid rgba(200,169,126,0.3)` }}>
              {loading ? "Analyzing..." : "Run Breakeven Analysis"}
            </button>
          </div>
        </div>
      </div>

      {result && (
        <>
          {/* Results Summary */}
          <div className="grid grid-cols-5 gap-3">
            <KPICard label="Breakeven" value={`${result.breakeven.months} mo`} delta={`${result.breakeven.covers_needed} covers`} positive={result.breakeven.months < 18} />
            <KPICard label="Annual Revenue" value={fmt$(result.revenue_model.annual_revenue)} positive />
            <KPICard label="Annual Profit" value={fmt$(result.profitability.annual_profit)} positive={result.profitability.annual_profit > 0} />
            <KPICard label="NPV" value={fmt$(result.npv)} positive={result.npv > 0} />
            <div className="rounded-lg p-3.5 flex flex-col items-center justify-center" style={{
              background: result.recommendation === "Invest" ? "rgba(16,185,129,0.06)" : result.recommendation === "Decline" ? "rgba(239,68,68,0.06)" : SURFACE,
              border: `1px solid ${result.recommendation === "Invest" ? "rgba(16,185,129,0.2)" : result.recommendation === "Decline" ? "rgba(239,68,68,0.2)" : BORDER}`,
            }}>
              <div className="text-[9px] uppercase tracking-widest mb-1" style={{ ...MONO, color: "rgba(148,163,184,0.35)" }}>Decision</div>
              <div className="text-lg font-bold" style={{
                ...MONO,
                color: result.recommendation === "Invest" ? "#10b981" : result.recommendation === "Decline" ? "#ef4444" : "#f59e0b",
              }}>{result.recommendation}</div>
              <div className="text-[10px]" style={{ ...MONO, color: "rgba(148,163,184,0.4)" }}>ROI: {result.roi_pct}%</div>
            </div>
          </div>

          {/* Table Size Comparison */}
          <div className="rounded-lg p-4" style={{ background: SURFACE, border: `1px solid ${BORDER}` }} data-testid="table-comparison">
            <div className="text-[10px] uppercase tracking-widest mb-3" style={{ ...MONO, color: "rgba(200,169,126,0.5)" }}>
              Table Size Comparison at ${form.cost.toLocaleString()} Investment
            </div>
            <div className="grid grid-cols-5 gap-2">
              {result.table_size_comparison.map((c: any) => {
                const isSelected = c.seats === form.seats;
                return (
                  <div key={c.seats} className="rounded-lg p-3 text-center" style={{
                    background: isSelected ? "rgba(200,169,126,0.06)" : "rgba(255,255,255,0.015)",
                    border: `1px solid ${isSelected ? "rgba(200,169,126,0.2)" : BORDER}`,
                  }}>
                    <div className="text-xl font-bold mb-1" style={{ ...MONO, color: isSelected ? ACCENT : "rgba(148,163,184,0.5)" }}>{c.seats}</div>
                    <div className="text-[8px] uppercase tracking-widest mb-2" style={{ color: "rgba(148,163,184,0.3)" }}>Seats</div>
                    <div className="text-[10px] font-semibold" style={{ ...MONO, color: "#e2e8f0" }}>{c.breakeven_months} mo</div>
                    <div className="text-[8px]" style={{ color: "rgba(148,163,184,0.3)" }}>breakeven</div>
                    <div className="text-[10px] mt-1" style={{ ...MONO, color: "#10b981" }}>{fmt$(c.annual_profit)}</div>
                    <div className="text-[8px]" style={{ color: "rgba(148,163,184,0.3)" }}>annual profit</div>
                    <div className="text-[10px]" style={{ ...MONO, color: "rgba(148,163,184,0.5)" }}>{fmt$(c.daily_revenue)}/day</div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Cash Flow Timeline */}
          <div className="rounded-lg p-4" style={{ background: SURFACE, border: `1px solid ${BORDER}` }}>
            <div className="text-[10px] uppercase tracking-widest mb-3" style={{ ...MONO, color: "rgba(200,169,126,0.5)" }}>
              NPV Cash Flow Over {result.investment.useful_life_years} Years
            </div>
            <div className="flex items-end gap-1 h-24">
              {result.cash_flows.map((cf: any) => {
                const maxCum = Math.max(...result.cash_flows.map((c: any) => Math.abs(c.cumulative_npv)));
                const h = maxCum > 0 ? Math.abs(cf.cumulative_npv) / maxCum * 100 : 0;
                return (
                  <div key={cf.year} className="flex-1 flex flex-col items-center justify-end gap-1 group">
                    <div className="text-[8px] opacity-0 group-hover:opacity-100 transition-opacity" style={{ ...MONO, color: ACCENT }}>
                      {fmt$(cf.cumulative_npv)}
                    </div>
                    <div className="w-full rounded-t" style={{
                      height: `${h}%`, minHeight: "3px",
                      background: cf.cumulative_npv >= 0 ? `linear-gradient(180deg, #10b981, rgba(16,185,129,0.3))` : `linear-gradient(180deg, #ef4444, rgba(239,68,68,0.3))`,
                    }} />
                    <div className="text-[8px]" style={{ ...MONO, color: "rgba(148,163,184,0.3)" }}>Y{cf.year}</div>
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

/* ─── Activations (Pop-Up Dinners, Wine Dinners) ── */

function ActivationsView() {
  const [templates, setTemplates] = useState<any[]>([]);
  const [result, setResult] = useState<any>(null);
  const [patterns, setPatterns] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    Promise.all([S("/activations/templates"), S("/patterns/spending")])
      .then(([t, p]) => { setTemplates(t.templates || []); setPatterns(p); });
  }, []);

  const runActivation = async (tpl: any) => {
    setLoading(true);
    setResult(null);
    const r = await SP("/activations/model", {
      name: tpl.name, activation_type: tpl.type, ...tpl.defaults,
      months_active: tpl.type === "holiday_event" ? [2, 5, 7, 10, 12] : [],
    });
    setResult(r);
    setLoading(false);
  };

  return (
    <div className="p-6 space-y-5" data-testid="activations-view">
      <div className="flex items-center justify-between">
        <SectionLabel label="Revenue Activations & Event Modeling" />
        {patterns && (
          <div className="text-[10px]" style={{ ...MONO, color: "rgba(148,163,184,0.4)" }}>
            Avg Event Revenue: {fmt$(patterns.overall.avg_revenue_per_event)} | Avg Check: {fmt$(patterns.overall.avg_check_per_guest)}
          </div>
        )}
      </div>

      {/* Template Cards */}
      <div className="grid grid-cols-3 gap-3">
        {templates.map(t => (
          <button key={t.type} onClick={() => runActivation(t)} data-testid={`activation-${t.type}`}
            className="rounded-lg p-4 text-left transition-all hover:scale-[1.01]"
            style={{ background: SURFACE, border: `1px solid ${BORDER}` }}>
            <div className="flex items-center gap-2 mb-2">
              {t.type.includes("wine") ? <Wine className="w-4 h-4" style={{ color: ACCENT }} /> :
               t.type.includes("brunch") || t.type.includes("chef") ? <UtensilsCrossed className="w-4 h-4" style={{ color: ACCENT }} /> :
               t.type.includes("pool") ? <Sparkles className="w-4 h-4" style={{ color: ACCENT }} /> :
               <Calendar className="w-4 h-4" style={{ color: ACCENT }} />}
              <span className="text-xs font-medium text-white">{t.name}</span>
            </div>
            <div className="text-[10px] leading-snug mb-2" style={{ color: "rgba(148,163,184,0.5)" }}>{t.description}</div>
            <div className="flex items-center gap-3 text-[9px]" style={{ ...MONO, color: "rgba(148,163,184,0.35)" }}>
              <span>{t.defaults.estimated_covers} covers</span>
              <span>${t.defaults.avg_check} check</span>
              <span>{t.defaults.frequency}</span>
            </div>
          </button>
        ))}
      </div>

      {loading && <div className="flex items-center gap-2 py-8 justify-center"><RefreshCw className="w-4 h-4 animate-spin" style={{ color: ACCENT }} /><span className="text-xs" style={{ color: "rgba(148,163,184,0.5)" }}>Modeling...</span></div>}

      {result && (
        <div className="space-y-4" data-testid="activation-result">
          {/* Per Event + Annual */}
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-lg p-4" style={{ background: SURFACE, border: `1px solid ${BORDER}` }}>
              <div className="text-[10px] uppercase tracking-widest mb-3" style={{ ...MONO, color: "rgba(200,169,126,0.5)" }}>
                Per Event
              </div>
              <div className="grid grid-cols-3 gap-3">
                <MiniKPI label="Revenue" value={fmt$(result.per_event.revenue)} />
                <MiniKPI label="Total Cost" value={fmt$(result.per_event.total_cost)} />
                <MiniKPI label="Profit" value={fmt$(result.per_event.profit)} />
                <MiniKPI label="Covers" value={String(result.per_event.covers)} />
                <MiniKPI label="Avg Check" value={`$${result.per_event.avg_check}`} />
                <MiniKPI label="Margin" value={`${result.per_event.margin_pct}%`} />
              </div>
            </div>
            <div className="rounded-lg p-4" style={{ background: "rgba(200,169,126,0.03)", border: `1px solid rgba(200,169,126,0.1)` }}>
              <div className="text-[10px] uppercase tracking-widest mb-3" style={{ ...MONO, color: ACCENT }}>
                Annual Impact
              </div>
              <div className="grid grid-cols-3 gap-3">
                <MiniKPI label="Events" value={String(Math.round(result.annual.events))} />
                <MiniKPI label="Revenue" value={fmt$(result.annual.revenue)} />
                <MiniKPI label="Profit" value={fmt$(result.annual.profit)} />
                <MiniKPI label="Covers" value={result.annual.covers.toLocaleString()} />
                <MiniKPI label="Margin" value={`${result.annual.margin_pct}%`} />
                <MiniKPI label="vs Benchmark" value={`${result.historical_benchmark.vs_benchmark_revenue_pct > 0 ? "+" : ""}${result.historical_benchmark.vs_benchmark_revenue_pct}%`} />
              </div>
            </div>
          </div>

          {/* Monthly Revenue Chart */}
          <div className="rounded-lg p-4" style={{ background: SURFACE, border: `1px solid ${BORDER}` }}>
            <div className="text-[10px] uppercase tracking-widest mb-3" style={{ ...MONO, color: "rgba(200,169,126,0.5)" }}>
              Monthly Revenue Projection — {result.name}
            </div>
            <div className="flex items-end gap-1 h-28">
              {MONTH_LABELS.map((label, i) => {
                const m = result.monthly[String(i + 1)];
                const maxRev = Math.max(...Object.values(result.monthly).map((mm: any) => mm.revenue || 0));
                const h = maxRev > 0 ? (m?.revenue || 0) / maxRev * 100 : 0;
                return (
                  <div key={i} className="flex-1 flex flex-col items-center justify-end gap-1 group">
                    <div className="text-[8px] opacity-0 group-hover:opacity-100 transition-opacity" style={{ ...MONO, color: ACCENT }}>
                      {fmt$(m?.revenue || 0)}
                    </div>
                    <div className="w-full rounded-t transition-all" style={{
                      height: `${h}%`, minHeight: m?.active ? "3px" : "1px",
                      background: m?.active ? `linear-gradient(180deg, ${ACCENT}, rgba(200,169,126,0.3))` : "rgba(255,255,255,0.03)",
                    }} />
                    <div className="text-[8px]" style={{ ...MONO, color: m?.active ? "rgba(200,169,126,0.6)" : "rgba(148,163,184,0.2)" }}>
                      {label}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Cost Breakdown */}
          <div className="rounded-lg p-4" style={{ background: SURFACE, border: `1px solid ${BORDER}` }}>
            <div className="text-[10px] uppercase tracking-widest mb-3" style={{ ...MONO, color: "rgba(200,169,126,0.5)" }}>
              Per-Event Cost Breakdown
            </div>
            <div className="flex items-center gap-2 h-6 rounded-full overflow-hidden">
              {[
                { label: "Food", value: result.per_event.food_cost, color: "#ef4444" },
                { label: "Labor", value: result.per_event.labor_cost, color: "#f59e0b" },
                { label: "Fixed", value: result.per_event.fixed_cost, color: "#3b82f6" },
                { label: "Marketing", value: result.per_event.marketing, color: "#8b5cf6" },
                { label: "Profit", value: result.per_event.profit, color: "#10b981" },
              ].map(seg => {
                const total = result.per_event.revenue;
                const pct = total > 0 ? seg.value / total * 100 : 0;
                return pct > 0 ? (
                  <div key={seg.label} className="h-full flex items-center justify-center group relative"
                    style={{ width: `${pct}%`, background: seg.color, minWidth: pct > 3 ? undefined : "2px" }}>
                    {pct > 8 && (
                      <span className="text-[8px] font-medium text-white/80">{seg.label} {pct.toFixed(0)}%</span>
                    )}
                  </div>
                ) : null;
              })}
            </div>
          </div>
        </div>
      )}

      {/* Spending Patterns */}
      {patterns && (
        <div className="rounded-lg p-4" style={{ background: SURFACE, border: `1px solid ${BORDER}` }} data-testid="spending-patterns">
          <div className="text-[10px] uppercase tracking-widest mb-3" style={{ ...MONO, color: "rgba(200,169,126,0.5)" }}>
            Guest Spending Patterns by Outlet (Folio Analysis)
          </div>
          <div className="space-y-1.5">
            {patterns.by_outlet.map((o: any) => (
              <div key={o.outlet_id} className="flex items-center gap-3 py-1.5">
                <span className="text-[11px] text-white flex-1 font-medium" style={{ minWidth: "140px" }}>{o.name}</span>
                <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.05)" }}>
                  <div className="h-full rounded-full" style={{ width: `${o.share_pct * 2.5}%`, background: ACCENT }} />
                </div>
                <span className="text-[10px] w-16 text-right" style={{ ...MONO, color: "rgba(148,163,184,0.5)" }}>{o.share_pct}%</span>
                <span className="text-[10px] w-20 text-right" style={{ ...MONO, color: "#e2e8f0" }}>{fmt$(o.estimated_revenue)}</span>
                <span className="text-[10px] w-14 text-right" style={{ ...MONO, color: "rgba(200,169,126,0.6)" }}>${o.avg_check.toFixed(0)}/chk</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}


/* ─── Ask EchoStratus (AI Decision Engine) ────── */

function AskView() {
  const [question, setQuestion] = useState("");
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [templates, setTemplates] = useState<any[]>([]);
  const [feasibility, setFeasibility] = useState<any>(null);
  const [feasLoading, setFeasLoading] = useState(false);

  useEffect(() => { S("/decision/templates").then(d => setTemplates(d.templates || [])); }, []);

  const ask = async (q?: string) => {
    const query = q || question;
    if (!query.trim()) return;
    setLoading(true);
    setResult(null);
    setFeasibility(null);
    setQuestion(query);
    const r = await SP("/decision/ask", { question: query });
    setResult(r);
    setLoading(false);
  };

  const runFeasibility = async () => {
    setFeasLoading(true);
    const r = await SP("/event/feasibility", {
      name: "Guest Chef Dinner Analysis",
      event_type: "guest_chef",
      expected_covers: 60,
      ticket_price: 185,
      includes_wine_pairing: true,
      wine_pairing_price: 65,
      guest_chef_fee: 5000,
      food_cost_per_cover: 40,
      beverage_cost_per_cover: 18,
      entertainment_cost: 500,
      decor_cost: 1000,
      marketing_budget: 1500,
      extra_staff_count: 8,
      extra_staff_hours: 10,
      staff_hourly_rate: 28,
      prep_days: 2,
      is_series: true,
      events_per_year: 6,
    });
    setFeasibility(r);
    setFeasLoading(false);
  };

  return (
    <div className="p-6 space-y-5" data-testid="ask-view">
      <SectionLabel label="Ask EchoStratus — Universal Decision Engine" />

      {/* Question Input */}
      <div className="rounded-lg p-4" style={{ background: SURFACE, border: `1px solid ${BORDER}` }} data-testid="ask-input">
        <div className="flex gap-3">
          <div className="flex-1 relative">
            <input type="text" value={question} placeholder="Ask any financial question about the resort..."
              onChange={e => setQuestion(e.target.value)}
              onKeyDown={e => e.key === "Enter" && ask()}
              className="w-full px-4 py-3 rounded-lg text-sm outline-none"
              style={{ ...FONT, background: "rgba(255,255,255,0.03)", border: `1px solid ${BORDER}`, color: "#e2e8f0" }}
              data-testid="ask-question-input"
            />
          </div>
          <button onClick={() => ask()} disabled={loading} data-testid="ask-submit"
            className="px-5 py-3 rounded-lg text-xs font-medium transition-all"
            style={{ background: ACCENT_DIM, color: ACCENT, border: `1px solid rgba(200,169,126,0.3)` }}>
            {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : "Analyze"}
          </button>
        </div>
      </div>

      {/* Quick Question Templates */}
      {!result && !loading && (
        <div className="space-y-4" data-testid="ask-templates">
          {templates.map((cat, ci) => (
            <div key={ci}>
              <div className="text-[10px] uppercase tracking-widest mb-2" style={{ ...MONO, color: "rgba(200,169,126,0.4)" }}>
                {cat.category}
              </div>
              <div className="grid grid-cols-2 gap-2">
                {cat.questions.map((q: string, qi: number) => (
                  <button key={qi} onClick={() => ask(q)}
                    className="text-left rounded-lg p-3 text-[11px] transition-all hover:scale-[1.005]"
                    style={{ background: "rgba(255,255,255,0.015)", border: `1px solid ${BORDER}`, color: "rgba(226,232,240,0.7)" }}>
                    {q}
                  </button>
                ))}
              </div>
            </div>
          ))}
          {/* Quick Event Feasibility Button */}
          <button onClick={runFeasibility} disabled={feasLoading}
            className="w-full rounded-lg p-3 text-xs font-medium text-left transition-all"
            style={{ background: "rgba(200,169,126,0.04)", border: `1px solid rgba(200,169,126,0.12)`, color: ACCENT }}
            data-testid="run-feasibility">
            {feasLoading ? "Analyzing..." : "Run Full Event Feasibility: Guest Chef Dinner ($5K fee, 60 covers, $185 ticket + $65 wine)"}
          </button>
        </div>
      )}

      {loading && <div className="flex items-center gap-2 py-12 justify-center"><RefreshCw className="w-5 h-5 animate-spin" style={{ color: ACCENT }} /><span className="text-xs" style={{ color: "rgba(148,163,184,0.5)" }}>EchoStratus is analyzing...</span></div>}

      {/* Decision Engine Result */}
      {result && (
        <div className="space-y-4" data-testid="ask-result">
          {/* Classification & Confidence */}
          <div className="flex items-center gap-3">
            <span className="text-[9px] px-2 py-0.5 rounded uppercase" style={{ ...MONO, background: ACCENT_DIM, color: ACCENT }}>
              {result.analysis_type.replace(/_/g, " ")}
            </span>
            <span className="text-[10px]" style={{ ...MONO, color: "rgba(148,163,184,0.4)" }}>
              Confidence: {(result.confidence * 100).toFixed(0)}%
            </span>
            <button onClick={() => { setResult(null); setQuestion(""); }} className="ml-auto text-[10px] px-2 py-1 rounded"
              style={{ background: SURFACE, border: `1px solid ${BORDER}`, color: "rgba(148,163,184,0.5)" }}>
              New Question
            </button>
          </div>

          {/* AI Analysis */}
          {result.ai_analysis && (
            <div className="rounded-lg p-5" style={{ background: SURFACE, border: `1px solid ${BORDER}`, borderLeft: `3px solid ${ACCENT}` }}>
              <div className="flex items-center gap-2 mb-3">
                <Brain className="w-3.5 h-3.5" style={{ color: ACCENT }} />
                <span className="text-[10px] uppercase tracking-widest" style={{ ...MONO, color: "rgba(200,169,126,0.5)" }}>
                  AI Analysis
                </span>
              </div>
              <div className="text-[12px] leading-relaxed whitespace-pre-line" style={{ color: "rgba(226,232,240,0.85)" }}>
                {result.ai_analysis}
              </div>
            </div>
          )}

          {/* Financial Model */}
          {result.financial_model && (
            <div className="rounded-lg p-4" style={{ background: SURFACE, border: `1px solid ${BORDER}` }}>
              <div className="text-[10px] uppercase tracking-widest mb-3" style={{ ...MONO, color: "rgba(200,169,126,0.5)" }}>
                Financial Model
              </div>
              <div className="grid grid-cols-4 gap-3">
                {Object.entries(result.financial_model).filter(([k]) =>
                  !["type", "note", "cost_breakdown"].includes(k) && typeof result.financial_model[k] !== "object"
                ).map(([key, val]: any) => (
                  <div key={key} className="rounded-md p-2.5" style={{ background: "rgba(255,255,255,0.015)", border: `1px solid ${BORDER}` }}>
                    <div className="text-[8px] uppercase tracking-widest mb-1" style={{ color: "rgba(148,163,184,0.3)" }}>
                      {key.replace(/_/g, " ")}
                    </div>
                    <div className="text-[12px] font-semibold" style={{
                      ...MONO,
                      color: key.includes("recommendation") || key === "worth_it"
                        ? (String(val).toLowerCase().includes("go") || val === true ? "#10b981" : "#f59e0b")
                        : typeof val === "number" ? (val >= 0 ? "#e2e8f0" : "#ef4444") : "#e2e8f0"
                    }}>
                      {typeof val === "number" ? (key.includes("pct") ? `${val}%` : fmt$(val)) : String(val)}
                    </div>
                  </div>
                ))}
              </div>
              {/* Cost Breakdown if present */}
              {result.financial_model.cost_breakdown && (
                <div className="mt-3 pt-3" style={{ borderTop: `1px solid ${BORDER}` }}>
                  <div className="text-[9px] uppercase tracking-widest mb-2" style={{ color: "rgba(148,163,184,0.3)" }}>Cost Breakdown</div>
                  <div className="flex flex-wrap gap-3">
                    {Object.entries(result.financial_model.cost_breakdown).map(([k, v]: any) => (
                      <span key={k} className="text-[10px]" style={{ ...MONO, color: "rgba(148,163,184,0.5)" }}>
                        {k.replace(/_/g, " ")}: <span style={{ color: "#e2e8f0" }}>{fmt$(v)}</span>
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Resort Context */}
          <div className="grid grid-cols-4 gap-2">
            {Object.entries(result.baseline_context).map(([k, v]: any) => (
              <div key={k} className="rounded-md p-2" style={{ background: "rgba(255,255,255,0.01)", border: `1px solid rgba(255,255,255,0.03)` }}>
                <div className="text-[8px] uppercase tracking-widest" style={{ color: "rgba(148,163,184,0.2)" }}>{k.replace(/_/g, " ")}</div>
                <div className="text-[10px] font-medium" style={{ ...MONO, color: "rgba(148,163,184,0.4)" }}>{typeof v === "number" ? (k.includes("revenue") || k.includes("ebitda") ? fmt$(v) : v) : v}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Event Feasibility Result */}
      {feasibility && <FeasibilityResult data={feasibility} />}
    </div>
  );
}

function FeasibilityResult({ data: f }: { data: any }) {
  const verdictColor = f.verdict === "GO" ? "#10b981" : f.verdict === "NOT WORTH IT" ? "#ef4444" : "#f59e0b";
  return (
    <div className="space-y-4" data-testid="feasibility-result">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-sm font-semibold text-white">{f.name}</div>
          <div className="text-[10px]" style={{ ...MONO, color: "rgba(148,163,184,0.4)" }}>{f.event_type.replace(/_/g, " ")}</div>
        </div>
        <div className="text-center px-4 py-2 rounded-lg" style={{ background: `${verdictColor}10`, border: `1px solid ${verdictColor}30` }}>
          <div className="text-lg font-bold" style={{ ...MONO, color: verdictColor }}>{f.verdict}</div>
          <div className="text-[9px]" style={{ ...MONO, color: "rgba(148,163,184,0.4)" }}>
            {f.profitability.margin_pct}% margin
          </div>
        </div>
      </div>

      <div className="grid grid-cols-5 gap-2">
        <KPICard label="Revenue" value={fmt$(f.revenue.total)} delta={`${fmt$(f.revenue.per_cover)}/cover`} positive />
        <KPICard label="Total Cost" value={fmt$(f.costs.total)} delta={`${fmt$(f.costs.per_cover)}/cover`} />
        <KPICard label="Profit" value={fmt$(f.profitability.profit)} positive={f.profitability.profit > 0} />
        <KPICard label="Breakeven" value={`${f.breakeven_covers} covers`} positive={f.breakeven_covers <= f.revenue.total / (f.revenue.per_cover || 1)} />
        <KPICard label="Annual (Series)" value={fmt$(f.series_impact.annual_profit)} delta={`${f.series_impact.events_per_year} events`} positive={f.series_impact.annual_profit > 0} />
      </div>

      {/* Cost Waterfall */}
      <div className="rounded-lg p-4" style={{ background: SURFACE, border: `1px solid ${BORDER}` }}>
        <div className="text-[10px] uppercase tracking-widest mb-3" style={{ ...MONO, color: "rgba(200,169,126,0.5)" }}>
          Cost Breakdown
        </div>
        <div className="space-y-1.5">
          {Object.entries(f.costs).filter(([k]) => !["total", "per_cover"].includes(k) && (f.costs[k] as number) > 0).map(([key, val]: any) => {
            const pct = f.costs.total > 0 ? val / f.costs.total * 100 : 0;
            return (
              <div key={key} className="flex items-center gap-3">
                <span className="text-[10px] w-24 capitalize" style={{ color: "rgba(148,163,184,0.5)" }}>{key.replace(/_/g, " ")}</span>
                <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.03)" }}>
                  <div className="h-full rounded-full" style={{ width: `${pct}%`, background: ACCENT, opacity: 0.6 }} />
                </div>
                <span className="text-[10px] w-16 text-right" style={{ ...MONO, color: "#e2e8f0" }}>{fmt$(val)}</span>
                <span className="text-[9px] w-10 text-right" style={{ ...MONO, color: "rgba(148,163,184,0.3)" }}>{pct.toFixed(0)}%</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Risk Factors */}
      <div className="space-y-1">
        {f.risk_factors.map((r: string, i: number) => (
          <div key={i} className="flex items-start gap-2 text-[10px] p-2 rounded" style={{ background: "rgba(245,158,11,0.03)", border: `1px solid rgba(245,158,11,0.08)` }}>
            <AlertTriangle className="w-3 h-3 mt-0.5 shrink-0" style={{ color: "#f59e0b" }} />
            <span style={{ color: "rgba(226,232,240,0.6)" }}>{r}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─── Project Analysis (New Restaurant, Venue) ── */

function ProjectView() {
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    name: "Pool Deck Restaurant", project_type: "new_restaurant",
    build_cost: 750000, ff_e_cost: 150000, pre_opening_cost: 75000,
    seats: 80, turns_per_day: 2.0, avg_check: 85,
    operating_days_per_year: 350, food_cost_pct: 18, labor_cost_pct: 28,
    occupancy_cost_pct: 8, marketing_pct: 3,
    foh_staff: 14, boh_staff: 10, management: 2, avg_hourly_rate: 22,
    year1_ramp_pct: 65, year2_ramp_pct: 85, mature_occupancy_pct: 95,
    has_bar: true, bar_revenue_pct: 25,
  });

  const analyze = async () => {
    setLoading(true);
    const r = await SP("/project/analyze", form);
    setResult(r);
    setLoading(false);
  };

  const u = (key: string, val: any) => setForm(p => ({ ...p, [key]: val }));

  return (
    <div className="p-6 space-y-5" data-testid="projects-view">
      <SectionLabel label="Major Project Analysis — 5-Year Pro Forma" />

      {/* Project Config */}
      <div className="rounded-lg p-4 space-y-3" style={{ background: SURFACE, border: `1px solid ${BORDER}` }} data-testid="project-inputs">
        <div className="grid grid-cols-5 gap-3">
          <div className="col-span-2">
            <div className="text-[9px] mb-1" style={{ color: "rgba(148,163,184,0.4)" }}>Project Name</div>
            <input type="text" value={form.name} onChange={e => u("name", e.target.value)}
              className="w-full px-2 py-1.5 rounded text-[11px] outline-none"
              style={{ ...MONO, background: "rgba(255,255,255,0.03)", border: `1px solid ${BORDER}`, color: "#e2e8f0" }} />
          </div>
          <div>
            <div className="text-[9px] mb-1" style={{ color: "rgba(148,163,184,0.4)" }}>Type</div>
            <select value={form.project_type} onChange={e => u("project_type", e.target.value)}
              className="w-full px-2 py-1.5 rounded text-[11px] outline-none"
              style={{ ...MONO, background: "rgba(255,255,255,0.03)", border: `1px solid ${BORDER}`, color: "#e2e8f0" }}>
              {["new_restaurant","venue_renovation","new_bar","kitchen_expansion","pool_venue","rooftop_concept","retail_shop"].map(t => (
                <option key={t} value={t} style={{ background: "#0a0d14" }}>{t.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase())}</option>
              ))}
            </select>
          </div>
          <div>
            <div className="text-[9px] mb-1" style={{ color: "rgba(148,163,184,0.4)" }}>Seats</div>
            <input type="number" value={form.seats} onChange={e => u("seats", parseInt(e.target.value) || 0)}
              className="w-full px-2 py-1.5 rounded text-[11px] outline-none"
              style={{ ...MONO, background: "rgba(255,255,255,0.03)", border: `1px solid ${BORDER}`, color: "#e2e8f0" }} />
          </div>
          <div>
            <div className="text-[9px] mb-1" style={{ color: "rgba(148,163,184,0.4)" }}>Avg Check ($)</div>
            <input type="number" value={form.avg_check} onChange={e => u("avg_check", parseFloat(e.target.value) || 0)}
              className="w-full px-2 py-1.5 rounded text-[11px] outline-none"
              style={{ ...MONO, background: "rgba(255,255,255,0.03)", border: `1px solid ${BORDER}`, color: "#e2e8f0" }} />
          </div>
        </div>
        <div className="grid grid-cols-6 gap-3">
          {[
            { key: "build_cost", label: "Build Cost ($)", min: 100000, max: 3000000, step: 25000 },
            { key: "ff_e_cost", label: "FF&E ($)", min: 10000, max: 500000, step: 10000 },
            { key: "food_cost_pct", label: "Food Cost %", min: 10, max: 35, step: 0.5 },
            { key: "labor_cost_pct", label: "Labor %", min: 15, max: 40, step: 0.5 },
            { key: "turns_per_day", label: "Turns/Day", min: 0.5, max: 4, step: 0.25 },
            { key: "year1_ramp_pct", label: "Year 1 Ramp %", min: 30, max: 100, step: 5 },
          ].map(s => (
            <div key={s.key}>
              <div className="text-[9px] mb-1" style={{ color: "rgba(148,163,184,0.4)" }}>{s.label}</div>
              <div className="flex items-center gap-1.5">
                <input type="range" min={s.min} max={s.max} step={s.step}
                  value={(form as any)[s.key]}
                  onChange={e => u(s.key, parseFloat(e.target.value))}
                  className="flex-1 h-1 appearance-none rounded-full cursor-pointer"
                  style={{ accentColor: ACCENT, background: BORDER }} />
                <span className="text-[9px] w-14 text-right" style={{ ...MONO, color: ACCENT }}>
                  {s.key.includes("cost") && !s.key.includes("pct") ? fmt$(((form as any)[s.key])) : (form as any)[s.key]}
                  {s.key.includes("pct") ? "%" : ""}
                </span>
              </div>
            </div>
          ))}
        </div>
        <button onClick={analyze} disabled={loading} data-testid="run-project"
          className="px-4 py-2 rounded text-[11px] font-medium"
          style={{ background: ACCENT_DIM, color: ACCENT, border: `1px solid rgba(200,169,126,0.3)` }}>
          {loading ? "Analyzing..." : "Run 5-Year Pro Forma"}
        </button>
      </div>

      {result && (
        <>
          {/* Investment Summary */}
          <div className="grid grid-cols-6 gap-2">
            <KPICard label="Total Investment" value={fmt$(result.investment.total)} />
            <KPICard label="Annual Revenue (Mature)" value={fmt$(result.revenue_model.annual_revenue_at_maturity)} positive />
            <KPICard label="Breakeven" value={`${result.breakeven_months} mo`} positive={result.breakeven_months < 36} />
            <KPICard label="NPV" value={fmt$(result.npv)} positive={result.npv > 0} />
            <KPICard label="5-Year EBITDA" value={fmt$(result.total_5yr_ebitda)} positive />
            <div className="rounded-lg p-3.5 flex flex-col items-center justify-center" style={{
              background: result.recommendation === "Invest" ? "rgba(16,185,129,0.06)" : result.recommendation === "Decline" ? "rgba(239,68,68,0.06)" : "rgba(245,158,11,0.06)",
              border: `1px solid ${result.recommendation === "Invest" ? "rgba(16,185,129,0.2)" : result.recommendation === "Decline" ? "rgba(239,68,68,0.2)" : "rgba(245,158,11,0.2)"}`,
            }}>
              <div className="text-[9px] uppercase tracking-widest mb-1" style={{ ...MONO, color: "rgba(148,163,184,0.35)" }}>Decision</div>
              <div className="text-lg font-bold" style={{
                ...MONO, color: result.recommendation === "Invest" ? "#10b981" : result.recommendation === "Decline" ? "#ef4444" : "#f59e0b",
              }}>{result.recommendation}</div>
            </div>
          </div>

          {/* 5-Year Pro Forma */}
          <div className="rounded-lg overflow-hidden" style={{ background: SURFACE, border: `1px solid ${BORDER}` }} data-testid="proforma-table">
            <div className="p-3 text-[10px] uppercase tracking-widest" style={{ ...MONO, color: "rgba(200,169,126,0.5)" }}>
              5-Year Pro Forma
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-[10px]" style={MONO}>
                <thead>
                  <tr style={{ borderBottom: `1px solid ${BORDER}` }}>
                    <th className="text-left px-3 py-2" style={{ color: "rgba(200,169,126,0.5)" }}>Metric</th>
                    {result.five_year_proforma.map((y: any) => (
                      <th key={y.year} className="text-right px-3 py-2" style={{ color: "rgba(148,163,184,0.4)" }}>Year {y.year}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {[
                    { label: "Occupancy", field: "occupancy_pct", fmt: (v: number) => `${v}%`, accent: false },
                    { label: "Revenue", field: "revenue", fmt: fmt$, accent: true },
                    { label: "Food Cost", field: "food_cost", fmt: fmt$, accent: false },
                    { label: "Labor", field: "labor", fmt: fmt$, accent: false },
                    { label: "Total Cost", field: "total_cost", fmt: fmt$, accent: false },
                    { label: "EBITDA", field: "ebitda", fmt: fmt$, accent: true },
                    { label: "EBITDA %", field: "ebitda_margin_pct", fmt: (v: number) => `${v}%`, accent: true },
                    { label: "Cumulative CF", field: "cumulative_cash_flow", fmt: fmt$, accent: false },
                  ].map(row => (
                    <tr key={row.label} style={{ borderTop: row.accent ? `1px solid ${BORDER}` : undefined }}>
                      <td className="px-3 py-1.5" style={{ color: row.accent ? ACCENT : "rgba(148,163,184,0.4)", fontWeight: row.accent ? 600 : 400 }}>
                        {row.label}
                      </td>
                      {result.five_year_proforma.map((y: any) => (
                        <td key={y.year} className="text-right px-3 py-1.5" style={{
                          color: row.accent ? "rgba(200,169,126,0.8)" : row.field === "cumulative_cash_flow"
                            ? (y[row.field] >= 0 ? "rgba(16,185,129,0.7)" : "rgba(239,68,68,0.7)")
                            : "rgba(148,163,184,0.5)",
                          fontWeight: row.accent ? 500 : 400,
                        }}>
                          {row.fmt(y[row.field])}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Sensitivity Analysis */}
          <div className="rounded-lg p-4" style={{ background: SURFACE, border: `1px solid ${BORDER}` }} data-testid="sensitivity">
            <div className="text-[10px] uppercase tracking-widest mb-3" style={{ ...MONO, color: "rgba(200,169,126,0.5)" }}>
              Sensitivity Analysis — Avg Check Impact on Breakeven
            </div>
            <div className="grid grid-cols-7 gap-1.5">
              {result.sensitivity.map((s: any) => {
                const isBase = s.avg_check === form.avg_check;
                return (
                  <div key={s.avg_check} className="rounded-lg p-2.5 text-center" style={{
                    background: isBase ? "rgba(200,169,126,0.06)" : "rgba(255,255,255,0.015)",
                    border: `1px solid ${isBase ? "rgba(200,169,126,0.2)" : BORDER}`,
                  }}>
                    <div className="text-[11px] font-bold mb-1" style={{ ...MONO, color: isBase ? ACCENT : "rgba(148,163,184,0.5)" }}>
                      ${s.avg_check}
                    </div>
                    <div className="text-[8px] uppercase mb-1" style={{ color: "rgba(148,163,184,0.3)" }}>avg check</div>
                    <div className="text-[10px]" style={{ ...MONO, color: s.breakeven_months < 36 ? "#10b981" : "#f59e0b" }}>
                      {s.breakeven_months} mo
                    </div>
                    <div className="text-[8px]" style={{ color: "rgba(148,163,184,0.2)" }}>breakeven</div>
                    <div className="text-[9px] mt-1" style={{ ...MONO, color: "rgba(148,163,184,0.4)" }}>{fmt$(s.annual_ebitda)}</div>
                    <div className="text-[8px]" style={{ color: "rgba(148,163,184,0.2)" }}>EBITDA</div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Staffing Summary */}
          <div className="rounded-lg p-4" style={{ background: SURFACE, border: `1px solid ${BORDER}` }}>
            <div className="text-[10px] uppercase tracking-widest mb-3" style={{ ...MONO, color: "rgba(200,169,126,0.5)" }}>
              Staffing Model
            </div>
            <div className="grid grid-cols-4 gap-3">
              <MiniKPI label="FOH Staff" value={String(result.staffing.foh)} />
              <MiniKPI label="BOH Staff" value={String(result.staffing.boh)} />
              <MiniKPI label="Management" value={String(result.staffing.management)} />
              <MiniKPI label="Annual Labor" value={fmt$(result.staffing.annual_labor_cost)} />
            </div>
          </div>
        </>
      )}
    </div>
  );
}


/* ─── EchoAurum Actuals Bridge ────────────────── */

function AurumView() {
  const [actuals, setActuals] = useState<any>(null);
  const [bridge, setBridge] = useState<any>(null);
  const [outletData, setOutletData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      S("/aurum/actuals"),
      S("/aurum/actuals/by-outlet"),
      S("/budget/list"),
    ]).then(async ([act, outlets, budgetList]) => {
      setActuals(act);
      setOutletData(outlets);
      if (budgetList.budgets?.length > 0) {
        const br = await S(`/aurum/budget-bridge/${budgetList.budgets[0].id}`);
        setBridge(br);
      }
      setLoading(false);
    });
  }, []);

  if (loading) return <Loading />;

  const a = actuals?.annual;

  return (
    <div className="p-6 space-y-5" data-testid="aurum-view">
      <div className="flex items-center justify-between">
        <SectionLabel label="EchoAurum — GL Actuals Bridge" />
        <div className="text-[10px]" style={{ ...MONO, color: "rgba(148,163,184,0.4)" }}>
          Source: {actuals?.data_points?.gl_entries} GL entries | {actuals?.data_points?.labor_records} labor | {actuals?.data_points?.events} events
        </div>
      </div>

      {/* Actual KPIs */}
      {a && (
        <div className="grid grid-cols-6 gap-2">
          <KPICard label="Actual Revenue" value={fmt$(a.total_revenue)} positive />
          <KPICard label="Actual EBITDA" value={fmt$(a.total_ebitda)} delta={`${a.ebitda_margin_pct}%`} positive />
          <KPICard label="Food Cost" value={fmt$(a.total_food_cost)} delta={`${a.food_cost_pct}%`} positive={a.food_cost_pct <= 20} />
          <KPICard label="Bev Cost" value={fmt$(a.total_beverage_cost)} />
          <KPICard label="Labor" value={fmt$(a.total_labor)} delta={`${a.labor_pct}%`} positive={a.labor_pct <= 30} />
          <KPICard label="Covers" value={a.total_covers?.toLocaleString()} />
        </div>
      )}

      {/* Budget-to-Actual Bridge */}
      {bridge && (
        <div className="rounded-lg p-4" style={{ background: SURFACE, border: `1px solid ${BORDER}` }} data-testid="budget-bridge">
          <div className="flex items-center justify-between mb-3">
            <div className="text-[10px] uppercase tracking-widest" style={{ ...MONO, color: "rgba(200,169,126,0.5)" }}>
              Budget vs Actual Bridge — {bridge.budget_name}
            </div>
            <span className="text-[9px] px-2 py-0.5 rounded" style={{ ...MONO, background: "rgba(200,169,126,0.08)", color: ACCENT }}>
              Month {bridge.current_month} of 12
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-[10px]" style={MONO}>
              <thead>
                <tr style={{ borderBottom: `1px solid ${BORDER}` }}>
                  <th className="text-left px-3 py-2" style={{ color: "rgba(200,169,126,0.5)" }}>Metric</th>
                  {MONTH_LABELS.slice(0, Math.min(bridge.current_month, 12)).map(m => (
                    <th key={m} className="text-right px-2 py-2" style={{ color: "rgba(148,163,184,0.4)" }}>{m}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {["revenue", "food_cost", "labor", "ebitda"].map(metric => (
                  <React.Fragment key={metric}>
                    <tr>
                      <td className="px-3 py-1" style={{ color: ACCENT, fontWeight: 600 }}>{metric.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase())} (Budget)</td>
                      {MONTH_LABELS.slice(0, Math.min(bridge.current_month, 12)).map((_, i) => (
                        <td key={i} className="text-right px-2 py-1" style={{ color: "rgba(148,163,184,0.5)" }}>
                          {bridge.monthly_bridge[String(i + 1)]?.[metric]?.budget ? fmt$Short(bridge.monthly_bridge[String(i + 1)][metric].budget) : "–"}
                        </td>
                      ))}
                    </tr>
                    <tr>
                      <td className="px-3 py-1" style={{ color: "rgba(148,163,184,0.4)" }}>{metric.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase())} (Actual)</td>
                      {MONTH_LABELS.slice(0, Math.min(bridge.current_month, 12)).map((_, i) => {
                        const v = bridge.monthly_bridge[String(i + 1)]?.[metric];
                        return (
                          <td key={i} className="text-right px-2 py-1" style={{
                            color: v?.status === "favorable" ? "rgba(16,185,129,0.7)" : v?.status === "unfavorable" ? "rgba(239,68,68,0.7)" : "rgba(148,163,184,0.4)"
                          }}>
                            {v?.actual ? fmt$Short(v.actual) : "–"}
                          </td>
                        );
                      })}
                    </tr>
                    <tr style={{ borderBottom: `1px solid rgba(255,255,255,0.03)` }}>
                      <td className="px-3 py-1 text-[9px]" style={{ color: "rgba(148,163,184,0.3)" }}>Variance</td>
                      {MONTH_LABELS.slice(0, Math.min(bridge.current_month, 12)).map((_, i) => {
                        const v = bridge.monthly_bridge[String(i + 1)]?.[metric];
                        return (
                          <td key={i} className="text-right px-2 py-1 text-[9px]" style={{
                            color: v?.status === "favorable" ? "rgba(16,185,129,0.5)" : "rgba(239,68,68,0.5)"
                          }}>
                            {v?.variance_pct !== undefined ? `${v.variance_pct > 0 ? "+" : ""}${v.variance_pct}%` : "–"}
                          </td>
                        );
                      })}
                    </tr>
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-3 text-[9px]" style={{ ...MONO, color: "rgba(148,163,184,0.3)" }}>
            Data quality: {bridge.data_quality?.coverage} ({bridge.data_quality?.gl_entries_used} GL, {bridge.data_quality?.labor_records_used} labor, {bridge.data_quality?.events_counted} events)
          </div>
        </div>
      )}

      {/* Outlet Actuals */}
      {outletData && (
        <div className="rounded-lg p-4" style={{ background: SURFACE, border: `1px solid ${BORDER}` }} data-testid="outlet-actuals">
          <div className="text-[10px] uppercase tracking-widest mb-3" style={{ ...MONO, color: "rgba(200,169,126,0.5)" }}>
            Revenue by Outlet (GL Actuals)
          </div>
          <div className="space-y-2">
            {outletData.outlets?.map((o: any) => {
              const maxRev = Math.max(...(outletData.outlets?.map((x: any) => x.revenue) || [1]));
              return (
                <div key={o.outlet_id} className="flex items-center gap-3 py-1.5">
                  <span className="text-[11px] text-white w-36 font-medium">{o.name}</span>
                  <span className="text-[9px] w-16" style={{ ...MONO, color: "rgba(148,163,184,0.35)" }}>{o.type}</span>
                  <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.03)" }}>
                    <div className="h-full rounded-full" style={{ width: `${o.revenue / maxRev * 100}%`, background: `linear-gradient(90deg, ${ACCENT}, rgba(200,169,126,0.4))` }} />
                  </div>
                  <span className="text-[10px] w-20 text-right" style={{ ...MONO, color: "#e2e8f0" }}>{fmt$(o.revenue)}</span>
                  <span className="text-[10px] w-14 text-right" style={{ ...MONO, color: o.food_cost_pct > 20 ? "#ef4444" : "rgba(16,185,129,0.6)" }}>
                    {o.food_cost_pct}% FC
                  </span>
                  <span className="text-[10px] w-14 text-right" style={{ ...MONO, color: "rgba(200,169,126,0.5)" }}>${o.avg_check.toFixed(0)}/chk</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── POS/GL Integrations Hub ─────────────────── */

function IntegrationsView() {
  const [status, setStatus] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${window.location.origin}/api/pos-gl/status`)
      .then(r => r.json())
      .then(d => { setStatus(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  if (loading) return <Loading />;

  const integrations = status?.integrations || [];

  return (
    <div className="p-6 space-y-5" data-testid="integrations-view">
      <div className="flex items-center justify-between">
        <SectionLabel label="POS & GL Integration Hub" />
        <div className="flex items-center gap-2">
          <button onClick={() => window.open(`${window.location.origin}/api/echo-stratus/report/data-export`, '_blank')}
            data-testid="export-data-btn"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded text-[10px]"
            style={{ ...MONO, background: SURFACE, color: "rgba(148,163,184,0.5)", border: `1px solid ${BORDER}` }}>
            <FileText className="w-3 h-3" /> Export JSON
          </button>
        </div>
      </div>

      {/* Integration Cards */}
      <div className="grid grid-cols-2 gap-3">
        {integrations.map((intg: any) => {
          const isConnected = intg.status === "connected";
          return (
            <div key={intg.name} className="rounded-lg p-5" style={{ background: SURFACE, border: `1px solid ${BORDER}` }}>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{
                    background: isConnected ? "rgba(16,185,129,0.1)" : "rgba(148,163,184,0.05)",
                    border: `1px solid ${isConnected ? "rgba(16,185,129,0.2)" : BORDER}`,
                  }}>
                    <Layers className="w-5 h-5" style={{ color: isConnected ? "#10b981" : "rgba(148,163,184,0.3)" }} />
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-white">{intg.name}</div>
                    <div className="text-[10px]" style={{ color: "rgba(148,163,184,0.4)" }}>{intg.type}</div>
                  </div>
                </div>
                <span className={`text-[9px] px-2 py-1 rounded uppercase font-medium`} style={{
                  ...MONO,
                  background: isConnected ? "rgba(16,185,129,0.1)" : "rgba(245,158,11,0.1)",
                  color: isConnected ? "#10b981" : "#f59e0b",
                  border: `1px solid ${isConnected ? "rgba(16,185,129,0.2)" : "rgba(245,158,11,0.2)"}`,
                }}>
                  {intg.status}
                </span>
              </div>

              {/* Sync Details */}
              <div className="grid grid-cols-3 gap-2">
                <MiniKPI label="Last Sync" value={intg.last_sync ? new Date(intg.last_sync).toLocaleDateString() : "–"} />
                <MiniKPI label="Records" value={intg.records_synced?.toLocaleString() || "0"} />
                <MiniKPI label="Health" value={intg.health || (isConnected ? "Good" : "Idle")} />
              </div>

              {/* Capabilities */}
              {intg.capabilities && (
                <div className="mt-3 pt-3 flex flex-wrap gap-1.5" style={{ borderTop: `1px solid ${BORDER}` }}>
                  {intg.capabilities.map((cap: string, i: number) => (
                    <span key={i} className="text-[8px] px-1.5 py-0.5 rounded" style={{
                      ...MONO, background: "rgba(255,255,255,0.02)", border: `1px solid rgba(255,255,255,0.04)`, color: "rgba(148,163,184,0.35)"
                    }}>
                      {cap}
                    </span>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Data Flow Diagram */}
      <div className="rounded-lg p-4" style={{ background: "rgba(200,169,126,0.03)", border: `1px solid rgba(200,169,126,0.1)` }}>
        <div className="text-[10px] uppercase tracking-widest mb-3" style={{ ...MONO, color: ACCENT }}>
          Data Flow Architecture
        </div>
        <div className="flex items-center justify-between gap-3 py-2">
          {[
            { label: "Toast POS", sub: "Sales, Checks, Items" },
            { label: "QuickBooks", sub: "GL, AP, AR" },
            { label: "EchoAurum", sub: "Journal Entries" },
            { label: "EchoStratus", sub: "Budget, Forecast, AI" },
            { label: "Board Report", sub: "PDF Export" },
          ].map((step, i) => (
            <React.Fragment key={i}>
              <div className="flex-1 rounded-lg p-3 text-center" style={{ background: SURFACE, border: `1px solid ${BORDER}` }}>
                <div className="text-[11px] font-medium text-white">{step.label}</div>
                <div className="text-[8px]" style={{ color: "rgba(148,163,184,0.3)" }}>{step.sub}</div>
              </div>
              {i < 4 && <ChevronRight className="w-4 h-4 shrink-0" style={{ color: "rgba(200,169,126,0.3)" }} />}
            </React.Fragment>
          ))}
        </div>
      </div>

      {/* OAuth Setup Instructions */}
      <div className="rounded-lg p-4" style={{ background: SURFACE, border: `1px solid ${BORDER}` }}>
        <div className="text-[10px] uppercase tracking-widest mb-2" style={{ ...MONO, color: "rgba(200,169,126,0.5)" }}>
          Integration Setup
        </div>
        <div className="text-[11px] leading-relaxed" style={{ color: "rgba(148,163,184,0.5)" }}>
          POS and GL integrations are pre-configured for sandbox mode. When ready for production, provide OAuth credentials
          via the Admin settings panel. Toast requires Restaurant-365 API key; QuickBooks requires OAuth 2.0 app credentials
          from the Intuit Developer Portal. Both will auto-sync daily once connected with live keys.
        </div>
      </div>
    </div>
  );
}


/* ─── Monthly P&L Review ──────────────────────── */

function DeltaBadge({ value, pct, invert }: { value?: number | null; pct?: number | null; invert?: boolean }) {
  if (value === null || value === undefined || pct === null || pct === undefined) return null;
  const isGood = invert ? pct < 0 : pct > 0;
  const color = isGood ? "#10b981" : pct === 0 ? "rgba(148,163,184,0.4)" : "#ef4444";
  return (
    <span className="inline-flex items-center gap-0.5 text-[9px] px-1 py-0.5 rounded" style={{ ...MONO, background: `${color}10`, color }}>
      {pct > 0 ? <ArrowUpRight className="w-2.5 h-2.5" /> : pct < 0 ? <ArrowDownRight className="w-2.5 h-2.5" /> : null}
      {pct > 0 ? "+" : ""}{pct}%
    </span>
  );
}

function ComparisonRow({ label, current, mom, yoy, isCost }: { label: string; current: string; mom: any; yoy: any; isCost?: boolean }) {
  return (
    <div className="flex items-center gap-3 py-1.5" style={{ borderBottom: `1px solid rgba(255,255,255,0.02)` }}>
      <span className="text-[10px] w-28" style={{ color: "rgba(148,163,184,0.5)" }}>{label}</span>
      <span className="text-[11px] w-24 font-semibold text-white" style={MONO}>{current}</span>
      <div className="flex items-center gap-1 w-32">
        <span className="text-[8px] uppercase tracking-widest" style={{ ...MONO, color: "rgba(200,169,126,0.35)" }}>MoM</span>
        {mom?.delta_pct !== null && mom?.delta_pct !== undefined
          ? <DeltaBadge value={mom.delta} pct={mom.delta_pct} invert={isCost} />
          : <span className="text-[9px]" style={{ color: "rgba(148,163,184,0.2)" }}>—</span>}
      </div>
      <div className="flex items-center gap-1 w-32">
        <span className="text-[8px] uppercase tracking-widest" style={{ ...MONO, color: "rgba(200,169,126,0.35)" }}>YoY</span>
        {yoy?.delta_pct !== null && yoy?.delta_pct !== undefined
          ? <DeltaBadge value={yoy.delta} pct={yoy.delta_pct} invert={isCost} />
          : <span className="text-[9px]" style={{ color: "rgba(148,163,184,0.2)" }}>—</span>}
      </div>
    </div>
  );
}

function MonthlyReviewView() {
  const [review, setReview] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [expandedOutlet, setExpandedOutlet] = useState<string | null>(null);
  const [schedStatus, setSchedStatus] = useState<any>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [showHistory, setShowHistory] = useState(false);

  useEffect(() => {
    S("/scheduler/status").then(setSchedStatus).catch(() => {});
    S("/reviews/history").then((d: any) => setHistory(d.reviews || [])).catch(() => {});
  }, []);

  const generate = async () => {
    setLoading(true);
    setReview(null);
    const r = await SP("/monthly-review/generate", { month, year: 2026 });
    setReview(r);
    setLoading(false);
    S("/reviews/history").then((d: any) => setHistory(d.reviews || [])).catch(() => {});
  };

  const loadReview = async (rid: string) => {
    setLoading(true);
    setReview(null);
    setShowHistory(false);
    const r = await S(`/reviews/${rid}?role=executive`);
    setReview(r);
    setLoading(false);
  };

  const comp = review?.comparisons;

  return (
    <div className="p-6 space-y-5" data-testid="review-view">
      {/* Header */}
      <div className="flex items-center justify-between">
        <SectionLabel label="End-of-Month P&L Review" />
        <div className="flex items-center gap-2">
          {schedStatus?.running && (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md mr-2" style={{ background: "rgba(16,185,129,0.06)", border: "1px solid rgba(16,185,129,0.12)" }}
              data-testid="scheduler-badge">
              <Clock className="w-3 h-3" style={{ color: "#10b981" }} />
              <span className="text-[9px]" style={{ ...MONO, color: "#10b981" }}>Auto-scheduled 1st of month</span>
            </div>
          )}
          <button onClick={() => setShowHistory(!showHistory)}
            className="px-3 py-1.5 rounded text-[11px]"
            style={{ background: SURFACE, color: "rgba(148,163,184,0.6)", border: `1px solid ${BORDER}` }}
            data-testid="toggle-history">
            <FileText className="w-3.5 h-3.5 inline mr-1" />History ({history.length})
          </button>
          <select value={month} onChange={e => setMonth(parseInt(e.target.value))}
            className="px-2 py-1.5 rounded text-[11px] outline-none"
            style={{ ...MONO, background: SURFACE, border: `1px solid ${BORDER}`, color: "#e2e8f0" }}>
            {MONTH_LABELS.map((m, i) => <option key={i} value={i + 1} style={{ background: "#0a0d14" }}>{m} 2026</option>)}
          </select>
          <button onClick={generate} disabled={loading} data-testid="generate-review"
            className="px-4 py-1.5 rounded text-[11px] font-medium"
            style={{ background: ACCENT_DIM, color: ACCENT, border: `1px solid rgba(200,169,126,0.3)` }}>
            {loading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : "Generate Review"}
          </button>
        </div>
      </div>

      {/* Review History Drawer */}
      {showHistory && history.length > 0 && (
        <div className="rounded-lg p-4" style={{ background: SURFACE, border: `1px solid ${BORDER}` }} data-testid="review-history">
          <div className="text-[10px] uppercase tracking-widest mb-3" style={{ ...MONO, color: "rgba(200,169,126,0.5)" }}>
            Stored Reviews
          </div>
          <div className="grid grid-cols-4 gap-2">
            {history.map((h: any) => (
              <button key={h.review_id} onClick={() => loadReview(h.review_id)}
                className="rounded-lg p-3 text-left transition-all hover:brightness-125"
                style={{ background: "rgba(255,255,255,0.015)", border: `1px solid ${BORDER}` }}>
                <div className="text-xs font-semibold text-white">{h.month_name} {h.year}</div>
                <div className="text-[10px] mt-1" style={{ ...MONO, color: "rgba(148,163,184,0.5)" }}>
                  Rev {fmt$(h.resort_pnl?.revenue || 0)}
                </div>
                <div className="text-[10px]" style={{ ...MONO, color: h.health_summary?.overall_score >= 75 ? "#10b981" : "#f59e0b" }}>
                  Health: {h.health_summary?.overall_score}/100
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {loading && (
        <div className="flex flex-col items-center gap-3 py-16">
          <RefreshCw className="w-6 h-6 animate-spin" style={{ color: ACCENT }} />
          <span className="text-xs" style={{ color: "rgba(148,163,184,0.5)" }}>EchoAI analyzing resort performance...</span>
          <span className="text-[10px]" style={{ color: "rgba(148,163,184,0.3)" }}>Reviewing GL entries, events, weather, occupancy patterns...</span>
        </div>
      )}

      {review && (
        <div className="space-y-5">
          {/* Distribution Info */}
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg" style={{ background: "rgba(200,169,126,0.04)", border: "1px solid rgba(200,169,126,0.1)" }}
            data-testid="distribution-info">
            <Users className="w-3.5 h-3.5" style={{ color: ACCENT }} />
            <span className="text-[10px]" style={{ color: "rgba(200,169,126,0.6)" }}>
              Distributed: Outlet Managers receive their department only. Directors & Executives receive full resort P&L.
            </span>
            {review.generated_at && (
              <span className="ml-auto text-[9px]" style={{ ...MONO, color: "rgba(148,163,184,0.3)" }}>
                Generated: {new Date(review.generated_at).toLocaleString()}
              </span>
            )}
          </div>

          {/* Resort Summary KPIs */}
          <div className="grid grid-cols-7 gap-2">
            <KPICard label="Revenue" value={fmt$(review.resort_pnl.revenue)} positive
              delta={comp?.mom?.revenue?.delta_pct != null ? `MoM ${comp.mom.revenue.delta_pct > 0 ? "+" : ""}${comp.mom.revenue.delta_pct}%` : undefined} />
            <KPICard label="EBITDA" value={fmt$(review.resort_pnl.ebitda)} positive
              delta={`${review.resort_pnl.ebitda_margin_pct}%${comp?.mom?.ebitda?.delta_pct != null ? ` (MoM ${comp.mom.ebitda.delta_pct > 0 ? "+" : ""}${comp.mom.ebitda.delta_pct}%)` : ""}`} />
            <KPICard label="Food %" value={`${review.resort_pnl.food_cost_pct}%`} positive={review.resort_pnl.food_cost_pct <= 20} />
            <KPICard label="Labor %" value={`${review.resort_pnl.labor_pct}%`} positive={review.resort_pnl.labor_pct <= 30} />
            <KPICard label="Events" value={String(review.resort_pnl.total_events)} />
            <KPICard label="Covers" value={review.resort_pnl.total_covers.toLocaleString()} />
            <KPICard label="Avg Check" value={`$${review.resort_pnl.avg_check.toFixed(0)}`} />
          </div>

          {/* MoM / YoY Comparison Table */}
          {comp && (comp.mom_available || comp.yoy_available) && (
            <div className="rounded-lg p-4" style={{ background: SURFACE, border: `1px solid ${BORDER}` }} data-testid="comparison-table">
              <div className="flex items-center gap-3 mb-3">
                <TrendingUp className="w-3.5 h-3.5" style={{ color: ACCENT }} />
                <span className="text-[10px] uppercase tracking-widest" style={{ ...MONO, color: "rgba(200,169,126,0.5)" }}>
                  Period Comparison
                </span>
                {comp.mom_available && (
                  <span className="text-[9px] px-2 py-0.5 rounded" style={{ ...MONO, background: "rgba(200,169,126,0.06)", color: "rgba(200,169,126,0.5)", border: "1px solid rgba(200,169,126,0.1)" }}>
                    MoM vs {comp.mom_period}
                  </span>
                )}
                {comp.yoy_available && (
                  <span className="text-[9px] px-2 py-0.5 rounded" style={{ ...MONO, background: "rgba(99,102,241,0.06)", color: "rgba(129,140,248,0.6)", border: "1px solid rgba(99,102,241,0.1)" }}>
                    YoY vs {comp.yoy_period}
                  </span>
                )}
              </div>
              <ComparisonRow label="Revenue" current={fmt$(review.resort_pnl.revenue)} mom={comp.mom?.revenue} yoy={comp.yoy?.revenue} />
              <ComparisonRow label="EBITDA" current={fmt$(review.resort_pnl.ebitda)} mom={comp.mom?.ebitda} yoy={comp.yoy?.ebitda} />
              <ComparisonRow label="EBITDA Margin" current={`${review.resort_pnl.ebitda_margin_pct}%`} mom={comp.mom?.ebitda_margin_pct} yoy={comp.yoy?.ebitda_margin_pct} />
              <ComparisonRow label="Food Cost %" current={`${review.resort_pnl.food_cost_pct}%`} mom={comp.mom?.food_cost_pct} yoy={comp.yoy?.food_cost_pct} isCost />
              <ComparisonRow label="Labor %" current={`${review.resort_pnl.labor_pct}%`} mom={comp.mom?.labor_pct} yoy={comp.yoy?.labor_pct} isCost />
              <ComparisonRow label="Events" current={String(review.resort_pnl.total_events)} mom={comp.mom?.total_events} yoy={comp.yoy?.total_events} />
              <ComparisonRow label="Covers" current={review.resort_pnl.total_covers.toLocaleString()} mom={comp.mom?.total_covers} yoy={comp.yoy?.total_covers} />
              <ComparisonRow label="Avg Check" current={`$${review.resort_pnl.avg_check.toFixed(0)}`} mom={comp.mom?.avg_check} yoy={comp.yoy?.avg_check} />
            </div>
          )}

          {/* Health Summary Bar */}
          <div className="flex items-center gap-3 p-3 rounded-lg" style={{ background: SURFACE, border: `1px solid ${BORDER}` }}
            data-testid="health-summary">
            <div className="text-[10px] uppercase tracking-widest" style={{ ...MONO, color: "rgba(200,169,126,0.5)" }}>
              Resort Health
            </div>
            <div className="flex-1 h-3 rounded-full overflow-hidden flex" style={{ background: "rgba(255,255,255,0.03)" }}>
              {review.health_summary.outlets_healthy > 0 && (
                <div style={{ width: `${review.health_summary.outlets_healthy / review.outlet_reports.length * 100}%`, background: "#10b981" }} />
              )}
              {review.health_summary.outlets_warning > 0 && (
                <div style={{ width: `${review.health_summary.outlets_warning / review.outlet_reports.length * 100}%`, background: "#f59e0b" }} />
              )}
              {review.health_summary.outlets_critical > 0 && (
                <div style={{ width: `${review.health_summary.outlets_critical / review.outlet_reports.length * 100}%`, background: "#ef4444" }} />
              )}
            </div>
            <div className="flex items-center gap-3 text-[10px]" style={MONO}>
              <span style={{ color: "#10b981" }}>{review.health_summary.outlets_healthy} healthy</span>
              {review.health_summary.outlets_warning > 0 && <span style={{ color: "#f59e0b" }}>{review.health_summary.outlets_warning} warning</span>}
              {review.health_summary.outlets_critical > 0 && <span style={{ color: "#ef4444" }}>{review.health_summary.outlets_critical} critical</span>}
              <span className="font-bold" style={{ color: ACCENT }}>Score: {review.health_summary.overall_score}/100</span>
            </div>
          </div>

          {/* AI Executive Narrative */}
          {review.ai_narrative && (
            <div className="rounded-lg p-5" style={{ background: SURFACE, border: `1px solid ${BORDER}`, borderLeft: `3px solid ${ACCENT}` }}
              data-testid="review-narrative">
              <div className="flex items-center gap-2 mb-3">
                <Brain className="w-3.5 h-3.5" style={{ color: ACCENT }} />
                <span className="text-[10px] uppercase tracking-widest" style={{ ...MONO, color: "rgba(200,169,126,0.5)" }}>
                  EchoAI Monthly Intelligence Brief
                </span>
              </div>
              <div className="text-[12px] leading-relaxed whitespace-pre-line" style={{ color: "rgba(226,232,240,0.85)" }}>
                {review.ai_narrative}
              </div>
            </div>
          )}

          {/* Causal Factors */}
          <div className="rounded-lg p-4" style={{ background: SURFACE, border: `1px solid ${BORDER}` }} data-testid="causal-factors">
            <div className="text-[10px] uppercase tracking-widest mb-3" style={{ ...MONO, color: "rgba(200,169,126,0.5)" }}>
              Causal Factors — {review.month_name} {review.year}
            </div>
            <div className="grid grid-cols-3 gap-2">
              {review.global_causal_factors.map((f: any, i: number) => (
                <div key={i} className="rounded-lg p-3" style={{
                  background: f.impact === "positive" ? "rgba(16,185,129,0.03)" : f.impact === "negative" ? "rgba(239,68,68,0.03)" : "rgba(255,255,255,0.01)",
                  border: `1px solid ${f.impact === "positive" ? "rgba(16,185,129,0.1)" : f.impact === "negative" ? "rgba(239,68,68,0.1)" : BORDER}`,
                }}>
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="text-[8px] uppercase tracking-widest px-1.5 py-0.5 rounded" style={{
                      ...MONO,
                      background: f.impact === "positive" ? "rgba(16,185,129,0.1)" : f.impact === "negative" ? "rgba(239,68,68,0.1)" : "rgba(148,163,184,0.05)",
                      color: f.impact === "positive" ? "#10b981" : f.impact === "negative" ? "#ef4444" : "rgba(148,163,184,0.4)",
                    }}>{f.category}</span>
                    {f.impact === "positive" && <ArrowUpRight className="w-3 h-3" style={{ color: "#10b981" }} />}
                    {f.impact === "negative" && <ArrowDownRight className="w-3 h-3" style={{ color: "#ef4444" }} />}
                  </div>
                  <div className="text-[11px] font-medium text-white mb-1">{f.factor}</div>
                  <div className="text-[10px]" style={{ color: "rgba(148,163,184,0.5)" }}>{f.detail}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Outlet-by-Outlet Reports */}
          <div data-testid="outlet-reports">
            <div className="text-[10px] uppercase tracking-widest mb-3" style={{ ...MONO, color: "rgba(200,169,126,0.5)" }}>
              Outlet-by-Outlet Analysis
            </div>
            <div className="space-y-2">
              {review.outlet_reports.map((r: any) => {
                const isExpanded = expandedOutlet === r.outlet_id;
                const healthColor = r.health_score >= 75 ? "#10b981" : r.health_score >= 50 ? "#f59e0b" : "#ef4444";
                const oc = comp?.outlet_comparisons?.[r.outlet_id];
                return (
                  <div key={r.outlet_id} className="rounded-lg overflow-hidden" style={{ background: SURFACE, border: `1px solid ${BORDER}` }}>
                    {/* Outlet Header */}
                    <button onClick={() => setExpandedOutlet(isExpanded ? null : r.outlet_id)}
                      className="w-full flex items-center gap-3 p-3 text-left"
                      data-testid={`outlet-${r.outlet_id}`}>
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold" style={{
                        ...MONO, background: `${healthColor}15`, color: healthColor, border: `1px solid ${healthColor}30`,
                      }}>{r.health_score}</div>
                      <div className="flex-1">
                        <div className="text-xs font-semibold text-white">{r.name}</div>
                        <div className="text-[9px]" style={{ color: "rgba(148,163,184,0.4)" }}>
                          {r.type}
                          {r.manager && <span className="ml-2" style={{ color: "rgba(200,169,126,0.3)" }}>{r.manager}</span>}
                        </div>
                      </div>
                      <div className="flex items-center gap-4 text-[10px]" style={MONO}>
                        <span style={{ color: "#e2e8f0" }}>{fmt$(r.pnl.revenue)}</span>
                        <span style={{ color: r.pnl.ebitda_margin_pct > 20 ? "#10b981" : "#f59e0b" }}>{r.pnl.ebitda_margin_pct}%</span>
                        <span style={{ color: r.pnl.food_cost_pct > 20 ? "#ef4444" : "rgba(148,163,184,0.5)" }}>FC {r.pnl.food_cost_pct}%</span>
                        <span style={{ color: "rgba(148,163,184,0.4)" }}>{r.pnl.covers} covers</span>
                        {oc?.mom?.revenue?.delta_pct != null && (
                          <DeltaBadge value={oc.mom.revenue.delta} pct={oc.mom.revenue.delta_pct} />
                        )}
                        {r.discrepancies.length > 0 && (
                          <span className="px-1.5 py-0.5 rounded text-[8px]" style={{ background: "rgba(239,68,68,0.1)", color: "#ef4444" }}>
                            {r.discrepancies.length} issues
                          </span>
                        )}
                      </div>
                      <ChevronDown className={`w-4 h-4 transition-transform ${isExpanded ? "rotate-180" : ""}`} style={{ color: "rgba(148,163,184,0.3)" }} />
                    </button>

                    {/* Expanded Detail */}
                    {isExpanded && (
                      <div className="px-4 pb-4 space-y-3" style={{ borderTop: `1px solid ${BORDER}` }}>
                        {/* P&L Detail */}
                        <div className="grid grid-cols-6 gap-2 pt-3">
                          <MiniKPI label="Revenue" value={fmt$(r.pnl.revenue)} />
                          <MiniKPI label="Food Cost" value={`${fmt$(r.pnl.food_cost)} (${r.pnl.food_cost_pct}%)`} />
                          <MiniKPI label="Bev Cost" value={fmt$(r.pnl.beverage_cost)} />
                          <MiniKPI label="Labor" value={`${fmt$(r.pnl.labor_cost)} (${r.pnl.labor_pct}%)`} />
                          <MiniKPI label="EBITDA" value={`${fmt$(r.pnl.ebitda)} (${r.pnl.ebitda_margin_pct}%)`} />
                          <MiniKPI label="Avg Check" value={`$${r.pnl.avg_check.toFixed(0)}`} />
                        </div>

                        {/* Outlet MoM/YoY Comparison */}
                        {oc && (oc.mom?.revenue?.delta_pct != null || oc.yoy?.revenue?.delta_pct != null) && (
                          <div className="rounded-lg p-3" style={{ background: "rgba(255,255,255,0.01)", border: `1px solid rgba(255,255,255,0.03)` }}
                            data-testid={`outlet-comparison-${r.outlet_id}`}>
                            <div className="text-[9px] uppercase tracking-widest mb-2" style={{ ...MONO, color: "rgba(200,169,126,0.4)" }}>
                              Period Comparison
                            </div>
                            <div className="grid grid-cols-4 gap-2 text-[10px]">
                              <div style={{ color: "rgba(148,163,184,0.3)" }}>Metric</div>
                              <div style={{ color: "rgba(148,163,184,0.3)" }}>Current</div>
                              <div style={{ color: "rgba(148,163,184,0.3)" }}>MoM</div>
                              <div style={{ color: "rgba(148,163,184,0.3)" }}>YoY</div>
                              {[
                                { key: "revenue", label: "Revenue", fmt: (v: number) => fmt$(v) },
                                { key: "ebitda", label: "EBITDA", fmt: (v: number) => fmt$(v) },
                                { key: "food_cost_pct", label: "Food %", fmt: (v: number) => `${v}%`, isCost: true },
                                { key: "labor_pct", label: "Labor %", fmt: (v: number) => `${v}%`, isCost: true },
                                { key: "covers", label: "Covers", fmt: (v: number) => v.toLocaleString() },
                                { key: "avg_check", label: "Avg Check", fmt: (v: number) => `$${v.toFixed(0)}` },
                              ].map((m) => (
                                <React.Fragment key={m.key}>
                                  <div style={{ ...MONO, color: "rgba(148,163,184,0.5)" }}>{m.label}</div>
                                  <div className="font-semibold text-white" style={MONO}>{m.fmt(r.pnl[m.key])}</div>
                                  <div>{oc.mom?.[m.key]?.delta_pct != null ? <DeltaBadge value={oc.mom[m.key].delta} pct={oc.mom[m.key].delta_pct} invert={m.isCost} /> : <span style={{ color: "rgba(148,163,184,0.2)" }}>—</span>}</div>
                                  <div>{oc.yoy?.[m.key]?.delta_pct != null ? <DeltaBadge value={oc.yoy[m.key].delta} pct={oc.yoy[m.key].delta_pct} invert={m.isCost} /> : <span style={{ color: "rgba(148,163,184,0.2)" }}>—</span>}</div>
                                </React.Fragment>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Discrepancies */}
                        {r.discrepancies.length > 0 && (
                          <div>
                            <div className="text-[9px] uppercase tracking-widest mb-1.5" style={{ ...MONO, color: "rgba(239,68,68,0.5)" }}>
                              Discrepancies Detected
                            </div>
                            {r.discrepancies.map((d: any, di: number) => (
                              <div key={di} className="flex items-center gap-3 p-2 rounded mb-1" style={{
                                background: d.severity === "high" ? "rgba(239,68,68,0.04)" : "rgba(245,158,11,0.04)",
                                border: `1px solid ${d.severity === "high" ? "rgba(239,68,68,0.1)" : "rgba(245,158,11,0.1)"}`,
                              }}>
                                <AlertTriangle className="w-3 h-3 shrink-0" style={{ color: d.severity === "high" ? "#ef4444" : "#f59e0b" }} />
                                <span className="text-[10px] font-medium text-white">{d.metric}</span>
                                <span className="text-[10px]" style={{ ...MONO, color: "rgba(148,163,184,0.5)" }}>
                                  Actual: {typeof d.actual === "number" && d.actual > 100 ? fmt$(d.actual) : d.actual} | 
                                  Budget: {typeof d.budget === "number" && d.budget > 100 ? fmt$(d.budget) : d.budget}
                                </span>
                                <span className="text-[10px] font-semibold" style={{ ...MONO, color: "#ef4444" }}>
                                  {d.variance_pct > 0 ? "+" : ""}{d.variance_pct}%
                                </span>
                                <span className="text-[9px] ml-auto" style={{ ...MONO, color: "#ef4444" }}>
                                  Impact: {fmt$(Math.abs(d.impact))}
                                </span>
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Causal Factors */}
                        <div>
                          <div className="text-[9px] uppercase tracking-widest mb-1.5" style={{ ...MONO, color: "rgba(200,169,126,0.4)" }}>
                            Causal Factors
                          </div>
                          <div className="flex flex-wrap gap-1.5">
                            {r.causal_factors.map((f: any, fi: number) => (
                              <span key={fi} className="text-[9px] px-2 py-1 rounded" style={{
                                ...MONO,
                                background: f.impact === "positive" ? "rgba(16,185,129,0.06)" : f.impact === "negative" ? "rgba(239,68,68,0.06)" : "rgba(255,255,255,0.02)",
                                color: f.impact === "positive" ? "#10b981" : f.impact === "negative" ? "#ef4444" : "rgba(148,163,184,0.4)",
                                border: `1px solid ${f.impact === "positive" ? "rgba(16,185,129,0.1)" : f.impact === "negative" ? "rgba(239,68,68,0.1)" : "rgba(255,255,255,0.04)"}`,
                              }}>
                                {f.factor}
                              </span>
                            ))}
                          </div>
                        </div>

                        {/* Focus Areas */}
                        <div>
                          <div className="text-[9px] uppercase tracking-widest mb-1.5" style={{ ...MONO, color: "rgba(200,169,126,0.4)" }}>
                            Areas of Focus
                          </div>
                          {r.focus_areas.map((f: any, fi: number) => (
                            <div key={fi} className="flex items-start gap-2 p-2 rounded mb-1" style={{
                              background: f.priority === "critical" ? "rgba(239,68,68,0.03)" : f.priority === "high" ? "rgba(245,158,11,0.03)" : "rgba(255,255,255,0.01)",
                              border: `1px solid ${f.priority === "critical" ? "rgba(239,68,68,0.08)" : f.priority === "high" ? "rgba(245,158,11,0.08)" : "rgba(255,255,255,0.03)"}`,
                            }}>
                              <span className="text-[8px] uppercase px-1.5 py-0.5 rounded shrink-0 mt-0.5" style={{
                                ...MONO,
                                background: f.priority === "critical" ? "rgba(239,68,68,0.1)" : f.priority === "high" ? "rgba(245,158,11,0.1)" : "rgba(148,163,184,0.05)",
                                color: f.priority === "critical" ? "#ef4444" : f.priority === "high" ? "#f59e0b" : "rgba(148,163,184,0.4)",
                              }}>{f.priority}</span>
                              <div className="flex-1">
                                <div className="text-[10px] font-medium text-white">{f.area}</div>
                                <div className="text-[10px]" style={{ color: "rgba(148,163,184,0.5)" }}>{f.detail}</div>
                                <div className="text-[9px] mt-0.5" style={{ ...MONO, color: ACCENT }}>Target: {f.kpi_target}</div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Top Discrepancies (Resort-Wide) */}
          {review.all_discrepancies.length > 0 && (
            <div className="rounded-lg p-4" style={{ background: "rgba(239,68,68,0.02)", border: `1px solid rgba(239,68,68,0.08)` }}
              data-testid="all-discrepancies">
              <div className="text-[10px] uppercase tracking-widest mb-3" style={{ ...MONO, color: "rgba(239,68,68,0.5)" }}>
                All Discrepancies (Sorted by Impact)
              </div>
              {review.all_discrepancies.slice(0, 8).map((d: any, i: number) => (
                <div key={i} className="flex items-center gap-3 py-1.5" style={{ borderBottom: i < 7 ? `1px solid rgba(255,255,255,0.02)` : "none" }}>
                  <span className="text-[10px] w-32 font-medium" style={{ color: "#e2e8f0" }}>{d.outlet}</span>
                  <span className="text-[10px] w-24" style={{ color: "rgba(148,163,184,0.5)" }}>{d.metric}</span>
                  <span className="text-[10px]" style={{ ...MONO, color: "#ef4444" }}>{d.variance_pct > 0 ? "+" : ""}{d.variance_pct}%</span>
                  <span className="text-[10px] ml-auto" style={{ ...MONO, color: "#ef4444" }}>Impact: {fmt$(Math.abs(d.impact))}</span>
                </div>
              ))}
            </div>
          )}

          {/* Resort-Wide Focus Areas */}
          <div className="rounded-lg p-4" style={{ background: SURFACE, border: `1px solid ${BORDER}` }} data-testid="top-focus">
            <div className="text-[10px] uppercase tracking-widest mb-3" style={{ ...MONO, color: "rgba(200,169,126,0.5)" }}>
              Top Resort Focus Areas
            </div>
            {review.top_focus_areas.map((f: any, i: number) => (
              <div key={i} className="flex items-start gap-3 py-2" style={{ borderBottom: i < review.top_focus_areas.length - 1 ? `1px solid rgba(255,255,255,0.02)` : "none" }}>
                <span className="text-[8px] uppercase px-1.5 py-0.5 rounded shrink-0 mt-0.5" style={{
                  ...MONO,
                  background: f.priority === "critical" ? "rgba(239,68,68,0.1)" : f.priority === "high" ? "rgba(245,158,11,0.1)" : "rgba(148,163,184,0.05)",
                  color: f.priority === "critical" ? "#ef4444" : f.priority === "high" ? "#f59e0b" : "rgba(148,163,184,0.4)",
                }}>{f.priority}</span>
                <span className="text-[10px] w-28 font-medium" style={{ color: "rgba(200,169,126,0.6)" }}>{f.outlet}</span>
                <div className="flex-1">
                  <div className="text-[10px] font-medium text-white">{f.area}</div>
                  <div className="text-[10px]" style={{ color: "rgba(148,163,184,0.5)" }}>{f.detail}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── Shared Components ────────────────────────── */

function SectionLabel({ label }: { label: string }) {
  return <div className="text-[10px] uppercase tracking-[0.2em] font-medium" style={{ ...MONO, color: "rgba(200,169,126,0.4)" }}>{label}</div>;
}

function ConfidenceBadge({ confidence, sources }: { confidence: number; sources: number }) {
  return (
    <div className="flex items-center gap-2 px-2.5 py-1 rounded-md" style={{ background: SURFACE, border: `1px solid ${BORDER}` }}>
      <CircleDot className="w-2.5 h-2.5" style={{ color: confidence >= 0.8 ? "#10b981" : "#f59e0b" }} />
      <span className="text-[10px]" style={{ ...MONO, color: "rgba(148,163,184,0.5)" }}>
        {(confidence * 100).toFixed(0)}% confidence / {sources} sources
      </span>
    </div>
  );
}

function KPICard({ label, value, delta, positive }: { label: string; value: string; delta?: string; positive?: boolean }) {
  return (
    <div className="rounded-lg p-3.5" style={{ background: SURFACE, border: `1px solid ${BORDER}` }}>
      <div className="text-[9px] uppercase tracking-widest mb-1.5" style={{ ...MONO, color: "rgba(148,163,184,0.35)" }}>{label}</div>
      <div className="text-lg font-semibold text-white" style={MONO}>{value}</div>
      {delta && (
        <div className="text-[10px] mt-0.5" style={{ ...MONO, color: positive ? "rgba(16,185,129,0.7)" : "rgba(239,68,68,0.7)" }}>
          {delta}
        </div>
      )}
    </div>
  );
}

function MiniKPI({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[9px] uppercase tracking-widest" style={{ ...MONO, color: "rgba(148,163,184,0.3)" }}>{label}</div>
      <div className="text-sm font-semibold text-white" style={MONO}>{value}</div>
    </div>
  );
}

function ImpactCard({ label, value }: { label: string; value: number }) {
  const positive = value >= 0;
  return (
    <div className="rounded-md p-3" style={{ background: SURFACE, border: `1px solid ${BORDER}` }}>
      <div className="text-[9px] uppercase tracking-widest mb-1" style={{ ...MONO, color: "rgba(148,163,184,0.3)" }}>{label}</div>
      <div className="text-sm font-bold" style={{ ...MONO, color: positive ? "#10b981" : "#ef4444" }}>
        {positive ? "+" : ""}{fmt$(value)}
      </div>
    </div>
  );
}

function SeasonBar({ current, next }: { current: number; next: number }) {
  return (
    <div className="flex items-center gap-1.5 flex-1">
      <div className="flex-1 h-1 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.05)" }}>
        <div className="h-full rounded-full" style={{ width: `${current * 80}%`, background: ACCENT }} />
      </div>
      <span className="text-[9px]" style={{ ...MONO, color: "rgba(148,163,184,0.4)" }}>{current.toFixed(2)}</span>
      <ChevronRight className="w-3 h-3" style={{ color: "rgba(148,163,184,0.2)" }} />
      <span className="text-[9px]" style={{ ...MONO, color: next > current ? "#10b981" : "#ef4444" }}>{next.toFixed(2)}</span>
    </div>
  );
}

function Loading() {
  return (
    <div className="flex items-center justify-center h-full">
      <div className="flex items-center gap-2">
        <RefreshCw className="w-4 h-4 animate-spin" style={{ color: ACCENT }} />
        <span className="text-xs" style={{ ...MONO, color: "rgba(148,163,184,0.4)" }}>Analyzing...</span>
      </div>
    </div>
  );
}

function fmt$(n: number): string {
  if (Math.abs(n) >= 1000000) return `$${(n / 1000000).toFixed(1)}M`;
  if (Math.abs(n) >= 1000) return `$${(n / 1000).toFixed(1)}K`;
  return `$${n.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
}

function fmt$Short(n: number): string {
  if (n === 0 || n === undefined || n === null) return "–";
  if (Math.abs(n) >= 1000000) return `${n < 0 ? "-" : ""}$${(Math.abs(n) / 1000000).toFixed(1)}M`;
  if (Math.abs(n) >= 1000) return `${n < 0 ? "-" : ""}$${(Math.abs(n) / 1000).toFixed(0)}K`;
  return `$${Math.round(n).toLocaleString()}`;
}

