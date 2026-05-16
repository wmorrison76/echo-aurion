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
} from "recharts";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
export function DepartmentalPLReport({
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
          `/api/aurum/reports/usali/departmental-pl?entityId=${entityId}&periodDate=${periodDate}`,
        );
        const json = await res.json();
        setData(json);
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
          <h2 className="text-2xl font-bold">Departmental P&L</h2>{" "}
          <p className="text-muted-foreground text-sm mt-1">
            {" "}
            Profit and loss statement by department{" "}
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
                Total Revenue
              </div>{" "}
              <div className="text-2xl font-bold text-primary">
                {" "}
                ${(data.summary.totalRevenue / 1000).toFixed(1)}K{" "}
              </div>{" "}
            </CardContent>{" "}
          </Card>{" "}
          <Card>
            {" "}
            <CardContent className="pt-6">
              {" "}
              <div className="text-sm text-muted-foreground">
                Total Expenses
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
                Operating Income
              </div>{" "}
              <div className="text-2xl font-bold text-green-600">
                {" "}
                ${(data.summary.operatingIncome / 1000).toFixed(1)}K{" "}
              </div>{" "}
            </CardContent>{" "}
          </Card>{" "}
          <Card>
            {" "}
            <CardContent className="pt-6">
              {" "}
              <div className="text-sm text-muted-foreground">
                Operating Margin
              </div>{" "}
              <div className="text-2xl font-bold">
                {" "}
                {data.summary.operatingMargin?.toFixed(1)}%{" "}
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
            <CardTitle>Department Profitability</CardTitle>{" "}
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
                <Bar dataKey="revenue" fill="#3b82f6" name="Revenue" />{" "}
                <Bar dataKey="expenses" fill="#ef4444" name="Expenses" />{" "}
              </BarChart>{" "}
            </ResponsiveContainer>{" "}
          </CardContent>{" "}
        </Card>
      )}{" "}
      {data?.details && (
        <Card>
          {" "}
          <CardHeader>
            {" "}
            <CardTitle>Detailed Departmental P&L</CardTitle>{" "}
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
                    <th className="text-right p-3 font-semibold">Revenue</th>{" "}
                    <th className="text-right p-3 font-semibold">COGS</th>{" "}
                    <th className="text-right p-3 font-semibold">Labor</th>{" "}
                    <th className="text-right p-3 font-semibold">
                      {" "}
                      Operating Income{" "}
                    </th>{" "}
                    <th className="text-right p-3 font-semibold">
                      Margin %
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
                        ${row.revenue.toLocaleString()}{" "}
                      </td>{" "}
                      <td className="p-3 text-right">
                        {" "}
                        ${row.cogs.toLocaleString()}{" "}
                      </td>{" "}
                      <td className="p-3 text-right">
                        {" "}
                        ${row.labor.toLocaleString()}{" "}
                      </td>{" "}
                      <td className="p-3 text-right font-semibold">
                        {" "}
                        ${row.operatingIncome.toLocaleString()}{" "}
                      </td>{" "}
                      <td className="p-3 text-right text-green-600">
                        {" "}
                        {row.marginPercent.toFixed(1)}%{" "}
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
