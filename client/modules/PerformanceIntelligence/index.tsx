import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  Activity, BarChart3, Target, TrendingUp, Clock, DollarSign, Users,
  Search, RefreshCw, Gauge, AlertTriangle, Calendar, FileSpreadsheet,
  Layers, Info, AreaChart, LineChart, BarChart, ChevronRight,
  ArrowUpRight, ArrowDownRight, Shield, Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";

const API = window.location.origin;
const G = (path: string) => fetch(`${API}/api/echoai3/performance${path}`).then(r => r.json());
const R = (path: string) => fetch(`${API}/api/echoai3/roi${path}`).then(r => r.json());

const FONT = { fontFamily: "'IBM Plex Sans', system-ui, sans-serif" };
const MONO = { fontFamily: "'IBM Plex Mono', monospace" };
const BG = "#04060d";
const SURFACE = "rgba(255,255,255,0.025)";
const BORDER = "rgba(255,255,255,0.06)";
const ACCENT = "#c8a97e";
const ACCENT_DIM = "rgba(200,169,126,0.12)";

type Tab = "timeline" | "efficiency" | "breakeven" | "roi" | "search";
type GraphStyle = "bars" | "line" | "area" | "stacked";

export default function PerformanceIntelligencePanel() {
  const [tab, setTab] = useState<Tab>("timeline");

  const TABS: { id: Tab; label: string; icon: any }[] = [
    { id: "timeline", label: "Timeline", icon: Activity },
    { id: "efficiency", label: "Efficiency", icon: Gauge },
    { id: "breakeven", label: "Break-Even", icon: Target },
    { id: "roi", label: "ROI Breakdown", icon: DollarSign },
    { id: "search", label: "BEO Search", icon: Search },
  ];

  return (
    <div className="flex flex-col h-full overflow-hidden" style={{ ...FONT, background: BG, color: "#e2e8f0" }}
      data-testid="performance-intelligence-panel">
      <div style={{ borderBottom: `1px solid ${BORDER}` }}>
        <div className="flex items-center gap-4 px-6 py-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-md flex items-center justify-center"
              style={{ background: ACCENT_DIM, border: `1px solid rgba(200,169,126,0.25)` }}>
              <Activity className="w-4 h-4" style={{ color: ACCENT }} />
            </div>
            <div>
              <div className="text-[13px] font-semibold tracking-wide text-white">PERFORMANCE INTELLIGENCE</div>
              <div className="text-[9px] tracking-[0.2em] uppercase" style={{ ...MONO, color: "rgba(200,169,126,0.6)" }}>
                Labor | Events | Proforma
              </div>
            </div>
          </div>
          <div className="flex-1" />
          <div className="flex items-center gap-0.5 p-0.5 rounded-lg" style={{ background: SURFACE, border: `1px solid ${BORDER}` }}>
            {TABS.map(t => (
              <button key={t.id} data-testid={`perf-tab-${t.id}`}
                onClick={() => setTab(t.id)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[11px] font-medium transition-all"
                style={{
                  background: tab === t.id ? ACCENT_DIM : "transparent",
                  color: tab === t.id ? ACCENT : "rgba(148,163,184,0.7)",
                  border: tab === t.id ? `1px solid rgba(200,169,126,0.2)` : "1px solid transparent",
                }}>
                <t.icon className="w-3 h-3" />
                {t.label}
              </button>
            ))}
          </div>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto" style={{ scrollbarWidth: "thin", scrollbarColor: `${BORDER} transparent` }}>
        {tab === "timeline" && <TimelineView />}
        {tab === "efficiency" && <EfficiencyView />}
        {tab === "breakeven" && <BreakevenView />}
        {tab === "roi" && <ROIView />}
        {tab === "search" && <SearchView />}
      </div>
    </div>
  );
}

/* ─── Graph Style Picker ─── */
const GRAPH_STYLES: { id: GraphStyle; label: string; icon: any }[] = [
  { id: "bars", label: "Bar", icon: BarChart },
  { id: "line", label: "Line", icon: LineChart },
  { id: "area", label: "Area", icon: AreaChart },
  { id: "stacked", label: "Stacked", icon: BarChart3 },
];

function GraphStylePicker({ value, onChange }: { value: GraphStyle; onChange: (v: GraphStyle) => void }) {
  return (
    <div className="flex items-center gap-0.5 p-0.5 rounded-md" style={{ background: SURFACE, border: `1px solid ${BORDER}` }}
      data-testid="graph-style-picker">
      {GRAPH_STYLES.map(s => (
        <button key={s.id} onClick={() => onChange(s.id)} data-testid={`graph-style-${s.id}`}
          className="flex items-center gap-1 px-2 py-1 rounded text-[10px] transition-all"
          style={{
            background: value === s.id ? ACCENT_DIM : "transparent",
            color: value === s.id ? ACCENT : "rgba(148,163,184,0.4)",
          }}>
          <s.icon className="w-3 h-3" />
          {s.label}
        </button>
      ))}
    </div>
  );
}

/* ─── Timeline View ─── */
function TimelineView() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [graphStyle, setGraphStyle] = useState<GraphStyle>("bars");
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);
  const [dayAnalysis, setDayAnalysis] = useState<any>(null);
  const [dayLoading, setDayLoading] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string>("");

  useEffect(() => {
    setLoading(true);
    G("/timeline").then(d => { setData(d); setLoading(false); }).catch(() => setLoading(false));
  }, []);

  const loadDayAnalysis = useCallback((date: string) => {
    setSelectedDate(date);
    setDayLoading(true);
    setDayAnalysis(null);
    G(`/day-analysis?date=${date}`).then(d => { setDayAnalysis(d); setDayLoading(false); }).catch(() => setDayLoading(false));
  }, []);

  if (loading) return <Loader />;
  if (!data) return <Empty msg="No timeline data available" />;

  const tl = data.timeline || [];
  const maxCovers = Math.max(1, ...tl.map((p: any) => p.total_covers));
  const maxHours = Math.max(1, ...tl.map((p: any) => p.labor_hours));
  const maxBeos = Math.max(1, ...tl.map((p: any) => p.beo_count));
  const maxVal = Math.max(maxCovers, maxHours);

  return (
    <div className="p-6 space-y-5" data-testid="timeline-view">
      {/* Header + Controls */}
      <div className="flex items-center justify-between">
        <SectionLabel label="Event & Labor Timeline" />
        <div className="flex items-center gap-3">
          <ExportButton dateFrom={data.period?.start} dateTo={data.period?.end} />
          <GraphStylePicker value={graphStyle} onChange={setGraphStyle} />
        </div>
      </div>

      {/* Summary KPIs */}
      <div className="grid grid-cols-5 gap-3">
        <KPI label="Total Events" value={String(data.total_events)} icon={Calendar} />
        <KPI label="Total Covers" value={data.total_covers?.toLocaleString()} icon={Users} />
        <KPI label="Total Revenue" value={fmt$(data.total_revenue)} icon={DollarSign} />
        <KPI label="Active Days" value={String(tl.length)} icon={Activity} />
        <KPI label="Recommendations" value={String(data.recommendations?.length || 0)} icon={AlertTriangle} />
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 text-[10px]" style={MONO}>
        <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm" style={{ background: ACCENT }} />Covers</span>
        <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm" style={{ background: "#3b82f6" }} />Labor Hours</span>
        <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm" style={{ background: "#10b981" }} />BEO Count</span>
        <span className="ml-auto text-[9px]" style={{ color: "rgba(148,163,184,0.3)" }}>Click a day bar for full analysis</span>
      </div>

      {/* Chart Area */}
      <div className="rounded-lg overflow-hidden" style={{ background: SURFACE, border: `1px solid ${BORDER}` }}
        data-testid="timeline-chart">
        <div className="px-4 py-3 flex items-center justify-between" style={{ borderBottom: `1px solid ${BORDER}` }}>
          <span className="text-[10px] uppercase tracking-widest" style={{ ...MONO, color: "rgba(200,169,126,0.5)" }}>
            {data.period?.start} to {data.period?.end}
          </span>
        </div>
        <div className="overflow-x-auto px-4 pb-3 pt-2" style={{ scrollbarWidth: "thin", scrollbarColor: `${BORDER} transparent` }}>
          <div style={{ minWidth: `${Math.max(800, tl.length * 80)}px`, height: "240px", position: "relative" }}>
            {/* Y-axis grid lines */}
            {[0.25, 0.5, 0.75, 1].map(pct => (
              <div key={pct} className="absolute left-0 right-0" style={{ bottom: `${pct * 180 + 30}px`, height: "1px", background: "rgba(255,255,255,0.02)" }} />
            ))}
            <div className="flex gap-1 h-full items-end">
              {tl.map((point: any, idx: number) => {
                const isHovered = hoveredIdx === idx;
                const isSelected = selectedDate === point.date;
                return (
                  <div key={idx}
                    className="flex-1 flex flex-col items-center justify-end relative cursor-pointer"
                    style={{ minWidth: "60px" }}
                    onMouseEnter={() => setHoveredIdx(idx)}
                    onMouseLeave={() => setHoveredIdx(null)}
                    onClick={() => loadDayAnalysis(point.date)}
                    data-testid={`timeline-point-${idx}`}>

                    {/* Tooltip on hover */}
                    {isHovered && (
                      <div className="absolute bottom-full mb-2 z-20 rounded-lg p-3 shadow-2xl whitespace-nowrap pointer-events-none"
                        style={{ background: "#1a1d27", border: `1px solid rgba(200,169,126,0.2)`, minWidth: "200px" }}>
                        <div className="text-[11px] font-semibold text-white mb-2">{point.date}</div>
                        <div className="space-y-1 text-[10px]" style={MONO}>
                          <div className="flex justify-between gap-4"><span style={{ color: "rgba(148,163,184,0.5)" }}>BEOs</span><span className="text-white">{point.beo_count}</span></div>
                          <div className="flex justify-between gap-4"><span style={{ color: "rgba(148,163,184,0.5)" }}>Covers</span><span style={{ color: ACCENT }}>{point.total_covers}</span></div>
                          <div className="flex justify-between gap-4"><span style={{ color: "rgba(148,163,184,0.5)" }}>Labor Hrs</span><span style={{ color: "#3b82f6" }}>{point.labor_hours}</span></div>
                          <div className="flex justify-between gap-4"><span style={{ color: "rgba(148,163,184,0.5)" }}>Revenue</span><span style={{ color: "#10b981" }}>{fmt$(point.total_revenue)}</span></div>
                          <div className="flex justify-between gap-4"><span style={{ color: "rgba(148,163,184,0.5)" }}>Staff</span><span className="text-white">{point.staff_needed}</span></div>
                        </div>
                        <div className="mt-2 pt-1.5 text-[9px]" style={{ borderTop: `1px solid ${BORDER}`, color: "rgba(200,169,126,0.5)" }}>
                          Click for full day analysis
                        </div>
                      </div>
                    )}

                    {/* Render based on graph style */}
                    <div className="w-full px-1" style={{ height: "180px", position: "relative" }}>
                      {graphStyle === "bars" && (
                        <div className="flex items-end gap-[2px] h-full">
                          <div className="flex-1 rounded-t transition-all duration-200"
                            style={{ height: `${(point.total_covers / maxVal) * 100}%`, background: isHovered || isSelected ? ACCENT : "rgba(200,169,126,0.5)", opacity: isSelected ? 1 : (isHovered ? 0.9 : 0.6) }} />
                          <div className="flex-1 rounded-t transition-all duration-200"
                            style={{ height: `${(point.labor_hours / maxVal) * 100}%`, background: isHovered || isSelected ? "#3b82f6" : "rgba(59,130,246,0.5)", opacity: isSelected ? 1 : (isHovered ? 0.9 : 0.6) }} />
                          <div className="flex-1 rounded-t transition-all duration-200"
                            style={{ height: `${(point.beo_count / maxBeos) * 100}%`, background: isHovered || isSelected ? "#10b981" : "rgba(16,185,129,0.5)", opacity: isSelected ? 1 : (isHovered ? 0.9 : 0.6) }} />
                        </div>
                      )}
                      {graphStyle === "stacked" && (
                        <div className="flex flex-col justify-end h-full">
                          <div className="w-full rounded-t transition-all duration-200"
                            style={{ height: `${(point.beo_count / maxBeos) * 30}%`, background: isSelected ? "#10b981" : "rgba(16,185,129,0.5)" }} />
                          <div className="w-full transition-all duration-200"
                            style={{ height: `${(point.labor_hours / maxVal) * 35}%`, background: isSelected ? "#3b82f6" : "rgba(59,130,246,0.5)" }} />
                          <div className="w-full transition-all duration-200"
                            style={{ height: `${(point.total_covers / maxVal) * 35}%`, background: isSelected ? ACCENT : "rgba(200,169,126,0.5)" }} />
                        </div>
                      )}
                      {(graphStyle === "line" || graphStyle === "area") && (
                        <svg viewBox="0 0 60 180" className="w-full h-full" preserveAspectRatio="none">
                          {graphStyle === "area" && (
                            <>
                              <polygon points={`0,180 0,${180 - (point.total_covers / maxVal) * 160} 30,${180 - (point.total_covers / maxVal) * 160} 60,180`}
                                fill={isSelected ? "rgba(200,169,126,0.3)" : "rgba(200,169,126,0.12)"} />
                              <polygon points={`0,180 0,${180 - (point.labor_hours / maxVal) * 160} 30,${180 - (point.labor_hours / maxVal) * 160} 60,180`}
                                fill={isSelected ? "rgba(59,130,246,0.3)" : "rgba(59,130,246,0.12)"} />
                            </>
                          )}
                          <circle cx="30" cy={180 - (point.total_covers / maxVal) * 160} r={isSelected ? "5" : "3"}
                            fill={isSelected ? ACCENT : "rgba(200,169,126,0.7)"} />
                          <circle cx="30" cy={180 - (point.labor_hours / maxVal) * 160} r={isSelected ? "5" : "3"}
                            fill={isSelected ? "#3b82f6" : "rgba(59,130,246,0.7)"} />
                          <circle cx="30" cy={180 - (point.beo_count / maxBeos) * 160} r={isSelected ? "4" : "2.5"}
                            fill={isSelected ? "#10b981" : "rgba(16,185,129,0.7)"} />
                        </svg>
                      )}
                    </div>
                    {/* Date */}
                    <div className="text-[8px] mt-1 truncate" style={{
                      ...MONO,
                      color: isSelected ? ACCENT : (isHovered ? "rgba(200,169,126,0.6)" : "rgba(148,163,184,0.3)"),
                      fontWeight: isSelected ? 700 : 400,
                      maxWidth: "60px",
                    }}>
                      {point.date.slice(5)}
                    </div>
                    {/* Selection indicator */}
                    {isSelected && <div className="w-1.5 h-1.5 rounded-full mt-0.5" style={{ background: ACCENT }} />}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* ─── Day Deep Analysis Panel ─── */}
      {dayLoading && (
        <div className="flex items-center justify-center py-8 gap-2">
          <RefreshCw className="w-4 h-4 animate-spin" style={{ color: ACCENT }} />
          <span className="text-xs" style={{ color: "rgba(148,163,184,0.5)" }}>Analyzing {selectedDate}...</span>
        </div>
      )}

      {dayAnalysis && !dayLoading && (
        <DayAnalysisPanel data={dayAnalysis} />
      )}

      {/* Department Lines Table (collapsed when day analysis is showing) */}
      {!dayAnalysis && data.department_lines && (
        <DeptLinesTable tl={tl} deptLines={data.department_lines} />
      )}

      {/* Recommendations */}
      {!dayAnalysis && data.recommendations?.length > 0 && (
        <div className="space-y-2">
          <SectionLabel label="Staffing Recommendations" />
          {data.recommendations.map((r: any, i: number) => (
            <div key={i} className="rounded-lg p-4" style={{ background: SURFACE, border: `1px solid ${BORDER}`,
              borderLeft: `3px solid ${r.type === "pto_conflict" ? "#ef4444" : "#f59e0b"}` }}>
              <div className="flex items-start gap-2">
                <AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0" style={{ color: r.type === "pto_conflict" ? "#ef4444" : "#f59e0b" }} />
                <div>
                  <div className="text-[11px] text-white font-medium">{r.message}</div>
                  <div className="text-[10px] mt-1" style={{ ...MONO, color: "rgba(148,163,184,0.4)" }}>
                    Dates: {r.dates?.slice(0, 5).join(", ")}{r.dates?.length > 5 ? ` +${r.dates.length - 5} more` : ""}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ─── Day Deep Analysis Panel ─── */
function DayAnalysisPanel({ data: d }: { data: any }) {
  if (!d || d.event_count === 0) {
    return (
      <div className="rounded-lg p-8 text-center" style={{ background: SURFACE, border: `1px solid ${BORDER}` }}>
        <Calendar className="w-6 h-6 mx-auto mb-2" style={{ color: "rgba(148,163,184,0.2)" }} />
        <div className="text-xs text-white font-medium mb-1">No Events on {d?.date}</div>
        <div className="text-[10px]" style={{ color: "rgba(148,163,184,0.4)" }}>Select a day with events for analysis.</div>
      </div>
    );
  }

  const fin = d.financial_summary;
  const scoreColor = d.efficiency_score >= 75 ? "#10b981" : d.efficiency_score >= 50 ? "#f59e0b" : "#ef4444";

  return (
    <div className="space-y-4" data-testid="day-analysis-panel">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <SectionLabel label={`Day Analysis: ${d.date}`} />
          <span className="text-[10px] px-2 py-0.5 rounded" style={{ ...MONO, background: `${scoreColor}15`, color: scoreColor }}>
            Score: {d.efficiency_score}/100
          </span>
        </div>
        <div className="text-[10px]" style={{ ...MONO, color: "rgba(148,163,184,0.4)" }}>
          {d.event_count} events | {d.total_covers} covers | {d.rooms_used?.length} rooms
        </div>
      </div>

      {/* Financial KPIs */}
      <div className="grid grid-cols-7 gap-2">
        <KPI label="Revenue" value={fmt$(fin.total_revenue)} icon={DollarSign} highlight />
        <KPI label="Food Rev" value={fmt$(fin.food_revenue)} icon={Activity} />
        <KPI label="Bev Rev" value={fmt$(fin.beverage_revenue)} icon={Activity} />
        <KPI label="Food Cost" value={`${fin.food_cost_pct}%`} icon={AlertTriangle} highlight={fin.food_cost_pct > 30} />
        <KPI label="Labor Cost" value={`${fin.labor_cost_pct}%`} icon={Users} highlight={fin.labor_cost_pct > 30} />
        <KPI label="Gross Margin" value={`${fin.gross_margin_pct}%`} icon={TrendingUp} highlight />
        <KPI label="Rev/Labor Hr" value={`$${fin.revenue_per_labor_hour}`} icon={Gauge} />
      </div>

      {/* Events Table */}
      <div className="rounded-lg overflow-hidden" style={{ background: SURFACE, border: `1px solid ${BORDER}` }}
        data-testid="day-events-table">
        <div className="px-4 py-2.5" style={{ borderBottom: `1px solid ${BORDER}` }}>
          <span className="text-[10px] uppercase tracking-widest" style={{ ...MONO, color: "rgba(200,169,126,0.5)" }}>
            Events on {d.date}
          </span>
        </div>
        <table className="w-full text-[10px]" style={MONO}>
          <thead>
            <tr style={{ borderBottom: `1px solid ${BORDER}` }}>
              <th className="text-left px-3 py-2" style={{ color: "rgba(200,169,126,0.5)" }}>BEO</th>
              <th className="text-left px-2 py-2" style={{ color: "rgba(148,163,184,0.4)" }}>Event</th>
              <th className="text-left px-2 py-2" style={{ color: "rgba(148,163,184,0.4)" }}>Room</th>
              <th className="text-right px-2 py-2" style={{ color: "rgba(148,163,184,0.4)" }}>Covers</th>
              <th className="text-right px-2 py-2" style={{ color: "rgba(148,163,184,0.4)" }}>Revenue</th>
              <th className="text-right px-2 py-2" style={{ color: "rgba(148,163,184,0.4)" }}>Food %</th>
              <th className="text-right px-2 py-2" style={{ color: "rgba(148,163,184,0.4)" }}>Staff</th>
              <th className="text-right px-3 py-2" style={{ color: "rgba(148,163,184,0.4)" }}>Type</th>
            </tr>
          </thead>
          <tbody>
            {d.events.map((e: any, i: number) => (
              <tr key={i} style={{ borderBottom: `1px solid ${BORDER}` }}>
                <td className="px-3 py-1.5 font-semibold" style={{ color: ACCENT }}>#{e.beo_number}</td>
                <td className="px-2 py-1.5 text-white truncate" style={{ maxWidth: "200px" }}>{e.event_name}</td>
                <td className="px-2 py-1.5" style={{ color: "rgba(148,163,184,0.5)" }}>{e.room}</td>
                <td className="text-right px-2 py-1.5 text-white">{e.covers}</td>
                <td className="text-right px-2 py-1.5" style={{ color: "#10b981" }}>{fmt$(e.revenue)}</td>
                <td className="text-right px-2 py-1.5" style={{ color: e.food_cost_pct > 30 ? "#ef4444" : "rgba(148,163,184,0.5)" }}>{e.food_cost_pct}%</td>
                <td className="text-right px-2 py-1.5" style={{ color: "rgba(148,163,184,0.5)" }}>{e.staff_needed}</td>
                <td className="text-right px-3 py-1.5 capitalize" style={{ color: "rgba(148,163,184,0.4)" }}>{e.event_classification?.replace(/_/g, " ") || "-"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Department Breakdown */}
      <div className="grid grid-cols-6 gap-2" data-testid="day-dept-breakdown">
        {Object.entries(d.department_breakdown).map(([dept, info]: [string, any]) => (
          <div key={dept} className="rounded-lg p-3" style={{ background: SURFACE, border: `1px solid ${BORDER}` }}>
            <div className="text-[9px] uppercase tracking-widest mb-2 capitalize" style={{ ...MONO, color: ACCENT }}>
              {dept.replace(/_/g, " ")}
            </div>
            <div className="space-y-1 text-[10px]" style={MONO}>
              <div className="flex justify-between"><span style={{ color: "rgba(148,163,184,0.4)" }}>Hours</span><span className="text-white">{info.hours}</span></div>
              <div className="flex justify-between"><span style={{ color: "rgba(148,163,184,0.4)" }}>Head</span><span className="text-white">{info.headcount}</span></div>
              <div className="flex justify-between"><span style={{ color: "rgba(148,163,184,0.4)" }}>Cost</span><span style={{ color: "#f59e0b" }}>{fmt$(info.labor_cost)}</span></div>
              <div className="flex justify-between"><span style={{ color: "rgba(148,163,184,0.4)" }}>$/Cover</span><span style={{ color: "rgba(148,163,184,0.5)" }}>${info.cost_per_cover}</span></div>
            </div>
          </div>
        ))}
      </div>

      {/* Risk Factors & Recommendations */}
      <div className="grid grid-cols-2 gap-3">
        {d.risk_factors?.length > 0 && (
          <div className="rounded-lg p-4" style={{ background: "rgba(239,68,68,0.02)", border: `1px solid rgba(239,68,68,0.08)` }}>
            <div className="text-[9px] uppercase tracking-widest mb-2" style={{ ...MONO, color: "rgba(239,68,68,0.5)" }}>Risk Factors</div>
            {d.risk_factors.map((r: any, i: number) => (
              <div key={i} className="flex items-start gap-2 mb-2">
                <Shield className="w-3 h-3 mt-0.5 shrink-0" style={{ color: r.severity === "high" ? "#ef4444" : "#f59e0b" }} />
                <div className="text-[10px]" style={{ color: "rgba(226,232,240,0.7)" }}>{r.message}</div>
              </div>
            ))}
          </div>
        )}
        {d.recommendations?.length > 0 && (
          <div className="rounded-lg p-4" style={{ background: "rgba(16,185,129,0.02)", border: `1px solid rgba(16,185,129,0.08)` }}>
            <div className="text-[9px] uppercase tracking-widest mb-2" style={{ ...MONO, color: "rgba(16,185,129,0.5)" }}>Recommendations</div>
            {d.recommendations.map((r: string, i: number) => (
              <div key={i} className="flex items-start gap-2 mb-2">
                <Zap className="w-3 h-3 mt-0.5 shrink-0" style={{ color: "#10b981" }} />
                <div className="text-[10px]" style={{ color: "rgba(226,232,240,0.7)" }}>{r}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/* ─── Department Lines Table ─── */
function DeptLinesTable({ tl, deptLines }: { tl: any[]; deptLines: any }) {
  return (
    <div className="rounded-lg p-4" style={{ background: SURFACE, border: `1px solid ${BORDER}` }} data-testid="dept-labor-lines">
      <div className="text-[10px] uppercase tracking-widest mb-3" style={{ ...MONO, color: "rgba(200,169,126,0.5)" }}>
        Department Labor Hours by Date
      </div>
      <div className="overflow-x-auto" style={{ scrollbarWidth: "thin" }}>
        <table className="w-full text-[10px]" style={MONO}>
          <thead>
            <tr style={{ borderBottom: `1px solid ${BORDER}` }}>
              <th className="text-left px-2 py-1.5 sticky left-0" style={{ background: "#0a0d14", color: "rgba(200,169,126,0.5)", minWidth: "100px" }}>Department</th>
              {tl.map((p: any, i: number) => (
                <th key={i} className="text-right px-2 py-1.5" style={{ color: "rgba(148,163,184,0.3)", minWidth: "55px" }}>{p.date.slice(5)}</th>
              ))}
              <th className="text-right px-2 py-1.5 font-bold" style={{ color: ACCENT, minWidth: "65px" }}>Total</th>
            </tr>
          </thead>
          <tbody>
            {Object.entries(deptLines).map(([dept, points]: [string, any]) => {
              const total = points.reduce((s: number, p: any) => s + p.hours, 0);
              return (
                <tr key={dept} style={{ borderBottom: `1px solid ${BORDER}` }}>
                  <td className="text-left px-2 py-1.5 sticky left-0 capitalize" style={{ background: "#0a0d14", color: "rgba(148,163,184,0.6)" }}>
                    {dept.replace(/_/g, " ")}
                  </td>
                  {points.map((p: any, i: number) => (
                    <td key={i} className="text-right px-2 py-1.5" style={{ color: "rgba(148,163,184,0.45)" }}>{p.hours > 0 ? p.hours : "-"}</td>
                  ))}
                  <td className="text-right px-2 py-1.5 font-semibold" style={{ color: ACCENT }}>{total.toFixed(1)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ─── Efficiency View ─── */
function EfficiencyView() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    G("/department-efficiency").then(d => { setData(d); setLoading(false); }).catch(() => setLoading(false));
  }, []);

  if (loading) return <Loader />;
  if (!data) return <Empty msg="No efficiency data" />;

  const statusColor = (s: string) => s === "on_target" ? "#10b981" : s === "needs_improvement" ? "#f59e0b" : "#ef4444";

  return (
    <div className="p-6 space-y-5" data-testid="efficiency-view">
      <div className="flex items-center justify-between">
        <SectionLabel label="Department Efficiency" />
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-md" style={{
          background: data.gap <= 0 ? "rgba(16,185,129,0.08)" : "rgba(245,158,11,0.08)",
          border: `1px solid ${data.gap <= 0 ? "rgba(16,185,129,0.2)" : "rgba(245,158,11,0.2)"}`,
        }}>
          <Gauge className="w-3.5 h-3.5" style={{ color: data.gap <= 0 ? "#10b981" : "#f59e0b" }} />
          <span className="text-[11px] font-medium" style={{ ...MONO, color: data.gap <= 0 ? "#10b981" : "#f59e0b" }}>
            Overall: {data.overall_efficiency}% (Target: {data.target}%)
          </span>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-3">
        {Object.entries(data.departments || {}).map(([dept, info]: [string, any]) => {
          const c = statusColor(info.status);
          const pct = Math.min(100, (info.efficiency / info.target) * 100);
          return (
            <div key={dept} className="rounded-lg p-4" style={{ background: SURFACE, border: `1px solid ${BORDER}` }} data-testid={`dept-${dept}`}>
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-semibold text-white capitalize">{dept.replace(/_/g, " ")}</span>
                <span className="text-[9px] px-1.5 py-0.5 rounded uppercase" style={{ ...MONO, background: `${c}15`, color: c }}>{info.status.replace(/_/g, " ")}</span>
              </div>
              <div className="relative h-3 rounded-full overflow-hidden mb-2" style={{ background: "rgba(255,255,255,0.05)" }}>
                <div className="absolute inset-y-0 left-0 rounded-full transition-all duration-500"
                  style={{ width: `${pct}%`, background: `linear-gradient(90deg, ${c}80, ${c})` }} />
              </div>
              <div className="flex justify-between mb-3">
                <span className="text-[10px]" style={{ ...MONO, color: "rgba(148,163,184,0.4)" }}>{info.efficiency}% / {info.target}%</span>
                <span className="text-[10px] font-medium" style={{ ...MONO, color: info.gap <= 0 ? "#10b981" : "#ef4444" }}>
                  {info.gap <= 0 ? "+" : ""}{(-info.gap).toFixed(1)}%
                </span>
              </div>
              <div className="text-[10px] leading-snug p-2 rounded" style={{ background: "rgba(255,255,255,0.015)", color: "rgba(200,169,126,0.6)" }}>
                {info.recommendation}
              </div>
              {info.momentum_losses?.length > 0 && (
                <div className="mt-2 space-y-1">
                  <div className="text-[9px] uppercase tracking-widest" style={{ color: "rgba(148,163,184,0.3)" }}>Momentum Losses</div>
                  {info.momentum_losses.slice(0, 2).map((loss: any, i: number) => (
                    <div key={i} className="text-[10px] flex justify-between gap-2" style={{ color: "rgba(148,163,184,0.4)" }}>
                      <span>{loss.task || loss.reason}</span>
                      <span style={{ ...MONO, color: "#ef4444" }}>+{loss.over_by_minutes}m</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ─── Break-Even View ─── */
function BreakevenView() {
  const [data, setData] = useState<any>(null);
  const [covers, setCovers] = useState(80);
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    setLoading(true);
    G(`/break-even?covers=${covers}`).then(d => { setData(d); setLoading(false); }).catch(() => setLoading(false));
  }, [covers]);

  useEffect(() => { load(); }, [load]);
  if (loading && !data) return <Loader />;
  if (!data) return <Empty msg="No break-even data" />;

  return (
    <div className="p-6 space-y-5" data-testid="breakeven-view">
      <div className="flex items-center justify-between">
        <SectionLabel label="Break-Even & Proforma Analysis" />
        <div className="flex items-center gap-2">
          <span className="text-[10px]" style={{ color: "rgba(148,163,184,0.4)" }}>Covers:</span>
          <input type="number" value={covers} onChange={e => setCovers(parseInt(e.target.value) || 0)} onBlur={load}
            className="w-16 px-2 py-1 rounded text-[11px] outline-none text-right"
            style={{ ...MONO, background: "rgba(255,255,255,0.03)", border: `1px solid ${BORDER}`, color: "#e2e8f0" }}
            data-testid="covers-input" />
        </div>
      </div>
      <div className="grid grid-cols-4 gap-3">
        <KPI label="Break-Even Covers" value={String(data.break_even_covers)} icon={Target} highlight={data.current_covers >= data.break_even_covers} />
        <KPI label="Revenue / Person" value={fmt$(data.revenue_per_person)} icon={DollarSign} />
        <KPI label="Contribution / Person" value={fmt$(data.contribution_per_person)} icon={TrendingUp} />
        <KPI label="Fixed Costs" value={fmt$(data.fixed_costs)} icon={Layers} />
      </div>
      <div className="rounded-lg p-4" style={{ background: "rgba(200,169,126,0.03)", border: `1px solid rgba(200,169,126,0.1)`, borderLeft: `3px solid ${ACCENT}` }}>
        <div className="flex items-center gap-2 mb-1"><Info className="w-3.5 h-3.5" style={{ color: ACCENT }} /><span className="text-[10px] uppercase tracking-widest" style={{ ...MONO, color: ACCENT }}>Recommendation</span></div>
        <div className="text-[12px] leading-relaxed" style={{ color: "rgba(226,232,240,0.8)" }}>{data.recommendation}</div>
      </div>
      <div className="grid grid-cols-4 gap-3">
        {data.scenarios?.map((s: any, i: number) => {
          const isBreakeven = i === 0;
          const isCurrent = s.covers === data.current_covers;
          return (
            <div key={i} className="rounded-lg p-4" style={{
              background: isCurrent ? "rgba(200,169,126,0.04)" : SURFACE,
              border: `1px solid ${isCurrent ? "rgba(200,169,126,0.2)" : BORDER}`,
            }} data-testid={`scenario-${i}`}>
              <div className="flex items-center justify-between mb-3">
                <span className="text-lg font-bold" style={{ ...MONO, color: isCurrent ? ACCENT : "#e2e8f0" }}>{s.covers}</span>
                {isBreakeven && <span className="text-[8px] px-1.5 py-0.5 rounded uppercase" style={{ ...MONO, background: "rgba(245,158,11,0.1)", color: "#f59e0b" }}>Break-Even</span>}
                {isCurrent && !isBreakeven && <span className="text-[8px] px-1.5 py-0.5 rounded uppercase" style={{ ...MONO, background: ACCENT_DIM, color: ACCENT }}>Current</span>}
              </div>
              <div className="text-[8px] uppercase tracking-widest mb-2" style={{ color: "rgba(148,163,184,0.3)" }}>Covers</div>
              <div className="space-y-1.5 text-[10px]" style={MONO}>
                <Row label="Revenue" value={fmt$(s.revenue)} />
                <Row label="Variable" value={fmt$(s.variable_costs)} />
                <Row label="Fixed" value={fmt$(s.fixed_costs)} />
                <Row label="Total Cost" value={fmt$(s.total_cost)} />
                <div className="pt-1.5" style={{ borderTop: `1px solid ${BORDER}` }}>
                  <Row label="Profit" value={fmt$(s.profit)} color={s.profitable ? "#10b981" : "#ef4444"} bold />
                  <Row label="Margin" value={`${s.margin_pct}%`} color={s.profitable ? "#10b981" : "#ef4444"} />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ─── ROI View ─── */
function ROIView() {
  const [perBeo, setPerBeo] = useState<any>(null);
  const [annual, setAnnual] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [eventsPerDay, setEventsPerDay] = useState(12);

  useEffect(() => {
    setLoading(true);
    Promise.all([R("/per-beo"), R(`/annual?events_per_day=${eventsPerDay}`)])
      .then(([pb, a]) => { setPerBeo(pb); setAnnual(a); setLoading(false); })
      .catch(() => setLoading(false));
  }, [eventsPerDay]);

  if (loading && !perBeo) return <Loader />;
  if (!perBeo) return <Empty msg="No ROI data" />;
  const pb = perBeo.per_beo;

  return (
    <div className="p-6 space-y-5" data-testid="roi-view">
      <div className="flex items-center justify-between">
        <SectionLabel label="EchoAi\u00B3 ROI Breakdown" />
        <div className="flex items-center gap-2">
          <span className="text-[10px]" style={{ color: "rgba(148,163,184,0.4)" }}>Events/day:</span>
          <select value={eventsPerDay} onChange={e => setEventsPerDay(parseInt(e.target.value))}
            className="px-2 py-1 rounded text-[11px] outline-none"
            style={{ ...MONO, background: "rgba(255,255,255,0.03)", border: `1px solid ${BORDER}`, color: "#e2e8f0" }}
            data-testid="events-per-day-select">
            {[5, 12, 25, 50].map(n => <option key={n} value={n}>{n}</option>)}
          </select>
        </div>
      </div>
      <div className="grid grid-cols-4 gap-3">
        <KPI label="Manual Time / BEO" value={`${pb.total_manual_minutes}m`} icon={Clock} />
        <KPI label="Echo Time / BEO" value={`${pb.total_echo_minutes}m`} icon={Activity} />
        <KPI label="Time Saved / BEO" value={`${pb.hours_saved}h`} icon={TrendingUp} highlight />
        <KPI label="Efficiency Gain" value={`${pb.efficiency_gain_pct}%`} icon={Gauge} highlight />
      </div>
      {annual && (
        <div className="rounded-lg p-5" style={{ background: "rgba(200,169,126,0.03)", border: `1px solid rgba(200,169,126,0.12)` }} data-testid="annual-impact">
          <div className="text-[10px] uppercase tracking-widest mb-4" style={{ ...MONO, color: ACCENT }}>
            Annual Impact ({annual.events_per_day} events/day x {annual.operating_days} days)
          </div>
          <div className="grid grid-cols-4 gap-4">
            <div><div className="text-2xl font-bold" style={{ ...MONO, color: "#10b981" }}>{annual.annual_hours_saved?.toLocaleString()}</div><div className="text-[10px]" style={{ color: "rgba(148,163,184,0.4)" }}>Hours Saved</div></div>
            <div><div className="text-2xl font-bold" style={{ ...MONO, color: "#10b981" }}>{fmt$(annual.annual_cost_saved)}</div><div className="text-[10px]" style={{ color: "rgba(148,163,184,0.4)" }}>Cost Saved</div></div>
            <div><div className="text-2xl font-bold" style={{ ...MONO, color: ACCENT }}>{annual.annual_fte_saved}</div><div className="text-[10px]" style={{ color: "rgba(148,163,184,0.4)" }}>FTE Equivalent</div></div>
            <div><div className="text-2xl font-bold" style={{ ...MONO, color: ACCENT }}>{annual.annual_chef_hours_saved?.toLocaleString()}</div><div className="text-[10px]" style={{ color: "rgba(148,163,184,0.4)" }}>Chef Hours Saved</div></div>
          </div>
        </div>
      )}
      {/* Task Breakdown */}
      <div className="rounded-lg overflow-hidden" style={{ background: SURFACE, border: `1px solid ${BORDER}` }} data-testid="task-breakdown">
        <div className="px-4 py-2.5" style={{ borderBottom: `1px solid ${BORDER}` }}>
          <span className="text-[10px] uppercase tracking-widest" style={{ ...MONO, color: "rgba(200,169,126,0.5)" }}>Per-BEO Task Breakdown (Frequency-Weighted)</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-[10px]" style={MONO}>
            <thead>
              <tr style={{ borderBottom: `1px solid ${BORDER}` }}>
                <th className="text-left px-3 py-2" style={{ color: "rgba(200,169,126,0.5)", minWidth: "180px" }}>Task</th>
                <th className="text-right px-2 py-2" style={{ color: "rgba(148,163,184,0.4)" }}>Role</th>
                <th className="text-right px-2 py-2" style={{ color: "rgba(148,163,184,0.4)" }}>Freq</th>
                <th className="text-right px-2 py-2" style={{ color: "rgba(148,163,184,0.4)" }}>Manual</th>
                <th className="text-right px-2 py-2" style={{ color: "rgba(148,163,184,0.4)" }}>Echo</th>
                <th className="text-right px-2 py-2" style={{ color: "#10b981" }}>Saved</th>
                <th className="text-right px-3 py-2" style={{ color: "#10b981" }}>$/BEO</th>
              </tr>
            </thead>
            <tbody>
              {perBeo.breakdown?.map((b: any, i: number) => (
                <tr key={i} style={{ borderBottom: `1px solid ${BORDER}` }} className={b.frequency < 1 ? "opacity-70" : ""}>
                  <td className="text-left px-3 py-1.5 text-white">{b.task}</td>
                  <td className="text-right px-2 py-1.5" style={{ color: "rgba(148,163,184,0.4)" }}>{b.role}</td>
                  <td className="text-right px-2 py-1.5" style={{ color: b.frequency < 1 ? "#f59e0b" : "rgba(148,163,184,0.4)" }}>{b.frequency < 1 ? `${(b.frequency * 100).toFixed(0)}%` : "100%"}</td>
                  <td className="text-right px-2 py-1.5" style={{ color: "rgba(148,163,184,0.5)" }}>{b.manual_mins}m</td>
                  <td className="text-right px-2 py-1.5" style={{ color: "rgba(148,163,184,0.5)" }}>{b.echo_mins}m</td>
                  <td className="text-right px-2 py-1.5 font-semibold" style={{ color: "#10b981" }}>{b.saved_mins}m</td>
                  <td className="text-right px-3 py-1.5 font-semibold" style={{ color: "#10b981" }}>${b.cost_saved}</td>
                </tr>
              ))}
              <tr style={{ borderTop: `2px solid ${BORDER}` }}>
                <td className="text-left px-3 py-2 font-bold text-white" colSpan={3}>Total (Weighted)</td>
                <td className="text-right px-2 py-2 font-bold" style={{ color: ACCENT }}>{pb.total_manual_minutes}m</td>
                <td className="text-right px-2 py-2 font-bold" style={{ color: ACCENT }}>{pb.total_echo_minutes}m</td>
                <td className="text-right px-2 py-2 font-bold" style={{ color: "#10b981" }}>{pb.minutes_saved}m</td>
                <td className="text-right px-3 py-2 font-bold" style={{ color: "#10b981" }}>${pb.cost_saved}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
      <div className="rounded-lg p-3 flex items-start gap-2" style={{ background: "rgba(245,158,11,0.04)", border: `1px solid rgba(245,158,11,0.1)` }}>
        <Info className="w-3.5 h-3.5 mt-0.5 shrink-0" style={{ color: "#f59e0b" }} />
        <div className="text-[10px] leading-snug" style={{ color: "rgba(226,232,240,0.6)" }}>
          Tasks weighted by frequency per BEO. Batched tasks (order consolidation, vendor ordering, GL posting, financial reconciliation, menu analytics) amortized across events for realistic labor displacement.
        </div>
      </div>
    </div>
  );
}

/* ─── Search View ─── */
function SearchView() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const doSearch = useCallback(() => {
    if (!query.trim()) return;
    setLoading(true);
    const isNum = /^\d+$/.test(query.trim());
    const param = isNum ? `beo_number=${query.trim()}` : `company=${encodeURIComponent(query.trim())}`;
    G(`/search?${param}`).then(d => { setResults(d); setLoading(false); }).catch(() => setLoading(false));
  }, [query]);

  return (
    <div className="p-6 space-y-5" data-testid="search-view">
      <SectionLabel label="BEO Search & Lookup" />
      <div className="flex gap-2">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5" style={{ color: "rgba(148,163,184,0.3)" }} />
          <input type="text" value={query} onChange={e => setQuery(e.target.value)} onKeyDown={e => e.key === "Enter" && doSearch()}
            placeholder="Search by BEO number or company name..."
            className="w-full pl-9 pr-3 py-2 rounded-lg text-[12px] outline-none"
            style={{ background: SURFACE, border: `1px solid ${BORDER}`, color: "#e2e8f0" }}
            data-testid="beo-search-input" />
        </div>
        <button onClick={doSearch} disabled={loading}
          className="px-4 py-2 rounded-lg text-[11px] font-medium transition-all"
          style={{ background: ACCENT_DIM, color: ACCENT, border: `1px solid rgba(200,169,126,0.2)` }}
          data-testid="beo-search-btn">
          {loading ? "..." : "Search"}
        </button>
      </div>
      {results && (
        <div className="space-y-2">
          <div className="text-[10px]" style={{ ...MONO, color: "rgba(148,163,184,0.4)" }}>{results.total} results found</div>
          {results.results?.map((beo: any, i: number) => (
            <div key={i} className="rounded-lg p-3 flex items-center gap-4" style={{ background: SURFACE, border: `1px solid ${BORDER}` }}>
              <div className="text-sm font-bold" style={{ ...MONO, color: ACCENT }}>#{beo.beo_number}</div>
              <div className="flex-1">
                <div className="text-[12px] text-white font-medium">{beo.event_name}</div>
                <div className="text-[10px]" style={{ color: "rgba(148,163,184,0.4)" }}>{beo.event_date} | {beo.room} | {beo.guaranteed_count} covers</div>
              </div>
              <div className="text-right">
                <div className="text-[11px] font-semibold" style={{ ...MONO, color: "#10b981" }}>{fmt$(beo.financial?.total || 0)}</div>
                <div className="text-[9px] uppercase" style={{ ...MONO, color: "rgba(148,163,184,0.3)" }}>{beo.status}</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ─── Export Button ─── */
function ExportButton({ dateFrom, dateTo }: { dateFrom?: string; dateTo?: string }) {
  const [exporting, setExporting] = useState(false);
  const handleExport = async () => {
    setExporting(true);
    try {
      const from = dateFrom || "2026-01-01", to = dateTo || "2026-12-31";
      const data = await G(`/export?date_from=${from}&date_to=${to}`);
      let csv = "BEO#,Date,Event,Room,Covers,Revenue,Food Cost,Credits,Food Cost %\n";
      for (const evt of (data.events || [])) {
        csv += `${evt.beo_number},${evt.date},"${evt.event}",${evt.room},${evt.covers},${evt.revenue},${evt.food_cost},${evt.credits},${evt.food_cost_pct}%\n`;
      }
      csv += `\nSummary\nTotal Events,${data.summary?.total_events}\nTotal Covers,${data.summary?.total_covers}\nTotal Revenue,${data.summary?.total_revenue}\n`;
      csv += `\nDepartment Analysis\nDepartment,Labor Hours,Entries,Efficiency %,Target %,Hours/Cover,Est Cost\n`;
      for (const [dept, info] of Object.entries(data.department_analysis || {}) as any) {
        csv += `${dept},${info.total_labor_hours},${info.labor_entries},${info.efficiency},${info.target},${info.hours_per_cover},${info.estimated_cost}\n`;
      }
      const blob = new Blob([csv], { type: "text/csv" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a"); a.href = url; a.download = `echoai3-performance-${from}-to-${to}.csv`; a.click();
      URL.revokeObjectURL(url);
    } catch (e) { console.error("Export failed:", e); }
    setExporting(false);
  };
  return (
    <button onClick={handleExport} disabled={exporting}
      className="flex items-center gap-1.5 px-3 py-1.5 rounded text-[10px] transition-all hover:scale-[1.02]"
      style={{ ...MONO, background: "rgba(16,185,129,0.08)", color: "#10b981", border: `1px solid rgba(16,185,129,0.15)` }}
      data-testid="export-csv-btn">
      <FileSpreadsheet className="w-3 h-3" /> {exporting ? "Exporting..." : "Export CSV"}
    </button>
  );
}

/* ─── Shared Components ─── */
function SectionLabel({ label }: { label: string }) {
  return <div className="text-sm font-semibold text-white" style={FONT}>{label}</div>;
}
function KPI({ label, value, icon: Icon, highlight, delta }: { label: string; value: string; icon: any; highlight?: boolean; delta?: string }) {
  return (
    <div className="rounded-lg p-3.5" style={{ background: highlight ? "rgba(200,169,126,0.04)" : SURFACE, border: `1px solid ${highlight ? "rgba(200,169,126,0.15)" : BORDER}` }}>
      <div className="flex items-center gap-1.5 mb-1.5">
        <Icon className="w-3 h-3" style={{ color: highlight ? ACCENT : "rgba(148,163,184,0.35)" }} />
        <span className="text-[9px] uppercase tracking-widest" style={{ color: "rgba(148,163,184,0.35)" }}>{label}</span>
      </div>
      <div className="text-lg font-bold" style={{ ...MONO, color: highlight ? ACCENT : "#e2e8f0" }}>{value}</div>
      {delta && <div className="text-[10px]" style={{ ...MONO, color: "rgba(148,163,184,0.4)" }}>{delta}</div>}
    </div>
  );
}
function Row({ label, value, color, bold }: { label: string; value: string; color?: string; bold?: boolean }) {
  return (
    <div className="flex justify-between items-center">
      <span style={{ color: "rgba(148,163,184,0.5)" }}>{label}</span>
      <span style={{ color: color || "#e2e8f0", fontWeight: bold ? 700 : 400 }}>{value}</span>
    </div>
  );
}
function Loader() {
  return <div className="flex items-center justify-center h-64 gap-2"><RefreshCw className="w-4 h-4 animate-spin" style={{ color: ACCENT }} /><span className="text-xs" style={{ color: "rgba(148,163,184,0.5)" }}>Loading...</span></div>;
}
function Empty({ msg }: { msg: string }) {
  return <div className="flex flex-col items-center justify-center h-64"><Activity className="w-6 h-6 mb-2" style={{ color: "rgba(148,163,184,0.2)" }} /><span className="text-xs" style={{ color: "rgba(148,163,184,0.4)" }}>{msg}</span></div>;
}
function fmt$(n: number | undefined): string {
  if (n === undefined || n === null) return "$0";
  if (Math.abs(n) >= 1e6) return `$${(n / 1e6).toFixed(1)}M`;
  if (Math.abs(n) >= 1e3) return `$${(n / 1e3).toFixed(1)}K`;
  return `$${n.toFixed(0)}`;
}
