import React from "react";
import { useChefNet } from "../state/chefnetStore";

export default function CultureAnalyticsPanel() {
  const [state] = useChefNet();

  const totals = {
    posts: state.posts.length,
    vents: state.ventingMessages.length,
    recs: state.recognitions.length,
    jobs: state.jobs.length,
  };

  return (
    <div className="space-y-3 text-xs">
      <section className="border border-indigo-200 dark:border-indigo-600 rounded-xl p-3 bg-indigo-50/80 dark:bg-indigo-950/60">
        <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-indigo-800 dark:text-indigo-200 mb-1">
          Culture analytics • very early pass
        </div>
        <p className="text-xs text-indigo-900/90 dark:text-indigo-100/90">
          This panel is the seed for a full Echo‑powered culture graph:
          sentiment over time, burnout early‑warning, recognition balance by department,
          and leadership consistency.
        </p>
      </section>

      <section className="grid grid-cols-2 md:grid-cols-4 gap-2">
        <Metric label="Open posts" value={totals.posts} />
        <Metric label="Anonymous vents" value={totals.vents} />
        <Metric label="Recognitions" value={totals.recs} />
        <Metric label="Internal jobs" value={totals.jobs} />
      </section>

      <section className="border border-slate-200 dark:border-slate-700 rounded-xl p-3 bg-white/90 dark:bg-slate-900/90">
        <h3 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-600 dark:text-slate-200 mb-1">
          Future Echo tie‑ins
        </h3>
        <ul className="list-disc list-inside space-y-1 text-xs text-slate-600 dark:text-slate-300">
          <li>Vent volume vs banquet load vs overtime hours.</li>
          <li>Recognition distribution by department / role.</li>
          <li>Pulse check scores per day of week and time of year.</li>
          <li>Email and chat sentiment overlays from other LUCCCA modules.</li>
          <li>Clear, privacy‑safe dashboards for GMs and HR to act on trends, not rumors.</li>
        </ul>
      </section>
    </div>
  );
}

function Metric({ label, value }) {
  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white/90 dark:bg-slate-900/90 px-3 py-2.5">
      <div className="text-[11px] uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400 mb-1">
        {label}
      </div>
      <div className="text-lg font-semibold text-slate-900 dark:text-slate-100">
        {value}
      </div>
    </div>
  );
}
