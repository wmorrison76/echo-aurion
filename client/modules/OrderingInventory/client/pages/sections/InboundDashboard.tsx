import React, { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AlertTriangle,
  CheckCircle2,
  Package,
  Truck,
  Search,
} from "lucide-react";
import { Store } from "@/modules/PurchasingReceiving/client/lib/store";
import StorageWalkthrough3D from "../../components/storage/StorageWalkthrough3D";
import OutletInvoiceGallery from "./OutletInvoiceGallery";
import WirelessLabelPrinterPanel from "./WirelessLabelPrinterPanel";

type DeliveryStatus = "scheduled" | "in_receiving" | "received" | "verified";

type IncomingDelivery = {
  id: string;
  poNumber: string;
  vendor: string;
  outletId: string;
  outletName: string;
  eta: string;
  status: DeliveryStatus;
  itemsCount: number;
  itemsShort: number;
};

const STATUS_STYLE: Record<DeliveryStatus, string> = {
  scheduled: "bg-slate-100 text-slate-700 border-slate-200",
  in_receiving: "bg-blue-100 text-blue-700 border-blue-200",
  received: "bg-emerald-100 text-emerald-700 border-emerald-200",
  verified: "bg-purple-100 text-purple-700 border-purple-200",
};

const CHECKIN_KEY = "receiving.outletCheckins";
const ISSUE_KEY = "receiving.outletIssueReports";

type IssueReport = {
  missing: string;
  notes: string;
  reportedAt: string;
};

const mockDeliveries = (
  outlets: { id: string; name: string }[],
): IncomingDelivery[] => {
  const [first, second] = outlets;
  return [
    {
      id: "incoming-1",
      poNumber: "PO-24012",
      vendor: "US Foods",
      outletId: first?.id ?? "outlet-1",
      outletName: first?.name ?? "Main Kitchen",
      eta: "Today 12:30 PM",
      status: "in_receiving",
      itemsCount: 22,
      itemsShort: 0,
    },
    {
      id: "incoming-2",
      poNumber: "PO-24013",
      vendor: "Sysco",
      outletId: second?.id ?? "outlet-2",
      outletName: second?.name ?? "Banquet",
      eta: "Today 2:15 PM",
      status: "scheduled",
      itemsCount: 14,
      itemsShort: 0,
    },
    {
      id: "incoming-3",
      poNumber: "PO-24010",
      vendor: "Local Produce",
      outletId: first?.id ?? "outlet-1",
      outletName: first?.name ?? "Main Kitchen",
      eta: "Arrived 45m ago",
      status: "received",
      itemsCount: 18,
      itemsShort: 2,
    },
  ];
};

