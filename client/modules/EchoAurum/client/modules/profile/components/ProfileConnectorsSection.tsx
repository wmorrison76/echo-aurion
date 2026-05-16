import { Cloud, Server, Zap } from "lucide-react";
import type { AuthenticatedProfile } from "@shared/profile";
const STATUS_BADGES = {
  healthy: "border-emerald-400/40 bg-emerald-500/10 text-emerald-200",
  degraded: "border-amber-400/40 bg-amber-500/10 text-amber-200",
  disconnected: "border-red-500/40 bg-red-500/10 text-red-200",
} as const;
interface ProfileConnectorsSectionProps {
  connectors: AuthenticatedProfile["connectors"];
}
export function ProfileConnectorsSection({
  connectors,
}: ProfileConnectorsSectionProps) {
  return (
    <section className="rounded-3xl border border-border/40 bg-surface/90 p-8 shadow-[0_35px_90px_-45px_rgba(8,12,22,0.65)]">
      {" "}
      <div className="flex flex-col gap-6">
        {" "}
        <div>
          {" "}
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-aurum-200">
            Integration mesh
          </p>{" "}
          <h2 className="mt-2 text-2xl font-semibold text-foreground">
            Connected evidence systems
          </h2>{" "}
          <p className="mt-3 text-sm text-muted-foreground">
            {" "}
            Supabase retains Argus evidence, Zapier orchestrates automations,
            and PagerDuty backs incident response. Coverage spans SOC 2, PCI
            DSS, and GDPR attestations.{" "}
          </p>{" "}
        </div>{" "}
        <ul className="grid gap-4 md:grid-cols-2">
          {" "}
          {connectors.map((connector) => (
            <li
              key={connector.id}
              className="rounded-2xl border border-border/40 bg-surface-variant/60 p-5"
            >
              {" "}
              <div className="flex items-center justify-between gap-3">
                {" "}
                <div>
                  {" "}
                  <p className="text-sm font-semibold text-foreground">
                    {connector.name}
                  </p>{" "}
                  <p className="mt-1 text-xs uppercase tracking-[0.24em] text-muted-foreground/70">
                    {" "}
                    {connector.vendor} · {connector.category}{" "}
                  </p>{" "}
                </div>{" "}
                <span
                  className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-[0.68rem] font-semibold uppercase tracking-[0.24em] ${STATUS_BADGES[connector.status]}`}
                >
                  {" "}
                  {renderIcon(connector.vendor)} {connector.status}{" "}
                </span>{" "}
              </div>{" "}
              <p className="mt-3 text-xs text-muted-foreground/70">
                Last sync {formatDate(connector.lastSyncAt)}
              </p>{" "}
              <p className="mt-2 text-sm text-muted-foreground">
                {connector.detail}
              </p>{" "}
              <div className="mt-3 flex flex-wrap gap-2">
                {" "}
                {connector.coverage.map((framework) => (
                  <span
                    key={`${connector.id}-${framework}`}
                    className="rounded-full border border-aurum-300/40 bg-aurum-500/10 px-3 py-1 text-[0.65rem] font-semibold uppercase tracking-[0.24em] text-aurum-200"
                  >
                    {" "}
                    {framework}{" "}
                  </span>
                ))}{" "}
                <span className="rounded-full border border-border/40 bg-surface/70 px-3 py-1 text-[0.65rem] font-semibold uppercase tracking-[0.24em] text-muted-foreground">
                  {" "}
                  {connector.automationCount} automations{" "}
                </span>{" "}
              </div>{" "}
            </li>
          ))}{" "}
        </ul>{" "}
      </div>{" "}
    </section>
  );
}
function formatDate(value: string) {
  const date = new Date(value);
  return date.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "numeric",
  });
}
function renderIcon(vendor: string) {
  if (vendor.toLowerCase().includes("zapier")) {
    return <Zap className="h-4 w-4" />;
  }
  if (vendor.toLowerCase().includes("supabase")) {
    return <Server className="h-4 w-4" />;
  }
  return <Cloud className="h-4 w-4" />;
}
