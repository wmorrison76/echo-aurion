/**
 * FeatureControlPanel.jsx
 * A self-contained admin panel to toggle capstone modules at runtime.
 * Persists to localStorage; no backend required.
 */
import React from "react";
import { useAllFeatures } from "../hooks/useFeature.js";

const DESCRIPTIONS = {
  EchoMixologyAI: "Mixology dashboard (ABV calc, pour, scan, costing)",
  EchoSommelier: "Sommelier pairing engine panel",
  SommelierMixologyBridge: "Sommelier→Mixology cocktail suggestions",
  LiquorAI: "Label OCR parsing + price intel",
  VisualSyncLiveControl: "Tempo-aligned visual sync UI",
  MobileScheduler: "Touch-first employee scheduler",
  RedPhoenixRecovery: "Error boundary + checksum guard",
  Telemetry: "RedPhoenix telemetry buffer/flush",
  MixologyWheel: "Interactive flavor wheel",
  SommelierMergeConsole: "Merged Sommelier/Mixology console",
};

export default function FeatureControlPanel(){
  const { flags, set, reset } = useAllFeatures();
  const keys = Object.keys(flags).sort();
  return (
    <div className="p-4 rounded-2xl border border-white/10 grid gap-3">
      <header className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold">Echo Feature Control</h3>
          <p className="text-xs opacity-70">Toggle modules at runtime. Changes persist locally.</p>
        </div>
        <button onClick={reset} className="px-3 py-1 rounded bg-white/10 text-sm">Reset</button>
      </header>

      <div className="grid gap-2">
        {keys.map(k => (
          <label key={k} className="flex items-center justify-between p-2 rounded bg-white/5">
            <div>
              <div className="text-sm font-medium">{k}</div>
              <div className="text-xs opacity-70">{DESCRIPTIONS[k]||"—"}</div>
            </div>
            <input
              type="checkbox"
              checked={!!flags[k]}
              onChange={e=> set(k, e.target.checked)}
            />
          </label>
        ))}
      </div>

      <footer className="text-xs opacity-70">
        Tip: wrap panels with <code>withFeature(Component, "FlagName")</code> to make them switchable.
      </footer>
    </div>
  );
}
