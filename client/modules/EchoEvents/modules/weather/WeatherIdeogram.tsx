import React from "react";
export type WeatherRiskLevel = "low" | "moderate" | "high";
export interface WeatherIdeogramProps {
  label: string;
  temperature: number;
  precipProb: number;
  windGust: number;
  risk?: WeatherRiskLevel;
}
const RISK_STYLES: Record<WeatherRiskLevel, string> = {
  low: "bg-emerald-500",
  moderate: "bg-amber-500",
  high: "bg-rose-500",
};
function clampPercent(value: number): number {
  if (Number.isNaN(value)) return 0;
  return Math.min(100, Math.max(0, value));
}
function temperaturePercent(temp: number): number {
  const minTemp = -10;
  const maxTemp = 110;
  const normalized = ((temp - minTemp) / (maxTemp - minTemp)) * 100;
  return clampPercent(normalized);
}
export default function WeatherIdeogram({
  label,
  temperature,
  precipProb,
  windGust,
  risk = "low",
}: WeatherIdeogramProps) {
  const precipPercent = clampPercent(precipProb);
  const temperatureFill = temperaturePercent(temperature);
  const riskColor = RISK_STYLES[risk];
  return (
    <div className="weather-ideogram w-[220px] h-[120px] rounded-2xl border border-white/10 bg-background backdrop-blur-xl p-3 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
      {" "}
      <div className="flex items-center justify-between text-xs text-white/70">
        {" "}
        <span
          className="font-medium tracking-wide"
          aria-label={`Location ${label}`}
        >
          {" "}
          {label}{" "}
        </span>{" "}
        <span
          className={`h-2 w-2 rounded-full ${riskColor} shadow-[0_0_12px_rgba(255,255,255,0.35)]`}
          title={`Weather risk ${risk}`}
        />{" "}
      </div>{" "}
      <div className="mt-3 flex items-center gap-3">
        {" "}
        <div
          className="relative h-16 w-16"
          role="img"
          aria-label={`Precipitation probability ${Math.round(precipPercent)} percent`}
        >
          {" "}
          <svg viewBox="0 0 36 36" className="absolute inset-0">
            {" "}
            <path
              d="M18 2 a 16 16 0 1 1 0 32 a 16 16 0 1 1 0 -32"
              fill="none"
              stroke="rgba(255,255,255,0.12)"
              strokeWidth="4"
              strokeLinecap="round"
            />{" "}
            <path
              d="M18 2 a 16 16 0 1 1 0 32"
              fill="none"
              stroke="url(#precip-gradient)"
              strokeWidth="4"
              strokeLinecap="round"
              strokeDasharray={`${Math.round((precipPercent / 100) * 100)}, 100`}
              transform="rotate(-90 18 18)"
            />{" "}
            <defs>
              {" "}
              <linearGradient
                id="precip-gradient"
                x1="0%"
                y1="0%"
                x2="100%"
                y2="100%"
              >
                {" "}
                <stop offset="0%" stopColor="#22d3ee" />{" "}
                <stop offset="100%" stopColor="#6366f1" />{" "}
              </linearGradient>{" "}
            </defs>{" "}
          </svg>{" "}
          <div className="absolute inset-0 flex flex-col items-center justify-center text-sm font-semibold">
            {" "}
            <span>{Math.round(precipPercent)}%</span>{" "}
            <span className="text-[10px] text-white/60">Precip</span>{" "}
          </div>{" "}
        </div>{" "}
        <div className="flex-1">
          {" "}
          <div
            className="text-3xl font-semibold leading-none"
            aria-label={`Temperature ${Math.round(temperature)} degrees`}
          >
            {" "}
            {Math.round(temperature)}°{" "}
          </div>{" "}
          <div
            className="mt-1 text-xs text-white/70"
            aria-label={`Wind gusts ${Math.round(windGust)} miles per hour`}
          >
            {" "}
            Gusts {Math.round(windGust)} mph{" "}
          </div>{" "}
          <div
            className="mt-3 h-2 w-full overflow-hidden rounded-full bg-background"
            role="img"
            aria-label="Temperature range visual"
          >
            {" "}
            <div
              className="h-full bg-gradient-to-r from-cyan-400 via-sky-400 to-fuchsia-400"
              style={{ width: `${Math.max(5, temperatureFill)}%` }}
            />{" "}
          </div>{" "}
        </div>{" "}
      </div>{" "}
    </div>
  );
}
