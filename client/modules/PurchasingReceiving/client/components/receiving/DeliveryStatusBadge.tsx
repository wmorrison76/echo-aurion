import { Badge } from "@/components/ui/badge";
import type { DeliveryStatus } from "@/data/receiving-deliveries";
import { cn } from "@/lib/utils";
const statusStyles: Record<
  DeliveryStatus,
  { label: string; className: string }
> = {
  scheduled: {
    label: "Scheduled",
    className:
      "border-transparent bg-slate-100 text-foreground dark:bg-slate-500/10",
  },
  enroute: {
    label: "En route",
    className:
      "border-transparent bg-blue-100 text-blue-700 dark:bg-primary/10 dark:text-primary",
  },
  arrived: {
    label: "Arrived",
    className:
      "border-transparent bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300",
  },
  receiving: {
    label: "Receiving",
    className:
      "border-transparent bg-amber-100 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300",
  },
  completed: {
    label: "Completed",
    className:
      "border-transparent bg-emerald-500/10 text-emerald-400 dark:bg-emerald-500/20",
  },
  delayed: {
    label: "Delayed",
    className:
      "border-transparent bg-red-100 text-red-700 dark:bg-red-500/10 dark:text-red-300",
  },
};
interface DeliveryStatusBadgeProps {
  status: DeliveryStatus;
  className?: string;
}
export function DeliveryStatusBadge({
  status,
  className,
}: DeliveryStatusBadgeProps) {
  const style = statusStyles[status];
  return (
    <Badge
      variant="outline"
      className={cn(
        "whitespace-nowrap border px-2 py-0.5 text-xs font-medium",
        style.className,
        className,
      )}
    >
      {" "}
      {style.label}{" "}
    </Badge>
  );
}
