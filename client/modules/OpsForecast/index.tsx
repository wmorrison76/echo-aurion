import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  BarChart3, Calendar, Grid3X3, TrendingUp, Building, Users, DollarSign,
  ArrowUp, ArrowDown, Sun, Moon, Bed, Home, AlertTriangle, Zap,
  ChevronDown, Layers, Hotel, Utensils, Wine, Coffee, Info, Eye,
} from "lucide-react";

const API = window.location.origin;
const GET = (p: string) => fetch(`${API}/api/ops-forecast${p}`).then(r => r.json());

const FONT = { fontFamily: "'IBM Plex Sans', system-ui, sans-serif" };
const MONO = { fontFamily: "'IBM Plex Mono', monospace" };
const BG = "#04060d";
const SURFACE = "rgba(255,255,255,0.025)";
const BORDER = "rgba(255,255,255,0.06)";
const ACCENT = "#c8a97e";
const OCC_COLOR = "#3b82f6";
const ADR_COLOR = "#22c55e";
const REV_COLOR = "#a855f7";
const GROUP_COLOR = "#f59e0b";
const TRANS_COLOR = "#06b6d4";

type View = "grid" | "graph" | "rooms" | "outlets" | "groups" | "trends";

export default function OpsForecast21Day() {
  const [view, setView] = useState<View>("grid");
  const [forecast, setForecast] = useState<any>(null);
  const [groups, setGroups] = useState<any>(null);
  const [roomStates, setRoomStates] = useState<any>(null);
  const [outletForecast, setOutletForecast] = useState<any>(null);
  const [trends, setTrends] = useState<any>(null);
  const [summary, setSummary] = useState<any>(null);
  const [weather, setWeather] = useState<any>(null);

  useEffect(() => {
    // iter266.9 · The old /api/ops-forecast/21-day endpoint was renamed to
    // /api/forecast-21/forecast. Fetch the new one as the primary source,
    // then keep the rest of the OpsForecast feeds (groups, room states, etc.)
    // working via the legacy endpoint family for now.
    Promise.all([
      fetch(`${API}/api/forecast-21/forecast?property_id=prop-pier66`).then(r => r.json()).catch(() => null),
      GET("/groups"), GET("/room-states"),
      GET("/outlet-forecast"), GET("/trends"), GET("/summary"),
      fetch(`${API}/api/weather/ops-forecast-overlay`).then(r => r.json()).catch(() => null),
    ]).then(([f21, g, r, o, t, s, w]) => {
      // Adapt the new shape (forecast[]: [{date, occupancy, revenue, …}])
      // into the legacy structure the rest of this component expects:
      //   forecast.period.{start,end}
      //   forecast.days[] with .forecast_revenue, .forecast_adr, .forecast_occ_pct, …
      const adapted = f21
        ? {
            period: f21.period || { start: "", end: "" },
            days: (f21.forecast || []).map((d: any) => ({
              date: d.date,
              day_of_week: d.day_of_week,
              forecast_occ_pct: Math.round((d.occupancy?.percent ?? 0) * 10) / 10,
              forecast_revenue: d.revenue?.total ?? 0,
              forecast_adr: d.revenue?.adr ?? 0,
              forecast_revpar: d.revenue?.revpar ?? 0,
              covers_total: d.covers?.total ?? 0,
              group_mix_pct: d.occupancy?.group_pct ?? 0,
              confidence: d.confidence ?? 0,
              ai_insights: d.outlets || [],
            })),
          }
        : f21;
      setForecast(adapted);
      setGroups(g); setRoomStates(r);
      setOutletForecast(o); setTrends(t); setSummary(s);
      setWeather(w);
    });
  }, []);

  // iter266.9 · Guard against malformed responses — the new pipeline can
  // return {available: false, reason, remediation}. Show a clear error instead
  // of crashing with "undefined is not an object (evaluating 'p.period.start')".
  if (forecast && (forecast as any).available === false) {
    return (
      <div style={{ ...FONT, background: BG, color: "#e2e8f0" }} className="flex items-center justify-center h-full p-8">
        <div className="max-w-md text-center">
          <div className="text-amber-400 font-semibold mb-2">Forecast Pipeline Unavailable</div>
          <div className="text-sm text-slate-400 mb-3">
            {(forecast as any).reason || "Unknown error"}
          </div>
          <div className="text-xs text-slate-500">
            Remediation: {(forecast as any).remediation || "Contact admin"}
          </div>
        </div>
      </div>
    );
  }
  if (!forecast || !forecast.period || !forecast.days || !summary) {
    return <div style={{ ...FONT, background: BG, color: "#e2e8f0" }} className="flex items-center justify-center h-full text-sm">Loading forecast data…</div>;
  }

  const days = forecast.days || [];
  const maxRev = Math.max(...days.map((d: any) => d.forecast_revenue));
  const maxAdr = Math.max(...days.map((d: any) => d.forecast_adr));

  const VIEWS: { id: View; label: string; icon: any }[] = [
    { id: "grid", label: "Excel Grid", icon: Grid3X3 },
    { id: "graph", label: "Charts", icon: BarChart3 },
    { id: "rooms", label: "Room States", icon: Bed },
    { id: "outlets", label: "Outlet Forecast", icon: Utensils },
    { id: "groups", label: "Group Blocks", icon: Building },
    { id: "trends", label: "AI Trends", icon: TrendingUp },
  ];

  return (
    <div className="flex flex-col h-full overflow-hidden" style={{ ...FONT, background: BG, color: "#e2e8f0" }} data-testid="ops-forecast-panel">
      {/* Header */}
      <div style={{ borderBottom: `1px solid ${BORDER}` }}>
        <div className="flex items-center gap-4 px-5 py-2.5">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-md flex items-center justify-center" style={{ background: "rgba(59,130,246,0.1)", border: "1px solid rgba(59,130,246,0.25)" }}>
              <Calendar className="w-4 h-4" style={{ color: OCC_COLOR }} />
            </div>
            <div>
              <div className="text-[13px] font-semibold text-white">21-DAY OPERATIONS FORECAST</div>
              <div className="text-[9px] tracking-[0.15em] uppercase" style={{ ...MONO, color: "rgba(59,130,246,0.5)" }}>
                {forecast.period.start} to {forecast.period.end} | {CAPACITY} Rooms
              </div>
            </div>
          </div>
          {/* Quick stats */}
          <div className="flex items-center gap-3 ml-3">
            <QS label="Avg Occ" value={`${summary.avg_forecast_occ_pct}%`} color={OCC_COLOR} />
            <QS label="Avg ADR" value={`$${summary.avg_forecast_adr}`} color={ADR_COLOR} />
            <QS label="21d Rev" value={`$${(summary.total_revenue_forecast / 1000000).toFixed(1)}M`} color={REV_COLOR} />
            <QS label="Group" value={`${summary.group_mix_pct}%`} color={GROUP_COLOR} />
            <QS label="Guests" value={summary.total_guests.toLocaleString()} color={TRANS_COLOR} />
          </div>
          <div className="flex-1" />
          <div className="flex items-center gap-0.5 p-0.5 rounded-lg" style={{ background: SURFACE, border: `1px solid ${BORDER}` }}>
            {VIEWS.map(v => (
              <button key={v.id} onClick={() => setView(v.id)} data-testid={`view-${v.id}`}
                className="flex items-center gap-1 px-2 py-1.5 rounded-md text-[10px] font-medium transition-all"
                style={{
                  background: view === v.id ? "rgba(59,130,246,0.08)" : "transparent",
                  color: view === v.id ? OCC_COLOR : "rgba(148,163,184,0.5)",
                  border: view === v.id ? "1px solid rgba(59,130,246,0.15)" : "1px solid transparent",
                }}>
                <v.icon className="w-3 h-3" />{v.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-auto">
        {/* EXCEL GRID VIEW */}
        {view === "grid" && (
          <div className="overflow-x-auto" data-testid="grid-view">
            <table className="w-full text-[10px] border-collapse min-w-[1400px]">
              <thead>
                <tr style={{ background: "rgba(0,0,0,0.3)" }}>
                  <th className="sticky left-0 z-10 px-2 py-1.5 text-left font-semibold" style={{ background: "rgba(4,6,13,1)", color: "rgba(148,163,184,0.5)", width: 90 }}>METRIC</th>
                  {days.map((d: any) => (
                    <th key={d.date} className="px-1.5 py-1.5 text-center font-semibold min-w-[60px]"
                      style={{ color: d.dow === "Sat" || d.dow === "Sun" ? ACCENT : "rgba(148,163,184,0.6)", borderBottom: `1px solid ${BORDER}` }}>
                      <div className="text-[9px]">{d.dow}</div>
                      <div className="text-[10px]">{d.date.slice(5)}</div>
                    </th>
                  ))}
                  <th className="px-2 py-1.5 text-center font-semibold" style={{ color: ACCENT, borderLeft: `2px solid ${BORDER}` }}>TOTAL</th>
                </tr>
              </thead>
              <tbody>
                <GridRow label="Capacity" days={days} field="capacity" fmt="int" totals={summary.capacity * 21} color="rgba(148,163,184,0.3)" />
                <GridRow label="OTB Rooms" days={days} field="otb_rooms" fmt="int" totals={summary.total_room_nights_otb} color="rgba(255,255,255,0.7)" />
                <GridRow label="Occ %" days={days} field="occ_pct" fmt="pct" totals={summary.avg_occ_pct} color={OCC_COLOR} />
                <GridRow label="Room Rev" days={days} field="rooms_revenue" fmt="money" totals={summary.total_revenue_otb} color={REV_COLOR} />
                <GridRow label="ADR" days={days} field="adr" fmt="dollar" totals={summary.avg_adr} color={ADR_COLOR} />
                <GridRow label="Fcst Occ%" days={days} field="forecast_occ_pct" fmt="pct" totals={summary.avg_forecast_occ_pct} color="rgba(59,130,246,0.8)" bg="rgba(59,130,246,0.02)" />
                <GridRow label="Fcst Rooms" days={days} field="forecast_rooms" fmt="int" totals={summary.total_room_nights_forecast} color="rgba(255,255,255,0.8)" bg="rgba(59,130,246,0.02)" />
                <GridRow label="Fcst Rev" days={days} field="forecast_revenue" fmt="money" totals={summary.total_revenue_forecast} color="rgba(168,85,247,0.8)" bg="rgba(59,130,246,0.02)" />
                <GridRow label="Fcst ADR" days={days} field="forecast_adr" fmt="dollar" totals={summary.avg_forecast_adr} color="rgba(34,197,94,0.8)" bg="rgba(59,130,246,0.02)" />
                <GridRow label="Arrivals" days={days} field="arrivals" fmt="int" totals={summary.total_arrivals} color="#22c55e" />
                <GridRow label="Departures" days={days} field="departures" fmt="int" totals={summary.total_departures} color="#ef4444" />
                <GridRow label="Group Rms" days={days} field="group_rooms" fmt="int" totals={summary.total_group_rooms} color={GROUP_COLOR} />
                <GridRow label="Transient" days={days} field="transient_rooms" fmt="int" totals={summary.total_transient_rooms} color={TRANS_COLOR} />
                <GridRow label="Guests" days={days} field="guest_count" fmt="int" totals={summary.total_guests} color="#ec4899" />
                <GridRow label="Guest/Rm" days={days} field="avg_guest_per_room" fmt="dec" totals={(summary.total_guests / Math.max(summary.total_room_nights_otb, 1)).toFixed(2)} color="rgba(148,163,184,0.5)" />
                <GridRow label="Pickup" days={days} field="pickup_rooms" fmt="int" totals={days.reduce((s: number, d: any) => s + d.pickup_rooms, 0)} color="rgba(34,197,94,0.6)" />
                {/* Weather overlay row */}
                {weather?.weather_by_date && (
                  <>
                    <tr style={{ height: 4 }}><td colSpan={days.length + 2} style={{ borderTop: `2px solid ${BORDER}` }} /></tr>
                    <tr>
                      <td className="sticky left-0 z-10 px-2 py-1 text-[9px] font-semibold uppercase" style={{ background: BG, color: "rgba(251,191,36,0.6)" }}>Weather</td>
                      {days.map((d: any) => {
                        const w = weather.weather_by_date[d.date];
                        if (!w) return <td key={d.date} className="text-center px-1 py-1 text-[9px]" style={{ color: "rgba(148,163,184,0.3)" }}>--</td>;
                        const icon = w.condition === "Clear" ? "\u2600" : w.condition === "Clouds" ? "\u2601" : w.condition === "Rain" ? "\ud83c\udf27" : w.condition === "Thunderstorm" ? "\u26c8" : "\u2601";
                        return (
                          <td key={d.date} className="text-center px-0.5 py-1" title={`${w.condition} | ${w.temp_low}-${w.temp_high}F | Rain: ${w.rain_chance}% | Covers x${w.covers_modifier}`}>
                            <div className="text-[11px]">{icon}</div>
                            <div className="text-[8px]" style={{ ...MONO, color: "rgba(251,191,36,0.7)" }}>{w.temp_high}F</div>
                          </td>
                        );
                      })}
                      <td className="text-center px-2 py-1 text-[8px]" style={{ ...MONO, color: "rgba(251,191,36,0.5)", borderLeft: `2px solid ${BORDER}` }}>LIVE</td>
                    </tr>
                    <tr>
                      <td className="sticky left-0 z-10 px-2 py-1 text-[9px] font-semibold uppercase" style={{ background: BG, color: "rgba(251,191,36,0.4)" }}>Rain %</td>
                      {days.map((d: any) => {
                        const w = weather.weather_by_date[d.date];
                        if (!w) return <td key={d.date} className="text-center px-1 py-1 text-[9px]" style={{ color: "rgba(148,163,184,0.3)" }}>--</td>;
                        const rainColor = w.rain_chance > 60 ? "rgba(239,68,68,0.7)" : w.rain_chance > 30 ? "rgba(251,191,36,0.7)" : "rgba(34,197,94,0.7)";
                        return (
                          <td key={d.date} className="text-center px-1 py-1 text-[9px]" style={{ ...MONO, color: rainColor }}>
                            {w.rain_chance}%
                          </td>
                        );
                      })}
                      <td className="text-center px-2 py-1" style={{ borderLeft: `2px solid ${BORDER}` }} />
                    </tr>
                    <tr>
                      <td className="sticky left-0 z-10 px-2 py-1 text-[9px] font-semibold uppercase" style={{ background: BG, color: "rgba(251,191,36,0.4)" }}>Cvr Mod</td>
                      {days.map((d: any) => {
                        const w = weather.weather_by_date[d.date];
                        if (!w) return <td key={d.date} className="text-center px-1 py-1 text-[9px]" style={{ color: "rgba(148,163,184,0.3)" }}>--</td>;
                        const modColor = w.covers_modifier >= 1.05 ? "rgba(34,197,94,0.8)" : w.covers_modifier < 0.9 ? "rgba(239,68,68,0.7)" : "rgba(251,191,36,0.6)";
                        return (
                          <td key={d.date} className="text-center px-1 py-1 text-[9px]" style={{ ...MONO, color: modColor }}>
                            x{w.covers_modifier}
                          </td>
                        );
                      })}
                      <td className="text-center px-2 py-1" style={{ borderLeft: `2px solid ${BORDER}` }} />
                    </tr>
                  </>
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* GRAPH VIEW */}
        {view === "graph" && (
          <div className="p-4 space-y-4" data-testid="graph-view">
            {/* Occupancy + ADR combo chart */}
            <div className="p-4 rounded-lg" style={{ background: SURFACE, border: `1px solid ${BORDER}` }}>
              <div className="flex items-center justify-between mb-3">
                <div className="text-[11px] font-semibold text-white">Occupancy & Revenue (21-Day)</div>
                <div className="flex items-center gap-3">
                  <Legend color={OCC_COLOR} label="OTB Occ%" /><Legend color="rgba(59,130,246,0.4)" label="Fcst Occ%" />
                  <Legend color={ADR_COLOR} label="ADR" /><Legend color={REV_COLOR} label="Revenue" />
                </div>
              </div>
              <div className="flex items-end gap-[3px] h-[200px]">
                {days.map((d: any) => {
                  const occH = (d.occ_pct / 100) * 180;
                  const foccH = (d.forecast_occ_pct / 100) * 180;
                  const revH = (d.forecast_revenue / maxRev) * 160;
                  return (
                    <div key={d.date} className="flex-1 relative group" style={{ height: 200 }}>
                      {/* Revenue bar (background) */}
                      <div className="absolute bottom-0 left-0 right-0 rounded-t-sm transition-all"
                        style={{ height: revH, background: "rgba(168,85,247,0.08)", borderTop: `1px solid rgba(168,85,247,0.15)` }} />
                      {/* Forecast occ bar */}
                      <div className="absolute bottom-0 rounded-t-sm" style={{ left: "10%", width: "35%", height: foccH, background: "rgba(59,130,246,0.15)", borderTop: `1px solid rgba(59,130,246,0.3)` }} />
                      {/* OTB occ bar */}
                      <div className="absolute bottom-0 rounded-t-sm" style={{ left: "50%", width: "40%", height: occH, background: OCC_COLOR, opacity: 0.7 }} />
                      {/* ADR dot */}
                      <div className="absolute w-1.5 h-1.5 rounded-full" style={{ bottom: (d.forecast_adr / maxAdr) * 170, left: "45%", background: ADR_COLOR }} />
                      {/* Label */}
                      <div className="absolute -bottom-4 left-0 right-0 text-center text-[7px]" style={{ color: d.dow === "Sat" || d.dow === "Sun" ? ACCENT : "rgba(148,163,184,0.3)" }}>
                        {d.date.slice(8)}
                      </div>
                      {/* Tooltip */}
                      <div className="absolute bottom-full left-1/2 -translate-x-1/2 hidden group-hover:block z-20 p-2 rounded-md text-[8px] whitespace-nowrap"
                        style={{ background: "rgba(0,0,0,0.95)", border: `1px solid ${BORDER}` }}>
                        <div className="font-semibold text-white">{d.dow} {d.date.slice(5)}</div>
                        <div style={{ color: OCC_COLOR }}>OTB: {d.occ_pct}% | Fcst: {d.forecast_occ_pct}%</div>
                        <div style={{ color: ADR_COLOR }}>ADR: ${d.adr.toFixed(0)} | Fcst: ${d.forecast_adr.toFixed(0)}</div>
                        <div style={{ color: REV_COLOR }}>Rev: ${(d.forecast_revenue / 1000).toFixed(0)}K</div>
                        <div style={{ color: GROUP_COLOR }}>Group: {d.group_rooms} | Trans: {d.transient_rooms}</div>
                        <div style={{ color: "#ec4899" }}>Guests: {d.guest_count} | Spend: ${(d.forecast_revenue / Math.max(d.guest_count, 1)).toFixed(0)}/guest</div>
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="mt-6 text-[8px] text-center" style={{ color: "rgba(148,163,184,0.3)" }}>April 13 — May 3, 2026</div>
            </div>

            {/* Group vs Transient stacked */}
            <div className="p-4 rounded-lg" style={{ background: SURFACE, border: `1px solid ${BORDER}` }}>
              <div className="flex items-center justify-between mb-3">
                <div className="text-[11px] font-semibold text-white">Group vs Transient Mix & ADR</div>
                <div className="flex items-center gap-3">
                  <Legend color={GROUP_COLOR} label="Group" /><Legend color={TRANS_COLOR} label="Transient" /><Legend color={ADR_COLOR} label="ADR" />
                </div>
              </div>
              <div className="flex items-end gap-[3px] h-[140px]">
                {days.map((d: any) => {
                  const total = d.group_rooms + d.transient_rooms;
                  const groupH = total > 0 ? (d.group_rooms / CAPACITY) * 120 : 0;
                  const transH = total > 0 ? (d.transient_rooms / CAPACITY) * 120 : 0;
                  return (
                    <div key={d.date} className="flex-1 relative group" style={{ height: 140 }}>
                      <div className="absolute bottom-0 left-[15%] rounded-t-sm" style={{ width: "70%", height: transH, background: TRANS_COLOR, opacity: 0.5 }} />
                      <div className="absolute bottom-0 left-[15%] rounded-t-sm" style={{ width: "70%", height: groupH, background: GROUP_COLOR, opacity: 0.7 }} />
                      {/* ADR line dot */}
                      <div className="absolute w-1.5 h-1.5 rounded-full" style={{ bottom: (d.forecast_adr / maxAdr) * 120, left: "45%", background: ADR_COLOR, zIndex: 5 }} />
                      <div className="absolute -bottom-4 left-0 right-0 text-center text-[7px]" style={{ color: "rgba(148,163,184,0.3)" }}>{d.date.slice(8)}</div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Guest count + anticipated daily spend */}
            <div className="p-4 rounded-lg" style={{ background: SURFACE, border: `1px solid ${BORDER}` }}>
              <div className="flex items-center justify-between mb-3">
                <div className="text-[11px] font-semibold text-white">Guest Count & Anticipated Daily Outlet Spend</div>
                <div className="flex items-center gap-3">
                  <Legend color="#ec4899" label="Guests" /><Legend color={ACCENT} label="$/Guest Spend" />
                </div>
              </div>
              <div className="flex items-end gap-[3px] h-[120px]">
                {days.map((d: any, i: number) => {
                  const maxG = Math.max(...days.map((x: any) => x.guest_count));
                  const h = (d.guest_count / maxG) * 100;
                  const spend = outletForecast?.outlet_forecast?.[i]?.anticipated_daily_spend || 0;
                  return (
                    <div key={d.date} className="flex-1 relative group" style={{ height: 120 }}>
                      <div className="absolute bottom-0 left-[15%] rounded-t-sm" style={{ width: "70%", height: h, background: "rgba(236,72,153,0.3)", borderTop: "1px solid rgba(236,72,153,0.5)" }} />
                      <div className="absolute top-1 left-0 right-0 text-center text-[7px] font-medium" style={{ ...MONO, color: ACCENT }}>${spend.toFixed(0)}</div>
                      <div className="absolute -bottom-4 left-0 right-0 text-center text-[7px]" style={{ color: "rgba(148,163,184,0.3)" }}>{d.date.slice(8)}</div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* ROOM STATES */}
        {view === "rooms" && roomStates && (
          <div className="p-4" data-testid="rooms-view">
            <div className="text-[11px] font-semibold mb-3 text-white">Room State Tracking (Checkout: 11:00 AM | Checkin: 2:00 PM | Flip Window: 3 hrs)</div>
            <div className="grid grid-cols-7 gap-2">
              {roomStates.room_states?.map((rs: any) => (
                <div key={rs.date} className="p-2.5 rounded-lg" style={{ background: SURFACE, border: `1px solid ${BORDER}` }} data-testid={`room-state-${rs.date}`}>
                  <div className="text-[10px] font-semibold text-white mb-1">{rs.dow} {rs.date.slice(5)}</div>
                  <div className="space-y-1">
                    <RoomBar label="Occupied" count={rs.states.occupied} total={CAPACITY} color="#3b82f6" />
                    <RoomBar label="Dirty (CO)" count={rs.states.dirty_checkout} total={CAPACITY} color="#ef4444" />
                    <RoomBar label="Clean Ready" count={rs.states.clean_ready} total={CAPACITY} color="#22c55e" />
                    <RoomBar label="Assigned Arr" count={rs.states.assigned_arrival} total={CAPACITY} color="#f59e0b" />
                  </div>
                  <div className="mt-1.5 pt-1.5 text-[8px]" style={{ borderTop: `1px solid ${BORDER}`, color: "rgba(148,163,184,0.5)" }}>
                    Flip: {rs.rooms_to_flip} rooms | HK Staff: {rs.hk_staff_needed}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* OUTLET FORECAST */}
        {view === "outlets" && outletForecast && (
          <div className="p-4" data-testid="outlets-view">
            <div className="text-[11px] font-semibold mb-3 text-white">Outlet Revenue & Covers Forecast (Based on Guest Count x Capture Rate)</div>
            <div className="overflow-x-auto">
              <table className="w-full text-[10px] min-w-[1200px]">
                <thead>
                  <tr style={{ borderBottom: `1px solid ${BORDER}` }}>
                    <th className="px-2 py-1.5 text-left" style={{ color: "rgba(148,163,184,0.5)" }}>Date</th>
                    <th className="px-2 py-1.5 text-center" style={{ color: "#ec4899" }}>Guests</th>
                    {["Signature Italian", "Rooftop Lounge", "Pool Bar & Grill", "Family Dining", "In-Room Dining"].map(o => (
                      <th key={o} className="px-2 py-1.5 text-center" style={{ color: ACCENT }}>{o}</th>
                    ))}
                    <th className="px-2 py-1.5 text-center" style={{ color: ADR_COLOR }}>Total Rev</th>
                    <th className="px-2 py-1.5 text-center" style={{ color: REV_COLOR }}>$/Guest</th>
                    {weather?.weather_by_date && <th className="px-2 py-1.5 text-center" style={{ color: "rgba(251,191,36,0.6)" }}>Weather</th>}
                  </tr>
                </thead>
                <tbody>
                  {outletForecast.outlet_forecast?.map((day: any) => {
                    const w = weather?.weather_by_date?.[day.date];
                    return (
                    <tr key={day.date} style={{ borderBottom: `1px solid rgba(255,255,255,0.02)` }} className="hover:bg-white/[0.02]">
                      <td className="px-2 py-1.5 font-medium text-white">{day.dow} {day.date.slice(5)}</td>
                      <td className="px-2 py-1.5 text-center font-medium" style={{ color: "#ec4899" }}>{day.total_guests}</td>
                      {["Signature Italian", "Rooftop Lounge", "Pool Bar & Grill", "Family Dining", "In-Room Dining"].map(o => {
                        const outlet = day.outlets[o];
                        return (
                          <td key={o} className="px-2 py-1.5 text-center">
                            <div className="text-[9px]" style={{ color: "rgba(148,163,184,0.5)" }}>{outlet?.covers || 0}cv</div>
                            <div className="font-medium" style={{ ...MONO, color: ACCENT }}>${(outlet?.revenue || 0).toLocaleString()}</div>
                          </td>
                        );
                      })}
                      <td className="px-2 py-1.5 text-center font-semibold" style={{ ...MONO, color: ADR_COLOR }}>${day.total_outlet_revenue.toLocaleString()}</td>
                      <td className="px-2 py-1.5 text-center font-medium" style={{ ...MONO, color: REV_COLOR }}>${day.anticipated_daily_spend}</td>
                      {weather?.weather_by_date && (
                        <td className="px-2 py-1.5 text-center">
                          {w ? (
                            <div>
                              <div className="text-[9px]" style={{ color: w.rain_chance > 50 ? "rgba(239,68,68,0.7)" : "rgba(34,197,94,0.7)" }}>
                                {w.condition} {w.temp_high}F
                              </div>
                              <div className="text-[8px]" style={{ ...MONO, color: w.covers_modifier >= 1 ? "rgba(34,197,94,0.6)" : "rgba(239,68,68,0.6)" }}>
                                x{w.covers_modifier} {w.pool_bar_open ? "Pool" : "Indoor"}
                              </div>
                            </div>
                          ) : <span className="text-[8px]" style={{ color: "rgba(148,163,184,0.3)" }}>--</span>}
                        </td>
                      )}
                    </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* GROUP BLOCKS */}
        {view === "groups" && groups && (
          <div className="p-4" data-testid="groups-view">
            <div className="flex items-center justify-between mb-3">
              <div className="text-[11px] font-semibold text-white">Definite Group Blocks ({groups.total_groups} groups, {groups.total_group_room_nights} room nights)</div>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {groups.groups?.map((g: any) => (
                <div key={g.name} className="p-3 rounded-lg" style={{ background: SURFACE, border: `1px solid ${BORDER}` }} data-testid={`group-${g.name.toLowerCase().replace(/\s+/g, '-').slice(0, 20)}`}>
                  <div className="flex items-center gap-2 mb-2">
                    <Building className="w-3.5 h-3.5" style={{ color: GROUP_COLOR }} />
                    <div className="text-[11px] font-semibold text-white flex-1">{g.name}</div>
                    <span className="text-[8px] px-1.5 py-0.5 rounded-full uppercase" style={{ background: "rgba(245,158,11,0.1)", color: GROUP_COLOR }}>{g.type}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-1 text-[9px]">
                    <div><span style={{ color: "rgba(148,163,184,0.4)" }}>Total Rooms:</span> <span className="font-medium text-white">{g.total_rooms}</span></div>
                    <div><span style={{ color: "rgba(148,163,184,0.4)" }}>Per Night:</span> <span className="font-medium text-white">{g.rooms_per_night}</span></div>
                    <div className="col-span-2"><span style={{ color: "rgba(148,163,184,0.4)" }}>Dates:</span> <span className="text-white">{g.dates?.map((d: string) => d.slice(5)).join(", ")}</span></div>
                    {g.attendees && <div><span style={{ color: "rgba(148,163,184,0.4)" }}>Attendees:</span> <span className="text-white">{g.attendees}</span></div>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* AI TRENDS */}
        {view === "trends" && trends && (
          <div className="p-4 space-y-4" data-testid="trends-view">
            {/* Insights */}
            <div className="space-y-2">
              <div className="text-[11px] font-semibold text-white">AI Insights</div>
              {trends.insights?.map((i: any, idx: number) => (
                <div key={idx} className="flex items-start gap-2 px-3 py-2 rounded-lg"
                  style={{ background: i.severity === "high" ? "rgba(239,68,68,0.04)" : SURFACE, border: `1px solid ${i.severity === "high" ? "rgba(239,68,68,0.12)" : BORDER}` }}>
                  {i.type === "event" ? <Zap className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" style={{ color: GROUP_COLOR }} /> :
                   i.type === "warning" ? <AlertTriangle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" style={{ color: "#f59e0b" }} /> :
                   <TrendingUp className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" style={{ color: ADR_COLOR }} />}
                  <div className="text-[10px]" style={{ color: "rgba(255,255,255,0.7)" }}>{i.message}</div>
                </div>
              ))}
            </div>
            {/* Summary cards */}
            <div className="grid grid-cols-4 gap-3">
              <TrendCard label="Revenue Trend" value={`${trends.revenue_trend.trend_pct > 0 ? "+" : ""}${trends.revenue_trend.trend_pct}%`} sub={`Wk1: $${(trends.revenue_trend.first_week_total / 1000).toFixed(0)}K → Wk3: $${(trends.revenue_trend.last_week_total / 1000).toFixed(0)}K`} color={trends.revenue_trend.trend_pct > 0 ? ADR_COLOR : "#ef4444"} />
              <TrendCard label="Peak Day" value={`${trends.peak.dow} ${trends.peak.date.slice(5)}`} sub={`$${(trends.peak.revenue / 1000).toFixed(0)}K rev | ${trends.peak.occ}% occ`} color={REV_COLOR} />
              <TrendCard label="Valley Day" value={`${trends.valley.dow} ${trends.valley.date.slice(5)}`} sub={`$${(trends.valley.revenue / 1000).toFixed(0)}K rev | ${trends.valley.occ}% occ`} color="#ef4444" />
              <TrendCard label="Group Mix" value={`${trends.group_vs_transient.avg_group_mix_pct}%`} sub={`${trends.group_vs_transient.group_heavy_days} group-heavy days`} color={GROUP_COLOR} />
            </div>
            {/* DOW patterns */}
            <div className="p-4 rounded-lg" style={{ background: SURFACE, border: `1px solid ${BORDER}` }}>
              <div className="text-[11px] font-semibold mb-3 text-white">Day-of-Week Patterns</div>
              <div className="grid grid-cols-7 gap-2">
                {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map(dow => {
                  const p = trends.dow_patterns[dow];
                  if (!p) return null;
                  return (
                    <div key={dow} className="p-2 rounded text-center" style={{ background: "rgba(255,255,255,0.015)" }}>
                      <div className="text-[11px] font-semibold" style={{ color: dow === "Sat" || dow === "Sun" ? ACCENT : "rgba(255,255,255,0.8)" }}>{dow}</div>
                      <div className="text-[10px] font-medium mt-1" style={{ ...MONO, color: OCC_COLOR }}>{p.avg_occ}%</div>
                      <div className="text-[9px]" style={{ ...MONO, color: ADR_COLOR }}>${p.avg_adr}</div>
                      <div className="text-[9px]" style={{ ...MONO, color: "rgba(148,163,184,0.4)" }}>${(p.avg_revenue / 1000).toFixed(0)}K</div>
                      <div className="text-[8px]" style={{ color: "#ec4899" }}>{p.avg_guests} guests</div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

const CAPACITY = 331;

function QS({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="flex items-center gap-1">
      <span className="text-[8px]" style={{ color: "rgba(148,163,184,0.4)" }}>{label}:</span>
      <span className="text-[10px] font-semibold" style={{ fontFamily: "'IBM Plex Mono', monospace", color }}>{value}</span>
    </div>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <div className="flex items-center gap-1">
      <span className="w-2 h-2 rounded-full" style={{ background: color }} />
      <span className="text-[8px]" style={{ color: "rgba(148,163,184,0.4)" }}>{label}</span>
    </div>
  );
}

function GridRow({ label, days, field, fmt, totals, color, bg }: any) {
  return (
    <tr style={{ background: bg || "transparent", borderBottom: `1px solid rgba(255,255,255,0.02)` }}>
      <td className="sticky left-0 z-10 px-2 py-1.5 text-[10px] font-semibold" style={{ background: bg || "rgba(4,6,13,1)", color }}>{label}</td>
      {days.map((d: any) => {
        const val = d[field];
        let display = "";
        if (fmt === "int") display = Math.round(val).toString();
        else if (fmt === "pct") display = `${val.toFixed(1)}%`;
        else if (fmt === "dollar") display = `$${val.toFixed(0)}`;
        else if (fmt === "money") display = `$${(val / 1000).toFixed(0)}K`;
        else if (fmt === "dec") display = val.toFixed(2);
        return (
          <td key={d.date} className="px-1.5 py-1.5 text-center text-[10px]" style={{ fontFamily: "'IBM Plex Mono', monospace", color }}>
            {display}
          </td>
        );
      })}
      <td className="px-2 py-1.5 text-center text-[10px] font-semibold" style={{ fontFamily: "'IBM Plex Mono', monospace", color, borderLeft: `2px solid rgba(255,255,255,0.04)` }}>
        {fmt === "money" ? `$${(totals / 1000).toFixed(0)}K` : fmt === "pct" ? `${Number(totals).toFixed(1)}%` : fmt === "dollar" ? `$${Number(totals).toFixed(0)}` : fmt === "dec" ? totals : totals}
      </td>
    </tr>
  );
}

function RoomBar({ label, count, total, color }: { label: string; count: number; total: number; color: string }) {
  const pct = Math.min(100, (count / total) * 100);
  return (
    <div>
      <div className="flex items-center justify-between mb-0.5">
        <span className="text-[9px]" style={{ color: "rgba(148,163,184,0.5)" }}>{label}</span>
        <span className="text-[9px] font-medium" style={{ fontFamily: "'IBM Plex Mono', monospace", color }}>{count}</span>
      </div>
      <div className="h-1.5 rounded-full" style={{ background: "rgba(255,255,255,0.04)" }}>
        <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: color, opacity: 0.7 }} />
      </div>
    </div>
  );
}

function TrendCard({ label, value, sub, color }: { label: string; value: string; sub: string; color: string }) {
  return (
    <div className="p-3 rounded-lg" style={{ background: `${color}06`, border: `1px solid ${color}15` }}>
      <div className="text-[9px] uppercase" style={{ color: `${color}80` }}>{label}</div>
      <div className="text-[16px] font-bold mt-0.5" style={{ fontFamily: "'IBM Plex Mono', monospace", color }}>{value}</div>
      <div className="text-[8px] mt-0.5" style={{ color: "rgba(148,163,184,0.4)" }}>{sub}</div>
    </div>
  );
}
