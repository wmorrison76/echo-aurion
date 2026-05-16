import React, { useEffect, useMemo, useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import { useMultiOutlet } from "@/context/MultiOutletContext";
import { useAuth } from "@/context/AuthContext";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Truck,
  Package,
  BarChart3,
  Check,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  HelpCircle,
  X,
  Clock,
  Navigation,
} from "lucide-react";
import { format, parseISO } from "date-fns";
import ReceivingInvoicePipeline from "../components/receiving/ReceivingInvoicePipeline";

interface Delivery {
  id: string;
  poNumber: string;
  vendor: string;
  expectedDate: string;
  status: "scheduled" | "in_transit" | "received" | "issues";
  itemsExpected: number;
  itemsReceived: number;
  temperature?: number;
  notes?: string;
}

// Generate mock deliveries
const generateMockDeliveries = () => {
  const vendors = ["US Foods", "Sysco", "Local Produce Co"];
  const statuses: Delivery["status"][] = [
    "scheduled",
    "in_transit",
    "received",
    "issues",
  ];
  const deliveries: Delivery[] = [];
  for (let i = 1; i <= 40; i++) {
    const status = statuses[Math.floor(Math.random() * statuses.length)];
    const itemsExpected = Math.floor(Math.random() * 20) + 5;
    deliveries.push({
      id: `delivery-${i}`,
      poNumber: `PO-${24000 + i}`,
      vendor: vendors[Math.floor(Math.random() * vendors.length)],
      expectedDate: new Date(
        Date.now() + Math.random() * 7 * 24 * 60 * 60 * 1000,
      ).toISOString(),
      status,
      itemsExpected,
      itemsReceived:
        status === "received"
          ? itemsExpected
          : Math.floor(Math.random() * itemsExpected),
      temperature: Math.random() > 0.7 ? 32 + Math.random() * 10 : undefined,
      notes: Math.random() > 0.8 ? "Some items damaged" : undefined,
    });
  }
  return deliveries;
};

const MOCK_DELIVERIES = generateMockDeliveries();
const ITEMS_PER_PAGE = 20;

const getStatusColor = (status: Delivery["status"]) => {
  switch (status) {
    case "scheduled":
      return "bg-slate-500/20 text-slate-300";
    case "in_transit":
      return "bg-primary/20 text-primary";
    case "received":
      return "bg-green-500/20 text-green-300";
    case "issues":
      return "bg-red-500/20 text-red-300";
    default:
      return "bg-slate-500/20 text-slate-300";
  }
};

const getStatusIcon = (status: Delivery["status"]) => {
  switch (status) {
    case "scheduled":
      return <Clock className="h-3 w-3" />;
    case "in_transit":
      return <Navigation className="h-3 w-3" />;
    case "received":
      return <Check className="h-3 w-3" />;
    case "issues":
      return <AlertTriangle className="h-3 w-3" />;
    default:
      return <Package className="h-3 w-3" />;
  }
};

