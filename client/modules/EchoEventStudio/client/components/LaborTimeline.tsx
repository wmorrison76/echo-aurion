import React, { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
export interface LaborTimelineProps {
  setupMin?: number;
  serviceMin?: number;
  teardownMin?: number;
}
export function LaborTimeline({
  setupMin = 90,
  serviceMin = 240,
  teardownMin = 60,
}: LaborTimelineProps) {
  const stats = useMemo(() => {
    const total = setupMin + serviceMin + teardownMin;
    const setupPct = total > 0 ? (setupMin / total) * 100 : 0;
    const servicePct = total > 0 ? (serviceMin / total) * 100 : 0;
    const teardownPct = total > 0 ? (teardownMin / total) * 100 : 0;
    const hours = Math.floor(total / 60);
    const mins = total % 60;
    return {
      setupPct,
      servicePct,
      teardownPct,
      totalHours: hours,
      totalMins: mins,
    };
  }, [setupMin, serviceMin, teardownMin]);
  return (
    <Card>
      {" "}
      <CardHeader className="py-3">
        {" "}
        <CardTitle className="text-sm">Labor Timeline</CardTitle>{" "}
      </CardHeader>{" "}
      <CardContent className="space-y-3">
        {" "}
        <div className="flex w-full h-4 rounded-md overflow-hidden border border-border">
          {" "}
          <div
            style={{ width: `${stats.setupPct}%` }}
            className="bg-muted"
            title={`Setup: ${setupMin}m`}
          />{" "}
          <div
            style={{ width: `${stats.servicePct}%` }}
            className="bg-primary/60"
            title={`Service: ${serviceMin}m`}
          />{" "}
          <div
            style={{ width: `${stats.teardownPct}%` }}
            className="bg-destructive/60"
            title={`Teardown: ${teardownMin}m`}
          />{" "}
        </div>{" "}
        <div className="text-xs text-muted-foreground space-y-1">
          {" "}
          <div>
            {" "}
            <span className="font-semibold">Setup:</span> {setupMin}m (
            {stats.setupPct.toFixed(0)}%){" "}
          </div>{" "}
          <div>
            {" "}
            <span className="font-semibold">Service:</span> {serviceMin}m ({" "}
            {stats.servicePct.toFixed(0)}%){" "}
          </div>{" "}
          <div>
            {" "}
            <span className="font-semibold">Teardown:</span> {teardownMin}m ({" "}
            {stats.teardownPct.toFixed(0)}%){" "}
          </div>{" "}
          <div className="pt-1 border-t border-border">
            {" "}
            <span className="font-semibold">Total:</span> {stats.totalHours}h
            {""} {stats.totalMins}m{" "}
          </div>{" "}
        </div>{" "}
      </CardContent>{" "}
    </Card>
  );
}
