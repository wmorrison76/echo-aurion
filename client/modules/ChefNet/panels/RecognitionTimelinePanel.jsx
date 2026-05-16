import React from "react";

export default function RecognitionTimelinePanel({ timeline = [] }) {
  return (
    <div className="space-y-3 text-xs">
      <section className="border border-amber-200 dark:border-amber-700 rounded-xl p-3 bg-amber-50/50 dark:bg-amber-950/30">
        <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-amber-800 dark:text-amber-200 mb-1">
          Recognition Timeline
        </div>
        <p className="text-xs text-amber-900/80 dark:text-amber-100/80">
          Every recognition moment builds the culture we're creating together.
        </p>
      </section>

      <div className="space-y-2">
        {timeline && timeline.length > 0 ? (
          timeline.map((t, i) => (
            <div
              key={i}
              className="border-l-2 border-amber-400 dark:border-amber-600 pl-3 py-2 bg-white/50 dark:bg-slate-900/50 rounded-r-lg p-3"
            >
              <div className="flex items-start justify-between gap-2 mb-1">
                <div className="font-semibold text-slate-900 dark:text-slate-100">
                  {t.title || "Recognition Received"}
                </div>
                <span className="text-[10px] uppercase tracking-[0.08em] text-amber-600 dark:text-amber-400 font-semibold">
                  {t.category || "General"}
                </span>
              </div>
              <p className="text-[10px] text-slate-600 dark:text-slate-400 mb-1">
                {t.summary || t.message || t.description}
              </p>
              <div className="text-[9px] text-slate-500 dark:text-slate-500">
                {t.date ? new Date(t.date).toLocaleDateString() : "Recently"}
              </div>
            </div>
          ))
        ) : (
          <div className="text-center py-6 text-slate-400 dark:text-slate-600">
            <p className="text-xs mb-1">No recognition yet</p>
            <p className="text-[10px]">Ask teammates to recognize your contributions</p>
          </div>
        )}
      </div>

      {timeline && timeline.length > 0 && (
        <section className="border border-slate-200 dark:border-slate-700 rounded-lg p-2 bg-slate-50/50 dark:bg-slate-900/50 text-center">
          <div className="text-[10px] text-slate-500 dark:text-slate-500">
            {timeline.length} recognition{timeline.length !== 1 ? "s" : ""} received
          </div>
        </section>
      )}
    </div>
  );
}
