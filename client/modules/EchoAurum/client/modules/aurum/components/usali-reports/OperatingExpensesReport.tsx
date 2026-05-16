import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
export function OperatingExpensesReport({
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
          `/api/aurum/reports/usali/operating-expenses?entityId=${entityId}&periodDate=${periodDate}`,
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
  const COLORS = [
    "#ef4444",
    "#f59e0b",
    "#84cc16",
    "#06b6d4",
    "#8b5cf6",
    "#ec4899",
  ];
  return (
    <div className="space-y-6">
      {" "}
      <div className="flex items-center justify-between">
        {" "}
        <div>
          {" "}
          <h2 className="text-2xl font-bold">Operating Expenses</h2>{" "}
          <p className="text-muted-foreground text-sm mt-1">
            {" "}
            Detailed operating expense breakdown by category{" "}
          </p>{" "}
        </div>{" "}
        <Button variant="outline" size="sm">
          {" "}
          <Download size={16} className="mr-1" /> Export{" "}
        </Button>{" "}
      </div>{" "}
      {data?.summary && (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {" "}
          <Card>
            {" "}
            <CardContent className="pt-6">
              {" "}
              <div className="text-sm text-muted-foreground">
                {" "}
                Total Operating Expenses{" "}
              </div>{" "}
              <div className="text-2xl font-bold text-red-600">
                {" "}
                ${(data.summary.totalExpenses / 1000).toFixed(1)}K{" "}
              </div>{" "}
            </CardContent>{" "}
          </Card>{" "}
          <Card>
            {" "}
            <CardContent className="pt-6">
              {" "}
              <div className="text-sm text-muted-foreground">
                Expense % of Revenue
              </div>{" "}
              <div className="text-2xl font-bold">
                {" "}
                {data.summary.expensePercent?.toFixed(1)}%{" "}
              </div>{" "}
            </CardContent>{" "}
          </Card>{" "}
          <Card>
            {" "}
            <CardContent className="pt-6">
              {" "}
              <div className="text-sm text-muted-foreground">
                {" "}
                Largest Expense Category{" "}
              </div>{" "}
              <div className="text-lg font-bold">
                {" "}
                {data.summary.largestCategory}{" "}
              </div>{" "}
            </CardContent>{" "}
          </Card>{" "}
        </div>
      )}{" "}
      {data?.byCategory && (
        <div className="grid md:grid-cols-2 gap-6">
          {" "}
          <Card>
            {" "}
            <CardHeader>
              {" "}
              <CardTitle>Expenses by Category</CardTitle>{" "}
            </CardHeader>{" "}
            <CardContent>
              {" "}
              <ResponsiveContainer width="100%" height={300}>
                {" "}
                <BarChart data={data.byCategory}>
                  {" "}
                  <CartesianGrid strokeDasharray="3 3" />{" "}
                  <XAxis dataKey="category" /> <YAxis />{" "}
                  <Tooltip
                    formatter={(value) => `$${value.toLocaleString()}`}
                  />{" "}
                  <Bar dataKey="amount" fill="#ef4444" />{" "}
                </BarChart>{" "}
              </ResponsiveContainer>{" "}
            </CardContent>{" "}
          </Card>{" "}
          <Card>
            {" "}
            <CardHeader>
              {" "}
              <CardTitle>Expense Distribution</CardTitle>{" "}
            </CardHeader>{" "}
            <CardContent>
              {" "}
              <ResponsiveContainer width="100%" height={300}>
                {" "}
                <PieChart>
                  {" "}
                  <Pie
                    data={data.byCategory}
                    dataKey="amount"
                    nameKey="category"
                    cx="50%"
                    cy="50%"
                    outerRadius={100}
                    label
                  >
                    {" "}
                    {data.byCategory.map((entry: any, idx: number) => (
                      <Cell key={idx} fill={COLORS[idx % COLORS.length]} />
                    ))}{" "}
                  </Pie>{" "}
                  <Tooltip
                    formatter={(value) => `$${value.toLocaleString()}`}
                  />{" "}
                </PieChart>{" "}
              </ResponsiveContainer>{" "}
            </CardContent>{" "}
          </Card>{" "}
        </div>
      )}{" "}
      {data?.details && (
        <Card>
          {" "}
          <CardHeader>
            {" "}
            <CardTitle>Detailed Operating Expenses</CardTitle>{" "}
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
                    <th className="text-right p-3 font-semibold">Amount</th>{" "}
                    <th className="text-right p-3 font-semibold">% of Total</th>{" "}
                    <th className="text-right p-3 font-semibold">
                      Variance
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
                        ${row.amount.toLocaleString()}{" "}
                      </td>{" "}
                      <td className="p-3 text-right">
                        {" "}
                        {row.percentOfTotal.toFixed(1)}%{" "}
                      </td>{" "}
                      <td
                        className={`p-3 text-right ${row.variance > 0 ? "text-red-600" : "text-green-600"}`}
                      >
                        {" "}
                        {row.variance > 0 ? "+" : ""} {row.variance.toFixed(1)}
                        %{" "}
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
