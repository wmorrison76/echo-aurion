import React, { useEffect, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import {
  ShoppingCart,
  Plus,
  Trash2,
  Check,
  AlertCircle,
  Loader2,
  TrendingDown,
  Package,
} from "lucide-react";
import { format } from "date-fns";

interface ReceivingItem {
  id: string;
  itemName: string;
  quantityExpected: number;
  quantityReceived: number;
  unit: string;
  condition: "good" | "damaged" | "partial" | "short";
  notes?: string;
}

interface ReceivingOrder {
  id: string;
  orderId: string;
  supplier?: string;
  expectedDeliveryDate: string;
  items: ReceivingItem[];
  status: "pending" | "in-progress" | "completed";
  employeeId?: string;
  createdAt: string;
}

export interface TabletReceivingCheckInProps {
  deviceId: string;
  onClose?: () => void;
}

const CONDITION_OPTIONS = [
  { value: "good", label: "Good", color: "bg-emerald-100" },
  { value: "damaged", label: "Damaged", color: "bg-red-100" },
  { value: "partial", label: "Partial", color: "bg-amber-100" },
  { value: "short", label: "Short", color: "bg-orange-100" },
];

export function TabletReceivingCheckIn({
  deviceId,
  onClose,
}: TabletReceivingCheckInProps) {
  const { toast } = useToast();

  const [orders, setOrders] = useState<ReceivingOrder[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCheckInForm, setShowCheckInForm] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<ReceivingOrder | null>(
    null
  );
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [checkinItems, setCheckinItems] = useState<ReceivingItem[]>([]);

  useEffect(() => {
    loadOrders();
  }, [deviceId]);

  const loadOrders = useCallback(async () => {
    try {
      setIsLoading(true);
      const response = await fetch(
        `/api/tablet/receiving/pending?deviceId=${deviceId}`
      );
      if (!response.ok) throw new Error("Failed to load orders");

      const data = await response.json();
      setOrders(data.orders || []);
    } catch (error) {
      console.warn("Failed to load receiving orders:", error);
      toast({
        title: "Note",
        description: "Unable to load receiving orders",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, [deviceId, toast]);

  const handleStartCheckIn = (order: ReceivingOrder) => {
    setSelectedOrder(order);
    setCheckinItems(
      order.items.map((item) => ({
        ...item,
        quantityReceived: item.quantityExpected,
        condition: "good",
      }))
    );
    setShowCheckInForm(true);
  };

  const handleUpdateItemQuantity = (
    itemId: string,
    quantityReceived: number
  ) => {
    setCheckinItems((prev) =>
      prev.map((item) =>
        item.id === itemId ? { ...item, quantityReceived } : item
      )
    );
  };

  const handleUpdateItemCondition = (
    itemId: string,
    condition: "good" | "damaged" | "partial" | "short"
  ) => {
    setCheckinItems((prev) =>
      prev.map((item) =>
        item.id === itemId ? { ...item, condition } : item
      )
    );
  };

  const handleUpdateItemNotes = (itemId: string, notes: string) => {
    setCheckinItems((prev) =>
      prev.map((item) =>
        item.id === itemId ? { ...item, notes } : item
      )
    );
  };

  const handleSubmitCheckIn = async () => {
    if (!selectedOrder) return;

    if (checkinItems.length === 0) {
      toast({
        title: "Validation",
        description: "Please add items to check in",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsSubmitting(true);

      const response = await fetch("/api/tablet/receiving/check-in", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          deviceId,
          orderId: selectedOrder.id,
          items: checkinItems.map((item) => ({
            id: item.id,
            itemName: item.itemName,
            quantityExpected: item.quantityExpected,
            quantityReceived: item.quantityReceived,
            unit: item.unit,
            condition: item.condition,
            notes: item.notes,
          })),
          employeeId: localStorage.getItem("tablet:employeeId") || "Unknown",
        }),
      });

      if (!response.ok) throw new Error("Failed to submit check-in");

      const data = await response.json();

      toast({
        title: "Success",
        description: `Checked in ${checkinItems.length} items from order ${selectedOrder.orderId}`,
      });

      setShowCheckInForm(false);
      setSelectedOrder(null);
      setCheckinItems([]);
      await loadOrders();
    } catch (error) {
      toast({
        title: "Error",
        description:
          error instanceof Error ? error.message : "Failed to submit check-in",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const getConditionColor = (condition: string) => {
    const option = CONDITION_OPTIONS.find((o) => o.value === condition);
    return option?.color || "bg-slate-100";
  };

  const getConditionLabel = (condition: string) => {
    const option = CONDITION_OPTIONS.find((o) => o.value === condition);
    return option?.label || condition;
  };

  return (
    <div className="w-full max-w-5xl mx-auto space-y-6">
      <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
        <CardHeader>
          <div className="flex items-start justify-between gap-6">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <ShoppingCart className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                <CardTitle className="dark:text-slate-50">
                  Receiving & Check-In
                </CardTitle>
              </div>
              <CardDescription className="dark:text-slate-400">
                Confirm received orders and check in items
              </CardDescription>
            </div>
            <div className="flex items-center gap-3 px-4 py-2 bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/20 rounded-lg">
              <Package className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              <div>
                <p className="text-xs text-blue-600 dark:text-blue-400 font-medium">
                  Pending Orders
                </p>
                <p className="text-lg font-bold text-blue-900 dark:text-blue-50">
                  {orders.filter((o) => o.status === "pending").length}
                </p>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {isLoading ? (
            <div className="flex justify-center items-center h-48">
              <Loader2 className="w-8 h-8 animate-spin text-blue-600 dark:text-blue-400" />
            </div>
          ) : orders.length === 0 ? (
            <Alert className="border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800">
              <AlertCircle className="h-4 w-4 text-slate-500 dark:text-slate-400" />
              <AlertDescription className="text-slate-700 dark:text-slate-300">
                No pending receiving orders. All orders have been checked in.
              </AlertDescription>
            </Alert>
          ) : (
            <div className="space-y-4">
              {orders
                .filter((o) => o.status === "pending")
                .map((order) => (
                  <div
                    key={order.id}
                    className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-6 hover:shadow-md dark:hover:shadow-slate-900/50 transition-all"
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <h3 className="font-bold text-lg text-slate-900 dark:text-slate-50">
                          Order {order.orderId}
                        </h3>
                        {order.supplier && (
                          <p className="text-sm text-slate-600 dark:text-slate-400">
                            From: {order.supplier}
                          </p>
                        )}
                      </div>
                      <span className="px-3 py-1 bg-blue-100 dark:bg-blue-500/20 text-blue-800 dark:text-blue-300 rounded-full text-xs font-semibold">
                        {order.items.length} items
                      </span>
                    </div>

                    <div className="mb-4 space-y-2">
                      <p className="text-sm text-slate-600 dark:text-slate-400">
                        Expected Delivery:{" "}
                        <span className="font-semibold text-slate-900 dark:text-slate-50">
                          {format(
                            new Date(order.expectedDeliveryDate),
                            "MMM d, yyyy"
                          )}
                        </span>
                      </p>
                      <div className="flex gap-2">
                        {order.items.map((item) => (
                          <span
                            key={item.id}
                            className="text-xs bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 px-2 py-1 rounded"
                          >
                            {item.itemName}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div className="flex gap-2 pt-4 border-t border-slate-200 dark:border-slate-800">
                      <Button
                        onClick={() => handleStartCheckIn(order)}
                        className="flex-1 bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 text-white"
                      >
                        <Check className="w-4 h-4 mr-2" />
                        Check In Items
                      </Button>
                    </div>
                  </div>
                ))}
            </div>
          )}

          {orders.filter((o) => o.status === "completed").length > 0 && (
            <div className="mt-8 pt-8 border-t border-slate-200 dark:border-slate-800">
              <h3 className="font-bold text-lg text-slate-900 dark:text-slate-50 mb-4 opacity-75">
                Completed Orders
              </h3>
              <div className="space-y-3">
                {orders
                  .filter((o) => o.status === "completed")
                  .map((order) => (
                    <div
                      key={order.id}
                      className="flex items-center justify-between p-3 bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 rounded-lg opacity-75"
                    >
                      <div className="flex items-center gap-2">
                        <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                        <span className="text-sm font-medium text-emerald-900 dark:text-emerald-50">
                          Order {order.orderId}
                        </span>
                      </div>
                      <span className="text-xs text-emerald-700 dark:text-emerald-300">
                        {format(new Date(order.createdAt), "MMM d, HH:mm")}
                      </span>
                    </div>
                  ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={showCheckInForm} onOpenChange={setShowCheckInForm}>
        <DialogContent className="sm:max-w-4xl dark:bg-slate-900 dark:border-slate-800 max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="dark:text-slate-50">
              Check-In Items
              {selectedOrder && (
                <span className="text-sm font-normal text-slate-600 dark:text-slate-400 ml-2">
                  Order {selectedOrder.orderId}
                </span>
              )}
            </DialogTitle>
            <DialogDescription className="dark:text-slate-400">
              Verify quantities and condition for each item
            </DialogDescription>
          </DialogHeader>

          {selectedOrder && (
            <div className="space-y-6 py-4">
              <div className="bg-slate-50 dark:bg-slate-800 p-4 rounded-lg">
                <h3 className="font-semibold text-slate-900 dark:text-slate-50 mb-2">
                  Order Details
                </h3>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  Supplier: <span className="font-medium">{selectedOrder.supplier || "Unknown"}</span>
                </p>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  Expected:{" "}
                  <span className="font-medium">
                    {format(
                      new Date(selectedOrder.expectedDeliveryDate),
                      "MMM d, yyyy"
                    )}
                  </span>
                </p>
              </div>

              <div className="space-y-4">
                <h3 className="font-semibold text-slate-900 dark:text-slate-50">
                  Items to Check In
                </h3>
                <div className="space-y-4">
                  {checkinItems.map((item) => (
                    <div
                      key={item.id}
                      className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-4 space-y-4"
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <h4 className="font-semibold text-slate-900 dark:text-slate-50">
                            {item.itemName}
                          </h4>
                          <p className="text-sm text-slate-600 dark:text-slate-400">
                            Expected: {item.quantityExpected} {item.unit}
                          </p>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                          <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                            Quantity Received *
                          </label>
                          <Input
                            type="number"
                            value={item.quantityReceived}
                            onChange={(e) =>
                              handleUpdateItemQuantity(
                                item.id,
                                parseFloat(e.target.value) || 0
                              )
                            }
                            className="dark:bg-slate-800 dark:border-slate-700 dark:text-slate-50"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                            Condition *
                          </label>
                          <Select
                            value={item.condition}
                            onValueChange={(value: any) =>
                              handleUpdateItemCondition(item.id, value)
                            }
                          >
                            <SelectTrigger className="dark:bg-slate-800 dark:border-slate-700 dark:text-slate-50">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="dark:bg-slate-800 dark:border-slate-700">
                              {CONDITION_OPTIONS.map((option) => (
                                <SelectItem key={option.value} value={option.value}>
                                  {option.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                            Status Badge
                          </label>
                          <div
                            className={`${getConditionColor(
                              item.condition
                            )} px-3 py-2 rounded text-sm font-medium text-center text-slate-700 dark:text-slate-300`}
                          >
                            {getConditionLabel(item.condition)}
                          </div>
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                          Notes (Optional)
                        </label>
                        <textarea
                          placeholder="Any issues or notes about this item..."
                          value={item.notes || ""}
                          onChange={(e) =>
                            handleUpdateItemNotes(item.id, e.target.value)
                          }
                          className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-50 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          rows={2}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex gap-3 pt-6 border-t border-slate-200 dark:border-slate-800">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowCheckInForm(false);
                    setSelectedOrder(null);
                    setCheckinItems([]);
                  }}
                  className="dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleSubmitCheckIn}
                  disabled={isSubmitting}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 text-white"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Submitting...
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4 mr-2" />
                      Complete Check-In
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
