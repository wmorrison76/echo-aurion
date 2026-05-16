/**
 * LaborCommandCenterPanel
 * Labor forecast recommendations, overtime sentinel alerts; trace-backed.
 */

import React, { useEffect, useState } from "react";
import { Users, AlertTriangle, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";

interface Recommendation {
  stationId: string;
  stationName: string;
  shiftStart: string;
  shiftEnd: string;
  recommendedHours: number;
  recommendedHeadcount: number;
  rationale?: string;
}

interface LaborForecastData {
  date: string;
  recommendations: Recommendation[];
  traceId: string;
}

export default function LaborCommandCenterPanel() {
  const [forecast, setForecast] = useState<LaborForecastData | null>(null);
  const [overtimeRisks, setOvertimeRisks] = useState<
    Array<{
      userId: string;
      riskLevel: string;
      scheduledHours: number;
      thresholdHours: number;
      suggestedActions: string[];
    }>
  >([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [fcRes, otRes] = await Promise.all([
          fetch(
            "/api/labor-forecast?date=" + new Date().toISOString().slice(0, 10),
          ),
          fetch("/api/labor-forecast/overtime-sentinel"),
        ]);
        if (fcRes.ok) {
          const d = await fcRes.json();
          if (!cancelled) setForecast(d);
        }
        if (otRes.ok) {
          const d = await otRes.json();
          if (!cancelled && Array.isArray(d.risks)) setOvertimeRisks(d.risks);
        }
      } catch {
        // stub: no backend yet
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) return <div className="p-4 text-muted-foreground">Loading…</div>;

  return (
    <div className="p-4 space-y-6">
      <h2 className="text-lg font-semibold flex items-center gap-2">
        <Users className="h-5 w-5" />
        Labor Command Center
      </h2>
      {forecast && (
        <section>
          <h3 className="text-sm font-medium text-muted-foreground mb-2">
            Staffing recommendations
          </h3>
          <ul className="space-y-2">
            {forecast.recommendations.map((r) => (
              <li
                key={r.stationId}
                className="flex items-center justify-between border border-border rounded-lg px-3 py-2"
              >
                <span>{r.stationName}</span>
                <span className="text-sm">
                  {r.recommendedHours}h / {r.recommendedHeadcount} headcount
                </span>
              </li>
            ))}
          </ul>
          <p className="text-xs text-muted-foreground mt-2">
            Trace: {forecast.traceId}
          </p>
        </section>
      )}
      {overtimeRisks.length > 0 && (
        <section>
          <h3 className="text-sm font-medium flex items-center gap-1 text-amber-600">
            <AlertTriangle className="h-4 w-4" />
            Overtime risk (3–7 days)
          </h3>
          <ul className="space-y-2 mt-2">
            {overtimeRisks.map((r) => (
              <li
                key={r.userId}
                className={cn(
                  "border rounded-lg px-3 py-2",
                  r.riskLevel === "high"
                    ? "border-destructive bg-destructive/5"
                    : "border-amber-500/50 bg-amber-500/5",
                )}
              >
                <div className="flex justify-between">
                  <span>{r.userId}</span>
                  <span>
                    {r.scheduledHours}h / {r.thresholdHours}h threshold
                  </span>
                </div>
                {r.suggestedActions.length > 0 && (
                  <p className="text-xs text-muted-foreground mt-1">
                    {r.suggestedActions.join("; ")}
                  </p>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}
      {!forecast && overtimeRisks.length === 0 && (
        <p className="text-sm text-muted-foreground">
          No labor forecast or overtime data. Run labor forecast API for
          recommendations.
        </p>
      )}
    </div>
  );
}
