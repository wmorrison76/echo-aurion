import React, { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
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
export function LaborAnalysisReport({
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
          `/api/aurum/reports/usali/labor-analysis?entityId=${entityId}&periodDate=${periodDate}`,
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
          <h2 className="text-2xl font-bold">
            Labor Analysis by Department
          </h2>{" "}
          <p className="text-muted-foreground text-sm mt-1">
            {" "}
            Labor cost tracking and productivity metrics{" "}
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
                Total Labor Cost
              </div>{" "}
              <div className="text-2xl font-bold text-red-600">
                {" "}
                ${(data.summary.totalLaborCost / 1000).toFixed(1)}K{" "}
              </div>{" "}
            </CardContent>{" "}
          </Card>{" "}
          <Card>
            {" "}
            <CardContent className="pt-6">
              {" "}
              <div className="text-sm text-muted-foreground">
                Labor Cost %
              </div>{" "}
              <div className="text-2xl font-bold">
                {" "}
                {data.summary.laborCostPercent?.toFixed(1)}%{" "}
              </div>{" "}
            </CardContent>{" "}
          </Card>{" "}
          <Card>
            {" "}
            <CardContent className="pt-6">
              {" "}
              <div className="text-sm text-muted-foreground">
                Total Hours
              </div>{" "}
              <div className="text-2xl font-bold">
                {" "}
                {data.summary.totalHours?.toLocaleString()}{" "}
              </div>{" "}
            </CardContent>{" "}
          </Card>{" "}
          <Card>
            {" "}
            <CardContent className="pt-6">
              {" "}
              <div className="text-sm text-muted-foreground">
                Avg. Hourly Rate
              </div>{" "}
              <div className="text-2xl font-bold">
                {" "}
                ${data.summary.avgHourlyRate?.toFixed(2)}{" "}
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
            <CardTitle>Labor Cost by Department</CardTitle>{" "}
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
                <Bar
                  dataKey="laborCost"
                  fill="#ef4444"
                  name="Labor Cost"
                />{" "}
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
            <CardTitle>Detailed Labor Analysis</CardTitle>{" "}
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
                    <th className="text-right p-3 font-semibold">Hours</th>{" "}
                    <th className="text-right p-3 font-semibold">Labor Cost</th>{" "}
                    <th className="text-right p-3 font-semibold">
                      {" "}
                      Avg. Hourly Rate{" "}
                    </th>{" "}
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
                      <td className="p-3 font-semibold">
                        {row.department}
                      </td>{" "}
                      <td className="p-3 text-right">
                        {" "}
                        {row.hours.toLocaleString()}{" "}
                      </td>{" "}
                      <td className="p-3 text-right">
                        {" "}
                        ${row.laborCost.toLocaleString()}{" "}
                      </td>{" "}
                      <td className="p-3 text-right">
                        {" "}
                        ${row.avgHourlyRate.toFixed(2)}{" "}
                      </td>{" "}
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
    </div>
  );
}
