import React from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
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
interface DepartmentalProfitReportProps {
  entityId: string;
  periodDate: string;
}
export function DepartmentalProfitReport({
  entityId,
  periodDate,
}: DepartmentalProfitReportProps) {
  const { data, isLoading, error } = useQuery({
    queryKey: ["usali-departmental-profit", entityId, periodDate],
    queryFn: async () => {
      const res = await fetch(
        `/api/aurum/reports/usali/departmental-profit?entityId=${entityId}&periodDate=${periodDate}`,
      );
      if (!res.ok) throw new Error("Failed to fetch departmental profit");
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
  const { departments, summary } = data;
  const topDepartment = departments.reduce((max, dept) =>
    dept.profit > max.profit ? dept : max,
  );
  const bottomDepartment = departments.reduce((min, dept) =>
    dept.profit < min.profit ? dept : min,
  );
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
              Total Department Profit{" "}
            </CardTitle>{" "}
          </CardHeader>{" "}
          <CardContent>
            {" "}
            <div
              className={`text-2xl font-bold ${summary.totalProfit >= 0 ? "text-green-600" : "text-red-600"}`}
            >
              {" "}
              ${" "}
              {summary.totalProfit.toLocaleString("en-US", {
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
              Best Performer{" "}
            </CardTitle>{" "}
          </CardHeader>{" "}
          <CardContent>
            {" "}
            <div className="text-2xl font-bold text-green-600">
              {" "}
              {topDepartment.department}{" "}
            </div>{" "}
            <p className="text-xs text-muted-foreground mt-1">
              {" "}
              ${topDepartment.profit.toLocaleString()} profit{" "}
            </p>{" "}
          </CardContent>{" "}
        </Card>{" "}
        <Card>
          {" "}
          <CardHeader className="pb-3">
            {" "}
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {" "}
              Lowest Performer{" "}
            </CardTitle>{" "}
          </CardHeader>{" "}
          <CardContent>
            {" "}
            <div className="text-2xl font-bold text-red-600">
              {" "}
              {bottomDepartment.department}{" "}
            </div>{" "}
            <p className="text-xs text-muted-foreground mt-1">
              {" "}
              ${bottomDepartment.profit.toLocaleString()} profit{" "}
            </p>{" "}
          </CardContent>{" "}
        </Card>{" "}
        <Card>
          {" "}
          <CardHeader className="pb-3">
            {" "}
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {" "}
              Avg Margin{" "}
            </CardTitle>{" "}
          </CardHeader>{" "}
          <CardContent>
            {" "}
            <div className="text-2xl font-bold">
              {" "}
              {summary.avgMargin.toFixed(1)}%{" "}
            </div>{" "}
            <p className="text-xs text-muted-foreground mt-1">
              {" "}
              Across all depts{" "}
            </p>{" "}
          </CardContent>{" "}
        </Card>{" "}
      </div>{" "}
      {/* Profit Comparison */}{" "}
      <Card>
        {" "}
        <CardHeader>
          {" "}
          <CardTitle>Departmental Profit Comparison</CardTitle>{" "}
        </CardHeader>{" "}
        <CardContent>
          {" "}
          <ResponsiveContainer width="100%" height={300}>
            {" "}
            <BarChart data={departments}>
              {" "}
              <CartesianGrid strokeDasharray="3 3" />{" "}
              <XAxis dataKey="department" /> <YAxis />{" "}
              <Tooltip formatter={(value) => `$${value.toLocaleString()}`} />{" "}
              <Bar dataKey="profit" fill="#22c55e" name="Profit" />{" "}
            </BarChart>{" "}
          </ResponsiveContainer>{" "}
        </CardContent>{" "}
      </Card>{" "}
      {/* Detailed Metrics */}{" "}
      <Card>
        {" "}
        <CardHeader>
          {" "}
          <CardTitle>Department Profitability Analysis</CardTitle>{" "}
        </CardHeader>{" "}
        <CardContent>
          {" "}
          <div className="space-y-3">
            {" "}
            {departments.map((dept) => (
              <div key={dept.department} className="border rounded-lg p-4">
                {" "}
                <div className="flex items-center justify-between mb-3">
                  {" "}
                  <h4 className="font-semibold text-lg">
                    {dept.department}
                  </h4>{" "}
                  <Badge variant={dept.profit >= 0 ? "default" : "destructive"}>
                    {" "}
                    {dept.marginPercent.toFixed(1)}% margin{" "}
                  </Badge>{" "}
                </div>{" "}
                <div className="grid grid-cols-4 gap-4 text-sm">
                  {" "}
                  <div>
                    {" "}
                    <p className="text-muted-foreground">Revenue</p>{" "}
                    <p className="font-semibold text-green-600">
                      {" "}
                      ${dept.revenue.toLocaleString()}{" "}
                    </p>{" "}
                  </div>{" "}
                  <div>
                    {" "}
                    <p className="text-muted-foreground">Expenses</p>{" "}
                    <p className="font-semibold text-red-600">
                      {" "}
                      ${dept.expenses.toLocaleString()}{" "}
                    </p>{" "}
                  </div>{" "}
                  <div>
                    {" "}
                    <p className="text-muted-foreground">Profit</p>{" "}
                    <p
                      className={`font-semibold ${dept.profit >= 0 ? "text-green-600" : "text-red-600"}`}
                    >
                      {" "}
                      ${dept.profit.toLocaleString()}{" "}
                    </p>{" "}
                  </div>{" "}
                  <div>
                    {" "}
                    <p className="text-muted-foreground">Trend</p>{" "}
                    <div className="flex items-center gap-1">
                      {" "}
                      {dept.trend >= 0 ? (
                        <TrendingUp className="h-4 w-4 text-green-600" />
                      ) : (
                        <TrendingDown className="h-4 w-4 text-red-600" />
                      )}{" "}
                      <span
                        className={
                          dept.trend >= 0 ? "text-green-600" : "text-red-600"
                        }
                      >
                        {" "}
                        {dept.trend > 0 ? "+" : ""} {dept.trend.toFixed(1)}
                        %{" "}
                      </span>{" "}
                    </div>{" "}
                  </div>{" "}
                </div>{" "}
              </div>
            ))}{" "}
          </div>{" "}
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
