import React, { useMemo } from "react";
import { useEkgStore } from "../store/ekgStore";
import { MetricSparkline } from "./MetricSparkline";

export function VitalsDashboard() {
  const snapshot = useEkgStore((s) => s.snapshot);

  const latestFrame = snapshot.frames.at(-1);
  const fps = latestFrame?.fps ?? 0;
  const frameMs = latestFrame?.frameMs ?? 0;
  const longTaskCount = snapshot.frames.filter((f) => f.longTask).length;
  const memory = snapshot.memory;

  const frameSeries = useMemo(
    () => snapshot.frames.slice(-40).map((f) => f.frameMs),
    [snapshot.frames],
  );
  const fpsSeries = useMemo(
    () => snapshot.frames.slice(-40).map((f) => f.fps),
    [snapshot.frames],
  );

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
      <div className="rounded-lg border bg-card p-4 shadow-sm">
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">Frame time (ms)</p>
          <span className="text-lg font-semibold">{frameMs.toFixed(1)}</span>
        </div>
        <MetricSparkline points={frameSeries} stroke="#60a5fa" />
      </div>

      <div className="rounded-lg border bg-card p-4 shadow-sm">
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">FPS</p>
          <span className="text-lg font-semibold">{fps.toFixed(1)}</span>
        </div>
        <MetricSparkline points={fpsSeries} stroke="#34d399" />
      </div>

      <div className="rounded-lg border bg-card p-4 shadow-sm">
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">Event rate (60s)</p>
          <span className="text-lg font-semibold">
            {snapshot.eventRate} evt/min
          </span>
        </div>
        <p className="text-xs text-muted-foreground mt-2">
          Based on CustomEvent dispatch volume
        </p>
      </div>

      <div className="rounded-lg border bg-card p-4 shadow-sm space-y-2">
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">Long tasks</p>
          <span className="text-lg font-semibold">{longTaskCount}</span>
        </div>
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">Memory</p>
          <span className="text-sm">
            {memory?.unavailable
              ? "unavailable"
              : memory?.usedMB
                ? `${memory.usedMB} / ${memory.totalMB ?? "?"} MB`
                : "waiting"}
          </span>
        </div>
      </div>
    </div>
  );
}
