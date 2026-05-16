import React from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useWasteMetrics, useTopWastedProducts } from "@/hooks/useWasteLogs";
import { TrendingUp, TrendingDown, BarChart3 } from "lucide-react";
interface WasteCostAnalysisPanelProps {
  organizationId: string;
  outletId?: string;
}
export function WasteCostAnalysisPanel({
  organizationId,
  outletId,
}: WasteCostAnalysisPanelProps) {
  const { metrics, loading: metricsLoading } = useWasteMetrics({
    organizationId,
    outletId,
    autoRefresh: true,
    refreshInterval: 300,
  });
  const { products: topProducts, loading: productsLoading } =
    useTopWastedProducts({ organizationId, outletId, limit: 10 });
  return (
    <div className="space-y-6">
      {" "}
      {/* Key Metrics Cards */}{" "}
      {metrics && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {" "}
          <Card>
            {" "}
            <CardHeader className="pb-3">
              {" "}
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Waste Cost
              </CardTitle>{" "}
            </CardHeader>{" "}
            <CardContent>
              {" "}
              <div className="text-2xl font-bold text-red-600">
                {" "}
                ${metrics.total_waste_cost?.toFixed(2)}{" "}
              </div>{" "}
            </CardContent>{" "}
          </Card>{" "}
          <Card>
            {" "}
            <CardHeader className="pb-3">
              {" "}
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Daily Average
              </CardTitle>{" "}
            </CardHeader>{" "}
            <CardContent>
              {" "}
              <div className="text-2xl font-bold">
                ${metrics.avg_daily_waste?.toFixed(2)}
              </div>{" "}
              <div className="text-xs text-muted-foreground mt-1">
                per day
              </div>{" "}
            </CardContent>{" "}
          </Card>{" "}
          <Card>
            {" "}
            <CardHeader className="pb-3">
              {" "}
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Waste %
              </CardTitle>{" "}
            </CardHeader>{" "}
            <CardContent>
              {" "}
              <div className="text-2xl font-bold">
                {metrics.waste_percentage?.toFixed(1)}%
              </div>{" "}
              <div className="text-xs text-muted-foreground mt-1">
                of purchases
              </div>{" "}
            </CardContent>{" "}
          </Card>{" "}
          <Card>
            {" "}
            <CardHeader className="pb-3">
              {" "}
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                {" "}
                {metrics.trend === "improving" ? (
                  <TrendingDown className="w-4 h-4 text-green-600" />
                ) : (
                  <TrendingUp className="w-4 h-4 text-red-600" />
                )}{" "}
                Trend{" "}
              </CardTitle>{" "}
            </CardHeader>{" "}
            <CardContent>
              {" "}
              <Badge
                className={`text-xs ${metrics.trend === "improving" ? "bg-green-100 text-green-800" : metrics.trend === "worsening" ? "bg-red-100 text-red-800" : "bg-surface text-gray-800"}`}
              >
                {" "}
                {metrics.trend}{" "}
              </Badge>{" "}
            </CardContent>{" "}
          </Card>{" "}
        </div>
      )}{" "}
      {/* Top Wasted Products */}{" "}
      <Card>
        {" "}
        <CardHeader>
          {" "}
          <CardTitle className="flex items-center gap-2">
            {" "}
            <BarChart3 className="w-5 h-5" /> Top Wasted Products{" "}
          </CardTitle>{" "}
          <CardDescription>
            Products with highest waste cost
          </CardDescription>{" "}
        </CardHeader>{" "}
        <CardContent>
          {" "}
          {productsLoading ? (
            <div className="flex justify-center py-8">
              {" "}
              <div className="text-muted-foreground">Loading...</div>{" "}
            </div>
          ) : topProducts.length === 0 ? (
            <div className="flex justify-center py-8">
              {" "}
              <div className="text-muted-foreground">
                No data available
              </div>{" "}
            </div>
          ) : (
            <div className="space-y-3">
              {" "}
              {topProducts.map((product, index) => (
                <div
                  key={product.product_id}
                  className="flex items-center justify-between"
                >
                  {" "}
                  <div className="flex items-center gap-3 flex-1">
                    {" "}
                    <div className="w-8 h-8 rounded-full bg-surface flex items-center justify-center text-sm font-bold">
                      {" "}
                      {index + 1}{" "}
                    </div>{" "}
                    <div className="flex-1">
                      {" "}
                      <div className="font-medium">
                        {product.product_name}
                      </div>{" "}
                      <div className="text-sm text-muted-foreground">
                        {product.waste_count} waste logs
                      </div>{" "}
                    </div>{" "}
                  </div>{" "}
                  <div className="text-right">
                    {" "}
                    <div className="font-bold text-red-600">
                      {" "}
                      ${product.total_waste_cost.toFixed(2)}{" "}
                    </div>{" "}
                  </div>{" "}
                </div>
              ))}{" "}
            </div>
          )}{" "}
        </CardContent>{" "}
      </Card>{" "}
      {/* Spoilage Percentage Card */}{" "}
      {metrics && (
        <Card>
          {" "}
          <CardHeader>
            {" "}
            <CardTitle className="text-sm">Spoilage Analysis</CardTitle>{" "}
          </CardHeader>{" "}
          <CardContent>
            {" "}
            <div className="flex items-center justify-between">
              {" "}
              <div>
                {" "}
                <div className="text-sm text-muted-foreground mb-2">
                  Spoilage Percentage
                </div>{" "}
                <div className="text-3xl font-bold text-orange-600">
                  {" "}
                  {metrics.spoilage_percentage?.toFixed(1)}%{" "}
                </div>{" "}
              </div>{" "}
              <div className="text-right text-sm text-muted-foreground">
                {" "}
                <p>This is the percentage of total waste</p>{" "}
                <p>attributable to spoilage</p>{" "}
              </div>{" "}
            </div>{" "}
          </CardContent>{" "}
        </Card>
      )}{" "}
    </div>
  );
}
