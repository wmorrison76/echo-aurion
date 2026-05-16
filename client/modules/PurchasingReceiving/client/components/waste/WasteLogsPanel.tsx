import React, { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useWasteLogs, useWasteCategoryBreakdown } from "@/hooks/useWasteLogs";
import { Plus, TrendingUp, AlertTriangle } from "lucide-react";
interface WasteLogsPanelProps {
  organizationId: string;
  outletId?: string;
}
export function WasteLogsPanel({
  organizationId,
  outletId,
}: WasteLogsPanelProps) {
  const { logs, summary, loading } = useWasteLogs({
    organizationId,
    outletId,
    autoRefresh: true,
    refreshInterval: 300,
  });
  const { breakdown } = useWasteCategoryBreakdown({
    organizationId,
    outletId,
    autoRefresh: true,
  });
  const [showAddLog, setShowAddLog] = useState(false);
  const getCategoryColor = (category: string) => {
    switch (category) {
      case "spoilage":
        return "bg-red-100 text-red-800";
      case "overstock":
        return "bg-orange-100 text-orange-800";
      case "damage":
        return "bg-yellow-100 text-yellow-800";
      case "prep_loss":
        return "bg-blue-100 text-blue-800";
      case "shrinkage":
        return "bg-purple-100 text-purple-800";
      default:
        return "bg-surface text-gray-800";
    }
  };
  return (
    <div className="space-y-6">
      {" "}
      {/* Summary Cards */}{" "}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {" "}
        <Card>
          {" "}
          <CardHeader className="pb-3">
            {" "}
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Waste Logs
            </CardTitle>{" "}
          </CardHeader>{" "}
          <CardContent>
            {" "}
            <div className="text-2xl font-bold">{summary.total}</div>{" "}
            <div className="text-xs text-muted-foreground mt-1">
              recorded items
            </div>{" "}
          </CardContent>{" "}
        </Card>{" "}
        <Card>
          {" "}
          <CardHeader className="pb-3">
            {" "}
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              {" "}
              <TrendingUp className="w-4 h-4" /> Total Waste Cost{" "}
            </CardTitle>{" "}
          </CardHeader>{" "}
          <CardContent>
            {" "}
            <div className="text-2xl font-bold text-red-600">
              ${summary.totalCost.toFixed(2)}
            </div>{" "}
            <div className="text-xs text-muted-foreground mt-1">
              cumulative
            </div>{" "}
          </CardContent>{" "}
        </Card>{" "}
        <Card>
          {" "}
          <CardHeader className="pb-3">
            {" "}
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Top Category
            </CardTitle>{" "}
          </CardHeader>{" "}
          <CardContent>
            {" "}
            <div className="text-lg font-bold">
              {" "}
              {Object.entries(summary.byCategory).length > 0
                ? Object.entries(summary.byCategory).sort(
                    (a, b) => b[1] - a[1],
                  )[0][0]
                : "N/A"}{" "}
            </div>{" "}
            <div className="text-xs text-muted-foreground mt-1">
              most common waste type
            </div>{" "}
          </CardContent>{" "}
        </Card>{" "}
      </div>{" "}
      {/* Waste Logs List */}{" "}
      <Card>
        {" "}
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          {" "}
          <div>
            {" "}
            <CardTitle>Recent Waste Logs</CardTitle>{" "}
            <CardDescription>
              Track and manage waste entries
            </CardDescription>{" "}
          </div>{" "}
          <Button size="sm" onClick={() => setShowAddLog(true)}>
            {" "}
            <Plus className="w-4 h-4 mr-2" /> Add Log{" "}
          </Button>{" "}
        </CardHeader>{" "}
        <CardContent>
          {" "}
          {loading ? (
            <div className="flex justify-center py-8">
              {" "}
              <div className="text-muted-foreground">
                Loading waste logs...
              </div>{" "}
            </div>
          ) : logs.length === 0 ? (
            <div className="flex justify-center py-8">
              {" "}
              <div className="text-muted-foreground">
                No waste logs recorded yet
              </div>{" "}
            </div>
          ) : (
            <div className="space-y-2">
              {" "}
              {logs.slice(0, 10).map((log) => (
                <div
                  key={log.id}
                  className="flex items-center justify-between p-3 border rounded-lg hover:bg-surface"
                >
                  {" "}
                  <div className="flex-1">
                    {" "}
                    <div className="flex items-center gap-2">
                      {" "}
                      <h4 className="font-medium">
                        {log.product_name || "Unknown Product"}
                      </h4>{" "}
                      <Badge
                        className={`text-xs ${getCategoryColor(log.waste_category)}`}
                      >
                        {" "}
                        {log.waste_category}{" "}
                      </Badge>{" "}
                      {log.root_cause && (
                        <Badge variant="outline" className="text-xs">
                          {" "}
                          {log.root_cause}{" "}
                        </Badge>
                      )}{" "}
                    </div>{" "}
                    <div className="text-sm text-muted-foreground mt-1">
                      {" "}
                      {log.quantity_wasted} {log.unit_of_measure}{" "}
                    </div>{" "}
                  </div>{" "}
                  <div className="text-right">
                    {" "}
                    <div className="font-medium text-red-600">
                      ${log.total_waste_cost.toFixed(2)}
                    </div>{" "}
                    <div className="text-xs text-muted-foreground">
                      {" "}
                      {new Date(log.created_at).toLocaleDateString()}{" "}
                    </div>{" "}
                  </div>{" "}
                </div>
              ))}{" "}
            </div>
          )}{" "}
        </CardContent>{" "}
      </Card>{" "}
      {/* Category Breakdown */}{" "}
      <Card>
        {" "}
        <CardHeader>
          {" "}
          <CardTitle className="text-sm">Waste by Category</CardTitle>{" "}
        </CardHeader>{" "}
        <CardContent>
          {" "}
          <div className="space-y-2">
            {" "}
            {Object.entries(breakdown).map(([category, count]) => (
              <div key={category} className="flex justify-between text-sm">
                {" "}
                <span className="text-muted-foreground capitalize">
                  {category}
                </span>{" "}
                <span className="font-medium">{count}</span>{" "}
              </div>
            ))}{" "}
          </div>{" "}
        </CardContent>{" "}
      </Card>{" "}
    </div>
  );
}
