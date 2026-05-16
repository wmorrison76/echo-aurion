/**
 * Orders Panel Component
 * Genesis E compliance - Ordering with per-BEO vs consolidated modes
 * Supports commissary/butcher/production kitchen routing
 */

import React from "react";
import {
  Package,
  ArrowRight,
  Info,
  CheckCircle,
  Clock,
  XCircle,
  AlertTriangle,
} from "lucide-react";
import type {
  OrderLine,
  ProductionNode,
  GenesisBEO,
} from "../types/genesis-integration";
import { cn } from "@/lib/glass";

interface OrdersPanelProps {
  orders: OrderLine[];
  productionNodes: ProductionNode[];
  beos: GenesisBEO[];
  orderMode: "per-beo" | "consolidated";
  onModeChange: (mode: "per-beo" | "consolidated") => void;
  onTraceClick?: (orderId: string) => void;
  onReceivingClick?: (orderId: string, lineId: string) => void;
  onExceptionClick?: (orderId: string) => void;
}

function fmtDay(iso?: string): string {
  if (!iso) return "—";
  try {
    const d = new Date(iso);
    if (!Number.isFinite(d.getTime())) return "—";
    return d.toLocaleDateString([], { month: "short", day: "numeric" });
  } catch {
    return "—";
  }
}

