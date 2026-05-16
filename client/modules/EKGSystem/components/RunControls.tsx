import React from "react";
import { startPerfMonitoring } from "../telemetry/perfHooks";
import { startEventBusInstrumentation } from "../telemetry/eventBusHooks";
import { installFetchInstrumentation } from "../telemetry/apiHooks";
import { startErrorInstrumentation } from "../telemetry/errorHooks";

export function RunControls() {
  const armTelemetry = () => {
    startPerfMonitoring();
    startEventBusInstrumentation();
    installFetchInstrumentation();
    startErrorInstrumentation();
  };

  return (
    <div className="flex items-center gap-2">
      <button
        className="px-3 py-2 text-sm rounded border bg-muted"
        onClick={armTelemetry}
      >
        Re-arm telemetry
      </button>
      <p className="text-xs text-muted-foreground">
        Lightweight instrumentation uses real signals only.
      </p>
    </div>
  );
}