export default function InboundDashboard() {
  const outlets = Store.listOutlets() || [];
  const deliveries = useMemo(() => mockDeliveries(outlets), [outlets]);
  const [activeOutlet, setActiveOutlet] = useState(
    deliveries.length > 0 ? (deliveries[0]?.outletId ?? "") : "",
  );
  const [search, setSearch] = useState("");
  const [checkins, setCheckins] = useState<Record<string, string>>(() => {
    try {
      const stored = localStorage.getItem(CHECKIN_KEY);
      return stored ? JSON.parse(stored) : {};
    } catch {
      return {};
    }
  });
  const [issueReports, setIssueReports] = useState<Record<string, IssueReport>>(
    () => {
      try {
        const stored = localStorage.getItem(ISSUE_KEY);
        return stored ? JSON.parse(stored) : {};
      } catch {
        return {};
      }
    },
  );
  const [drafts, setDrafts] = useState<Record<string, IssueReport>>({});

  const filtered = useMemo(() => {
    return deliveries.filter((delivery) => {
      const matchesOutlet = activeOutlet
        ? delivery.outletId === activeOutlet
        : true;
      const matchesSearch =
        delivery.poNumber.toLowerCase().includes(search.toLowerCase()) ||
        delivery.vendor.toLowerCase().includes(search.toLowerCase());
      return matchesOutlet && matchesSearch;
    });
  }, [activeOutlet, deliveries, search]);

  const setVerified = (deliveryId: string) => {
    try {
      const updated = { ...checkins, [deliveryId]: "verified" };
      setCheckins(updated);
      localStorage.setItem(CHECKIN_KEY, JSON.stringify(updated));
      const draft = drafts[deliveryId];
      if (draft && (draft.missing?.trim() || draft.notes?.trim())) {
        const nextReports = {
          ...issueReports,
          [deliveryId]: {
            missing: draft.missing?.trim() || "",
            notes: draft.notes?.trim() || "",
            reportedAt: new Date().toISOString(),
          },
        };
        setIssueReports(nextReports);
        localStorage.setItem(ISSUE_KEY, JSON.stringify(nextReports));
      }
    } catch (error) {
      console.error("Failed to save check-in:", error);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <Truck className="h-5 w-5 text-primary" />
            Inbound Dashboard
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Track what is coming in per outlet and confirm final check-in.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Select value={activeOutlet} onValueChange={setActiveOutlet}>
            <SelectTrigger className="w-[220px]">
              <SelectValue placeholder="Select outlet" />
            </SelectTrigger>
            <SelectContent>
              {outlets.map((outlet) => (
                <SelectItem key={outlet.id} value={outlet.id}>
                  {outlet.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="relative">
            <Search className="h-4 w-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
            <Input
              placeholder="Search PO or vendor"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              className="pl-9 w-[220px]"
            />
          </div>
        </div>
      </div>

      <Card className="border border-border bg-surface">
        <CardHeader>
          <CardTitle>3D Shelving Walkthrough</CardTitle>
        </CardHeader>
        <CardContent>
          {activeOutlet ? (
            <StorageWalkthrough3D outletId={activeOutlet} />
          ) : (
            <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
              Select an outlet to view the 3D shelving walkthrough.
            </div>
          )}
        </CardContent>
      </Card>

      <WirelessLabelPrinterPanel />

      <Tabs defaultValue="incoming">
        <TabsList className="grid grid-cols-3 w-full md:w-[480px]">
          <TabsTrigger value="incoming">Inbound</TabsTrigger>
          <TabsTrigger value="checkin">Outlet Check-In</TabsTrigger>
          <TabsTrigger value="invoices">Invoice Gallery</TabsTrigger>
        </TabsList>

        <TabsContent value="incoming" className="space-y-3 mt-4">
          {filtered.length === 0 ? (
            <Card className="border border-border bg-surface">
              <CardContent className="pt-6 text-center text-sm text-muted-foreground">
                No deliveries found for selected outlet.
              </CardContent>
            </Card>
          ) : (
            filtered.map((delivery) => (
              <Card
                key={delivery.id}
                className="border border-border bg-surface"
              >
                <CardContent className="pt-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-semibold">
                        {delivery.poNumber}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {delivery.vendor}
                      </p>
                    </div>
                    <Badge className={STATUS_STYLE[delivery.status]}>
                      {delivery.status.replace("_", " ")}
                    </Badge>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs text-muted-foreground">
                    <div>
                      <p>Outlet</p>
                      <p className="font-medium text-foreground">
                        {delivery.outletName}
                      </p>
                    </div>
                    <div>
                      <p>ETA</p>
                      <p className="font-medium text-foreground">
                        {delivery.eta}
                      </p>
                    </div>
                    <div>
                      <p>Items</p>
                      <p className="font-medium text-foreground">
                        {delivery.itemsCount}
                      </p>
                    </div>
                    <div>
                      <p>Short</p>
                      <p
                        className={`font-medium ${
                          delivery.itemsShort
                            ? "text-amber-600"
                            : "text-emerald-600"
                        }`}
                      >
                        {delivery.itemsShort}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        <TabsContent value="checkin" className="space-y-3 mt-4">
          {filtered.length === 0 ? (
            <Card className="border border-border bg-surface">
              <CardContent className="pt-6 text-center text-sm text-muted-foreground">
                No deliveries available for outlet check-in.
              </CardContent>
            </Card>
          ) : (
            filtered.map((delivery) => {
              const isVerified = checkins[delivery.id] === "verified";
              const report = issueReports[delivery.id];
              const draft = drafts[delivery.id] ?? {
                missing: "",
                notes: "",
                reportedAt: "",
              };
              return (
                <Card
                  key={delivery.id}
                  className="border border-border bg-surface"
                >
                  <CardHeader>
                    <CardTitle className="text-base flex items-center justify-between">
                      <span>{delivery.poNumber}</span>
                      {isVerified ? (
                        <Badge className="bg-purple-100 text-purple-700 border-purple-200">
                          Verified
                        </Badge>
                      ) : (
                        <Badge className="bg-amber-100 text-amber-700 border-amber-200">
                          Needs check
                        </Badge>
                      )}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Package className="h-4 w-4" />
                      {delivery.vendor} • {delivery.outletName}
                    </div>
                    {delivery.itemsShort > 0 && (
                      <div className="flex items-center gap-2 text-xs text-amber-700 bg-amber-50 border border-amber-100 rounded p-2">
                        <AlertTriangle className="h-4 w-4" />
                        {delivery.itemsShort} items reported short by receiving.
                      </div>
                    )}
                    {!isVerified && (
                      <div className="space-y-2 rounded-lg border border-slate-200 bg-slate-50 p-3">
                        <p className="text-xs font-semibold uppercase text-slate-500">
                          Outlet Check Notes
                        </p>
                        <Textarea
                          placeholder="Missing items or discrepancies (e.g., 2 cases tomatoes short)"
                          value={draft.missing}
                          onChange={(event) =>
                            setDrafts((prev) => ({
                              ...prev,
                              [delivery.id]: {
                                ...draft,
                                missing: event.target.value,
                              },
                            }))
                          }
                          className="min-h-[84px]"
                        />
                        <Input
                          placeholder="Optional notes for receiving team"
                          value={draft.notes}
                          onChange={(event) =>
                            setDrafts((prev) => ({
                              ...prev,
                              [delivery.id]: {
                                ...draft,
                                notes: event.target.value,
                              },
                            }))
                          }
                        />
                      </div>
                    )}
                    {isVerified && report && (
                      <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-700 space-y-1">
                        <p className="font-semibold">Outlet check notes</p>
                        {report.missing && <p>Missing: {report.missing}</p>}
                        {report.notes && <p>Notes: {report.notes}</p>}
                      </div>
                    )}
                    <Button
                      className="w-full"
                      variant={isVerified ? "secondary" : "default"}
                      onClick={() => setVerified(delivery.id)}
                    >
                      <CheckCircle2 className="h-4 w-4 mr-2" />
                      {isVerified
                        ? "Checked by outlet"
                        : "Confirm outlet check-in"}
                    </Button>
                  </CardContent>
                </Card>
              );
            })
          )}
        </TabsContent>

        <TabsContent value="invoices" className="space-y-3 mt-4">
          <OutletInvoiceGallery />
        </TabsContent>
      </Tabs>
    </div>
  );
}
