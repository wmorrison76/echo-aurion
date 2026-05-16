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
interface CashPositionReportProps {
  entityId: string;
  periodDate: string;
}
export function CashPositionReport({
  entityId,
  periodDate,
}: CashPositionReportProps) {
  const { data, isLoading, error } = useQuery({
    queryKey: ["usali-cash-position", entityId, periodDate],
    queryFn: async () => {
      const res = await fetch(
        `/api/aurum/reports/usali/cash-position?entityId=${entityId}&periodDate=${periodDate}`,
      );
      if (!res.ok) throw new Error("Failed to fetch cash position");
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
  const { position, flow, forecast, accounts } = data;
  return (
    <div className="space-y-6">
      {" "}
      {/* Current Position */}{" "}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {" "}
        <Card>
          {" "}
          <CardHeader className="pb-3">
            {" "}
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {" "}
              Beginning Cash{" "}
            </CardTitle>{" "}
          </CardHeader>{" "}
          <CardContent>
            {" "}
            <div className="text-2xl font-bold">
              {" "}
              ${" "}
              {position.beginningCash.toLocaleString("en-US", {
                maximumFractionDigits: 0,
              })}{" "}
            </div>{" "}
            <p className="text-xs text-muted-foreground mt-1">
              Period start
            </p>{" "}
          </CardContent>{" "}
        </Card>{" "}
        <Card>
          {" "}
          <CardHeader className="pb-3">
            {" "}
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {" "}
              Ending Cash{" "}
            </CardTitle>{" "}
          </CardHeader>{" "}
          <CardContent>
            {" "}
            <div
              className={`text-2xl font-bold ${position.endingCash >= 0 ? "text-green-600" : "text-red-600"}`}
            >
              {" "}
              ${" "}
              {position.endingCash.toLocaleString("en-US", {
                maximumFractionDigits: 0,
              })}{" "}
            </div>{" "}
            <Badge
              variant={
                position.endingCash >= position.beginningCash
                  ? "default"
                  : "destructive"
              }
              className="mt-2"
            >
              {" "}
              {position.endingCash >= position.beginningCash ? "+" : ""}{" "}
              {(
                position.endingCash - position.beginningCash
              ).toLocaleString()}{" "}
            </Badge>{" "}
          </CardContent>{" "}
        </Card>{" "}
        <Card>
          {" "}
          <CardHeader className="pb-3">
            {" "}
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {" "}
              Net Cash Flow{" "}
            </CardTitle>{" "}
          </CardHeader>{" "}
          <CardContent>
            {" "}
            <div
              className={`text-2xl font-bold ${position.netCashFlow >= 0 ? "text-green-600" : "text-red-600"}`}
            >
              {" "}
              ${" "}
              {position.netCashFlow.toLocaleString("en-US", {
                maximumFractionDigits: 0,
              })}{" "}
            </div>{" "}
            <div className="flex items-center gap-1 mt-1 text-xs">
              {" "}
              {position.netCashFlow >= 0 ? (
                <TrendingUp className="h-3 w-3 text-green-600" />
              ) : (
                <TrendingDown className="h-3 w-3 text-red-600" />
              )}{" "}
              <span className="text-muted-foreground">
                Net inflow/outflow
              </span>{" "}
            </div>{" "}
          </CardContent>{" "}
        </Card>{" "}
      </div>{" "}
      {/* Cash Flow Statement */}{" "}
      <Card>
        {" "}
        <CardHeader>
          {" "}
          <CardTitle>Cash Flow Statement</CardTitle>{" "}
        </CardHeader>{" "}
        <CardContent>
          {" "}
          <div className="space-y-4">
            {" "}
            {/* Operating Activities */}{" "}
            <div className="border rounded-lg p-4">
              {" "}
              <h4 className="font-semibold mb-3">Operating Activities</h4>{" "}
              <div className="space-y-2 text-sm">
                {" "}
                <div className="flex justify-between">
                  {" "}
                  <span>Net Income</span>{" "}
                  <span className="text-green-600 font-semibold">
                    {" "}
                    ${flow.netIncome.toLocaleString()}{" "}
                  </span>{" "}
                </div>{" "}
                <div className="flex justify-between">
                  {" "}
                  <span>Depreciation & Amortization</span>{" "}
                  <span className="text-green-600 font-semibold">
                    {" "}
                    ${flow.depreciationAmortization.toLocaleString()}{" "}
                  </span>{" "}
                </div>{" "}
                <div className="border-t pt-2 flex justify-between font-semibold">
                  {" "}
                  <span>Operating Cash Flow</span>{" "}
                  <span className="text-green-600">
                    {" "}
                    ${flow.operatingCashFlow.toLocaleString()}{" "}
                  </span>{" "}
                </div>{" "}
              </div>{" "}
            </div>{" "}
            {/* Investing Activities */}{" "}
            <div className="border rounded-lg p-4">
              {" "}
              <h4 className="font-semibold mb-3">Investing Activities</h4>{" "}
              <div className="space-y-2 text-sm">
                {" "}
                <div className="flex justify-between">
                  {" "}
                  <span>Capital Expenditures</span>{" "}
                  <span className="text-red-600 font-semibold">
                    {" "}
                    -${flow.capex.toLocaleString()}{" "}
                  </span>{" "}
                </div>{" "}
                <div className="flex justify-between border-t pt-2 font-semibold">
                  {" "}
                  <span>Investing Cash Flow</span>{" "}
                  <span className="text-red-600">
                    {" "}
                    -${flow.investingCashFlow.toLocaleString()}{" "}
                  </span>{" "}
                </div>{" "}
              </div>{" "}
            </div>{" "}
            {/* Financing Activities */}{" "}
            <div className="border rounded-lg p-4">
              {" "}
              <h4 className="font-semibold mb-3">Financing Activities</h4>{" "}
              <div className="space-y-2 text-sm">
                {" "}
                <div className="flex justify-between">
                  {" "}
                  <span>Debt Payments</span>{" "}
                  <span className="text-red-600 font-semibold">
                    {" "}
                    -${flow.debtPayments.toLocaleString()}{" "}
                  </span>{" "}
                </div>{" "}
                <div className="flex justify-between">
                  {" "}
                  <span>Dividends Paid</span>{" "}
                  <span className="text-red-600 font-semibold">
                    {" "}
                    -${flow.dividends.toLocaleString()}{" "}
                  </span>{" "}
                </div>{" "}
                <div className="border-t pt-2 flex justify-between font-semibold">
                  {" "}
                  <span>Financing Cash Flow</span>{" "}
                  <span className="text-red-600">
                    {" "}
                    -${flow.financingCashFlow.toLocaleString()}{" "}
                  </span>{" "}
                </div>{" "}
              </div>{" "}
            </div>{" "}
          </div>{" "}
        </CardContent>{" "}
      </Card>{" "}
      {/* Daily Cash Position */}{" "}
      <Card>
        {" "}
        <CardHeader>
          {" "}
          <CardTitle>Daily Cash Position Trend</CardTitle>{" "}
        </CardHeader>{" "}
        <CardContent>
          {" "}
          <ResponsiveContainer width="100%" height={300}>
            {" "}
            <LineChart data={forecast}>
              {" "}
              <CartesianGrid strokeDasharray="3 3" /> <XAxis dataKey="date" />{" "}
              <YAxis />{" "}
              <Tooltip formatter={(value) => `$${value.toLocaleString()}`} />{" "}
              <Legend />{" "}
              <Line
                type="monotone"
                dataKey="cash"
                stroke="#22c55e"
                strokeWidth={2}
                name="Cash Position"
              />{" "}
              <Line
                type="monotone"
                dataKey="forecast"
                stroke="#dc9c3f"
                strokeWidth={2}
                strokeDasharray="5 5"
                name="Forecast"
              />{" "}
            </LineChart>{" "}
          </ResponsiveContainer>{" "}
        </CardContent>{" "}
      </Card>{" "}
      {/* Cash Accounts Breakdown */}{" "}
      <Card>
        {" "}
        <CardHeader>
          {" "}
          <CardTitle>Cash Accounts Breakdown</CardTitle>{" "}
        </CardHeader>{" "}
        <CardContent>
          {" "}
          <div className="space-y-3">
            {" "}
            {accounts.map((account) => (
              <div
                key={account.accountCode}
                className="flex items-center justify-between p-3 border rounded-lg"
              >
                {" "}
                <div className="flex-1">
                  {" "}
                  <p className="font-medium">{account.accountName}</p>{" "}
                  <p className="text-sm text-muted-foreground">
                    {" "}
                    {account.accountCode}{" "}
                  </p>{" "}
                </div>{" "}
                <div className="text-right">
                  {" "}
                  <p className="font-bold text-aurum-600">
                    {" "}
                    ${account.balance.toLocaleString()}{" "}
                  </p>{" "}
                  <p className="text-sm text-muted-foreground">
                    {" "}
                    {account.balancePercent.toFixed(1)}% of total{" "}
                  </p>{" "}
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
