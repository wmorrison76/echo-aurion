import React, { useMemo } from "react";
import {
  AlertTriangle,
  BadgeCheck,
  ClipboardList,
  Loader2,
  Shield,
  Workflow,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useComplianceDashboard } from "../hooks/useComplianceDashboard";
const FRAMEWORK_LABELS: Record<ControlFramework, string> = {
  SOC2: "SOC 2",
  PCI: "PCI DSS",
  GDPR: "GDPR",
};
export default function ComplianceDashboardPanel() {
  const { status, data, message } = useComplianceDashboard();
  const frameworkRows = useMemo(() => {
    if (!data) {
      return [] as Array<{
        framework: ControlFramework;
        passing: number;
        attention: number;
        failing: number;
        nextDueAt?: string;
      }>;
    }
    return Object.entries(data.summary.frameworks).map(([key, value]) => ({
      framework: key as ControlFramework,
      passing: value.passing,
      attention: value.attention,
      failing: value.failing,
      nextDueAt: value.nextDueAt,
    }));
  }, [data]);
  const breaches = useMemo(() => data?.breaches.slice(0, 3) ?? [], [data]);
  const upcoming = useMemo(() => data?.schedule.slice(0, 4) ?? [], [data]);
  const automations = useMemo(
    () => data?.automationQueue.slice(0, 3) ?? [],
    [data],
  );
  return (
    <div className="rounded-2xl border border-border/40 bg-surface-variant/60 p-6">
      {" "}
      <div className="flex items-center justify-between gap-4">
        {" "}
        <div>
          {" "}
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-aurum-200">
            Compliance evidence
          </p>{" "}
          <h3 className="mt-2 text-lg font-semibold text-foreground">
            Continuous SOC 2 & PCI telemetry
          </h3>{" "}
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            {" "}
            Evidence feeds map LUCCCA general ledger activity, card data
            controls, and privacy workflows into a single readiness dashboard
            with Zapier automation hooks.{" "}
          </p>{" "}
        </div>{" "}
        {status === "loading" ? (
          <Loader2 className="h-5 w-5 animate-spin text-aurum-300" />
        ) : (
          <Shield className="h-6 w-6 text-aurum-300" />
        )}{" "}
      </div>{" "}
      {status === "error" && (
        <div className="mt-4 flex items-start gap-3 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-200">
          {" "}
          <AlertTriangle className="mt-1 h-4 w-4 text-red-300" />{" "}
          <div>
            {" "}
            <p className="font-semibold">
              Unable to load compliance dashboard
            </p>{" "}
            <p className="mt-1 text-xs text-red-200/80">{message}</p>{" "}
          </div>{" "}
        </div>
      )}{" "}
      {status === "unauthenticated" && (
        <SessionRequiredNotice
          description={
            message ??
            "Authenticate with an auditor persona to inspect compliance evidence streams."
          }
        />
      )}{" "}
      {status === "ready" && data && (
        <div className="mt-6 space-y-6">
          {" "}
          <div className="grid gap-4 sm:grid-cols-3">
            {" "}
            <SummaryCard
              title="Controls passing"
              value={data.summary.passing}
              description={`${data.summary.totalControls} total controls`}
              icon={<BadgeCheck className="h-5 w-5 text-emerald-200" />}
            />{" "}
            <SummaryCard
              title="Controls at risk"
              value={data.summary.attention + data.summary.failing}
              description={`${data.summary.failing} failing · ${data.summary.attention} attention`}
              icon={<AlertTriangle className="h-5 w-5 text-amber-200" />}
            />{" "}
            <SummaryCard
              title="Next evidence due"
              value={formatDate(data.summary.nextEvidenceDue)}
              description="Sync Argus binder before SLA"
              icon={<ClipboardList className="h-5 w-5 text-sky-200" />}
            />{" "}
          </div>{" "}
          <div className="grid gap-6 lg:grid-cols-2">
            {" "}
            <div className="rounded-xl border border-border/40 bg-surface/60 p-4">
              {" "}
              <p className="text-xs font-semibold uppercase tracking-[0.25em] text-muted-foreground">
                Framework coverage
              </p>{" "}
              <div className="mt-4 space-y-3 text-sm text-muted-foreground">
                {" "}
                {frameworkRows.map((row) => (
                  <div
                    key={row.framework}
                    className="rounded-lg border border-border/40 bg-surface-variant/50 p-4"
                  >
                    {" "}
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      {" "}
                      <p className="text-sm font-semibold text-foreground">
                        {FRAMEWORK_LABELS[row.framework]}
                      </p>{" "}
                      <span className="text-xs uppercase tracking-[0.25em] text-muted-foreground/70">
                        {" "}
                        Next evidence {formatDate(row.nextDueAt)}{" "}
                      </span>{" "}
                    </div>{" "}
                    <div className="mt-3 grid grid-cols-3 gap-2 text-xs uppercase tracking-[0.25em]">
                      {" "}
                      <StatusChip
                        label="Passing"
                        value={row.passing}
                        tone="emerald"
                      />{" "}
                      <StatusChip
                        label="Attention"
                        value={row.attention}
                        tone="amber"
                      />{" "}
                      <StatusChip
                        label="Failing"
                        value={row.failing}
                        tone="red"
                      />{" "}
                    </div>{" "}
                  </div>
                ))}{" "}
              </div>{" "}
            </div>{" "}
            <div className="rounded-xl border border-border/40 bg-surface/60 p-4">
              {" "}
              <p className="text-xs font-semibold uppercase tracking-[0.25em] text-muted-foreground">
                Automation queue
              </p>{" "}
              <ul className="mt-4 space-y-3 text-sm text-muted-foreground">
                {" "}
                {automations.map((item) => (
                  <li
                    key={item.controlId}
                    className="rounded-lg border border-border/40 bg-surface-variant/60 p-4"
                  >
                    {" "}
                    <div className="flex items-center justify-between gap-3">
                      {" "}
                      <div>
                        {" "}
                        <p className="text-sm font-semibold text-foreground">
                          {item.title}
                        </p>{" "}
                        <p className="mt-1 text-xs uppercase tracking-[0.25em] text-muted-foreground/70">
                          {" "}
                          {FRAMEWORK_LABELS[item.framework]} ·{" "}
                          {item.action}{" "}
                        </p>{" "}
                      </div>{" "}
                      <Workflow className="h-4 w-4 text-aurum-300" />{" "}
                    </div>{" "}
                    {item.zapierWorkflowId ? (
                      <p className="mt-2 text-xs text-muted-foreground/80">
                        Zapier workflow: {item.zapierWorkflowId}
                      </p>
                    ) : null}{" "}
                    {item.automationPlaybook ? (
                      <p className="text-xs text-muted-foreground/60">
                        Playbook: {item.automationPlaybook}
                      </p>
                    ) : null}{" "}
                  </li>
                ))}{" "}
                {automations.length === 0 ? (
                  <li className="rounded-lg border border-border/40 bg-surface-variant/60 p-4 text-xs text-muted-foreground/80">
                    {" "}
                    All workflows up to date.{" "}
                  </li>
                ) : null}{" "}
              </ul>{" "}
            </div>{" "}
          </div>{" "}
          <div className="grid gap-6 lg:grid-cols-[1.4fr_0.6fr]">
            {" "}
            <div className="rounded-xl border border-border/40 bg-surface/60 p-4">
              {" "}
              <p className="text-xs font-semibold uppercase tracking-[0.25em] text-muted-foreground">
                Controls needing intervention
              </p>{" "}
              <ul className="mt-4 space-y-3 text-sm text-muted-foreground">
                {" "}
                {breaches.map((breach) => (
                  <li
                    key={breach.controlId}
                    className="rounded-lg border border-border/40 bg-surface-variant/60 p-4"
                  >
                    {" "}
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      {" "}
                      <div>
                        {" "}
                        <p className="text-sm font-semibold text-foreground">
                          {breach.title}
                        </p>{" "}
                        <p className="mt-1 text-xs uppercase tracking-[0.25em] text-muted-foreground/70">
                          {" "}
                          {FRAMEWORK_LABELS[breach.framework]} · GL{" "}
                          {breach.glCodes.join(",")}{" "}
                        </p>{" "}
                      </div>{" "}
                      <span
                        className={cn(
                          "rounded-full border px-3 py-1 text-[0.65rem] font-semibold uppercase tracking-[0.25em]",
                          severityTone(breach.status),
                        )}
                      >
                        {" "}
                        {breach.status}{" "}
                      </span>{" "}
                    </div>{" "}
                    <p className="mt-3 text-xs text-muted-foreground/80">
                      {breach.variance}
                    </p>{" "}
                    <ul className="mt-3 space-y-1 text-xs text-muted-foreground/70">
                      {" "}
                      {breach.recommendedActions.map((action) => (
                        <li key={action}>• {action}</li>
                      ))}{" "}
                    </ul>{" "}
                  </li>
                ))}{" "}
                {breaches.length === 0 ? (
                  <li className="rounded-lg border border-border/40 bg-surface-variant/60 p-4 text-xs text-muted-foreground/80">
                    {" "}
                    No control breaches detected.{" "}
                  </li>
                ) : null}{" "}
              </ul>{" "}
            </div>{" "}
            <div className="rounded-xl border border-border/40 bg-surface/60 p-4">
              {" "}
              <p className="text-xs font-semibold uppercase tracking-[0.25em] text-muted-foreground">
                Upcoming evidence
              </p>{" "}
              <ul className="mt-4 space-y-3 text-sm text-muted-foreground">
                {" "}
                {upcoming.map((item) => (
                  <li
                    key={item.controlId}
                    className="rounded-lg border border-border/40 bg-surface-variant/60 p-4"
                  >
                    {" "}
                    <p className="text-sm font-semibold text-foreground">
                      {item.title}
                    </p>{" "}
                    <p className="mt-1 text-xs uppercase tracking-[0.25em] text-muted-foreground/70">
                      {" "}
                      {FRAMEWORK_LABELS[item.framework]} · Owner{" "}
                      {item.owner}{" "}
                    </p>{" "}
                    <p className="mt-2 text-xs text-muted-foreground/80">
                      Due {formatDate(item.nextDueAt)}
                    </p>{" "}
                    <p className="mt-2 truncate text-xs text-muted-foreground/60">
                      Evidence: {item.evidenceUri}
                    </p>{" "}
                  </li>
                ))}{" "}
                {upcoming.length === 0 ? (
                  <li className="rounded-lg border border-border/40 bg-surface-variant/60 p-4 text-xs text-muted-foreground/80">
                    {" "}
                    All evidence cycles satisfied.{" "}
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
  title,
  value,
  description,
  icon,
}: {
  title: string;
  value: string | number;
  description?: string;
  icon: React.ReactNode;
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
function StatusChip({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: "emerald" | "amber" | "red";
}) {
  const palette = {
    emerald: "border-emerald-400/40 bg-emerald-500/10 text-emerald-200",
    amber: "border-amber-400/40 bg-amber-500/10 text-amber-200",
    red: "border-red-500/40 bg-red-500/10 text-red-200",
  }[tone];
  return (
    <span
      className={cn(
        "rounded-full border px-3 py-1 text-[0.65rem] font-semibold uppercase tracking-[0.25em]",
        palette,
      )}
    >
      {" "}
      {label} {value}{" "}
    </span>
  );
}
function severityTone(status: ControlBreach["status"]) {
  switch (status) {
    case "failing":
      return "border-red-500/40 bg-red-500/10 text-red-200";
    case "attention":
      return "border-amber-400/40 bg-amber-500/10 text-amber-200";
    default:
      return "border-emerald-400/40 bg-emerald-500/10 text-emerald-200";
  }
}
function formatDate(value?: string) {
  if (!value) {
    return "n/a";
  }
  const date = new Date(value);
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}
