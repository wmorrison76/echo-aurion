import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
export function CostOfSalesReport({
  entityId,
  periodDate,
}: {
  entityId: string;
  periodDate: string;
}) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetch(
          `/api/aurum/reports/usali/cost-of-sales?entityId=${entityId}&periodDate=${periodDate}`,
        );
        setData(await res.json());
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [entityId, periodDate]);
  if (loading)
    return (
      <div className="flex items-center justify-center p-8">
        {" "}
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>{" "}
      </div>
    );
  return (
    <div className="space-y-6">
      {" "}
      <div className="flex items-center justify-between">
        {" "}
        <div>
          {" "}
          <h2 className="text-2xl font-bold">Cost of Sales Analysis</h2>{" "}
          <p className="text-muted-foreground text-sm mt-1">
            {" "}
            Food, beverage, and goods cost tracking{" "}
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
                Total COGS
              </div>{" "}
              <div className="text-2xl font-bold text-orange-600">
                {" "}
                ${(data.summary.totalCOGS / 1000).toFixed(1)}K{" "}
              </div>{" "}
            </CardContent>{" "}
          </Card>{" "}
          <Card>
            {" "}
            <CardContent className="pt-6">
              {" "}
              <div className="text-sm text-muted-foreground">COGS %</div>{" "}
              <div className="text-2xl font-bold">
                {" "}
                {data.summary.cogsPercent?.toFixed(1)}%{" "}
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
              <div className="text-2xl font-bold text-red-600">
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
        </div>
      )}{" "}
      {data?.byType && (
        <Card>
          {" "}
          <CardHeader>
            {" "}
            <CardTitle>COGS Breakdown by Type</CardTitle>{" "}
          </CardHeader>{" "}
          <CardContent>
            {" "}
            <ResponsiveContainer width="100%" height={300}>
              {" "}
              <BarChart data={data.byType}>
                {" "}
                <CartesianGrid strokeDasharray="3 3" /> <XAxis dataKey="type" />{" "}
                <YAxis />{" "}
                <Tooltip formatter={(value) => `$${value.toLocaleString()}`} />{" "}
                <Legend /> <Bar dataKey="cost" fill="#f59e0b" />{" "}
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
            <CardTitle>Daily COGS Trend</CardTitle>{" "}
          </CardHeader>{" "}
          <CardContent>
            {" "}
            <ResponsiveContainer width="100%" height={300}>
              {" "}
              <LineChart data={data.dailyTrend}>
                {" "}
                <CartesianGrid strokeDasharray="3 3" /> <XAxis dataKey="date" />{" "}
                <YAxis yAxisId="left" />{" "}
                <YAxis yAxisId="right" orientation="right" /> <Tooltip />{" "}
                <Legend />{" "}
                <Line
                  yAxisId="left"
                  type="monotone"
                  dataKey="cost"
                  stroke="#f59e0b"
                  name="COGS"
                />{" "}
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="cogsPct"
                  stroke="#ef4444"
                  name="COGS %"
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
            <CardTitle>Detailed COGS Analysis</CardTitle>{" "}
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
                      Category
                    </th>{" "}
                    <th className="text-right p-3 font-semibold">Cost</th>{" "}
                    <th className="text-right p-3 font-semibold">Revenue</th>{" "}
                    <th className="text-right p-3 font-semibold">COGS %</th>{" "}
                    <th className="text-right p-3 font-semibold">
                      {" "}
                      Gross Profit{" "}
                    </th>{" "}
                  </tr>{" "}
                </thead>{" "}
                <tbody>
                  {" "}
                  {data.details.map((row: any, idx: number) => (
                    <tr key={idx} className="border-b hover:bg-surface">
                      {" "}
                      <td className="p-3 font-semibold">{row.category}</td>{" "}
                      <td className="p-3 text-right">
                        {" "}
                        ${row.cost.toLocaleString()}{" "}
                      </td>{" "}
                      <td className="p-3 text-right">
                        {" "}
                        ${row.revenue.toLocaleString()}{" "}
                      </td>{" "}
                      <td className="p-3 text-right">
                        {" "}
                        {row.cogsPercent.toFixed(1)}%{" "}
                      </td>{" "}
                      <td className="p-3 text-right text-green-600">
                        {" "}
                        ${row.grossProfit.toLocaleString()}{" "}
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
