import React, { useEffect, useState } from "react";
import type { HelpMission, HelpMissionStep } from "@shared/echo/help/types";

export default function EchoMissionOverlay() {
  const [mission, setMission] = useState<HelpMission | null>(null);
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const handler = async (e: any) => {
      const missionId = e.detail?.missionId;
      if (!missionId) return;

      try {
        const res = await fetch(`/api/help/mission?id=${missionId}`);
        const data = await res.json();
        const m = data.missions?.[0];
        if (!m) return;

        setMission(m);
        setIndex(0);
      } catch (err) {
        console.error("[EchoMissionOverlay] Failed to load mission:", err);
      }
    };

    window.addEventListener("echo-help:start-mission", handler);
    return () => window.removeEventListener("echo-help:start-mission", handler);
  }, []);

  useEffect(() => {
    if (!mission) return;

    const step = mission.steps[index];
    if (!step?.targetSelector) return;

    const el = document.querySelector(step.targetSelector) as HTMLElement | null;
    if (!el) return;

    el.scrollIntoView({ behavior: "smooth", block: "center" });
    el.classList.add("ring-4", "ring-sky-400");

    return () => el.classList.remove("ring-4", "ring-sky-400");
  }, [mission, index]);

  if (!mission) return null;

  const step = mission.steps[index];
  const isLast = index === mission.steps.length - 1;

  return (
    <div className="fixed inset-0 z-[99999] pointer-events-none">
      {/* Dim background */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm pointer-events-none" />

      {/* Floating panel */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 w-[400px] pointer-events-auto">
        <div className="bg-slate-900/95 border border-slate-700 rounded-xl p-4 space-y-2 shadow-2xl">
          <div className="text-sky-300 text-xs uppercase tracking-wider">
            Mission Step {index + 1} / {mission.steps.length}
          </div>

          <h3 className="text-lg font-semibold">{step.title}</h3>
          <p className="text-sm text-slate-300">{step.description}</p>

          <div className="flex justify-end gap-2 mt-3">
            {index > 0 && (
              <button
                onClick={() => setIndex(index - 1)}
                className="px-3 py-1 text-xs rounded-lg bg-slate-700 text-slate-200 hover:bg-slate-600"
              >
                Back
              </button>
            )}

            {!isLast && (
              <button
                onClick={() => setIndex(index + 1)}
                className="px-4 py-1 text-xs rounded-lg bg-sky-600 text-white hover:bg-sky-500"
              >
                Next →
              </button>
            )}

            {isLast && (
              <button
                onClick={() => setMission(null)}
                className="px-4 py-1 text-xs rounded-lg bg-green-600 text-white hover:bg-green-500"
              >
                Finish
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
