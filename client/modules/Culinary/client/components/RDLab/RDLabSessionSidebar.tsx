import { memo, useMemo } from "react";

import type { LabExperiment, LabTask } from "@/stores/rdLabStore";

interface Insight {
  headline: string;
  detail: string;
  metric?: string;
}

interface RDLabSessionSidebarProps {
  isDarkMode: boolean;
  projectName: string;
  createdAt: string;
  updatedAt: string;
  vision?: string;
  textureFocus?: string;
  flavorNotes?: string;
  launchTarget?: string;
  focusExperiment?: LabExperiment;
  experimentsCount: number;
  discoveryQueue: LabExperiment[];
  backlog: LabTask[];
  insights: Insight[];
}

const formatTimestamp = (iso: string) => {
  if (!iso) return "";
  try {
    const date = new Date(iso);
    return new Intl.DateTimeFormat(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    }).format(date);
  } catch {
    return iso;
  }
};

export const RDLabSessionSidebar = memo(function RDLabSessionSidebar({
  isDarkMode,
  projectName,
  createdAt,
  updatedAt,
  vision,
  textureFocus,
  flavorNotes,
  launchTarget,
  focusExperiment,
  experimentsCount,
  discoveryQueue,
  backlog,
  insights,
}: RDLabSessionSidebarProps) {
  const palette = useMemo(() => {
    if (isDarkMode) {
      return {
        border: "border-[#c8a97e]/30",
        background: "bg-slate-950/70",
        heading: "text-[#c8a97e]/80/80",
        text: "text-white/80/80",
        badge: "bg-[#c8a97e]/08 border-[#c8a97e]/20 text-[#c8a97e]/80/80",
      };
    }
    return {
      border: "border-white/40",
      background: "bg-white/85",
      heading: "text-slate-700",
      text: "text-slate-600",
      badge: "bg-white/70 border-white/60 text-slate-600",
    };
  }, [isDarkMode]);

  return (
    <aside
      className={`relative flex w-full max-w-[285px] shrink-0 flex-col gap-4 overflow-y-auto border-l border-white/10 bg-black/20 px-5 pb-6 pt-6 backdrop-blur-sm dark:border-[#c8a97e]/20 dark:bg-slate-950/40`}
    >
      <section
        className={`rounded-2xl border ${palette.border} ${palette.background} p-4 shadow-[0_20px_50px_-40px_rgba(15,23,42,0.9)]`}
      >
        <div className={`text-[11px] font-semibold uppercase tracking-[0.35em] ${palette.heading}`}>
          Active session
        </div>
        <h3 className="mt-2 text-lg font-semibold tracking-tight text-white dark:text-white/80">
          {projectName}
        </h3>
        <dl className={`mt-3 space-y-2 text-xs leading-relaxed ${palette.text}`}>
          <div className="flex items-center justify-between gap-3">
            <dt className="uppercase tracking-[0.3em]">Created</dt>
            <dd>{formatTimestamp(createdAt)}</dd>
          </div>
          <div className="flex items-center justify-between gap-3">
            <dt className="uppercase tracking-[0.3em]">Last saved</dt>
            <dd>{formatTimestamp(updatedAt)}</dd>
          </div>
          <div className="flex items-center justify-between gap-3">
            <dt className="uppercase tracking-[0.3em]">Experiments</dt>
            <dd>{experimentsCount}</dd>
          </div>
        </dl>
      </section>

      {(vision || textureFocus || flavorNotes || launchTarget) && (
        <section className={`rounded-2xl border ${palette.border} ${palette.background} p-4`}>
          <div className={`text-[11px] font-semibold uppercase tracking-[0.35em] ${palette.heading}`}>
            Strategic focus
          </div>
          <dl className={`mt-3 space-y-3 text-xs leading-relaxed ${palette.text}`}>
            {vision && (
              <div>
                <dt className="uppercase tracking-[0.3em] text-[10px] opacity-80">North star</dt>
                <dd className="mt-1 whitespace-pre-line">{vision}</dd>
              </div>
            )}
            {textureFocus && (
              <div>
                <dt className="uppercase tracking-[0.3em] text-[10px] opacity-80">Texture agenda</dt>
                <dd className="mt-1 whitespace-pre-line">{textureFocus}</dd>
              </div>
            )}
            {flavorNotes && (
              <div>
                <dt className="uppercase tracking-[0.3em] text-[10px] opacity-80">Flavor architecture</dt>
                <dd className="mt-1 whitespace-pre-line">{flavorNotes}</dd>
              </div>
            )}
            {launchTarget && (
              <div>
                <dt className="uppercase tracking-[0.3em] text-[10px] opacity-80">Launch window</dt>
                <dd className="mt-1 whitespace-pre-line">{launchTarget}</dd>
              </div>
            )}
          </dl>
        </section>
      )}

      {focusExperiment && (
        <section className={`rounded-2xl border ${palette.border} ${palette.background} p-4`}>
          <div className={`flex items-center justify-between text-[11px] font-semibold uppercase tracking-[0.35em] ${palette.heading}`}>
            <span>Workbench spotlight</span>
            <span className="rounded-full border border-white/20 px-2 py-0.5 text-[10px] uppercase tracking-[0.3em] text-white/80 dark:border-[#c8a97e]/25">
              {focusExperiment.status}
            </span>
          </div>
          <div className="mt-3 text-sm font-semibold leading-snug text-white dark:text-white/80">
            {focusExperiment.title}
          </div>
          <p className={`mt-2 text-xs leading-relaxed ${palette.text}`}>
            {focusExperiment.notes}
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {focusExperiment.tags.slice(0, 3).map((tag) => (
              <span
                key={tag}
                className={`rounded-full border px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.3em] ${palette.badge}`}
              >
                {tag}
              </span>
            ))}
          </div>
        </section>
      )}

      {discoveryQueue.length > 0 && (
        <section className={`rounded-2xl border ${palette.border} ${palette.background} p-4`}>
          <div className={`text-[11px] font-semibold uppercase tracking-[0.35em] ${palette.heading}`}>
            Discovery queue
          </div>
          <ul className={`mt-3 space-y-2 text-xs ${palette.text}`}>
            {discoveryQueue.slice(0, 4).map((experiment) => (
              <li key={experiment.id} className="rounded-xl border border-white/10 bg-white/5 p-3 dark:border-[#c8a97e]/20 dark:bg-amber-500/5">
                <div className="text-[11px] font-semibold uppercase tracking-[0.3em] text-white/80 dark:text-white/80/80">
                  {experiment.title}
                </div>
                <p className="mt-1 leading-relaxed opacity-80">{experiment.hypothesis}</p>
              </li>
            ))}
          </ul>
        </section>
      )}

      {backlog.length > 0 && (
        <section className={`rounded-2xl border ${palette.border} ${palette.background} p-4`}>
          <div className={`text-[11px] font-semibold uppercase tracking-[0.35em] ${palette.heading}`}>
            Lab backlog
          </div>
          <ul className={`mt-3 space-y-2 text-xs leading-relaxed ${palette.text}`}>
            {backlog.map((task) => (
              <li
                key={task.id}
                className={`rounded-xl border border-white/10 bg-white/5 p-3 backdrop-blur-sm dark:border-[#c8a97e]/20 dark:bg-amber-500/5 ${
                  task.isBlocked ? "border-dashed" : ""
                }`}
              >
                <div className="flex items-center justify-between text-[10px] uppercase tracking-[0.3em] opacity-80">
                  <span>{task.owner}</span>
                  <span>{task.due}</span>
                </div>
                <p className="mt-1 leading-relaxed">{task.label}</p>
                {task.isBlocked ? (
                  <div className="mt-2 rounded-full border border-amber-400/40 bg-amber-400/10 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.3em] text-amber-100">
                    Blocked
                  </div>
                ) : null}
              </li>
            ))}
          </ul>
        </section>
      )}

      {insights.length > 0 && (
        <section className={`rounded-2xl border ${palette.border} ${palette.background} p-4`}>
          <div className={`text-[11px] font-semibold uppercase tracking-[0.35em] ${palette.heading}`}>
            Signals & insights
          </div>
          <ul className={`mt-3 space-y-3 text-xs leading-relaxed ${palette.text}`}>
            {insights.slice(0, 4).map((insight) => (
              <li key={insight.headline} className="rounded-xl border border-white/10 bg-white/5 p-3 dark:border-[#c8a97e]/20 dark:bg-amber-500/5">
                <div className="flex items-center justify-between text-[10px] uppercase tracking-[0.3em] text-white/80 dark:text-white/80/80">
                  <span>{insight.headline}</span>
                  {insight.metric ? (
                    <span className="rounded-full border border-emerald-400/30 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.3em] text-emerald-100">
                      {insight.metric}
                    </span>
                  ) : null}
                </div>
                <p className="mt-1 opacity-85">{insight.detail}</p>
              </li>
            ))}
          </ul>
        </section>
      )}
    </aside>
  );
});
