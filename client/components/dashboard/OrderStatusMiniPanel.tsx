/**
 * Order Status Mini Panel
 * Shows order delivery status updates in dashboard
 */

import React, { useState, useEffect } from "react";
import { Truck, Package, CheckCircle2, Clock, AlertCircle } from "lucide-react";
import { maestroEventBus } from "@/modules/MaestroBQT/event-bus";
import { EVENT_TYPES } from "@/modules/MaestroBQT/event-bus";

export interface OrderStatus {
  id: string;
  poNumber: string;
  vendor: string;
  status: "waiting" | "checking" | "checked_in" | "delivered";
  timestamp: string;
  outletId?: string;
}

interface OrderStatusMiniPanelProps {
  className?: string;
}

export function OrderStatusMiniPanel({ className = "" }: OrderStatusMiniPanelProps) {
  const [orders, setOrders] = useState<OrderStatus[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Subscribe to order status events
    const unsubscribeArrived = maestroEventBus.subscribeTo(
      "order:delivery_arrived",
      (data: any) => {
        setOrders((prev) => {
          const existing = prev.find((o) => o.id === data.orderId);
          if (existing) {
            return prev.map((o) =>
              o.id === data.orderId
                ? { ...o, status: "waiting", timestamp: new Date().toISOString() }
                : o
            );
          }
          return [
            ...prev,
            {
              id: data.orderId || `order-${Date.now()}`,
              poNumber: data.poNumber || "Unknown",
              vendor: data.vendor || "Unknown Vendor",
              status: "waiting",
              timestamp: new Date().toISOString(),
              outletId: data.outletId,
            },
          ];
        });
      }
    );

    const unsubscribeChecking = maestroEventBus.subscribeTo(
      "order:checking_in",
      (data: any) => {
        setOrders((prev) =>
          prev.map((o) =>
            o.id === data.orderId
              ? { ...o, status: "checking", timestamp: new Date().toISOString() }
              : o
          )
        );
      }
    );

    const unsubscribeCheckedIn = maestroEventBus.subscribeTo(
      "order:checked_in",
      (data: any) => {
        setOrders((prev) =>
          prev.map((o) =>
            o.id === data.orderId
              ? { ...o, status: "checked_in", timestamp: new Date().toISOString() }
              : o
          )
        );
      }
    );

    const unsubscribeDelivered = maestroEventBus.subscribeTo(
      "order:delivered",
      (data: any) => {
        setOrders((prev) =>
          prev.map((o) =>
            o.id === data.orderId
              ? { ...o, status: "delivered", timestamp: new Date().toISOString() }
              : o
          )
        );
      }
    );

    return () => {
      unsubscribeArrived();
      unsubscribeChecking();
      unsubscribeCheckedIn();
      unsubscribeDelivered();
    };
  }, []);

  // Clean up old orders (older than 1 hour)
  useEffect(() => {
    const interval = setInterval(() => {
      const oneHourAgo = Date.now() - 60 * 60 * 1000;
      setOrders((prev) =>
        prev.filter(
          (o) => new Date(o.timestamp).getTime() > oneHourAgo
        )
      );
    }, 60000); // Check every minute

    return () => clearInterval(interval);
  }, []);

  const getStatusIcon = (status: OrderStatus["status"]) => {
    switch (status) {
      case "waiting":
        return <Clock className="h-3 w-3 text-amber-500" />;
      case "checking":
        return <Package className="h-3 w-3 text-blue-500" />;
      case "checked_in":
        return <CheckCircle2 className="h-3 w-3 text-green-500" />;
      case "delivered":
        return <Truck className="h-3 w-3 text-slate-500" />;
      default:
        return <AlertCircle className="h-3 w-3 text-slate-500" />;
    }
  };

  const getStatusText = (status: OrderStatus["status"]) => {
    switch (status) {
      case "waiting":
        return "Waiting for delivery";
      case "checking":
        return "Checking in...";
      case "checked_in":
        return "Checked in";
      case "delivered":
        return "Delivered";
      default:
        return "Unknown";
    }
  };

  const activeOrders = orders.filter(
    (o) => o.status === "waiting" || o.status === "checking"
  );
  const recentOrders = orders
    .filter((o) => o.status === "checked_in" || o.status === "delivered")
    .slice(0, 3);

  if (orders.length === 0) {
    return (
      <div className={`p-2 text-center text-foreground/60 ${className}`}>
        <div className="text-xs">No active orders</div>
      </div>
    );
  }

  return (
    <div className={`p-2 space-y-2 ${className}`}>
      {/* Active Orders */}
      {activeOrders.length > 0 && (
        <div className="space-y-1">
          <div className="text-xs font-semibold text-foreground/80 mb-1">
            Active Orders ({activeOrders.length})
          </div>
          {activeOrders.map((order) => (
            <div
              key={order.id}
              className="flex items-center gap-2 p-1.5 bg-surface/40 rounded text-xs"
            >
              {getStatusIcon(order.status)}
              <div className="flex-1 min-w-0">
                <div className="font-medium text-foreground truncate">
                  {order.poNumber}
                </div>
                <div className="text-foreground/60 truncate">
                  {order.vendor}
                </div>
              </div>
              <div className="text-foreground/60 text-xs">
                {getStatusText(order.status)}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Recent Orders */}
      {recentOrders.length > 0 && (
        <div className="space-y-1">
          <div className="text-xs font-semibold text-foreground/80 mb-1">
            Recent
          </div>
          {recentOrders.map((order) => (
            <div
              key={order.id}
              className="flex items-center gap-2 p-1.5 bg-surface/20 rounded text-xs opacity-75"
            >
              {getStatusIcon(order.status)}
              <div className="flex-1 min-w-0">
                <div className="font-medium text-foreground/80 truncate">
                  {order.poNumber}
                </div>
                <div className="text-foreground/50 truncate text-xs">
                  {order.vendor}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
