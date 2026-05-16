import React, { useCallback, useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  AlertTriangle,
  AlertCircle,
  CheckCircle2,
  RefreshCw,
} from "lucide-react";

export interface ParAlert {
  id: string;
  itemId: string;
  itemName: string;
  currentQty: number;
  parLevel: number;
  variance: number;
  alertType: "below_par" | "above_par" | "critical";
  createdAt: string;
}

export interface ParLevelAlertsProps {
  organizationId: string;
  outletId: string;
  onAutoTransfer?: (itemId: string, quantity: number) => void;
  onError?: (error: string) => void;
}

export function ParLevelAlerts({
  organizationId,
  outletId,
  onAutoTransfer,
  onError,
}: ParLevelAlertsProps) {
  const [alerts, setAlerts] = useState<ParAlert[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const fetchAlerts = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch(
        `/api/mobile-inventory/par-levels/${outletId}`,
      );
      if (!response.ok) {
        throw new Error("Failed to fetch par level alerts");
      }
      const data = await response.json();
      setAlerts(data);
    } catch (error) {
      onError?.(
        error instanceof Error ? error.message : "Failed to fetch alerts",
      );
    } finally {
      setLoading(false);
    }
  }, [outletId, onError]);

  useEffect(() => {
    fetchAlerts();
  }, [organizationId, outletId, fetchAlerts]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchAlerts();
    setRefreshing(false);
  }, [fetchAlerts]);

  const criticalAlerts = alerts.filter(
    (alert) => alert.alertType === "critical",
  );
  const belowParAlerts = alerts.filter(
    (alert) => alert.alertType === "below_par",
  );
  const aboveParAlerts = alerts.filter(
    (alert) => alert.alertType === "above_par",
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Par Level Alerts</h2>
        <Button
          variant="outline"
          size="sm"
          onClick={handleRefresh}
          disabled={refreshing}
        >
          <RefreshCw
            className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`}
          />
        </Button>
      </div>
      {loading ? (
        <p className="text-center text-muted-foreground">Loading alerts...</p>
      ) : alerts.length === 0 ? (
        <Alert>
          <CheckCircle2 className="h-4 w-4 text-green-600" />
          <AlertDescription>All items are at par level</AlertDescription>
        </Alert>
      ) : (
        <>
          {criticalAlerts.length > 0 && (
            <div className="space-y-2">
              <h3 className="font-semibold text-red-700">Critical Low Stock</h3>
              {criticalAlerts.map((alert) => (
                <AlertCard key={alert.id} alert={alert} />
              ))}
            </div>
          )}
          {belowParAlerts.length > 0 && (
            <div className="space-y-2">
              <h3 className="font-semibold text-yellow-700">Below Par</h3>
              {belowParAlerts.map((alert) => (
                <AlertCard
                  key={alert.id}
                  alert={alert}
                  onAutoTransfer={onAutoTransfer}
                />
              ))}
            </div>
          )}
          {aboveParAlerts.length > 0 && (
            <details>
              <summary className="cursor-pointer font-semibold text-green-700">
                Above Par ({aboveParAlerts.length})
              </summary>
              <div className="space-y-2 mt-2">
                {aboveParAlerts.map((alert) => (
                  <AlertCard key={alert.id} alert={alert} />
                ))}
              </div>
            </details>
          )}
        </>
      )}
    </div>
  );
}

function AlertCard({
  alert,
  onAutoTransfer,
}: {
  alert: ParAlert;
  onAutoTransfer?: (itemId: string, quantity: number) => void;
}) {
  return (
    <Card
      className={`p-3 border-l-4 ${
        alert.alertType === "critical"
          ? "border-l-red-500 bg-red-50"
          : alert.alertType === "below_par"
            ? "border-l-yellow-500 bg-yellow-50"
            : "border-l-green-500 bg-green-50"
      }`}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            {alert.alertType === "critical" && (
              <AlertTriangle className="w-4 h-4 text-red-500" />
            )}
            {alert.alertType === "below_par" && (
              <AlertCircle className="w-4 h-4 text-yellow-500" />
            )}
            {alert.alertType === "above_par" && (
              <CheckCircle2 className="w-4 h-4 text-green-500" />
            )}
            <p className="font-semibold text-sm">{alert.itemName}</p>
          </div>
          <div className="text-sm text-muted-foreground ml-6">
            <div>
              Current: <span className="font-medium">{alert.currentQty}</span> |
              Par: <span className="font-medium">{alert.parLevel}</span>
            </div>
            <div>
              Variance:{" "}
              <span
                className={
                  alert.variance < 0
                    ? "text-red-600 font-medium"
                    : "text-green-600"
                }
              >
                {alert.variance > 0 ? "+" : ""}
                {alert.variance}
              </span>
            </div>
          </div>
        </div>
        {alert.alertType === "below_par" && (
          <Button
            variant="outline"
            size="sm"
            className="ml-2"
            onClick={() => {
              onAutoTransfer?.(alert.itemId, Math.abs(alert.variance));
            }}
          >
            Reorder
          </Button>
        )}
      </div>
    </Card>
  );
}
