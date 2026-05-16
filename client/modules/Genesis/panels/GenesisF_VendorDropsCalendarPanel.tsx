/**
 * Genesis F — Vendor Drops Calendar Panel
 * RBAC:
 * - PROCUREMENT_VIEW: can view the calendar
 * - VENDOR_SCHEDULE_EDIT: can schedule vendor rule changes
 */

import React from "react";

import {
  AlertCircle,
  Calendar,
  Clock,
  Eye,
  Lock,
  Truck,
  Edit2,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import type { User } from "@/../shared/types/genesis-permissions";
import type { Weekday } from "@/../shared/types/vendor-effective-dated";
import { can } from "@/lib/genesis/permissions/permissionChecks";
import { getCurrentUser } from "@/stores/genesisAuthStore";
import {
  getPending,
  getVersion,
  scheduleChange,
} from "@/stores/vendorScheduleStore";

const DAYS_OF_WEEK: Weekday[] = [
  "SUN",
  "MON",
  "TUE",
  "WED",
  "THU",
  "FRI",
  "SAT",
];

function isoToDate(iso: string): Date {
  // treat YYYY-MM-DD as UTC midnight to avoid TZ drift
  return new Date(`${iso}T00:00:00.000Z`);
}

function dateToIso(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function nextDeliveryDate(asOfISO: string, days: Weekday[]): string | null {
  if (!days || days.length === 0) return null;

  const dayIndex: Record<Weekday, number> = {
    SUN: 0,
    MON: 1,
    TUE: 2,
    WED: 3,
    THU: 4,
    FRI: 5,
    SAT: 6,
  };
  const daySet = new Set(days.map((d) => dayIndex[d]));
  const start = isoToDate(asOfISO);

  for (let i = 0; i <= 14; i++) {
    const candidate = new Date(start.getTime() + i * 24 * 60 * 60 * 1000);
    if (daySet.has(candidate.getUTCDay())) return dateToIso(candidate);
  }
  return null;
}

type TabId = "CALENDAR" | "RULES" | "PENDING";

export default function GenesisF_VendorDropsCalendarPanel() {
  const [user, setUser] = React.useState<User | null>(null);
  const [asOfDate, setAsOfDate] = React.useState<string>(() =>
    new Date().toISOString().slice(0, 10),
  );
  const [tab, setTab] = React.useState<TabId>("CALENDAR");
  const [message, setMessage] = React.useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  const [version, setVersion] = React.useState<ReturnType<
    typeof getVersion
  > | null>(null);
  const [pendingChanges, setPendingChanges] = React.useState<any[]>([]);

  const refresh = React.useCallback(
    (iso: string) => {
      const asOfDateTime = isoToDate(iso);
      setVersion(getVersion(asOfDateTime));
      setPendingChanges(getPending());
    },
    [setVersion],
  );

  React.useEffect(() => {
    setUser(getCurrentUser());
  }, []);

  React.useEffect(() => {
    refresh(asOfDate);
  }, [asOfDate, refresh]);

  const canViewCalendar = can(user, "PROCUREMENT_VIEW");
  const canEditVendors = can(user, "VENDOR_SCHEDULE_EDIT");

  const pushFlash = React.useCallback(
    (next: { type: "success" | "error"; text: string }) => {
      setMessage(next);
      window.setTimeout(() => setMessage(null), 3000);
    },
    [],
  );

  const handleToggleConsolidation = React.useCallback(
    (vendorId: string, current: boolean) => {
      if (!canEditVendors) {
        pushFlash({
          type: "error",
          text: "Insufficient permission: VENDOR_SCHEDULE_EDIT",
        });
        return;
      }
      scheduleChange(
        vendorId,
        asOfDate,
        { preferConsolidatedDrops: !current },
        `Set consolidation to ${!current ? "ON" : "OFF"}`,
        user?.userId,
      );
      refresh(asOfDate);
      pushFlash({
        type: "success",
        text: "Vendor consolidation setting updated.",
      });
    },
    [asOfDate, canEditVendors, pushFlash, refresh, user?.userId],
  );

  const handleToggleDeliveryDay = React.useCallback(
    (vendorId: string, currentDays: Weekday[], day: Weekday) => {
      if (!canEditVendors) {
        pushFlash({
          type: "error",
          text: "Insufficient permission: VENDOR_SCHEDULE_EDIT",
        });
        return;
      }
      const has = currentDays.includes(day);
      const nextDays = has
        ? currentDays.filter((d) => d !== day)
        : [...currentDays, day];
      scheduleChange(
        vendorId,
        asOfDate,
        { deliveryDays: nextDays },
        `${has ? "Remove" : "Add"} delivery day ${day}`,
        user?.userId,
      );
      refresh(asOfDate);
      pushFlash({ type: "success", text: "Delivery days updated." });
    },
    [asOfDate, canEditVendors, pushFlash, refresh, user?.userId],
  );

  if (!canViewCalendar) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-background p-4">
        <Card className="p-6 max-w-md text-center">
          <Lock className="w-12 h-12 mx-auto mb-4 text-amber-500" />
          <h3 className="text-lg font-semibold text-foreground">
            Access Restricted
          </h3>
          <p className="text-sm text-foreground/70 mt-2">
            You don't have permission to view the vendor calendar.
          </p>
          <p className="text-xs text-foreground/60 mt-3">
            Required permission{" "}
            <code className="bg-foreground/10 px-2 py-1 rounded">
              PROCUREMENT_VIEW
            </code>
          </p>
        </Card>
      </div>
    );
  }

  const vendors = version?.vendors ?? [];

  return (
    <div className="w-full h-full flex flex-col bg-background overflow-hidden">
      <div className="flex-shrink-0 border-b border-border/30 p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-lg font-semibold text-foreground">
              Genesis F — Vendor Drops Calendar
            </div>
            <div className="text-sm text-foreground/70 mt-1">
              View vendor delivery schedules, lead times, and consolidation
              preferences
            </div>
          </div>
          <Badge variant="outline">Phase 6</Badge>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-4">
        <div className="space-y-4">
          {message ? (
            <Card
              className={[
                "p-4 flex gap-3",
                message.type === "success"
                  ? "bg-green-500/10 border-green-500/30"
                  : "bg-red-500/10 border-red-500/30",
              ].join(" ")}
            >
              {message.type === "success" ? (
                <Truck className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
              )}
              <div>
                <p
                  className={
                    message.type === "success"
                      ? "text-green-200"
                      : "text-red-200"
                  }
                >
                  {message.text}
                </p>
              </div>
            </Card>
          ) : null}

          <Card className="p-4">
            <div className="flex items-center gap-3">
              <label className="text-sm font-medium text-foreground">
                View as of:
              </label>
              <input
                type="date"
                value={asOfDate}
                onChange={(e) => setAsOfDate(e.target.value)}
                className="px-3 py-1 border border-border/30 rounded text-sm bg-background text-foreground"
              />
              {version?.versionId ? (
                <div className="text-xs text-foreground/70">
                  Version{" "}
                  <code className="bg-foreground/10 px-1.5 py-0.5 rounded font-mono">
                    {version.versionId.slice(0, 24)}…
                  </code>
                </div>
              ) : null}
            </div>
          </Card>

          <Tabs
            value={tab}
            onValueChange={(v) => setTab(v as TabId)}
            className="w-full"
          >
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="CALENDAR">Calendar</TabsTrigger>
              <TabsTrigger value="RULES">Vendor Rules</TabsTrigger>
              <TabsTrigger value="PENDING">
                Pending{" "}
                {pendingChanges.length > 0 ? `(${pendingChanges.length})` : ""}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="CALENDAR" className="space-y-4">
              <div className="space-y-3">
                {vendors.map((v) => {
                  const next = nextDeliveryDate(asOfDate, v.deliveryDays);
                  return (
                    <Card key={v.vendorId} className="p-4">
                      <div className="space-y-3">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <h4 className="font-semibold text-foreground flex gap-2 items-center">
                              {v.vendorName}
                              {v.preferConsolidatedDrops ? (
                                <Badge variant="outline" className="text-xs">
                                  CONSOLIDATED
                                </Badge>
                              ) : null}
                            </h4>
                            <div className="text-sm text-foreground/70 mt-1 flex gap-3 flex-wrap">
                              <span className="flex gap-1 items-center">
                                <Clock className="w-4 h-4" /> Lead:{" "}
                                {v.minLeadDays}d
                              </span>
                              <span className="flex gap-1 items-center">
                                <Calendar className="w-4 h-4" /> Cutoff:{" "}
                                {v.cutoffTimeLocal}
                              </span>
                              <span className="text-xs text-foreground/60">
                                {next
                                  ? `Next drop: ${next}`
                                  : "No delivery days configured"}
                              </span>
                            </div>
                          </div>
                        </div>

                        {canEditVendors ? (
                          <div className="border-t border-border/30 pt-3">
                            <div className="text-xs font-medium text-foreground/70 mb-2">
                              Delivery Days (click to toggle)
                            </div>
                            <div className="grid grid-cols-7 gap-2">
                              {DAYS_OF_WEEK.map((day) => (
                                <button
                                  key={day}
                                  onClick={() =>
                                    handleToggleDeliveryDay(
                                      v.vendorId,
                                      v.deliveryDays,
                                      day,
                                    )
                                  }
                                  className={[
                                    "p-2 rounded border text-sm font-medium transition-colors",
                                    v.deliveryDays.includes(day)
                                      ? "bg-primary/20 border-blue-500/50 text-blue-200"
                                      : "border-border/30 text-foreground/50 hover:text-foreground/70",
                                  ].join(" ")}
                                >
                                  {day}
                                </button>
                              ))}
                            </div>
                          </div>
                        ) : null}

                        {canEditVendors ? (
                          <div className="border-t border-border/30 pt-3 flex items-center justify-between">
                            <label className="text-sm text-foreground">
                              Prefer Consolidated Drops
                            </label>
                            <Button
                              size="sm"
                              variant={
                                v.preferConsolidatedDrops
                                  ? "default"
                                  : "outline"
                              }
                              onClick={() =>
                                handleToggleConsolidation(
                                  v.vendorId,
                                  v.preferConsolidatedDrops,
                                )
                              }
                            >
                              {v.preferConsolidatedDrops ? "ON" : "OFF"}
                            </Button>
                          </div>
                        ) : (
                          <div className="border-t border-border/30 pt-3">
                            <div className="flex items-center gap-2 text-sm text-amber-600 dark:text-amber-400">
                              <Eye className="w-4 h-4" /> View-only mode
                            </div>
                          </div>
                        )}
                      </div>
                    </Card>
                  );
                })}
              </div>
            </TabsContent>

            <TabsContent value="RULES" className="space-y-4">
              <Card className="p-4">
                <div className="text-sm font-medium text-foreground mb-3">
                  Vendor Rules Summary
                </div>
                <div className="space-y-2">
                  {vendors.map((v) => (
                    <div
                      key={v.vendorId}
                      className="flex items-center justify-between p-2 border border-border/30 rounded text-sm"
                    >
                      <div>
                        <span className="font-medium">{v.vendorName}</span>
                        <div className="text-xs text-foreground/70 mt-1">
                          Days: {v.deliveryDays.join(",")} • Lead:{" "}
                          {v.minLeadDays}d
                        </div>
                      </div>
                      <Badge variant="outline">
                        {v.preferConsolidatedDrops ? "CONSOLIDATED" : "SPLIT"}
                      </Badge>
                    </div>
                  ))}
                </div>
              </Card>
            </TabsContent>

            <TabsContent value="PENDING" className="space-y-4">
              <Card className="p-4">
                <div className="text-sm font-medium text-foreground mb-3">
                  Scheduled Changes
                </div>
                {pendingChanges.length > 0 ? (
                  <div className="space-y-2">
                    {pendingChanges.map((change: any) => (
                      <div
                        key={change.changeId}
                        className="flex items-start justify-between p-3 border border-blue-500/30 bg-primary/5 rounded text-sm"
                      >
                        <div>
                          <div className="font-medium text-foreground">
                            {change.memo}
                          </div>
                          <div className="text-xs text-foreground/70 mt-1">
                            Vendor: {change.vendorId} • Effective:{" "}
                            {change.effectiveDateISO}
                          </div>
                        </div>
                        <Badge variant="outline">Pending</Badge>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-foreground/70">
                    No pending changes scheduled
                  </p>
                )}
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>

      <div className="flex-shrink-0 border-t border-border/30 p-4 bg-background">
        {!canEditVendors ? (
          <p className="text-sm text-amber-600 dark:text-amber-400 flex gap-2 mb-2">
            <Lock className="w-4 h-4 flex-shrink-0 mt-0.5" />
            You don't have permission to edit vendor schedules.
          </p>
        ) : null}
        <Button disabled={!canEditVendors} className="w-full" size="lg">
          <Edit2 className="w-4 h-4 mr-2" />
          Edit Vendor Schedule
        </Button>
      </div>
    </div>
  );
}
