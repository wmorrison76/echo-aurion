import {
  AlertTriangle,
  Clock4,
  GitMerge,
  ServerCrash,
  Zap,
} from "lucide-react";
import type { AuthenticatedProfile } from "@shared/profile";
const SEVERITY_STYLES = {
  info: "border-border/40 bg-surface/70 text-muted-foreground",
  success: "border-emerald-400/40 bg-emerald-500/10 text-emerald-200",
  warning: "border-amber-400/40 bg-amber-500/10 text-amber-200",
  critical: "border-red-500/40 bg-red-500/10 text-red-200",
} as const;
interface ProfileTimelineSectionProps {
  timeline: AuthenticatedProfile["timeline"];
}
export function ProfileTimelineSection({
  timeline,
}: ProfileTimelineSectionProps) {
  return (
    <section className="rounded-3xl border border-border/40 bg-surface/90 p-8 shadow-[0_35px_90px_-45px_rgba(8,12,22,0.65)]">
      {" "}
      <div>
        {" "}
        <p className="text-xs font-semibold uppercase tracking-[0.28em] text-aurum-200">
          Activity feed
        </p>{" "}
        <h2 className="mt-2 text-2xl font-semibold text-foreground">
          Compliance & automation timeline
        </h2>{" "}
        <p className="mt-3 text-sm text-muted-foreground">
          {" "}
          Chronological snapshot of automation runs, escalations, and session
          events sourced from Zapier, Argus, and Phoenix telemetry.{" "}
        </p>{" "}
        <ul className="mt-6 space-y-4 text-sm text-muted-foreground">
          {" "}
          {timeline.map((event) => {
            const severityStyle = SEVERITY_STYLES[event.severity];
            const icon = renderIcon(event.category, event.severity);
            return (
              <li
                key={event.id}
                className="rounded-2xl border border-border/40 bg-surface-variant/60 p-5"
              >
                {" "}
                <div
                  className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-[0.68rem] font-semibold uppercase tracking-[0.24em] ${severityStyle}`}
                >
                  {" "}
                  {icon} {event.category}{" "}
                </div>{" "}
                <p className="mt-3 text-sm font-semibold text-foreground">
                  {event.summary}
                </p>{" "}
                <p className="mt-2 text-xs text-muted-foreground/70">
                  {formatTimestamp(event.timestamp)}
                </p>{" "}
                <p className="mt-2 text-xs text-muted-foreground/80">
                  {event.details}
                </p>{" "}
                <div className="mt-3 flex flex-wrap gap-2 text-[0.65rem] uppercase tracking-[0.24em] text-muted-foreground/70">
                  {" "}
                  {event.relatedControlId ? (
                    <span className="rounded-full border border-border/40 bg-surface/70 px-3 py-1">
                      Control {event.relatedControlId}
                    </span>
                  ) : null}{" "}
                  {event.relatedAutomationId ? (
                    <span className="rounded-full border border-border/40 bg-surface/70 px-3 py-1">
                      Automation {event.relatedAutomationId}
                    </span>
                  ) : null}{" "}
                </div>{" "}
              </li>
            );
          })}{" "}
        </ul>{" "}
      </div>{" "}
    </section>
  );
}
function formatTimestamp(value: string) {
  const date = new Date(value);
  return date.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "numeric",
  });
}
function renderIcon(
  category: AuthenticatedProfile["timeline"][number]["category"],
  severity: AuthenticatedProfile["timeline"][number]["severity"],
) {
  if (category === "automation") {
    return <Zap className="h-4 w-4" />;
  }
  if (category === "integration") {
    return <GitMerge className="h-4 w-4" />;
  }
  if (category === "session") {
    return severity === "warning" || severity === "critical" ? (
      <AlertTriangle className="h-4 w-4" />
    ) : (
      <Clock4 className="h-4 w-4" />
    );
  }
  return severity === "critical" ? (
    <ServerCrash className="h-4 w-4" />
  ) : (
    <AlertTriangle className="h-4 w-4" />
  );
}
