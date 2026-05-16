import React from "react";
import { useEkgStore } from "../store/ekgStore";
import { sessionRecorder } from "../telemetry/sessionRecorder";

export function ForensicsDashboard() {
  const snapshot = useEkgStore((s) => s.snapshot);
  const errors = snapshot.errors.slice(-20).reverse();
  const events = snapshot.events.slice(-30).reverse();

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-base font-semibold">Forensics</h3>
        <div className="flex gap-2">
          <button
            className="px-3 py-2 text-sm rounded border"
            onClick={() => sessionRecorder.download("ekg-session-export.json")}
          >
            Export session
          </button>
        </div>
      </div>

      <div className="rounded-lg border bg-card p-3 max-h-64 overflow-auto">
        <div className="flex items-center justify-between mb-2">
          <p className="text-sm font-medium">Errors</p>
          <span className="text-xs text-muted-foreground">
            {errors.length} recent
          </span>
        </div>
        {errors.length === 0 && (
          <p className="text-sm text-muted-foreground">No errors captured.</p>
        )}
        <ul className="space-y-2">
          {errors.map((err, idx) => (
            <li key={idx} className="text-sm">
              <p className="font-medium text-red-500">{err.message}</p>
              {err.source && (
                <p className="text-xs text-muted-foreground">{err.source}</p>
              )}
            </li>
          ))}
        </ul>
      </div>

      <div className="rounded-lg border bg-card p-3 max-h-64 overflow-auto">
        <div className="flex items-center justify-between mb-2">
          <p className="text-sm font-medium">Recent events</p>
          <span className="text-xs text-muted-foreground">
            {events.length} tracked
          </span>
        </div>
        {events.length === 0 && (
          <p className="text-sm text-muted-foreground">No events yet.</p>
        )}
        <ul className="space-y-2">
          {events.map((evt, idx) => (
            <li key={idx} className="text-sm">
              <div className="flex items-center justify-between">
                <span className="font-medium">{evt.type}</span>
                <span className="text-xs text-muted-foreground">
                  {new Date(evt.timestamp).toLocaleTimeString()}
                </span>
              </div>
              {evt.detail && (
                <p className="text-xs text-muted-foreground">{evt.detail}</p>
              )}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
