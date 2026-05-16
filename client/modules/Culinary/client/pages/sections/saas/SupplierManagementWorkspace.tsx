import React, { useCallback, useMemo, useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LineChart,
  Line,
} from "recharts";
import {
  ShoppingCart,
  Plus,
  Package,
  TrendingUp,
  AlertCircle,
  CheckCircle,
  Clock,
  Truck,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { formatCurrency } from "./shared";
import {
  getSupplierMetrics,
  getSupplierConnectionStatus,
  getAllPurchaseOrders,
  getPurchaseOrdersByStatus,
  getTotalOrderAmount,
  getTotalOrderCount,
  getAverageOrderSize,
  rankSuppliersByReliability,
  rankSuppliersByQuality,
  analyzeSupplierCosts,
  getAllRFQs,
  getRFQsByStatus,
  getInStockProducts,
} from "@/lib/supplier-api-utils";
import { MOCK_PURCHASE_ORDERS, SUPPLIER_API_CONFIGS } from "@/data/supplier-api";

type SupplierTab = "overview" | "orders" | "inventory" | "rfq" | "performance";

export default function SupplierManagementWorkspace() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<SupplierTab>("overview");
  const [selectedSupplier, setSelectedSupplier] = useState<string>("sup-sysco");
  const [isCreatingOrder, setIsCreatingOrder] = useState(false);

  const suppliers = rankSuppliersByReliability();
  const allOrders = getAllPurchaseOrders();
  const allRFQs = getAllRFQs();
  const pendingRFQs = getRFQsByStatus("responded");

  // Period for analysis
  const period = useMemo(
    () => ({
      startDate: Date.now() - 90 * 24 * 60 * 60 * 1000,
      endDate: Date.now(),
    }),
    [],
  );

  const totalOrderAmount = getTotalOrderAmount(period);
  const totalOrderCount = getTotalOrderCount(period);
  const averageOrderSize = getAverageOrderSize(period);

  // Supplier performance data
  const supplierPerformanceData = useMemo(
    () =>
      suppliers.slice(0, 5).map((supplier) => ({
        name: supplier.supplierName.split(" ")[0],
        reliability: supplier.onTimeDeliveryPercent,
        quality: supplier.qualityScore * 20,
      })),
    [suppliers],
  );

  // Order status breakdown
  const orderStatusData = useMemo(() => {
    const statuses = [
      "draft",
      "submitted",
      "confirmed",
      "preparing",
      "shipped",
      "delivered",
    ];
    return statuses.map((status) => ({
      name: status.charAt(0).toUpperCase() + status.slice(1),
      count: getPurchaseOrdersByStatus(status).length,
    }));
  }, []);

  const selectedSupplierMetrics = useMemo(
    () => getSupplierMetrics(selectedSupplier),
    [selectedSupplier],
  );

  const selectedSupplierOrders = useMemo(
    () =>
      MOCK_PURCHASE_ORDERS.filter(
        (o) => o.supplierId === selectedSupplier,
      ),
    [selectedSupplier],
  );

  const supplierCostAnalysis = useMemo(
    () => analyzeSupplierCosts(selectedSupplier, period),
    [selectedSupplier, period],
  );

  const handleCreateOrder = useCallback(() => {
    toast({
      title: "Order Created",
      description: "Purchase order has been created and is ready to submit",
    });
    setIsCreatingOrder(false);
  }, [toast]);

  return (
    <div className="space-y-6 pb-8">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">
          Supplier Management & Procurement
        </h1>
        <p className="text-sm text-muted-foreground">
          Manage suppliers, orders, inventory, and performance metrics
        </p>
      </div>

      {/* Key Metrics */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Order Value
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalOrderAmount)}</div>
            <p className="text-xs text-muted-foreground mt-1">Last 90 days</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Active Orders
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalOrderCount}</div>
            <p className="text-xs text-muted-foreground mt-1">Total purchases</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Avg Order Size
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(averageOrderSize)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">per order</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Pending RFQs
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pendingRFQs.length}</div>
            <p className="text-xs text-muted-foreground mt-1">awaiting response</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs
        value={activeTab}
        onValueChange={(v) => setActiveTab(v as SupplierTab)}
        className="space-y-4"
      >
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="orders">Orders</TabsTrigger>
          <TabsTrigger value="inventory">Inventory</TabsTrigger>
          <TabsTrigger value="rfq">RFQ</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-6 md:grid-cols-2">
            {/* Supplier Performance Chart */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Top Suppliers</CardTitle>
                <CardDescription>By reliability score</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={supplierPerformanceData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="reliability" fill="#3b82f6" name="Reliability %" />
                    <Bar dataKey="quality" fill="#10b981" name="Quality" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Order Status Distribution */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Order Status</CardTitle>
                <CardDescription>All purchase orders</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={orderStatusData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis
                      dataKey="name"
                      tick={{ fontSize: 12 }}
                      angle={-45}
                      textAnchor="end"
                      height={80}
                    />
                    <YAxis tick={{ fontSize: 12 }} />
                    <Tooltip />
                    <Line type="monotone" dataKey="count" stroke="#8b5cf6" />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* Active Suppliers */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Suppliers</CardTitle>
              <CardDescription>Ranked by reliability</CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea>
                <div className="space-y-2">
                  {suppliers.slice(0, 5).map((supplier) => (
                    <div
                      key={supplier.supplierId}
                      className="flex items-center justify-between p-3 border rounded hover:bg-muted/50 cursor-pointer"
                      onClick={() => setSelectedSupplier(supplier.supplierId)}
                    >
                      <div className="flex-1">
                        <p className="font-medium text-sm">{supplier.supplierName}</p>
                        <div className="flex gap-3 mt-1 text-xs text-muted-foreground">
                          <span>
                            Reliability:{" "}
                            {supplier.onTimeDeliveryPercent.toFixed(1)}%
                          </span>
                          <span>Quality: {supplier.qualityScore.toFixed(1)}/5</span>
                        </div>
                      </div>
                      <Badge
                        variant={
                          getSupplierConnectionStatus(supplier.supplierId) ===
                          "connected"
                            ? "default"
                            : "outline"
                        }
                      >
                        {getSupplierConnectionStatus(supplier.supplierId)}
                      </Badge>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Orders Tab */}
        <TabsContent value="orders" className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <h2 className="text-xl font-semibold">Purchase Orders</h2>
              <p className="text-sm text-muted-foreground">Manage all orders</p>
            </div>
            <Dialog open={isCreatingOrder} onOpenChange={setIsCreatingOrder}>
              <DialogTrigger asChild>
                <Button className="gap-1">
                  <Plus className="h-4 w-4" />
                  New Order
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>Create Purchase Order</DialogTitle>
                  <DialogDescription>
                    Create a new purchase order from a supplier
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Supplier</label>
                    <Select>
                      <SelectTrigger>
                        <SelectValue placeholder="Select supplier" />
                      </SelectTrigger>
                      <SelectContent>
                        {suppliers.map((supplier) => (
                          <SelectItem
                            key={supplier.supplierId}
                            value={supplier.supplierId}
                          >
                            {supplier.supplierName}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Expected Delivery</label>
                    <Input type="date" />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsCreatingOrder(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleCreateOrder}>Create Order</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>

          {/* Orders Table */}
          <Card>
            <CardContent className="pt-6">
              <ScrollArea>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Order ID</TableHead>
                      <TableHead>Supplier</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Delivery Date</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {selectedSupplierOrders.map((order) => (
                      <TableRow key={order.id}>
                        <TableCell className="font-mono text-xs">
                          {order.orderId || order.id.slice(0, 8)}
                        </TableCell>
                        <TableCell className="text-sm">
                          {order.supplierName}
                        </TableCell>
                        <TableCell className="font-medium">
                          {formatCurrency(order.totalAmount)}
                        </TableCell>
                        <TableCell className="text-sm">
                          {new Date(order.estimatedDeliveryDate).toLocaleDateString()}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              order.status === "delivered"
                                ? "default"
                                : order.status === "cancelled"
                                  ? "destructive"
                                  : "outline"
                            }
                          >
                            {order.status}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Inventory Tab */}
        <TabsContent value="inventory" className="space-y-4">
          <div className="space-y-1">
            <h2 className="text-xl font-semibold">Product Inventory</h2>
            <p className="text-sm text-muted-foreground">
              Available products from {suppliers[0]?.supplierName}
            </p>
          </div>

          <Card>
            <CardContent className="pt-6">
              <ScrollArea>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Product</TableHead>
                      <TableHead>SKU</TableHead>
                      <TableHead>Price</TableHead>
                      <TableHead>Lead Time</TableHead>
                      <TableHead>Availability</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {getInStockProducts("sup-sysco")
                      .slice(0, 10)
                      .map((product) => (
                        <TableRow key={product.id}>
                          <TableCell className="font-medium text-sm">
                            {product.productName}
                          </TableCell>
                          <TableCell className="text-xs font-mono">
                            {product.sku}
                          </TableCell>
                          <TableCell className="font-medium">
                            {formatCurrency(product.currentPrice)}
                          </TableCell>
                          <TableCell className="text-sm">
                            {product.leadTimeDays} days
                          </TableCell>
                          <TableCell>
                            <Badge variant="default" className="text-xs">
                              {product.availability}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                  </TableBody>
                </Table>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        {/* RFQ Tab */}
        <TabsContent value="rfq" className="space-y-4">
          <div className="space-y-1">
            <h2 className="text-xl font-semibold">Request for Quote</h2>
            <p className="text-sm text-muted-foreground">
              Active RFQs and supplier responses
            </p>
          </div>

          {pendingRFQs.map((rfq) => (
            <Card key={rfq.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-base">
                      RFQ {rfq.id.slice(0, 8)}
                    </CardTitle>
                    <CardDescription className="text-xs mt-1">
                      {rfq.recipients.length} suppliers invited
                    </CardDescription>
                  </div>
                  <Badge>
                    {rfq.responses.length} response{rfq.responses.length !== 1
                      ? "s"
                      : ""}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="text-sm font-medium mb-2">Items Requested</p>
                  <ul className="text-xs text-muted-foreground space-y-1">
                    {rfq.items.slice(0, 3).map((item, i) => (
                      <li key={i}>
                        • {item.ingredientName} ({item.quantity} {item.unit})
                      </li>
                    ))}
                  </ul>
                </div>

                {rfq.responses.length > 0 && (
                  <div>
                    <p className="text-sm font-medium mb-2">Best Quote</p>
                    <div className="p-2 bg-green-50 dark:bg-green-950/20 rounded text-xs">
                      <p className="font-medium">
                        {
                          rfq.responses.reduce((best, current) =>
                            current.totalPrice < best.totalPrice ? current : best,
                          ).supplierName
                        }
                      </p>
                      <p className="text-green-600 dark:text-green-400 font-semibold">
                        {formatCurrency(
                          Math.min(...rfq.responses.map((r) => r.totalPrice)),
                        )}
                      </p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        {/* Performance Tab */}
        <TabsContent value="performance" className="space-y-4">
          <div className="space-y-1">
            <h2 className="text-xl font-semibold">Supplier Performance</h2>
            <p className="text-sm text-muted-foreground">
              Metrics for {selectedSupplierMetrics?.supplierName}
            </p>
          </div>

          {selectedSupplierMetrics && (
            <div className="grid gap-4 md:grid-cols-3">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    On-Time Delivery
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {selectedSupplierMetrics.onTimeDeliveryPercent.toFixed(1)}%
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {selectedSupplierMetrics.totalOrdersHistory} orders tracked
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Quality Score
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {selectedSupplierMetrics.qualityScore.toFixed(1)}/5
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {selectedSupplierMetrics.qualityScore >= 4.5
                      ? "Excellent"
                      : selectedSupplierMetrics.qualityScore >= 3.5
                        ? "Good"
                        : "Fair"}
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Avg Lead Time
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {selectedSupplierMetrics.averageLeadTime.toFixed(1)}d
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">days</p>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Cost Analysis */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Cost Analysis</CardTitle>
              <CardDescription>90-day spending summary</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Total Spent</p>
                  <p className="text-lg font-semibold">
                    {formatCurrency(supplierCostAnalysis.totalOrderAmount)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Order Count</p>
                  <p className="text-lg font-semibold">
                    {supplierCostAnalysis.totalOrderCount}
                  </p>
                </div>
              </div>

              {supplierCostAnalysis.topProducts.length > 0 && (
                <div>
                  <p className="text-sm font-medium mb-2">Top Products</p>
                  <div className="space-y-1 text-xs">
                    {supplierCostAnalysis.topProducts.slice(0, 5).map((product) => (
                      <div key={product.sku} className="flex justify-between">
                        <span className="text-muted-foreground">
                          {product.productName}
                        </span>
                        <span className="font-medium">
                          {formatCurrency(product.totalSpent)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
