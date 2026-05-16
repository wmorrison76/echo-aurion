import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { DeliveryMetrics } from "@/data/receiving-deliveries";
import { cn } from "@/lib/utils";
import {
  AlertTriangle,
  ClipboardList,
  CalendarCheck,
  Truck,
} from "lucide-react";
import { format } from "date-fns";
interface DeliverySummaryCardsProps {
  metrics: DeliveryMetrics;
  referenceDate: Date;
  className?: string;
}
const ICON_STYLES = "h-10 w-10 rounded-full bg-muted p-2 text-muted-foreground";
export function DeliverySummaryCards({
  metrics,
  referenceDate,
  className,
}: DeliverySummaryCardsProps) {
  const followUps = metrics.internalOrdersPending + metrics.pickupsPending;
  const followUpsDetail = `${metrics.internalOrdersPending} storeroom orders • ${metrics.pickupsPending} pickups`;
  const enRouteCount = Math.max(metrics.active - metrics.inReceiving, 0);
  return (
    <div className={cn("grid gap-4 md:grid-cols-2 xl:grid-cols-4", className)}>
      {" "}
      <Card>
        {" "}
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          {" "}
          <div>
            {" "}
            <CardTitle className="text-base font-medium">
              Deliveries today
            </CardTitle>{" "}
            <CardDescription>
              {format(referenceDate, "EEE, MMM d")}
            </CardDescription>{" "}
          </div>{" "}
          <CalendarCheck className={ICON_STYLES} />{" "}
        </CardHeader>{" "}
        <CardContent>
          {" "}
          <div className="text-3xl font-semibold">
            {metrics.scheduledToday}
          </div>{" "}
          <p className="mt-2 text-sm text-muted-foreground">
            {metrics.total} scheduled across the board
          </p>{" "}
        </CardContent>{" "}
      </Card>{" "}
      <Card>
        {" "}
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          {" "}
          <div>
            {" "}
            <CardTitle className="text-base font-medium">
              Active on dock
            </CardTitle>{" "}
            <CardDescription>Arrived or in receiving</CardDescription>{" "}
          </div>{" "}
          <Truck className={ICON_STYLES} />{" "}
        </CardHeader>{" "}
        <CardContent>
          {" "}
          <div className="text-3xl font-semibold">
            {metrics.inReceiving}
          </div>{" "}
          <p className="mt-2 text-sm text-muted-foreground">
            {enRouteCount} en route or staging
          </p>{" "}
        </CardContent>{" "}
      </Card>{" "}
      <Card>
        {" "}
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          {" "}
          <div>
            {" "}
            <CardTitle className="text-base font-medium">
              Delayed or late
            </CardTitle>{" "}
            <CardDescription>Escalate with vendor</CardDescription>{" "}
          </div>{" "}
          <AlertTriangle className={ICON_STYLES} />{" "}
        </CardHeader>{" "}
        <CardContent>
          {" "}
          <div className="text-3xl font-semibold text-destructive">
            {metrics.delayed}
          </div>{" "}
          <p className="mt-2 text-sm text-muted-foreground">
            Review ETA updates and staffing pivots
          </p>{" "}
        </CardContent>{" "}
      </Card>{" "}
      <Card>
        {" "}
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          {" "}
          <div>
            {" "}
            <CardTitle className="text-base font-medium">
              Open follow-ups
            </CardTitle>{" "}
            <CardDescription>{followUpsDetail}</CardDescription>{" "}
          </div>{" "}
          <ClipboardList className={ICON_STYLES} />{" "}
        </CardHeader>{" "}
        <CardContent>
          {" "}
          <div className="text-3xl font-semibold">{followUps}</div>{" "}
          <p className="mt-2 text-sm text-muted-foreground">
            Close loops before nightly reconciliation
          </p>{" "}
        </CardContent>{" "}
      </Card>{" "}
    </div>
  );
}
