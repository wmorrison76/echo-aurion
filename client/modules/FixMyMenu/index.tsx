import React, { useState, useEffect, useCallback } from "react";
import { AlertTriangle, BarChart3, DollarSign, RefreshCw, Zap, TrendingUp, Search, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

const BACKEND = window.location.origin;
async function api(path: string, opts: RequestInit = {}) {
  const res = await fetch(`${BACKEND}/api/fix-menu${path}`, { headers: { "Content-Type": "application/json", ...((opts.headers as Record<string, string>) || {}) }, ...opts });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

type TabId = "scan" | "history";

export default function FixMyMenu() {
  const [tab, setTab] = useState<TabId>("scan");
  return (
    <div className="flex flex-col h-full overflow-hidden" style={{ background: "#0a0e17" }} data-testid="fix-menu-panel">
      <div className="flex items-center gap-3 px-5 py-3 border-b" style={{ borderColor: "rgba(255,255,255,0.05)" }}>
        <div className="w-9 h-9 flex items-center justify-center rounded-lg" style={{ background: "linear-gradient(135deg, rgba(245,158,11,0.15), rgba(239,68,68,0.15))", border: "1px solid rgba(245,158,11,0.25)" }}>
          <Zap className="w-[18px] h-[18px] text-amber-500" />
        </div>
        <div>
          <div className="text-sm font-semibold text-white tracking-wide">Fix My Menu</div>
          <div className="text-[10px] font-mono text-slate-500 tracking-widest uppercase">AI-Powered Margin Analysis & Optimization</div>
        </div>
      </div>
      <div className="flex border-b px-5" style={{ borderColor: "rgba(255,255,255,0.04)" }}>
        {(["scan", "history"] as TabId[]).map(t => (
          <button key={t} data-testid={`fmm-tab-${t}`} onClick={() => setTab(t)}
            className="px-4 py-2.5 text-[11px] font-mono uppercase tracking-wider border-b-2 transition-colors"
            style={{ borderColor: tab === t ? "#f59e0b" : "transparent", color: tab === t ? "#fbbf24" : "#64748b" }}>
            {t === "scan" ? "Margin Scanner" : "Fix History"}
          </button>
        ))}
      </div>
      <div className="flex-1 overflow-y-auto p-5">
        {tab === "scan" ? <ScanTab /> : <HistoryTab />}
      </div>
    </div>
  );
}

function ScanTab() {
  const [scan, setScan] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [threshold, setThreshold] = useState(0.35);
  const [fixing, setFixing] = useState<string | null>(null);
  const [fixResult, setFixResult] = useState<any>(null);

  const runScan = async () => {
    setLoading(true);
    try { setScan(await api(`/scan?threshold=${threshold}`)); } catch {}
    setLoading(false);
  };

  useEffect(() => { runScan(); }, []);

  const requestFix = async (item: any) => {
    setFixing(item.name);
    setFixResult(null);
    try {
      const result = await api("/suggest", {
        method: "POST",
        body: JSON.stringify({
          item_name: item.name,
          food_cost: item.food_cost,
          sell_price: item.sell_price,
          category: item.category,
          monthly_volume: item.monthly_volume,
        }),
      });
      setFixResult(result);
    } catch {}
    setFixing(null);
  };

  return (
    <div className="space-y-5" data-testid="fmm-scan-tab">
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-slate-400">Threshold:</span>
          <input type="number" step="0.01" min="0.1" max="0.6" value={threshold} onChange={e => setThreshold(parseFloat(e.target.value) || 0.35)}
            className="w-16 px-2 py-1 rounded text-xs bg-slate-800/50 border border-slate-600/30 text-white outline-none font-mono" />
        </div>
        <button data-testid="fmm-scan-btn" onClick={runScan} disabled={loading}
          className="flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-mono rounded border border-amber-500/30 text-amber-300 bg-amber-500/10 hover:bg-amber-500/20 transition-colors disabled:opacity-40">
          <Search className={cn("w-3 h-3", loading && "animate-spin")} /> {loading ? "Scanning..." : "Scan Menu"}
        </button>
      </div>

      {scan && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
            <Kpi label="Items Scanned" value={scan.total_items_scanned} accent="text-slate-300" />
            <Kpi label="Flagged" value={scan.flagged_count} accent="text-rose-400" />
            <Kpi label="Healthy" value={scan.healthy_count} accent="text-emerald-400" />
            <Kpi label="Revenue at Risk" value={`$${scan.total_revenue_at_risk.toLocaleString()}`} accent="text-amber-400" />
            <Kpi label="Avg Food Cost" value={`${(scan.avg_food_cost_pct * 100).toFixed(1)}%`} accent="text-cyan-400" />
          </div>

          {scan.flagged_items.length > 0 && (
            <div>
              <h3 className="text-xs font-semibold text-rose-400 uppercase tracking-wider mb-2 flex items-center gap-1.5"><AlertTriangle className="w-3.5 h-3.5" /> Flagged Items ({scan.flagged_count})</h3>
              <div className="space-y-2">
                {scan.flagged_items.map((item: any, i: number) => (
                  <div key={i} data-testid={`flagged-item-${i}`} className="bg-slate-800/40 rounded-lg border border-rose-500/15 p-3">
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-white">{item.name}</span>
                        {item.category && <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-slate-700/40 text-slate-400">{item.category}</span>}
                      </div>
                      <button onClick={() => requestFix(item)} disabled={fixing === item.name}
                        data-testid={`fix-btn-${i}`}
                        className="flex items-center gap-1 px-2.5 py-1 rounded text-[10px] font-mono border border-amber-500/30 text-amber-300 bg-amber-500/10 hover:bg-amber-500/20 transition-colors disabled:opacity-40">
                        <Zap className={cn("w-3 h-3", fixing === item.name && "animate-pulse")} /> {fixing === item.name ? "Analyzing..." : "Fix It"}
                      </button>
                    </div>
                    <div className="grid grid-cols-4 gap-3 text-[10px]">
                      <div><span className="text-slate-500">Cost:</span> <span className="text-white font-mono">${item.food_cost}</span></div>
                      <div><span className="text-slate-500">Price:</span> <span className="text-white font-mono">${item.sell_price}</span></div>
                      <div><span className="text-slate-500">Food Cost%:</span> <span className="text-rose-400 font-mono font-bold">{(item.cost_pct * 100).toFixed(1)}%</span></div>
                      <div><span className="text-slate-500">Suggested:</span> <span className="text-emerald-400 font-mono">${item.suggested_price}</span> <span className="text-slate-500">(+${item.price_delta})</span></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {fixResult && (
            <div className="bg-slate-800/40 rounded-lg border border-amber-500/20 p-4" data-testid="fix-result">
              <div className="flex items-center gap-2 mb-3">
                <Zap className="w-4 h-4 text-amber-400" />
                <span className="text-xs font-semibold text-amber-300">AI Fix Suggestions for "{fixResult.item_name}"</span>
                <span className="text-[9px] font-mono text-slate-500">Gap: {(fixResult.gap_pct * 100).toFixed(1)}% above target</span>
              </div>
              <div className="space-y-2">
                {(fixResult.fixes || []).map((fix: any, i: number) => (
                  <div key={i} className="bg-slate-700/20 rounded-lg px-3 py-2 flex items-start gap-2">
                    <ChevronRight className="w-3 h-3 mt-0.5 text-amber-400 flex-shrink-0" />
                    <div>
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-300 border border-amber-500/20">{fix.fix_type?.replace("_", " ")}</span>
                        <span className={cn("text-[9px] font-mono", fix.impact === "high" ? "text-emerald-400" : fix.impact === "medium" ? "text-blue-400" : "text-slate-400")}>{fix.impact} impact</span>
                        <span className="text-[9px] font-mono text-slate-500">{fix.difficulty}</span>
                      </div>
                      <div className="text-xs text-slate-300">{fix.description}</div>
                      {fix.estimated_savings_pct > 0 && <div className="text-[10px] text-emerald-400 mt-0.5">Est. savings: {(fix.estimated_savings_pct * 100).toFixed(1)}%</div>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {scan.top_healthy.length > 0 && (
            <div>
              <h3 className="text-xs font-semibold text-emerald-400 uppercase tracking-wider mb-2 flex items-center gap-1.5"><TrendingUp className="w-3.5 h-3.5" /> Top Margin Items</h3>
              <div className="space-y-1">
                {scan.top_healthy.map((item: any, i: number) => (
                  <div key={i} className="flex items-center justify-between bg-slate-800/30 rounded-lg px-3 py-2 border border-slate-700/20">
                    <span className="text-xs text-white">{item.name}</span>
                    <div className="flex items-center gap-3 text-[10px]">
                      <span className="text-slate-400">${item.sell_price}</span>
                      <span className="text-emerald-400 font-mono font-bold">{(item.margin_pct * 100).toFixed(1)}% margin</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function HistoryTab() {
  const [history, setHistory] = useState<any[]>([]);
  useEffect(() => { api("/history").then(d => setHistory(d.analyses || [])).catch(() => {}); }, []);

  return (
    <div className="space-y-3" data-testid="fmm-history-tab">
      <div className="text-xs text-slate-400">{history.length} analyses</div>
      {history.map((a, i) => (
        <div key={a.analysis_id} data-testid={`fix-history-${i}`} className="bg-slate-800/40 rounded-lg border border-slate-700/30 p-3">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-semibold text-white">{a.item_name}</span>
            <span className="text-[9px] text-slate-500">{a.created_at?.split("T")[0]}</span>
          </div>
          <div className="flex gap-4 text-[10px] mb-2">
            <span className="text-slate-400">Cost: <span className="text-white">${a.food_cost}</span></span>
            <span className="text-slate-400">Price: <span className="text-white">${a.sell_price}</span></span>
            <span className="text-rose-400">Gap: {(a.gap_pct * 100).toFixed(1)}%</span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {(a.fixes || []).map((f: any, j: number) => (
              <span key={j} className="px-2 py-0.5 rounded text-[8px] font-mono bg-amber-500/10 text-amber-300 border border-amber-500/20">{f.fix_type?.replace("_", " ")}</span>
            ))}
          </div>
        </div>
      ))}
      {history.length === 0 && <div className="text-xs text-slate-500 text-center py-8">No analyses yet. Use the Margin Scanner to get started.</div>}
    </div>
  );
}

function Kpi({ label, value, accent }: { label: string; value: any; accent: string }) {
  return (
    <div className="bg-slate-800/40 border border-slate-700/30 rounded-lg px-3 py-2">
      <div className="text-[10px] text-slate-500 uppercase tracking-wider">{label}</div>
      <div className={cn("text-lg font-bold", accent)}>{value ?? 0}</div>
    </div>
  );
}
