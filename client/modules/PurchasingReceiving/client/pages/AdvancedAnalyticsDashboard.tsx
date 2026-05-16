import React, { useState, useEffect } from "react";
import { Card } from "../components/ui/card";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "../components/ui/tabs";
import { Alert, AlertDescription } from "../components/ui/alert";
import {
  TrendingUp,
  BarChart3,
  PieChart,
  AlertCircle,
  RefreshCw,
  DollarSign,
  Package,
} from "lucide-react";
interface DashboardMetrics {
  totalRevenue: number;
  totalExpenses: number;
  grossProfit: number;
  profitMargin: number;
  cashFlowPosition: number;
  openInvoices: number;
  overduePayables: number;
  inventoryValue: number;
  inventoryTurnover: number;
  receivablesOutstanding: number;
  payablesOutstanding: number;
}
interface TrendData {
  date: string;
  revenue: number;
  expenses: number;
  profit: number;
}
interface VendorPerformance {
  vendor: string;
  onTimeDeliveryRate: number;
  qualityScore: number;
  pricePerformance: number;
}
export default function AdvancedAnalyticsDashboard() {
  const [organizationId, setOrganizationId] = useState<string>("");
  const [outletId, setOutletId] = useState<string>("");
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [trends, setTrends] = useState<TrendData[]>([]);
  const [vendors, setVendors] = useState<VendorPerformance[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [outlets, setOutlets] = useState<Array<{ id: string; name: string }>>(
    [],
  );
  useEffect(() => {
    initializeData();
  }, []);
  useEffect(() => {
    if (organizationId) {
      fetchAllAnalytics();
    }
  }, [organizationId, outletId]);
  const initializeData = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/inventory?limit=100");
      if (response.ok) {
        const data = await response.json();
        setOutlets(data.data || []);
        if (data.data && data.data.length > 0) {
          setOutletId(data.data[0].id);
        }
      }
    } catch (err) {
      setError("Failed to load outlets");
    } finally {
      setLoading(false);
    }
  };
  const fetchAllAnalytics = async () => {
    try {
      setRefreshing(true);
      const [metricsRes, trendsRes, vendorsRes] = await Promise.all([
        fetch(
          `/api/analytics/dashboard/${organizationId}${outletId ? `?outletId=${outletId}` : ""}`,
        ),
        fetch(`/api/analytics/trends/${organizationId}?daysBack=90`),
        fetch(`/api/analytics/vendor-performance/${organizationId}`),
      ]);
      if (metricsRes.ok) {
        const data = await metricsRes.json();
        setMetrics(data);
      }
      if (trendsRes.ok) {
        const data = await trendsRes.json();
        setTrends(data);
      }
      if (vendorsRes.ok) {
        const data = await vendorsRes.json();
        setVendors(data);
      }
    } catch (err) {
      setError("Failed to load analytics data");
    } finally {
      setRefreshing(false);
    }
  };
  const handleRefresh = async () => {
    await fetchAllAnalytics();
  };
  if (loading) {
    return (
      <main id="main-content" className="flex-1 overflow-auto">
        {" "}
        <div className="p-6 text-center">
          {" "}
          <p>Loading analytics dashboard...</p>{" "}
        </div>{" "}
      </main>
    );
  }
  const maxProfit = Math.max(...trends.map((t) => t.profit || 0), 1);
  const maxRevenue = Math.max(...trends.map((t) => t.revenue || 0), 1);
  return (
    <main id="main-content" className="flex-1 overflow-auto">
      {" "}
      <div className="p-6 space-y-6">
        {" "}
        {/* Header */}{" "}
        <div>
          {" "}
          <div className="flex items-center justify-between mb-2">
            {" "}
            <div className="flex items-center gap-3">
              {" "}
              <BarChart3 className="w-8 h-8 text-primary" />{" "}
              <h1 className="text-3xl font-bold">
                Advanced Analytics Dashboard
              </h1>{" "}
            </div>{" "}
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="p-2 hover:bg-surface rounded-lg transition"
            >
              {" "}
              <RefreshCw
                className={`w-5 h-5 ${refreshing ? "animate-spin" : ""}`}
              />{" "}
            </button>{" "}
          </div>{" "}
          <p className="text-muted-foreground">
            {" "}
            Comprehensive business intelligence and performance insights{" "}
          </p>{" "}
        </div>{" "}
        {error && (
          <Alert className="bg-red-50 border-red-200">
            {" "}
            <AlertCircle className="h-4 w-4 text-red-600" />{" "}
            <AlertDescription className="text-red-800">
              {" "}
              {error}{" "}
              <button
                onClick={() => setError(null)}
                className="ml-4 text-sm underline"
              >
                {" "}
                Dismiss{" "}
              </button>{" "}
            </AlertDescription>{" "}
          </Alert>
        )}{" "}
        {/* Outlet Selector */}{" "}
        <Card className="p-4">
          {" "}
          <label className="block text-sm font-medium mb-2">
            Select Outlet
          </label>{" "}
          <select
            value={outletId}
            onChange={(e) => setOutletId(e.target.value)}
            className="w-full px-3 py-2 border rounded-md"
          >
            {" "}
            {outlets.map((outlet) => (
              <option key={outlet.id} value={outlet.id}>
                {" "}
                {outlet.name}{" "}
              </option>
            ))}{" "}
          </select>{" "}
        </Card>{" "}
        {/* Financial Metrics */}{" "}
        {metrics && (
          <>
            {" "}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {" "}
              <Card className="p-4">
                {" "}
                <div className="flex items-center justify-between">
                  {" "}
                  <div>
                    {" "}
                    <p className="text-sm text-muted-foreground mb-1">
                      Total Revenue
                    </p>{" "}
                    <p className="text-2xl font-bold">
                      {" "}
                      ${metrics.totalRevenue.toFixed(0)}{" "}
                    </p>{" "}
                  </div>{" "}
                  <DollarSign className="w-8 h-8 text-green-500 opacity-20" />{" "}
                </div>{" "}
              </Card>{" "}
              <Card className="p-4">
                {" "}
                <div className="flex items-center justify-between">
                  {" "}
                  <div>
                    {" "}
                    <p className="text-sm text-muted-foreground mb-1">
                      Total Expenses
                    </p>{" "}
                    <p className="text-2xl font-bold">
                      {" "}
                      ${metrics.totalExpenses.toFixed(0)}{" "}
                    </p>{" "}
                  </div>{" "}
                  <DollarSign className="w-8 h-8 text-red-500 opacity-20" />{" "}
                </div>{" "}
              </Card>{" "}
              <Card className="p-4">
                {" "}
                <div>
                  {" "}
                  <p className="text-sm text-muted-foreground mb-1">
                    Gross Profit
                  </p>{" "}
                  <p className="text-2xl font-bold text-green-600">
                    {" "}
                    ${metrics.grossProfit.toFixed(0)}{" "}
                  </p>{" "}
                  <p className="text-xs text-muted-foreground mt-1">
                    {" "}
                    Margin: {metrics.profitMargin.toFixed(1)}%{" "}
                  </p>{" "}
                </div>{" "}
              </Card>{" "}
              <Card className="p-4">
                {" "}
                <div>
                  {" "}
                  <p className="text-sm text-muted-foreground mb-1">
                    Cash Flow
                  </p>{" "}
                  <p
                    className={`text-2xl font-bold ${metrics.cashFlowPosition >= 0 ? "text-green-600" : "text-red-600"}`}
                  >
                    {" "}
                    ${metrics.cashFlowPosition.toFixed(0)}{" "}
                  </p>{" "}
                </div>{" "}
              </Card>{" "}
            </div>{" "}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {" "}
              <Card className="p-4">
                {" "}
                <p className="text-sm text-muted-foreground mb-2">
                  Payables Outstanding
                </p>{" "}
                <p className="text-3xl font-bold text-orange-600">
                  {" "}
                  ${metrics.payablesOutstanding.toFixed(0)}{" "}
                </p>{" "}
                <p className="text-xs text-muted-foreground mt-2">
                  {" "}
                  Open Invoices: {Math.ceil(metrics.openInvoices / 1000)}k{" "}
                </p>{" "}
              </Card>{" "}
              <Card className="p-4">
                {" "}
                <p className="text-sm text-muted-foreground mb-2">
                  Overdue Payables
                </p>{" "}
                <p className="text-3xl font-bold text-red-600">
                  {" "}
                  ${metrics.overduePayables.toFixed(0)}{" "}
                </p>{" "}
              </Card>{" "}
              <Card className="p-4">
                {" "}
                <p className="text-sm text-muted-foreground mb-2">
                  Inventory Value
                </p>{" "}
                <p className="text-3xl font-bold text-primary">
                  {" "}
                  ${metrics.inventoryValue.toFixed(0)}{" "}
                </p>{" "}
                <p className="text-xs text-muted-foreground mt-2">
                  {" "}
                  Turnover: {metrics.inventoryTurnover.toFixed(1)}x{" "}
                </p>{" "}
              </Card>{" "}
            </div>{" "}
          </>
        )}{" "}
        {/* Tabs for detailed views */}{" "}
        <Tabs defaultValue="trends" className="w-full">
          {" "}
          <TabsList className="grid w-full grid-cols-4">
            {" "}
            <TabsTrigger value="trends">Trends</TabsTrigger>{" "}
            <TabsTrigger value="vendors">Vendors</TabsTrigger>{" "}
            <TabsTrigger value="inventory">Inventory</TabsTrigger>{" "}
            <TabsTrigger value="insights">Insights</TabsTrigger>{" "}
          </TabsList>{" "}
          {/* Trends Tab */}{" "}
          <TabsContent value="trends" className="space-y-4">
            {" "}
            <Card className="p-4 bg-blue-50 border-blue-200">
              {" "}
              <div className="flex items-center gap-2 mb-2">
                {" "}
                <TrendingUp className="w-5 h-5 text-primary" />{" "}
                <h3 className="font-semibold text-blue-900">
                  90-Day Financial Trends
                </h3>{" "}
              </div>{" "}
              <p className="text-sm text-blue-800">
                {" "}
                Revenue, expenses, and profit over time{" "}
              </p>{" "}
            </Card>{" "}
            {trends.length > 0 ? (
              <Card className="p-6">
                {" "}
                <div className="h-96 relative">
                  {" "}
                  {/* Simple ASCII-style chart visualization */}{" "}
                  <div className="space-y-1 text-xs">
                    {" "}
                    {trends.slice(-30).map((trend, idx) => (
                      <div key={idx} className="flex items-center gap-2">
                        {" "}
                        <span className="w-12 text-right text-muted-foreground">
                          {" "}
                          {new Date(trend.date).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                          })}{" "}
                        </span>{" "}
                        <div className="flex gap-1 flex-1">
                          {" "}
                          <div
                            className="h-6 bg-green-500 opacity-70"
                            style={{
                              width: `${(trend.revenue / maxRevenue) * 200}px`,
                            }}
                            title={`Revenue: $${trend.revenue.toFixed(0)}`}
                          />{" "}
                          <div
                            className="h-6 bg-red-500 opacity-70"
                            style={{
                              width: `${(trend.expenses / maxRevenue) * 200}px`,
                            }}
                            title={`Expenses: $${trend.expenses.toFixed(0)}`}
                          />{" "}
                        </div>{" "}
                      </div>
                    ))}{" "}
                  </div>{" "}
                </div>{" "}
                <div className="mt-4 flex gap-4 text-sm">
                  {" "}
                  <div className="flex items-center gap-2">
                    {" "}
                    <div className="w-3 h-3 bg-green-500" />{" "}
                    <span>Revenue</span>{" "}
                  </div>{" "}
                  <div className="flex items-center gap-2">
                    {" "}
                    <div className="w-3 h-3 bg-red-500" />{" "}
                    <span>Expenses</span>{" "}
                  </div>{" "}
                </div>{" "}
              </Card>
            ) : (
              <Alert>
                {" "}
                <AlertCircle className="h-4 w-4" />{" "}
                <AlertDescription>
                  No trend data available
                </AlertDescription>{" "}
              </Alert>
            )}{" "}
          </TabsContent>{" "}
          {/* Vendors Tab */}{" "}
          <TabsContent value="vendors" className="space-y-4">
            {" "}
            <Card className="p-4 bg-purple-50 border-purple-200">
              {" "}
              <div className="flex items-center gap-2 mb-2">
                {" "}
                <PieChart className="w-5 h-5 text-purple-600" />{" "}
                <h3 className="font-semibold text-purple-900">
                  {" "}
                  Vendor Performance Scorecard{" "}
                </h3>{" "}
              </div>{" "}
              <p className="text-sm text-purple-800">
                {" "}
                On-time delivery, quality, and price performance{" "}
              </p>{" "}
            </Card>{" "}
            {vendors.length > 0 ? (
              <div className="space-y-3">
                {" "}
                {vendors.slice(0, 10).map((vendor) => (
                  <Card key={vendor.vendor} className="p-4">
                    {" "}
                    <div className="flex items-start justify-between mb-3">
                      {" "}
                      <p className="font-semibold">{vendor.vendor}</p>{" "}
                      <span className="text-sm font-bold text-primary">
                        {" "}
                        {(
                          (vendor.onTimeDeliveryRate +
                            vendor.qualityScore +
                            vendor.pricePerformance) /
                          3
                        ).toFixed(0)}{" "}
                        /100{" "}
                      </span>{" "}
                    </div>{" "}
                    <div className="space-y-2 text-sm">
                      {" "}
                      <div>
                        {" "}
                        <div className="flex justify-between mb-1">
                          {" "}
                          <span className="text-muted-foreground">
                            On-Time Delivery
                          </span>{" "}
                          <span className="font-medium">
                            {" "}
                            {vendor.onTimeDeliveryRate.toFixed(1)}%{" "}
                          </span>{" "}
                        </div>{" "}
                        <div className="w-full bg-surface rounded h-2">
                          {" "}
                          <div
                            className="bg-green-500 h-2 rounded"
                            style={{ width: `${vendor.onTimeDeliveryRate}%` }}
                          />{" "}
                        </div>{" "}
                      </div>{" "}
                      <div>
                        {" "}
                        <div className="flex justify-between mb-1">
                          {" "}
                          <span className="text-muted-foreground">
                            Quality Score
                          </span>{" "}
                          <span className="font-medium">
                            {" "}
                            {vendor.qualityScore.toFixed(1)}/100{" "}
                          </span>{" "}
                        </div>{" "}
                        <div className="w-full bg-surface rounded h-2">
                          {" "}
                          <div
                            className="bg-primary h-2 rounded"
                            style={{ width: `${vendor.qualityScore}%` }}
                          />{" "}
                        </div>{" "}
                      </div>{" "}
                      <div>
                        {" "}
                        <div className="flex justify-between mb-1">
                          {" "}
                          <span className="text-muted-foreground">
                            Price Performance
                          </span>{" "}
                          <span className="font-medium">
                            {" "}
                            {vendor.pricePerformance.toFixed(1)}/100{" "}
                          </span>{" "}
                        </div>{" "}
                        <div className="w-full bg-surface rounded h-2">
                          {" "}
                          <div
                            className="bg-purple-500 h-2 rounded"
                            style={{ width: `${vendor.pricePerformance}%` }}
                          />{" "}
                        </div>{" "}
                      </div>{" "}
                    </div>{" "}
                  </Card>
                ))}{" "}
              </div>
            ) : (
              <Alert>
                {" "}
                <AlertCircle className="h-4 w-4" />{" "}
                <AlertDescription>
                  No vendor data available
                </AlertDescription>{" "}
              </Alert>
            )}{" "}
          </TabsContent>{" "}
          {/* Inventory Tab */}{" "}
          <TabsContent value="inventory" className="space-y-4">
            {" "}
            <Card className="p-4 bg-emerald-50 border-emerald-200">
              {" "}
              <div className="flex items-center gap-2 mb-2">
                {" "}
                <Package className="w-5 h-5 text-emerald-600" />{" "}
                <h3 className="font-semibold text-emerald-900">
                  {" "}
                  Inventory Performance{" "}
                </h3>{" "}
              </div>{" "}
              <p className="text-sm text-emerald-800">
                {" "}
                Turnover rates, obsolescence risk, and stock levels{" "}
              </p>{" "}
            </Card>{" "}
            {metrics && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {" "}
                <Card className="p-4">
                  {" "}
                  <p className="text-sm text-muted-foreground mb-2">
                    Inventory Value
                  </p>{" "}
                  <p className="text-3xl font-bold">
                    {" "}
                    ${metrics.inventoryValue.toFixed(0)}{" "}
                  </p>{" "}
                  <p className="text-xs text-muted-foreground mt-2">
                    {" "}
                    Total current inventory cost{" "}
                  </p>{" "}
                </Card>{" "}
                <Card className="p-4">
                  {" "}
                  <p className="text-sm text-muted-foreground mb-2">
                    Turnover Rate
                  </p>{" "}
                  <p className="text-3xl font-bold">
                    {" "}
                    {metrics.inventoryTurnover.toFixed(1)}x{" "}
                  </p>{" "}
                  <p className="text-xs text-muted-foreground mt-2">
                    {" "}
                    Annual inventory rotation{" "}
                  </p>{" "}
                </Card>{" "}
              </div>
            )}{" "}
          </TabsContent>{" "}
          {/* Insights Tab */}{" "}
          <TabsContent value="insights" className="space-y-4">
            {" "}
            <Card className="p-4 bg-yellow-50 border-yellow-200">
              {" "}
              <h3 className="font-semibold text-yellow-900 mb-2">
                {" "}
                Key Business Insights{" "}
              </h3>{" "}
              <div className="space-y-2 text-sm text-yellow-800">
                {" "}
                <p>
                  {" "}
                  • Analyze trends to identify seasonal patterns and growth
                  opportunities{" "}
                </p>{" "}
                <p>
                  {" "}
                  • Monitor vendor performance to optimize supplier
                  relationships{" "}
                </p>{" "}
                <p>
                  {" "}
                  • Track inventory health to prevent stockouts and reduce
                  carrying costs{" "}
                </p>{" "}
                <p>
                  • Review cash flow position to ensure financial stability
                </p>{" "}
              </div>{" "}
            </Card>{" "}
            {metrics && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {" "}
                <Card className="p-4 bg-green-50 border-green-200">
                  {" "}
                  <p className="font-semibold text-green-900 mb-2">
                    Opportunities
                  </p>{" "}
                  <ul className="space-y-1 text-sm text-green-800">
                    {" "}
                    <li>
                      ✓ Strong profit margin at{" "}
                      {metrics.profitMargin.toFixed(1)}%
                    </li>{" "}
                    <li>
                      {" "}
                      ✓ Healthy inventory turnover at{" "}
                      {metrics.inventoryTurnover.toFixed(1)}x{" "}
                    </li>{" "}
                    <li>
                      ✓ Cash position: ${metrics.cashFlowPosition.toFixed(0)}
                    </li>{" "}
                  </ul>{" "}
                </Card>{" "}
                <Card className="p-4 bg-red-50 border-red-200">
                  {" "}
                  <p className="font-semibold text-red-900 mb-2">
                    Areas to Watch
                  </p>{" "}
                  <ul className="space-y-1 text-sm text-red-800">
                    {" "}
                    {metrics.overduePayables > 0 && (
                      <li>
                        ⚠ Overdue payables: $
                        {metrics.overduePayables.toFixed(0)}
                      </li>
                    )}{" "}
                    {metrics.openInvoices > 100000 && (
                      <li>
                        ⚠ High open invoices: ${metrics.openInvoices.toFixed(0)}
                      </li>
                    )}{" "}
                    <li>⚠ Review cash flow regularly</li>{" "}
                  </ul>{" "}
                </Card>{" "}
              </div>
            )}{" "}
          </TabsContent>{" "}
        </Tabs>{" "}
      </div>{" "}
    </main>
  );
}
