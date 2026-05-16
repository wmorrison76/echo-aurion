import React, { useState, useEffect, useCallback } from "react";
import {
  Star, HelpCircle, Tractor, XCircle, BarChart3, DollarSign,
  TrendingUp, ChevronDown, Utensils, AlertTriangle, Zap,
} from "lucide-react";

const API = window.location.origin;
const GET = (p: string) => fetch(`${API}/api/menu-eng-matrix${p}`).then(r => r.json());

const FONT = { fontFamily: "'IBM Plex Sans', system-ui, sans-serif" };
const MONO = { fontFamily: "'IBM Plex Mono', monospace" };
const BG = "#04060d";
const SURFACE = "rgba(255,255,255,0.025)";
const BORDER = "rgba(255,255,255,0.06)";
const ACCENT = "#c8a97e";

const Q_COLORS: Record<string, {bg: string; color: string; icon: any; label: string}> = {
  star: {bg: "rgba(245,158,11,0.08)", color: "#f59e0b", icon: Star, label: "Star"},
  puzzle: {bg: "rgba(168,85,247,0.08)", color: "#a855f7", icon: HelpCircle, label: "Puzzle"},
  plowhorse: {bg: "rgba(59,130,246,0.08)", color: "#3b82f6", icon: Tractor, label: "Plowhorse"},
  dog: {bg: "rgba(239,68,68,0.08)", color: "#ef4444", icon: XCircle, label: "Dog"},
};

