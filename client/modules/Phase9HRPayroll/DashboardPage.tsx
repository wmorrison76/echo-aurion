import React, { useCallback, useEffect, useMemo, useState } from "react";
import { AlertCircle, Users } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { fetchHRMetrics, fetchPayrollCycles } from "./api";
import type { HRMetrics, PayrollCycle } from "./types";
import { formatDate, formatMoney, formatPercent, safeNumber } from "./utils";
export default function DashboardPage(props: { outletId?: string }) {
  const { outletId } = props;
  const [loading, setLoading] = useState(false);
  const [metrics, setMetrics] = useState<HRMetrics | null>(null);
  const [cycles, setCycles] = useState<PayrollCycle[]>([]);
  const latestCycle = useMemo(() => {
    const sorted = [...cycles].sort((a, b) => {
      const ad = new Date(a.periodEnd).getTime();
      const bd = new Date(b.periodEnd).getTime();
      return bd - ad;
    });
    return sorted[0] || null;
  }, [cycles]);
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [m, c] = await Promise.all([
        fetchHRMetrics(outletId),
        fetchPayrollCycles(),
      ]);
      setMetrics(m);
      setCycles(Array.isArray(c) ? c : []);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }, [outletId]);
  useEffect(() => {
    load();
  }, [load]);
  const actionItems = useMemo(() => {
    if (!metrics) return [] as { title: string; description: string }[];
    const items: { title: string; description: string }[] = [];
    if (metrics.turnoverRate >= 10) {
      items.push({
        title: "Turnover risk",
        description: `Turnover is ${formatPercent(metrics.turnoverRate)}.`,
      });
    }
    if (metrics.certificationRate < 85) {
      items.push({
        title: "Training needed",
        description: `Certification rate is ${formatPercent(metrics.certificationRate)}.`,
      });
    }
    if (latestCycle && latestCycle.status === "draft") {
      items.push({
        title: "Payroll cycle draft",
        description: `Cycle ${latestCycle.id} is in draft status (period ends ${formatDate(latestCycle.periodEnd)}).`,
      });
    }
    return items;
  }, [latestCycle, metrics]);
  return (
    <div className="p-6 space-y-6">
      {" "}
      <div className="flex items-center justify-between gap-3">
        {" "}
        <div className="flex items-center gap-2">
          {" "}
          <Users className="h-5 w-5 text-green-500" />{" "}
          <div className="text-sm font-semibold">Workforce overview</div>{" "}
          {outletId ? (
            <Badge variant="outline" className="ml-2">
              {" "}
              Outlet: {outletId}{" "}
            </Badge>
          ) : null}{" "}
        </div>{" "}
        <Button size="sm" variant="outline" onClick={load} disabled={loading}>
          {" "}
          Refresh{" "}
        </Button>{" "}
      </div>{" "}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
        {" "}
        <Card>
          {" "}
          <CardHeader className="pb-2">
            {" "}
            <CardTitle className="text-base">Total employees</CardTitle>{" "}
          </CardHeader>{" "}
          <CardContent className="px-6 pb-6">
            {" "}
            <div className="text-2xl font-semibold">
              {" "}
              {metrics ? metrics.totalEmployees : "–"}{" "}
            </div>{" "}
            <div className="text-xs text-muted-foreground mt-1">
              {" "}
              Active: {metrics ? metrics.activeEmployees : "–"}{" "}
            </div>{" "}
          </CardContent>{" "}
        </Card>{" "}
        <Card>
          {" "}
          <CardHeader className="pb-2">
            {" "}
            <CardTitle className="text-base">Employment mix</CardTitle>{" "}
          </CardHeader>{" "}
          <CardContent className="px-6 pb-6">
            {" "}
            <div className="text-2xl font-semibold">
              {" "}
              {metrics ? metrics.fullTime : "–"}{" "}
              <span className="text-xs text-muted-foreground ml-2">
                {" "}
                full-time{" "}
              </span>{" "}
            </div>{" "}
            <div className="text-xs text-muted-foreground mt-1">
              {" "}
              Part-time: {metrics ? metrics.partTime : "–"}{" "}
            </div>{" "}
          </CardContent>{" "}
        </Card>{" "}
        <Card>
          {" "}
          <CardHeader className="pb-2">
            {" "}
            <CardTitle className="text-base">Turnover</CardTitle>{" "}
          </CardHeader>{" "}
          <CardContent className="px-6 pb-6">
            {" "}
            <div className="text-2xl font-semibold">
              {" "}
              {metrics ? formatPercent(metrics.turnoverRate) : "–"}{" "}
            </div>{" "}
            <div className="text-xs text-muted-foreground mt-1">
              {" "}
              Avg tenure: {metrics ? safeNumber(metrics.averageTenure) : "–"}
              {""} yrs{" "}
            </div>{" "}
          </CardContent>{" "}
        </Card>{" "}
        <Card>
          {" "}
          <CardHeader className="pb-2">
            {" "}
            <CardTitle className="text-base">Average salary</CardTitle>{" "}
          </CardHeader>{" "}
          <CardContent className="px-6 pb-6">
            {" "}
            <div className="text-2xl font-semibold">
              {" "}
              {metrics ? formatMoney(metrics.averageSalary) : "–"}{" "}
            </div>{" "}
            <div className="text-xs text-muted-foreground mt-1">
              {" "}
              Training hrs/employee:{""}{" "}
              {metrics ? metrics.trainingHoursPerEmployee : "–"}{" "}
            </div>{" "}
          </CardContent>{" "}
        </Card>{" "}
      </div>{" "}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
        {" "}
        <Card>
          {" "}
          <CardHeader>
            {" "}
            <CardTitle className="text-base">
              Latest payroll cycle
            </CardTitle>{" "}
          </CardHeader>{" "}
          <CardContent className="px-6 pb-6">
            {" "}
            {!latestCycle ? (
              <div className="text-sm text-muted-foreground">
                {" "}
                No payroll cycles yet. Create one in the Payroll tab.{" "}
              </div>
            ) : (
              <div className="space-y-2">
                {" "}
                <div className="flex items-center justify-between gap-3">
                  {" "}
                  <div className="text-sm font-medium">
                    {latestCycle.id}
                  </div>{" "}
                  <Badge variant="outline">{latestCycle.status}</Badge>{" "}
                </div>{" "}
                <div className="text-xs text-muted-foreground">
                  {" "}
                  Period: {formatDate(latestCycle.periodStart)} –{""}{" "}
                  {formatDate(latestCycle.periodEnd)}{" "}
                </div>{" "}
                <div className="text-xs text-muted-foreground">
                  {" "}
                  Pay date: {formatDate(latestCycle.payDate)}{" "}
                </div>{" "}
              </div>
            )}{" "}
          </CardContent>{" "}
        </Card>{" "}
        <Card>
          {" "}
          <CardHeader>
            {" "}
            <CardTitle className="text-base flex items-center gap-2">
              {" "}
              <AlertCircle className="h-4 w-4" /> Action items{" "}
            </CardTitle>{" "}
          </CardHeader>{" "}
          <CardContent className="px-6 pb-6">
            {" "}
            {actionItems.length === 0 ? (
              <div className="text-sm text-muted-foreground">
                {" "}
                No urgent items.{" "}
              </div>
            ) : (
              <ul className="space-y-2">
                {" "}
                {actionItems.map((item) => (
                  <li key={item.title} className="text-sm">
                    {" "}
                    <div className="font-medium">{item.title}</div>{" "}
                    <div className="text-xs text-muted-foreground">
                      {" "}
                      {item.description}{" "}
                    </div>{" "}
                  </li>
                ))}{" "}
              </ul>
            )}{" "}
          </CardContent>{" "}
        </Card>{" "}
      </div>{" "}
    </div>
  );
}
