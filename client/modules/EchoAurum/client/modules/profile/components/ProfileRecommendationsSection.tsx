import { Lightbulb } from "lucide-react";
import type { AuthenticatedProfile } from "@shared/profile";
const PRIORITY_BADGES = {
  high: "border-red-500/40 bg-red-500/10 text-red-200",
  medium: "border-amber-400/40 bg-amber-500/10 text-amber-200",
  low: "border-emerald-400/40 bg-emerald-500/10 text-emerald-200",
} as const;
interface ProfileRecommendationsSectionProps {
  recommendations: AuthenticatedProfile["recommendations"];
}
export function ProfileRecommendationsSection({
  recommendations,
}: ProfileRecommendationsSectionProps) {
  return (
    <section className="rounded-3xl border border-border/40 bg-surface/90 p-8 shadow-[0_35px_90px_-45px_rgba(8,12,22,0.65)]">
      {" "}
      <div>
        {" "}
        <p className="text-xs font-semibold uppercase tracking-[0.28em] text-aurum-200">
          Recommended actions
        </p>{" "}
        <h2 className="mt-2 text-2xl font-semibold text-foreground">
          Next best steps
        </h2>{" "}
        <p className="mt-3 text-sm text-muted-foreground">
          {" "}
          Prioritized by control severity and automation signals. Execute in
          Zapier or within Argus binder playbooks to restore full compliance
          coverage.{" "}
        </p>{" "}
        <ul className="mt-6 space-y-4 text-sm text-muted-foreground">
          {" "}
          {recommendations.map((recommendation) => (
            <li
              key={recommendation.id}
              className="rounded-2xl border border-border/40 bg-surface-variant/60 p-5"
            >
              {" "}
              <div className="flex flex-wrap items-center justify-between gap-3">
                {" "}
                <div>
                  {" "}
                  <p className="text-sm font-semibold text-foreground">
                    {recommendation.title}
                  </p>{" "}
                  <p className="mt-1 text-xs uppercase tracking-[0.24em] text-muted-foreground/70">
                    {recommendation.id}
                  </p>{" "}
                </div>{" "}
                <span
                  className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-[0.68rem] font-semibold uppercase tracking-[0.24em] ${PRIORITY_BADGES[recommendation.priority]}`}
                >
                  {" "}
                  <Lightbulb className="h-4 w-4" />{" "}
                  {recommendation.priority}{" "}
                </span>{" "}
              </div>{" "}
              <p className="mt-3 text-xs text-muted-foreground/80">
                {recommendation.description}
              </p>{" "}
              <div className="mt-3 flex flex-wrap gap-2 text-[0.65rem] uppercase tracking-[0.24em] text-muted-foreground/70">
                {" "}
                {recommendation.relatedControlId ? (
                  <span className="rounded-full border border-border/40 bg-surface/70 px-3 py-1">
                    Control {recommendation.relatedControlId}
                  </span>
                ) : null}{" "}
                {recommendation.relatedAutomationId ? (
                  <span className="rounded-full border border-border/40 bg-surface/70 px-3 py-1">
                    Automation {recommendation.relatedAutomationId}
                  </span>
                ) : null}{" "}
              </div>{" "}
            </li>
          ))}{" "}
        </ul>{" "}
      </div>{" "}
    </section>
  );
}
