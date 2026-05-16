import { Clock, Globe2, Shield, ShieldAlert, ShieldCheck } from "lucide-react";
import type { ReactNode } from "react";
import type { AuthenticatedProfile } from "@shared/profile";
interface ProfileSecuritySectionProps {
  sessions: AuthenticatedProfile["sessions"];
}
export function ProfileSecuritySection({
  sessions,
}: ProfileSecuritySectionProps) {
  return (
    <section className="rounded-3xl border border-border/40 bg-surface/90 p-8 shadow-[0_35px_90px_-45px_rgba(8,12,22,0.65)]">
      {" "}
      <div className="flex flex-col gap-6">
        {" "}
        <div>
          {" "}
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-aurum-200">
            Session security
          </p>{" "}
          <h2 className="mt-2 text-2xl font-semibold text-foreground">
            Authenticated devices & guardrails
          </h2>{" "}
          <p className="mt-3 text-sm text-muted-foreground">
            {" "}
            Phoenix geo-fences, Zelda notarization, and Okta MFA enforce least
            privilege access. Monitor active sessions and validate any anomalies
            surfaced by Odin risk analytics.{" "}
          </p>{" "}
        </div>{" "}
        <ul className="space-y-4 text-sm text-muted-foreground">
          {" "}
          {sessions.map((session) => {
            const badge = resolveRiskBadge(session.riskLevel);
            return (
              <li
                key={session.id}
                className="rounded-2xl border border-border/40 bg-surface-variant/60 p-5"
              >
                {" "}
                <div className="flex flex-wrap items-center justify-between gap-3">
                  {" "}
                  <div>
                    {" "}
                    <p className="text-sm font-semibold text-foreground">
                      {session.device}
                    </p>{" "}
                    <p className="mt-1 text-xs uppercase tracking-[0.24em] text-muted-foreground/70">
                      {session.id}
                    </p>{" "}
                  </div>{" "}
                  <span
                    className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-[0.68rem] font-semibold uppercase tracking-[0.24em] ${badge.className}`}
                  >
                    {" "}
                    {badge.icon} {badge.label}{" "}
                  </span>{" "}
                </div>{" "}
                <div className="mt-4 grid gap-3 sm:grid-cols-3">
                  {" "}
                  <SessionMeta
                    icon={<Globe2 className="h-4 w-4 text-aurum-200" />}
                    label="Location"
                    value={session.location}
                  />{" "}
                  <SessionMeta
                    icon={<Shield className="h-4 w-4 text-aurum-200" />}
                    label="Guardrails"
                    value={session.guardrailsObserved.join(" ·")}
                  />{" "}
                  <SessionMeta
                    icon={<Clock className="h-4 w-4 text-aurum-200" />}
                    label="Last active"
                    value={formatTimestamp(session.lastActiveAt)}
                  />{" "}
                </div>{" "}
                <p className="mt-3 text-xs text-muted-foreground/70">
                  IP {session.ipAddress}
                  {session.mfaVerifiedAt
                    ? ` · MFA verified ${formatTimestamp(session.mfaVerifiedAt)}`
                    : ""}
                </p>{" "}
              </li>
            );
          })}{" "}
        </ul>{" "}
      </div>{" "}
    </section>
  );
}
function SessionMeta({
  icon,
  label,
  value,
}: {
  icon: ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl border border-border/40 bg-surface/70 p-4">
      {" "}
      <p className="flex items-center gap-2 text-xs uppercase tracking-[0.24em] text-muted-foreground">
        {" "}
        {icon} {label}{" "}
      </p>{" "}
      <p className="mt-2 text-sm text-foreground">{value}</p>{" "}
    </div>
  );
}
function resolveRiskBadge(
  level: AuthenticatedProfile["sessions"][number]["riskLevel"],
) {
  switch (level) {
    case "high":
      return {
        label: "High risk",
        className: "border-red-500/40 bg-red-500/10 text-red-200",
        icon: <ShieldAlert className="h-4 w-4" />,
      };
    case "medium":
      return {
        label: "Medium risk",
        className: "border-amber-400/40 bg-amber-500/10 text-amber-200",
        icon: <Shield className="h-4 w-4" />,
      };
    default:
      return {
        label: "Low risk",
        className: "border-emerald-400/40 bg-emerald-500/10 text-emerald-200",
        icon: <ShieldCheck className="h-4 w-4" />,
      };
  }
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
