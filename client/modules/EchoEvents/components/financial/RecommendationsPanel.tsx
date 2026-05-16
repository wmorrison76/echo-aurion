import React from "react";

/**
 * Recommendations Panel — EchoEvents financial advice surface
 *
 * §1.1 — The two suggestions below are EXAMPLE COPY (not AI output). We render
 * them inside a clearly-labelled "example" panel so operators don't mistake
 * them for real recommendations. When the Echo optimization engine is wired,
 * replace this entire panel with live suggestions.
 */
const EXAMPLE_SUGGESTIONS: string[] = [
  "Swap premium beef tenderloin for chef's signature short rib to improve margin by ~8%.",
  "Consider adding a signature cocktail upgrade; similar events gain +$7–10 per guest.",
];

export const RecommendationsPanel: React.FC = () => {
  return (
    <div
      className="border rounded-lg p-3 space-y-2 text-xs bg-slate-50/40 border-slate-200/60"
      data-testid="echoevents-recommendations-panel-example"
    >
      <div className="flex items-center gap-2">
        <span className="text-xs font-semibold text-slate-600">Recommendations</span>
        <span className="text-[0.6rem] uppercase tracking-wider px-1.5 py-0.5 rounded bg-slate-100 text-slate-700">
          example only
        </span>
      </div>
      <ul className="space-y-1">
        {EXAMPLE_SUGGESTIONS.map((s, idx) => (
          <li key={idx} className="flex gap-2 text-muted-foreground">
            <span className="mt-0.5">•</span>
            <span>{s}</span>
          </li>
        ))}
      </ul>
      <p className="text-[0.65rem] text-muted-foreground italic">
        Static examples shown until the Echo optimization engine is wired —
        these are not live suggestions for this event.
      </p>
    </div>
  );
};
