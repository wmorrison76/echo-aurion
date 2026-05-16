import React from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { Loader, AlertCircle, Download } from "lucide-react";
interface OperatingExpensesReportProps {
  entityId: string;
  periodDate: string;
}
const COLORS = [
  "#dc9c3f",
  "#f59e0b",
  "#d97706",
  "#b45309",
  "#92400e",
  "#78350f",
];
export function OperatingExpensesReport({
  entityId,
  periodDate,
}: OperatingExpensesReportProps) {
  const { data, isLoading, error } = useQuery({
    queryKey: ["usali-operating-expenses", entityId, periodDate],
    queryFn: async () => {
      const res = await fetch(
        `/api/aurum/reports/usali/operating-expenses?entityId=${entityId}&periodDate=${periodDate}`,
      );
      if (!res.ok) throw new Error("Failed to fetch operating expenses");
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
  const { categories, summary, timeline } = data;
  const expensePercent = (summary.totalExpenses / summary.totalRevenue) * 100;
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
              Total Operating Expenses{" "}
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
            <p className="text-xs text-muted-foreground mt-1">
              {" "}
              {expensePercent.toFixed(1)}% of revenue{" "}
            </p>{" "}
          </CardContent>{" "}
        </Card>{" "}
        <Card>
          {" "}
          <CardHeader className="pb-3">
            {" "}
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {" "}
              Largest Category{" "}
            </CardTitle>{" "}
          </CardHeader>{" "}
          <CardContent>
            {" "}
            <div className="text-2xl font-bold">
              {summary.largestCategory}
            </div>{" "}
            <p className="text-xs text-muted-foreground mt-1">
              {" "}
              ${summary.largestAmount.toLocaleString()}{" "}
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
              className={`text-2xl font-bold ${summary.budgetVariance < 0 ? "text-green-600" : "text-red-600"}`}
            >
              {" "}
              {summary.budgetVariance < 0 ? "" : "+"}{" "}
              {summary.budgetVariance.toFixed(1)}%{" "}
            </div>{" "}
            <p className="text-xs text-muted-foreground mt-1">
              {" "}
              Over/under budget{" "}
            </p>{" "}
          </CardContent>{" "}
        </Card>{" "}
      </div>{" "}
      {/* Expenses by Category */}{" "}
      <Card>
        {" "}
        <CardHeader>
          {" "}
          <CardTitle>Operating Expenses by Category</CardTitle>{" "}
        </CardHeader>{" "}
        <CardContent>
          {" "}
          <ResponsiveContainer width="100%" height={300}>
            {" "}
            <BarChart data={categories}>
              {" "}
              <CartesianGrid strokeDasharray="3 3" />{" "}
              <XAxis dataKey="category" /> <YAxis />{" "}
              <Tooltip formatter={(value) => `$${value.toLocaleString()}`} />{" "}
              <Bar dataKey="actual" fill="#dc9c3f" name="Actual" />{" "}
              <Bar dataKey="budget" fill="#cbd5e1" name="Budget" />{" "}
            </BarChart>{" "}
          </ResponsiveContainer>{" "}
        </CardContent>{" "}
      </Card>{" "}
      {/* Distribution Pie Chart */}{" "}
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
                data={categories}
                dataKey="actual"
                nameKey="category"
                cx="50%"
                cy="50%"
                outerRadius={100}
                label
              >
                {" "}
                {categories.map((_, index) => (
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
      {/* Detailed Breakdown */}{" "}
      <Card>
        {" "}
        <CardHeader>
          {" "}
          <CardTitle>Category Details</CardTitle>{" "}
        </CardHeader>{" "}
        <CardContent>
          {" "}
          <div className="space-y-3">
            {" "}
            {categories.map((cat) => (
              <div
                key={cat.category}
                className="flex items-center justify-between p-3 border rounded-lg"
              >
                {" "}
                <div className="flex-1">
                  {" "}
                  <p className="font-medium">{cat.category}</p>{" "}
                  <div className="text-xs text-muted-foreground">
                    {" "}
                    Actual: ${cat.actual.toLocaleString()} | Budget: ${" "}
                    {cat.budget.toLocaleString()}{" "}
                  </div>{" "}
                </div>{" "}
                <div className="text-right">
                  {" "}
                  <p className="font-bold text-aurum-600">
                    {" "}
                    {cat.percentOfTotal.toFixed(1)}%{" "}
                  </p>{" "}
                </div>{" "}
              </div>
            ))}{" "}
          </div>{" "}
        </CardContent>{" "}
      </Card>{" "}
      {/* Trend Over Time */}{" "}
      <Card>
        {" "}
        <CardHeader>
          {" "}
          <CardTitle>Expense Trend</CardTitle>{" "}
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
              <Bar dataKey="expenses" fill="#dc9c3f" />{" "}
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
