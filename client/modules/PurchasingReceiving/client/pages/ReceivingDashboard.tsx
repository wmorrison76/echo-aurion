import React, { useMemo, useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import { useMultiOutlet } from "@/context/MultiOutletContext";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Truck,
  CheckCircle2,
  AlertTriangle,
  Package,
  Barcode,
  Thermometer,
  Clock,
} from "lucide-react";
import { format, parseISO } from "date-fns";
import StorageWalkthrough3D from "@/modules/OrderingInventory/client/components/storage/StorageWalkthrough3D";

const MOCK_DELIVERIES = [
  {
    id: "del-1",
    po_number: "PO-24001",
    vendor_name: "US Foods",
    status: "received",
    scheduled_date: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(),
    arrived_at: new Date(Date.now() - 55 * 60 * 1000).toISOString(),
    items_count: 12,
    items_received: 12,
    items_short: 0,
    shortage_items: [],
    total_cost: 5250.0,
    signature_required: true,
    signed_by: "John Warehouse",
    notes: "All items received in good condition",
    images_count: 3,
  },
  {
    id: "del-2",
    po_number: "PO-24002",
    vendor_name: "Sysco",
    status: "in_receiving",
    scheduled_date: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
    arrived_at: new Date(Date.now() - 25 * 60 * 1000).toISOString(),
    items_count: 18,
    items_received: 14,
    items_short: 4,
    shortage_items: [
      { product_name: "Ribeye Steak", ordered: 50, received: 45, unit: "lbs" },
      {
        product_name: "Chicken Breast",
        ordered: 100,
        received: 90,
        unit: "lbs",
      },
    ],
    total_cost: 8750.0,
    signature_required: true,
    signed_by: null,
    notes: "Scanning in progress, some items short",
    images_count: 5,
  },
  {
    id: "del-3",
    po_number: "PO-24003",
    vendor_name: "Local Produce Co",
    status: "scheduled",
    scheduled_date: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
    arrived_at: null,
    items_count: 5,
    items_received: 0,
    items_short: 0,
    shortage_items: [],
    total_cost: 450.0,
    signature_required: false,
    signed_by: null,
    notes: "Scheduled for pickup",
    images_count: 0,
  },
  {
    id: "del-4",
    po_number: "PO-24004",
    vendor_name: "US Foods",
    status: "quality_issue",
    scheduled_date: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
    arrived_at: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
    items_count: 25,
    items_received: 25,
    items_short: 0,
    shortage_items: [],
    total_cost: 12500.0,
    signature_required: true,
    signed_by: "Sarah Manager",
    notes: "Freezer malfunction - temperature issue detected",
    images_count: 8,
    temperature_issue: { item: "Frozen Foods", temp_f: 42, required_temp: 0 },
  },
];

const getStatusColor = (status: string) => {
  switch (status) {
    case "received":
      return "bg-green-500/10 text-green-700 border-green-200/30";
    case "in_receiving":
      return "bg-primary/10 text-blue-700 border-blue-200/30";
    case "scheduled":
      return "bg-slate-500/10 text-foreground border-slate-200/30";
    case "quality_issue":
      return "bg-red-500/10 text-red-700 border-red-200/30";
    default:
      return "bg-slate-500/10 text-foreground border-slate-200/30";
  }
};

const getStatusIcon = (status: string) => {
  switch (status) {
    case "received":
      return <CheckCircle2 className="h-4 w-4" />;
    case "in_receiving":
      return <Barcode className="h-4 w-4" />;
    case "scheduled":
      return <Clock className="h-4 w-4" />;
    case "quality_issue":
      return <AlertTriangle className="h-4 w-4" />;
    default:
      return <Package className="h-4 w-4" />;
  }
};

