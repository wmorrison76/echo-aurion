import { AlertTriangle, ShieldCheck } from "lucide-react";
import type { AuthenticatedProfile } from "@shared/profile";
const STATUS_STYLES = {
  failing: "border-red-500/40 bg-red-500/10 text-red-200",
  attention: "border-amber-400/40 bg-amber-500/10 text-amber-200",
  passing: "border-emerald-400/40 bg-emerald-500/10 text-emerald-200",
} as const;
interface ProfileComplianceSectionProps {
  compliance: AuthenticatedProfile["compliance"];
}
export function ProfileComplianceSection({
  compliance,
}: ProfileComplianceSectionProps) {
  return (
    <section className="rounded-3xl border border-border/40 bg-surface/90 p-8 shadow-[0_35px_90px_-45px_rgba(8,12,22,0.65)]">
      {" "}
      <div className="flex flex-col gap-6">
        {" "}
        <div>
          {" "}
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-aurum-200">
            Control spotlight
          </p>{" "}
          <h2 className="mt-2 text-2xl font-semibold text-foreground">
            Controls requiring intervention
          </h2>{" "}
          <p className="mt-3 text-sm text-muted-foreground">
            {" "}
            Breaches prioritized by severity, mapped to Argus evidence and SLAs.
            Coordinate remediation before the next audit window.{" "}
          </p>{" "}
        </div>{" "}
        <ul className="space-y-4 text-sm text-muted-foreground">
          {" "}
          {compliance.breaches.map((breach) => (
            <li
              key={breach.controlId}
              className="rounded-2xl border border-border/40 bg-surface-variant/60 p-5"
            >
              {" "}
              <div className="flex flex-wrap items-center justify-between gap-3">
                {" "}
                <div>
                  {" "}
                  <p className="text-sm font-semibold text-foreground">
                    {breach.title}
                  </p>{" "}
                  <p className="mt-1 text-xs uppercase tracking-[0.24em] text-muted-foreground/70">
                    {" "}
                    {breach.framework} · Owner {breach.owner}{" "}
                  </p>{" "}
                </div>{" "}
                <span
                  className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-[0.68rem] font-semibold uppercase tracking-[0.24em] ${STATUS_STYLES[breach.status]}`}
                >
                  {" "}
                  <AlertTriangle className="h-4 w-4" /> {breach.status}{" "}
                </span>{" "}
              </div>{" "}
              <p className="mt-3 text-xs text-muted-foreground/80">
                {breach.variance}
              </p>{" "}
              <ul className="mt-2 space-y-1 text-xs text-muted-foreground/70">
                {" "}
                {breach.recommendedActions.map((action) => (
                  <li key={action}>• {action}</li>
                ))}{" "}
              </ul>{" "}
            </li>
          ))}{" "}
          {compliance.breaches.length === 0 ? (
            <li className="rounded-2xl border border-emerald-400/40 bg-emerald-500/10 p-5 text-sm text-emerald-200">
              {" "}
              <div className="flex items-center gap-2 font-semibold uppercase tracking-[0.24em]">
                {" "}
                <ShieldCheck className="h-4 w-4" /> All controls passing{" "}
              </div>{" "}
              <p className="mt-2 text-xs text-emerald-100/80">
                No remediation items. Continue monitoring automation queue.
              </p>{" "}
            </li>
          ) : null}{" "}
        </ul>{" "}
      </div>{" "}
    </section>
  );
}
