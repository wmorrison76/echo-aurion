/** iter233 · Weather strip at top of mobile shell.
 *
 * William: "add a weather info at the top temp and an image ie sun"
 * Shows current temp + icon + one-liner condition from /api/weather/current.
 * Also exposes a small "Rain today?" drill-down → dispatches a custom event
 * that EchoMiniButton's drawer consumes to open the hourly panel.
 */
import React from "react";
import { API } from "@/lib/api-url";

export function WeatherStrip() {
  const [w, setW] = React.useState<any>(null);

  React.useEffect(() => {
    let cancelled = false;
    const load = () => fetch(`${API()}/api/weather/current`)
      .then((r) => r.json())
      .then((d) => { if (!cancelled) setW(d); })
      .catch(() => undefined);
    void load();
    // Refresh every 15 min while visible
    const int = setInterval(() => { if (!document.hidden) void load(); }, 900_000);
    return () => { cancelled = true; clearInterval(int); };
  }, []);

  if (!w?.current) return null;
  const c = w.current;
  const cond = (c.condition?.main || "").toLowerCase();
  const icon =
    cond.includes("clear")   ? "☀️" :
    cond.includes("cloud")   ? "⛅" :
    cond.includes("rain")    ? "🌧" :
    cond.includes("thunder") ? "⛈" :
    cond.includes("snow")    ? "❄️" :
    cond.includes("fog") || cond.includes("mist") ? "🌫" : "🌡";

  return (
    <div data-testid="weather-strip"
      onClick={() => window.dispatchEvent(new CustomEvent("echo:open-quick", {
        detail: { view: "weather" },
      }))}
      role="button" tabIndex={0}
      style={{
        padding: "6px 12px", background: "rgba(59,130,246,0.06)",
        borderBottom: "1px solid rgba(59,130,246,0.15)",
        display: "flex", alignItems: "center", gap: 10, cursor: "pointer",
      }}>
      <span style={{ fontSize: 20, lineHeight: 1 }}>{icon}</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, color: "#f5efe4", fontWeight: 500 }}>
          {Math.round(c.temp)}°F · {c.condition?.description || "Now"}
        </div>
        <div style={{ fontSize: 9, color: "#94a3b8", letterSpacing: 1,
                        whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
          {w.location?.name} · feels {Math.round(c.feels_like)}° · wind {Math.round(c.wind_speed)} mph
        </div>
      </div>
      <span data-testid="weather-rain-link"
        onClick={(e) => {
          e.stopPropagation();
          window.dispatchEvent(new CustomEvent("echo:open-quick", { detail: { view: "weather" } }));
        }}
        style={{ fontSize: 10, color: "#60a5fa", letterSpacing: 1,
                  padding: "4px 8px", border: "1px solid rgba(96,165,250,0.35)",
                  borderRadius: 4, cursor: "pointer", background: "rgba(96,165,250,0.08)" }}>
        RAIN?
      </span>
    </div>
  );
}
