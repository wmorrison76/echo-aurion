import React from "react";
import { useNavigate } from "react-router-dom";

import { AppLayout } from "@/components/AppLayout";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useMultiOutlet } from "@/context/MultiOutletContext";
import { useAuth } from "@/context/AuthContext";
import {
  generateDeliveries,
  type DeliveryRecord,
} from "@/data/receiving-deliveries";
import { emitTrace } from "@/lib/trace-emitter";

import {
  differenceInMinutes,
  format,
  isPast,
  isToday,
  isTomorrow,
  parseISO,
} from "date-fns";
import {
  AlertCircle,
  CheckCircle2,
  Clock,
  Package,
  Thermometer,
  Truck,
  UtensilsCrossed,
} from "lucide-react";

import { useDashboardOrderIntegration } from "../../integrations/dashboard-integration";

function getStatusColor(status: string) {
  switch (status) {
    case "arrived":
    case "completed":
      return "bg-green-500/10 text-green-700 border-green-200/30";
    case "enroute":
      return "bg-primary/10 text-blue-700 border-blue-200/30";
    case "receiving":
      return "bg-amber-500/10 text-amber-700 border-amber-200/30";
    case "delayed":
      return "bg-red-500/10 text-red-700 border-red-200/30";
    case "scheduled":
    default:
      return "bg-slate-500/10 text-foreground border-slate-200/30";
  }
}

function getStatusIcon(status: string) {
  switch (status) {
    case "arrived":
    case "completed":
      return <CheckCircle2 className="h-4 w-4" />;
    case "enroute":
      return <Truck className="h-4 w-4" />;
    case "receiving":
      return <Package className="h-4 w-4" />;
    case "delayed":
      return <AlertCircle className="h-4 w-4" />;
    case "scheduled":
    default:
      return <Clock className="h-4 w-4" />;
  }
}

