import React from "react";

/**
 * Forecast Panel — EchoEvents financial preview
 *
 * §1.1 — Until the EchoStratus / EchoAurum pricing engine is wired into this
 * surface, we surface the missing-data state explicitly rather than rendering
 * fake $0.00 numbers that operators might mistake for a real forecast.
 */
export const ForecastPanel: React.FC = () => {
  return (
    <div
      className="border rounded-lg p-3 space-y-2 bg-amber-50/40 border-amber-200/60"
      data-testid="echoevents-forecast-panel-empty"
    >
      <div className="flex items-center gap-2 text-xs font-semibold text-amber-700">
        <span>Forecast engine not wired</span>
        <span className="text-[0.6rem] uppercase tracking-wider px-1.5 py-0.5 rounded bg-amber-100 text-amber-800">
          §1.1
        </span>
      </div>
      <p className="text-[0.7rem] text-muted-foreground leading-relaxed">
        Revenue / COGS / margin forecasts will populate as soon as this event
        draft is connected to EchoStratus (pricing) and EchoAurum (costing).
        Until then, no fabricated zeros — the absence of a forecast is itself
        the answer.
      </p>
    </div>
  );
};
