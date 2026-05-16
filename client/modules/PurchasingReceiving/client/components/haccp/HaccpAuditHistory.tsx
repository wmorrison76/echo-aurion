import React, { useEffect, useMemo, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Store, HACCP_LOG_EVENT_NAME } from "@/lib/store";
import type { HACCPLog } from "@shared/purchasing";
interface ComplianceSummary {
  totalChecks: number;
  ccpChecks: number;
  outOfSpecCount: number;
  complianceRate: number;
  lastCheckTime: string | null;
  averageTemp: number;
}
export function HaccpAuditHistory() {
  const [logs, setLogs] = useState<HACCPLog[]>(Store.listHaccp());
  const [filterOutlet, setFilterOutlet] = useState<string>("all");
  const [filterType, setFilterType] = useState<string>("all");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [refreshToken, setRefreshToken] = useState(0);
  useEffect(() => {
    const handler = () => {
      setLogs(Store.listHaccp());
      setRefreshToken((v) => v + 1);
    };
    window.addEventListener(HACCP_LOG_EVENT_NAME, handler);
    return () => window.removeEventListener(HACCP_LOG_EVENT_NAME, handler);
  }, []);
  const outlets = useMemo(() => {
    const unique = new Set(logs.map((l) => l.outletId));
    return Array.from(unique).sort();
  }, [logs]);
  const outletNames = useMemo(() => {
    const map = new Map<string, string>();
    outlets.forEach((id) => {
      const outlet = Store.listOutlets().find((o) => o.id === id);
      map.set(id, outlet?.name || id);
    });
    return map;
  }, [outlets]);
  const filteredLogs = useMemo(() => {
    return logs.filter((log) => {
      if (filterOutlet !== "all" && log.outletId !== filterOutlet) return false;
      if (filterType !== "all" && log.type !== filterType) return false;
      if (startDate && new Date(log.timestamp) < new Date(startDate))
        return false;
      if (endDate && new Date(log.timestamp) > new Date(endDate + "T23:59:59"))
        return false;
      return true;
    });
  }, [logs, filterOutlet, filterType, startDate, endDate]);
  const compliance = useMemo(() => {
    if (!filteredLogs.length) {
      return {
        totalChecks: 0,
        ccpChecks: 0,
        outOfSpecCount: 0,
        complianceRate: 100,
        lastCheckTime: null,
        averageTemp: 0,
      } as ComplianceSummary;
    }
    const outOfSpec = filteredLogs.filter((l) => l.tempF > 41);
    const temps = filteredLogs.map((l) => l.tempF);
    const avgTemp = temps.reduce((a, b) => a + b, 0) / temps.length;
    return {
      totalChecks: filteredLogs.length,
      ccpChecks: filteredLogs.filter((l) =>
        ["Receiving", "Storage"].includes(l.type),
      ).length,
      outOfSpecCount: outOfSpec.length,
      complianceRate: filteredLogs.length
        ? ((filteredLogs.length - outOfSpec.length) / filteredLogs.length) * 100
        : 100,
      lastCheckTime: filteredLogs.length ? filteredLogs[0].timestamp : null,
      averageTemp: Number(avgTemp.toFixed(1)),
    };
  }, [filteredLogs]);
  const downloadReport = () => {
    const headers = [
      "Date",
      "Type",
      "Outlet",
      "Item",
      "Temp (°F)",
      "Status",
      "Action",
      "User",
    ];
    const rows = filteredLogs.map((log) => [
      new Date(log.timestamp).toLocaleString(),
      log.type,
      outletNames.get(log.outletId) || "Unknown",
      log.item,
      log.tempF.toFixed(1),
      log.tempF > 41 ? "Out of Spec" : "Compliant",
      log.action || "—",
      log.user || "—",
    ]);
    const csv = [headers, ...rows]
      .map((row) => row.map((cell) => `"${cell}"`).join(","))
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `haccp-audit-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };
  return (
    <div className="space-y-6">
      {" "}
      <Tabs defaultValue="summary" className="w-full">
        {" "}
        <TabsList className="grid w-full grid-cols-3">
          {" "}
          <TabsTrigger value="summary">Compliance Summary</TabsTrigger>{" "}
          <TabsTrigger value="history">Audit Log</TabsTrigger>{" "}
          <TabsTrigger value="variance">Temperature Variance</TabsTrigger>{" "}
        </TabsList>{" "}
        <TabsContent value="summary" className="space-y-4">
          {" "}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {" "}
            <Card>
              {" "}
              <CardHeader className="pb-2">
                {" "}
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {" "}
                  Total Checks{" "}
                </CardTitle>{" "}
              </CardHeader>{" "}
              <CardContent>
                {" "}
                <div className="text-2xl font-bold">
                  {" "}
                  {compliance.totalChecks}{" "}
                </div>{" "}
                <p className="text-xs text-muted-foreground mt-1">
                  {" "}
                  {compliance.ccpChecks} are CCP checks{" "}
                </p>{" "}
              </CardContent>{" "}
            </Card>{" "}
            <Card>
              {" "}
              <CardHeader className="pb-2">
                {" "}
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {" "}
                  Compliance Rate{" "}
                </CardTitle>{" "}
              </CardHeader>{" "}
              <CardContent>
                {" "}
                <div className="text-2xl font-bold">
                  {" "}
                  {compliance.complianceRate.toFixed(1)}%{" "}
                </div>{" "}
                <p className="text-xs text-muted-foreground mt-1">
                  {" "}
                  {compliance.outOfSpecCount} out of spec{" "}
                </p>{" "}
              </CardContent>{" "}
            </Card>{" "}
            <Card>
              {" "}
              <CardHeader className="pb-2">
                {" "}
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {" "}
                  Average Temp{" "}
                </CardTitle>{" "}
              </CardHeader>{" "}
              <CardContent>
                {" "}
                <div className="text-2xl font-bold">
                  {" "}
                  {compliance.averageTemp.toFixed(1)}°F{" "}
                </div>{" "}
                <p className="text-xs text-muted-foreground mt-1">
                  {" "}
                  Target: ≤ 41°F{" "}
                </p>{" "}
              </CardContent>{" "}
            </Card>{" "}
            <Card>
              {" "}
              <CardHeader className="pb-2">
                {" "}
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {" "}
                  Last Check{" "}
                </CardTitle>{" "}
              </CardHeader>{" "}
              <CardContent>
                {" "}
                <div className="text-sm font-semibold">
                  {" "}
                  {compliance.lastCheckTime
                    ? new Date(compliance.lastCheckTime).toLocaleTimeString()
                    : "—"}{" "}
                </div>{" "}
                <p className="text-xs text-muted-foreground mt-1">
                  {" "}
                  {compliance.lastCheckTime
                    ? new Date(compliance.lastCheckTime).toLocaleDateString()
                    : "No checks"}{" "}
                </p>{" "}
              </CardContent>{" "}
            </Card>{" "}
          </div>{" "}
          {compliance.complianceRate < 95 && (
            <Card className="border-amber-200 bg-amber-50">
              {" "}
              <CardHeader>
                {" "}
                <CardTitle className="text-sm">
                  ⚠️ Compliance Alert
                </CardTitle>{" "}
              </CardHeader>{" "}
              <CardContent className="text-sm text-amber-900">
                {" "}
                {compliance.outOfSpecCount} temperature deviations detected.
                Review corrective actions and ensure proper documentation.{" "}
              </CardContent>{" "}
            </Card>
          )}{" "}
        </TabsContent>{" "}
        <TabsContent value="history" className="space-y-4">
          {" "}
          <Card>
            {" "}
            <CardHeader>
              {" "}
              <CardTitle>Audit Log Filters</CardTitle>{" "}
              <CardDescription>
                {" "}
                Filter and search the complete HACCP audit history.{" "}
              </CardDescription>{" "}
            </CardHeader>{" "}
            <CardContent className="space-y-4">
              {" "}
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
                {" "}
                <div>
                  {" "}
                  <label className="text-sm font-medium">Outlet</label>{" "}
                  <Select value={filterOutlet} onValueChange={setFilterOutlet}>
                    {" "}
                    <SelectTrigger>
                      {" "}
                      <SelectValue />{" "}
                    </SelectTrigger>{" "}
                    <SelectContent>
                      {" "}
                      <SelectItem value="all">All Outlets</SelectItem>{" "}
                      {outlets.map((outletId) => (
                        <SelectItem key={outletId} value={outletId}>
                          {" "}
                          {outletNames.get(outletId) || outletId}{" "}
                        </SelectItem>
                      ))}{" "}
                    </SelectContent>{" "}
                  </Select>{" "}
                </div>{" "}
                <div>
                  {" "}
                  <label className="text-sm font-medium">Type</label>{" "}
                  <Select value={filterType} onValueChange={setFilterType}>
                    {" "}
                    <SelectTrigger>
                      {" "}
                      <SelectValue />{" "}
                    </SelectTrigger>{" "}
                    <SelectContent>
                      {" "}
                      <SelectItem value="all">All Types</SelectItem>{" "}
                      <SelectItem value="Receiving">Receiving</SelectItem>{" "}
                      <SelectItem value="Storage">Storage</SelectItem>{" "}
                    </SelectContent>{" "}
                  </Select>{" "}
                </div>{" "}
                <div>
                  {" "}
                  <label className="text-sm font-medium">From</label>{" "}
                  <Input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                  />{" "}
                </div>{" "}
                <div>
                  {" "}
                  <label className="text-sm font-medium">To</label>{" "}
                  <Input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                  />{" "}
                </div>{" "}
                <div className="flex items-end">
                  {" "}
                  <Button onClick={downloadReport} className="w-full">
                    {" "}
                    Export CSV{" "}
                  </Button>{" "}
                </div>{" "}
              </div>{" "}
            </CardContent>{" "}
          </Card>{" "}
          <Card>
            {" "}
            <CardHeader>
              {" "}
              <CardTitle className="text-lg">
                {" "}
                Entries ({filteredLogs.length}){" "}
              </CardTitle>{" "}
            </CardHeader>{" "}
            <CardContent>
              {" "}
              <div className="overflow-auto rounded-lg border">
                {" "}
                <Table>
                  {" "}
                  <TableHeader>
                    {" "}
                    <TableRow>
                      {" "}
                      <TableHead>Date & Time</TableHead>{" "}
                      <TableHead>Type</TableHead> <TableHead>Outlet</TableHead>{" "}
                      <TableHead>Item</TableHead>{" "}
                      <TableHead>Temperature</TableHead>{" "}
                      <TableHead>Status</TableHead>{" "}
                      <TableHead>Corrective Action</TableHead>{" "}
                      <TableHead>User</TableHead>{" "}
                    </TableRow>{" "}
                  </TableHeader>{" "}
                  <TableBody>
                    {" "}
                    {filteredLogs.map((log) => (
                      <TableRow key={log.id}>
                        {" "}
                        <TableCell className="text-sm">
                          {" "}
                          {new Date(log.timestamp).toLocaleString()}{" "}
                        </TableCell>{" "}
                        <TableCell>{log.type}</TableCell>{" "}
                        <TableCell>
                          {" "}
                          {outletNames.get(log.outletId) || "Unknown"}{" "}
                        </TableCell>{" "}
                        <TableCell>{log.item}</TableCell>{" "}
                        <TableCell className="font-semibold">
                          {" "}
                          <span
                            className={
                              log.tempF > 41 ? "text-red-600" : "text-green-600"
                            }
                          >
                            {" "}
                            {log.tempF.toFixed(1)}°F{" "}
                          </span>{" "}
                        </TableCell>{" "}
                        <TableCell>
                          {" "}
                          <Badge
                            variant={
                              log.tempF > 41 ? "destructive" : "secondary"
                            }
                          >
                            {" "}
                            {log.tempF > 41 ? "Out of Spec" : "Compliant"}{" "}
                          </Badge>{" "}
                        </TableCell>{" "}
                        <TableCell className="text-sm">
                          {" "}
                          {log.action || "—"}{" "}
                        </TableCell>{" "}
                        <TableCell className="text-sm">
                          {" "}
                          {log.user || "—"}{" "}
                        </TableCell>{" "}
                      </TableRow>
                    ))}{" "}
                    {!filteredLogs.length && (
                      <TableRow>
                        {" "}
                        <TableCell
                          colSpan={8}
                          className="text-center text-sm text-muted-foreground py-8"
                        >
                          {" "}
                          No entries match the selected filters.{" "}
                        </TableCell>{" "}
                      </TableRow>
                    )}{" "}
                  </TableBody>{" "}
                </Table>{" "}
              </div>{" "}
            </CardContent>{" "}
          </Card>{" "}
        </TabsContent>{" "}
        <TabsContent value="variance" className="space-y-4">
          {" "}
          <Card>
            {" "}
            <CardHeader>
              {" "}
              <CardTitle>Temperature Variance Analysis</CardTitle>{" "}
              <CardDescription>
                {" "}
                Track temperature deviations and corrective actions{" "}
              </CardDescription>{" "}
            </CardHeader>{" "}
            <CardContent className="space-y-4">
              {" "}
              {filteredLogs.filter((log) => log.tempF > 41).length === 0 ? (
                <div className="rounded-lg border border-green-200 bg-green-50 p-4 text-sm text-green-900">
                  {" "}
                  ✓ All temperature readings are within specification (≤
                  41°F).{" "}
                </div>
              ) : (
                <div className="space-y-3">
                  {" "}
                  {filteredLogs
                    .filter((log) => log.tempF > 41)
                    .map((log) => (
                      <div
                        key={log.id}
                        className="rounded-lg border border-red-200 bg-red-50 p-3"
                      >
                        {" "}
                        <div className="flex items-start justify-between gap-3">
                          {" "}
                          <div>
                            {" "}
                            <p className="font-semibold text-red-900">
                              {" "}
                              {log.item} · {log.tempF.toFixed(1)}°F{" "}
                            </p>{" "}
                            <p className="text-xs text-red-800">
                              {" "}
                              {new Date(log.timestamp).toLocaleString()} at{""}{" "}
                              {outletNames.get(log.outletId) || "Unknown"}{" "}
                            </p>{" "}
                            {log.action && (
                              <p className="mt-1 text-sm font-medium text-red-900">
                                {" "}
                                Action: {log.action}{" "}
                              </p>
                            )}{" "}
                          </div>{" "}
                          <Badge variant="destructive">
                            {" "}
                            +{(log.tempF - 41).toFixed(1)}°F over limit{" "}
                          </Badge>{" "}
                        </div>{" "}
                      </div>
                    ))}{" "}
                </div>
              )}{" "}
            </CardContent>{" "}
          </Card>{" "}
        </TabsContent>{" "}
      </Tabs>{" "}
    </div>
  );
}
