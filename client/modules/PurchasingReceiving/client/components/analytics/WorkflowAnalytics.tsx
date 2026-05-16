import React, { useMemo, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  BarChart,
  LineChart,
  PieChart,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Package,
  Clock,
} from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
export interface VendorMetrics {
  vendorId: string;
  vendorName: string;
  totalOrders: number;
  totalSpent: number;
  averageDeliveryDays: number;
  onTimeDeliveryPercent: number;
  qualityScore: number; // 0-100 priceComparison: number; // % vs market average
}
export interface CategoryCostAnalysis {
  category: string;
  totalCost: number;
  percentOfTotal: number;
  itemCount: number;
  trend: "up" | "down" | "stable";
  trendPercent: number;
}
export interface InventoryMetrics {
  productName: string;
  categoryCode: string;
  qtyOnHand: number;
  avgDailyUsage: number;
  daysOfStock: number;
  turnoverRate: number;
  carryingCost: number;
  status: "optimal" | "high" | "low" | "obsolete";
}
export interface PaymentMetrics {
  vendorName: string;
  totalInvoices: number;
  totalAmount: number;
  averagePaymentDays: number;
  earlyPaymentDiscount: number;
  latePaymentPercent: number;
}
interface WorkflowAnalyticsProps {
  vendors: VendorMetrics[];
  categories: CategoryCostAnalysis[];
  inventory: InventoryMetrics[];
  payments: PaymentMetrics[];
  period: "month" | "quarter" | "year";
  onPeriodChange: (period: string) => void;
}
export function WorkflowAnalytics({
  vendors,
  categories,
  inventory,
  payments,
  period = "month",
  onPeriodChange,
}: WorkflowAnalyticsProps) {
  const [activeTab, setActiveTab] = useState<
    "vendors" | "costs" | "inventory" | "payments"
  >("vendors");
  const vendorStats = useMemo(() => {
    if (vendors.length === 0) return { bestVendor: null, avgOnTime: 0 };
    const sorted = [...vendors].sort(
      (a, b) => b.onTimeDeliveryPercent - a.onTimeDeliveryPercent,
    );
    return {
      bestVendor: sorted[0],
      avgOnTime:
        vendors.reduce((sum, v) => sum + v.onTimeDeliveryPercent, 0) /
        vendors.length,
    };
  }, [vendors]);
  const costStats = useMemo(() => {
    const totalCost = categories.reduce((sum, c) => sum + c.totalCost, 0);
    const topCategory = [...categories].sort(
      (a, b) => b.totalCost - a.totalCost,
    )[0];
    return { totalCost, topCategory };
  }, [categories]);
  const inventoryStats = useMemo(() => {
    const lowStockItems = inventory.filter((i) => i.status === "low").length;
    const overStockItems = inventory.filter((i) => i.status === "high").length;
    const totalValue = inventory.reduce((sum, i) => sum + i.carryingCost, 0);
    const avgTurnover =
      inventory.length > 0
        ? inventory.reduce((sum, i) => sum + i.turnoverRate, 0) /
          inventory.length
        : 0;
    return { lowStockItems, overStockItems, totalValue, avgTurnover };
  }, [inventory]);
  const paymentStats = useMemo(() => {
    const avgPaymentDays =
      payments.length > 0
        ? payments.reduce((sum, p) => sum + p.averagePaymentDays, 0) /
          payments.length
        : 0;
    const totalDiscounts = payments.reduce(
      (sum, p) => sum + p.earlyPaymentDiscount,
      0,
    );
    return { avgPaymentDays, totalDiscounts };
  }, [payments]);
  return (
    <div className="space-y-6">
      {" "}
      {/* Period Selector and Summary Cards */}{" "}
      <div className="flex items-center justify-between gap-4">
        {" "}
        <div>
          {" "}
          <h2 className="text-2xl font-semibold tracking-tight text-cyan-100">
            {" "}
            Workflow Analytics{" "}
          </h2>{" "}
          <p className="text-sm text-cyan-200/70 mt-1">
            {" "}
            Detailed insights into your supply chain performance{" "}
          </p>{" "}
        </div>{" "}
        <Select value={period} onValueChange={onPeriodChange}>
          {" "}
          <SelectTrigger className="w-[180px] border-cyan-400/20 bg-card">
            {" "}
            <SelectValue />{" "}
          </SelectTrigger>{" "}
          <SelectContent>
            {" "}
            <SelectItem value="month">This Month</SelectItem>{" "}
            <SelectItem value="quarter">This Quarter</SelectItem>{" "}
            <SelectItem value="year">This Year</SelectItem>{" "}
          </SelectContent>{" "}
        </Select>{" "}
      </div>{" "}
      {/* Summary Cards */}{" "}
      <div className="grid gap-4 md:grid-cols-4">
        {" "}
        <Card className="border-cyan-400/30 bg-card">
          {" "}
          <CardHeader className="pb-3">
            {" "}
            <CardTitle className="text-sm text-cyan-200/70 flex items-center gap-2">
              {" "}
              <DollarSign className="h-4 w-4" /> Total Cost{" "}
            </CardTitle>{" "}
          </CardHeader>{" "}
          <CardContent>
            {" "}
            <div className="text-2xl font-semibold text-cyan-100">
              {" "}
              ${costStats.totalCost.toFixed(0)}{" "}
            </div>{" "}
          </CardContent>{" "}
        </Card>{" "}
        <Card className="border-yellow-400/30 bg-card">
          {" "}
          <CardHeader className="pb-3">
            {" "}
            <CardTitle className="text-sm text-yellow-200/70 flex items-center gap-2">
              {" "}
              <Package className="h-4 w-4" /> Inventory Value{" "}
            </CardTitle>{" "}
          </CardHeader>{" "}
          <CardContent>
            {" "}
            <div className="text-2xl font-semibold text-yellow-100">
              {" "}
              ${inventoryStats.totalValue.toFixed(0)}{" "}
            </div>{" "}
          </CardContent>{" "}
        </Card>{" "}
        <Card className="border-emerald-400/30 bg-card">
          {" "}
          <CardHeader className="pb-3">
            {" "}
            <CardTitle className="text-sm text-emerald-200/70 flex items-center gap-2">
              {" "}
              <Clock className="h-4 w-4" /> Avg Payment Days{" "}
            </CardTitle>{" "}
          </CardHeader>{" "}
          <CardContent>
            {" "}
            <div className="text-2xl font-semibold text-emerald-100">
              {" "}
              {paymentStats.avgPaymentDays.toFixed(0)}{" "}
            </div>{" "}
          </CardContent>{" "}
        </Card>{" "}
        <Card className="border-purple-400/30 bg-card">
          {" "}
          <CardHeader className="pb-3">
            {" "}
            <CardTitle className="text-sm text-purple-200/70 flex items-center gap-2">
              {" "}
              <TrendingUp className="h-4 w-4" /> On-Time Delivery{" "}
            </CardTitle>{" "}
          </CardHeader>{" "}
          <CardContent>
            {" "}
            <div className="text-2xl font-semibold text-purple-100">
              {" "}
              {vendorStats.avgOnTime.toFixed(0)}%{" "}
            </div>{" "}
          </CardContent>{" "}
        </Card>{" "}
      </div>{" "}
      {/* Analytics Tabs */}{" "}
      <Tabs
        value={activeTab}
        onValueChange={(v: any) => setActiveTab(v)}
        className="w-full"
      >
        {" "}
        <TabsList className="grid w-full grid-cols-4">
          {" "}
          <TabsTrigger value="vendors">Vendor Performance</TabsTrigger>{" "}
          <TabsTrigger value="costs">Cost Analysis</TabsTrigger>{" "}
          <TabsTrigger value="inventory">Inventory Metrics</TabsTrigger>{" "}
          <TabsTrigger value="payments">Payment Analytics</TabsTrigger>{" "}
        </TabsList>{" "}
        {/* Vendor Performance Tab */}{" "}
        <TabsContent value="vendors" className="space-y-4">
          {" "}
          <Card className="border-cyan-400/30 bg-card">
            {" "}
            <CardHeader>
              {" "}
              <CardTitle className="flex items-center gap-2">
                {" "}
                <TrendingUp className="h-5 w-5" /> Vendor Scorecard{" "}
              </CardTitle>{" "}
              <CardDescription className="text-cyan-200/70">
                {" "}
                Performance metrics for all suppliers{" "}
              </CardDescription>{" "}
            </CardHeader>{" "}
            <CardContent>
              {" "}
              <div className="overflow-x-auto">
                {" "}
                <Table>
                  {" "}
                  <TableHeader>
                    {" "}
                    <TableRow className="border-cyan-400/20">
                      {" "}
                      <TableHead className="text-cyan-200/70">
                        Vendor
                      </TableHead>{" "}
                      <TableHead className="text-right text-cyan-200/70">
                        Total Spent
                      </TableHead>{" "}
                      <TableHead className="text-right text-cyan-200/70">
                        Orders
                      </TableHead>{" "}
                      <TableHead className="text-right text-cyan-200/70">
                        Avg Delivery
                      </TableHead>{" "}
                      <TableHead className="text-cyan-200/70">
                        On-Time %
                      </TableHead>{" "}
                      <TableHead className="text-cyan-200/70">
                        Quality
                      </TableHead>{" "}
                      <TableHead className="text-cyan-200/70">
                        Price
                      </TableHead>{" "}
                    </TableRow>{" "}
                  </TableHeader>{" "}
                  <TableBody>
                    {" "}
                    {vendors.length === 0 ? (
                      <TableRow>
                        {" "}
                        <TableCell
                          colSpan={7}
                          className="text-center py-8 text-cyan-200/60"
                        >
                          {" "}
                          No vendor data available{" "}
                        </TableCell>{" "}
                      </TableRow>
                    ) : (
                      vendors.map((vendor) => (
                        <TableRow
                          key={vendor.vendorId}
                          className="border-cyan-400/10"
                        >
                          {" "}
                          <TableCell className="text-cyan-100">
                            {" "}
                            <div className="font-semibold">
                              {vendor.vendorName}
                            </div>{" "}
                          </TableCell>{" "}
                          <TableCell className="text-right font-mono text-cyan-100">
                            {" "}
                            ${vendor.totalSpent.toFixed(0)}{" "}
                          </TableCell>{" "}
                          <TableCell className="text-right text-cyan-100">
                            {" "}
                            {vendor.totalOrders}{" "}
                          </TableCell>{" "}
                          <TableCell className="text-right text-cyan-100">
                            {" "}
                            {vendor.averageDeliveryDays} days{" "}
                          </TableCell>{" "}
                          <TableCell>
                            {" "}
                            <Badge
                              className={
                                vendor.onTimeDeliveryPercent >= 90
                                  ? "border-emerald-400 bg-emerald-500/20 text-emerald-100"
                                  : vendor.onTimeDeliveryPercent >= 75
                                    ? "border-yellow-400 bg-yellow-500/20 text-yellow-100"
                                    : "border-red-400 bg-red-500/20 text-red-100"
                              }
                              variant="outline"
                            >
                              {" "}
                              {vendor.onTimeDeliveryPercent.toFixed(0)}%{" "}
                            </Badge>{" "}
                          </TableCell>{" "}
                          <TableCell>
                            {" "}
                            <div className="flex items-center gap-1">
                              {" "}
                              {Array.from({ length: 5 }).map((_, i) => (
                                <div
                                  key={i}
                                  className={`h-2 w-2 rounded-full ${i < Math.round(vendor.qualityScore / 20) ? "bg-emerald-400" : "bg-slate-700"}`}
                                />
                              ))}{" "}
                            </div>{" "}
                          </TableCell>{" "}
                          <TableCell>
                            {" "}
                            <Badge
                              className={
                                vendor.priceComparison < 0
                                  ? "border-emerald-400 bg-emerald-500/20 text-emerald-100"
                                  : "border-red-400 bg-red-500/20 text-red-100"
                              }
                              variant="outline"
                            >
                              {" "}
                              {vendor.priceComparison > 0 ? "+" : ""}{" "}
                              {vendor.priceComparison.toFixed(0)}%{" "}
                            </Badge>{" "}
                          </TableCell>{" "}
                        </TableRow>
                      ))
                    )}{" "}
                  </TableBody>{" "}
                </Table>{" "}
              </div>{" "}
            </CardContent>{" "}
          </Card>{" "}
        </TabsContent>{" "}
        {/* Cost Analysis Tab */}{" "}
        <TabsContent value="costs" className="space-y-4">
          {" "}
          <Card className="border-cyan-400/30 bg-card">
            {" "}
            <CardHeader>
              {" "}
              <CardTitle className="flex items-center gap-2">
                {" "}
                <DollarSign className="h-5 w-5" /> Category Spending{" "}
              </CardTitle>{" "}
              <CardDescription className="text-cyan-200/70">
                {" "}
                Cost breakdown by product category{" "}
              </CardDescription>{" "}
            </CardHeader>{" "}
            <CardContent>
              {" "}
              <div className="overflow-x-auto">
                {" "}
                <Table>
                  {" "}
                  <TableHeader>
                    {" "}
                    <TableRow className="border-cyan-400/20">
                      {" "}
                      <TableHead className="text-cyan-200/70">
                        Category
                      </TableHead>{" "}
                      <TableHead className="text-right text-cyan-200/70">
                        Cost
                      </TableHead>{" "}
                      <TableHead className="text-right text-cyan-200/70">
                        % of Total
                      </TableHead>{" "}
                      <TableHead className="text-right text-cyan-200/70">
                        Items
                      </TableHead>{" "}
                      <TableHead className="text-cyan-200/70">
                        Trend
                      </TableHead>{" "}
                    </TableRow>{" "}
                  </TableHeader>{" "}
                  <TableBody>
                    {" "}
                    {categories.length === 0 ? (
                      <TableRow>
                        {" "}
                        <TableCell
                          colSpan={5}
                          className="text-center py-8 text-cyan-200/60"
                        >
                          {" "}
                          No cost data available{" "}
                        </TableCell>{" "}
                      </TableRow>
                    ) : (
                      categories.map((category) => (
                        <TableRow
                          key={category.category}
                          className="border-cyan-400/10"
                        >
                          {" "}
                          <TableCell className="text-cyan-100 font-semibold">
                            {" "}
                            {category.category}{" "}
                          </TableCell>{" "}
                          <TableCell className="text-right font-mono text-cyan-100">
                            {" "}
                            ${category.totalCost.toFixed(2)}{" "}
                          </TableCell>{" "}
                          <TableCell className="text-right text-cyan-100">
                            {" "}
                            {category.percentOfTotal.toFixed(1)}%{" "}
                          </TableCell>{" "}
                          <TableCell className="text-right text-cyan-100">
                            {" "}
                            {category.itemCount}{" "}
                          </TableCell>{" "}
                          <TableCell>
                            {" "}
                            <Badge
                              className={
                                category.trend === "down"
                                  ? "border-emerald-400 bg-emerald-500/20 text-emerald-100"
                                  : category.trend === "up"
                                    ? "border-red-400 bg-red-500/20 text-red-100"
                                    : "border-cyan-400 bg-cyan-500/20 text-cyan-100"
                              }
                              variant="outline"
                            >
                              {" "}
                              {category.trend === "up" && (
                                <TrendingUp className="mr-1 h-3 w-3" />
                              )}{" "}
                              {category.trend === "down" && (
                                <TrendingDown className="mr-1 h-3 w-3" />
                              )}{" "}
                              {category.trendPercent.toFixed(1)}%{" "}
                            </Badge>{" "}
                          </TableCell>{" "}
                        </TableRow>
                      ))
                    )}{" "}
                  </TableBody>{" "}
                </Table>{" "}
              </div>{" "}
            </CardContent>{" "}
          </Card>{" "}
        </TabsContent>{" "}
        {/* Inventory Metrics Tab */}{" "}
        <TabsContent value="inventory" className="space-y-4">
          {" "}
          <Card className="border-cyan-400/30 bg-card">
            {" "}
            <CardHeader>
              {" "}
              <CardTitle className="flex items-center gap-2">
                {" "}
                <Package className="h-5 w-5" /> Inventory Performance{" "}
              </CardTitle>{" "}
              <CardDescription className="text-cyan-200/70">
                {" "}
                Turnover, stock levels, and carrying costs{" "}
              </CardDescription>{" "}
            </CardHeader>{" "}
            <CardContent>
              {" "}
              <div className="overflow-x-auto">
                {" "}
                <Table>
                  {" "}
                  <TableHeader>
                    {" "}
                    <TableRow className="border-cyan-400/20">
                      {" "}
                      <TableHead className="text-cyan-200/70">
                        Product
                      </TableHead>{" "}
                      <TableHead className="text-right text-cyan-200/70">
                        On Hand
                      </TableHead>{" "}
                      <TableHead className="text-right text-cyan-200/70">
                        Daily Usage
                      </TableHead>{" "}
                      <TableHead className="text-right text-cyan-200/70">
                        Days Supply
                      </TableHead>{" "}
                      <TableHead className="text-right text-cyan-200/70">
                        Turnover
                      </TableHead>{" "}
                      <TableHead className="text-cyan-200/70">
                        Status
                      </TableHead>{" "}
                    </TableRow>{" "}
                  </TableHeader>{" "}
                  <TableBody>
                    {" "}
                    {inventory.length === 0 ? (
                      <TableRow>
                        {" "}
                        <TableCell
                          colSpan={6}
                          className="text-center py-8 text-cyan-200/60"
                        >
                          {" "}
                          No inventory data available{" "}
                        </TableCell>{" "}
                      </TableRow>
                    ) : (
                      inventory.map((item) => (
                        <TableRow
                          key={item.categoryCode}
                          className="border-cyan-400/10"
                        >
                          {" "}
                          <TableCell className="text-cyan-100">
                            {" "}
                            <div className="font-semibold">
                              {item.productName}
                            </div>{" "}
                            <div className="text-xs text-cyan-200/60">
                              {item.categoryCode}
                            </div>{" "}
                          </TableCell>{" "}
                          <TableCell className="text-right font-mono text-cyan-100">
                            {" "}
                            {item.qtyOnHand}{" "}
                          </TableCell>{" "}
                          <TableCell className="text-right font-mono text-cyan-100">
                            {" "}
                            {item.avgDailyUsage.toFixed(2)}{" "}
                          </TableCell>{" "}
                          <TableCell className="text-right text-cyan-100">
                            {" "}
                            {item.daysOfStock.toFixed(0)} days{" "}
                          </TableCell>{" "}
                          <TableCell className="text-right text-cyan-100">
                            {" "}
                            {item.turnoverRate.toFixed(2)}×{" "}
                          </TableCell>{" "}
                          <TableCell>
                            {" "}
                            <Badge
                              className={
                                item.status === "optimal"
                                  ? "border-emerald-400 bg-emerald-500/20 text-emerald-100"
                                  : item.status === "high"
                                    ? "border-yellow-400 bg-yellow-500/20 text-yellow-100"
                                    : item.status === "low"
                                      ? "border-red-400 bg-red-500/20 text-red-100"
                                      : "border-border bg-surface/20 text-gray-100"
                              }
                              variant="outline"
                            >
                              {" "}
                              {item.status}{" "}
                            </Badge>{" "}
                          </TableCell>{" "}
                        </TableRow>
                      ))
                    )}{" "}
                  </TableBody>{" "}
                </Table>{" "}
              </div>{" "}
            </CardContent>{" "}
          </Card>{" "}
        </TabsContent>{" "}
        {/* Payment Analytics Tab */}{" "}
        <TabsContent value="payments" className="space-y-4">
          {" "}
          <Card className="border-cyan-400/30 bg-card">
            {" "}
            <CardHeader>
              {" "}
              <CardTitle className="flex items-center gap-2">
                {" "}
                <Clock className="h-5 w-5" /> Payment Performance{" "}
              </CardTitle>{" "}
              <CardDescription className="text-cyan-200/70">
                {" "}
                Payment patterns and vendor terms{" "}
              </CardDescription>{" "}
            </CardHeader>{" "}
            <CardContent>
              {" "}
              <div className="overflow-x-auto">
                {" "}
                <Table>
                  {" "}
                  <TableHeader>
                    {" "}
                    <TableRow className="border-cyan-400/20">
                      {" "}
                      <TableHead className="text-cyan-200/70">
                        Vendor
                      </TableHead>{" "}
                      <TableHead className="text-right text-cyan-200/70">
                        Total Paid
                      </TableHead>{" "}
                      <TableHead className="text-right text-cyan-200/70">
                        Invoices
                      </TableHead>{" "}
                      <TableHead className="text-right text-cyan-200/70">
                        Avg Days
                      </TableHead>{" "}
                      <TableHead className="text-cyan-200/70">
                        Discount %
                      </TableHead>{" "}
                      <TableHead className="text-cyan-200/70">
                        Late %
                      </TableHead>{" "}
                    </TableRow>{" "}
                  </TableHeader>{" "}
                  <TableBody>
                    {" "}
                    {payments.length === 0 ? (
                      <TableRow>
                        {" "}
                        <TableCell
                          colSpan={6}
                          className="text-center py-8 text-cyan-200/60"
                        >
                          {" "}
                          No payment data available{" "}
                        </TableCell>{" "}
                      </TableRow>
                    ) : (
                      payments.map((payment) => (
                        <TableRow
                          key={payment.vendorName}
                          className="border-cyan-400/10"
                        >
                          {" "}
                          <TableCell className="text-cyan-100 font-semibold">
                            {" "}
                            {payment.vendorName}{" "}
                          </TableCell>{" "}
                          <TableCell className="text-right font-mono text-cyan-100">
                            {" "}
                            ${payment.totalAmount.toFixed(2)}{" "}
                          </TableCell>{" "}
                          <TableCell className="text-right text-cyan-100">
                            {" "}
                            {payment.totalInvoices}{" "}
                          </TableCell>{" "}
                          <TableCell className="text-right text-cyan-100">
                            {" "}
                            {payment.averagePaymentDays} days{" "}
                          </TableCell>{" "}
                          <TableCell>
                            {" "}
                            {payment.earlyPaymentDiscount > 0 ? (
                              <Badge
                                variant="outline"
                                className="border-emerald-400 bg-emerald-500/20 text-emerald-100"
                              >
                                {" "}
                                {payment.earlyPaymentDiscount.toFixed(1)}%{" "}
                              </Badge>
                            ) : (
                              <span className="text-cyan-200/60">—</span>
                            )}{" "}
                          </TableCell>{" "}
                          <TableCell>
                            {" "}
                            {payment.latePaymentPercent > 0 ? (
                              <Badge
                                variant="outline"
                                className="border-red-400 bg-red-500/20 text-red-100"
                              >
                                {" "}
                                {payment.latePaymentPercent.toFixed(1)}%{" "}
                              </Badge>
                            ) : (
                              <span className="text-cyan-200/60">0%</span>
                            )}{" "}
                          </TableCell>{" "}
                        </TableRow>
                      ))
                    )}{" "}
                  </TableBody>{" "}
                </Table>{" "}
              </div>{" "}
            </CardContent>{" "}
          </Card>{" "}
        </TabsContent>{" "}
      </Tabs>{" "}
    </div>
  );
}
