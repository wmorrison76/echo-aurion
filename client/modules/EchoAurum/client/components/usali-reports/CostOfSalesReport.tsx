import React from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { Loader, AlertCircle, Download } from "lucide-react";
interface CostOfSalesReportProps {
  entityId: string;
  periodDate: string;
}
export function CostOfSalesReport({
  entityId,
  periodDate,
}: CostOfSalesReportProps) {
  const { data, isLoading, error } = useQuery({
    queryKey: ["usali-cost-of-sales", entityId, periodDate],
    queryFn: async () => {
      const res = await fetch(
        `/api/aurum/reports/usali/cost-of-sales?entityId=${entityId}&periodDate=${periodDate}`,
      );
      if (!res.ok) throw new Error("Failed to fetch cost of sales");
      return res.json();
    },
  });
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        {" "}
        <Loader className="h-8 w-8 animate-spin text-aurum-500" />{" "}
      </div>
    );
  }
  if (error) {
    return (
      <Card className="border-red-500/50 bg-red-50/50">
        {" "}
        <CardContent className="pt-6 flex gap-2">
          {" "}
          <AlertCircle className="h-5 w-5 text-red-600" />{" "}
          <p className="text-sm text-red-700">
            {" "}
            {error instanceof Error
              ? error.message
              : "Error loading report"}{" "}
          </p>{" "}
        </CardContent>{" "}
      </Card>
    );
  }
  if (!data) return null;
  const { metrics, departments, timeline } = data;
  const cogPercent = (metrics.totalCogs / metrics.totalRevenue) * 100;
  return (
    <div className="space-y-6">
      {" "}
      {/* Summary Cards */}{" "}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {" "}
        <Card>
          {" "}
          <CardHeader className="pb-3">
            {" "}
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {" "}
              Total Revenue{" "}
            </CardTitle>{" "}
          </CardHeader>{" "}
          <CardContent>
            {" "}
            <div className="text-2xl font-bold">
              {" "}
              ${" "}
              {metrics.totalRevenue.toLocaleString("en-US", {
                maximumFractionDigits: 0,
              })}{" "}
            </div>{" "}
          </CardContent>{" "}
        </Card>{" "}
        <Card>
          {" "}
          <CardHeader className="pb-3">
            {" "}
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {" "}
              Total COGS{" "}
            </CardTitle>{" "}
          </CardHeader>{" "}
          <CardContent>
            {" "}
            <div className="text-2xl font-bold">
              {" "}
              ${" "}
              {metrics.totalCogs.toLocaleString("en-US", {
                maximumFractionDigits: 0,
              })}{" "}
            </div>{" "}
            <p className="text-xs text-muted-foreground mt-1">
              {" "}
              {cogPercent.toFixed(1)}% of revenue{" "}
            </p>{" "}
          </CardContent>{" "}
        </Card>{" "}
        <Card>
          {" "}
          <CardHeader className="pb-3">
            {" "}
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {" "}
              Gross Profit{" "}
            </CardTitle>{" "}
          </CardHeader>{" "}
          <CardContent>
            {" "}
            <div className="text-2xl font-bold">
              {" "}
              ${" "}
              {metrics.grossProfit.toLocaleString("en-US", {
                maximumFractionDigits: 0,
              })}{" "}
            </div>{" "}
            <p className="text-xs text-muted-foreground mt-1">
              {" "}
              {metrics.grossMargin.toFixed(1)}% margin{" "}
            </p>{" "}
          </CardContent>{" "}
        </Card>{" "}
        <Card>
          {" "}
          <CardHeader className="pb-3">
            {" "}
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {" "}
              vs Budget{" "}
            </CardTitle>{" "}
          </CardHeader>{" "}
          <CardContent>
            {" "}
            <div
              className={`text-2xl font-bold ${metrics.budgetVariance < 0 ? "text-green-600" : "text-red-600"}`}
            >
              {" "}
              {metrics.budgetVariance < 0 ? "" : "+"}{" "}
              {metrics.budgetVariance.toFixed(1)}%{" "}
            </div>{" "}
          </CardContent>{" "}
        </Card>{" "}
      </div>{" "}
      {/* COGS by Department */}{" "}
      <Card>
        {" "}
        <CardHeader>
          {" "}
          <CardTitle>COGS by Department</CardTitle>{" "}
        </CardHeader>{" "}
        <CardContent>
          {" "}
          <ResponsiveContainer width="100%" height={300}>
            {" "}
            <BarChart data={departments}>
              {" "}
              <CartesianGrid strokeDasharray="3 3" />{" "}
              <XAxis dataKey="department" /> <YAxis yAxisId="left" />{" "}
              <YAxis yAxisId="right" orientation="right" /> <Tooltip />{" "}
              <Legend />{" "}
              <Bar yAxisId="left" dataKey="cogs" fill="#ef4444" name="COGS" />{" "}
              <Bar
                yAxisId="right"
                dataKey="cogsPercent"
                fill="#f87171"
                name="% of Revenue"
              />{" "}
            </BarChart>{" "}
          </ResponsiveContainer>{" "}
        </CardContent>{" "}
      </Card>{" "}
      {/* Department Details */}{" "}
      <Card>
        {" "}
        <CardHeader>
          {" "}
          <CardTitle>Department Metrics</CardTitle>{" "}
        </CardHeader>{" "}
        <CardContent>
          {" "}
          <div className="space-y-3">
            {" "}
            {departments.map((dept) => (
              <div
                key={dept.department}
                className="flex items-center justify-between p-3 border rounded-lg"
              >
                {" "}
                <div className="flex-1">
                  {" "}
                  <p className="font-medium">{dept.department}</p>{" "}
                  <p className="text-sm text-muted-foreground">
                    {" "}
                    Revenue: ${dept.revenue.toLocaleString()}{" "}
                  </p>{" "}
                </div>{" "}
                <div className="text-right">
                  {" "}
                  <p className="font-bold text-red-600">
                    {" "}
                    ${dept.cogs.toLocaleString()}{" "}
                  </p>{" "}
                  <p className="text-sm text-muted-foreground">
                    {" "}
                    {dept.cogsPercent.toFixed(1)}%{" "}
                  </p>{" "}
                </div>{" "}
              </div>
            ))}{" "}
          </div>{" "}
        </CardContent>{" "}
      </Card>{" "}
      {/* COGS Trend */}{" "}
      <Card>
        {" "}
        <CardHeader>
          {" "}
          <CardTitle>COGS Trend Analysis</CardTitle>{" "}
        </CardHeader>{" "}
        <CardContent>
          {" "}
          <ResponsiveContainer width="100%" height={300}>
            {" "}
            <LineChart data={timeline}>
              {" "}
              <CartesianGrid strokeDasharray="3 3" /> <XAxis dataKey="date" />{" "}
              <YAxis yAxisId="left" />{" "}
              <YAxis yAxisId="right" orientation="right" /> <Tooltip />{" "}
              <Legend />{" "}
              <Line
                yAxisId="left"
                type="monotone"
                dataKey="cogs"
                stroke="#ef4444"
                strokeWidth={2}
                name="COGS Amount"
              />{" "}
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="cogsPercent"
                stroke="#f87171"
                strokeWidth={2}
                strokeDasharray="5 5"
                name="% of Revenue"
              />{" "}
            </LineChart>{" "}
          </ResponsiveContainer>{" "}
        </CardContent>{" "}
      </Card>{" "}
      {/* Export Button */}{" "}
      <button className="flex items-center gap-2 px-4 py-2 bg-aurum-500 text-white rounded-lg hover:bg-aurum-600">
        {" "}
        <Download className="h-4 w-4" /> Export to PDF{" "}
      </button>{" "}
    </div>
  );
}
