import React, { useState, useEffect } from "react";
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
import { Button } from "@/components/ui/button";
import { Download, AlertTriangle, TrendingUp } from "lucide-react";
export function CashPositionReport({
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
          `/api/aurum/reports/usali/cash-position?entityId=${entityId}&periodDate=${periodDate}`,
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
          <h2 className="text-2xl font-bold">Cash Position Report</h2>{" "}
          <p className="text-muted-foreground text-sm mt-1">
            {" "}
            Daily cash flow and liquidity analysis{" "}
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
          <Card
            className={
              data.summary.cashBalance < data.summary.minimumCash
                ? "border-red-200"
                : ""
            }
          >
            {" "}
            <CardContent className="pt-6">
              {" "}
              <div className="text-sm text-muted-foreground">
                Current Cash Balance
              </div>{" "}
              <div
                className={`text-2xl font-bold ${data.summary.cashBalance < data.summary.minimumCash ? "text-red-600" : "text-green-600"}`}
              >
                {" "}
                ${(data.summary.cashBalance / 1000).toFixed(1)}K{" "}
              </div>{" "}
              {data.summary.cashBalance < data.summary.minimumCash && (
                <div className="flex items-center gap-1 text-red-600 text-xs mt-2">
                  {" "}
                  <AlertTriangle size={12} /> Below minimum{" "}
                </div>
              )}{" "}
            </CardContent>{" "}
          </Card>{" "}
          <Card>
            {" "}
            <CardContent className="pt-6">
              {" "}
              <div className="text-sm text-muted-foreground">
                Minimum Required
              </div>{" "}
              <div className="text-2xl font-bold">
                {" "}
                ${(data.summary.minimumCash / 1000).toFixed(1)}K{" "}
              </div>{" "}
            </CardContent>{" "}
          </Card>{" "}
          <Card>
            {" "}
            <CardContent className="pt-6">
              {" "}
              <div className="text-sm text-muted-foreground">
                {" "}
                Projected Cash (30 days){" "}
              </div>{" "}
              <div
                className={`text-2xl font-bold ${data.summary.projectedCash >= 0 ? "text-primary" : "text-red-600"}`}
              >
                {" "}
                ${(data.summary.projectedCash / 1000).toFixed(1)}K{" "}
              </div>{" "}
            </CardContent>{" "}
          </Card>{" "}
          <Card>
            {" "}
            <CardContent className="pt-6">
              {" "}
              <div className="text-sm text-muted-foreground">
                Days of Cash
              </div>{" "}
              <div className="text-2xl font-bold">
                {" "}
                {data.summary.daysOfCash.toFixed(1)}{" "}
              </div>{" "}
              <div className="text-xs text-muted-foreground mt-1">
                days operating
              </div>{" "}
            </CardContent>{" "}
          </Card>{" "}
        </div>
      )}{" "}
      {data?.dailyBalance && (
        <Card>
          {" "}
          <CardHeader>
            {" "}
            <CardTitle>Daily Cash Balance Trend</CardTitle>{" "}
          </CardHeader>{" "}
          <CardContent>
            {" "}
            <ResponsiveContainer width="100%" height={300}>
              {" "}
              <LineChart data={data.dailyBalance}>
                {" "}
                <CartesianGrid strokeDasharray="3 3" /> <XAxis dataKey="date" />{" "}
                <YAxis />{" "}
                <Tooltip formatter={(value) => `$${value.toLocaleString()}`} />{" "}
                <Legend />{" "}
                <Line
                  type="monotone"
                  dataKey="cashBalance"
                  stroke="#3b82f6"
                  name="Cash Balance"
                  strokeWidth={2}
                />{" "}
                <Line
                  type="monotone"
                  dataKey="minimumCash"
                  stroke="#ef4444"
                  name="Minimum Required"
                  strokeDasharray="5 5"
                />{" "}
              </LineChart>{" "}
            </ResponsiveContainer>{" "}
          </CardContent>{" "}
        </Card>
      )}{" "}
      {data?.flowAnalysis && (
        <Card>
          {" "}
          <CardHeader>
            {" "}
            <CardTitle>Cash Flow Inflows & Outflows</CardTitle>{" "}
          </CardHeader>{" "}
          <CardContent>
            {" "}
            <ResponsiveContainer width="100%" height={300}>
              {" "}
              <BarChart data={data.flowAnalysis}>
                {" "}
                <CartesianGrid strokeDasharray="3 3" />{" "}
                <XAxis dataKey="period" /> <YAxis />{" "}
                <Tooltip formatter={(value) => `$${value.toLocaleString()}`} />{" "}
                <Legend />{" "}
                <Bar dataKey="inflows" fill="#10b981" name="Inflows" />{" "}
                <Bar dataKey="outflows" fill="#ef4444" name="Outflows" />{" "}
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
            <CardTitle>Detailed Cash Analysis</CardTitle>{" "}
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
                    <th className="text-left p-3 font-semibold">Period</th>{" "}
                    <th className="text-right p-3 font-semibold">
                      {" "}
                      Beginning Balance{" "}
                    </th>{" "}
                    <th className="text-right p-3 font-semibold">
                      Inflows
                    </th>{" "}
                    <th className="text-right p-3 font-semibold">Outflows</th>{" "}
                    <th className="text-right p-3 font-semibold">
                      {" "}
                      Ending Balance{" "}
                    </th>{" "}
                    <th className="text-right p-3 font-semibold">
                      {" "}
                      Days of Cash{" "}
                    </th>{" "}
                  </tr>{" "}
                </thead>{" "}
                <tbody>
                  {" "}
                  {data.details.map((row: any, idx: number) => (
                    <tr key={idx} className="border-b hover:bg-surface">
                      {" "}
                      <td className="p-3 font-semibold">{row.period}</td>{" "}
                      <td className="p-3 text-right">
                        {" "}
                        ${row.beginningBalance.toLocaleString()}{" "}
                      </td>{" "}
                      <td className="p-3 text-right text-green-600">
                        {" "}
                        ${row.inflows.toLocaleString()}{" "}
                      </td>{" "}
                      <td className="p-3 text-right text-red-600">
                        {" "}
                        ${row.outflows.toLocaleString()}{" "}
                      </td>{" "}
                      <td className="p-3 text-right font-semibold">
                        {" "}
                        ${row.endingBalance.toLocaleString()}{" "}
                      </td>{" "}
                      <td className="p-3 text-right">
                        {" "}
                        {row.daysOfCash.toFixed(1)}{" "}
                      </td>{" "}
                    </tr>
                  ))}{" "}
                </tbody>{" "}
              </table>{" "}
            </div>{" "}
          </CardContent>{" "}
        </Card>
      )}{" "}
      {data?.summary && data.summary.cashBalance < data.summary.minimumCash && (
        <Card className="border-red-200 bg-red-50">
          {" "}
          <CardContent className="pt-6 flex items-center gap-3">
            {" "}
            <AlertTriangle className="text-red-600" size={24} />{" "}
            <div>
              {" "}
              <p className="font-semibold text-red-900">
                {" "}
                Cash Position Below Minimum{" "}
              </p>{" "}
              <p className="text-sm text-red-700 mt-1">
                {" "}
                Current cash is ${(data.summary.cashBalance / 1000).toFixed(
                  1,
                )}{" "}
                K, but minimum required is ${" "}
                {(data.summary.minimumCash / 1000).toFixed(1)}K. Consider
                reducing expenses or accelerating collections.{" "}
              </p>{" "}
            </div>{" "}
          </CardContent>{" "}
        </Card>
      )}{" "}
    </div>
  );
}
