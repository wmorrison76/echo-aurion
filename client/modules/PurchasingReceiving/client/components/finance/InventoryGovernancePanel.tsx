import React, { useEffect, useMemo, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Store, FINANCE_CONTROLS_EVENT_NAME } from "@/lib/store";
import { cn } from "@/lib/utils";
import type {
  FinanceControlSettings,
  InventoryWindowSetting,
  FinanceAuditFlag,
} from "@shared/finance";
import type { Outlet } from "@shared/purchasing";
const DAY_OPTIONS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;
const DAY_ORDER = new Map(DAY_OPTIONS.map((day, index) => [day, index]));
const severityTone: Record<FinanceAuditFlag["severity"], string> = {
  critical: "bg-red-500/10 text-red-600 border-red-200",
  warning: "bg-amber-500/10 text-amber-600 border-amber-200",
  info: "bg-sky-500/10 text-sky-600 border-sky-200",
};
export function InventoryGovernancePanel() {
  const [controls, setControls] = useState<FinanceControlSettings>(() =>
    Store.getFinanceControls(),
  );
  const [outlets, setOutlets] = useState<Outlet[]>(() => Store.listOutlets());
  const [version, setVersion] = useState(0);
  useEffect(() => {
    const refreshControls = () => {
      setControls(Store.getFinanceControls());
      setVersion((value) => value + 1);
    };
    const refreshOutlets = () => setOutlets(Store.listOutlets());
    window.addEventListener(FINANCE_CONTROLS_EVENT_NAME, refreshControls);
    window.addEventListener(
      "echo:outlet:save",
      refreshOutlets as EventListener,
    );
    return () => {
      window.removeEventListener(FINANCE_CONTROLS_EVENT_NAME, refreshControls);
      window.removeEventListener(
        "echo:outlet:save",
        refreshOutlets as EventListener,
      );
    };
  }, []);
  const windowsByOutlet = useMemo(() => {
    const map = new Map<string, InventoryWindowSetting[]>();
    for (const window of controls.inventoryWindows) {
      const list = map.get(window.outletId) ?? [];
      list.push(window);
      map.set(window.outletId, list);
    }
    for (const [, list] of map) {
      list.sort((a, b) => a.startTime.localeCompare(b.startTime));
    }
    return map;
  }, [controls.inventoryWindows]);
  const outletControlMap = useMemo(
    () =>
      new Map(
        controls.outletControls.map((control) => [control.outletId, control]),
      ),
    [controls.outletControls],
  );
  const handleUpdateWindow = (
    windowId: string,
    patch: Partial<InventoryWindowSetting>,
  ) => {
    const current = controls.inventoryWindows.find(
      (entry) => entry.id === windowId,
    );
    if (!current) return;
    const next: InventoryWindowSetting = {
      ...current,
      ...patch,
      daysOfWeek: patch.daysOfWeek ?? current.daysOfWeek,
    };
    Store.saveInventoryWindow(next);
    setControls(Store.getFinanceControls());
  };
  const handleToggleDay = (windowId: string, day: string) => {
    const current = controls.inventoryWindows.find(
      (entry) => entry.id === windowId,
    );
    if (!current) return;
    const set = new Set(current.daysOfWeek);
    if (set.has(day)) {
      set.delete(day);
    } else {
      set.add(day);
    }
    if (!set.size) return;
    const days = Array.from(set).sort(
      (a, b) =>
        (DAY_ORDER.get(a as (typeof DAY_OPTIONS)[number]) ?? 0) -
        (DAY_ORDER.get(b as (typeof DAY_OPTIONS)[number]) ?? 0),
    );
    handleUpdateWindow(windowId, { daysOfWeek: days });
  };
  const handleAddWindow = (
    outletId: string,
    count: number,
    outletName: string,
  ) => {
    const name = `${outletName} Window ${count + 1}`;
    Store.saveInventoryWindow({
      id: "",
      outletId,
      name,
      daysOfWeek: ["Mon", "Tue", "Wed", "Thu", "Fri"],
      startTime: "05:00",
      endTime: "07:00",
    });
    setControls(Store.getFinanceControls());
  };
  const handleStartStop = (outletId: string, active: boolean) => {
    Store.toggleInventoryControl(outletId, active);
    setControls(Store.getFinanceControls());
  };
  const handleLock = (outletId: string, hours: number) => {
    const until = new Date(Date.now() + hours * 60 * 60 * 1000).toISOString();
    Store.lockInventoryControl(outletId, until);
    setControls(Store.getFinanceControls());
  };
  const handleClearLock = (outletId: string) => {
    Store.lockInventoryControl(outletId, null);
    setControls(Store.getFinanceControls());
  };
  const handleAuditToggle = (enabled: boolean) => {
    Store.setFinanceAuditEnabled(enabled);
    setControls(Store.getFinanceControls());
  };
  const handleRunAudit = () => {
    Store.runInventoryAudit();
    setControls(Store.getFinanceControls());
  };
  const handleClearFlags = () => {
    Store.clearInventoryAuditFlags();
    setControls(Store.getFinanceControls());
  };
  return (
    <Card className="border-2">
      {" "}
      <CardHeader className="border-b bg-muted/40">
        {" "}
        <CardTitle>Inventory Governance</CardTitle>{" "}
        <CardDescription>
          {" "}
          Control when outlets can count, enforce blackout windows, and let AI
          surface anomalies before close.{" "}
        </CardDescription>{" "}
      </CardHeader>{" "}
      <CardContent className="space-y-6 pt-6">
        {" "}
        <section className="space-y-4">
          {" "}
          <div className="flex flex-wrap items-center justify-between gap-3">
            {" "}
            <div>
              {" "}
              <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                {" "}
                Scheduling windows{" "}
              </h3>{" "}
              <p className="text-xs text-muted-foreground">
                {" "}
                Define when each outlet is allowed to start inventory and who
                must be on deck.{" "}
              </p>{" "}
            </div>{" "}
          </div>{" "}
          <div className="space-y-4">
            {" "}
            {outlets.map((outlet) => {
              const windows = windowsByOutlet.get(outlet.id) ?? [];
              const control = outletControlMap.get(outlet.id);
              const isLocked = Boolean(
                control?.lockedUntil &&
                new Date(control.lockedUntil).getTime() > Date.now(),
              );
              const lockLabel = control?.lockedUntil
                ? new Date(control.lockedUntil).toLocaleString()
                : null;
              return (
                <div
                  key={`${outlet.id}-${version}`}
                  className="rounded-lg border"
                >
                  {" "}
                  <div className="flex flex-wrap items-center justify-between gap-3 border-b bg-muted/30 px-4 py-3 text-sm">
                    {" "}
                    <div className="flex flex-col">
                      {" "}
                      <span className="font-semibold">{outlet.name}</span>{" "}
                      {isLocked && (
                        <span className="text-xs text-red-600">
                          {" "}
                          Locked until {lockLabel}{" "}
                        </span>
                      )}{" "}
                    </div>{" "}
                    <div className="flex flex-wrap items-center gap-2">
                      {" "}
                      <Badge
                        variant={control?.active ? "secondary" : "outline"}
                      >
                        {" "}
                        {control?.active
                          ? "Inventory in progress"
                          : "Stopped"}{" "}
                      </Badge>{" "}
                      <Button
                        size="sm"
                        onClick={() => handleStartStop(outlet.id, true)}
                        disabled={control?.active || isLocked}
                      >
                        {" "}
                        Start{" "}
                      </Button>{" "}
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleStartStop(outlet.id, false)}
                        disabled={!control?.active}
                      >
                        {" "}
                        Stop{" "}
                      </Button>{" "}
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleLock(outlet.id, 12)}
                      >
                        {" "}
                        Lock 12h{" "}
                      </Button>{" "}
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleClearLock(outlet.id)}
                        disabled={!control?.lockedUntil}
                      >
                        {" "}
                        Clear lock{" "}
                      </Button>{" "}
                    </div>{" "}
                  </div>{" "}
                  <div className="space-y-4 p-4">
                    {" "}
                    {windows.map((window) => (
                      <div
                        key={window.id}
                        className="rounded-lg border p-4 text-sm"
                      >
                        {" "}
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          {" "}
                          <Input
                            key={`${window.id}-name-${version}`}
                            defaultValue={window.name}
                            className="h-9 max-w-sm"
                            onBlur={(event) => {
                              const value = event.target.value.trim();
                              if (!value || value === window.name) return;
                              handleUpdateWindow(window.id, { name: value });
                            }}
                          />{" "}
                        </div>{" "}
                        <Separator className="my-4" />{" "}
                        <div className="grid gap-4 lg:grid-cols-2">
                          {" "}
                          <div className="space-y-2">
                            {" "}
                            <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                              {" "}
                              Allowed days{" "}
                            </label>{" "}
                            <div className="flex flex-wrap gap-2">
                              {" "}
                              {DAY_OPTIONS.map((day) => {
                                const active = window.daysOfWeek.includes(day);
                                return (
                                  <Button
                                    key={`${window.id}-${day}-${version}`}
                                    type="button"
                                    size="sm"
                                    variant={active ? "default" : "outline"}
                                    className={cn(
                                      "h-8 px-3",
                                      !active && "bg-background",
                                    )}
                                    onClick={() =>
                                      handleToggleDay(window.id, day)
                                    }
                                  >
                                    {" "}
                                    {day}{" "}
                                  </Button>
                                );
                              })}{" "}
                            </div>{" "}
                          </div>{" "}
                          <div className="grid gap-3 sm:grid-cols-2">
                            {" "}
                            <div className="space-y-2">
                              {" "}
                              <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                                {" "}
                                Start{" "}
                              </label>{" "}
                              <Input
                                type="time"
                                defaultValue={window.startTime}
                                onChange={(event) =>
                                  handleUpdateWindow(window.id, {
                                    startTime: event.target.value,
                                  })
                                }
                              />{" "}
                            </div>{" "}
                            <div className="space-y-2">
                              {" "}
                              <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                                {" "}
                                End{" "}
                              </label>{" "}
                              <Input
                                type="time"
                                defaultValue={window.endTime}
                                onChange={(event) =>
                                  handleUpdateWindow(window.id, {
                                    endTime: event.target.value,
                                  })
                                }
                              />{" "}
                            </div>{" "}
                          </div>{" "}
                        </div>{" "}
                      </div>
                    ))}{" "}
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() =>
                        handleAddWindow(outlet.id, windows.length, outlet.name)
                      }
                    >
                      {" "}
                      Add window{" "}
                    </Button>{" "}
                  </div>{" "}
                </div>
              );
            })}{" "}
            {!outlets.length && (
              <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
                {" "}
                No outlets configured yet. Add at least one outlet to schedule
                inventory windows.{" "}
              </div>
            )}{" "}
          </div>{" "}
        </section>{" "}
        <section className="space-y-4">
          {" "}
          <div className="flex flex-wrap items-center justify-between gap-3">
            {" "}
            <div>
              {" "}
              <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                {" "}
                AI audit &amp; anomaly detection{" "}
              </h3>{" "}
              <p className="text-xs text-muted-foreground">
                {" "}
                Compare physical counts to receipts, highlight spikes, and guide
                follow-up before the close.{" "}
              </p>{" "}
            </div>{" "}
            <div className="flex items-center gap-2 text-sm">
              {" "}
              <span className="text-xs uppercase tracking-wide text-muted-foreground">
                Enabled
              </span>{" "}
              <Switch
                checked={controls.aiAudit.enabled}
                onCheckedChange={handleAuditToggle}
              />{" "}
            </div>{" "}
          </div>{" "}
          <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
            {" "}
            <Badge
              variant="outline"
              className="text-xs uppercase tracking-wide"
            >
              {" "}
              Last run{" "}
            </Badge>{" "}
            <span>
              {" "}
              {controls.aiAudit.lastRunAt
                ? new Date(controls.aiAudit.lastRunAt).toLocaleString()
                : "Not yet run"}{" "}
            </span>{" "}
            <Badge
              variant="outline"
              className="text-xs uppercase tracking-wide"
            >
              {" "}
              Flagged{" "}
            </Badge>{" "}
            <span>{controls.aiAudit.summary?.flagged ?? 0}</span>{" "}
            <Badge
              variant="outline"
              className="text-xs uppercase tracking-wide"
            >
              {" "}
              Critical{" "}
            </Badge>{" "}
            <span>{controls.aiAudit.summary?.critical ?? 0}</span>{" "}
          </div>{" "}
          <div className="flex flex-wrap gap-2">
            {" "}
            <Button
              size="sm"
              onClick={handleRunAudit}
              disabled={!controls.aiAudit.enabled}
            >
              {" "}
              Run AI inventory audit{" "}
            </Button>{" "}
            <Button
              size="sm"
              variant="outline"
              onClick={handleClearFlags}
              disabled={!controls.aiAudit.flags.length}
            >
              {" "}
              Clear flags{" "}
            </Button>{" "}
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setControls(Store.getFinanceControls())}
            >
              {" "}
              Refresh{" "}
            </Button>{" "}
          </div>{" "}
          <div className="space-y-3">
            {" "}
            {controls.aiAudit.flags.length === 0 && (
              <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
                {" "}
                No anomalies flagged. Run the audit to validate the latest
                inventory counts.{" "}
              </div>
            )}{" "}
            {controls.aiAudit.flags.map((flag) => (
              <div
                key={flag.id}
                className={cn(
                  "rounded-lg border p-4 text-sm",
                  severityTone[flag.severity],
                )}
              >
                {" "}
                <div className="flex flex-wrap items-center justify-between gap-2">
                  {" "}
                  <div className="flex flex-col">
                    {" "}
                    <span className="text-sm font-semibold">
                      {flag.itemName}
                    </span>{" "}
                    <span className="text-xs text-muted-foreground">
                      {flag.outletName || "Unknown outlet"}
                    </span>{" "}
                  </div>{" "}
                  <Badge variant="outline" className="uppercase tracking-wide">
                    {" "}
                    {flag.severity}{" "}
                  </Badge>{" "}
                </div>{" "}
                <p className="mt-2 text-sm">{flag.message}</p>{" "}
                <div className="mt-2 flex flex-wrap gap-4 text-xs text-muted-foreground">
                  {" "}
                  {flag.expectedQty != null && (
                    <span>Expected: {flag.expectedQty}</span>
                  )}{" "}
                  {flag.actualQty != null && (
                    <span>Actual: {flag.actualQty}</span>
                  )}{" "}
                  {flag.variancePct != null && (
                    <span>Variance: {flag.variancePct}%</span>
                  )}{" "}
                </div>{" "}
                {flag.context && (
                  <p className="mt-2 text-xs text-muted-foreground">
                    {flag.context}
                  </p>
                )}{" "}
              </div>
            ))}{" "}
          </div>{" "}
        </section>{" "}
      </CardContent>{" "}
    </Card>
  );
}
