import React, { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
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
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Download, TrendingUp, Eye } from "lucide-react";
interface RoomRevenueReportProps {
  entityId: string;
  periodDate: string;
}
export function RoomRevenueReport({
  entityId,
  periodDate,
}: RoomRevenueReportProps) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const res = await fetch(
          `/api/aurum/reports/usali/room-revenue?entityId=${entityId}&periodDate=${periodDate}`,
        );
        if (!res.ok) throw new Error("Failed to fetch room revenue data");
        const json = await res.json();
        setData(json);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Error loading report");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [entityId, periodDate]);
  if (loading) {
    return (
      <Card>
        {" "}
        <CardContent className="pt-6">
          {" "}
          <div className="flex items-center justify-center p-8">
            {" "}
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>{" "}
          </div>{" "}
        </CardContent>{" "}
      </Card>
    );
  }
  if (error) {
    return (
      <Card className="border-red-200 bg-red-50">
        {" "}
        <CardContent className="pt-6">
          {" "}
          <p className="text-red-700">{error}</p>{" "}
        </CardContent>{" "}
      </Card>
    );
  }
  const COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6"];
  return (
    <div className="space-y-6">
      {" "}
      {/* Header */}{" "}
      <div className="flex items-center justify-between">
        {" "}
        <div>
          {" "}
          <h2 className="text-2xl font-bold">Room Revenue by Type</h2>{" "}
          <p className="text-muted-foreground text-sm mt-1">
            {" "}
            Detailed breakdown of room revenue by room type and rate
            category{" "}
          </p>{" "}
        </div>{" "}
        <Button variant="outline" size="sm">
          {" "}
          <Download size={16} className="mr-1" /> Export{" "}
        </Button>{" "}
      </div>{" "}
      {/* KPI Cards */}{" "}
      {data?.summary && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {" "}
          <Card>
            {" "}
            <CardContent className="pt-6">
              {" "}
              <div className="text-sm text-muted-foreground">
                Total Room Revenue
              </div>{" "}
              <div className="text-2xl font-bold text-primary">
                {" "}
                ${(data.summary.totalRoomRevenue / 1000).toFixed(1)}K{" "}
              </div>{" "}
              <Badge className="mt-2">
                {" "}
                ADR: ${data.summary.adr?.toFixed(2)}{" "}
              </Badge>{" "}
            </CardContent>{" "}
          </Card>{" "}
          <Card>
            {" "}
            <CardContent className="pt-6">
              {" "}
              <div className="text-sm text-muted-foreground">
                Occupancy Rate
              </div>{" "}
              <div className="text-2xl font-bold text-green-600">
                {" "}
                {data.summary.occupancyRate?.toFixed(1)}%{" "}
              </div>{" "}
              <div className="text-xs text-muted-foreground mt-1">
                {" "}
                {data.summary.roomsSold} rooms sold{" "}
              </div>{" "}
            </CardContent>{" "}
          </Card>{" "}
          <Card>
            {" "}
            <CardContent className="pt-6">
              {" "}
              <div className="text-sm text-muted-foreground">
                {" "}
                Revenue per Available Room{" "}
              </div>{" "}
              <div className="text-2xl font-bold text-purple-600">
                {" "}
                ${data.summary.revpar?.toFixed(2)}{" "}
              </div>{" "}
            </CardContent>{" "}
          </Card>{" "}
          <Card>
            {" "}
            <CardContent className="pt-6">
              {" "}
              <div className="text-sm text-muted-foreground">
                Avg. Room Rate
              </div>{" "}
              <div className="text-2xl font-bold">
                {" "}
                ${data.summary.adr?.toFixed(2)}{" "}
              </div>{" "}
            </CardContent>{" "}
          </Card>{" "}
        </div>
      )}{" "}
      {/* Revenue by Room Type */}{" "}
      {data?.byRoomType && (
        <Card>
          {" "}
          <CardHeader>
            {" "}
            <CardTitle>Revenue Distribution by Room Type</CardTitle>{" "}
            <CardDescription>
              {" "}
              Breakdown of revenue contribution by room category{" "}
            </CardDescription>{" "}
          </CardHeader>{" "}
          <CardContent>
            {" "}
            <ResponsiveContainer width="100%" height={300}>
              {" "}
              <BarChart data={data.byRoomType}>
                {" "}
                <CartesianGrid strokeDasharray="3 3" />{" "}
                <XAxis dataKey="roomType" /> <YAxis />{" "}
                <Tooltip formatter={(value) => `$${value.toLocaleString()}`} />{" "}
                <Legend />{" "}
                <Bar dataKey="revenue" fill="#3b82f6" name="Revenue" />{" "}
                <Bar
                  dataKey="count"
                  fill="#10b981"
                  name="Rooms Sold"
                  yAxisId="right"
                />{" "}
              </BarChart>{" "}
            </ResponsiveContainer>{" "}
          </CardContent>{" "}
        </Card>
      )}{" "}
      {/* Trend Analysis */}{" "}
      {data?.dailyTrend && (
        <Card>
          {" "}
          <CardHeader>
            {" "}
            <CardTitle>Daily Revenue Trend</CardTitle>{" "}
            <CardDescription>
              {" "}
              Room revenue trajectory throughout the period{" "}
            </CardDescription>{" "}
          </CardHeader>{" "}
          <CardContent>
            {" "}
            <ResponsiveContainer width="100%" height={300}>
              {" "}
              <LineChart data={data.dailyTrend}>
                {" "}
                <CartesianGrid strokeDasharray="3 3" /> <XAxis dataKey="date" />{" "}
                <YAxis />{" "}
                <Tooltip formatter={(value) => `$${value.toLocaleString()}`} />{" "}
                <Legend />{" "}
                <Line
                  type="monotone"
                  dataKey="revenue"
                  stroke="#3b82f6"
                  name="Revenue"
                />{" "}
                <Line
                  type="monotone"
                  dataKey="occupancyRate"
                  stroke="#10b981"
                  name="Occupancy %"
                />{" "}
              </LineChart>{" "}
            </ResponsiveContainer>{" "}
          </CardContent>{" "}
        </Card>
      )}{" "}
      {/* Detailed Table */}{" "}
      {data?.details && (
        <Card>
          {" "}
          <CardHeader>
            {" "}
            <CardTitle>Detailed Room Revenue Breakdown</CardTitle>{" "}
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
                      Room Type
                    </th>{" "}
                    <th className="text-left p-3 font-semibold">
                      {" "}
                      Rate Category{" "}
                    </th>{" "}
                    <th className="text-right p-3 font-semibold">
                      Revenue
                    </th>{" "}
                    <th className="text-right p-3 font-semibold">Rooms Sold</th>{" "}
                    <th className="text-right p-3 font-semibold">ADR</th>{" "}
                    <th className="text-right p-3 font-semibold">
                      % of Total
                    </th>{" "}
                  </tr>{" "}
                </thead>{" "}
                <tbody>
                  {" "}
                  {data.details.map((row: any, idx: number) => (
                    <tr key={idx} className="border-b hover:bg-surface">
                      {" "}
                      <td className="p-3 font-semibold">{row.roomType}</td>{" "}
                      <td className="p-3">{row.rateCategory}</td>{" "}
                      <td className="p-3 text-right font-semibold">
                        {" "}
                        ${row.revenue.toLocaleString()}{" "}
                      </td>{" "}
                      <td className="p-3 text-right">{row.roomsSold}</td>{" "}
                      <td className="p-3 text-right">${row.adr.toFixed(2)}</td>{" "}
                      <td className="p-3 text-right">
                        {" "}
                        {row.percentOfTotal.toFixed(1)}%{" "}
                      </td>{" "}
                    </tr>
                  ))}{" "}
                </tbody>{" "}
              </table>{" "}
            </div>{" "}
          </CardContent>{" "}
        </Card>
      )}{" "}
      {/* Drill-Down Option */}{" "}
      <Card className="border-blue-200 bg-blue-50">
        {" "}
        <CardContent className="pt-6 flex items-center justify-between">
          {" "}
          <div className="flex items-center gap-2">
            {" "}
            <Eye className="text-primary" size={18} />{" "}
            <span className="text-sm text-blue-700">
              {" "}
              Want to see account-level detail? Drill down to GL accounts{" "}
            </span>{" "}
          </div>{" "}
          <Button variant="outline" size="sm">
            {" "}
            Drill Down to GL{" "}
          </Button>{" "}
        </CardContent>{" "}
      </Card>{" "}
    </div>
  );
}
