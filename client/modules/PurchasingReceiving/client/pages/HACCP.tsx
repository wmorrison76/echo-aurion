import React, { useEffect, useMemo, useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { HaccpProgramSummary } from "@/components/haccp/HaccpProgramSummary";
import { HaccpChecklistPanel } from "@/components/haccp/HaccpChecklistPanel";
import { HaccpRemindersPanel } from "@/components/haccp/HaccpRemindersPanel";
import { HaccpTrainingPanel } from "@/components/haccp/HaccpTrainingPanel";
import { HaccpAuditHistory } from "@/components/haccp/HaccpAuditHistory";
import { Store, id, HACCP_LOG_EVENT_NAME } from "@/lib/store";
import { useAuth } from "@/context/AuthContext";
import {
  HACCP_CHECKLISTS,
  HACCP_REMINDERS,
  HACCP_TRAINING_MODULES,
} from "@/data/haccp-program";
import type { HACCPLog } from "@shared/purchasing";
import type { Outlet } from "@shared/purchasing";
const MAX_LEDGER_ROWS = 25;
const HACCP_TYPES: HACCPLog["type"][] = ["Receiving", "Storage"];
const getInitialOutlets = (): Outlet[] => {
  const existing = Store.listOutlets();
  if (existing.length) return existing;
  const fallback = Store.ensureOutletByName("Main Kitchen");
  return [fallback];
};
export default function HACCP() {
  const { user } = useAuth();
  const [outlets] = useState<Outlet[]>(getInitialOutlets);
  const [outletId, setOutletId] = useState<string>(() => outlets[0]?.id ?? "");
  const [type, setType] = useState<HACCPLog["type"]>("Receiving");
  const [item, setItem] = useState("");
  const [temp, setTemp] = useState<string>("38");
  const [action, setAction] = useState("");
  const [refreshToken, setRefreshToken] = useState(0);
  useEffect(() => {
    const handler = () => setRefreshToken((value) => value + 1);
    window.addEventListener(HACCP_LOG_EVENT_NAME, handler);
    return () => window.removeEventListener(HACCP_LOG_EVENT_NAME, handler);
  }, []);
  const outletLookup = useMemo(() => {
    const map = new Map<string, string>();
    outlets.forEach((entry) => map.set(entry.id, entry.name));
    return map;
  }, [outlets]);
  const logs = useMemo(() => Store.listHaccp(), [refreshToken]);
  const visibleLogs = useMemo(() => logs.slice(0, MAX_LEDGER_ROWS), [logs]);
  const parsedTemp = Number(temp);
  const temperatureValid =
    Number.isFinite(parsedTemp) && temp.trim().length > 0;
  const isVariance = temperatureValid && parsedTemp > 41;
  const hasOutlet = Boolean(outletId);
  const canSubmit = hasOutlet && item.trim().length > 0 && temperatureValid;
  const resetForm = () => {
    setItem("");
    setTemp("38");
    setAction("");
  };
  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (!canSubmit) return;
    const resolvedOutletId =
      outletId || outlets[0]?.id || Store.ensureOutletByName("Main Kitchen").id;
    const entry: HACCPLog = {
      id: id(),
      outletId: resolvedOutletId,
      type,
      item: item.trim(),
      tempF: parsedTemp,
      action: action.trim() || null,
      user: user?.name || user?.role || null,
      timestamp: new Date().toISOString(),
    };
    Store.saveHaccp(entry);
    resetForm();
    setRefreshToken((value) => value + 1);
  };
  return (
    <AppLayout>
      {" "}
      <div className="space-y-6">
        {" "}
        <div className="flex flex-col gap-4">
          {" "}
          <div>
            {" "}
            <h1 className="text-3xl font-semibold tracking-tight">
              HACCP Management
            </h1>{" "}
            <p className="text-sm text-muted-foreground">
              Temperature monitoring, training, audits, and compliance tracking
            </p>{" "}
          </div>{" "}
        </div>{" "}
        <Tabs defaultValue="overview" className="w-full">
          {" "}
          <TabsList className="grid w-full grid-cols-5">
            {" "}
            <TabsTrigger value="overview">Overview</TabsTrigger>{" "}
            <TabsTrigger value="logging">Logging</TabsTrigger>{" "}
            <TabsTrigger value="training">Training</TabsTrigger>{" "}
            <TabsTrigger value="audits">Audits</TabsTrigger>{" "}
            <TabsTrigger value="checklists">Checklists</TabsTrigger>{" "}
          </TabsList>{" "}
          <TabsContent value="overview" className="space-y-6">
            {" "}
            <HaccpProgramSummary
              tasks={HACCP_CHECKLISTS}
              training={HACCP_TRAINING_MODULES}
            />{" "}
            <HaccpRemindersPanel reminders={HACCP_REMINDERS} />{" "}
          </TabsContent>{" "}
          <TabsContent value="logging" className="space-y-6">
            {" "}
            <Card className="border-2">
              {" "}
              <form onSubmit={handleSubmit} className="space-y-4">
                {" "}
                <CardHeader>
                  {" "}
                  <CardTitle>HACCP Logging</CardTitle>{" "}
                  <CardDescription>
                    {" "}
                    Capture temperatures and corrective actions aligned to
                    receiving CCPs.{" "}
                  </CardDescription>{" "}
                </CardHeader>{" "}
                <CardContent className="space-y-4">
                  {" "}
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    {" "}
                    <div className="space-y-2">
                      {" "}
                      <Label htmlFor="haccp-type">Type</Label>{" "}
                      <Select
                        value={type}
                        onValueChange={(value) =>
                          setType(value as HACCPLog["type"])
                        }
                      >
                        {" "}
                        <SelectTrigger id="haccp-type">
                          {" "}
                          <SelectValue placeholder="Select type" />{" "}
                        </SelectTrigger>{" "}
                        <SelectContent>
                          {" "}
                          {HACCP_TYPES.map((entry) => (
                            <SelectItem key={entry} value={entry}>
                              {" "}
                              {entry}{" "}
                            </SelectItem>
                          ))}{" "}
                        </SelectContent>{" "}
                      </Select>{" "}
                    </div>{" "}
                    <div className="space-y-2">
                      {" "}
                      <Label htmlFor="haccp-outlet">Outlet</Label>{" "}
                      <Select value={outletId} onValueChange={setOutletId}>
                        {" "}
                        <SelectTrigger id="haccp-outlet">
                          {" "}
                          <SelectValue placeholder="Select outlet" />{" "}
                        </SelectTrigger>{" "}
                        <SelectContent>
                          {" "}
                          {outlets.map((outlet) => (
                            <SelectItem key={outlet.id} value={outlet.id}>
                              {" "}
                              {outlet.name}{" "}
                            </SelectItem>
                          ))}{" "}
                        </SelectContent>{" "}
                      </Select>{" "}
                    </div>{" "}
                    <div className="space-y-2">
                      {" "}
                      <Label htmlFor="haccp-item">Item</Label>{" "}
                      <Input
                        id="haccp-item"
                        value={item}
                        onChange={(event) => setItem(event.target.value)}
                        placeholder="e.g., Poultry delivery"
                      />{" "}
                    </div>{" "}
                    <div className="space-y-2">
                      {" "}
                      <Label htmlFor="haccp-temp">Temperature (°F)</Label>{" "}
                      <Input
                        id="haccp-temp"
                        type="number"
                        inputMode="decimal"
                        value={temp}
                        onChange={(event) => setTemp(event.target.value)}
                      />{" "}
                    </div>{" "}
                  </div>{" "}
                  <div className="space-y-2">
                    {" "}
                    <Label htmlFor="haccp-action">
                      {" "}
                      Corrective Action / Notes{" "}
                    </Label>{" "}
                    <Input
                      id="haccp-action"
                      value={action}
                      onChange={(event) => setAction(event.target.value)}
                      placeholder="e.g., Re-chilled to 38°F before storage"
                    />{" "}
                  </div>{" "}
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    {" "}
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      {" "}
                      <Badge variant={isVariance ? "destructive" : "secondary"}>
                        {" "}
                        {isVariance ? "Out of spec" : "Within spec"}{" "}
                      </Badge>{" "}
                      <span>
                        {" "}
                        {temperatureValid
                          ? `Recorded at ${parsedTemp.toFixed(1)}°F`
                          : "Enter a temperature"}{" "}
                      </span>{" "}
                    </div>{" "}
                    <div className="flex gap-2">
                      {" "}
                      <Button
                        type="button"
                        variant="outline"
                        onClick={resetForm}
                      >
                        {" "}
                        Reset{" "}
                      </Button>{" "}
                      <Button type="submit" disabled={!canSubmit}>
                        {" "}
                        Log Entry{" "}
                      </Button>{" "}
                    </div>{" "}
                  </div>{" "}
                </CardContent>{" "}
              </form>{" "}
            </Card>{" "}
            <Card className="border-2">
              {" "}
              <CardHeader>
                {" "}
                <CardTitle>Recent HACCP Entries</CardTitle>{" "}
                <CardDescription>
                  {" "}
                  Export-ready ledger for compliance spot-checks.{" "}
                </CardDescription>{" "}
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
                        <TableHead>Time</TableHead> <TableHead>Type</TableHead>{" "}
                        <TableHead>Outlet</TableHead>{" "}
                        <TableHead>Item</TableHead>{" "}
                        <TableHead>Temp °F</TableHead>{" "}
                        <TableHead>Action</TableHead>{" "}
                        <TableHead>Team Member</TableHead>{" "}
                      </TableRow>{" "}
                    </TableHeader>{" "}
                    <TableBody>
                      {" "}
                      {visibleLogs.map((log) => (
                        <TableRow key={log.id}>
                          {" "}
                          <TableCell>
                            {" "}
                            {new Date(log.timestamp).toLocaleString()}{" "}
                          </TableCell>{" "}
                          <TableCell>{log.type}</TableCell>{" "}
                          <TableCell>
                            {" "}
                            {outletLookup.get(log.outletId) ?? "Unknown"}{" "}
                          </TableCell>{" "}
                          <TableCell>{log.item}</TableCell>{" "}
                          <TableCell
                            className={
                              log.tempF > 41
                                ? "font-semibold text-destructive"
                                : undefined
                            }
                          >
                            {" "}
                            {log.tempF.toFixed(1)}{" "}
                          </TableCell>{" "}
                          <TableCell>{log.action || "—"}</TableCell>{" "}
                          <TableCell>{log.user || "—"}</TableCell>{" "}
                        </TableRow>
                      ))}{" "}
                      {!visibleLogs.length && (
                        <TableRow>
                          {" "}
                          <TableCell
                            colSpan={7}
                            className="text-center text-sm text-muted-foreground"
                          >
                            {" "}
                            No entries logged yet.{" "}
                          </TableCell>{" "}
                        </TableRow>
                      )}{" "}
                    </TableBody>{" "}
                  </Table>{" "}
                </div>{" "}
              </CardContent>{" "}
            </Card>{" "}
          </TabsContent>{" "}
          <TabsContent value="training" className="space-y-6">
            {" "}
            <HaccpTrainingPanel modules={HACCP_TRAINING_MODULES} />{" "}
          </TabsContent>{" "}
          <TabsContent value="audits" className="space-y-6">
            {" "}
            <HaccpAuditHistory />{" "}
          </TabsContent>{" "}
          <TabsContent value="checklists" className="space-y-6">
            {" "}
            <HaccpChecklistPanel tasks={HACCP_CHECKLISTS} />{" "}
          </TabsContent>{" "}
        </Tabs>{" "}
      </div>{" "}
    </AppLayout>
  );
}