export default function ReceivingDashboard() {
  const { currentOutlet } = useMultiOutlet();
  const [selectedDelivery, setSelectedDelivery] = useState<
    (typeof MOCK_DELIVERIES)[0] | null
  >(null);
  const [filterStatus, setFilterStatus] = useState<string>("all");

  const filteredDeliveries = useMemo(() => {
    return MOCK_DELIVERIES.filter((d) => {
      if (filterStatus === "all") return true;
      return d.status === filterStatus;
    });
  }, [filterStatus]);

  const metrics = useMemo(() => {
    return {
      today_received: MOCK_DELIVERIES.filter((d) => d.status === "received")
        .length,
      in_progress: MOCK_DELIVERIES.filter((d) => d.status === "in_receiving")
        .length,
      quality_issues: MOCK_DELIVERIES.filter(
        (d) => d.status === "quality_issue",
      ).length,
      shortages: MOCK_DELIVERIES.reduce((sum, d) => sum + d.items_short, 0),
      total_cost: MOCK_DELIVERIES.reduce((sum, d) => sum + d.total_cost, 0),
    };
  }, []);

  const outletId = (currentOutlet as any)?.id || "";

  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Truck className="h-8 w-8" />
            Receiving Operations
          </h1>
          <p className="text-slate-400 mt-2">
            Track incoming deliveries, scan items, and manage inventory receipts
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-5">
          <Card className="border-border bg-gradient-to-br from-green-500/5 to-green-500/0">
            <CardContent className="pt-6">
              <div>
                <p className="text-sm text-slate-400">Today Received</p>
                <p className="text-3xl font-bold text-green-400">
                  {metrics.today_received}
                </p>
              </div>
            </CardContent>
          </Card>
          <Card className="border-border bg-gradient-to-br from-blue-500/5 to-blue-500/0">
            <CardContent className="pt-6">
              <div>
                <p className="text-sm text-slate-400">In Progress</p>
                <p className="text-3xl font-bold text-blue-400">
                  {metrics.in_progress}
                </p>
              </div>
            </CardContent>
          </Card>
          <Card className="border-border bg-gradient-to-br from-red-500/5 to-red-500/0">
            <CardContent className="pt-6">
              <div>
                <p className="text-sm text-slate-400">Quality Issues</p>
                <p className="text-3xl font-bold text-red-400">
                  {metrics.quality_issues}
                </p>
              </div>
            </CardContent>
          </Card>
          <Card className="border-border bg-gradient-to-br from-amber-500/5 to-amber-500/0">
            <CardContent className="pt-6">
              <div>
                <p className="text-sm text-slate-400">Items Short</p>
                <p className="text-3xl font-bold text-amber-400">
                  {metrics.shortages}
                </p>
              </div>
            </CardContent>
          </Card>
          <Card className="border-border bg-surface">
            <CardContent className="pt-6">
              <div>
                <p className="text-sm text-slate-400">Total Cost</p>
                <p className="text-2xl font-bold text-slate-200">
                  ${(metrics.total_cost / 1000).toFixed(1)}K
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className="border-border bg-surface">
          <CardHeader>
            <CardTitle>3D Shelving Walkthrough</CardTitle>
            <CardDescription>
              Validate rack placement while receiving and staging orders.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {outletId ? (
              <StorageWalkthrough3D outletId={outletId} />
            ) : (
              <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
                Select an outlet to view the 3D shelving walkthrough.
              </div>
            )}
          </CardContent>
        </Card>

        <Tabs defaultValue="all" className="w-full">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="scheduled">Scheduled</TabsTrigger>
            <TabsTrigger value="in_receiving">Scanning</TabsTrigger>
            <TabsTrigger value="received">Received</TabsTrigger>
            <TabsTrigger value="quality_issue">Issues</TabsTrigger>
          </TabsList>
          <TabsContent value={filterStatus} className="space-y-4 mt-6">
            {filteredDeliveries.length === 0 ? (
              <Card className="border-border bg-surface">
                <CardContent className="pt-6">
                  <p className="text-center text-slate-400">
                    No deliveries in this status
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {filteredDeliveries.map((delivery) => (
                  <div
                    key={delivery.id}
                    onClick={() => setSelectedDelivery(delivery)}
                    className="p-4 border border-border rounded-lg hover:border-slate-500 cursor-pointer transition-colors bg-surface"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="font-semibold text-lg">
                            {delivery.po_number}
                          </h3>
                          <Badge className={getStatusColor(delivery.status)}>
                            {getStatusIcon(delivery.status)}
                            <span className="ml-1">
                              {delivery.status.replace(/_/g, "")}
                            </span>
                          </Badge>
                        </div>
                        <p className="text-sm text-slate-400">
                          {delivery.vendor_name}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-bold">
                          ${delivery.total_cost.toFixed(2)}
                        </p>
                      </div>
                    </div>
                    <div className="grid grid-cols-4 gap-4 text-sm text-slate-400 pt-3 border-t border-border">
                      <div>
                        <p className="text-xs">Items Received</p>
                        <p className="text-slate-200 font-medium">
                          {delivery.items_received} / {delivery.items_count}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs">Scheduled</p>
                        <p className="text-slate-200 font-medium">
                          {format(
                            parseISO(delivery.scheduled_date),
                            "MMM d HH:mm",
                          )}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs">Signature</p>
                        <p className="text-slate-200 font-medium">
                          {delivery.signed_by
                            ? `✓${delivery.signed_by}`
                            : "Pending"}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs">Shortages</p>
                        <p
                          className={`font-medium ${
                            delivery.items_short > 0
                              ? "text-red-400"
                              : "text-green-400"
                          }`}
                        >
                          {delivery.items_short} items
                        </p>
                      </div>
                    </div>
                    {delivery.status === "quality_issue" &&
                      delivery.temperature_issue && (
                        <div className="mt-3 p-2 bg-red-500/10 rounded text-xs text-red-600 flex items-center gap-2">
                          <Thermometer className="h-4 w-4" />
                          Temperature issue: {
                            delivery.temperature_issue.item
                          }{" "}
                          at {delivery.temperature_issue.temp_f}°F (required:{" "}
                          {delivery.temperature_issue.required_temp}°F)
                        </div>
                      )}
                    {delivery.items_short > 0 &&
                      !delivery.temperature_issue && (
                        <div className="mt-3 p-2 bg-amber-500/10 rounded text-xs text-amber-600">
                          ⚠ {delivery.items_short} items short from order
                        </div>
                      )}
                  </div>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>

        {selectedDelivery && (
          <Card className="border-border bg-surface">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>{selectedDelivery.po_number}</CardTitle>
                  <CardDescription>
                    {selectedDelivery.vendor_name}
                  </CardDescription>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedDelivery(null)}
                >
                  ✕
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-4 gap-4">
                <div>
                  <p className="text-sm text-slate-400">Total Value</p>
                  <p className="text-2xl font-bold">
                    ${selectedDelivery.total_cost.toFixed(2)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-slate-400">Receipt Progress</p>
                  <p className="text-2xl font-bold">
                    {selectedDelivery.items_received}/
                    {selectedDelivery.items_count}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-slate-400">Status</p>
                  <Badge className={getStatusColor(selectedDelivery.status)}>
                    {selectedDelivery.status}
                  </Badge>
                </div>
                <div>
                  <p className="text-sm text-slate-400">Signed By</p>
                  <p className="font-medium">
                    {selectedDelivery.signed_by || "Not signed"}
                  </p>
                </div>
              </div>
              {selectedDelivery.status === "in_receiving" && (
                <Button className="w-full bg-primary text-primary-foreground">
                  <Barcode className="h-4 w-4 mr-2" />
                  Continue Receiving
                </Button>
              )}
              {selectedDelivery.status === "scheduled" && (
                <Button className="w-full bg-primary text-primary-foreground">
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  Start Receiving
                </Button>
              )}
              {selectedDelivery.status === "received" && (
                <Alert className="border-green-200/30 bg-green-500/5">
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                  <AlertDescription className="text-green-600 ml-2">
                    Delivery completed and signed
                  </AlertDescription>
                </Alert>
              )}
              {selectedDelivery.status === "quality_issue" && (
                <Alert className="border-red-200/30 bg-red-500/5">
                  <AlertTriangle className="h-4 w-4 text-red-600" />
                  <AlertTitle className="text-red-600 ml-2">
                    Quality Issue
                  </AlertTitle>
                  <AlertDescription className="text-red-600 ml-2 mt-1">
                    {selectedDelivery.notes}
                  </AlertDescription>
                </Alert>
              )}
              {selectedDelivery.notes && (
                <div className="p-3 bg-slate-800/20 rounded border border-border">
                  <p className="text-sm text-slate-400">Notes</p>
                  <p className="text-sm text-slate-200 mt-2">
                    {selectedDelivery.notes}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </AppLayout>
  );
}
