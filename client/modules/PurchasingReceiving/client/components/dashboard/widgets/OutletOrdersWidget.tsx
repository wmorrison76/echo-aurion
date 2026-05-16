import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
export interface OutletOrderSummary {
  outletId: string;
  outletName: string;
  department: string;
  totalDeliveries: number;
  delayedDeliveries: number;
  activeDeliveries: number;
  internalOrders: number;
  lastUpdated: string;
  entries: {
    id: string;
    vendor: string;
    poNumber: string;
    status: string;
    dock: string;
    eta?: string | null;
    scheduledWindow?: { start: string; end: string } | null;
    tags: string[];
  }[];
}
interface OutletOrdersWidgetProps {
  summaries: OutletOrderSummary[];
}
const statusVariants: Record<
  string,
  {
    label: string;
    variant: "default" | "secondary" | "outline" | "destructive";
    description: string;
  }
> = {
  receiving: {
    label: "Receiving",
    variant: "default",
    description: "Currently being processed",
  },
  arrived: {
    label: "Arrived",
    variant: "secondary",
    description: "Checked in and staged",
  },
  enroute: {
    label: "En Route",
    variant: "outline",
    description: "Inbound and tracking",
  },
  delayed: {
    label: "Delayed",
    variant: "destructive",
    description: "Vendor delay escalated",
  },
  scheduled: {
    label: "Scheduled",
    variant: "outline",
    description: "Window confirmed",
  },
  completed: {
    label: "Completed",
    variant: "secondary",
    description: "Closed out",
  },
};
const formatEta = (eta?: string | null) => {
  if (!eta) return "ETA pending";
  try {
    return format(new Date(eta), "MMM d • h:mm a");
  } catch {
    return eta;
  }
};
const formatWindow = (window?: { start: string; end: string } | null) => {
  if (!window) return null;
  try {
    const start = format(new Date(window.start), "h:mm a");
    const end = format(new Date(window.end), "h:mm a");
    return `${start} – ${end}`;
  } catch {
    return null;
  }
};
export function OutletOrdersWidget({ summaries }: OutletOrdersWidgetProps) {
  if (!summaries.length) {
    return (
      <p className="text-sm text-muted-foreground">
        No open deliveries for the selected outlets.
      </p>
    );
  }
  return (
    <div className="space-y-4">
      {" "}
      {summaries.map((summary) => (
        <div
          key={summary.outletId}
          className="rounded-xl border border-slate-800/70 bg-surface p-4 shadow-inner shadow-slate-950/30"
        >
          {" "}
          <div className="flex flex-wrap items-center justify-between gap-3">
            {" "}
            <div>
              {" "}
              <p className="text-xs uppercase tracking-[0.2em] text-slate-400">
                {summary.department}
              </p>{" "}
              <h3 className="text-lg font-semibold text-slate-100">
                {summary.outletName}
              </h3>{" "}
              <p className="text-xs text-slate-400">
                {" "}
                {summary.totalDeliveries.toLocaleString()} deliveries in flight
                · {summary.internalOrders.toLocaleString()} internal pulls{" "}
              </p>{" "}
            </div>{" "}
            <div className="flex flex-wrap items-center gap-2">
              {" "}
              <Badge
                variant="default"
                className="rounded-full px-3 py-1 text-xs"
              >
                {" "}
                Active {summary.activeDeliveries.toLocaleString()}{" "}
              </Badge>{" "}
              <Badge
                variant={
                  summary.delayedDeliveries ? "destructive" : "secondary"
                }
                className={cn(
                  "rounded-full px-3 py-1 text-xs",
                  !summary.delayedDeliveries &&
                    "bg-emerald-500/20 text-emerald-200",
                )}
              >
                {" "}
                Delayed {summary.delayedDeliveries.toLocaleString()}{" "}
              </Badge>{" "}
              <span className="text-[0.7rem] uppercase tracking-[0.3em] text-muted-foreground">
                {" "}
                Updated{" "}
                {format(new Date(summary.lastUpdated), "MMM d, h:mm a")}{" "}
              </span>{" "}
            </div>{" "}
          </div>{" "}
          <ScrollArea className="mt-4 max-h-72 pr-2">
            {" "}
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {" "}
              {summary.entries.map((entry) => {
                const variant =
                  statusVariants[entry.status] ?? statusVariants.scheduled;
                const deliveryWindow = formatWindow(
                  entry.scheduledWindow ?? null,
                );
                return (
                  <div
                    key={entry.id}
                    className="flex flex-col gap-2 rounded-lg border border-slate-800/80 bg-card p-3"
                  >
                    {" "}
                    <div className="flex items-center justify-between gap-2">
                      {" "}
                      <div>
                        {" "}
                        <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
                          {entry.vendor}
                        </p>{" "}
                        <p className="text-sm font-medium text-slate-100">
                          PO {entry.poNumber}
                        </p>{" "}
                      </div>{" "}
                      <Badge
                        variant={variant.variant}
                        className="whitespace-nowrap bg-slate-800/60 text-xs uppercase tracking-wide"
                      >
                        {" "}
                        {variant.label}{" "}
                      </Badge>{" "}
                    </div>{" "}
                    <div className="text-xs text-slate-400">
                      {" "}
                      <p className="font-medium text-slate-300">
                        Dock {entry.dock}
                      </p>{" "}
                      <p>{formatEta(entry.eta)}</p>{" "}
                      {deliveryWindow ? (
                        <p>Window {deliveryWindow}</p>
                      ) : null}{" "}
                    </div>{" "}
                    <div className="flex flex-wrap gap-1">
                      {" "}
                      {entry.tags.map((tag) => (
                        <Badge
                          key={tag}
                          variant="outline"
                          className="rounded-md border-border bg-surface text-[0.65rem] uppercase tracking-[0.2em] text-slate-400"
                        >
                          {" "}
                          {tag}{" "}
                        </Badge>
                      ))}{" "}
                    </div>{" "}
                    <p className="text-[0.7rem] text-muted-foreground">
                      {variant.description}
                    </p>{" "}
                  </div>
                );
              })}{" "}
            </div>{" "}
          </ScrollArea>{" "}
        </div>
      ))}{" "}
    </div>
  );
}
