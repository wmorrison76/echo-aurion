/** * Forecast Dashboard * Shows 7/30/90-day forecast with quick what-if controls. * Displays revenue, labor hours, and SPLH projections. */
import React from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader, TrendingUp, TrendingDown } from "lucide-react";
import type { ForecastResult } from "../../../shared/types/forecast";
interface Props {
  org_id: string;
  outlet_id: string;
  dept_id: string;
}
export const ForecastDashboard: React.FC<Props> = ({
  org_id,
  outlet_id,
  dept_id,
}) => {
  const [horizon, setHorizon] = React.useState<7 | 30 | 90>(7);
  const [growth, setGrowth] = React.useState(0);
  const [wage, setWage] = React.useState(0);
  const [staffing, setStaffing] = React.useState(0);
  const [result, setResult] = React.useState<ForecastResult | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const handleRun = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/forecast/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          org_id,
          outlet_id,
          dept_id,
          horizon,
          sales_growth_pct: growth,
          wage_increase_pct: wage,
          staffing_delta_hours: staffing,
        }),
      });
      if (!res.ok) {
        throw new Error(`API error: ${res.statusText}`);
      }
      const data = await res.json();
      setResult(data);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      setError(message);
      console.error("Forecast error:", err);
    } finally {
      setLoading(false);
    }
  };
  const handleReset = () => {
    setGrowth(0);
    setWage(0);
    setStaffing(0);
    setResult(null);
  };
  return (
    <Card className="p-6 space-y-4">
      {" "}
      <div className="space-y-2">
        {" "}
        <h2 className="text-2xl font-bold">Forecast</h2>{" "}
        <p className="text-sm text-muted-foreground">
          {" "}
          Project labor needs and revenue with what-if scenarios{" "}
        </p>{" "}
      </div>{" "}
      {/* Controls */}{" "}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {" "}
        <div className="space-y-2">
          {" "}
          <label className="text-sm font-medium">Horizon</label>{" "}
          <Select
            value={horizon.toString()}
            onValueChange={(val) => setHorizon(Number(val) as any)}
          >
            {" "}
            <SelectTrigger>
              {" "}
              <SelectValue />{" "}
            </SelectTrigger>{" "}
            <SelectContent>
              {" "}
              <SelectItem value="7">7 days</SelectItem>{" "}
              <SelectItem value="30">30 days</SelectItem>{" "}
              <SelectItem value="90">90 days</SelectItem>{" "}
            </SelectContent>{" "}
          </Select>{" "}
        </div>{" "}
        <div className="space-y-2">
          {" "}
          <label className="text-sm font-medium">Sales Growth %</label>{" "}
          <Input
            type="number"
            value={growth}
            onChange={(e) => setGrowth(parseFloat(e.target.value) || 0)}
            placeholder="0"
            className="text-right"
          />{" "}
        </div>{" "}
        <div className="space-y-2">
          {" "}
          <label className="text-sm font-medium">Wage Increase %</label>{" "}
          <Input
            type="number"
            value={wage}
            onChange={(e) => setWage(parseFloat(e.target.value) || 0)}
            placeholder="0"
            className="text-right"
          />{" "}
        </div>{" "}
        <div className="space-y-2">
          {" "}
          <label className="text-sm font-medium">Staffing Δ Hours</label>{" "}
          <Input
            type="number"
            value={staffing}
            onChange={(e) => setStaffing(parseFloat(e.target.value) || 0)}
            placeholder="0"
            className="text-right"
          />{" "}
        </div>{" "}
      </div>{" "}
      {/* Action Buttons */}{" "}
      <div className="flex gap-2">
        {" "}
        <Button onClick={handleRun} disabled={loading} className="gap-2">
          {" "}
          {loading ? (
            <>
              {" "}
              <Loader className="animate-spin" size={16} /> Calculating...{" "}
            </>
          ) : (
            "Run Forecast"
          )}{" "}
        </Button>{" "}
        <Button variant="outline" onClick={handleReset}>
          {" "}
          Reset{" "}
        </Button>{" "}
      </div>{" "}
      {/* Error State */}{" "}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-sm text-red-700">
          {" "}
          Error: {error}{" "}
        </div>
      )}{" "}
      {/* Results */}{" "}
      {result && (
        <div className="space-y-4 border-t pt-4">
          {" "}
          {/* Summary Cards */}{" "}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {" "}
            <Card className="p-4 space-y-2">
              {" "}
              <div className="text-sm text-muted-foreground">
                Total Revenue
              </div>{" "}
              <div className="text-2xl font-bold">
                {" "}
                $
                {result.totals.revenue.toLocaleString(undefined, {
                  maximumFractionDigits: 0,
                })}{" "}
              </div>{" "}
              <div className="text-xs text-muted-foreground">
                {" "}
                {result.series.length} days{" "}
              </div>{" "}
            </Card>{" "}
            <Card className="p-4 space-y-2">
              {" "}
              <div className="text-sm text-muted-foreground">
                Total Labor Hours
              </div>{" "}
              <div className="text-2xl font-bold">
                {" "}
                {result.totals.labor_hours.toFixed(1)}h{" "}
              </div>{" "}
              <div className="text-xs text-muted-foreground">
                {" "}
                Avg{" "}
                {(result.totals.labor_hours / result.series.length).toFixed(1)}
                h/day{" "}
              </div>{" "}
            </Card>{" "}
            <Card className="p-4 space-y-2">
              {" "}
              <div className="text-sm text-muted-foreground">Avg SPLH</div>{" "}
              <div className="text-2xl font-bold">
                {" "}
                ${result.totals.avg_splh.toFixed(2)}{" "}
              </div>{" "}
              <div className="text-xs text-muted-foreground">
                {" "}
                Per labor hour{" "}
              </div>{" "}
            </Card>{" "}
          </div>{" "}
          {/* Series Table */}{" "}
          <div className="space-y-2">
            {" "}
            <h3 className="font-semibold">Daily Breakdown</h3>{" "}
            <div className="overflow-x-auto">
              {" "}
              <table className="w-full text-sm">
                {" "}
                <thead className="bg-muted">
                  {" "}
                  <tr>
                    {" "}
                    <th className="text-left px-3 py-2">Date</th>{" "}
                    <th className="text-right px-3 py-2">Revenue</th>{" "}
                    <th className="text-right px-3 py-2">Hours</th>{" "}
                    <th className="text-right px-3 py-2">SPLH</th>{" "}
                  </tr>{" "}
                </thead>{" "}
                <tbody className="divide-y max-h-96 overflow-y-auto">
                  {" "}
                  {result.series.slice(0, 14).map((point) => (
                    <tr key={point.date} className="hover:bg-muted/50">
                      {" "}
                      <td className="px-3 py-2">{point.date}</td>{" "}
                      <td className="text-right px-3 py-2">
                        {" "}
                        ${point.revenue.toFixed(0)}{" "}
                      </td>{" "}
                      <td className="text-right px-3 py-2">
                        {" "}
                        {point.labor_hours.toFixed(1)}{" "}
                      </td>{" "}
                      <td className="text-right px-3 py-2 font-medium">
                        {" "}
                        ${point.splh.toFixed(2)}{" "}
                      </td>{" "}
                    </tr>
                  ))}{" "}
                </tbody>{" "}
              </table>{" "}
              {result.series.length > 14 && (
                <div className="text-xs text-muted-foreground p-3 bg-muted">
                  {" "}
                  Showing first 14 days (total {result.series.length} days){" "}
                </div>
              )}{" "}
            </div>{" "}
          </div>{" "}
          {/* What-If Applied Info */}{" "}
          {(growth !== 0 || wage !== 0 || staffing !== 0) && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-700">
              {" "}
              <div className="font-semibold mb-2">What-If Applied:</div>{" "}
              <ul className="space-y-1 list-disc list-inside">
                {" "}
                {growth !== 0 && (
                  <li>
                    Sales growth: {growth > 0 ? "+" : ""}
                    {growth}%
                  </li>
                )}{" "}
                {wage !== 0 && (
                  <li>
                    Wage increase: {wage > 0 ? "+" : ""}
                    {wage}%
                  </li>
                )}{" "}
                {staffing !== 0 && (
                  <li>
                    {" "}
                    Staffing adjustment: {staffing > 0 ? "+" : ""}
                    {staffing}h total{" "}
                  </li>
                )}{" "}
              </ul>{" "}
            </div>
          )}{" "}
        </div>
      )}{" "}
      {/* Empty State */}{" "}
      {!result && !loading && (
        <div className="text-center py-8 text-muted-foreground">
          {" "}
          <p>
            Set your what-if parameters and click"Run Forecast" to see
            projections
          </p>{" "}
        </div>
      )}{" "}
    </Card>
  );
};
