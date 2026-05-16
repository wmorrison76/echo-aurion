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
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
} from "recharts";
import { Loader, AlertCircle, Download } from "lucide-react";
interface FBRevenueReportProps {
  entityId: string;
  periodDate: string;
}
const COLORS = ["#dc9c3f", "#f59e0b", "#d97706", "#b45309", "#92400e"];
export function FBRevenueReport({
  entityId,
  periodDate,
}: FBRevenueReportProps) {
  const { data, isLoading, error } = useQuery({
    queryKey: ["usali-fb-revenue", entityId, periodDate],
    queryFn: async () => {
      const res = await fetch(
        `/api/aurum/reports/usali/fb-revenue?entityId=${entityId}&periodDate=${periodDate}`,
      );
      if (!res.ok) throw new Error("Failed to fetch F&B revenue");
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
              {" "}
              Total F&B Revenue{" "}
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
              Average Check{" "}
            </CardTitle>{" "}
          </CardHeader>{" "}
          <CardContent>
            {" "}
            <div className="text-2xl font-bold">
              {" "}
              ${metrics.avgCheck.toFixed(2)}{" "}
            </div>{" "}
            <p className="text-xs text-muted-foreground mt-1">
              {" "}
              Per transaction{" "}
            </p>{" "}
          </CardContent>{" "}
        </Card>{" "}
        <Card>
          {" "}
          <CardHeader className="pb-3">
            {" "}
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {" "}
              Transactions{" "}
            </CardTitle>{" "}
          </CardHeader>{" "}
          <CardContent>
            {" "}
            <div className="text-2xl font-bold">
              {" "}
              {metrics.transactions.toLocaleString()}{" "}
            </div>{" "}
            <p className="text-xs text-muted-foreground mt-1">
              Period total
            </p>{" "}
          </CardContent>{" "}
        </Card>{" "}
      </div>{" "}
      {/* Revenue by Department */}{" "}
      <Card>
        {" "}
        <CardHeader>
          {" "}
          <CardTitle>Revenue by Department</CardTitle>{" "}
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
              <Bar dataKey="revenue" fill="#dc9c3f" />{" "}
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
                    {dept.transactions} transactions{" "}
                  </p>{" "}
                </div>{" "}
                <div className="text-right">
                  {" "}
                  <p className="font-bold text-aurum-600">
                    {" "}
                    ${dept.revenue.toLocaleString()}{" "}
                  </p>{" "}
                  <p className="text-sm text-muted-foreground">
                    {" "}
                    ${dept.avgCheck.toFixed(2)} avg check{" "}
                  </p>{" "}
                </div>{" "}
              </div>
            ))}{" "}
          </div>{" "}
        </CardContent>{" "}
      </Card>{" "}
      {/* Revenue Distribution */}{" "}
      <Card>
        {" "}
        <CardHeader>
          {" "}
          <CardTitle>Revenue Distribution</CardTitle>{" "}
        </CardHeader>{" "}
        <CardContent>
          {" "}
          <ResponsiveContainer width="100%" height={300}>
            {" "}
            <PieChart>
              {" "}
              <Pie
                data={departments}
                dataKey="revenue"
                nameKey="department"
                cx="50%"
                cy="50%"
                outerRadius={100}
                label
              >
                {" "}
                {departments.map((_, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={COLORS[index % COLORS.length]}
                  />
                ))}{" "}
              </Pie>{" "}
              <Tooltip
                formatter={(value) => `$${value.toLocaleString()}`}
              />{" "}
            </PieChart>{" "}
          </ResponsiveContainer>{" "}
        </CardContent>{" "}
      </Card>{" "}
      {/* Daily Trend */}{" "}
      <Card>
        {" "}
        <CardHeader>
          {" "}
          <CardTitle>Daily Revenue Trend</CardTitle>{" "}
        </CardHeader>{" "}
        <CardContent>
          {" "}
          <ResponsiveContainer width="100%" height={250}>
            {" "}
            <BarChart data={timeline}>
              {" "}
              <CartesianGrid strokeDasharray="3 3" /> <XAxis dataKey="date" />{" "}
              <YAxis />{" "}
              <Tooltip formatter={(value) => `$${value.toLocaleString()}`} />{" "}
              <Bar dataKey="revenue" fill="#dc9c3f" />{" "}
            </BarChart>{" "}
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
