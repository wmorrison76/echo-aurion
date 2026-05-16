import React from "react";
import { useEkgStore } from "../store/ekgStore";

const SCENARIOS = [
  { id: "mvp_2spaces", label: "MVP – Restaurant + 2 BQT spaces" },
  { id: "baseline_smoke", label: "Baseline smoke" },
];

export function TreadmillDashboard() {
  const treadmill = useEkgStore((s) => s.treadmill);
  const setTreadmill = useEkgStore((s) => s.setTreadmill);

  const startScenario = (id: string) => {
    setTreadmill({ level: "running", activeScenario: id });
  };

  const stopScenario = () =>
    setTreadmill({ level: "idle", activeScenario: undefined });

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-muted-foreground">Status</p>
          <p className="text-lg font-semibold">
            {treadmill.level === "running" ? "Running" : "Idle"}
          </p>
          {treadmill.activeScenario && (
            <p className="text-xs text-muted-foreground">
              Scenario: {treadmill.activeScenario}
            </p>
          )}
        </div>
        <div className="flex gap-2">
          <button
            className="px-3 py-2 text-sm rounded border bg-primary text-primary-foreground"
            onClick={() => startScenario("mvp_2spaces")}
          >
            Run MVP 2-spaces
          </button>
          <button
            className="px-3 py-2 text-sm rounded border"
            onClick={stopScenario}
          >
            Stop
          </button>
        </div>
      </div>

      <div className="rounded-lg border bg-card p-3">
        <p className="text-sm font-medium mb-2">Scenario seeds</p>
        <ul className="space-y-1 text-sm text-muted-foreground">
          {SCENARIOS.map((scenario) => (
            <li key={scenario.id} className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              {scenario.label}
            </li>
          ))}
        </ul>
        <p className="text-xs text-muted-foreground mt-2">
          Full treadmill harness arrives in later phases; this view keeps the
          wiring visible now.
        </p>
      </div>
    </div>
  );
}
