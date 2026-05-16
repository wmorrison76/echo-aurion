import { labPlaylists, trendSignals } from "@/data/textureReference";
import { useMemo } from "react";

import { futureFoodDrivers } from "@/data/flavorMatrix";
import { useRDLabStore } from "@/stores/rdLabStore";

export function InsightsPanel() {
  const { backlog, insights, experiments } = useRDLabStore();
  const pipeline = useMemo(
    () =>
      experiments.slice(0, 4).map((experiment) => ({
        id: experiment.id,
        title: experiment.title,
        stage: experiment.status,
        launchWindow: experiment.launchWindow,
        variables: experiment.variablesUnderTest.slice(0, 2),
      })),
    [experiments],
  );

  return (
    <div className="flex h-full min-h-0 flex-col gap-5 overflow-y-auto pr-1">
      <section className="rounded-2xl border border-white/20 bg-gradient-to-br from-white/60 via-white/30 to-white/10 p-5 backdrop-blur dark:border-[#c8a97e]/20 dark:from-slate-950/70 dark:via-slate-900/60 dark:to-neutral-950/40">
        <header className="text-[11px] font-semibold uppercase tracking-[0.35em] text-slate-600 dark:text-[#c8a97e]/80/70">
          Live signals
        </header>
        <div className="mt-4 space-y-4">
          {trendSignals.map((signal) => (
            <article
              key={signal.id}
              className="rounded-xl border border-white/30 bg-white/50 p-4 text-sm text-slate-700 shadow-sm dark:border-[#c8a97e]/15 dark:bg-slate-950/70 dark:text-white/80"
            >
              <div className="flex items-center justify-between text-[11px] uppercase tracking-[0.3em] text-slate-500 dark:text-[#c8a97e]/80/70">
                <span>{signal.category}</span>
                <span>{signal.metric}</span>
              </div>
              <h3 className="mt-1 text-sm font-semibold tracking-tight text-slate-900 dark:text-white/80">
                {signal.title}
              </h3>
              <p className="mt-1 text-xs leading-relaxed text-slate-600 dark:text-[#c8a97e]/80/80">
                {signal.summary}
              </p>
              {signal.delta ? (
                <div className="mt-2 text-[11px] font-medium uppercase tracking-[0.3em] text-emerald-600 dark:text-emerald-300">
                  {signal.delta}
                </div>
              ) : null}
            </article>
          ))}
        </div>
      </section>

      <section className="rounded-2xl border border-white/20 bg-white/60 p-4 text-sm text-slate-700 shadow-inner backdrop-blur dark:border-[#c8a97e]/15 dark:bg-slate-950/70 dark:text-white/80">
        <header className="text-[11px] font-semibold uppercase tracking-[0.35em] text-slate-600 dark:text-[#c8a97e]/80/70">
          Backlog triggers
        </header>
        <ul className="mt-3 space-y-3">
          {backlog.map((task) => (
            <li
              key={task.id}
              className="flex items-start justify-between gap-3 rounded-xl border border-white/30 bg-white/80 px-3 py-2 shadow-sm dark:border-[#c8a97e]/15 dark:bg-slate-950/60"
            >
              <div>
                <div className="text-xs font-semibold text-slate-700 dark:text-white/80">
                  {task.label}
                </div>
                <div className="text-[11px] uppercase tracking-[0.35em] text-slate-500 dark:text-[#c8a97e]/80/70">
                  Owner: {task.owner}
                </div>
              </div>
              <div className="text-right text-[11px] uppercase tracking-[0.35em]">
                <div className="font-semibold text-slate-600 dark:text-[#c8a97e]/80">{task.due}</div>
                {task.isBlocked ? (
                  <span className="mt-1 inline-flex items-center justify-center rounded-full bg-rose-500/20 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.35em] text-rose-600 dark:text-rose-300">
                    Blocked
                  </span>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section className="rounded-2xl border border-white/20 bg-gradient-to-br from-white/70 via-white/35 to-white/10 p-4 text-sm text-slate-700 shadow-sm backdrop-blur dark:border-[#c8a97e]/20 dark:from-slate-950/70 dark:via-slate-900/55 dark:to-neutral-950/40 dark:text-white/80">
        <header className="text-[11px] font-semibold uppercase tracking-[0.35em] text-slate-600 dark:text-[#c8a97e]/80/70">
          Future of food radar
        </header>
        <div className="mt-2 flex flex-wrap gap-3 text-[10px] uppercase tracking-[0.35em] text-white/80/70">
          <span className="chalk-breath">{futureFoodDrivers.length} drivers tracked</span>
        </div>
        <div className="mt-3 space-y-3">
          {futureFoodDrivers.map((driver) => (
            <article
              key={driver.id}
              className="rounded-xl border border-white/30 bg-white/60 p-3 shadow-inner dark:border-[#c8a97e]/15 dark:bg-slate-950/60"
            >
              <div className="flex items-center justify-between text-[11px] uppercase tracking-[0.3em] text-slate-500 dark:text-[#c8a97e]/80/70">
                <span>{driver.theme}</span>
                <span>{driver.signal}</span>
              </div>
              <p className="mt-2 text-xs leading-relaxed text-slate-600 dark:text-[#c8a97e]/80/80">{driver.insight}</p>
              <div className="mt-2 rounded-lg border border-white/30 bg-white/70 px-3 py-2 text-[11px] uppercase tracking-[0.3em] text-slate-500 dark:border-[#c8a97e]/15 dark:bg-slate-950/60 dark:text-[#c8a97e]/80/70">
                {driver.action}
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="rounded-2xl border border-white/20 bg-gradient-to-br from-white/80 via-white/40 to-white/20 p-4 text-sm text-slate-700 shadow-sm backdrop-blur dark:border-[#c8a97e]/20 dark:from-slate-950/70 dark:via-slate-900/55 dark:to-neutral-950/40 dark:text-white/80">
        <header className="text-[11px] font-semibold uppercase tracking-[0.35em] text-slate-600 dark:text-[#c8a97e]/80/70">
          Lab soundstage
        </header>
        <div className="mt-3 space-y-3">
          {labPlaylists.map((playlist) => (
            <div key={playlist.id} className="rounded-xl border border-white/30 bg-white/60 p-3 shadow-inner dark:border-[#c8a97e]/15 dark:bg-slate-950/60">
              <div className="text-xs font-semibold uppercase tracking-[0.35em] text-slate-500 dark:text-[#c8a97e]/80/70">
                {playlist.title}
              </div>
              <div className="text-[11px] uppercase tracking-[0.3em] text-slate-400 dark:text-[#c8a97e]/50">
                {playlist.mood}
              </div>
              <div className="mt-2 text-[12px] text-slate-600 dark:text-[#c8a97e]/80/80">
                {playlist.tracks.join(" • ")}
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-2xl border border-white/15 bg-white/60 p-4 text-sm text-slate-700 shadow-inner backdrop-blur-sm dark:border-[#c8a97e]/15 dark:bg-slate-950/70 dark:text-white/80">
        <header className="text-[11px] font-semibold uppercase tracking-[0.35em] text-slate-500 dark:text-[#c8a97e]/80/70">
          Pipeline radar
        </header>
        <div className="mt-3 space-y-3">
          {pipeline.length ? (
            pipeline.map((experiment) => (
              <div
                key={experiment.id}
                className="rounded-xl border border-white/30 bg-white/70 p-3 shadow-sm dark:border-[#c8a97e]/15 dark:bg-slate-950/60"
              >
                <div className="flex items-center justify-between text-[11px] uppercase tracking-[0.3em] text-slate-500 dark:text-[#c8a97e]/80/70">
                  <span>{experiment.stage}</span>
                  <span>{experiment.launchWindow}</span>
                </div>
                <div className="mt-1 text-sm font-semibold tracking-tight text-slate-800 dark:text-white/80">
                  {experiment.title}
                </div>
                {experiment.variables.length ? (
                  <div className="mt-2 flex flex-wrap gap-2 text-[10px] uppercase tracking-[0.3em] text-slate-400 dark:text-[#c8a97e]/60">
                    {experiment.variables.map((variable) => (
                      <span key={variable} className="rounded-full bg-white/60 px-2 py-1 dark:bg-[#c8a97e]/08">
                        {variable}
                      </span>
                    ))}
                  </div>
                ) : null}
              </div>
            ))
          ) : (
            <div className="rounded-xl border border-dashed border-white/40 px-3 py-4 text-center text-xs italic text-slate-400 dark:border-[#c8a97e]/25 dark:text-[#c8a97e]/50">
              Queue experiments to populate pipeline radar.
            </div>
          )}
        </div>
      </section>

      <section className="rounded-2xl border border-white/15 bg-white/60 p-4 text-xs text-slate-600 shadow-inner backdrop-blur-sm dark:border-[#c8a97e]/15 dark:bg-slate-950/70 dark:text-[#c8a97e]/80/80">
        <header className="text-[11px] font-semibold uppercase tracking-[0.35em] text-slate-500 dark:text-[#c8a97e]/80/70">
          Insights feed
        </header>
        <ul className="mt-3 space-y-3">
          {insights.map((item, index) => (
            <li key={index} className="rounded-xl border border-white/20 bg-white/70 px-3 py-2 shadow-sm dark:border-[#c8a97e]/15 dark:bg-slate-950/60">
              <div className="text-xs font-semibold text-slate-700 dark:text-white/80">{item.headline}</div>
              <p className="text-[11px] leading-relaxed text-slate-500 dark:text-[#c8a97e]/80/70">{item.detail}</p>
              {item.metric ? (
                <div className="mt-1 text-[11px] font-semibold uppercase tracking-[0.3em] text-emerald-600 dark:text-emerald-300">
                  {item.metric}
                </div>
              ) : null}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
