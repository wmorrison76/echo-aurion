import React, { useState, useEffect } from "react";
import {
  Cloud, CloudRain, CloudLightning, Sun, Wind, Droplets,
  Thermometer, Eye, UtensilsCrossed, Wine, Umbrella,
} from "lucide-react";

const API = window.location.origin;
const GET = (p: string) => fetch(`${API}${p}`).then(r => r.json()).catch(() => null);

const FONT = { fontFamily: "'IBM Plex Sans', system-ui, sans-serif" };
const MONO = { fontFamily: "'IBM Plex Mono', monospace" };
const BG = "#04060d";
const SURFACE = "rgba(255,255,255,0.025)";
const BORDER = "rgba(255,255,255,0.06)";
const ACCENT = "#c8a97e";

const COND_ICON: Record<string, typeof Sun> = {
  Clear: Sun, Clouds: Cloud, Rain: CloudRain, Drizzle: CloudRain, Thunderstorm: CloudLightning,
};
const COND_COLOR: Record<string, string> = {
  Clear: "#fbbf24", Clouds: "#94a3b8", Rain: "#3b82f6", Drizzle: "#60a5fa", Thunderstorm: "#a855f7",
};

type View = "overview" | "demand" | "hourly";

export default function WeatherCommandCenter() {
  const [current, setCurrent] = useState<any>(null);
  const [forecast, setForecast] = useState<any[]>([]);
  const [demand, setDemand] = useState<any>(null);
  const [rainTracker, setRainTracker] = useState<any>(null);
  const [view, setView] = useState<View>("overview");
  const [source, setSource] = useState("");

  useEffect(() => {
    Promise.all([
      GET("/api/weather/current"),
      GET("/api/weather/forecast?days=7"),
      GET("/api/weather/demand-impact?days=7"),
      GET("/api/weather/rain-tracker"),
    ]).then(([c, f, d, r]) => {
      setCurrent(c);
      setForecast(f?.forecast || []);
      setSource(f?.source || c?.source || "unknown");
      setDemand(d);
      setRainTracker(r);
    });
  }, []);

  const cond = current?.current?.condition?.main || "Clear";
  const CondIcon = COND_ICON[cond] || Sun;
  const condColor = COND_COLOR[cond] || "#fbbf24";
  const temp = current?.current?.temp;

  const VIEWS: { id: View; label: string }[] = [
    { id: "overview", label: "Conditions" },
    { id: "demand", label: "F&B Impact" },
    { id: "hourly", label: "Rain Tracker" },
  ];

  return (
    <div data-testid="weather-command-center" className="flex flex-col h-full overflow-hidden" style={{ ...FONT, background: BG, color: "#e2e8f0" }}>
      {/* Header */}
      <div className="flex items-center gap-4 px-5 py-2.5" style={{ borderBottom: `1px solid ${BORDER}` }}>
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-md flex items-center justify-center" style={{ background: `${condColor}12`, border: `1px solid ${condColor}30` }}>
            <CondIcon className="w-4 h-4" style={{ color: condColor }} />
          </div>
          <div>
            <div className="text-[13px] font-semibold text-white">WEATHER COMMAND CENTER</div>
            <div className="text-[9px] tracking-[0.15em] uppercase" style={{ ...MONO, color: `${condColor}80` }}>
              {current?.location?.name || "Fort Lauderdale, FL"} | {source === "openweathermap_live" || source === "openweathermap_cached" ? "LIVE" : "MODEL"}
            </div>
          </div>
        </div>
        {/* Current temp badge */}
        {temp && (
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-md" style={{ background: `${condColor}10`, border: `1px solid ${condColor}20` }}>
            <Thermometer className="w-3.5 h-3.5" style={{ color: condColor }} />
            <span className="text-lg font-mono font-bold text-white">{Math.round(temp)}</span>
            <span className="text-[10px] text-white/40">F</span>
            <span className="text-[10px] ml-1" style={{ color: condColor }}>{current?.current?.condition?.description}</span>
          </div>
        )}
        <div className="flex-1" />
        <div className="flex items-center gap-0.5 p-0.5 rounded-lg" style={{ background: SURFACE, border: `1px solid ${BORDER}` }}>
          {VIEWS.map(v => (
            <button key={v.id} onClick={() => setView(v.id)} data-testid={`weather-view-${v.id}`}
              className="px-2.5 py-1.5 rounded-md text-[10px] font-medium transition-all"
              style={{
                background: view === v.id ? `${ACCENT}10` : "transparent",
                color: view === v.id ? ACCENT : "rgba(148,163,184,0.5)",
                border: view === v.id ? `1px solid ${ACCENT}25` : "1px solid transparent",
              }}>
              {v.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-auto scrollbar-hide">
        {/* OVERVIEW */}
        {view === "overview" && (
          <div className="p-4 space-y-4">
            {/* Current conditions grid */}
            {current && (
              <div className="grid grid-cols-5 gap-2">
                <CondCard icon={Thermometer} label="Feels Like" value={`${Math.round(current.current.feels_like)}F`} sub={`${Math.round(current.current.temp_min)}-${Math.round(current.current.temp_max)}F`} color="#fbbf24" />
                <CondCard icon={Droplets} label="Humidity" value={`${current.current.humidity}%`} sub={current.current.humidity > 70 ? "High" : "Normal"} color="#3b82f6" />
                <CondCard icon={Wind} label="Wind" value={`${current.current.wind_speed} mph`} sub={`${current.current.wind_deg || 0}deg`} color="#06b6d4" />
                <CondCard icon={Eye} label="Visibility" value={`${((current.current.visibility || 10000) / 1000).toFixed(0)}km`} sub="Clear" color="#10b981" />
                <CondCard icon={Cloud} label="Clouds" value={`${current.current.clouds || 0}%`} sub={current.current.clouds > 50 ? "Overcast" : "Partly"} color="#94a3b8" />
              </div>
            )}

            {/* 7-Day Forecast */}
            <div>
              <div className="text-[10px] font-mono uppercase tracking-[0.15em] mb-2" style={{ color: `${ACCENT}60` }}>7-DAY FORECAST</div>
              <div className="grid grid-cols-7 gap-2">
                {forecast.map((day, i) => {
                  const DayIcon = COND_ICON[day.condition?.main] || Sun;
                  const dc = COND_COLOR[day.condition?.main] || "#fbbf24";
                  return (
                    <div key={i} data-testid={`forecast-day-${i}`} className="p-3 rounded-lg text-center transition-all hover:scale-[1.02]" style={{ background: SURFACE, border: `1px solid ${BORDER}` }}>
                      <div className="text-[10px] font-medium text-white/60 mb-1">{day.day_name?.substring(0, 3)}</div>
                      <div className="text-[8px] mb-2" style={{ ...MONO, color: "rgba(148,163,184,0.4)" }}>{day.date?.slice(5)}</div>
                      <DayIcon className="w-6 h-6 mx-auto mb-2" style={{ color: dc }} />
                      <div className="text-sm font-mono font-bold text-white">{Math.round(day.temp_high)}F</div>
                      <div className="text-[10px] font-mono text-white/30">{Math.round(day.temp_low)}F</div>
                      {/* Rain bar */}
                      <div className="mt-2 h-1 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.05)" }}>
                        <div className="h-full rounded-full" style={{
                          width: `${day.rain_chance}%`,
                          background: day.rain_chance > 60 ? "#3b82f6" : day.rain_chance > 30 ? "#fbbf24" : "#22c55e",
                        }} />
                      </div>
                      <div className="text-[8px] font-mono mt-1" style={{ color: day.rain_chance > 60 ? "#60a5fa" : "rgba(148,163,184,0.4)" }}>
                        {day.rain_chance}%
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Quick demand summary */}
            {demand && (
              <div>
                <div className="text-[10px] font-mono uppercase tracking-[0.15em] mb-2" style={{ color: `${ACCENT}60` }}>DEMAND MODIFIER PREVIEW</div>
                <div className="flex items-center gap-2">
                  {demand.impacts?.slice(0, 7).map((imp: any, i: number) => {
                    const modColor = imp.covers_modifier >= 1.05 ? "#22c55e" : imp.covers_modifier < 0.9 ? "#ef4444" : "#fbbf24";
                    return (
                      <div key={i} className="flex-1 p-2 rounded-md text-center" style={{ background: SURFACE, border: `1px solid ${BORDER}` }}>
                        <div className="text-[8px] text-white/40">{imp.day_name?.slice(0, 3)}</div>
                        <div className="text-sm font-mono font-bold" style={{ color: modColor }}>x{imp.covers_modifier}</div>
                        <div className="text-[7px]" style={{ color: imp.pool_bar_open ? "#22c55e" : "#ef4444" }}>
                          {imp.pool_bar_open ? "POOL" : "INDOOR"}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* F&B DEMAND IMPACT */}
        {view === "demand" && demand && (
          <div className="p-4 space-y-3" data-testid="weather-demand-view">
            <div className="flex items-center justify-between">
              <div className="text-[10px] font-mono uppercase tracking-[0.15em]" style={{ color: `${ACCENT}60` }}>F&B WEATHER DEMAND IMPACT</div>
              <div className="text-[10px] font-mono" style={{ color: ACCENT }}>Avg Modifier: x{demand.avg_covers_modifier}</div>
            </div>

            {demand.impacts?.map((imp: any, i: number) => {
              const DayIcon = COND_ICON[imp.weather] || Sun;
              const dc = COND_COLOR[imp.weather] || "#fbbf24";
              const modColor = imp.covers_modifier >= 1.05 ? "#22c55e" : imp.covers_modifier < 0.9 ? "#ef4444" : "#fbbf24";
              return (
                <div key={i} className="p-3 rounded-lg" style={{ background: SURFACE, border: `1px solid ${BORDER}` }} data-testid={`demand-day-${i}`}>
                  <div className="flex items-center gap-3 mb-2">
                    <DayIcon className="w-5 h-5 shrink-0" style={{ color: dc }} />
                    <div className="flex-1">
                      <div className="text-[11px] font-semibold text-white">{imp.day_name} {imp.date?.slice(5)}</div>
                      <div className="text-[9px] text-white/40">{imp.weather} | {imp.temp_low}-{imp.temp_high}F | Rain: {imp.rain_chance}%</div>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-mono font-bold" style={{ color: modColor }}>x{imp.covers_modifier}</div>
                      <div className="text-[8px]" style={{ color: "rgba(148,163,184,0.4)" }}>covers mod</div>
                    </div>
                  </div>
                  {/* Outlet split bar */}
                  <div className="flex items-center gap-2 mb-2">
                    <div className="flex-1 h-1.5 rounded-full overflow-hidden flex" style={{ background: "rgba(255,255,255,0.05)" }}>
                      <div className="h-full" style={{ width: `${imp.outdoor_dining_pct}%`, background: "#22c55e" }} />
                      <div className="h-full" style={{ width: `${imp.indoor_dining_pct}%`, background: "#3b82f6" }} />
                    </div>
                    <span className="text-[8px] font-mono text-white/40 w-20 text-right">Out {imp.outdoor_dining_pct}% / In {imp.indoor_dining_pct}%</span>
                  </div>
                  {/* Recommendations */}
                  <div className="grid grid-cols-2 gap-2">
                    <div className="flex items-start gap-1.5 px-2 py-1.5 rounded" style={{ background: "rgba(255,255,255,0.015)" }}>
                      <UtensilsCrossed className="w-3 h-3 mt-0.5 shrink-0" style={{ color: ACCENT }} />
                      <span className="text-[9px] text-white/60">{imp.menu_recommendation}</span>
                    </div>
                    <div className="flex items-start gap-1.5 px-2 py-1.5 rounded" style={{ background: "rgba(255,255,255,0.015)" }}>
                      <Wine className="w-3 h-3 mt-0.5 shrink-0" style={{ color: "#a855f7" }} />
                      <span className="text-[9px] text-white/60">{imp.beverage_recommendation}</span>
                    </div>
                  </div>
                  {/* Status badges */}
                  <div className="flex items-center gap-2 mt-2">
                    <span className="text-[8px] px-1.5 py-0.5 rounded-sm font-mono" style={{
                      background: imp.pool_bar_open ? "rgba(34,197,94,0.08)" : "rgba(239,68,68,0.08)",
                      color: imp.pool_bar_open ? "#22c55e" : "#ef4444",
                      border: `1px solid ${imp.pool_bar_open ? "rgba(34,197,94,0.15)" : "rgba(239,68,68,0.15)"}`,
                    }}>
                      {imp.pool_bar_open ? "POOL BAR OPEN" : "POOL BAR CLOSED"}
                    </span>
                    <span className="text-[8px] px-1.5 py-0.5 rounded-sm font-mono" style={{
                      background: imp.patio_service ? "rgba(34,197,94,0.08)" : "rgba(239,68,68,0.08)",
                      color: imp.patio_service ? "#22c55e" : "#ef4444",
                      border: `1px solid ${imp.patio_service ? "rgba(34,197,94,0.15)" : "rgba(239,68,68,0.15)"}`,
                    }}>
                      {imp.patio_service ? "PATIO SERVICE" : "NO PATIO"}
                    </span>
                    {imp.rain_mm > 0 && (
                      <span className="text-[8px] px-1.5 py-0.5 rounded-sm font-mono" style={{
                        background: "rgba(59,130,246,0.08)", color: "#60a5fa", border: "1px solid rgba(59,130,246,0.15)",
                      }}>
                        <Umbrella className="w-2.5 h-2.5 inline mr-0.5" />{imp.rain_mm}mm
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* RAIN TRACKER */}
        {view === "hourly" && rainTracker && (
          <div className="p-4 space-y-4" data-testid="weather-hourly-view">
            <div className="text-[10px] font-mono uppercase tracking-[0.15em]" style={{ color: `${ACCENT}60` }}>24-HOUR RAIN PROBABILITY</div>

            <div className="p-4 rounded-lg" style={{ background: SURFACE, border: `1px solid ${BORDER}` }}>
              <div className="flex items-end gap-[3px] h-[140px]">
                {(rainTracker.hours || []).map((h: any, i: number) => {
                  const pct = Math.max(3, h.rain_probability);
                  const barColor = pct > 60 ? "#3b82f6" : pct > 30 ? "#fbbf24" : "rgba(255,255,255,0.08)";
                  return (
                    <div key={i} className="flex-1 flex flex-col items-center justify-end relative group" style={{ height: 140 }}
                      title={`${h.hour}: ${h.rain_probability}% | ${h.rain_mm}mm | ${h.temp}F`}>
                      <div className="w-full rounded-t-sm transition-all" style={{ height: `${pct}%`, background: barColor, minHeight: 3 }} />
                      {i % 3 === 0 && (
                        <div className="absolute -bottom-4 text-[7px] font-mono" style={{ color: "rgba(148,163,184,0.3)" }}>
                          {h.hour}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
              <div className="flex items-center justify-between mt-5 pt-2" style={{ borderTop: `1px solid ${BORDER}` }}>
                <div className="text-[10px]">
                  <span className="text-white/40">Peak: </span>
                  <span className="font-mono text-white">{rainTracker.peak_hour?.hour}</span>
                  <span className="font-mono ml-1" style={{ color: "#3b82f6" }}>{rainTracker.peak_hour?.rain_probability}%</span>
                </div>
                <div className="text-[10px]">
                  <span className="text-white/40">Total: </span>
                  <span className="font-mono" style={{ color: "#3b82f6" }}>{rainTracker.total_rain_mm}mm</span>
                </div>
              </div>
            </div>

            {/* Hourly temp overlay */}
            <div className="p-4 rounded-lg" style={{ background: SURFACE, border: `1px solid ${BORDER}` }}>
              <div className="text-[10px] font-mono uppercase tracking-[0.15em] mb-3" style={{ color: `${ACCENT}60` }}>HOURLY TEMPERATURE</div>
              <div className="flex items-end gap-[3px] h-[80px]">
                {(rainTracker.hours || []).map((h: any, i: number) => {
                  const minT = Math.min(...rainTracker.hours.map((x: any) => x.temp));
                  const maxT = Math.max(...rainTracker.hours.map((x: any) => x.temp));
                  const range = maxT - minT || 1;
                  const pct = ((h.temp - minT) / range) * 80 + 15;
                  return (
                    <div key={i} className="flex-1 flex flex-col items-center justify-end" style={{ height: 80 }}
                      title={`${h.hour}: ${h.temp}F`}>
                      <div className="w-full rounded-t-sm" style={{ height: `${pct}%`, background: h.temp > 80 ? "#f59e0b" : "#c8a97e", opacity: 0.4, minHeight: 3 }} />
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

function CondCard({ icon: Icon, label, value, sub, color }: { icon: any; label: string; value: string; sub: string; color: string }) {
  return (
    <div className="p-3 rounded-lg" style={{ background: SURFACE, border: `1px solid ${BORDER}` }}>
      <div className="flex items-center gap-1.5 mb-1.5">
        <Icon className="w-3 h-3" style={{ color }} />
        <span className="text-[9px] font-mono uppercase tracking-wider text-white/40">{label}</span>
      </div>
      <div className="text-lg font-mono font-bold text-white">{value}</div>
      <div className="text-[9px] text-white/30">{sub}</div>
    </div>
  );
}
