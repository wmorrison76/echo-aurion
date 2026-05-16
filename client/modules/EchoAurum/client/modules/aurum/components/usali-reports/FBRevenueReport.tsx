import React, { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Download, Eye } from "lucide-react";
interface FBRevenueReportProps {
  entityId: string;
  periodDate: string;
}
export function FBRevenueReport({
  entityId,
  periodDate,
}: FBRevenueReportProps) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const res = await fetch(
          `/api/aurum/reports/usali/fb-revenue?entityId=${entityId}&periodDate=${periodDate}`,
        );
        if (!res.ok) throw new Error("Failed to fetch F&B revenue data");
        const json = await res.json();
        setData(json);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Error loading report");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [entityId, periodDate]);
  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        {" "}
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>{" "}
      </div>
    );
  }
  if (error) {
    return (
      <Card className="border-red-200 bg-red-50">
        {" "}
        <CardContent className="pt-6">
          {" "}
          <p className="text-red-700">{error}</p>{" "}
        </CardContent>{" "}
      </Card>
    );
  }
  return (
    <div className="space-y-6">
      {" "}
      <div className="flex items-center justify-between">
        {" "}
        <div>
          {" "}
          <h2 className="text-2xl font-bold">Food & Beverage Revenue</h2>{" "}
          <p className="text-muted-foreground text-sm mt-1">
            {" "}
            Revenue breakdown by department and service type{" "}
          </p>{" "}
        </div>{" "}
        <Button variant="outline" size="sm">
          {" "}
          <Download size={16} className="mr-1" /> Export{" "}
        </Button>{" "}
      </div>{" "}
      {data?.summary && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {" "}
          <Card>
            {" "}
            <CardContent className="pt-6">
              {" "}
              <div className="text-sm text-muted-foreground">
                Total F&B Revenue
              </div>{" "}
              <div className="text-2xl font-bold text-primary">
                {" "}
                ${(data.summary.totalFBRevenue / 1000).toFixed(1)}K{" "}
              </div>{" "}
            </CardContent>{" "}
          </Card>{" "}
          <Card>
            {" "}
            <CardContent className="pt-6">
              {" "}
              <div className="text-sm text-muted-foreground">
                Food Cost %
              </div>{" "}
              <div className="text-2xl font-bold text-orange-600">
                {" "}
                {data.summary.foodCostPercent?.toFixed(1)}%{" "}
              </div>{" "}
            </CardContent>{" "}
          </Card>{" "}
          <Card>
            {" "}
            <CardContent className="pt-6">
              {" "}
              <div className="text-sm text-muted-foreground">
                Beverage Cost %
              </div>{" "}
              <div className="text-2xl font-bold text-green-600">
                {" "}
                {data.summary.beverageCostPercent?.toFixed(1)}%{" "}
              </div>{" "}
            </CardContent>{" "}
          </Card>{" "}
          <Card>
            {" "}
            <CardContent className="pt-6">
              {" "}
              <div className="text-sm text-muted-foreground">
                Avg. Check Size
              </div>{" "}
              <div className="text-2xl font-bold">
                {" "}
                ${data.summary.avgCheckSize?.toFixed(2)}{" "}
              </div>{" "}
            </CardContent>{" "}
          </Card>{" "}
        </div>
      )}{" "}
      {data?.byDepartment && (
        <Card>
          {" "}
          <CardHeader>
            {" "}
            <CardTitle>Revenue by Department</CardTitle>{" "}
            <CardDescription>
              {" "}
              Food & Beverage breakdown by service outlet{" "}
            </CardDescription>{" "}
          </CardHeader>{" "}
          <CardContent>
            {" "}
            <ResponsiveContainer width="100%" height={300}>
              {" "}
              <BarChart data={data.byDepartment}>
                {" "}
                <CartesianGrid strokeDasharray="3 3" />{" "}
                <XAxis dataKey="department" /> <YAxis />{" "}
                <Tooltip formatter={(value) => `$${value.toLocaleString()}`} />{" "}
                <Legend />{" "}
                <Bar dataKey="foodRevenue" fill="#f59e0b" name="Food Revenue" />{" "}
                <Bar
                  dataKey="beverageRevenue"
                  fill="#10b981"
                  name="Beverage Revenue"
                />{" "}
              </BarChart>{" "}
            </ResponsiveContainer>{" "}
          </CardContent>{" "}
        </Card>
      )}{" "}
      {data?.dailyTrend && (
        <Card>
          {" "}
          <CardHeader>
            {" "}
            <CardTitle>Daily Trend</CardTitle>{" "}
          </CardHeader>{" "}
          <CardContent>
            {" "}
            <ResponsiveContainer width="100%" height={300}>
              {" "}
              <LineChart data={data.dailyTrend}>
                {" "}
                <CartesianGrid strokeDasharray="3 3" /> <XAxis dataKey="date" />{" "}
                <YAxis />{" "}
                <Tooltip formatter={(value) => `$${value.toLocaleString()}`} />{" "}
                <Legend />{" "}
                <Line
                  type="monotone"
                  dataKey="revenue"
                  stroke="#3b82f6"
                  name="Daily Revenue"
                />{" "}
              </LineChart>{" "}
            </ResponsiveContainer>{" "}
          </CardContent>{" "}
        </Card>
      )}{" "}
      {data?.details && (
        <Card>
          {" "}
          <CardHeader>
            {" "}
            <CardTitle>Detailed F&B Breakdown</CardTitle>{" "}
          </CardHeader>{" "}
          <CardContent>
            {" "}
            <div className="overflow-x-auto">
              {" "}
              <table className="w-full text-sm">
                {" "}
                <thead>
                  {" "}
                  <tr className="border-b bg-surface">
                    {" "}
                    <th className="text-left p-3 font-semibold">
                      Department
                    </th>{" "}
                    <th className="text-right p-3 font-semibold">
                      {" "}
                      Food Revenue{" "}
                    </th>{" "}
                    <th className="text-right p-3 font-semibold">
                      {" "}
                      Beverage Revenue{" "}
                    </th>{" "}
                    <th className="text-right p-3 font-semibold">
                      {" "}
                      Total Revenue{" "}
                    </th>{" "}
                    <th className="text-right p-3 font-semibold">
                      Cost %
                    </th>{" "}
                    <th className="text-right p-3 font-semibold">
                      {" "}
                      Contribution Margin{" "}
                    </th>{" "}
                  </tr>{" "}
                </thead>{" "}
                <tbody>
                  {" "}
                  {data.details.map((row: any, idx: number) => (
                    <tr key={idx} className="border-b hover:bg-surface">
                      {" "}
                      <td className="p-3 font-semibold">
                        {row.department}
                      </td>{" "}
                      <td className="p-3 text-right">
                        {" "}
                        ${row.foodRevenue.toLocaleString()}{" "}
                      </td>{" "}
                      <td className="p-3 text-right">
                        {" "}
                        ${row.beverageRevenue.toLocaleString()}{" "}
                      </td>{" "}
                      <td className="p-3 text-right font-semibold">
                        {" "}
                        ${row.totalRevenue.toLocaleString()}{" "}
                      </td>{" "}
                      <td className="p-3 text-right text-orange-600">
                        {" "}
                        {row.costPercent.toFixed(1)}%{" "}
                      </td>{" "}
                      <td className="p-3 text-right text-green-600">
                        {" "}
                        ${row.contributionMargin.toLocaleString()}{" "}
                      </td>{" "}
                    </tr>
                  ))}{" "}
                </tbody>{" "}
              </table>{" "}
            </div>{" "}
          </CardContent>{" "}
        </Card>
      )}{" "}
    </div>
  );
}
