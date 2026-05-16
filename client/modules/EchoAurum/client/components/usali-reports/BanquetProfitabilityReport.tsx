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
  LineChart,
  Line,
} from "recharts";
import { Loader, AlertCircle, Download } from "lucide-react";
interface BanquetProfitabilityReportProps {
  entityId: string;
  periodDate: string;
}
export function BanquetProfitabilityReport({
  entityId,
  periodDate,
}: BanquetProfitabilityReportProps) {
  const { data, isLoading, error } = useQuery({
    queryKey: ["usali-banquet-profitability", entityId, periodDate],
    queryFn: async () => {
      const res = await fetch(
        `/api/aurum/reports/usali/banquet-profitability?entityId=${entityId}&periodDate=${periodDate}`,
      );
      if (!res.ok) throw new Error("Failed to fetch banquet profitability");
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
  const { metrics, events, timeline, summary } = data;
  const profitMargin = (
    (summary.totalProfit / summary.totalRevenue) *
    100
  ).toFixed(1);
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
              Total Event Revenue{" "}
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
            <p className="text-xs text-muted-foreground mt-1">
              {" "}
              {metrics.totalEvents} events{" "}
            </p>{" "}
          </CardContent>{" "}
        </Card>{" "}
        <Card>
          {" "}
          <CardHeader className="pb-3">
            {" "}
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {" "}
              Total Event Expenses{" "}
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
              All events
            </p>{" "}
          </CardContent>{" "}
        </Card>{" "}
        <Card>
          {" "}
          <CardHeader className="pb-3">
            {" "}
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {" "}
              Total Event Profit{" "}
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
              {profitMargin}% margin{" "}
            </p>{" "}
          </CardContent>{" "}
        </Card>{" "}
        <Card>
          {" "}
          <CardHeader className="pb-3">
            {" "}
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {" "}
              Avg Revenue per Guest{" "}
            </CardTitle>{" "}
          </CardHeader>{" "}
          <CardContent>
            {" "}
            <div className="text-2xl font-bold">
              {" "}
              ${metrics.avgRevenuePerGuest.toFixed(2)}{" "}
            </div>{" "}
            <p className="text-xs text-muted-foreground mt-1">
              {" "}
              {metrics.totalGuests.toLocaleString()} guests{" "}
            </p>{" "}
          </CardContent>{" "}
        </Card>{" "}
      </div>{" "}
      {/* Events Profitability */}{" "}
      <Card>
        {" "}
        <CardHeader>
          {" "}
          <CardTitle>Event Profitability Analysis</CardTitle>{" "}
        </CardHeader>{" "}
        <CardContent>
          {" "}
          <div className="space-y-3">
            {" "}
            {events.map((event) => (
              <div
                key={event.eventId}
                className="flex items-center justify-between p-3 border rounded-lg"
              >
                {" "}
                <div className="flex-1">
                  {" "}
                  <p className="font-medium">{event.eventName}</p>{" "}
                  <p className="text-sm text-muted-foreground">
                    {" "}
                    {event.guestCount} guests • {event.eventDate}{" "}
                  </p>{" "}
                </div>{" "}
                <div className="text-right">
                  {" "}
                  <p className="font-bold text-aurum-600">
                    {" "}
                    ${event.profit.toLocaleString()}{" "}
                  </p>{" "}
                  <Badge
                    variant={
                      event.marginPercent >= 25 ? "default" : "secondary"
                    }
                  >
                    {" "}
                    {event.marginPercent.toFixed(1)}%{" "}
                  </Badge>{" "}
                </div>{" "}
              </div>
            ))}{" "}
          </div>{" "}
        </CardContent>{" "}
      </Card>{" "}
      {/* Revenue vs Expenses by Event Type */}{" "}
      <Card>
        {" "}
        <CardHeader>
          {" "}
          <CardTitle>Profitability by Event Type</CardTitle>{" "}
        </CardHeader>{" "}
        <CardContent>
          {" "}
          <ResponsiveContainer width="100%" height={300}>
            {" "}
            <BarChart data={events}>
              {" "}
              <CartesianGrid strokeDasharray="3 3" />{" "}
              <XAxis dataKey="eventType" /> <YAxis />{" "}
              <Tooltip formatter={(value) => `$${value.toLocaleString()}`} />{" "}
              <Legend /> <Bar dataKey="revenue" fill="#22c55e" name="Revenue" />{" "}
              <Bar dataKey="expenses" fill="#ef4444" name="Expenses" />{" "}
            </BarChart>{" "}
          </ResponsiveContainer>{" "}
        </CardContent>{" "}
      </Card>{" "}
      {/* Profit Trend */}{" "}
      <Card>
        {" "}
        <CardHeader>
          {" "}
          <CardTitle>Profit Trend Over Time</CardTitle>{" "}
        </CardHeader>{" "}
        <CardContent>
          {" "}
          <ResponsiveContainer width="100%" height={250}>
            {" "}
            <LineChart data={timeline}>
              {" "}
              <CartesianGrid strokeDasharray="3 3" /> <XAxis dataKey="date" />{" "}
              <YAxis />{" "}
              <Tooltip formatter={(value) => `$${value.toLocaleString()}`} />{" "}
              <Legend />{" "}
              <Line
                type="monotone"
                dataKey="profit"
                stroke="#22c55e"
                strokeWidth={2}
              />{" "}
            </LineChart>{" "}
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
