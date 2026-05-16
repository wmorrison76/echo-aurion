import React, { useState } from "react";
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
import { Loader, AlertCircle, Download } from "lucide-react";
interface RoomRevenueReportProps {
  entityId: string;
  periodDate: string;
}
export function RoomRevenueReport({
  entityId,
  periodDate,
}: RoomRevenueReportProps) {
  const { data, isLoading, error } = useQuery({
    queryKey: ["usali-room-revenue", entityId, periodDate],
    queryFn: async () => {
      const res = await fetch(
        `/api/aurum/reports/usali/room-revenue?entityId=${entityId}&periodDate=${periodDate}`,
      );
      if (!res.ok) throw new Error("Failed to fetch room revenue");
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
          <div>
            {" "}
            <p className="font-medium text-red-900">
              Error loading report
            </p>{" "}
            <p className="text-sm text-red-700">
              {" "}
              {error instanceof Error ? error.message : "Unknown error"}{" "}
            </p>{" "}
          </div>{" "}
        </CardContent>{" "}
      </Card>
    );
  }
  if (!data) return null;
  const { metrics, timeline, roomTypes, variance } = data;
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
              Total Room Revenue{" "}
            </CardTitle>{" "}
          </CardHeader>{" "}
          <CardContent>
            {" "}
            <div className="text-2xl font-bold">
              {" "}
              ${" "}
              {metrics.totalRoomRevenue.toLocaleString("en-US", {
                maximumFractionDigits: 0,
              })}{" "}
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
              Rooms Sold{" "}
            </CardTitle>{" "}
          </CardHeader>{" "}
          <CardContent>
            {" "}
            <div className="text-2xl font-bold">{metrics.roomsSold}</div>{" "}
            <p className="text-xs text-muted-foreground mt-1">
              {" "}
              Available nights{" "}
            </p>{" "}
          </CardContent>{" "}
        </Card>{" "}
        <Card>
          {" "}
          <CardHeader className="pb-3">
            {" "}
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {" "}
              Average Rate (ADR){" "}
            </CardTitle>{" "}
          </CardHeader>{" "}
          <CardContent>
            {" "}
            <div className="text-2xl font-bold">
              {" "}
              ${" "}
              {metrics.adr.toLocaleString("en-US", {
                maximumFractionDigits: 2,
              })}{" "}
            </div>{" "}
            <p className="text-xs text-muted-foreground mt-1">
              {" "}
              Per available room{" "}
            </p>{" "}
          </CardContent>{" "}
        </Card>{" "}
        <Card>
          {" "}
          <CardHeader className="pb-3">
            {" "}
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {" "}
              Occupancy Rate{" "}
            </CardTitle>{" "}
          </CardHeader>{" "}
          <CardContent>
            {" "}
            <div className="text-2xl font-bold">
              {" "}
              {metrics.occupancyRate.toFixed(1)}%{" "}
            </div>{" "}
            <p className="text-xs text-muted-foreground mt-1">
              {" "}
              Of available rooms{" "}
            </p>{" "}
          </CardContent>{" "}
        </Card>{" "}
      </div>{" "}
      {/* Revenue by Room Type */}{" "}
      <Card>
        {" "}
        <CardHeader>
          {" "}
          <CardTitle>Revenue by Room Type</CardTitle>{" "}
        </CardHeader>{" "}
        <CardContent>
          {" "}
          <div className="space-y-3">
            {" "}
            {roomTypes.map((type) => (
              <div
                key={type.roomType}
                className="flex items-center justify-between p-3 border rounded-lg"
              >
                {" "}
                <div className="flex-1">
                  {" "}
                  <p className="font-medium">{type.roomType}</p>{" "}
                  <p className="text-sm text-muted-foreground">
                    {" "}
                    {type.roomsSold} rooms{" "}
                  </p>{" "}
                </div>{" "}
                <div className="text-right">
                  {" "}
                  <p className="font-bold text-aurum-600">
                    {" "}
                    ${type.revenue.toLocaleString()}{" "}
                  </p>{" "}
                  <p className="text-sm text-muted-foreground">
                    {" "}
                    ${type.adr.toFixed(2)} ADR{" "}
                  </p>{" "}
                </div>{" "}
              </div>
            ))}{" "}
          </div>{" "}
        </CardContent>{" "}
      </Card>{" "}
      {/* Timeline Chart */}{" "}
      <Card>
        {" "}
        <CardHeader>
          {" "}
          <CardTitle>Revenue Trend</CardTitle>{" "}
        </CardHeader>{" "}
        <CardContent>
          {" "}
          <ResponsiveContainer width="100%" height={300}>
            {" "}
            <LineChart data={timeline}>
              {" "}
              <CartesianGrid strokeDasharray="3 3" /> <XAxis dataKey="date" />{" "}
              <YAxis />{" "}
              <Tooltip formatter={(value) => `$${value.toLocaleString()}`} />{" "}
              <Legend />{" "}
              <Line
                type="monotone"
                dataKey="revenue"
                stroke="#dc9c3f"
                strokeWidth={2}
              />{" "}
            </LineChart>{" "}
          </ResponsiveContainer>{" "}
        </CardContent>{" "}
      </Card>{" "}
      {/* Variance Analysis */}{" "}
      {variance && (
        <Card>
          {" "}
          <CardHeader>
            {" "}
            <CardTitle>Variance vs Budget</CardTitle>{" "}
          </CardHeader>{" "}
          <CardContent>
            {" "}
            <div className="space-y-3">
              {" "}
              <div className="flex items-center justify-between">
                {" "}
                <span>Budget vs Actual</span>{" "}
                <Badge
                  variant={variance.percentage > 0 ? "default" : "destructive"}
                >
                  {" "}
                  {variance.percentage > 0 ? "+" : ""}{" "}
                  {variance.percentage.toFixed(1)}%{" "}
                </Badge>{" "}
              </div>{" "}
              <div className="text-sm text-muted-foreground">
                {" "}
                Budget: ${variance.budget.toLocaleString()} | Actual: ${" "}
                {variance.actual.toLocaleString()} | Variance: ${" "}
                {variance.amount.toLocaleString()}{" "}
              </div>{" "}
            </div>{" "}
          </CardContent>{" "}
        </Card>
      )}{" "}
      {/* Download Button */}{" "}
      <button className="flex items-center gap-2 px-4 py-2 bg-aurum-500 text-white rounded-lg hover:bg-aurum-600">
        {" "}
        <Download className="h-4 w-4" /> Export to PDF{" "}
      </button>{" "}
    </div>
  );
}
