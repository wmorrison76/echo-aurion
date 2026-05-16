import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export type PlannerStage = "setup" | "plan" | "scaffold" | "ready";

const STAGES: { id: PlannerStage; title: string; subtitle: string }[] = [
  {
    id: "setup",
    title: "Project setup",
    subtitle: "Name the initiative and confirm the target workspace.",
  },
  {
    id: "plan",
    title: "Plan",
    subtitle: "Author the seed script and preview the outcome.",
  },
  {
    id: "scaffold",
    title: "Scaffold",
    subtitle: "Review generated files and confirm structure.",
  },
  {
    id: "ready",
    title: "Integrate",
    subtitle: "Apply the scaffold to the codebase when approved.",
  },
];

const stageRank: Record<PlannerStage, number> = {
  setup: 0,
  plan: 1,
  scaffold: 2,
  ready: 3,
};

export default function PlannerStageTracker({
  stage,
}: {
  stage: PlannerStage;
}) {
  return (
    <div className="rounded-xl border border-border/60 bg-background/70 p-4 shadow-sm">
      <ol className="grid gap-4 md:grid-cols-4">
        {STAGES.map((item) => {
          const rank = stageRank[item.id];
          const currentRank = stageRank[stage];
          const status =
            rank === currentRank
              ? "current"
              : rank < currentRank
                ? "complete"
                : "upcoming";
          return (
            <li key={item.id} className="space-y-2">
              <div className="flex items-center gap-2">
                <Badge
                  variant={
                    status === "complete"
                      ? "default"
                      : status === "current"
                        ? "secondary"
                        : "outline"
                  }
                  className={cn(
                    "px-2 py-1 text-[11px] uppercase tracking-wide",
                    status === "upcoming" && "opacity-70",
                  )}
                >
                  {status === "complete"
                    ? "Done"
                    : status === "current"
                      ? "Now"
                      : "Next"}
                </Badge>
                <span
                  className={cn(
                    "text-sm font-semibold",
                    status === "upcoming" && "opacity-70",
                  )}
                >
                  {item.title}
                </span>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                {item.subtitle}
              </p>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
