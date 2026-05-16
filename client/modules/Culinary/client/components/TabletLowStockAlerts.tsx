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
  AlertTriangle,
  Plus,
  Check,
  AlertCircle,
  Loader2,
  TrendingDown,
  Zap,
  ShoppingCart,
} from "lucide-react";
import { format } from "date-fns";

interface LowStockAlert {
  id: string;
  itemName: string;
  currentQuantity: number;
  unit: string;
  reorderLevel?: number;
  suggestedQuantity?: number;
  employeeId: string;
  notes?: string;
  status: "pending" | "acknowledged" | "ordered" | "resolved";
  createdAt: string;
}

export interface TabletLowStockAlertsProps {
  deviceId: string;
  onClose?: () => void;
}

export function TabletLowStockAlerts({
  deviceId,
  onClose,
}: TabletLowStockAlertsProps) {
  const { toast } = useToast();

  const [alerts, setAlerts] = useState<LowStockAlert[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateAlert, setShowCreateAlert] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [newAlert, setNewAlert] = useState({
    itemName: "",
    currentQuantity: 0,
    unit: "pcs",
    reorderLevel: undefined as number | undefined,
    suggestedQuantity: undefined as number | undefined,
    notes: "",
  });

  useEffect(() => {
    loadAlerts();
  }, [deviceId]);

  const loadAlerts = useCallback(async () => {
    try {
      setIsLoading(true);
      const response = await fetch(
        `/api/tablet/inventory/low-stock?deviceId=${deviceId}`,
      );
      if (!response.ok) throw new Error("Failed to load alerts");

      const data = await response.json();
      setAlerts(data.alerts || []);
    } catch (error) {
      console.warn("Failed to load low stock alerts:", error);
    } finally {
      setIsLoading(false);
    }
  }, [deviceId]);

  const handleCreateAlert = async () => {
    if (!newAlert.itemName.trim()) {
      toast({
        title: "Validation",
        description: "Please enter item name",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsSubmitting(true);

      const response = await fetch("/api/tablet/inventory/low-stock", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          deviceId,
          itemName: newAlert.itemName,
          currentQuantity: newAlert.currentQuantity,
          unit: newAlert.unit,
          reorderLevel: newAlert.reorderLevel,
          suggestedQuantity:
            newAlert.suggestedQuantity ||
            newAlert.reorderLevel ||
            newAlert.currentQuantity,
          employeeId: localStorage.getItem("tablet:employeeId") || "Unknown",
          notes: newAlert.notes,
        }),
      });

      if (!response.ok) throw new Error("Failed to create alert");

      toast({
        title: "Alert Created",
        description: `Low stock alert created for ${newAlert.itemName}. Purchasing team will be notified.`,
      });

      setNewAlert({
        itemName: "",
        currentQuantity: 0,
        unit: "pcs",
        reorderLevel: undefined,
        suggestedQuantity: undefined,
        notes: "",
      });

      setShowCreateAlert(false);
      await loadAlerts();
    } catch (error) {
      toast({
        title: "Error",
        description:
          error instanceof Error ? error.message : "Failed to create alert",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateAlertStatus = async (
    alertId: string,
    newStatus: string,
  ) => {
    try {
      const response = await fetch(
        `/api/tablet/inventory/low-stock/${alertId}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: newStatus }),
        },
      );

      if (!response.ok) throw new Error("Failed to update alert status");

      toast({
        title: "Success",
        description: "Alert status updated",
      });

      await loadAlerts();
    } catch (error) {
      toast({
        title: "Error",
        description:
          error instanceof Error ? error.message : "Failed to update alert",
        variant: "destructive",
      });
    }
  };

  const getAlertBorder = (status: string) => {
    switch (status) {
      case "pending":
        return "border-l-4 border-l-red-500";
      case "acknowledged":
        return "border-l-4 border-l-amber-500";
      case "ordered":
        return "border-l-4 border-l-blue-500";
      case "resolved":
        return "border-l-4 border-l-emerald-500";
      default:
        return "border-l-4 border-l-slate-500";
    }
  };

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case "pending":
        return "bg-red-100 dark:bg-red-500/20 text-red-800 dark:text-red-300 border border-red-200 dark:border-red-500/30";
      case "acknowledged":
        return "bg-amber-100 dark:bg-amber-500/20 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-500/30";
      case "ordered":
        return "bg-blue-100 dark:bg-blue-500/20 text-blue-800 dark:text-blue-300 border border-blue-200 dark:border-blue-500/30";
      case "resolved":
        return "bg-emerald-100 dark:bg-emerald-500/20 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-500/30";
      default:
        return "bg-slate-100 dark:bg-slate-500/20 text-slate-800 dark:text-slate-300";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "pending":
        return <AlertTriangle className="w-4 h-4" />;
      case "acknowledged":
        return <Zap className="w-4 h-4" />;
      case "ordered":
        return <ShoppingCart className="w-4 h-4" />;
      case "resolved":
        return <Check className="w-4 h-4" />;
      default:
        return <AlertCircle className="w-4 h-4" />;
    }
  };

  const pendingAlerts = alerts.filter((a) => a.status === "pending");
  const acknowledgedAlerts = alerts.filter((a) => a.status === "acknowledged");
  const orderedAlerts = alerts.filter((a) => a.status === "ordered");
  const resolvedAlerts = alerts.filter((a) => a.status === "resolved");

  return (
    <div className="w-full max-w-5xl mx-auto space-y-6">
      <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
        <CardHeader>
          <div className="flex items-start justify-between gap-6">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <TrendingDown className="w-6 h-6 text-red-600 dark:text-red-400" />
                <CardTitle className="dark:text-slate-50">
                  Low Stock Alerts
                </CardTitle>
              </div>
              <CardDescription className="dark:text-slate-400">
                Manage inventory requests and order suggestions
              </CardDescription>
            </div>
            <div className="flex items-center gap-3 px-4 py-2 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 rounded-lg">
              <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400" />
              <div>
                <p className="text-xs text-red-600 dark:text-red-400 font-medium">
                  Active Alerts
                </p>
                <p className="text-lg font-bold text-red-900 dark:text-red-50">
                  {pendingAlerts.length}
                </p>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {isLoading ? (
            <div className="flex justify-center items-center h-48">
              <Loader2 className="w-8 h-8 animate-spin text-emerald-600 dark:text-emerald-400" />
            </div>
          ) : alerts.length === 0 ? (
            <Alert className="border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800">
              <AlertCircle className="h-4 w-4 text-slate-500 dark:text-slate-400" />
              <AlertDescription className="text-slate-700 dark:text-slate-300">
                No low stock alerts. All inventory levels are healthy.
              </AlertDescription>
            </Alert>
          ) : (
            <div className="space-y-6">
              {pendingAlerts.length > 0 && (
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400" />
                    <h3 className="font-bold text-lg text-slate-900 dark:text-slate-50">
                      Pending Alerts ({pendingAlerts.length})
                    </h3>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {pendingAlerts.map((alert) => (
                      <AlertCard
                        key={alert.id}
                        alert={alert}
                        border={getAlertBorder(alert.status)}
                        badgeColor={getStatusBadgeColor(alert.status)}
                        statusIcon={getStatusIcon(alert.status)}
                        onStatusChange={handleUpdateAlertStatus}
                      />
                    ))}
                  </div>
                </div>
              )}

              {acknowledgedAlerts.length > 0 && (
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <Zap className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                    <h3 className="font-bold text-lg text-slate-900 dark:text-slate-50">
                      Acknowledged ({acknowledgedAlerts.length})
                    </h3>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {acknowledgedAlerts.map((alert) => (
                      <AlertCard
                        key={alert.id}
                        alert={alert}
                        border={getAlertBorder(alert.status)}
                        badgeColor={getStatusBadgeColor(alert.status)}
                        statusIcon={getStatusIcon(alert.status)}
                        onStatusChange={handleUpdateAlertStatus}
                      />
                    ))}
                  </div>
                </div>
              )}

              {orderedAlerts.length > 0 && (
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <ShoppingCart className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                    <h3 className="font-bold text-lg text-slate-900 dark:text-slate-50">
                      Ordered ({orderedAlerts.length})
                    </h3>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {orderedAlerts.map((alert) => (
                      <AlertCard
                        key={alert.id}
                        alert={alert}
                        border={getAlertBorder(alert.status)}
                        badgeColor={getStatusBadgeColor(alert.status)}
                        statusIcon={getStatusIcon(alert.status)}
                        onStatusChange={handleUpdateAlertStatus}
                      />
                    ))}
                  </div>
                </div>
              )}

              {resolvedAlerts.length > 0 && (
                <div className="space-y-4 opacity-75">
                  <div className="flex items-center gap-2">
                    <Check className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                    <h3 className="font-bold text-lg text-slate-900 dark:text-slate-50">
                      Resolved ({resolvedAlerts.length})
                    </h3>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {resolvedAlerts.map((alert) => (
                      <AlertCard
                        key={alert.id}
                        alert={alert}
                        border={getAlertBorder(alert.status)}
                        badgeColor={getStatusBadgeColor(alert.status)}
                        statusIcon={getStatusIcon(alert.status)}
                        onStatusChange={handleUpdateAlertStatus}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="flex gap-2 pt-6 border-t border-slate-200 dark:border-slate-800">
            {onClose && (
              <Button
                variant="outline"
                onClick={onClose}
                className="dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                Close
              </Button>
            )}
            <Button
              onClick={() => setShowCreateAlert(true)}
              className="bg-red-600 hover:bg-red-700 dark:bg-red-500 dark:hover:bg-red-600 text-white ml-auto"
            >
              <Plus className="w-4 h-4 mr-2" />
              Create Alert
            </Button>
          </div>
        </CardContent>
      </Card>

      <Dialog open={showCreateAlert} onOpenChange={setShowCreateAlert}>
        <DialogContent className="sm:max-w-lg dark:bg-slate-900 dark:border-slate-800">
          <DialogHeader>
            <DialogTitle className="dark:text-slate-50">
              Create Low Stock Alert
            </DialogTitle>
            <DialogDescription className="dark:text-slate-400">
              Flag an item that is running low and needs to be reordered
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div>
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                Item Name *
              </label>
              <Input
                placeholder="e.g., Tomatoes, Chicken Breast"
                value={newAlert.itemName}
                onChange={(e) =>
                  setNewAlert({ ...newAlert, itemName: e.target.value })
                }
                className="dark:bg-slate-800 dark:border-slate-700 dark:text-slate-50"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                  Current Qty *
                </label>
                <Input
                  type="number"
                  placeholder="0"
                  value={newAlert.currentQuantity}
                  onChange={(e) =>
                    setNewAlert({
                      ...newAlert,
                      currentQuantity: parseFloat(e.target.value) || 0,
                    })
                  }
                  className="dark:bg-slate-800 dark:border-slate-700 dark:text-slate-50"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                  Unit *
                </label>
                <Select
                  value={newAlert.unit}
                  onValueChange={(value) =>
                    setNewAlert({ ...newAlert, unit: value })
                  }
                >
                  <SelectTrigger className="dark:bg-slate-800 dark:border-slate-700 dark:text-slate-50">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="dark:bg-slate-800 dark:border-slate-700">
                    <SelectItem value="pcs">pcs</SelectItem>
                    <SelectItem value="lbs">lbs</SelectItem>
                    <SelectItem value="kg">kg</SelectItem>
                    <SelectItem value="oz">oz</SelectItem>
                    <SelectItem value="ml">ml</SelectItem>
                    <SelectItem value="L">L</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                Reorder Level (Optional)
              </label>
              <Input
                type="number"
                placeholder="Minimum quantity threshold"
                value={newAlert.reorderLevel || ""}
                onChange={(e) =>
                  setNewAlert({
                    ...newAlert,
                    reorderLevel: e.target.value
                      ? parseFloat(e.target.value)
                      : undefined,
                  })
                }
                className="dark:bg-slate-800 dark:border-slate-700 dark:text-slate-50"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                Suggested Order Qty (Optional)
              </label>
              <Input
                type="number"
                placeholder="Quantity to order"
                value={newAlert.suggestedQuantity || ""}
                onChange={(e) =>
                  setNewAlert({
                    ...newAlert,
                    suggestedQuantity: e.target.value
                      ? parseFloat(e.target.value)
                      : undefined,
                  })
                }
                className="dark:bg-slate-800 dark:border-slate-700 dark:text-slate-50"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                Notes (Optional)
              </label>
              <textarea
                placeholder="Any details about why this item is low..."
                value={newAlert.notes}
                onChange={(e) =>
                  setNewAlert({ ...newAlert, notes: e.target.value })
                }
                className="w-full px-4 py-2 border border-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-50 rounded-lg text-sm focus:ring-2 focus:ring-red-500 focus:border-transparent"
                rows={2}
              />
            </div>

            <div className="flex gap-3 pt-4">
              <Button
                variant="outline"
                onClick={() => setShowCreateAlert(false)}
                className="dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                Cancel
              </Button>
              <Button
                onClick={handleCreateAlert}
                disabled={isSubmitting}
                className="flex-1 bg-red-600 hover:bg-red-700 dark:bg-red-500 dark:hover:bg-red-600 text-white"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <AlertTriangle className="w-4 h-4 mr-2" />
                    Create Alert
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function AlertCard({
  alert,
  border,
  badgeColor,
  statusIcon,
  onStatusChange,
}: {
  alert: LowStockAlert;
  border: string;
  badgeColor: string;
  statusIcon: React.ReactNode;
  onStatusChange: (alertId: string, newStatus: string) => void;
}) {
  return (
    <Card
      className={`bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 overflow-hidden hover:shadow-lg dark:hover:shadow-slate-900/50 transition-all ${border}`}
    >
      <CardContent className="pt-6">
        <div className="space-y-4">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <h3 className="font-bold text-lg text-slate-900 dark:text-slate-50">
                {alert.itemName}
              </h3>
            </div>
            <span
              className={`px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1 flex-shrink-0 ${badgeColor}`}
            >
              {statusIcon}
              <span className="capitalize">{alert.status}</span>
            </span>
          </div>

          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="bg-slate-50 dark:bg-slate-800 p-3 rounded">
              <p className="text-slate-600 dark:text-slate-400 text-xs">
                Current Qty
              </p>
              <p className="font-bold text-lg text-slate-900 dark:text-slate-50">
                {alert.currentQuantity}
                <span className="text-xs text-slate-500 dark:text-slate-400 ml-1">
                  {alert.unit}
                </span>
              </p>
            </div>
            {alert.reorderLevel && (
              <div className="bg-slate-50 dark:bg-slate-800 p-3 rounded">
                <p className="text-slate-600 dark:text-slate-400 text-xs">
                  Reorder Level
                </p>
                <p className="font-bold text-lg text-slate-900 dark:text-slate-50">
                  {alert.reorderLevel}
                  <span className="text-xs text-slate-500 dark:text-slate-400 ml-1">
                    {alert.unit}
                  </span>
                </p>
              </div>
            )}
          </div>

          {alert.suggestedQuantity && (
            <div className="bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 p-3 rounded">
              <p className="text-emerald-700 dark:text-emerald-300 text-xs font-medium">
                Suggested Order Qty
              </p>
              <p className="font-bold text-emerald-900 dark:text-emerald-50">
                {alert.suggestedQuantity} {alert.unit}
              </p>
            </div>
          )}

          {alert.notes && (
            <div className="text-xs text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-800 p-3 rounded">
              <p className="font-medium text-slate-900 dark:text-slate-50 mb-1">
                Notes:
              </p>
              <p>{alert.notes}</p>
            </div>
          )}

          <p className="text-xs text-slate-500 dark:text-slate-400">
            Created: {format(new Date(alert.createdAt), "MMM d, HH:mm")}
          </p>

          {alert.status !== "resolved" && (
            <div className="flex gap-2 pt-4 border-t border-slate-200 dark:border-slate-800">
              {alert.status === "pending" && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onStatusChange(alert.id, "acknowledged")}
                  className="flex-1 text-xs dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                >
                  <Zap className="w-3 h-3 mr-1" />
                  Acknowledge
                </Button>
              )}
              {alert.status !== "ordered" && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onStatusChange(alert.id, "ordered")}
                  className="flex-1 text-xs dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                >
                  <ShoppingCart className="w-3 h-3 mr-1" />
                  Order
                </Button>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={() => onStatusChange(alert.id, "resolved")}
                className="flex-1 text-xs dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                <Check className="w-3 h-3 mr-1" />
                Resolve
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
