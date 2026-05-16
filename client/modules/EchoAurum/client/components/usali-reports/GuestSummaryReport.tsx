import React from "react";
import { useQuery } from "@tanstack/react-query";
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
import { Loader, AlertCircle, Download, Users } from "lucide-react";
interface GuestSummaryReportProps {
  entityId: string;
  periodDate: string;
}
export function GuestSummaryReport({
  entityId,
  periodDate,
}: GuestSummaryReportProps) {
  const { data, isLoading, error } = useQuery({
    queryKey: ["usali-guest-summary", entityId, periodDate],
    queryFn: async () => {
      const res = await fetch(
        `/api/aurum/reports/usali/guest-summary?entityId=${entityId}&periodDate=${periodDate}`,
      );
      if (!res.ok) throw new Error("Failed to fetch guest summary");
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
  const { metrics, dayOfWeek, repurchaseRate, timelines } = data;
  return (
    <div className="space-y-6">
      {" "}
      {/* Key Metrics */}{" "}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {" "}
        <Card>
          {" "}
          <CardHeader className="pb-3">
            {" "}
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              {" "}
              <Users className="h-4 w-4" /> Total Guests{" "}
            </CardTitle>{" "}
          </CardHeader>{" "}
          <CardContent>
            {" "}
            <div className="text-2xl font-bold">
              {" "}
              {metrics.totalGuests.toLocaleString()}{" "}
            </div>{" "}
            <p className="text-xs text-muted-foreground mt-1">
              Current period
            </p>{" "}
          </CardContent>{" "}
        </Card>{" "}
        <Card>
          {" "}
          <CardHeader className="pb-3">
            {" "}
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {" "}
              New Guests{" "}
            </CardTitle>{" "}
          </CardHeader>{" "}
          <CardContent>
            {" "}
            <div className="text-2xl font-bold">
              {" "}
              {metrics.newGuests.toLocaleString()}{" "}
            </div>{" "}
            <p className="text-xs text-muted-foreground mt-1">
              {" "}
              {metrics.newGuestPercent.toFixed(1)}% of total{" "}
            </p>{" "}
          </CardContent>{" "}
        </Card>{" "}
        <Card>
          {" "}
          <CardHeader className="pb-3">
            {" "}
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {" "}
              Returning Guests{" "}
            </CardTitle>{" "}
          </CardHeader>{" "}
          <CardContent>
            {" "}
            <div className="text-2xl font-bold">
              {" "}
              {metrics.returningGuests.toLocaleString()}{" "}
            </div>{" "}
            <p className="text-xs text-muted-foreground mt-1">
              {" "}
              {(100 - metrics.newGuestPercent).toFixed(1)}% of total{" "}
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
              ${metrics.revenuePerGuest.toFixed(2)}{" "}
            </div>{" "}
            <p className="text-xs text-muted-foreground mt-1">
              Total / guests
            </p>{" "}
          </CardContent>{" "}
        </Card>{" "}
      </div>{" "}
      {/* Guests by Day of Week */}{" "}
      <Card>
        {" "}
        <CardHeader>
          {" "}
          <CardTitle>Guest Traffic by Day of Week</CardTitle>{" "}
        </CardHeader>{" "}
        <CardContent>
          {" "}
          <ResponsiveContainer width="100%" height={300}>
            {" "}
            <BarChart data={dayOfWeek}>
              {" "}
              <CartesianGrid strokeDasharray="3 3" /> <XAxis dataKey="day" />{" "}
              <YAxis yAxisId="left" />{" "}
              <YAxis yAxisId="right" orientation="right" /> <Tooltip />{" "}
              <Legend />{" "}
              <Bar
                yAxisId="left"
                dataKey="guests"
                fill="#3b82f6"
                name="Guest Count"
              />{" "}
              <Bar
                yAxisId="right"
                dataKey="revenue"
                fill="#10b981"
                name="Revenue"
              />{" "}
            </BarChart>{" "}
          </ResponsiveContainer>{" "}
        </CardContent>{" "}
      </Card>{" "}
      {/* Guest Trends */}{" "}
      <Card>
        {" "}
        <CardHeader>
          {" "}
          <CardTitle>Daily Guest Trend</CardTitle>{" "}
        </CardHeader>{" "}
        <CardContent>
          {" "}
          <ResponsiveContainer width="100%" height={250}>
            {" "}
            <LineChart data={timelines.daily}>
              {" "}
              <CartesianGrid strokeDasharray="3 3" /> <XAxis dataKey="date" />{" "}
              <YAxis /> <Tooltip /> <Legend />{" "}
              <Line
                type="monotone"
                dataKey="guests"
                stroke="#3b82f6"
                strokeWidth={2}
              />{" "}
            </LineChart>{" "}
          </ResponsiveContainer>{" "}
        </CardContent>{" "}
      </Card>{" "}
      {/* Repeat Rate */}{" "}
      <Card>
        {" "}
        <CardHeader>
          {" "}
          <CardTitle>Customer Repeat Rate Trend</CardTitle>{" "}
        </CardHeader>{" "}
        <CardContent>
          {" "}
          <ResponsiveContainer width="100%" height={250}>
            {" "}
            <LineChart data={repurchaseRate}>
              {" "}
              <CartesianGrid strokeDasharray="3 3" /> <XAxis dataKey="period" />{" "}
              <YAxis />{" "}
              <Tooltip formatter={(value) => `${value.toFixed(1)}%`} />{" "}
              <Legend />{" "}
              <Line
                type="monotone"
                dataKey="repeatRate"
                stroke="#8b5cf6"
                strokeWidth={2}
                name="Repeat Rate %"
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
