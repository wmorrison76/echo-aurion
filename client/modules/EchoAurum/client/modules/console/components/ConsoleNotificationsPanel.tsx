import type { ConsoleNotification } from "@shared/notifications";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
const SEVERITY_STYLES: Record<ConsoleNotification["severity"], string> = {
  info: "border-aurum-400/40 bg-aurum-500/10 text-aurum-50",
  success: "border-emerald-400/40 bg-emerald-500/10 text-emerald-50",
  warning: "border-amber-400/40 bg-amber-500/10 text-amber-50",
  critical: "border-rose-400/40 bg-rose-500/10 text-rose-50",
};
export function ConsoleNotificationsPanel({
  notifications,
}: {
  notifications: ConsoleNotification[];
}) {
  if (notifications.length === 0) {
    return null;
  }
  return (
    <section
      aria-label="Live console notifications"
      className="rounded-3xl border border-border/40 bg-surface/90 p-8 shadow-[0_35px_90px_-45px_rgba(8,12,22,0.65)]"
    >
      {" "}
      <div className="flex flex-col gap-6 lg:grid lg:grid-cols-[1.1fr_0.9fr] lg:items-start">
        {" "}
        <div>
          {" "}
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-aurum-200">
            Notifications
          </p>{" "}
          <h2 className="mt-3 text-2xl font-semibold text-foreground">
            Guardrail and automation alerts
          </h2>{" "}
          <p className="mt-2 text-sm text-muted-foreground">
            {" "}
            Zelda, Argus, Phoenix, and Echo Ai³ publish alerts when guardrails
            intervene, forecasts shift, or evidence packets are ready.{" "}
          </p>{" "}
          <div className="mt-6 space-y-4">
            {" "}
            {notifications.slice(0, 2).map((notification) => (
              <NotificationCard
                key={notification.id}
                notification={notification}
                layout="compact"
              />
            ))}{" "}
          </div>{" "}
        </div>{" "}
        <div className="rounded-2xl border border-border/40 bg-surface-variant/60 p-6">
          {" "}
          <div
            role="log"
            aria-live="polite"
            aria-relevant="additions"
            className="space-y-4"
          >
            {" "}
            {notifications.map((notification) => (
              <NotificationCard
                key={`${notification.id}-detail`}
                notification={notification}
                layout="full"
              />
            ))}{" "}
          </div>{" "}
        </div>{" "}
      </div>{" "}
    </section>
  );
}
function NotificationCard({
  notification,
  layout,
}: {
  notification: ConsoleNotification;
  layout: "compact" | "full";
}) {
  const classes = SEVERITY_STYLES[notification.severity];
  return (
    <article
      className={cn(
        "rounded-2xl border p-5",
        classes,
        layout === "compact"
          ? "shadow-[0_18px_60px_-30px_rgba(6,10,20,0.75)]"
          : "shadow-sm",
      )}
    >
      {" "}
      <header>
        {" "}
        <p className="text-xs font-semibold uppercase tracking-[0.26em] opacity-80">
          {formatSeverity(notification.severity)}
        </p>{" "}
        <h3 className="mt-2 text-lg font-semibold text-foreground">
          {notification.title}
        </h3>{" "}
      </header>{" "}
      <p className="mt-3 text-sm text-foreground/90">
        {notification.description}
      </p>{" "}
      <p className="mt-2 text-xs text-foreground/70">
        {" "}
        {new Date(notification.createdAt).toLocaleTimeString("en-US", {
          hour: "2-digit",
          minute: "2-digit",
        })}{" "}
      </p>{" "}
      {notification.href ? (
        <Button asChild size="sm" variant="secondary" className="mt-4">
          {" "}
          <Link to={notification.href}>
            {" "}
            {notification.ctaLabel ?? "View details"}{" "}
            <ArrowRight className="ml-2 h-4 w-4" />{" "}
          </Link>{" "}
        </Button>
      ) : null}{" "}
    </article>
  );
}
function formatSeverity(severity: ConsoleNotification["severity"]) {
  switch (severity) {
    case "critical":
      return "Critical guardrail";
    case "warning":
      return "Attention";
    case "success":
      return "Resolved";
    default:
      return "Information";
  }
}