export default function MenuEngineeringMatrixPanel() {
  const [matrix, setMatrix] = useState<any>(null);
  const [outlet, setOutlet] = useState("");
  const [outlets, setOutlets] = useState<string[]>([]);

  useEffect(() => { GET("/outlets").then(d => { const list = d.outlets || []; setOutlets(list); if (list.length > 0 && !outlet) setOutlet(list[0]); }); }, []);
  useEffect(() => { if (outlet) GET(`/matrix?outlet=${encodeURIComponent(outlet)}`).then(setMatrix); }, [outlet]);

  if (!matrix) return <div style={{...FONT, background: BG, color: "#e2e8f0"}} className="flex items-center justify-center h-full">Loading...</div>;

  const maxMix = Math.max(...matrix.items.map((i: any) => i.mix_pct));
  const maxCM = Math.max(...matrix.items.map((i: any) => i.contribution_margin));

  return (
    <div className="flex flex-col h-full overflow-hidden" style={{...FONT, background: BG, color: "#e2e8f0"}} data-testid="menu-engineering-panel">
      <div style={{borderBottom: `1px solid ${BORDER}`}}>
        <div className="flex items-center gap-4 px-5 py-2.5">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-md flex items-center justify-center" style={{background: "rgba(245,158,11,0.1)", border: "1px solid rgba(245,158,11,0.25)"}}>
              <BarChart3 className="w-4 h-4" style={{color: "#f59e0b"}} />
            </div>
            <div>
              <div className="text-[13px] font-semibold text-white">MENU ENGINEERING MATRIX</div>
              <div className="text-[9px] tracking-[0.15em] uppercase" style={{...MONO, color: "rgba(245,158,11,0.5)"}}>
                Stars | Puzzles | Plowhorses | Dogs
                {matrix.data_source === "pos_database" && <span style={{color: "#22c55e", marginLeft: 8}}>LIVE POS DATA</span>}
                {matrix.data_source === "sample_data" && <span style={{color: "#f59e0b", marginLeft: 8}}>SAMPLE DATA</span>}
              </div>
            </div>
          </div>
          <select value={outlet} onChange={e => setOutlet(e.target.value)} className="px-3 py-1.5 rounded-md text-[11px] bg-transparent outline-none"
            style={{background: SURFACE, border: `1px solid ${BORDER}`, color: "#e2e8f0"}} data-testid="outlet-select">
            {outlets.map(o => <option key={o} value={o}>{o}</option>)}
          </select>
          <div className="flex-1" />
          {Object.entries(Q_COLORS).map(([q, cfg]) => {
            const Icon = cfg.icon;
            return (
              <div key={q} className="flex items-center gap-1"><Icon className="w-3 h-3" style={{color: cfg.color}} />
                <span className="text-[9px] font-medium" style={{color: cfg.color}}>{cfg.label}: {matrix.quadrants[q]?.count || 0}</span>
              </div>
            );
          })}
        </div>
      </div>
      <div className="flex-1 overflow-y-auto p-4">
        <div className="grid grid-cols-5 gap-2 mb-4">
          <SC label="Revenue" value={`$${(matrix.summary.total_revenue/1000).toFixed(0)}K`} color={ACCENT} />
          <SC label="Margin" value={`$${(matrix.summary.total_margin/1000).toFixed(0)}K`} color="#22c55e" />
          <SC label="Avg FC%" value={`${matrix.summary.avg_food_cost_pct}%`} color={matrix.summary.avg_food_cost_pct > 33 ? "#ef4444" : "#22c55e"} />
          <SC label="Avg CM" value={`$${matrix.summary.avg_contribution_margin}`} color="#3b82f6" />
          <SC label="Items" value={matrix.summary.total_items} color="#a855f7" />
        </div>

        {/* Matrix scatter plot */}
        <div className="p-4 mb-4 rounded-lg relative" style={{background: SURFACE, border: `1px solid ${BORDER}`, height: 260}}>
          <div className="absolute left-10 top-2 bottom-8 w-px" style={{background: BORDER}} />
          <div className="absolute left-10 bottom-8 right-2 h-px" style={{background: BORDER}} />
          <div className="absolute left-1 top-1/2 -translate-y-1/2 -rotate-90 text-[8px]" style={{color: "rgba(148,163,184,0.3)"}}>CM ($)</div>
          <div className="absolute bottom-1 left-1/2 text-[8px]" style={{color: "rgba(148,163,184,0.3)"}}>Mix %</div>
          {matrix.items.map((item: any, i: number) => {
            const x = 10 + (item.mix_pct / maxMix) * 85;
            const y = 100 - 8 - (item.contribution_margin / maxCM) * 80;
            const cfg = Q_COLORS[item.quadrant];
            const sz = Math.max(8, Math.min(18, item.total_revenue / 800));
            return (
              <div key={i} className="absolute group" style={{left: `${x}%`, top: `${y}%`, transform: "translate(-50%,-50%)"}}>
                <div className="rounded-full hover:scale-150 transition cursor-pointer"
                  style={{width: sz, height: sz, background: cfg.color, opacity: 0.8}} />
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 hidden group-hover:block z-30 p-2 rounded whitespace-nowrap"
                  style={{background: "rgba(0,0,0,0.95)", border: `1px solid ${BORDER}`}}>
                  <div className="text-[9px] font-semibold text-white">{item.name}</div>
                  <div className="text-[8px]" style={{color: cfg.color}}>{cfg.label} | CM: ${item.contribution_margin} | Mix: {item.mix_pct}%</div>
                </div>
              </div>
            );
          })}
        </div>

        {/* By quadrant */}
        {["star", "puzzle", "plowhorse", "dog"].map(q => {
          const cfg = Q_COLORS[q]; const Icon = cfg.icon;
          const qItems = matrix.items.filter((i: any) => i.quadrant === q);
          if (!qItems.length) return null;
          return (
            <div key={q} className="mb-3">
              <div className="flex items-center gap-2 mb-1"><Icon className="w-3.5 h-3.5" style={{color: cfg.color}} />
                <span className="text-[11px] font-semibold" style={{color: cfg.color}}>{cfg.label}s ({qItems.length})</span>
              </div>
              {qItems.map((item: any) => (
                <div key={item.name} className="flex items-center gap-3 px-3 py-1.5 rounded mb-0.5" style={{background: cfg.bg}}>
                  <span className="text-[10px] font-medium text-white flex-1">{item.name}</span>
                  <span className="text-[9px]" style={{...MONO, color: "rgba(148,163,184,0.5)"}}>Mix:{item.mix_pct}%</span>
                  <span className="text-[9px]" style={{...MONO, color: ACCENT}}>${item.price}</span>
                  <span className="text-[9px]" style={{...MONO, color: item.food_cost_pct > 35 ? "#ef4444" : "#22c55e"}}>FC:{item.food_cost_pct}%</span>
                  <span className="text-[9px] font-medium" style={{...MONO, color: cfg.color}}>CM:${item.contribution_margin}</span>
                </div>
              ))}
            </div>
          );
        })}

        {/* Recommendations */}
        <div className="mt-3"><div className="text-[11px] font-semibold mb-1.5 text-white flex items-center gap-1"><Zap className="w-3.5 h-3.5" style={{color: "#f59e0b"}} /> Recommendations</div>
          {matrix.recommendations?.slice(0, 6).map((r: any, i: number) => (
            <div key={i} className="text-[9px] px-3 py-1.5 mb-0.5 rounded" style={{background: SURFACE, border: `1px solid ${BORDER}`}}>
              <span className="font-semibold" style={{color: ACCENT}}>{r.item}</span>: <span style={{color: "rgba(148,163,184,0.6)"}}>{r.detail}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function SC({label, value, color}: {label: string; value: any; color: string}) {
  return (
    <div className="px-3 py-2 rounded-lg" style={{background: `${color}06`, border: `1px solid ${color}15`}}>
      <div className="text-[14px] font-bold" style={{fontFamily: "'IBM Plex Mono', monospace", color}}>{value}</div>
      <div className="text-[8px] uppercase tracking-wider" style={{color: `${color}80`}}>{label}</div>
    </div>
  );
}
