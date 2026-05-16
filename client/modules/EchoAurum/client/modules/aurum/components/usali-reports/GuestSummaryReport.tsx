import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
export function GuestSummaryReport({
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
          `/api/aurum/reports/usali/guest-summary?entityId=${entityId}&periodDate=${periodDate}`,
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
          <h2 className="text-2xl font-bold">Guest Summary</h2>{" "}
          <p className="text-muted-foreground text-sm mt-1">
            {" "}
            Guest count and occupancy metrics{" "}
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
                Total Guests
              </div>{" "}
              <div className="text-2xl font-bold text-primary">
                {" "}
                {data.summary.totalGuests?.toLocaleString()}{" "}
              </div>{" "}
            </CardContent>{" "}
          </Card>{" "}
          <Card>
            {" "}
            <CardContent className="pt-6">
              {" "}
              <div className="text-sm text-muted-foreground">
                Room Nights
              </div>{" "}
              <div className="text-2xl font-bold text-purple-600">
                {" "}
                {data.summary.roomNights?.toLocaleString()}{" "}
              </div>{" "}
            </CardContent>{" "}
          </Card>{" "}
          <Card>
            {" "}
            <CardContent className="pt-6">
              {" "}
              <div className="text-sm text-muted-foreground">
                Avg. Guest Count
              </div>{" "}
              <div className="text-2xl font-bold">
                {" "}
                {data.summary.avgGuestCount?.toFixed(1)}{" "}
              </div>{" "}
            </CardContent>{" "}
          </Card>{" "}
          <Card>
            {" "}
            <CardContent className="pt-6">
              {" "}
              <div className="text-sm text-muted-foreground">
                Occupancy %
              </div>{" "}
              <div className="text-2xl font-bold text-green-600">
                {" "}
                {data.summary.occupancyPercent?.toFixed(1)}%{" "}
              </div>{" "}
            </CardContent>{" "}
          </Card>{" "}
        </div>
      )}{" "}
      {data?.dailyGuests && (
        <Card>
          {" "}
          <CardHeader>
            {" "}
            <CardTitle>Daily Guest Count</CardTitle>{" "}
          </CardHeader>{" "}
          <CardContent>
            {" "}
            <ResponsiveContainer width="100%" height={300}>
              {" "}
              <BarChart data={data.dailyGuests}>
                {" "}
                <CartesianGrid strokeDasharray="3 3" /> <XAxis dataKey="date" />{" "}
                <YAxis /> <Tooltip /> <Legend />{" "}
                <Bar dataKey="guestCount" fill="#3b82f6" name="Guests" />{" "}
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
            <CardTitle>Detailed Guest Analytics</CardTitle>{" "}
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
                    <th className="text-right p-3 font-semibold">Guests</th>{" "}
                    <th className="text-right p-3 font-semibold">
                      {" "}
                      Room Nights{" "}
                    </th>{" "}
                    <th className="text-right p-3 font-semibold">
                      {" "}
                      Avg. Guests{" "}
                    </th>{" "}
                    <th className="text-right p-3 font-semibold">
                      {" "}
                      Occupancy %{" "}
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
                        {row.guestCount?.toLocaleString()}{" "}
                      </td>{" "}
                      <td className="p-3 text-right">
                        {" "}
                        {row.roomNights?.toLocaleString()}{" "}
                      </td>{" "}
                      <td className="p-3 text-right">
                        {" "}
                        {row.avgGuests?.toFixed(1)}{" "}
                      </td>{" "}
                      <td className="p-3 text-right">
                        {" "}
                        {row.occupancyPercent?.toFixed(1)}%{" "}
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
