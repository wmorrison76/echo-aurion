import React, { useEffect, useMemo, useState } from "react";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  CommissaryTransferForm,
  type CommissaryTransfer,
  type TransferLineItem,
} from "@/components/inventory/CommissaryTransferForm";
import {
  Package,
  Plus,
  Check,
  Clock,
  XCircle,
  AlertCircle,
  Truck,
  DollarSign,
} from "lucide-react";
import { format, parseISO, isToday, isTomorrow } from "date-fns";
import { Store } from "@/modules/PurchasingReceiving/client/lib/store";
import { buildCommissaryFulfillment } from "@/modules/PurchasingReceiving/client/services/commissary-routing";
import {
  matchRecipeOptions,
  saveDraftRecipe,
  type RecipeMatchOption,
} from "@/modules/PurchasingReceiving/client/services/commissary-recipes";

const RECIPE_LINKS_KEY = "commissary.recipe.links.v1";
const CART_KEY = "commissary.production.carts.v1";

const readRecipeLinks = (): Record<
  string,
  Record<string, RecipeMatchOption>
> => {
  try {
    const raw = localStorage.getItem(RECIPE_LINKS_KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
};

const writeRecipeLinks = (
  links: Record<string, Record<string, RecipeMatchOption>>,
) => {
  try {
    localStorage.setItem(RECIPE_LINKS_KEY, JSON.stringify(links));
  } catch {
    // ignore
  }
};

const readCartAssignments = (): Record<string, string> => {
  try {
    const raw = localStorage.getItem(CART_KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
};

const writeCartAssignments = (assignments: Record<string, string>) => {
  try {
    localStorage.setItem(CART_KEY, JSON.stringify(assignments));
  } catch {
    // ignore
  }
};

const TRANSFER_KEY = "commissary.transfers.v1";

const readTransfers = (): CommissaryTransfer[] => {
  try {
    const raw = localStorage.getItem(TRANSFER_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const writeTransfers = (transfers: CommissaryTransfer[]) => {
  try {
    localStorage.setItem(TRANSFER_KEY, JSON.stringify(transfers));
  } catch {
    // ignore write failures
  }
};

const getStatusColor = (status: string) => {
  switch (status) {
    case "delivered":
      return "bg-green-500/10 text-green-700 border-green-200/30";
    case "in_transit":
      return "bg-primary/10 text-blue-700 border-blue-200/30";
    case "approved":
      return "bg-amber-500/10 text-amber-700 border-amber-200/30";
    case "submitted":
      return "bg-slate-500/10 text-foreground border-slate-200/30";
    case "rejected":
      return "bg-red-500/10 text-red-700 border-red-200/30";
    default:
      return "bg-slate-500/10 text-foreground border-slate-200/30";
  }
};

const getStatusIcon = (status: string) => {
  switch (status) {
    case "delivered":
      return <Check className="h-4 w-4" />;
    case "in_transit":
      return <Truck className="h-4 w-4" />;
    case "approved":
      return <Clock className="h-4 w-4" />;
    case "submitted":
      return <AlertCircle className="h-4 w-4" />;
    case "rejected":
      return <XCircle className="h-4 w-4" />;
    default:
      return <Clock className="h-4 w-4" />;
  }
};

export default function CommissaryOrdering() {
  const { currentOutlet } = useMultiOutlet();
  const [selectedTransfer, setSelectedTransfer] =
    useState<CommissaryTransfer | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<"date" | "status" | "priority">("date");
  const [outlets, setOutlets] = useState(() => Store.listOutlets());
  const [selectedCommissaryId, setSelectedCommissaryId] = useState<
    string | null
  >(null);
  const [transfers, setTransfers] = useState<CommissaryTransfer[]>(() =>
    readTransfers(),
  );
  const [recipeLinks, setRecipeLinks] = useState<
    Record<string, Record<string, RecipeMatchOption>>
  >(() => readRecipeLinks());
  const [cartAssignments, setCartAssignments] = useState<
    Record<string, string>
  >(() => readCartAssignments());
  const [forecastDays, setForecastDays] = useState<
    Array<{ id?: string; date: string }>
  >([]);
  const [outletForecasts, setOutletForecasts] = useState<
    Array<{
      forecast_day_id: string;
      outlet_id: string;
      final_forecast: number;
    }>
  >([]);
  const [forecastStatus, setForecastStatus] = useState<
    "idle" | "loading" | "error"
  >("idle");

  useEffect(() => {
    const refresh = () => setOutlets(Store.listOutlets());
    refresh();
    const handler = () => refresh();
    window.addEventListener("echo:outlet:save", handler as EventListener);
    return () =>
      window.removeEventListener("echo:outlet:save", handler as EventListener);
  }, []);

  useEffect(() => {
    writeTransfers(transfers);
  }, [transfers]);

  useEffect(() => {
    writeRecipeLinks(recipeLinks);
  }, [recipeLinks]);

  useEffect(() => {
    writeCartAssignments(cartAssignments);
  }, [cartAssignments]);

  useEffect(() => {
    let active = true;
    const loadForecast = async () => {
      setForecastStatus("loading");
      try {
        const res = await fetch("/api/resort/forecast");
        if (!res.ok) throw new Error("forecast");
        const data = await res.json();
        if (!active) return;
        setForecastDays(data?.data?.forecastDays || []);
        setOutletForecasts(data?.data?.outletForecasts || []);
        setForecastStatus("idle");
      } catch {
        if (!active) return;
        setForecastStatus("error");
      }
    };
    loadForecast();
    return () => {
      active = false;
    };
  }, []);

  const commissaryOutlets = useMemo(() => {
    const commissaries = outlets.filter(
      (outlet) =>
        outlet.isCommissary ||
        (outlet.tags || []).some((tag) =>
          tag.toLowerCase().includes("commissary"),
        ),
    );
    return commissaries.length ? commissaries : outlets;
  }, [outlets]);

  useEffect(() => {
    if (!commissaryOutlets.length) return;
    if (
      !selectedCommissaryId ||
      !commissaryOutlets.some((o) => o.id === selectedCommissaryId)
    ) {
      setSelectedCommissaryId(commissaryOutlets[0].id);
    }
  }, [commissaryOutlets, selectedCommissaryId]);

  const selectedCommissary =
    commissaryOutlets.find((o) => o.id === selectedCommissaryId) || null;
  const outletNameById = useMemo(() => {
    return new Map(outlets.map((outlet) => [outlet.id, outlet.name]));
  }, [outlets]);

  const selectedRecipeMatches = useMemo(() => {
    if (!selectedTransfer) return [];
    return selectedTransfer.lines.map((line) => {
      const stored = recipeLinks[selectedTransfer.id]?.[line.id] ?? null;
      const options = matchRecipeOptions(line.productName, 0.55);
      return { line, stored, options };
    });
  }, [recipeLinks, selectedTransfer]);

  const productionBatches = useMemo(() => {
    const batches = new Map<
      string,
      {
        date: string;
        itemName: string;
        unit: string;
        total: number;
        lines: Array<{
          transferId: string;
          outletId: string;
          quantity: number;
        }>;
      }
    >();
    transfers.forEach((transfer) => {
      const productionDate =
        transfer.expectedDeliveryDate || transfer.requestedAt;
      const dateKey = productionDate
        ? productionDate.slice(0, 10)
        : "unscheduled";
      transfer.lines.forEach((line) => {
        const key = `${dateKey}:${line.productCode}`;
        const existing = batches.get(key);
        const nextLine = {
          transferId: transfer.id,
          outletId: transfer.toOutlet,
          quantity: line.quantity,
        };
        if (existing) {
          existing.total += line.quantity;
          existing.lines.push(nextLine);
        } else {
          batches.set(key, {
            date: dateKey,
            itemName: line.productName,
            unit: line.unitOfMeasure,
            total: line.quantity,
            lines: [nextLine],
          });
        }
      });
    });
    return Array.from(batches.entries()).map(([id, data]) => ({ id, ...data }));
  }, [transfers]);

  const standingTargets = useMemo(() => {
    if (!availableInventory.length) return [];
    const dayMap = new Map(forecastDays.map((day) => [day.id, day.date]));
    const totalsByDay = new Map<string, number>();
    outletForecasts.forEach((row) => {
      const date = dayMap.get(row.forecast_day_id);
      if (!date) return;
      totalsByDay.set(
        date,
        (totalsByDay.get(date) || 0) + (row.final_forecast || 0),
      );
    });
    const forecastAvg =
      totalsByDay.size > 0
        ? Array.from(totalsByDay.values()).reduce((sum, val) => sum + val, 0) /
          totalsByDay.size
        : 0;

    const demandByItem = new Map<
      string,
      { total: number; days: Set<string> }
    >();
    transfers
      .filter((transfer) => transfer.fromOutlet === selectedCommissaryId)
      .forEach((transfer) => {
        const date = (
          transfer.expectedDeliveryDate || transfer.requestedAt
        ).slice(0, 10);
        transfer.lines.forEach((line) => {
          const entry = demandByItem.get(line.productCode) || {
            total: 0,
            days: new Set<string>(),
          };
          entry.total += line.quantity;
          entry.days.add(date);
          demandByItem.set(line.productCode, entry);
        });
      });

    const baselineTotal =
      Array.from(demandByItem.values()).reduce(
        (sum, entry) => sum + entry.total,
        0,
      ) || 0;
    const baselineDays =
      Array.from(demandByItem.values()).reduce(
        (sum, entry) => sum + entry.days.size,
        0,
      ) || 1;
    const baselineAvg = baselineTotal / baselineDays;
    const scale =
      baselineAvg > 0
        ? Math.max(0.5, Math.min(2, forecastAvg / baselineAvg))
        : 1;

    return availableInventory.map((item) => {
      const demand = demandByItem.get(item.productCode);
      const dailyUsage = demand
        ? demand.total / Math.max(1, demand.days.size)
        : 0;
      const target = Math.round(dailyUsage * 2 * scale);
      const variance = item.quantity - target;
      return {
        ...item,
        targetQty: target,
        variance,
      };
    });
  }, [
    availableInventory,
    forecastDays,
    outletForecasts,
    selectedCommissaryId,
    transfers,
  ]);

  const onHandByItem = useMemo(() => {
    if (!selectedCommissaryId) return new Map<string, number>();
    const sessions = Store.listCounts()
      .filter((session) => session.outletId === selectedCommissaryId)
      .sort((a, b) => {
        const aTime = new Date(a.completedAt ?? a.startedAt).getTime();
        const bTime = new Date(b.completedAt ?? b.startedAt).getTime();
        return bTime - aTime;
      });
    const map = new Map<string, number>();
    for (const session of sessions) {
      for (const line of session.lines || []) {
        if (!map.has(line.itemId)) {
          map.set(line.itemId, line.qty);
        }
      }
    }
    return map;
  }, [selectedCommissaryId, transfers]);

  const availableInventory = useMemo<TransferLineItem[]>(() => {
    if (!selectedCommissaryId) return [];
    return Store.listItems()
      .filter((item) => item.outletId === selectedCommissaryId)
      .map((item) => {
        const purchaseUnit = item.purchaseUnits?.[0];
        const unitCost = purchaseUnit?.lastUnitPrice ?? 0;
        const unit = purchaseUnit?.unit || item.standardUnit || "each";
        const historyQty = (item.history || []).reduce((sum, event) => {
          if (
            event.type === "receipt" ||
            event.type === "transfer_in" ||
            event.type === "adjustment"
          ) {
            return sum + event.qty;
          }
          if (event.type === "transfer_out") {
            return sum - event.qty;
          }
          return sum;
        }, 0);
        const quantity = onHandByItem.get(item.id) ?? historyQty;
        return {
          id: item.id,
          productCode: item.id,
          productName: item.name,
          quantity,
          unitOfMeasure: unit,
          unitCost,
          sourceAvailability: quantity,
        };
      });
  }, [onHandByItem, selectedCommissaryId]);

  const filteredInventory = useMemo(() => {
    return availableInventory.filter(
      (item) =>
        item.productName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.productCode.toLowerCase().includes(searchQuery.toLowerCase()),
    );
  }, [availableInventory, searchQuery]);

  const outletTransfers = useMemo(() => {
    if (!currentOutlet) return [];
    return transfers
      .filter((t) => t.toOutlet === currentOutlet.id)
      .sort((a, b) => {
        if (sortBy === "date") {
          return (
            new Date(b.requestedAt).getTime() -
            new Date(a.requestedAt).getTime()
          );
        }
        if (sortBy === "status") {
          return a.status.localeCompare(b.status);
        }
        if (sortBy === "priority") {
          const priorityOrder = { urgent: 0, normal: 1 };
          return (
            (priorityOrder[a.priority as keyof typeof priorityOrder] || 2) -
            (priorityOrder[b.priority as keyof typeof priorityOrder] || 2)
          );
        }
        return 0;
      });
  }, [currentOutlet, sortBy, transfers]);

  const metrics = useMemo(() => {
    return {
      pendingApproval: outletTransfers.filter((t) => t.status === "submitted")
        .length,
      approved: outletTransfers.filter((t) => t.status === "approved").length,
      inTransit: outletTransfers.filter((t) => t.status === "in_transit")
        .length,
      delivered: outletTransfers.filter((t) => t.status === "delivered").length,
      totalValue: outletTransfers.reduce((sum, t) => {
        return (
          sum +
          t.lines.reduce(
            (lineSum, line) => lineSum + line.quantity * line.unitCost,
            0,
          )
        );
      }, 0),
    };
  }, [outletTransfers]);

  const handleSubmitTransfer = async (transfer: CommissaryTransfer) => {
    const baseTransfer: CommissaryTransfer = {
      ...transfer,
      id: `TR-${Date.now()}`,
      requestedAt: new Date().toISOString(),
      fromOutlet: selectedCommissaryId ?? transfer.fromOutlet,
      toOutlet: transfer.toOutlet || currentOutlet?.id || transfer.toOutlet,
      status: "submitted",
    };
    const routing = buildCommissaryFulfillment(baseTransfer);
    const next: CommissaryTransfer = {
      ...baseTransfer,
      lines: routing.transferLines,
      notes: routing.purchaseOrders.length
        ? `${baseTransfer.notes || ""}\nVendor POs generated: ${routing.purchaseOrders.length}`.trim()
        : baseTransfer.notes,
    };
    routing.purchaseOrders.forEach((po) => Store.savePO(po));
    setTransfers((prev) => [next, ...prev]);

    // D16b-ui · also persist to the real commissary backend (D16a).
    // Local state keeps the UI snappy; the backend POST is the source
    // of truth so other outlets, the producing kitchen's production
    // sheet, and the COGS pipeline (D16g/D19/D22) see the order.
    // Failure here surfaces as console warning + a banner — the local
    // draft survives so the chef can retry without re-entering.
    try {
      const apiLines = (next.lines || []).map((l: any) => ({
        product_id: l.productId || l.id,
        qty: Number(l.quantity ?? l.qty ?? 0),
      })).filter((l: any) => l.product_id && l.qty > 0);
      if (apiLines.length === 0) {
        console.warn("[Commissary] no API-mappable lines; local draft only");
        return;
      }
      const body = {
        ordering_outlet_id: next.toOutlet,
        needed_by: next.requiredAt || next.requestedAt,
        lines: apiLines,
        note: next.notes || "",
        ordered_by_name: next.requestedBy || "",
      };
      const res = await fetch("/api/commissary/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const text = await res.text().catch(() => "");
        console.warn(`[Commissary] backend rejected (${res.status}):`, text);
        // Stamp a soft-error onto the local row so the UI can surface it
        setTransfers((prev) =>
          prev.map((t) =>
            t.id === next.id
              ? ({ ...t, _backendError: `${res.status}: ${text}` } as any)
              : t,
          ),
        );
        return;
      }
      const data = await res.json();
      // Adopt the backend's canonical id so subsequent confirm /
      // amend / status-update calls hit the right row.
      const serverId = data?.order?.id;
      if (serverId) {
        setTransfers((prev) =>
          prev.map((t) =>
            t.id === next.id
              ? ({ ...t, serverOrderId: serverId } as any)
              : t,
          ),
        );
      }
    } catch (err) {
      console.warn("[Commissary] backend POST failed:", err);
      setTransfers((prev) =>
        prev.map((t) =>
          t.id === next.id
            ? ({ ...t, _backendError: String(err) } as any)
            : t,
        ),
      );
    }
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Package className="h-8 w-8" /> Commissary Ordering
          </h1>
          <p className="text-slate-400 mt-2">
            Order products from commissary for{" "}
            <span className="font-semibold">
              {currentOutlet?.name || "your outlet"}
            </span>
          </p>
        </div>

        <Card className="border-border bg-surface">
          <CardHeader>
            <CardTitle>Commissary Source</CardTitle>
            <CardDescription>
              Select the commissary outlet fulfilling this order.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="text-sm text-slate-400">
              {selectedCommissary?.name || "Select a commissary outlet"}
            </div>
            <Select
              value={selectedCommissaryId || ""}
              onValueChange={(value) => setSelectedCommissaryId(value)}
            >
              <SelectTrigger className="w-72 bg-slate-800 border-slate-600">
                <SelectValue placeholder="Pick commissary outlet" />
              </SelectTrigger>
              <SelectContent className="bg-slate-800 border-slate-600">
                {commissaryOutlets.map((outlet) => (
                  <SelectItem key={outlet.id} value={outlet.id}>
                    {outlet.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        <Tabs defaultValue="inventory" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="inventory" className="flex items-center gap-2">
              <Package className="h-4 w-4" />
              <span className="hidden sm:inline">Available Inventory</span>
            </TabsTrigger>
            <TabsTrigger value="orders" className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              <span className="hidden sm:inline">Your Orders</span>
              {metrics.pendingApproval > 0 && (
                <Badge variant="destructive" className="ml-1 text-xs">
                  {metrics.pendingApproval}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="production" className="flex items-center gap-2">
              <Package className="h-4 w-4" />
              <span className="hidden sm:inline">Production</span>
            </TabsTrigger>
            <TabsTrigger value="analytics" className="flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              <span className="hidden sm:inline">Analytics</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="inventory" className="space-y-6 mt-6">
            <Card className="border-border bg-surface">
              <CardHeader>
                <CardTitle>
                  Available from {selectedCommissary?.name || "Commissary"}
                </CardTitle>
                <CardDescription>
                  {availableInventory.length} items in stock
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Input
                  placeholder="Search by product name or code..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="bg-slate-800 border-slate-600"
                />
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent">
                      <TableHead className="text-slate-300">Product</TableHead>
                      <TableHead className="text-right text-slate-300">
                        Code
                      </TableHead>
                      <TableHead className="text-right text-slate-300">
                        Available
                      </TableHead>
                      <TableHead className="text-right text-slate-300">
                        Unit Cost
                      </TableHead>
                      <TableHead className="text-right text-slate-300">
                        Action
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredInventory.length === 0 ? (
                      <TableRow>
                        <TableCell
                          colSpan={5}
                          className="text-center py-8 text-slate-400"
                        >
                          No products found matching "{searchQuery}"
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredInventory.map((item) => (
                        <TableRow
                          key={item.id}
                          className="hover:bg-slate-800/30"
                        >
                          <TableCell>
                            <div>
                              <p className="font-medium">{item.productName}</p>
                            </div>
                          </TableCell>
                          <TableCell className="text-right font-mono text-sm">
                            {item.productCode}
                          </TableCell>
                          <TableCell className="text-right">
                            <span className="font-semibold text-green-400">
                              {item.quantity}
                            </span>
                            <span className="text-xs text-slate-400 ml-1">
                              {item.unitOfMeasure}
                            </span>
                          </TableCell>
                          <TableCell className="text-right">
                            ${item.unitCost.toFixed(2)}
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-xs"
                              onClick={() => {
                                console.log("Order", item.productName);
                              }}
                            >
                              Order
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            <Card className="border-border bg-surface">
              <CardHeader>
                <CardTitle>Standing Inventory Targets (21‑Day)</CardTitle>
                <CardDescription>
                  Forecast‑weighted targets using commissary demand history.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {forecastStatus === "error" && (
                  <div className="text-sm text-red-400 mb-3">
                    Forecast data unavailable.
                  </div>
                )}
                {standingTargets.length === 0 ? (
                  <div className="text-sm text-slate-400">
                    No target data yet.
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow className="hover:bg-transparent">
                        <TableHead className="text-slate-300">Item</TableHead>
                        <TableHead className="text-right text-slate-300">
                          On Hand
                        </TableHead>
                        <TableHead className="text-right text-slate-300">
                          Target
                        </TableHead>
                        <TableHead className="text-right text-slate-300">
                          Variance
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {standingTargets.map((item) => (
                        <TableRow
                          key={item.productCode}
                          className="hover:bg-slate-800/30"
                        >
                          <TableCell>{item.productName}</TableCell>
                          <TableCell className="text-right">
                            {item.quantity} {item.unitOfMeasure}
                          </TableCell>
                          <TableCell className="text-right">
                            {item.targetQty} {item.unitOfMeasure}
                          </TableCell>
                          <TableCell className="text-right">
                            <span
                              className={
                                item.variance >= 0
                                  ? "text-emerald-400"
                                  : "text-amber-400"
                              }
                            >
                              {item.variance}
                            </span>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>

            <Card className="border-border bg-surface">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Plus className="h-4 w-4" /> Create New Order
                </CardTitle>
                <CardDescription>
                  Select items below to create a transfer request
                </CardDescription>
              </CardHeader>
              <CardContent>
                {currentOutlet ? (
                  <CommissaryTransferForm
                    outlets={[
                      selectedCommissary
                        ? {
                            id: selectedCommissary.id,
                            name: selectedCommissary.name,
                          }
                        : { id: "storeroom", name: "Central Storeroom" },
                      { id: currentOutlet.id, name: currentOutlet.name },
                    ]}
                    currentOutletId={selectedCommissary?.id ?? currentOutlet.id}
                    availableInventory={availableInventory}
                    onSubmit={handleSubmitTransfer}
                  />
                ) : (
                  <Alert className="border-amber-200/30 bg-amber-500/5">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription className="text-amber-700">
                      Please select an outlet from the header to create an order
                    </AlertDescription>
                  </Alert>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="orders" className="space-y-6 mt-6">
            <div className="grid gap-3 md:grid-cols-4">
              <Card className="border-border bg-surface">
                <CardContent className="pt-6">
                  <div>
                    <p className="text-sm text-slate-400">Pending Approval</p>
                    <p className="text-2xl font-bold text-amber-400">
                      {metrics.pendingApproval}
                    </p>
                  </div>
                </CardContent>
              </Card>
              <Card className="border-border bg-surface">
                <CardContent className="pt-6">
                  <div>
                    <p className="text-sm text-slate-400">Approved</p>
                    <p className="text-2xl font-bold text-blue-400">
                      {metrics.approved}
                    </p>
                  </div>
                </CardContent>
              </Card>
              <Card className="border-border bg-surface">
                <CardContent className="pt-6">
                  <div>
                    <p className="text-sm text-slate-400">In Transit</p>
                    <p className="text-2xl font-bold text-purple-400">
                      {metrics.inTransit}
                    </p>
                  </div>
                </CardContent>
              </Card>
              <Card className="border-border bg-surface">
                <CardContent className="pt-6">
                  <div>
                    <p className="text-sm text-slate-400">Delivered</p>
                    <p className="text-2xl font-bold text-green-400">
                      {metrics.delivered}
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card className="border-border bg-surface">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Your Orders</CardTitle>
                    <CardDescription>
                      {outletTransfers.length} transfer requests
                    </CardDescription>
                  </div>
                  <Select
                    value={sortBy}
                    onValueChange={(value: any) => setSortBy(value)}
                  >
                    <SelectTrigger className="w-32 bg-slate-800 border-slate-600">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-800 border-slate-600">
                      <SelectItem value="date">Newest First</SelectItem>
                      <SelectItem value="status">By Status</SelectItem>
                      <SelectItem value="priority">By Priority</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardHeader>
              <CardContent>
                {outletTransfers.length === 0 ? (
                  <p className="text-center py-8 text-slate-400">
                    No orders yet. Create your first order above.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {outletTransfers.map((transfer) => (
                      <div
                        key={transfer.id}
                        onClick={() => setSelectedTransfer(transfer)}
                        className="p-4 border border-border rounded-lg hover:border-slate-500 cursor-pointer transition-colors space-y-3 bg-surface"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <Badge
                                variant="outline"
                                className={getStatusColor(transfer.status)}
                              >
                                {getStatusIcon(transfer.status)}
                                <span className="ml-1 capitalize">
                                  {transfer.status.replace(/_/g, "")}
                                </span>
                              </Badge>
                              {transfer.priority === "urgent" && (
                                <Badge
                                  variant="destructive"
                                  className="text-xs"
                                >
                                  URGENT
                                </Badge>
                              )}
                            </div>
                            <p className="font-semibold">
                              Order #{transfer.id}
                            </p>
                            <p className="text-sm text-slate-400">
                              {transfer.reason}
                            </p>
                            <p className="text-xs text-slate-500">
                              {outletNameById.get(transfer.fromOutlet) ||
                                transfer.fromOutlet}{" "}
                              →{" "}
                              {outletNameById.get(transfer.toOutlet) ||
                                transfer.toOutlet}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-semibold text-slate-200">
                              {transfer.lines.length} item
                              {transfer.lines.length !== 1 ? "s" : ""}
                            </p>
                            <p className="text-xs text-slate-400">
                              {format(
                                parseISO(transfer.requestedAt),
                                "MMM d, HH:mm",
                              )}
                            </p>
                          </div>
                        </div>
                        {transfer.expectedDeliveryDate && (
                          <div className="text-xs text-slate-400">
                            Expected delivery:{" "}
                            {isToday(parseISO(transfer.expectedDeliveryDate))
                              ? "Today"
                              : isTomorrow(
                                    parseISO(transfer.expectedDeliveryDate),
                                  )
                                ? "Tomorrow"
                                : format(
                                    parseISO(transfer.expectedDeliveryDate),
                                    "MMM d",
                                  )}{" "}
                            at{" "}
                            {format(
                              parseISO(transfer.expectedDeliveryDate),
                              "HH:mm",
                            )}
                          </div>
                        )}
                        <div className="text-xs font-mono bg-slate-800/20 px-2 py-1 rounded text-slate-300">
                          {transfer.lines
                            .map((line) => line.productName)
                            .join(",")}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {selectedTransfer && (
              <Card className="border-border bg-surface">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>Order Details</CardTitle>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setSelectedTransfer(null)}
                    >
                      ✕
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-slate-400">Order ID</p>
                      <p className="font-mono">{selectedTransfer.id}</p>
                    </div>
                    <div>
                      <p className="text-sm text-slate-400">Status</p>
                      <Badge
                        className={getStatusColor(selectedTransfer.status)}
                      >
                        {selectedTransfer.status}
                      </Badge>
                    </div>
                    <div>
                      <p className="text-sm text-slate-400">Requested</p>
                      <p>
                        {format(
                          parseISO(selectedTransfer.requestedAt),
                          "MMM d, HH:mm",
                        )}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-slate-400">Priority</p>
                      <Badge
                        variant={
                          selectedTransfer.priority === "urgent"
                            ? "destructive"
                            : "secondary"
                        }
                      >
                        {selectedTransfer.priority}
                      </Badge>
                    </div>
                  </div>
                  {selectedTransfer.approvedBy && (
                    <div className="p-3 border border-border rounded bg-slate-800/20">
                      <p className="text-sm text-slate-400">Approved by</p>
                      <p className="font-semibold">
                        {selectedTransfer.approvedBy}{" "}
                        {selectedTransfer.approvedAt && (
                          <span className="text-xs text-slate-400 ml-2">
                            (
                            {format(
                              parseISO(selectedTransfer.approvedAt),
                              "MMM d HH:mm",
                            )}
                            )
                          </span>
                        )}
                      </p>
                    </div>
                  )}
                  <div className="rounded-lg border border-border bg-slate-800/20 p-3 space-y-2">
                    <div className="text-sm font-semibold">Recipe Matching</div>
                    {selectedRecipeMatches.length === 0 ? (
                      <div className="text-xs text-slate-400">
                        No items to match.
                      </div>
                    ) : (
                      selectedRecipeMatches.map(({ line, stored, options }) => (
                        <div
                          key={line.id}
                          className="flex items-center justify-between gap-3"
                        >
                          <div className="min-w-0">
                            <div className="text-xs font-medium truncate">
                              {line.productName}
                            </div>
                            <div className="text-[11px] text-slate-400">
                              {stored ? stored.title : "No recipe linked"}
                            </div>
                          </div>
                          <Select
                            value={stored?.recipeId || ""}
                            onValueChange={(value) => {
                              const match = options.find(
                                (opt) => opt.recipeId === value,
                              );
                              if (!match) return;
                              setRecipeLinks((prev) => ({
                                ...prev,
                                [selectedTransfer.id]: {
                                  ...(prev[selectedTransfer.id] || {}),
                                  [line.id]: match,
                                },
                              }));
                            }}
                          >
                            <SelectTrigger className="w-56 bg-slate-800 border-slate-600 text-xs">
                              <SelectValue placeholder="Select recipe" />
                            </SelectTrigger>
                            <SelectContent className="bg-slate-800 border-slate-600">
                              {options.map((opt) => (
                                <SelectItem
                                  key={opt.recipeId}
                                  value={opt.recipeId}
                                >
                                  {opt.title} ({Math.round(opt.score * 100)}%)
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          {!options.length && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-xs"
                              onClick={() => {
                                const draft = saveDraftRecipe(line.productName);
                                setRecipeLinks((prev) => ({
                                  ...prev,
                                  [selectedTransfer.id]: {
                                    ...(prev[selectedTransfer.id] || {}),
                                    [line.id]: {
                                      recipeId: draft.id,
                                      title: draft.title,
                                      score: 1,
                                    },
                                  },
                                }));
                              }}
                            >
                              Create Draft
                            </Button>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                  <div>
                    <h4 className="font-semibold mb-3">Items</h4>
                    <Table>
                      <TableHeader>
                        <TableRow className="hover:bg-transparent">
                          <TableHead className="text-slate-300">
                            Product
                          </TableHead>
                          <TableHead className="text-right text-slate-300">
                            Qty
                          </TableHead>
                          <TableHead className="text-right text-slate-300">
                            Unit Price
                          </TableHead>
                          <TableHead className="text-right text-slate-300">
                            Total
                          </TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {selectedTransfer.lines.map((line) => (
                          <TableRow
                            key={line.id}
                            className="hover:bg-slate-800/30"
                          >
                            <TableCell>{line.productName}</TableCell>
                            <TableCell className="text-right">
                              {line.quantity} {line.unitOfMeasure}
                            </TableCell>
                            <TableCell className="text-right">
                              ${line.unitCost.toFixed(2)}
                            </TableCell>
                            <TableCell className="text-right font-semibold">
                              ${(line.quantity * line.unitCost).toFixed(2)}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="production" className="space-y-6 mt-6">
            <Card className="border-border bg-surface">
              <CardHeader>
                <CardTitle>Aggregated Production</CardTitle>
                <CardDescription>
                  Combined prep items across all commissary orders by day.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {productionBatches.length === 0 ? (
                  <div className="text-sm text-slate-400">
                    No production batches yet.
                  </div>
                ) : (
                  productionBatches.map((batch) => (
                    <div
                      key={batch.id}
                      className="rounded-lg border border-border/20 bg-background/40 p-4 space-y-3"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <div className="text-sm font-semibold">
                            {batch.itemName}
                          </div>
                          <div className="text-xs text-slate-400">
                            {batch.date} • {batch.total} {batch.unit}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Input
                            placeholder="Assign cart ID"
                            value={cartAssignments[batch.id] || ""}
                            onChange={(e) =>
                              setCartAssignments((prev) => ({
                                ...prev,
                                [batch.id]: e.target.value,
                              }))
                            }
                            className="h-8 w-40 bg-slate-800 border-slate-600 text-xs"
                          />
                          <Badge variant="outline" className="text-xs">
                            {batch.lines.length} orders
                          </Badge>
                        </div>
                      </div>
                      <div className="rounded-md border border-border/20 overflow-hidden">
                        <Table>
                          <TableHeader>
                            <TableRow className="hover:bg-transparent">
                              <TableHead className="text-slate-300">
                                Order
                              </TableHead>
                              <TableHead className="text-slate-300">
                                Outlet
                              </TableHead>
                              <TableHead className="text-right text-slate-300">
                                Qty
                              </TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {batch.lines.map((line, idx) => (
                              <TableRow
                                key={`${batch.id}-${idx}`}
                                className="hover:bg-slate-800/30"
                              >
                                <TableCell className="font-mono text-xs">
                                  {line.transferId}
                                </TableCell>
                                <TableCell className="text-xs">
                                  {outletNameById.get(line.outletId) ||
                                    line.outletId}
                                </TableCell>
                                <TableCell className="text-right text-xs">
                                  {line.quantity} {batch.unit}
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="analytics" className="space-y-6 mt-6">
            <div className="grid gap-4 md:grid-cols-2">
              <Card className="border-border bg-surface">
                <CardHeader>
                  <CardTitle className="text-base">
                    Order Value by Status
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {outletTransfers.map((transfer) => {
                    const value = transfer.lines.reduce(
                      (sum, line) => sum + line.quantity * line.unitCost,
                      0,
                    );
                    return (
                      <div
                        key={transfer.id}
                        className="flex justify-between items-center"
                      >
                        <div>
                          <p className="text-sm font-medium">
                            {transfer.id} ({transfer.status})
                          </p>
                        </div>
                        <p className="font-semibold">${value.toFixed(2)}</p>
                      </div>
                    );
                  })}
                  <div className="pt-3 border-t border-border">
                    <p className="text-sm font-medium text-slate-400">
                      Total Value
                    </p>
                    <p className="text-2xl font-bold">
                      ${metrics.totalValue.toFixed(2)}
                    </p>
                  </div>
                </CardContent>
              </Card>
              <Card className="border-border bg-surface">
                <CardHeader>
                  <CardTitle className="text-base">Order Timeline</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between items-center py-2 px-3 bg-slate-800/20 rounded">
                    <p className="text-sm">Today Orders</p>
                    <p className="font-semibold">
                      {
                        outletTransfers.filter((t) =>
                          isToday(parseISO(t.requestedAt)),
                        ).length
                      }
                    </p>
                  </div>
                  <div className="flex justify-between items-center py-2 px-3 bg-slate-800/20 rounded">
                    <p className="text-sm">This Week</p>
                    <p className="font-semibold">{outletTransfers.length}</p>
                  </div>
                  <div className="flex justify-between items-center py-2 px-3 bg-slate-800/20 rounded">
                    <p className="text-sm">Average Order Value</p>
                    <p className="font-semibold">
                      $
                      {outletTransfers.length > 0
                        ? (metrics.totalValue / outletTransfers.length).toFixed(
                            2,
                          )
                        : "0.00"}
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}
