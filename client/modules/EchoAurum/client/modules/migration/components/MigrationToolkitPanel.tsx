import React, { useMemo } from "react";
import {
  AlertTriangle,
  ArrowRight,
  Database,
  FileSpreadsheet,
  Loader2,
  PlugZap,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useMigrationToolkit } from "../hooks/useMigrationToolkit";
export default function MigrationToolkitPanel() {
  const { status, data, message } = useMigrationToolkit();
  const adapters = useMemo(() => data?.adapters ?? [], [data]);
  const steps = useMemo(() => data?.steps.slice(0, 6) ?? [], [data]);
  return (
    <div className="rounded-2xl border border-border/40 bg-surface-variant/60 p-6">
      {" "}
      <div className="flex items-center justify-between gap-4">
        {" "}
        <div>
          {" "}
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-aurum-200">
            Migration toolkit
          </p>{" "}
          <h3 className="mt-2 text-lg font-semibold text-foreground">
            Guided import wizards & API adapters
          </h3>{" "}
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            {" "}
            EchoAurum maps competitor exports (M3, Intacct, QuickBooks) into
            LUCCCA ledgers with GL-aware wizards and Zapier-powered adapters so
            switching takes only a few clicks.{" "}
          </p>{" "}
        </div>{" "}
        {status === "loading" ? (
          <Loader2 className="h-5 w-5 animate-spin text-aurum-300" />
        ) : (
          <FileSpreadsheet className="h-6 w-6 text-aurum-300" />
        )}{" "}
      </div>{" "}
      {status === "error" && (
        <div className="mt-4 flex items-start gap-3 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-200">
          {" "}
          <AlertTriangle className="mt-1 h-4 w-4 text-red-300" />{" "}
          <div>
            {" "}
            <p className="font-semibold">
              Unable to load migration toolkit
            </p>{" "}
            <p className="mt-1 text-xs text-red-200/80">{message}</p>{" "}
          </div>{" "}
        </div>
      )}{" "}
      {status === "unauthenticated" && (
        <SessionRequiredNotice
          description={
            message ??
            "Authenticate with an auditor persona to run migration readiness reports."
          }
        />
      )}{" "}
      {status === "ready" && data && (
        <div className="mt-6 space-y-6">
          {" "}
          <div className="grid gap-4 sm:grid-cols-3">
            {" "}
            <SummaryCard
              icon={<Database className="h-5 w-5 text-aurum-200" />}
              title="Records staged"
              value={data.totalRecords}
              description="GL + AP rows ready for EchoLedger"
            />{" "}
            <SummaryCard
              icon={<PlugZap className="h-5 w-5 text-emerald-200" />}
              title="Adapter readiness"
              value={`${data.readinessScore}%`}
              description={`${adapters.filter((adapter) => adapter.status === "ready").length} adapters ready`}
            />{" "}
            <SummaryCard
              icon={<ArrowRight className="h-5 w-5 text-sky-200" />}
              title="Vendors migrated"
              value={data.totalVendors}
              description={`${data.totalPayrollProfiles} payroll profiles queued`}
            />{" "}
          </div>{" "}
          <div className="grid gap-6 lg:grid-cols-[1.3fr_0.7fr]">
            {" "}
            <div className="rounded-xl border border-border/40 bg-surface/60 p-4">
              {" "}
              <p className="text-xs font-semibold uppercase tracking-[0.25em] text-muted-foreground">
                Wizard steps
              </p>{" "}
              <ul className="mt-4 space-y-3 text-sm text-muted-foreground">
                {" "}
                {steps.map((step) => (
                  <li
                    key={step.id}
                    className="rounded-lg border border-border/40 bg-surface-variant/60 p-4"
                  >
                    {" "}
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      {" "}
                      <div>
                        {" "}
                        <p className="text-sm font-semibold text-foreground">
                          {step.title}
                        </p>{" "}
                        <p className="mt-1 text-xs uppercase tracking-[0.25em] text-muted-foreground/70">
                          {" "}
                          GL {step.glCodes.join(",")}{" "}
                        </p>{" "}
                      </div>{" "}
                      <span className="rounded-full border border-border/40 bg-surface-variant/60 px-3 py-1 text-[0.65rem] font-semibold uppercase tracking-[0.25em]">
                        {" "}
                        {step.estimatedMinutes} min{" "}
                      </span>{" "}
                    </div>{" "}
                    <p className="mt-3 text-xs text-muted-foreground/80">
                      {step.description}
                    </p>{" "}
                    {step.apiAdapter ? (
                      <AdapterPill adapter={step.apiAdapter} />
                    ) : null}{" "}
                  </li>
                ))}{" "}
              </ul>{" "}
            </div>{" "}
            <div className="rounded-xl border border-border/40 bg-surface/60 p-4">
              {" "}
              <p className="text-xs font-semibold uppercase tracking-[0.25em] text-muted-foreground">
                API adapters
              </p>{" "}
              <ul className="mt-4 space-y-3 text-sm text-muted-foreground">
                {" "}
                {adapters.map((adapter) => (
                  <li
                    key={adapter.adapterId}
                    className="rounded-lg border border-border/40 bg-surface-variant/60 p-4"
                  >
                    {" "}
                    <div className="flex items-center justify-between gap-3">
                      {" "}
                      <div>
                        {" "}
                        <p className="text-sm font-semibold text-foreground">
                          {adapter.platform}
                        </p>{" "}
                        <p className="mt-1 text-xs uppercase tracking-[0.25em] text-muted-foreground/70">
                          {" "}
                          Coverage {adapter.coverage.join(" ·")}{" "}
                        </p>{" "}
                      </div>{" "}
                      <StatusBadge status={adapter.status} />{" "}
                    </div>{" "}
                    {adapter.zapierWorkflowId ? (
                      <p className="mt-2 text-xs text-muted-foreground/80">
                        Zapier {adapter.zapierWorkflowId}
                      </p>
                    ) : null}{" "}
                  </li>
                ))}{" "}
                {data.blockers.length > 0 ? (
                  <li className="rounded-lg border border-amber-400/40 bg-amber-500/10 p-4 text-xs text-amber-200">
                    {" "}
                    Blockers: {data.blockers.join(";")}{" "}
                  </li>
                ) : null}{" "}
              </ul>{" "}
            </div>{" "}
          </div>{" "}
        </div>
      )}{" "}
    </div>
  );
}
function SummaryCard({
  icon,
  title,
  value,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  value: number | string;
  description?: string;
}) {
  return (
    <div className="rounded-xl border border-border/40 bg-surface/60 p-4">
      {" "}
      <div className="flex items-center gap-3 text-muted-foreground">
        {" "}
        {icon}{" "}
        <p className="text-xs font-semibold uppercase tracking-[0.25em]">
          {title}
        </p>{" "}
      </div>{" "}
      <p className="mt-3 text-2xl font-semibold text-foreground">{value}</p>{" "}
      {description ? (
        <p className="mt-1 text-xs text-muted-foreground/80">{description}</p>
      ) : null}{" "}
    </div>
  );
}
function StatusBadge({ status }: { status: ApiAdapterPlan["status"] }) {
  const palette = {
    ready: "border-emerald-400/40 bg-emerald-500/10 text-emerald-200",
    beta: "border-sky-400/40 bg-sky-500/10 text-sky-200",
    roadmap: "border-amber-400/40 bg-amber-500/10 text-amber-200",
  }[status];
  return (
    <span
      className={cn(
        "rounded-full border px-3 py-1 text-[0.65rem] font-semibold uppercase tracking-[0.25em]",
        palette,
      )}
    >
      {" "}
      {status}{" "}
    </span>
  );
}
function AdapterPill({ adapter }: { adapter: ApiAdapterPlan }) {
  return (
    <div className="mt-3 inline-flex items-center gap-2 rounded-full border border-border/40 bg-surface-variant/60 px-3 py-1 text-[0.65rem] uppercase tracking-[0.25em] text-muted-foreground/80">
      {" "}
      <PlugZap className="h-3 w-3 text-aurum-300" /> {adapter.adapterId}{" "}
    </div>
  );
}
