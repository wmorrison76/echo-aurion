import React from "react";

import { addDays, format } from "date-fns";
import { CheckCircle2, Eye, Package, RefreshCw } from "lucide-react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import { useToast } from "@/hooks/use-toast";

interface OrderItem {
  id: string;
  ingredient: string;
  quantity: number;
  unit: string;
  cost: number;
  source: "commissary" | "vendor";
  events: string[];
}

interface CombinedOrder {
  id: string;
  deliveryDate: string; /* ISO date */
  events: string[];
  items: OrderItem[];
  totalCost: number;
  status: "draft" | "pending_approval" | "approved" | "ordered";
  aiAssumptions: string[];
}

export default function BanquetOrderCombiner() {
  const { toast } = useToast();
  const [orders, setOrders] = React.useState<CombinedOrder[]>([]);
  const [loading, setLoading] = React.useState(false);

  const loadOrders = React.useCallback(async () => {
    setLoading(true);
    try {
      const deliveryDate = format(addDays(new Date(), 1), "yyyy-MM-dd");
      const mockOrders: CombinedOrder[] = [
        {
          id: "order-1",
          deliveryDate,
          events: ["Wedding Reception", "Corporate Dinner"],
          items: [
            {
              id: "item-1",
              ingredient: "Filet Mignon",
              quantity: 200,
              unit: "portions",
              cost: 4500,
              source: "vendor",
              events: ["Wedding Reception", "Corporate Dinner"],
            },
          ],
          totalCost: 4500,
          status: "pending_approval",
          aiAssumptions: [
            "Consolidated lines due to identical items across events",
            "Delivery scheduled 24 hours before prep start",
            "Vendor pricing assumed volume discount",
          ],
        },
      ];
      setOrders(mockOrders);
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    void loadOrders();
  }, [loadOrders]);

  const handleApprove = React.useCallback(
    async (orderId: string) => {
      setOrders((prev) =>
        prev.map((o) => (o.id === orderId ? { ...o, status: "approved" } : o)),
      );
      toast({
        title: "Order Approved",
        description:
          "Order marked approved (wire to purchasing workflow next).",
      });
    },
    [toast],
  );

  return (
    <div className="p-4 space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-3">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-6 w-6 text-primary" />
                Banquet Order Combiner
              </CardTitle>
              <CardDescription>
                Consolidates orders from multiple events for efficient
                purchasing
              </CardDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => void loadOrders()}
              disabled={loading}
            >
              <RefreshCw
                className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`}
              />
              Refresh
            </Button>
          </div>
        </CardHeader>

        <CardContent>
          <div className="space-y-4">
            {orders.map((order) => (
              <Card key={order.id}>
                <CardHeader>
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <CardTitle className="text-lg">Combined Order</CardTitle>
                      <CardDescription>
                        Delivery:{" "}
                        {format(new Date(order.deliveryDate), "MMM d, yyyy")} •{" "}
                        {order.events.length} events
                      </CardDescription>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary">{order.status}</Badge>
                      {order.status === "pending_approval" ? (
                        <Button
                          size="sm"
                          onClick={() => void handleApprove(order.id)}
                        >
                          <CheckCircle2 className="h-4 w-4 mr-2" />
                          Approve
                        </Button>
                      ) : null}
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="mb-4">
                    <p className="text-sm font-medium mb-2">Events</p>
                    <div className="flex flex-wrap gap-2">
                      {order.events.map((event) => (
                        <Badge key={event} variant="outline">
                          {event}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  <div className="mb-4">
                    <p className="text-sm font-medium mb-2">Assumptions</p>
                    <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                      {order.aiAssumptions.map((a, idx) => (
                        <li key={idx}>{a}</li>
                      ))}
                    </ul>
                  </div>

                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Ingredient</TableHead>
                        <TableHead>Quantity</TableHead>
                        <TableHead>Source</TableHead>
                        <TableHead>Cost</TableHead>
                        <TableHead>Events</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {order.items.map((item) => (
                        <TableRow key={item.id}>
                          <TableCell className="font-medium">
                            {item.ingredient}
                          </TableCell>
                          <TableCell>
                            {item.quantity} {item.unit}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">{item.source}</Badge>
                          </TableCell>
                          <TableCell>${item.cost.toLocaleString()}</TableCell>
                          <TableCell>
                            <div className="flex flex-wrap gap-1">
                              {item.events.map((event) => (
                                <Badge
                                  key={event}
                                  variant="secondary"
                                  className="text-xs"
                                >
                                  {event}
                                </Badge>
                              ))}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>

                  <div className="mt-4 flex items-center justify-between pt-4 border-t">
                    <p className="text-lg font-bold">
                      Total Cost: ${order.totalCost.toLocaleString()}
                    </p>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => alert("Wire details drawer")}
                    >
                      <Eye className="h-4 w-4 mr-2" />
                      View Details
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}

            {orders.length === 0 ? (
              <div className="text-center text-muted-foreground py-10">
                No combined orders.
              </div>
            ) : null}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
