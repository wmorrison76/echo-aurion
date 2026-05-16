import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { formatDistanceToNow } from "date-fns";
export interface InventoryFlagRow {
  id: string;
  itemName: string;
  outletName: string | null;
  severity: "info" | "warning" | "critical";
  message: string;
  expectedQty?: number | null;
  actualQty?: number | null;
  variancePct?: number | null;
  lastTriggeredAt: string;
}
interface InventoryFlagsWidgetProps {
  flags: InventoryFlagRow[];
}
const severityStyles: Record<
  InventoryFlagRow["severity"],
  { badge: string; label: string }
> = {
  critical: { badge: "bg-red-500/20 text-red-200", label: "Critical" },
  warning: { badge: "bg-amber-400/20 text-amber-200", label: "Warning" },
  info: { badge: "bg-sky-500/20 text-sky-200", label: "Monitor" },
};
const computeVarianceProgress = (variancePct?: number | null) => {
  if (variancePct == null || Number.isNaN(variancePct)) return 0;
  const clamped = Math.min(Math.abs(variancePct), 100);
  return clamped;
};
export function InventoryFlagsWidget({ flags }: InventoryFlagsWidgetProps) {
  if (!flags.length) {
    return (
      <div className="rounded-lg border border-slate-800/60 bg-surface p-4 text-sm text-emerald-300">
        {" "}
        Inventory AI audit is clean. No open variances detected across monitored
        outlets.{" "}
      </div>
    );
  }
  return (
    <div className="space-y-4">
      {" "}
      {flags.map((flag) => {
        const severity = severityStyles[flag.severity];
        const delta =
          flag.expectedQty != null && flag.actualQty != null
            ? flag.actualQty - flag.expectedQty
            : null;
        return (
          <div
            key={flag.id}
            className="rounded-xl border border-slate-800/70 bg-card p-4 shadow-inner shadow-slate-950/40"
          >
            {" "}
            <div className="flex flex-wrap items-center justify-between gap-3">
              {" "}
              <div>
                {" "}
                <p className="text-xs uppercase tracking-[0.25em] text-muted-foreground">
                  {flag.outletName ?? "Unassigned outlet"}
                </p>{" "}
                <h3 className="text-sm font-semibold text-slate-100">
                  {flag.itemName}
                </h3>{" "}
              </div>{" "}
              <Badge
                className={`rounded-full px-3 py-1 text-xs uppercase tracking-wide ${severity.badge}`}
              >
                {" "}
                {severity.label}{" "}
              </Badge>{" "}
            </div>{" "}
            <p className="mt-2 text-sm text-slate-300">{flag.message}</p>{" "}
            <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-slate-400">
              {" "}
              {flag.expectedQty != null ? (
                <span>Par {flag.expectedQty.toLocaleString()}</span>
              ) : null}{" "}
              {flag.actualQty != null ? (
                <span>On hand {flag.actualQty.toLocaleString()}</span>
              ) : null}{" "}
              {delta != null ? (
                <span
                  className={delta < 0 ? "text-red-300" : "text-emerald-300"}
                >
                  {" "}
                  Delta {delta > 0 ? "+" : ""} {delta.toLocaleString()}{" "}
                </span>
              ) : null}{" "}
              <span>
                {formatDistanceToNow(new Date(flag.lastTriggeredAt), {
                  addSuffix: true,
                })}
              </span>{" "}
            </div>{" "}
            {flag.variancePct != null ? (
              <div className="mt-3 space-y-1">
                {" "}
                <div className="flex items-center justify-between text-xs text-slate-400">
                  {" "}
                  <span>Variance impact</span>{" "}
                  <span className="font-semibold text-slate-200">
                    {flag.variancePct.toFixed(1)}%
                  </span>{" "}
                </div>{" "}
                <Progress
                  value={computeVarianceProgress(flag.variancePct)}
                  className="h-2"
                />{" "}
              </div>
            ) : null}{" "}
          </div>
        );
      })}{" "}
    </div>
  );
}
