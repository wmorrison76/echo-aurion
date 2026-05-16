import React from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
import {
  Loader,
  AlertCircle,
  Download,
  TrendingUp,
  TrendingDown,
} from "lucide-react";
interface LaborAnalysisReportProps {
  entityId: string;
  periodDate: string;
}
export function LaborAnalysisReport({
  entityId,
  periodDate,
}: LaborAnalysisReportProps) {
  const { data, isLoading, error } = useQuery({
    queryKey: ["usali-labor-analysis", entityId, periodDate],
    queryFn: async () => {
      const res = await fetch(
        `/api/aurum/reports/usali/labor-analysis?entityId=${entityId}&periodDate=${periodDate}`,
      );
      if (!res.ok) throw new Error("Failed to fetch labor analysis");
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
  const { metrics, departments, timeline, budget } = data;
  const laborCostPercentage =
    (metrics.totalLaborCost / metrics.totalRevenue) * 100;
  const budgetVariance = laborCostPercentage - budget.laborCostPercent;
  return (
    <div className="space-y-6">
      {" "}
      {/* Summary Cards */}{" "}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {" "}
        <Card>
          {" "}
          <CardHeader className="pb-3">
            {" "}
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {" "}
              Total Labor Cost{" "}
            </CardTitle>{" "}
          </CardHeader>{" "}
          <CardContent>
            {" "}
            <div className="text-2xl font-bold">
              {" "}
              ${" "}
              {metrics.totalLaborCost.toLocaleString("en-US", {
                maximumFractionDigits: 0,
              })}{" "}
            </div>{" "}
            <p className="text-xs text-muted-foreground mt-1">
              {" "}
              All departments{" "}
            </p>{" "}
          </CardContent>{" "}
        </Card>{" "}
        <Card>
          {" "}
          <CardHeader className="pb-3">
            {" "}
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {" "}
              Labor Cost %{" "}
            </CardTitle>{" "}
          </CardHeader>{" "}
          <CardContent>
            {" "}
            <div className="text-2xl font-bold">
              {" "}
              {laborCostPercentage.toFixed(1)}%{" "}
            </div>{" "}
            <Badge
              variant={
                laborCostPercentage > budget.laborCostPercent
                  ? "destructive"
                  : "default"
              }
              className="mt-2"
            >
              {" "}
              {budgetVariance > 0 ? "+" : ""} {budgetVariance.toFixed(1)}% vs
              budget{" "}
            </Badge>{" "}
          </CardContent>{" "}
        </Card>{" "}
        <Card>
          {" "}
          <CardHeader className="pb-3">
            {" "}
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {" "}
              Hours Worked{" "}
            </CardTitle>{" "}
          </CardHeader>{" "}
          <CardContent>
            {" "}
            <div className="text-2xl font-bold">
              {" "}
              {metrics.totalHours.toLocaleString()}{" "}
            </div>{" "}
            <p className="text-xs text-muted-foreground mt-1">
              Total hours
            </p>{" "}
          </CardContent>{" "}
        </Card>{" "}
        <Card>
          {" "}
          <CardHeader className="pb-3">
            {" "}
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {" "}
              Average Hourly Rate{" "}
            </CardTitle>{" "}
          </CardHeader>{" "}
          <CardContent>
            {" "}
            <div className="text-2xl font-bold">
              {" "}
              ${metrics.avgHourlyRate.toFixed(2)}{" "}
            </div>{" "}
            <p className="text-xs text-muted-foreground mt-1">Per hour</p>{" "}
          </CardContent>{" "}
        </Card>{" "}
      </div>{" "}
      {/* Labor by Department */}{" "}
      <Card>
        {" "}
        <CardHeader>
          {" "}
          <CardTitle>Labor Cost by Department</CardTitle>{" "}
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
              <Bar
                yAxisId="left"
                dataKey="laborCost"
                fill="#dc9c3f"
                name="Labor Cost"
              />{" "}
              <Bar
                yAxisId="right"
                dataKey="costPercent"
                fill="#f59e0b"
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
                    {dept.hours} hours{" "}
                  </p>{" "}
                </div>{" "}
                <div className="text-right">
                  {" "}
                  <p className="font-bold text-aurum-600">
                    {" "}
                    ${dept.laborCost.toLocaleString()}{" "}
                  </p>{" "}
                  <p className="text-sm text-muted-foreground">
                    {" "}
                    {dept.costPercent.toFixed(1)}% of revenue{" "}
                  </p>{" "}
                </div>{" "}
              </div>
            ))}{" "}
          </div>{" "}
        </CardContent>{" "}
      </Card>{" "}
      {/* Labor Trend */}{" "}
      <Card>
        {" "}
        <CardHeader>
          {" "}
          <CardTitle>Labor Cost Trend vs Budget</CardTitle>{" "}
        </CardHeader>{" "}
        <CardContent>
          {" "}
          <ResponsiveContainer width="100%" height={300}>
            {" "}
            <LineChart data={timeline}>
              {" "}
              <CartesianGrid strokeDasharray="3 3" /> <XAxis dataKey="date" />{" "}
              <YAxis />{" "}
              <Tooltip formatter={(value) => `${value.toFixed(1)}%`} />{" "}
              <Legend />{" "}
              <Line
                type="monotone"
                dataKey="actual"
                stroke="#dc9c3f"
                strokeWidth={2}
                name="Actual %"
              />{" "}
              <Line
                type="monotone"
                dataKey="budget"
                stroke="#94a3b8"
                strokeWidth={2}
                strokeDasharray="5 5"
                name="Budget %"
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
