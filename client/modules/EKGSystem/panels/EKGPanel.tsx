import React, { useEffect, useState } from "react";
import { VitalsDashboard } from "../components/VitalsDashboard";
import { TreadmillDashboard } from "../components/TreadmillDashboard";
import { ForensicsDashboard } from "../components/ForensicsDashboard";
import { RunControls } from "../components/RunControls";
import { startPerfMonitoring } from "../telemetry/perfHooks";
import { startEventBusInstrumentation } from "../telemetry/eventBusHooks";
import { installFetchInstrumentation } from "../telemetry/apiHooks";
import { startErrorInstrumentation } from "../telemetry/errorHooks";
import { telemetryClient } from "../telemetry/telemetryClient";
import { sessionRecorder } from "../telemetry/sessionRecorder";

type TabKey = "vitals" | "treadmill" | "forensics";

const tabs: { key: TabKey; label: string }[] = [
  { key: "vitals", label: "Live Vitals" },
  { key: "treadmill", label: "Treadmill" },
  { key: "forensics", label: "Forensics" },
];

export default function EKGPanel() {
  const [activeTab, setActiveTab] = useState<TabKey>("vitals");

  useEffect(() => {
    const stops = [
      startPerfMonitoring(),
      startEventBusInstrumentation(),
      installFetchInstrumentation(),
      startErrorInstrumentation(),
    ];

    telemetryClient.recordEvent({ type: "ekg:open" });
    sessionRecorder.record("ui_action", { panel: "ekg", action: "open" });

    return () => {
      stops.forEach((stop) => stop && stop());
    };
  }, []);

  return (
    <div className="h-full bg-background text-foreground p-4 space-y-4 overflow-auto">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">Aurion EKG</h2>
          <p className="text-sm text-muted-foreground">
            Live telemetry + treadmill harness (MVP)
          </p>
        </div>
        <RunControls />
      </div>

      <div className="flex gap-2">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            className={`px-3 py-2 rounded border text-sm ${
              activeTab === tab.key
                ? "bg-primary text-primary-foreground"
                : "bg-muted"
            }`}
            onClick={() => setActiveTab(tab.key)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="border rounded-lg bg-card p-4 shadow-sm">
        {activeTab === "vitals" && <VitalsDashboard />}
        {activeTab === "treadmill" && <TreadmillDashboard />}
        {activeTab === "forensics" && <ForensicsDashboard />}
      </div>
    </div>
  );
}