export default function Receiving() {
  const { currentOutlet } = useMultiOutlet();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("deliveries");
  const [filterStatus, setFilterStatus] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedDelivery, setSelectedDelivery] = useState<Delivery | null>(
    null,
  );
  const [barcodeScan, setBarcodeScan] = useState("");
  const [deliveries, setDeliveries] = useState<Delivery[]>(MOCK_DELIVERIES);
  const [showKeyboardHelp, setShowKeyboardHelp] = useState(false);

  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey) {
        if (e.key === "1") setActiveTab("deliveries");
        if (e.key === "2") setActiveTab("scan");
        if (e.key === "3") setActiveTab("dock");
        if (e.key === "4") setActiveTab("invoice");
      }
      if (e.key === "?") setShowKeyboardHelp(!showKeyboardHelp);
      if (e.key === "Escape") setSelectedDelivery(null);
      if (activeTab === "scan") {
        if (e.key === "Enter") {
          setBarcodeScan("");
        }
      }
      if (selectedDelivery && e.key === "r" && !e.ctrlKey) {
        handleQuickReceive(selectedDelivery.id);
      }
    };
    window.addEventListener("keydown", handleKeyPress);
    return () => window.removeEventListener("keydown", handleKeyPress);
  }, [selectedDelivery, barcodeScan, activeTab, showKeyboardHelp]);

  const filteredDeliveries = useMemo(() => {
    return deliveries.filter((d) => {
      if (filterStatus !== "all" && d.status !== filterStatus) return false;
      if (
        searchTerm &&
        !d.poNumber.includes(searchTerm) &&
        !d.vendor.toLowerCase().includes(searchTerm.toLowerCase())
      )
        return false;
      return true;
    });
  }, [deliveries, filterStatus, searchTerm]);

  const totalPages = Math.ceil(filteredDeliveries.length / ITEMS_PER_PAGE);
  const paginatedDeliveries = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredDeliveries.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredDeliveries, currentPage]);

  const metrics = useMemo(() => {
    return {
      scheduled: deliveries.filter((d) => d.status === "scheduled").length,
      in_transit: deliveries.filter((d) => d.status === "in_transit").length,
      received: deliveries.filter((d) => d.status === "received").length,
      issues: deliveries.filter((d) => d.status === "issues").length,
    };
  }, [deliveries]);

  const handleQuickReceive = (deliveryId: string) => {
    setDeliveries((prev) =>
      prev.map((d) =>
        d.id === deliveryId
          ? {
              ...d,
              status: "received" as const,
              itemsReceived: d.itemsExpected,
            }
          : d,
      ),
    );
    setSelectedDelivery(null);
  };

  const handleMarkIssue = (deliveryId: string) => {
    setDeliveries((prev) =>
      prev.map((d) =>
        d.id === deliveryId ? { ...d, status: "issues" as const } : d,
      ),
    );
    setSelectedDelivery(null);
  };

  return (
    <AppLayout>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Truck className="h-6 w-6" /> Receiving Operations
            </h1>
            <p className="text-xs text-slate-400 mt-1">
              Deliveries, barcode scanning, dock, invoices
            </p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowKeyboardHelp(!showKeyboardHelp)}
            className="text-slate-400 hover:text-slate-200"
          >
            <HelpCircle className="h-4 w-4" />
          </Button>
        </div>

        {showKeyboardHelp && (
          <Alert className="border-slate-600 bg-slate-800/50">
            <div className="flex items-start justify-between gap-4">
              <div className="text-xs space-y-1">
                <div>
                  <kbd className="px-2 py-1 bg-slate-700 rounded text-slate-200">
                    Ctrl+1
                  </kbd>{" "}
                  Deliveries
                </div>
                <div>
                  <kbd className="px-2 py-1 bg-slate-700 rounded text-slate-200">
                    Ctrl+2
                  </kbd>{" "}
                  Scan
                </div>
                <div>
                  <kbd className="px-2 py-1 bg-slate-700 rounded text-slate-200">
                    Ctrl+3
                  </kbd>{" "}
                  Dock
                </div>
                <div>
                  <kbd className="px-2 py-1 bg-slate-700 rounded text-slate-200">
                    Ctrl+4
                  </kbd>{" "}
                  Invoice
                </div>
              </div>
              <div className="text-xs space-y-1">
                <div>
                  <kbd className="px-2 py-1 bg-slate-700 rounded text-slate-200">
                    R
                  </kbd>{" "}
                  Quick Receive
                </div>
                <div>
                  <kbd className="px-2 py-1 bg-slate-700 rounded text-slate-200">
                    Enter
                  </kbd>{" "}
                  Submit barcode
                </div>
                <div>
                  <kbd className="px-2 py-1 bg-slate-700 rounded text-slate-200">
                    Esc
                  </kbd>{" "}
                  Close modal
                </div>
                <div>
                  <kbd className="px-2 py-1 bg-slate-700 rounded text-slate-200">
                    ?
                  </kbd>{" "}
                  Toggle help
                </div>
              </div>
            </div>
          </Alert>
        )}

        <div className="grid gap-3 grid-cols-4">
          <Card className="border-border bg-surface">
            <CardContent className="pt-3 pb-3">
              <div className="text-xs text-slate-400">Scheduled</div>
              <p className="text-2xl font-bold">{metrics.scheduled}</p>
            </CardContent>
          </Card>
          <Card className="border-border bg-surface">
            <CardContent className="pt-3 pb-3">
              <div className="text-xs text-slate-400">In Transit</div>
              <p className="text-2xl font-bold text-blue-400">
                {metrics.in_transit}
              </p>
            </CardContent>
          </Card>
          <Card className="border-border bg-surface">
            <CardContent className="pt-3 pb-3">
              <div className="text-xs text-slate-400">Received</div>
              <p className="text-2xl font-bold text-green-400">
                {metrics.received}
              </p>
            </CardContent>
          </Card>
          <Card className="border-border bg-surface">
            <CardContent className="pt-3 pb-3">
              <div className="text-xs text-slate-400">Issues</div>
              <p className="text-2xl font-bold text-red-400">
                {metrics.issues}
              </p>
            </CardContent>
          </Card>
        </div>

        <Tabs
          value={activeTab}
          onValueChange={setActiveTab}
          className="space-y-3"
        >
          <TabsList className="bg-surface border-b border-border h-auto w-full justify-start rounded-none p-0">
            <TabsTrigger
              value="deliveries"
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary"
            >
              <Truck className="h-4 w-4 mr-2" /> Deliveries (
              {filteredDeliveries.length})
            </TabsTrigger>
            <TabsTrigger
              value="scan"
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary"
            >
              <Package className="h-4 w-4 mr-2" /> Barcode Scan
            </TabsTrigger>
            <TabsTrigger
              value="dock"
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary"
            >
              <Navigation className="h-4 w-4 mr-2" /> On The Dock
            </TabsTrigger>
            <TabsTrigger
              value="invoice"
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary"
            >
              <BarChart3 className="h-4 w-4 mr-2" /> Invoice Capture
            </TabsTrigger>
          </TabsList>

          <TabsContent value="deliveries" className="space-y-3">
            <div className="flex gap-2 items-center">
              <Input
                placeholder="Search by PO # or vendor..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setCurrentPage(1);
                }}
                className="bg-slate-800 border-slate-600 h-8 text-sm"
              />
              <div className="flex gap-1">
                {["scheduled", "in_transit", "received", "issues", "all"].map(
                  (status) => (
                    <Button
                      key={status}
                      variant={filterStatus === status ? "default" : "outline"}
                      size="sm"
                      onClick={() => {
                        setFilterStatus(status);
                        setCurrentPage(1);
                      }}
                      className="text-xs px-2 h-8"
                    >
                      {status === "in_transit"
                        ? "In Transit"
                        : status.charAt(0).toUpperCase() + status.slice(1)}
                    </Button>
                  ),
                )}
              </div>
            </div>

            <Card className="border-border bg-surface">
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="hover:bg-transparent border-border">
                        <TableHead className="text-xs font-semibold text-slate-300 h-8 px-2">
                          PO #
                        </TableHead>
                        <TableHead className="text-xs font-semibold text-slate-300 h-8 px-2">
                          Vendor
                        </TableHead>
                        <TableHead className="text-xs font-semibold text-slate-300 h-8 px-2">
                          Expected Date
                        </TableHead>
                        <TableHead className="text-xs font-semibold text-slate-300 h-8 px-2">
                          Items
                        </TableHead>
                        <TableHead className="text-xs font-semibold text-slate-300 h-8 px-2">
                          Received
                        </TableHead>
                        <TableHead className="text-xs font-semibold text-slate-300 h-8 px-2">
                          Status
                        </TableHead>
                        <TableHead className="text-xs font-semibold text-slate-300 h-8 px-2">
                          Actions
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {paginatedDeliveries.map((delivery) => (
                        <TableRow
                          key={delivery.id}
                          className="hover:bg-slate-800/30 border-border h-8 cursor-pointer"
                          onClick={() => setSelectedDelivery(delivery)}
                        >
                          <TableCell className="text-sm font-semibold text-blue-400 p-2">
                            {delivery.poNumber}
                          </TableCell>
                          <TableCell className="text-xs text-slate-200 p-2">
                            {delivery.vendor}
                          </TableCell>
                          <TableCell className="text-xs text-slate-400 p-2">
                            {format(parseISO(delivery.expectedDate), "MMM d")}
                          </TableCell>
                          <TableCell className="text-xs p-2">
                            {delivery.itemsExpected}
                          </TableCell>
                          <TableCell className="text-xs p-2 font-medium">
                            {delivery.itemsReceived}/{delivery.itemsExpected}
                          </TableCell>
                          <TableCell className="p-2">
                            <Badge className={getStatusColor(delivery.status)}>
                              {getStatusIcon(delivery.status)}
                              <span className="ml-1 text-xs capitalize">
                                {delivery.status === "in_transit"
                                  ? "In Transit"
                                  : delivery.status}
                              </span>
                            </Badge>
                          </TableCell>
                          <TableCell
                            className="p-2"
                            onClick={(e) => e.stopPropagation()}
                          >
                            {delivery.status !== "received" && (
                              <div className="flex gap-1">
                                <Button
                                  size="sm"
                                  className="h-6 px-2 text-xs bg-green-600 hover:bg-green-700"
                                  onClick={() =>
                                    handleQuickReceive(delivery.id)
                                  }
                                  title="R"
                                >
                                  <Check className="h-3 w-3" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="h-6 px-2 text-xs border-slate-600"
                                  onClick={() => handleMarkIssue(delivery.id)}
                                  title="Issue"
                                >
                                  <AlertTriangle className="h-3 w-3" />
                                </Button>
                              </div>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                <div className="flex items-center justify-between p-3 border-t border-border bg-surface">
                  <span className="text-xs text-slate-400">
                    {filteredDeliveries.length === 0
                      ? "No results"
                      : `${(currentPage - 1) * ITEMS_PER_PAGE + 1}-${Math.min(
                          currentPage * ITEMS_PER_PAGE,
                          filteredDeliveries.length,
                        )} of ${filteredDeliveries.length}`}
                  </span>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        setCurrentPage(Math.max(1, currentPage - 1))
                      }
                      disabled={currentPage === 1}
                      className="h-7 px-2 text-xs border-slate-600"
                    >
                      <ChevronLeft className="h-3 w-3" />
                    </Button>
                    <span className="text-xs text-slate-400 px-2">
                      Page {currentPage} of {totalPages || 1}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        setCurrentPage(Math.min(totalPages, currentPage + 1))
                      }
                      disabled={currentPage === totalPages}
                      className="h-7 px-2 text-xs border-slate-600"
                    >
                      <ChevronRight className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="scan">
            <Card className="border-border bg-surface">
              <CardContent className="p-6">
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium">
                      Scan Barcode (Press Enter)
                    </label>
                    <Input
                      autoFocus
                      value={barcodeScan}
                      onChange={(e) => setBarcodeScan(e.target.value)}
                      placeholder="Scan barcode here..."
                      className="bg-slate-800 border-slate-600 mt-2 text-sm"
                    />
                  </div>
                  <div className="text-xs text-slate-400">
                    <p>✓ Scanned items appear in real-time</p>
                    <p>✓ Automatic inventory update</p>
                    <p>✓ Temperature capture support</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="dock">
            <Card className="border-border bg-surface">
              <CardContent className="p-6">
                <p className="text-slate-400 text-sm">
                  Real-time dock view showing incoming deliveries, staged items,
                  and loading bay status.
                </p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="invoice">
            <Card className="border-border bg-surface">
              <ReceivingInvoicePipeline />
            </Card>
          </TabsContent>
        </Tabs>

        {selectedDelivery && (
          <div className="fixed inset-0 bg-black/50 flex items-end z-50">
            <div className="bg-surface border-t border-border w-full max-w-2xl ml-auto animate-in slide-in-from-right">
              <div className="p-4 border-b border-border flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-bold">
                    {selectedDelivery.poNumber}
                  </h2>
                  <p className="text-xs text-slate-400">
                    {selectedDelivery.vendor}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedDelivery(null)}
                  className="h-6 w-6 p-0"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
              <div className="p-4 space-y-4 max-h-96 overflow-y-auto">
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <p className="text-xs text-slate-400">Expected Date</p>
                    <p className="text-sm font-medium">
                      {format(
                        parseISO(selectedDelivery.expectedDate),
                        "MMM d, yyyy",
                      )}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-400">Items</p>
                    <p className="text-sm font-medium">
                      {selectedDelivery.itemsReceived}/
                      {selectedDelivery.itemsExpected}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-400">Status</p>
                    <Badge className={getStatusColor(selectedDelivery.status)}>
                      {selectedDelivery.status.charAt(0).toUpperCase() +
                        selectedDelivery.status.slice(1)}
                    </Badge>
                  </div>
                </div>
                {selectedDelivery.temperature && (
                  <Alert className="border-amber-200/30 bg-amber-500/5">
                    <AlertTriangle className="h-4 w-4 text-amber-600" />
                    <AlertDescription className="text-amber-600 text-sm ml-2">
                      Temperature: {selectedDelivery.temperature}°F
                    </AlertDescription>
                  </Alert>
                )}
                {selectedDelivery.notes && (
                  <Alert className="border-slate-600 bg-slate-800/30">
                    <AlertDescription className="text-slate-300 text-sm">
                      {selectedDelivery.notes}
                    </AlertDescription>
                  </Alert>
                )}
                {selectedDelivery.status !== "received" && (
                  <div className="space-y-2 pt-2 border-t border-border">
                    <div className="flex gap-2">
                      <Button
                        className="flex-1 bg-green-600 hover:bg-green-700 h-8 text-sm"
                        onClick={() => handleQuickReceive(selectedDelivery.id)}
                      >
                        <Check className="h-4 w-4 mr-2" /> Receive All (R)
                      </Button>
                      <Button
                        variant="outline"
                        className="flex-1 border-slate-600 h-8 text-sm"
                        onClick={() => handleMarkIssue(selectedDelivery.id)}
                      >
                        <AlertTriangle className="h-4 w-4 mr-2" /> Mark Issue
                      </Button>
                    </div>
                  </div>
                )}
                {selectedDelivery.status === "received" && (
                  <Alert className="border-green-200/30 bg-green-500/5">
                    <Check className="h-4 w-4 text-green-600" />
                    <AlertDescription className="text-green-600 text-sm ml-2">
                      Received
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
