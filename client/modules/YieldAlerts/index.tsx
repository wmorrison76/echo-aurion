import React, { useState, useEffect, useCallback } from "react";
import { Bell, ShieldAlert, AlertTriangle, Info, Check, RefreshCw, Plus, Trash2, Settings, History } from "lucide-react";
import { cn } from "@/lib/utils";

const BACKEND = window.location.origin;
async function api(path: string, opts?: RequestInit) {
  const res = await fetch(`${BACKEND}/api/alerts${path}`, {
    headers: { "Content-Type": "application/json" },
    ...opts,
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

type TabId = "dashboard" | "rules" | "history";
const TABS: { id: TabId; label: string; icon: React.ElementType }[] = [
  { id: "dashboard", label: "Alert Dashboard", icon: Bell },
  { id: "rules", label: "Rules", icon: Settings },
  { id: "history", label: "History", icon: History },
];

const SEVERITY_STYLES: Record<string, { bg: string; text: string; border: string; icon: React.ElementType }> = {
  critical: { bg: "bg-rose-500/10", text: "text-rose-400", border: "border-rose-500/20", icon: ShieldAlert },
  warning: { bg: "bg-amber-500/10", text: "text-amber-400", border: "border-amber-500/20", icon: AlertTriangle },
  info: { bg: "bg-blue-500/10", text: "text-blue-400", border: "border-blue-500/20", icon: Info },
};

export default function YieldAlertsPanel() {
  const [tab, setTab] = useState<TabId>("dashboard");
  return (
    <div className="flex flex-col h-full overflow-hidden" style={{ background: "#0a0e17" }} data-testid="yield-alerts-panel">
      <div className="flex items-center gap-3 px-5 py-3 border-b" style={{ borderColor: "rgba(255,255,255,0.05)" }}>
        <div className="w-9 h-9 flex items-center justify-center rounded-lg" style={{ background: "linear-gradient(135deg, rgba(239,68,68,0.15), rgba(245,158,11,0.15))", border: "1px solid rgba(239,68,68,0.25)" }}>
          <Bell className="w-[18px] h-[18px] text-rose-400" />
        </div>
        <div>
          <div className="text-sm font-semibold text-white tracking-wide">Yield Alerts</div>
          <div className="text-[10px] font-mono text-slate-500 tracking-widest uppercase">Automated Threshold Monitoring</div>
        </div>
      </div>
      <div className="flex border-b px-3 overflow-x-auto" style={{ borderColor: "rgba(255,255,255,0.04)" }}>
        {TABS.map(t => (
          <button key={t.id} data-testid={`alerts-tab-${t.id}`} onClick={() => setTab(t.id)}
            className="flex items-center gap-1.5 px-3 py-2.5 text-[11px] font-mono uppercase tracking-wider border-b-2 whitespace-nowrap transition-colors"
            style={{ borderColor: tab === t.id ? "#ef4444" : "transparent", color: tab === t.id ? "#fca5a5" : "#64748b" }}>
            <t.icon className="w-3.5 h-3.5" /> {t.label}
          </button>
        ))}
      </div>
      <div className="flex-1 overflow-y-auto p-5">
        {tab === "dashboard" && <DashboardTab />}
        {tab === "rules" && <RulesTab />}
        {tab === "history" && <HistoryTab />}
      </div>
    </div>
  );
}

function DashboardTab() {
  const [summary, setSummary] = useState<any>(null);
  const [evaluating, setEvaluating] = useState(false);
  const [lastResult, setLastResult] = useState<any>(null);

  const load = useCallback(() => { api("/summary").then(setSummary).catch(() => {}); }, []);
  useEffect(() => { load(); }, [load]);

  const runEvaluation = async () => {
    setEvaluating(true);
    try {
      const result = await api("/evaluate", { method: "POST" });
      setLastResult(result);
      load();
    } finally { setEvaluating(false); }
  };

  if (!summary) return <Loading />;
  return (
    <div className="space-y-5" data-testid="alerts-dashboard-tab">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        <Kpi label="Active Alerts" value={summary.active} accent="text-rose-400" />
        <Kpi label="Critical" value={summary.by_severity.critical} accent="text-rose-500" />
        <Kpi label="Warnings" value={summary.by_severity.warning} accent="text-amber-400" />
        <Kpi label="Resolved" value={summary.resolved} accent="text-emerald-400" />
      </div>

      <button data-testid="run-evaluation-btn" onClick={runEvaluation} disabled={evaluating}
        className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/20 text-rose-300 text-xs font-mono uppercase tracking-wider transition-colors disabled:opacity-50">
        <RefreshCw className={cn("w-3.5 h-3.5", evaluating && "animate-spin")} />
        {evaluating ? "Evaluating..." : "Run Alert Evaluation Now"}
      </button>

      {lastResult && (
        <div className="bg-slate-800/30 rounded-lg border border-slate-700/20 p-4">
          <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Last Evaluation Result</h3>
          <div className="flex gap-4 text-xs">
            <span className="text-slate-400">Rules Checked: <span className="text-white font-mono">{lastResult.evaluated_rules}</span></span>
            <span className="text-slate-400">Alerts Triggered: <span className={cn("font-mono", lastResult.alerts_triggered > 0 ? "text-rose-400" : "text-emerald-400")}>{lastResult.alerts_triggered}</span></span>
          </div>
          {lastResult.alerts?.length > 0 && (
            <div className="mt-3 space-y-1.5">
              {lastResult.alerts.map((a: any) => <AlertCard key={a.alert_id} alert={a} onAction={load} />)}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function RulesTab() {
  const [rules, setRules] = useState<any[]>([]);
  const load = useCallback(() => { api("/rules").then(d => setRules(d.rules)).catch(() => {}); }, []);
  useEffect(() => { load(); }, [load]);

  const toggleRule = async (ruleId: string, enabled: boolean) => {
    await api(`/rules/${ruleId}`, { method: "PUT", body: JSON.stringify({ enabled: !enabled }) });
    load();
  };
  const deleteRule = async (ruleId: string) => {
    await api(`/rules/${ruleId}`, { method: "DELETE" });
    load();
  };

  return (
    <div className="space-y-3" data-testid="alerts-rules-tab">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{rules.length} Rules Configured</span>
      </div>
      {rules.map(rule => {
        const sev = SEVERITY_STYLES[rule.severity] || SEVERITY_STYLES.info;
        const SevIcon = sev.icon;
        return (
          <div key={rule.rule_id} data-testid={`alert-rule-${rule.rule_id}`} className={cn("rounded-lg border p-3", sev.border, sev.bg)}>
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-2">
                <SevIcon className={cn("w-4 h-4", sev.text)} />
                <span className="text-xs font-semibold text-white">{rule.name}</span>
                <span className={cn("text-[9px] px-1.5 py-0.5 rounded font-mono", sev.bg, sev.text)}>{rule.severity}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <button onClick={() => toggleRule(rule.rule_id, rule.enabled)}
                  className={cn("text-[9px] px-2 py-0.5 rounded font-mono border", rule.enabled ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/20" : "bg-slate-700/40 text-slate-500 border-slate-600/20")}>
                  {rule.enabled ? "ON" : "OFF"}
                </button>
                <button onClick={() => deleteRule(rule.rule_id)} className="p-1 text-slate-500 hover:text-rose-400 transition-colors">
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            </div>
            <p className="text-[10px] text-slate-400">{rule.description}</p>
            <div className="flex gap-3 mt-1 text-[10px] text-slate-500 font-mono">
              <span>Metric: {rule.metric}</span>
              <span>{rule.operator} {rule.threshold}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function HistoryTab() {
  const [alerts, setAlerts] = useState<any[]>([]);
  const load = useCallback(() => { api("/history?limit=50").then(d => setAlerts(d.alerts)).catch(() => {}); }, []);
  useEffect(() => { load(); }, [load]);

  return (
    <div className="space-y-3" data-testid="alerts-history-tab">
      <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{alerts.length} Alerts</span>
      {alerts.length === 0 && <div className="text-xs text-slate-500 text-center py-8">No alerts yet. Run an evaluation to generate alerts.</div>}
      {alerts.map(a => <AlertCard key={a.alert_id} alert={a} onAction={load} />)}
    </div>
  );
}

function AlertCard({ alert, onAction }: { alert: any; onAction: () => void }) {
  const sev = SEVERITY_STYLES[alert.severity] || SEVERITY_STYLES.info;
  const SevIcon = sev.icon;
  const handleAck = async () => { await api(`/history/${alert.alert_id}/acknowledge`, { method: "PUT" }); onAction(); };
  const handleResolve = async () => { await api(`/history/${alert.alert_id}/resolve`, { method: "PUT" }); onAction(); };

  return (
    <div className={cn("rounded-lg border p-3", sev.border, alert.status === "resolved" ? "opacity-50" : sev.bg)}>
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-2">
          <SevIcon className={cn("w-3.5 h-3.5", sev.text)} />
          <span className="text-xs font-semibold text-white">{alert.rule_name}</span>
          <span className={cn("text-[9px] px-1.5 py-0.5 rounded font-mono",
            alert.status === "active" ? "bg-rose-500/15 text-rose-300" :
            alert.status === "acknowledged" ? "bg-amber-500/15 text-amber-300" :
            "bg-emerald-500/15 text-emerald-300"
          )}>{alert.status}</span>
        </div>
        <span className="text-[9px] text-slate-500 font-mono">{alert.date}</span>
      </div>
      {alert.details && (
        <div className="flex flex-wrap gap-2 text-[10px] text-slate-400 font-mono">
          {Object.entries(alert.details).map(([k, v]) => (
            <span key={k}>{k}: <span className="text-white">{typeof v === "number" ? (v < 1 ? `${(v as number * 100).toFixed(1)}%` : v.toLocaleString()) : String(v)}</span></span>
          ))}
        </div>
      )}
      {alert.status === "active" && (
        <div className="flex gap-2 mt-2">
          <button onClick={handleAck} className="text-[9px] px-2 py-0.5 rounded bg-amber-500/15 text-amber-300 border border-amber-500/20 hover:bg-amber-500/25">Acknowledge</button>
          <button onClick={handleResolve} className="text-[9px] px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-300 border border-emerald-500/20 hover:bg-emerald-500/25">Resolve</button>
        </div>
      )}
      {alert.status === "acknowledged" && (
        <button onClick={handleResolve} className="mt-2 text-[9px] px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-300 border border-emerald-500/20 hover:bg-emerald-500/25">Resolve</button>
      )}
    </div>
  );
}

function Loading() { return <div className="flex justify-center py-12"><RefreshCw className="w-5 h-5 text-slate-500 animate-spin" /></div>; }
function Kpi({ label, value, accent }: { label: string; value: any; accent: string }) {
  return (
    <div className="bg-slate-800/40 border border-slate-700/30 rounded-lg px-3 py-2">
      <span className="text-[10px] text-slate-500 uppercase tracking-wider">{label}</span>
      <div className={cn("text-lg font-bold", accent)}>{value ?? 0}</div>
    </div>
  );
}
