import React from "react";
import { useChefNet } from "../state/chefnetStore";

export default function WellbeingPanel() {
  const [state] = useChefNet();

  return (
    <div className="space-y-4">
      <section className="border border-sky-200 dark:border-sky-600/60 rounded-xl p-3 bg-sky-50/70 dark:bg-sky-950/60">
        <div className="text-[11px] font-semibold tracking-[0.14em] uppercase text-sky-800 dark:text-sky-100 mb-1">
          Support • You are not alone in this industry.
        </div>
        <p className="text-xs text-sky-900/90 dark:text-sky-100/90 max-w-xl">
          Service is intense. Kitchens, banquets, bars, front desk, housekeeping — every team is under pressure.
          This space keeps the most important reminders close: you are human first, role second.
        </p>
      </section>

      <section className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
        <div className="border border-slate-200 dark:border-slate-700 rounded-xl p-3 bg-white/90 dark:bg-slate-900/90">
          <h3 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-600 dark:text-slate-200 mb-1">
            Quick check‑in
          </h3>
          <p className="text-xs text-slate-600 dark:text-slate-300 mb-2">
            How are you doing today on a 1–10 scale? Echo can later track anonymous averages
            by department and shift.
          </p>
          <div className="flex flex-wrap gap-1 mt-1">
            {[1,2,3,4,5,6,7,8,9,10].map((n) => (
              <button
                key={n}
                type="button"
                className="w-7 h-7 rounded-full border border-slate-300 dark:border-slate-600 text-[11px] text-slate-700 dark:text-slate-100 bg-white/90 dark:bg-slate-900/80 hover:border-sky-500 hover:text-sky-700 dark:hover:border-cyan-400"
              >
                {n}
              </button>
            ))}
          </div>
          <p className="mt-2 text-[10px] text-slate-400 dark:text-slate-500">
            (Hook this to Echo / backend later — currently visual only.)
          </p>
        </div>

        <div className="border border-emerald-200 dark:border-emerald-600/60 rounded-xl p-3 bg-emerald-50/80 dark:bg-emerald-950/60">
          <h3 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-emerald-800 dark:text-emerald-200 mb-1">
            Micro‑recovery ideas
          </h3>
          <ul className="list-disc list-inside space-y-1 text-xs text-emerald-900/90 dark:text-emerald-100/90">
            <li>90‑second water + breathing reset between seatings.</li>
            <li>Walk the long way past windows or outdoors when possible.</li>
            <li>Trade a short prep task with a teammate to break monotony.</li>
            <li>Ask, "What can I put down for 3 minutes?" and do it.</li>
          </ul>
        </div>

        <div className="border border-rose-200 dark:border-rose-600/60 rounded-xl p-3 bg-rose-50/80 dark:bg-rose-950/60">
          <h3 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-rose-800 dark:text-rose-200 mb-1">
            When it's more than a rough shift
          </h3>
          <p className="text-xs text-rose-900/90 dark:text-rose-100/90">
            If you are thinking about self‑harm or feel like you are at the edge, this app is not enough.
            Please contact your local crisis hotline, employee assistance program, or a trusted senior leader.
          </p>
        </div>
      </section>

      <section className="border border-slate-200 dark:border-slate-700 rounded-xl p-3 bg-white/90 dark:bg-slate-900/90 text-xs">
        <h3 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-600 dark:text-slate-200 mb-1">
          Wellbeing signals (future expansion)
        </h3>
        <p className="text-xs text-slate-600 dark:text-slate-300 mb-2">
          As ChefNet collects more data (venting volume, sentiment, lateness of shifts, overtime, cover counts),
          Echo can start to forecast burnout risk by department and even by day of week.
        </p>
        <ul className="list-disc list-inside space-y-1 text-xs text-slate-600 dark:text-slate-300">
          <li>Anonymous venting spikes after specific events or meetings.</li>
          <li>Recognition going to only 1–2 departments repeatedly.</li>
          <li>Coverage gaps vs volume on the line.</li>
          <li>Back‑to‑back heavy banquets with no decompression time.</li>
        </ul>
        <p className="mt-2 text-[10px] text-slate-400 dark:text-slate-500">
          State length: {state.wellbeingSignals?.length ?? 0} signals (placeholder, tracked in store only).
        </p>
      </section>
    </div>
  );
}
