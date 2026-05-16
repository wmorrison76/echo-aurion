import { useMemo } from "react";
import { ShieldAlert, ShieldCheck, ShieldQuestion } from "lucide-react";
import { formatDistanceToNowStrict } from "date-fns";

import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

type AuditSeverity = "critical" | "high" | "medium" | "low";
type AuditStatus = "pass" | "fail" | "warning";

export interface PolicyAuditRecord {
  id: string;
  policyId: string;
  severity: AuditSeverity;
  status: AuditStatus;
  actor: string;
  timestamp: string;
  message: string;
  remediation?: string;
}

export interface PolicyAuditViewProps {
  audits?: PolicyAuditRecord[];
  targetPassRate?: number;
}

const DEFAULT_TARGET = 0.97;

const severityTone: Record<AuditSeverity, string> = {
  critical: "bg-destructive/10 text-destructive",
  high: "bg-orange-500/15 text-orange-500",
  medium: "bg-amber-400/15 text-amber-600",
  low: "bg-emerald-500/10 text-emerald-600",
};

const statusTone: Record<AuditStatus, string> = {
  pass: "bg-emerald-500/10 text-emerald-600",
  fail: "bg-destructive/10 text-destructive",
  warning: "bg-amber-400/15 text-amber-600",
};

const statusIcon: Record<AuditStatus, JSX.Element> = {
  pass: <ShieldCheck className="h-4 w-4" />,
  fail: <ShieldAlert className="h-4 w-4" />,
  warning: <ShieldQuestion className="h-4 w-4" />,
};

function calculateMetrics(audits: PolicyAuditRecord[]) {
  if (!audits.length) {
    return {
      passRate: 1,
      failing: 0,
      warnings: 0,
      recent: undefined as PolicyAuditRecord | undefined,
    };
  }

  const totals = audits.reduce(
    (acc, record) => {
      if (record.status === "pass") acc.pass += 1;
      if (record.status === "fail") acc.fail += 1;
      if (record.status === "warning") acc.warn += 1;
      return acc;
    },
    { pass: 0, fail: 0, warn: 0 },
  );

  const passRate = totals.pass / audits.length;
  const failing = totals.fail;
  const warnings = totals.warn;

  const recent = [...audits]
    .sort((a, b) => Date.parse(b.timestamp) - Date.parse(a.timestamp))[0];

  return { passRate, failing, warnings, recent };
}

export function PolicyAuditView({
  audits = [],
  targetPassRate = DEFAULT_TARGET,
}: PolicyAuditViewProps) {
  const metrics = useMemo(() => calculateMetrics(audits), [audits]);
  const percentage = Math.round(metrics.passRate * 100);
  const targetPercentage = Math.round(targetPassRate * 100);

  return (
    <Card className="h-full">
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <div>
            <CardTitle>Policy &amp; Audit Health</CardTitle>
            <CardDescription>
              Pass rate goal {targetPercentage}% · Showing {audits.length || 0} recent checks
            </CardDescription>
          </div>
          <Badge
            className={cn(
              "px-3 py-1 text-sm font-medium",
              metrics.passRate >= targetPassRate
                ? "bg-emerald-500/10 text-emerald-500"
                : "bg-amber-400/15 text-amber-600",
            )}
          >
            {percentage}% compliant
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <div>
          <Progress value={Math.min(percentage, 100)} className="h-2" />
          <p className="mt-2 text-sm text-muted-foreground">
            {metrics.passRate >= targetPassRate
              ? "Compliance trend is healthy. Keep reviewers in the loop for sustained performance."
              : "Compliance is below the target. Investigate the most recent warnings and failures."}
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <MetricTile
            label="Failing checks"
            value={metrics.failing}
            tone="text-destructive"
          />
          <MetricTile
            label="Warnings"
            value={metrics.warnings}
            tone="text-amber-600"
          />
          <MetricTile
            label="Last event"
            value={metrics.recent ? formatDistanceToNowStrict(new Date(metrics.recent.timestamp), { addSuffix: true }) : "Never"}
            tone="text-muted-foreground"
          />
        </div>

        <ScrollArea className="h-[260px] rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Policy</TableHead>
                <TableHead>Severity</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actor</TableHead>
                <TableHead>When</TableHead>
                <TableHead className="w-1/3">Details</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {audits.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground">
                    No audit events yet. Once guardrails run, they will appear here.
                  </TableCell>
                </TableRow>
              ) : (
                audits.map((record) => (
                  <TableRow key={record.id}>
                    <TableCell className="font-medium">{record.policyId}</TableCell>
                    <TableCell>
                      <Badge className={cn("capitalize", severityTone[record.severity])}>
                        {record.severity}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <span className="inline-flex items-center gap-2">
                        <Badge className={cn("capitalize", statusTone[record.status])}>{record.status}</Badge>
                        {statusIcon[record.status]}
                      </span>
                    </TableCell>
                    <TableCell>{record.actor}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatDistanceToNowStrict(new Date(record.timestamp), { addSuffix: true })}
                    </TableCell>
                    <TableCell>
                      <p className="text-sm text-muted-foreground">{record.message}</p>
                      {record.remediation ? (
                        <p className="mt-1 text-xs text-foreground">{record.remediation}</p>
                      ) : null}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
            <TableCaption>Guardrail events sourced from CI and runtime policy enforcement.</TableCaption>
          </Table>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}

function MetricTile({
  label,
  value,
  tone,
}: {
  label: string;
  value: number | string;
  tone?: string;
}) {
  return (
    <div className="rounded-lg border bg-muted/30 px-4 py-3">
      <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className={cn("mt-2 text-2xl font-semibold", tone)}>{value}</p>
    </div>
  );
}
