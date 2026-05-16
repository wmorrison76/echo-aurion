import React, { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { AppLayout } from "@/components/AppLayout";
import { HudTrendCard } from "@/components/analytics/HudTrendCard";
import { HudCard } from "@/components/analytics/HudCard";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
} from "recharts";
interface WarehouseResponse {
  summary: {
    avgConfidence: number;
    avgLowRate: number;
    avgGlCoverage: number;
    approvals: number;
    voiceLogs: number;
    corrections: number;
  };
  apPerformance: {
    averageHours: number | null;
    medianHours: number | null;
    approvalsPerDay: Record<string, number>;
  };
  vendorRollup: Array<{
    vendor?: string;
    avgConfidence: number;
    lowRate: number;
    glCoverage: number;
  }>;
  highVarianceVendors: Array<{
    vendor?: string;
    avgConfidence: number;
    lowRate: number;
    glCoverage: number;
  }>;
  slaAlerts: Array<{ vendor?: string; message: string }>;
  productivity: {
    voicePerUser: Record<string, number>;
    voicePerOutlet: Record<string, number>;
    correctionsByField: Record<string, number>;
  };
}
interface TimeseriesResponse {
  series: Array<{
    day: string;
    avgConfidence: number;
    lowRate: number;
    glCoverage: number;
    approvals: number;
  }>;
}
async function fetchJson<T>(url: string): Promise<T> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(await response.text());
  }
  return (await response.json()) as T;
}
export default function Analytics() {
  const { data: warehouse } = useQuery<WarehouseResponse>({
    queryKey: ["analytics", "warehouse"],
    queryFn: () => fetchJson<WarehouseResponse>("/api/analytics/warehouse"),
    refetchInterval: 60000,
  });
  const { data: timeseries } = useQuery<TimeseriesResponse>({
    queryKey: ["analytics", "timeseries"],
    queryFn: () =>
      fetchJson<TimeseriesResponse>("/api/analytics/warehouse/timeseries"),
    refetchInterval: 60000,
  });
  const summaryCards = useMemo(() => {
    if (!warehouse) return [];
    return [
      {
        label: "Avg OCR Confidence",
        value: `${(warehouse.summary.avgConfidence * 100).toFixed(1)}%`,
        sub: "Across latest invoices",
      },
      {
        label: "Low Confidence Rate",
        value: `${(warehouse.summary.avgLowRate * 100).toFixed(1)}%`,
        sub: "Lines needing review",
      },
      {
        label: "GL Coverage",
        value: `${(warehouse.summary.avgGlCoverage * 100).toFixed(1)}%`,
        sub: "Auto-mapped lines",
      },
      {
        label: "Approvals This Period",
        value: warehouse.summary.approvals.toString(),
        sub: "24h rolling window",
      },
    ];
  }, [warehouse]);
  const approvalsPerDay = useMemo(() => {
    if (!warehouse) return [];
    return Object.entries(warehouse.apPerformance.approvalsPerDay)
      .map(([day, count]) => ({ day, count }))
      .sort((a, b) => a.day.localeCompare(b.day));
  }, [warehouse]);
  const voicePerUser = useMemo(() => {
    if (!warehouse) return [];
    return Object.entries(warehouse.productivity.voicePerUser).sort(
      (a, b) => b[1] - a[1],
    );
  }, [warehouse]);
  const voicePerOutlet = useMemo(() => {
    if (!warehouse) return [];
    return Object.entries(warehouse.productivity.voicePerOutlet).sort(
      (a, b) => b[1] - a[1],
    );
  }, [warehouse]);
  const correctionsByField = useMemo(() => {
    if (!warehouse) return [];
    return Object.entries(warehouse.productivity.correctionsByField).sort(
      (a, b) => b[1] - a[1],
    );
  }, [warehouse]);
  const timeseriesData = timeseries?.series ?? [];
  return (
    <AppLayout>
      {" "}
      <div className="flex flex-col gap-6">
        {" "}
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {" "}
          {summaryCards.map((card) => (
            <Card key={card.label} className="border-2">
              {" "}
              <CardHeader>
                {" "}
                <CardDescription>{card.sub}</CardDescription>{" "}
                <CardTitle className="text-xl">{card.value}</CardTitle>{" "}
              </CardHeader>{" "}
              <CardContent>
                {" "}
                <span className="text-sm font-medium text-muted-foreground">
                  {" "}
                  {card.label}{" "}
                </span>{" "}
              </CardContent>{" "}
            </Card>
          ))}{" "}
        </div>{" "}
        <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
          {" "}
          <HudTrendCard
            className="border-0"
            data={timeseriesData}
            title="Confidence & Approvals Trend"
            description="Rolling daily aggregates from the analytics warehouse."
          />{" "}
          <HudCard
            title="AP Cycle Time"
            description="Time from capture to approval when timestamps are available."
            bodyClassName="space-y-4"
          >
            {" "}
            <div className="grid gap-3 text-sm sm:grid-cols-2">
              {" "}
              <div className="rounded-lg border border-cyan-400/20 bg-card p-3">
                {" "}
                <div className="text-xs uppercase tracking-[0.3em] text-cyan-200/70">
                  {" "}
                  Average{" "}
                </div>{" "}
                <div className="text-2xl font-semibold text-cyan-100">
                  {" "}
                  {warehouse?.apPerformance.averageHours != null
                    ? `${warehouse.apPerformance.averageHours.toFixed(1)} h`
                    : "—"}{" "}
                </div>{" "}
              </div>{" "}
              <div className="rounded-lg border border-cyan-400/20 bg-card p-3">
                {" "}
                <div className="text-xs uppercase tracking-[0.3em] text-cyan-200/70">
                  {" "}
                  Median{" "}
                </div>{" "}
                <div className="text-xl font-semibold text-cyan-100">
                  {" "}
                  {warehouse?.apPerformance.medianHours != null
                    ? `${warehouse.apPerformance.medianHours.toFixed(1)} h`
                    : "—"}{" "}
                </div>{" "}
              </div>{" "}
            </div>{" "}
            <div>
              {" "}
              <div className="mb-2 text-xs uppercase tracking-[0.3em] text-cyan-200/70">
                {" "}
                Approvals per Day{" "}
              </div>{" "}
              <div className="h-36 overflow-hidden rounded-xl border border-cyan-400/10 bg-card p-3">
                {" "}
                <ResponsiveContainer width="100%" height="100%">
                  {" "}
                  <BarChart data={approvalsPerDay}>
                    {" "}
                    <defs>
                      {" "}
                      <linearGradient
                        id="approvalsMiniGradient"
                        x1="0"
                        x2="1"
                        y1="0"
                        y2="0"
                      >
                        {" "}
                        <stop
                          offset="0%"
                          stopColor="rgba(203,213,225,0.65)"
                        />{" "}
                        <stop
                          offset="100%"
                          stopColor="rgba(34,211,238,0.8)"
                        />{" "}
                      </linearGradient>{" "}
                    </defs>{" "}
                    <CartesianGrid
                      stroke="rgba(56,189,248,0.18)"
                      strokeDasharray="2 6"
                    />{" "}
                    <XAxis
                      dataKey="day"
                      tick={{ fill: "rgba(148, 163, 184, 0.9)", fontSize: 10 }}
                      axisLine={{ stroke: "rgba(56,189,248,0.25)" }}
                      tickLine={false}
                    />{" "}
                    <YAxis
                      allowDecimals={false}
                      tick={{ fill: "rgba(148, 163, 184, 0.9)", fontSize: 11 }}
                      axisLine={{ stroke: "rgba(56,189,248,0.25)" }}
                      tickLine={false}
                    />{" "}
                    <Tooltip
                      cursor={{ fill: "rgba(8,145,178,0.15)" }}
                      contentStyle={{
                        background: "rgba(2, 6, 23, 0.95)",
                        border: "1px solid rgba(34,211,238,0.4)",
                        borderRadius: "0.75rem",
                        boxShadow: "0 0 20px rgba(8,145,178,0.15)",
                      }}
                      labelStyle={{
                        color: "rgba(94, 234, 212, 0.9)",
                        fontSize: "0.7rem",
                      }}
                      itemStyle={{
                        color: "rgb(226, 232, 240)",
                        fontSize: "0.75rem",
                      }}
                    />{" "}
                    <Bar
                      dataKey="count"
                      fill="url(#approvalsMiniGradient)"
                      radius={[6, 6, 0, 0]}
                      maxBarSize={28}
                    />{" "}
                  </BarChart>{" "}
                </ResponsiveContainer>{" "}
              </div>{" "}
            </div>{" "}
          </HudCard>{" "}
        </div>{" "}
        <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
          {" "}
          <Card className="border-2">
            {" "}
            <CardHeader>
              {" "}
              <CardTitle>Vendor Quality Rollup</CardTitle>{" "}
              <CardDescription>
                {" "}
                Confidence + GL coverage by vendor across processed
                invoices.{" "}
              </CardDescription>{" "}
            </CardHeader>{" "}
            <CardContent className="max-h-[320px] overflow-auto">
              {" "}
              <Table>
                {" "}
                <TableHeader>
                  {" "}
                  <TableRow>
                    {" "}
                    <TableHead>Vendor</TableHead>{" "}
                    <TableHead className="text-right">Confidence</TableHead>{" "}
                    <TableHead className="text-right">Low Rate</TableHead>{" "}
                    <TableHead className="text-right">
                      GL Coverage
                    </TableHead>{" "}
                  </TableRow>{" "}
                </TableHeader>{" "}
                <TableBody>
                  {" "}
                  {(warehouse?.vendorRollup ?? []).map((entry) => (
                    <TableRow key={entry.vendor || "unknown"}>
                      {" "}
                      <TableCell>{entry.vendor || "Unknown"}</TableCell>{" "}
                      <TableCell className="text-right">
                        {" "}
                        {(entry.avgConfidence * 100).toFixed(1)}%{" "}
                      </TableCell>{" "}
                      <TableCell className="text-right">
                        {" "}
                        {(entry.lowRate * 100).toFixed(1)}%{" "}
                      </TableCell>{" "}
                      <TableCell className="text-right">
                        {" "}
                        {(entry.glCoverage * 100).toFixed(1)}%{" "}
                      </TableCell>{" "}
                    </TableRow>
                  ))}{" "}
                  {!warehouse?.vendorRollup?.length && (
                    <TableRow>
                      {" "}
                      <TableCell
                        colSpan={4}
                        className="text-center text-sm text-muted-foreground"
                      >
                        {" "}
                        No telemetry captured yet.{" "}
                      </TableCell>{" "}
                    </TableRow>
                  )}{" "}
                </TableBody>{" "}
              </Table>{" "}
            </CardContent>{" "}
          </Card>{" "}
          <Card className="border-2">
            {" "}
            <CardHeader>
              {" "}
              <CardTitle>Active SLA Alerts</CardTitle>{" "}
              <CardDescription>
                {" "}
                Vendors below the GL coverage or confidence guardrails.{" "}
              </CardDescription>{" "}
            </CardHeader>{" "}
            <CardContent>
              {" "}
              <ul className="space-y-2 text-sm">
                {" "}
                {(warehouse?.slaAlerts ?? []).map((alert) => (
                  <li
                    key={alert.vendor}
                    className="rounded-lg border bg-muted/30 p-3"
                  >
                    {" "}
                    <div className="font-medium">{alert.vendor}</div>{" "}
                    <div className="text-muted-foreground">
                      {alert.message}
                    </div>{" "}
                  </li>
                ))}{" "}
                {!warehouse?.slaAlerts?.length && (
                  <li className="text-muted-foreground">
                    {" "}
                    All vendors within SLA thresholds.{" "}
                  </li>
                )}{" "}
              </ul>{" "}
            </CardContent>{" "}
          </Card>{" "}
        </div>{" "}
        <div className="grid gap-6 lg:grid-cols-3">
          {" "}
          <Card className="border-2">
            {" "}
            <CardHeader>
              {" "}
              <CardTitle>Voice Capture Productivity</CardTitle>{" "}
              <CardDescription>
                {" "}
                Offline-first queue contributions by user.{" "}
              </CardDescription>{" "}
            </CardHeader>{" "}
            <CardContent>
              {" "}
              <ul className="space-y-2 text-sm">
                {" "}
                {voicePerUser.map(([user, count]) => (
                  <li
                    key={user}
                    className="flex items-center justify-between rounded-md border px-3 py-2"
                  >
                    {" "}
                    <span>{user}</span>{" "}
                    <span className="font-medium">{count}</span>{" "}
                  </li>
                ))}{" "}
                {!voicePerUser.length && (
                  <li className="text-muted-foreground">
                    {" "}
                    No voice logs recorded yet.{" "}
                  </li>
                )}{" "}
              </ul>{" "}
            </CardContent>{" "}
          </Card>{" "}
          <Card className="border-2">
            {" "}
            <CardHeader>
              {" "}
              <CardTitle>Voice Captures by Outlet</CardTitle>{" "}
              <CardDescription>
                {" "}
                Helps prioritize bin labeling and hardware deployment.{" "}
              </CardDescription>{" "}
            </CardHeader>{" "}
            <CardContent>
              {" "}
              <ul className="space-y-2 text-sm">
                {" "}
                {voicePerOutlet.map(([outlet, count]) => (
                  <li
                    key={outlet}
                    className="flex items-center justify-between rounded-md border px-3 py-2"
                  >
                    {" "}
                    <span>{outlet}</span>{" "}
                    <span className="font-medium">{count}</span>{" "}
                  </li>
                ))}{" "}
                {!voicePerOutlet.length && (
                  <li className="text-muted-foreground">
                    {" "}
                    No outlet activity yet.{" "}
                  </li>
                )}{" "}
              </ul>{" "}
            </CardContent>{" "}
          </Card>{" "}
          <Card className="border-2">
            {" "}
            <CardHeader>
              {" "}
              <CardTitle>Correction Hotspots</CardTitle>{" "}
              <CardDescription>
                {" "}
                Fields reviewers tweak most often.{" "}
              </CardDescription>{" "}
            </CardHeader>{" "}
            <CardContent>
              {" "}
              <ul className="space-y-2 text-sm">
                {" "}
                {correctionsByField.map(([field, count]) => (
                  <li
                    key={field}
                    className="flex items-center justify-between rounded-md border px-3 py-2"
                  >
                    {" "}
                    <span>{field}</span>{" "}
                    <span className="font-medium">{count}</span>{" "}
                  </li>
                ))}{" "}
                {!correctionsByField.length && (
                  <li className="text-muted-foreground">
                    {" "}
                    No corrections logged yet.{" "}
                  </li>
                )}{" "}
              </ul>{" "}
            </CardContent>{" "}
          </Card>{" "}
        </div>{" "}
        <HudCard
          title="High Variance Vendors"
          description="Sorted by low-confidence rate; use to target re-training."
          bodyClassName="h-full"
        >
          {" "}
          <div className="h-80 overflow-hidden rounded-xl border border-cyan-400/10 bg-card p-4">
            {" "}
            <ResponsiveContainer width="100%" height="100%">
              {" "}
              <BarChart data={warehouse?.highVarianceVendors ?? []}>
                {" "}
                <CartesianGrid
                  stroke="rgba(56,189,248,0.18)"
                  strokeDasharray="2 6"
                />{" "}
                <XAxis
                  dataKey="vendor"
                  interval={0}
                  angle={-25}
                  height={80}
                  textAnchor="end"
                  tick={{ fill: "rgba(148, 163, 184, 0.9)", fontSize: 11 }}
                  axisLine={{ stroke: "rgba(56,189,248,0.25)" }}
                  tickLine={false}
                />{" "}
                <YAxis
                  domain={[0, 1]}
                  tickFormatter={(value) => `${(value * 100).toFixed(0)}%`}
                  tick={{ fill: "rgba(148, 163, 184, 0.9)", fontSize: 11 }}
                  axisLine={{ stroke: "rgba(56,189,248,0.25)" }}
                  tickLine={false}
                />{" "}
                <Tooltip
                  formatter={(value: any, _name, entry) => [
                    `${(Number(value) * 100).toFixed(1)}%`,
                    entry?.name ?? "Value",
                  ]}
                  cursor={{ fill: "rgba(8,145,178,0.12)" }}
                  contentStyle={{
                    background: "rgba(2, 6, 23, 0.95)",
                    border: "1px solid rgba(34,211,238,0.4)",
                    borderRadius: "0.75rem",
                    boxShadow: "0 0 20px rgba(8,145,178,0.15)",
                  }}
                  labelStyle={{
                    color: "rgba(94, 234, 212, 0.9)",
                    fontSize: "0.7rem",
                  }}
                  itemStyle={{
                    color: "rgb(226, 232, 240)",
                    fontSize: "0.75rem",
                  }}
                />{" "}
                <Legend wrapperStyle={{ paddingTop: 12 }} iconType="circle" />{" "}
                <Bar
                  dataKey="lowRate"
                  name="Low Rate"
                  fill="rgba(248,113,113,0.8)"
                  radius={[6, 6, 0, 0]}
                  maxBarSize={28}
                />{" "}
                <Bar
                  dataKey="glCoverage"
                  name="GL Coverage"
                  fill="rgba(34,211,238,0.85)"
                  radius={[6, 6, 0, 0]}
                  maxBarSize={28}
                />{" "}
              </BarChart>{" "}
            </ResponsiveContainer>{" "}
          </div>{" "}
        </HudCard>{" "}
      </div>{" "}
    </AppLayout>
  );
}
