/**
 * EchoAi^3 Forecast UI Panel
 * ---------------------------
 * Production-ready forecast visualization component
 */

import React, { useState, useEffect } from "react";
import { getEchoAi3ForecastingEngine } from "../forecasting-engine";
import type { ForecastPrediction } from "../forecasting-engine";

interface ForecastPanelProps {
  daysAhead?: number; // Default: 2, can request 15
  date?: string; // Specific date
  type?: "prep_list" | "inventory" | "labor" | "revenue";
  onClose?: () => void;
}

export function ForecastPanel({ daysAhead = 2, date, type, onClose }: ForecastPanelProps) {
  const [forecasts, setForecasts] = useState<ForecastPrediction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [show15Day, setShow15Day] = useState(daysAhead === 15);

  const engine = getEchoAi3ForecastingEngine();

  useEffect(() => {
    async function loadForecasts() {
      try {
        setLoading(true);
        setError(null);

        const fetched = date
          ? engine.getForecast(date, daysAhead)
          : engine.getForecast(undefined, daysAhead);

        const filtered = type
          ? fetched.filter(f => f.type === type)
          : fetched;

        setForecasts(filtered);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load forecasts");
      } finally {
        setLoading(false);
      }
    }

    loadForecasts();
  }, [daysAhead, date, type, engine]);

  if (loading) {
    return (
      <div className="p-4 bg-slate-900 rounded-lg">
        <div className="text-sm text-slate-400">Loading forecast...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-900/20 border border-red-500/50 rounded-lg">
        <div className="text-sm text-red-400">Error: {error}</div>
      </div>
    );
  }

  if (forecasts.length === 0) {
    return (
      <div className="p-4 bg-slate-900 rounded-lg">
        <div className="text-sm text-slate-400">No forecasts available</div>
      </div>
    );
  }

  return (
    <div className="bg-slate-900 rounded-lg border border-slate-700 p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-white">
            {show15Day ? "15-Day Forecast" : "2-Day Forecast"}
          </h3>
          <p className="text-sm text-slate-400">
            {date ? `For ${date}` : `Next ${daysAhead} day(s)`}
          </p>
        </div>
        <div className="flex gap-2">
          {!show15Day && (
            <button
              onClick={() => setShow15Day(true)}
              className="px-3 py-1 text-sm bg-cyan-600 hover:bg-cyan-700 text-white rounded"
            >
              Show 15-Day
            </button>
          )}
          {onClose && (
            <button
              onClick={onClose}
              className="px-3 py-1 text-sm bg-slate-700 hover:bg-slate-600 text-white rounded"
            >
              Close
            </button>
          )}
        </div>
      </div>

      {/* Forecasts */}
      <div className="space-y-4">
        {forecasts.map((forecast) => (
          <div
            key={forecast.id}
            className="bg-slate-800 rounded-lg p-4 border border-slate-700"
          >
            {/* Forecast Header */}
            <div className="flex items-center justify-between mb-3">
              <div>
                <h4 className="font-semibold text-white capitalize">
                  {forecast.type.replace("_", " ")}
                </h4>
                <p className="text-sm text-slate-400">{forecast.date}</p>
              </div>
              {/* Confidence Bar */}
              <div className="flex items-center gap-2">
                <div className="w-24 h-2 bg-slate-700 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-cyan-500 transition-all"
                    style={{ width: `${forecast.confidence * 100}%` }}
                  />
                </div>
                <span className="text-sm text-slate-300">
                  {Math.round(forecast.confidence * 100)}%
                </span>
              </div>
            </div>

            {/* Assumptions */}
            {forecast.assumptions.length > 0 && (
              <div className="mb-3">
                <p className="text-xs font-semibold text-slate-400 mb-1">Assumptions:</p>
                <ul className="text-xs text-slate-300 space-y-1">
                  {forecast.assumptions.map((assumption, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <span className="text-cyan-500">•</span>
                      <span>{assumption}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Prediction Details */}
            {forecast.type === "prep_list" && forecast.prediction.items && (
              <div>
                <p className="text-xs font-semibold text-slate-400 mb-1">Predicted Items:</p>
                <div className="flex flex-wrap gap-2">
                  {forecast.prediction.items.slice(0, 10).map((item: string, idx: number) => (
                    <span
                      key={idx}
                      className="px-2 py-1 text-xs bg-slate-700 text-slate-300 rounded"
                    >
                      {item}
                    </span>
                  ))}
                  {forecast.prediction.items.length > 10 && (
                    <span className="px-2 py-1 text-xs text-slate-400">
                      +{forecast.prediction.items.length - 10} more
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* Data Sources */}
            {forecast.dataSources.length > 0 && (
              <div className="mt-3 pt-3 border-t border-slate-700">
                <p className="text-xs text-slate-400">
                  Sources: {forecast.dataSources.join(", ")}
                </p>
              </div>
            )}

            {/* Why Explainer */}
            <div className="mt-3 pt-3 border-t border-slate-700">
              <details className="text-xs">
                <summary className="cursor-pointer text-cyan-400 hover:text-cyan-300">
                  Why this forecast?
                </summary>
                <div className="mt-2 text-slate-300 space-y-1">
                  <p>
                    Confidence: {Math.round(forecast.confidence * 100)}% based on{" "}
                    {forecast.dataSources.length} data source(s)
                  </p>
                  {forecast.assumptions.length > 0 && (
                    <p>
                      Based on: {forecast.assumptions.slice(0, 2).join(", ")}
                      {forecast.assumptions.length > 2 && "..."}
                    </p>
                  )}
                </div>
              </details>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
