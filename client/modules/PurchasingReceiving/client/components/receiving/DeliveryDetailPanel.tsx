import { DeliveryStatusBadge } from "@/components/receiving/DeliveryStatusBadge";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type {
  DeliveryInternalOrderStatus,
  DeliveryPickup,
  DeliveryRecord,
  PickupStatus,
} from "@/data/receiving-deliveries";
import { format, parseISO } from "date-fns";
import {
  ClipboardCheck,
  ListChecks,
  PackageSearch,
  Phone,
  Truck,
} from "lucide-react";
interface DeliveryDetailPanelProps {
  delivery?: DeliveryRecord | null;
}
const internalOrderLabels: Record<DeliveryInternalOrderStatus, string> = {
  scheduled: "Scheduled",
  staged: "Staged",
  in_transit: "In transit",
  completed: "Completed",
};
const pickupLabels: Record<PickupStatus, string> = {
  pending: "Pending",
  loading: "Loading",
  completed: "Completed",
};
function formatTimestamp(value?: string | null, fallback = "—") {
  if (!value) return fallback;
  const date = parseISO(value);
  if (Number.isNaN(date.getTime())) return fallback;
  return `${format(date, "EEE, MMM d")} • ${format(date, "p")}`;
}
function formatTime(value?: string | null, fallback = "—") {
  if (!value) return fallback;
  const date = parseISO(value);
  if (Number.isNaN(date.getTime())) return fallback;
  return format(date, "p");
}
function renderPickupStatus(pickup: DeliveryPickup) {
  const base = "rounded-full px-3 py-0.5 text-xs font-medium";
  const color =
    pickup.status === "completed"
      ? "bg-emerald-100 text-emerald-900 dark:bg-emerald-950/60 dark:text-emerald-100"
      : pickup.status === "loading"
        ? "bg-amber-100 text-amber-900 dark:bg-amber-950/60 dark:text-amber-100"
        : "bg-slate-100 text-foreground dark:bg-slate-800";
  return (
    <span className={`${base} ${color}`}>{pickupLabels[pickup.status]}</span>
  );
}
export function DeliveryDetailPanel({ delivery }: DeliveryDetailPanelProps) {
  if (!delivery) {
    return (
      <Card className="flex h-full items-center justify-center p-12 text-center">
        {" "}
        <div className="space-y-2 text-sm text-muted-foreground">
          {" "}
          <Truck className="mx-auto h-12 w-12 text-muted-foreground/60" />{" "}
          <p>
            Select a delivery to review schedules, storeroom pulls, and pickups.
          </p>{" "}
        </div>{" "}
      </Card>
    );
  }
  return (
    <Card className="flex h-full flex-col">
      {" "}
      <CardHeader className="gap-2">
        {" "}
        <div className="flex items-start justify-between gap-4">
          {" "}
          <div className="space-y-1">
            {" "}
            <div className="flex flex-wrap items-center gap-2">
              {" "}
              <CardTitle className="text-xl font-semibold tracking-tight">
                {" "}
                {delivery.vendor}{" "}
              </CardTitle>{" "}
              <DeliveryStatusBadge status={delivery.status} />{" "}
            </div>{" "}
            <CardDescription className="text-base text-foreground/80">
              {" "}
              PO {delivery.poNumber} ��� {delivery.outlet.name} (
              {delivery.outlet.department}){" "}
            </CardDescription>{" "}
          </div>{" "}
          <Badge
            variant="outline"
            className="border-dashed uppercase tracking-wide"
          >
            {" "}
            {delivery.dock}{" "}
          </Badge>{" "}
        </div>{" "}
        <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
          {" "}
          <span>Carrier: {delivery.carrier ?? "Not provided"}</span>{" "}
          {delivery.contact ? (
            <span className="inline-flex items-center gap-1">
              {" "}
              <Phone className="h-3.5 w-3.5" /> {delivery.contact}{" "}
              {delivery.phone ? (
                <span className="text-muted-foreground/80">
                  ({delivery.phone})
                </span>
              ) : null}{" "}
            </span>
          ) : null}{" "}
        </div>{" "}
      </CardHeader>{" "}
      <CardContent className="flex-1 overflow-hidden px-0 pb-0">
        {" "}
        <ScrollArea className="h-[560px]">
          {" "}
          <div className="space-y-8 px-6 pb-6">
            {" "}
            <section className="space-y-4">
              {" "}
              <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                {" "}
                Schedule{" "}
              </h3>{" "}
              <div className="grid gap-4 md:grid-cols-2">
                {" "}
                <div className="space-y-1">
                  {" "}
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">
                    Appointment window
                  </p>{" "}
                  <p className="text-sm font-medium text-foreground">
                    {" "}
                    {formatTimestamp(delivery.scheduledWindow.start)}{" "}
                  </p>{" "}
                  <p className="text-xs text-muted-foreground">
                    Wrap by {formatTime(delivery.scheduledWindow.end)}
                  </p>{" "}
                </div>{" "}
                <div className="space-y-1">
                  {" "}
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">
                    ETA
                  </p>{" "}
                  <p className="text-sm font-medium text-foreground">
                    {formatTimestamp(delivery.eta)}
                  </p>{" "}
                  <p className="text-xs text-muted-foreground">
                    Last updated {formatTimestamp(delivery.updatedAt)}
                  </p>{" "}
                </div>{" "}
                <div className="space-y-1">
                  {" "}
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">
                    Outlet code
                  </p>{" "}
                  <p className="text-sm font-medium text-foreground">
                    {delivery.outlet.code ?? "—"}
                  </p>{" "}
                </div>{" "}
                <div className="space-y-1">
                  {" "}
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">
                    Created
                  </p>{" "}
                  <p className="text-sm font-medium text-foreground">
                    {formatTimestamp(delivery.createdAt)}
                  </p>{" "}
                </div>{" "}
              </div>{" "}
            </section>{" "}
            <Separator />{" "}
            <section className="space-y-4">
              {" "}
              <div className="flex items-center gap-2">
                {" "}
                <ListChecks className="h-4 w-4 text-muted-foreground" />{" "}
                <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                  {" "}
                  Storeroom & internal orders{" "}
                </h3>{" "}
              </div>{" "}
              {delivery.internalOrders.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No internal orders tied to this delivery.
                </p>
              ) : (
                <div className="space-y-3">
                  {" "}
                  {delivery.internalOrders.map((order) => (
                    <div
                      key={order.id}
                      className="rounded-lg border border-border/60 bg-muted/20 p-4"
                    >
                      {" "}
                      <div className="flex flex-wrap items-center justify-between gap-2 text-sm font-medium text-foreground">
                        {" "}
                        <span>
                          {" "}
                          {order.outlet} • {order.department}{" "}
                        </span>{" "}
                        <Badge
                          variant="outline"
                          className="border-transparent bg-background/60 text-xs"
                        >
                          {" "}
                          {internalOrderLabels[order.status]}{" "}
                        </Badge>{" "}
                      </div>{" "}
                      <p className="mt-1 text-xs text-muted-foreground">
                        {" "}
                        Scheduled {formatTimestamp(order.scheduledFor)}{" "}
                      </p>{" "}
                      <ul className="mt-3 space-y-1 text-xs text-muted-foreground">
                        {" "}
                        {order.items.map((item) => (
                          <li
                            key={`${order.id}-${item.name}`}
                            className="flex items-center justify-between"
                          >
                            {" "}
                            <span>{item.name}</span>{" "}
                            <span className="font-medium text-foreground">
                              {" "}
                              {item.qty} {item.unit}{" "}
                            </span>{" "}
                          </li>
                        ))}{" "}
                      </ul>{" "}
                    </div>
                  ))}{" "}
                </div>
              )}{" "}
            </section>{" "}
            <Separator />{" "}
            <section className="space-y-4">
              {" "}
              <div className="flex items-center gap-2">
                {" "}
                <PackageSearch className="h-4 w-4 text-muted-foreground" />{" "}
                <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                  {" "}
                  Pickups & returns{" "}
                </h3>{" "}
              </div>{" "}
              {delivery.pickups.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No pickups scheduled.
                </p>
              ) : (
                <div className="space-y-3">
                  {" "}
                  {delivery.pickups.map((pickup) => (
                    <div
                      key={pickup.id}
                      className="rounded-lg border border-border/60 bg-muted/10 p-3 text-sm"
                    >
                      {" "}
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        {" "}
                        <span className="font-medium text-foreground">
                          {pickup.description}
                        </span>{" "}
                        {renderPickupStatus(pickup)}{" "}
                      </div>{" "}
                      {pickup.readyBy ? (
                        <p className="mt-1 text-xs text-muted-foreground">
                          {" "}
                          Ready by {formatTimestamp(pickup.readyBy)}{" "}
                        </p>
                      ) : null}{" "}
                    </div>
                  ))}{" "}
                </div>
              )}{" "}
            </section>{" "}
            <Separator />{" "}
            <section className="space-y-4">
              {" "}
              <div className="flex items-center gap-2">
                {" "}
                <ClipboardCheck className="h-4 w-4 text-muted-foreground" />{" "}
                <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                  {" "}
                  Timeline{" "}
                </h3>{" "}
              </div>{" "}
              {delivery.timeline.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No timeline events recorded yet.
                </p>
              ) : (
                <ol className="relative space-y-4 border-l border-border/60 pl-4">
                  {" "}
                  {delivery.timeline.map((event) => (
                    <li
                      key={`${delivery.id}-${event.at}`}
                      className="relative space-y-1"
                    >
                      {" "}
                      <span className="absolute -left-[9px] top-1 h-2 w-2 rounded-full border border-background bg-primary" />{" "}
                      <p className="text-sm font-medium text-foreground">
                        {event.label}
                      </p>{" "}
                      <p className="text-xs text-muted-foreground">
                        {" "}
                        {formatTimestamp(event.at)}{" "}
                        {event.actor ? ` • ${event.actor}` : ""}{" "}
                      </p>{" "}
                      {event.note ? (
                        <p className="text-xs text-muted-foreground/80">
                          {event.note}
                        </p>
                      ) : null}{" "}
                    </li>
                  ))}{" "}
                </ol>
              )}{" "}
            </section>{" "}
            <Separator />{" "}
            <section className="space-y-4">
              {" "}
              <div className="flex items-center gap-2">
                {" "}
                <ClipboardCheck className="h-4 w-4 text-muted-foreground" />{" "}
                <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                  {" "}
                  Manifest & quality checks{" "}
                </h3>{" "}
              </div>{" "}
              <Table>
                {" "}
                <TableHeader>
                  {" "}
                  <TableRow>
                    {" "}
                    <TableHead className="w-[45%]">Item</TableHead>{" "}
                    <TableHead className="w-[15%] text-right">
                      Ordered
                    </TableHead>{" "}
                    <TableHead className="w-[15%] text-right">
                      Received
                    </TableHead>{" "}
                    <TableHead className="w-[10%] text-right">
                      Temp °F
                    </TableHead>{" "}
                    <TableHead>Notes</TableHead>{" "}
                  </TableRow>{" "}
                </TableHeader>{" "}
                <TableBody>
                  {" "}
                  {delivery.manifest.map((line) => (
                    <TableRow key={line.id}>
                      {" "}
                      <TableCell className="font-medium">
                        {line.productName}
                      </TableCell>{" "}
                      <TableCell className="text-right">
                        {" "}
                        {line.orderedQty} {line.unit}{" "}
                      </TableCell>{" "}
                      <TableCell className="text-right">
                        {" "}
                        {line.receivedQty ?? "—"}{" "}
                      </TableCell>{" "}
                      <TableCell className="text-right">
                        {" "}
                        {line.temperatureF != null
                          ? line.temperatureF.toFixed(1)
                          : "—"}{" "}
                      </TableCell>{" "}
                      <TableCell className="text-sm text-muted-foreground">
                        {" "}
                        {line.notes ?? ""}{" "}
                      </TableCell>{" "}
                    </TableRow>
                  ))}{" "}
                </TableBody>{" "}
              </Table>{" "}
            </section>{" "}
            {delivery.notes.length > 0 ? (
              <section className="space-y-3">
                {" "}
                <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                  {" "}
                  Notes & follow-ups{" "}
                </h3>{" "}
                <ul className="space-y-2 text-sm text-muted-foreground">
                  {" "}
                  {delivery.notes.map((note, index) => (
                    <li
                      key={`${delivery.id}-note-${index}`}
                      className="flex gap-2"
                    >
                      {" "}
                      <span className="mt-1 h-1.5 w-1.5 rounded-full bg-primary" />{" "}
                      <span>{note}</span>{" "}
                    </li>
                  ))}{" "}
                </ul>{" "}
              </section>
            ) : null}{" "}
          </div>{" "}
        </ScrollArea>{" "}
      </CardContent>{" "}
    </Card>
  );
}
