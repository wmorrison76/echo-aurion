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
import { Loader, AlertCircle, Download } from "lucide-react";
interface DepartmentalPLReportProps {
  entityId: string;
  periodDate: string;
}
export function DepartmentalPLReport({
  entityId,
  periodDate,
}: DepartmentalPLReportProps) {
  const { data, isLoading, error } = useQuery({
    queryKey: ["usali-departmental-pl", entityId, periodDate],
    queryFn: async () => {
      const res = await fetch(
        `/api/aurum/reports/usali/departmental-pl?entityId=${entityId}&periodDate=${periodDate}`,
      );
      if (!res.ok) throw new Error("Failed to fetch departmental P&L");
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
              Total Revenue{" "}
            </CardTitle>{" "}
          </CardHeader>{" "}
          <CardContent>
            {" "}
            <div className="text-2xl font-bold">
              {" "}
              ${" "}
              {summary.totalRevenue.toLocaleString("en-US", {
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
              Total Expenses{" "}
            </CardTitle>{" "}
          </CardHeader>{" "}
          <CardContent>
            {" "}
            <div className="text-2xl font-bold">
              {" "}
              ${" "}
              {summary.totalExpenses.toLocaleString("en-US", {
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
              Total Profit{" "}
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
              {summary.profitMargin.toFixed(1)}% margin{" "}
            </p>{" "}
          </CardContent>{" "}
        </Card>{" "}
      </div>{" "}
      {/* Department Comparison Chart */}{" "}
      <Card>
        {" "}
        <CardHeader>
          {" "}
          <CardTitle>Revenue vs Expenses by Department</CardTitle>{" "}
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
              <Legend /> <Bar dataKey="revenue" fill="#22c55e" name="Revenue" />{" "}
              <Bar dataKey="expenses" fill="#ef4444" name="Expenses" />{" "}
            </BarChart>{" "}
          </ResponsiveContainer>{" "}
        </CardContent>{" "}
      </Card>{" "}
      {/* Detailed P&L by Department */}{" "}
      <Card>
        {" "}
        <CardHeader>
          {" "}
          <CardTitle>Departmental P&L Details</CardTitle>{" "}
        </CardHeader>{" "}
        <CardContent>
          {" "}
          <div className="overflow-x-auto">
            {" "}
            <table className="w-full text-sm">
              {" "}
              <thead>
                {" "}
                <tr className="border-b">
                  {" "}
                  <th className="text-left py-2 font-semibold">
                    Department
                  </th>{" "}
                  <th className="text-right py-2 font-semibold">Revenue</th>{" "}
                  <th className="text-right py-2 font-semibold">COGS</th>{" "}
                  <th className="text-right py-2 font-semibold">Labor</th>{" "}
                  <th className="text-right py-2 font-semibold">Other Exp</th>{" "}
                  <th className="text-right py-2 font-semibold">Profit</th>{" "}
                  <th className="text-right py-2 font-semibold">
                    Margin %
                  </th>{" "}
                </tr>{" "}
              </thead>{" "}
              <tbody>
                {" "}
                {departments.map((dept) => (
                  <tr
                    key={dept.department}
                    className="border-b hover:bg-muted/50"
                  >
                    {" "}
                    <td className="py-3 font-medium">{dept.department}</td>{" "}
                    <td className="text-right py-3 text-green-600 font-semibold">
                      {" "}
                      ${dept.revenue.toLocaleString()}{" "}
                    </td>{" "}
                    <td className="text-right py-3">
                      {" "}
                      ${dept.cogs.toLocaleString()}{" "}
                    </td>{" "}
                    <td className="text-right py-3">
                      {" "}
                      ${dept.labor.toLocaleString()}{" "}
                    </td>{" "}
                    <td className="text-right py-3">
                      {" "}
                      ${dept.otherExpenses.toLocaleString()}{" "}
                    </td>{" "}
                    <td
                      className={`text-right py-3 font-semibold ${dept.profit >= 0 ? "text-green-600" : "text-red-600"}`}
                    >
                      {" "}
                      ${dept.profit.toLocaleString()}{" "}
                    </td>{" "}
                    <td className="text-right py-3">
                      {" "}
                      <Badge
                        variant={
                          dept.marginPercent >= 30 ? "default" : "secondary"
                        }
                      >
                        {" "}
                        {dept.marginPercent.toFixed(1)}%{" "}
                      </Badge>{" "}
                    </td>{" "}
                  </tr>
                ))}{" "}
                <tr className="font-bold border-t-2">
                  {" "}
                  <td className="py-3">TOTAL</td>{" "}
                  <td className="text-right py-3 text-green-600">
                    {" "}
                    ${summary.totalRevenue.toLocaleString()}{" "}
                  </td>{" "}
                  <td className="text-right py-3">
                    {" "}
                    ${summary.totalCogs.toLocaleString()}{" "}
                  </td>{" "}
                  <td className="text-right py-3">
                    {" "}
                    ${summary.totalLabor.toLocaleString()}{" "}
                  </td>{" "}
                  <td className="text-right py-3">
                    {" "}
                    ${summary.totalOtherExpenses.toLocaleString()}{" "}
                  </td>{" "}
                  <td
                    className={`text-right py-3 ${summary.totalProfit >= 0 ? "text-green-600" : "text-red-600"}`}
                  >
                    {" "}
                    ${summary.totalProfit.toLocaleString()}{" "}
                  </td>{" "}
                  <td className="text-right py-3">
                    {" "}
                    {summary.profitMargin.toFixed(1)}%{" "}
                  </td>{" "}
                </tr>{" "}
              </tbody>{" "}
            </table>{" "}
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