export default function OnTheDock() {
  const navigate = useNavigate();
  const { currentOutlet } = useMultiOutlet();
  const { user, organization } = useAuth();
  const dashboardIntegration = useDashboardOrderIntegration();
  const { publishDeliveryArrived } = dashboardIntegration || {};

  const deliveries = React.useMemo(() => generateDeliveries(), []);
  const outletDeliveries = React.useMemo(
    () =>
      currentOutlet
        ? deliveries.filter((d) => d.outlet.id === currentOutlet.id)
        : deliveries,
    [deliveries, currentOutlet],
  );

  const categorized = React.useMemo(() => {
    const urgent = outletDeliveries.filter(
      (d) =>
        (d.status === "delayed" || d.status === "arrived") &&
        (d.tags.includes("shortage") || d.tags.includes("quality_issue")),
    );
    const arrived = outletDeliveries.filter((d) => d.status === "arrived");
    const receiving = outletDeliveries.filter((d) => d.status === "receiving");
    const enroute = outletDeliveries.filter(
      (d) => d.status === "enroute" && d.eta && !isPast(parseISO(d.eta)),
    );
    const overdue = outletDeliveries.filter(
      (d) =>
        d.status === "delayed" ||
        (d.status === "scheduled" && isPast(parseISO(d.scheduledWindow.end))),
    );
    const scheduled = outletDeliveries.filter(
      (d) =>
        d.status === "scheduled" && !isPast(parseISO(d.scheduledWindow.end)),
    );

    return { urgent, arrived, receiving, enroute, overdue, scheduled };
  }, [outletDeliveries]);

  const metrics = React.useMemo(() => {
    return {
      totalArrived: categorized.arrived.length,
      totalEnroute: categorized.enroute.length,
      totalReceiving: categorized.receiving.length,
      totalOverdue: categorized.overdue.length,
      urgentIssues: categorized.urgent.length,
      pendingPickups: outletDeliveries.reduce(
        (sum, d) =>
          sum + d.pickups.filter((p) => p.status === "pending").length,
        0,
      ),
      internalOrdersPending: outletDeliveries.reduce(
        (sum, d) =>
          sum +
          d.internalOrders.filter((io) => io.status !== "completed").length,
        0,
      ),
    };
  }, [categorized, outletDeliveries]);

  const [activeTab, setActiveTab] =
    React.useState<keyof typeof categorized>("urgent");
  const [selectedDelivery, setSelectedDelivery] =
    React.useState<DeliveryRecord | null>(null);

  const list = categorized[activeTab] ?? [];

  const DeliveryCard = ({ delivery }: { delivery: DeliveryRecord }) => {
    const eta = delivery.eta ? parseISO(delivery.eta) : null;
    const overdue = eta ? isPast(eta) : false;
    const minutesUntil = eta ? differenceInMinutes(eta, new Date()) : null;

    const etaLabel =
      eta && !Number.isNaN(eta.getTime())
        ? isToday(eta)
          ? format(eta, "HH:mm")
          : isTomorrow(eta)
            ? `Tomorrow ${format(eta, "HH:mm")}`
            : format(eta, "MMM d HH:mm")
        : null;

    return (
      <div
        onClick={() => setSelectedDelivery(delivery)}
        className="p-4 border border-border rounded-lg hover:border-slate-500 cursor-pointer transition-colors space-y-3 bg-surface"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3 flex-1">
            <div
              className={`p-2 rounded-lg ${getStatusColor(delivery.status)}`}
            >
              {getStatusIcon(delivery.status)}
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <h3 className="font-semibold">{delivery.vendor}</h3>
                <Badge
                  variant="outline"
                  className={getStatusColor(delivery.status)}
                >
                  {delivery.status}
                </Badge>
              </div>
              <p className="text-sm text-slate-400">PO: {delivery.poNumber}</p>
            </div>
          </div>
          {overdue ? (
            <Badge variant="destructive" className="ml-2">
              OVERDUE
            </Badge>
          ) : null}
        </div>

        <div className="grid grid-cols-2 gap-2 text-xs">
          <div>
            <p className="text-slate-400">Dock</p>
            <p className="text-slate-200">{delivery.dock}</p>
          </div>
          {etaLabel ? (
            <div>
              <p className="text-slate-400">ETA</p>
              <p className={overdue ? "text-red-400" : "text-slate-200"}>
                {etaLabel}
                {minutesUntil !== null && minutesUntil > 0 ? (
                  <span className="text-slate-400"> ({minutesUntil}m)</span>
                ) : null}
              </p>
            </div>
          ) : null}
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Thermometer className="h-3 w-3 text-slate-400" />
            <span className="text-xs text-slate-400">
              {delivery.manifest.length} items
            </span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              navigate(`/culinary?deliveryId=${delivery.id}`);
            }}
            className="h-6 px-2 text-xs"
          >
            <UtensilsCrossed className="h-3 w-3 mr-1" />
            Recipes
          </Button>
        </div>

        {delivery.tags.length > 0 ? (
          <div className="flex flex-wrap gap-1">
            {delivery.tags.map((tag) => (
              <Badge key={tag} variant="secondary" className="text-xs">
                {tag.replace(/_/g, " ")}
              </Badge>
            ))}
          </div>
        ) : null}
      </div>
    );
  };

  const DeliveryDetails = ({ delivery }: { delivery: DeliveryRecord }) => {
    const eta = delivery.eta ? parseISO(delivery.eta) : null;
    return (
      <div className="space-y-4">
        <Card className="border-border bg-surface">
          <CardHeader>
            <CardTitle className="text-lg">{delivery.vendor}</CardTitle>
            <CardDescription>
              PO {delivery.poNumber} • {delivery.outlet.name}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap items-center gap-2">
              <Badge className={getStatusColor(delivery.status)}>
                {delivery.status}
              </Badge>
              <Badge variant="outline">{delivery.dock}</Badge>
              {eta ? (
                <Badge variant="secondary">
                  ETA{" "}
                  {isToday(eta)
                    ? format(eta, "HH:mm")
                    : format(eta, "MMM d HH:mm")}
                </Badge>
              ) : null}
              {delivery.carrier ? (
                <Badge variant="outline">Carrier: {delivery.carrier}</Badge>
              ) : null}
            </div>
          </CardContent>
        </Card>

        {delivery.tags.includes("quality_issue") ||
        delivery.tags.includes("shortage") ? (
          <Alert>
            <AlertDescription>
              This delivery is flagged for{" "}
              {delivery.tags.includes("shortage")
                ? "shortage"
                : "quality issue"}
              . Review manifest before closing.
            </AlertDescription>
          </Alert>
        ) : null}

        <Card className="border-border bg-surface">
          <CardHeader>
            <CardTitle className="text-base">Manifest</CardTitle>
            <CardDescription>{delivery.manifest.length} items</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="text-slate-300">Product</TableHead>
                  <TableHead className="text-right text-slate-300">
                    Ordered
                  </TableHead>
                  <TableHead className="text-right text-slate-300">
                    Received
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {delivery.manifest.map((item) => (
                  <TableRow key={item.id} className="hover:bg-slate-800/30">
                    <TableCell>
                      <div>
                        <p className="font-medium">{item.productName}</p>
                        {item.notes ? (
                          <p className="text-xs text-slate-400">{item.notes}</p>
                        ) : null}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      {item.orderedQty} {item.unit}
                    </TableCell>
                    <TableCell className="text-right">
                      {item.receivedQty !== undefined &&
                      item.receivedQty !== null ? (
                        <span
                          className={
                            item.receivedQty === item.orderedQty
                              ? "text-green-400"
                              : item.receivedQty > item.orderedQty
                                ? "text-yellow-400"
                                : "text-red-400"
                          }
                        >
                          {item.receivedQty} {item.unit}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <div className="flex gap-2 justify-end">
          <Button
            variant="outline"
            onClick={() =>
              window.dispatchEvent(
                new CustomEvent("open-panel", {
                  detail: { id: "inventory", outletId: delivery.outlet?.id },
                }),
              )
            }
            title="View inventory for this outlet"
          >
            Open in Inventory
          </Button>
          <Button
            variant="outline"
            onClick={async () => {
              const payload = {
                orderId: delivery.id,
                poNumber: delivery.poNumber,
                vendor: delivery.vendor,
                outletId: delivery.outlet?.id,
              };

              publishDeliveryArrived?.(payload);

              await emitTrace(
                "delivery",
                delivery.id,
                "purchasing-receiving",
                "receiving",
                {
                  action: "delivery_arrived",
                  ...payload,
                },
                {
                  status: "arrived",
                },
                {
                  sourceRef: delivery.poNumber,
                  userId: user?.id,
                  role: user?.role,
                  orgId: user?.org_id || organization?.id,
                },
              );

              alert("Wire receiving workflow confirmation");
            }}
          >
            Mark Arrived
          </Button>
          <Button
            onClick={() =>
              navigate(`/purchasingreceiving?deliveryId=${delivery.id}`)
            }
          >
            Open Receiving
          </Button>
        </div>
      </div>
    );
  };

  return (
    <AppLayout>
      <div className="p-4 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-xl font-semibold">On The Dock</div>
            <div className="text-sm text-muted-foreground">
              Inbound deliveries and receiving workflow
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-7 gap-3">
          <MetricCard label="Arrived" value={metrics.totalArrived} />
          <MetricCard label="Enroute" value={metrics.totalEnroute} />
          <MetricCard label="Receiving" value={metrics.totalReceiving} />
          <MetricCard
            label="Overdue"
            value={metrics.totalOverdue}
            tone={metrics.totalOverdue > 0 ? "bad" : "neutral"}
          />
          <MetricCard
            label="Urgent"
            value={metrics.urgentIssues}
            tone={metrics.urgentIssues > 0 ? "bad" : "neutral"}
          />
          <MetricCard label="Pickups" value={metrics.pendingPickups} />
          <MetricCard
            label="Internal Orders"
            value={metrics.internalOrdersPending}
          />
        </div>

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
          <TabsList>
            <TabsTrigger value="urgent">Urgent</TabsTrigger>
            <TabsTrigger value="arrived">Arrived</TabsTrigger>
            <TabsTrigger value="receiving">Receiving</TabsTrigger>
            <TabsTrigger value="enroute">Enroute</TabsTrigger>
            <TabsTrigger value="scheduled">Scheduled</TabsTrigger>
            <TabsTrigger value="overdue">Overdue</TabsTrigger>
          </TabsList>

          <div className="grid grid-cols-1 lg:grid-cols-[420px_1fr] gap-4 mt-4">
            <TabsContent value={activeTab} className="m-0">
              <Card className="border-border bg-surface">
                <CardHeader>
                  <CardTitle className="text-base">Deliveries</CardTitle>
                  <CardDescription>{list.length} in this view</CardDescription>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[70vh] pr-3">
                    <div className="space-y-3">
                      {list.map((d) => (
                        <DeliveryCard key={d.id} delivery={d} />
                      ))}
                      {list.length === 0 ? (
                        <div className="text-sm text-muted-foreground py-10 text-center">
                          No deliveries.
                        </div>
                      ) : null}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>
            </TabsContent>

            <div>
              {selectedDelivery ? (
                <DeliveryDetails delivery={selectedDelivery} />
              ) : (
                <Card className="border-border bg-surface">
                  <CardHeader>
                    <CardTitle className="text-base">
                      Select a delivery
                    </CardTitle>
                    <CardDescription>
                      Click a delivery to see manifest details and actions
                    </CardDescription>
                  </CardHeader>
                  <CardContent />
                </Card>
              )}
            </div>
          </div>
        </Tabs>
      </div>
    </AppLayout>
  );
}

function MetricCard({
  label,
  value,
  tone = "neutral",
}: {
  label: string;
  value: number;
  tone?: "neutral" | "bad";
}) {
  return (
    <Card className="border-border bg-surface">
      <CardContent className="p-3">
        <div className="text-xs text-muted-foreground">{label}</div>
        <div
          className={`text-2xl font-bold ${tone === "bad" ? "text-red-500" : ""}`}
        >
          {value}
        </div>
      </CardContent>
    </Card>
  );
}