export function OrdersPanel({
  orders,
  productionNodes,
  beos,
  orderMode,
  onModeChange,
  onTraceClick,
  onReceivingClick,
  onExceptionClick,
}: OrdersPanelProps) {
  const [expandedOrders, setExpandedOrders] = React.useState<Set<string>>(
    new Set(),
  );
  const [selectedNodeId, setSelectedNodeId] = React.useState<string | null>(
    null,
  );

  // Group orders by mode
  const groupedOrders = React.useMemo(() => {
    if (orderMode === "per-beo") {
      // Group by source BEO
      const groups: Record<string, OrderLine[]> = {};
      orders.forEach((order) => {
        order.sourceBEODs.forEach((beoId) => {
          if (!groups[beoId]) groups[beoId] = [];
          groups[beoId].push(order);
        });
      });
      return groups;
    } else {
      // Group by vendor + delivery window + receiving node
      const groups: Record<string, OrderLine[]> = {};
      orders.forEach((order) => {
        const key = `${order.vendorId || "no-vendor"}-${order.receivingNodeId}-${order.status}`;
        if (!groups[key]) groups[key] = [];
        groups[key].push(order);
      });
      return groups;
    }
  }, [orders, orderMode]);

  // Filter by production node
  const filteredOrders = React.useMemo(() => {
    if (!selectedNodeId) return orders;
    return orders.filter(
      (order) =>
        order.producingNodeId === selectedNodeId ||
        order.receivingNodeId === selectedNodeId ||
        order.payingNodeId === selectedNodeId,
    );
  }, [orders, selectedNodeId]);

  // Get production node name
  const getNodeName = (nodeId: string): string => {
    return productionNodes.find((n) => n.id === nodeId)?.name || nodeId;
  };

  // Get BEO name
  const getBEOName = (beoId: string): string => {
    return beos.find((b) => b.id === beoId)?.name || beoId;
  };

  // Get status icon
  const getStatusIcon = (status: OrderLine["status"]) => {
    switch (status) {
      case "received":
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      case "ordered":
        return <Clock className="w-4 h-4 text-blue-600" />;
      case "pending":
        return <Clock className="w-4 h-4 text-gray-600" />;
      case "exception":
        return <AlertTriangle className="w-4 h-4 text-red-600" />;
      default:
        return <Info className="w-4 h-4 text-gray-400" />;
    }
  };

  const statusBadge = (o: OrderLine) => {
    const base =
      "inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[11px] capitalize";
    if (o.status === "received")
      return (
        <span
          className={cn(
            base,
            "bg-green-500/10 text-green-600 border-green-500/25",
          )}
        >
          {getStatusIcon(o.status)} received
        </span>
      );
    if (o.status === "ordered")
      return (
        <span
          className={cn(
            base,
            "bg-blue-500/10 text-blue-600 border-blue-500/25",
          )}
        >
          {getStatusIcon(o.status)} ordered
        </span>
      );
    if (o.status === "exception")
      return (
        <span
          className={cn(base, "bg-red-500/10 text-red-600 border-red-500/25")}
        >
          {getStatusIcon(o.status)} exception
        </span>
      );
    return (
      <span
        className={cn(
          base,
          "bg-foreground/5 text-foreground/70 border-border/30",
        )}
      >
        {getStatusIcon(o.status)} pending
      </span>
    );
  };

  const toggleOrderExpansion = (orderId: string) => {
    setExpandedOrders((prev) => {
      const next = new Set(prev);
      if (next.has(orderId)) {
        next.delete(orderId);
      } else {
        next.add(orderId);
      }
      return next;
    });
  };

  return (
    <div className="h-full bg-background flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border/20">
        <div>
          <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
            <Package className="w-5 h-5 text-primary" />
            Orders
          </h2>
          <p className="text-xs text-foreground/60 mt-1">
            {orders.length} order line{orders.length !== 1 ? "s" : ""} •{" "}
            {productionNodes.length} production node
            {productionNodes.length !== 1 ? "s" : ""}
          </p>
        </div>

        {/* Mode Toggle */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => onModeChange("per-beo")}
            className={cn(
              "px-3 py-1.5 rounded-lg text-sm font-medium transition-colors",
              orderMode === "per-beo"
                ? "bg-primary text-white"
                : "bg-background/40 border border-border/20 text-foreground/60 hover:text-foreground",
            )}
          >
            Per-BEO
          </button>
          <button
            onClick={() => onModeChange("consolidated")}
            className={cn(
              "px-3 py-1.5 rounded-lg text-sm font-medium transition-colors",
              orderMode === "consolidated"
                ? "bg-primary text-white"
                : "bg-background/40 border border-border/20 text-foreground/60 hover:text-foreground",
            )}
          >
            Consolidated
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2 p-4 border-b border-border/20">
        <span className="text-xs text-foreground/60">Filter by node:</span>
        <select
          value={selectedNodeId || ""}
          onChange={(e) => setSelectedNodeId(e.target.value || null)}
          className="px-2 py-1 rounded border border-border/20 bg-background text-sm"
        >
          <option value="">All Nodes</option>
          {productionNodes.map((node) => (
            <option key={node.id} value={node.id}>
              {node.name}
            </option>
          ))}
        </select>
      </div>

      {/* Orders List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {orderMode === "per-beo"
          ? // Per-BEO view
            Object.entries(groupedOrders).map(([beoId, beoOrders]) => (
              <div
                key={beoId}
                className="rounded-lg border border-border/20 bg-background/40 overflow-hidden"
              >
                <div className="p-3 border-b border-border/20 bg-background/60">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-semibold text-foreground">
                        {getBEOName(beoId)}
                      </p>
                      <p className="text-xs text-foreground/60">
                        BEO ID: {beoId}
                      </p>
                    </div>
                    <span className="text-xs text-foreground/60">
                      {beoOrders.length} lines
                    </span>
                  </div>
                </div>
                <div className="p-2 space-y-1">
                  {beoOrders.map((order) => (
                    <div
                      key={order.id}
                      className="flex items-center justify-between p-2 rounded hover:bg-background/60 transition-colors"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          {getStatusIcon(order.status)}
                          <span className="text-sm font-medium text-foreground">
                            {order.id}
                          </span>
                          {statusBadge(order)}
                        </div>
                        <div className="mt-1 text-xs text-foreground/60 space-y-0.5">
                          <div>
                            Producing:{" "}
                            <span className="font-medium">
                              {getNodeName(order.producingNodeId)}
                            </span>
                          </div>
                          <div>
                            Receiving:{" "}
                            <span className="font-medium">
                              {getNodeName(order.receivingNodeId)}
                            </span>
                          </div>
                          <div>
                            Paying:{" "}
                            <span className="font-medium">
                              {getNodeName(order.payingNodeId)}
                            </span>
                          </div>
                          <div>
                            Needed-by:{" "}
                            <span className="font-medium">
                              {fmtDay(order.neededByAt)}
                            </span>{" "}
                            • Expected:{" "}
                            <span className="font-medium">
                              {fmtDay(order.expectedDeliveryAt)}
                            </span>
                            {typeof order.leadTimeDays === "number" ? (
                              <>
                                {" "}
                                • Lead:{" "}
                                <span className="font-medium">
                                  {order.leadTimeDays}d
                                </span>
                              </>
                            ) : null}
                          </div>
                          {order.status === "exception" && order.exception ? (
                            <div className="text-red-600">
                              Exception: {order.exception.kind}
                              {typeof order.exception.quantityMissing ===
                              "number"
                                ? ` • missing ${order.exception.quantityMissing}`
                                : ""}
                              {order.exception.note
                                ? ` • ${order.exception.note}`
                                : ""}
                            </div>
                          ) : null}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {order.traceId && (
                          <button
                            onClick={() => onTraceClick?.(order.id)}
                            className="p-1.5 rounded hover:bg-background/60"
                            title="View trace"
                          >
                            <Info className="w-4 h-4 text-foreground/60" />
                          </button>
                        )}
                        {order.status === "ordered" && (
                          <button
                            onClick={() =>
                              onReceivingClick?.(order.id, order.id)
                            }
                            className="px-2 py-1 rounded text-xs font-medium bg-primary/10 text-primary hover:bg-primary/20"
                          >
                            Receive
                          </button>
                        )}
                        {order.status === "ordered" && (
                          <button
                            onClick={() => onExceptionClick?.(order.id)}
                            className="px-2 py-1 rounded text-xs font-medium bg-red-500/10 text-red-600 hover:bg-red-500/15"
                            title="Mark exception (short ship)"
                          >
                            Short ship
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))
          : // Consolidated view
            Object.entries(groupedOrders).map(([key, groupOrders]) => (
              <div
                key={key}
                className="rounded-lg border border-border/20 bg-background/40 overflow-hidden"
              >
                <div className="p-3 border-b border-border/20 bg-background/60">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-semibold text-foreground">
                        Vendor: {groupOrders[0].vendorId || "Internal"}
                      </p>
                      <p className="text-xs text-foreground/60">
                        Receiving: {getNodeName(groupOrders[0].receivingNodeId)}{" "}
                        • {groupOrders.length} lines
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {getStatusIcon(groupOrders[0].status)}
                      <span className="text-xs text-foreground/60 capitalize">
                        {groupOrders[0].status}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="p-2 space-y-1">
                  {groupOrders.map((order) => (
                    <div
                      key={order.id}
                      className="flex items-center justify-between p-2 rounded hover:bg-background/60 transition-colors"
                    >
                      <div className="flex-1">
                        <div className="text-sm font-medium text-foreground">
                          {order.id}
                        </div>
                        <div className="mt-1 text-xs text-foreground/60 space-y-0.5">
                          <div>
                            Source BEOs:{" "}
                            <span className="font-medium">
                              {order.sourceBEODs
                                .map((id) => getBEOName(id))
                                .join(", ")}
                            </span>
                          </div>
                          <div>
                            Producing:{" "}
                            <span className="font-medium">
                              {getNodeName(order.producingNodeId)}
                            </span>{" "}
                            → Receiving:{" "}
                            <span className="font-medium">
                              {getNodeName(order.receivingNodeId)}
                            </span>
                          </div>
                          <div>
                            Quantity:{" "}
                            <span className="font-medium">
                              {order.quantity} {order.unit}
                            </span>
                          </div>
                          <div>
                            Needed-by:{" "}
                            <span className="font-medium">
                              {fmtDay(order.neededByAt)}
                            </span>{" "}
                            • Expected:{" "}
                            <span className="font-medium">
                              {fmtDay(order.expectedDeliveryAt)}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {order.traceId && (
                          <button
                            onClick={() => onTraceClick?.(order.id)}
                            className="p-1.5 rounded hover:bg-background/60"
                            title="View trace"
                          >
                            <Info className="w-4 h-4 text-foreground/60" />
                          </button>
                        )}
                        {order.status === "ordered" && (
                          <button
                            onClick={() =>
                              onReceivingClick?.(order.id, order.id)
                            }
                            className="px-2 py-1 rounded text-xs font-medium bg-primary/10 text-primary hover:bg-primary/20"
                          >
                            Receive
                          </button>
                        )}
                        {order.status === "ordered" && (
                          <button
                            onClick={() => onExceptionClick?.(order.id)}
                            className="px-2 py-1 rounded text-xs font-medium bg-red-500/10 text-red-600 hover:bg-red-500/15"
                          >
                            Short ship
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}

        {Object.keys(groupedOrders).length === 0 && (
          <div className="flex items-center justify-center p-8 text-center">
            <div>
              <Package className="w-8 h-8 text-foreground/30 mx-auto mb-2" />
              <p className="text-sm text-foreground/60">No orders found</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default OrdersPanel;
