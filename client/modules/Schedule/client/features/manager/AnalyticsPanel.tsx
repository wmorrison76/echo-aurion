import React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import type { EmployeeRow } from "../../lib/schedule";
import { DAYS, weeklyHours } from "../../lib/schedule";
import { loadSettings } from "../standalone/settings";

export default function AnalyticsPanel({
  employees,
  embedded = false,
}: {
  employees: EmployeeRow[];
  embedded?: boolean;
}) {
  const [open, setOpen] = React.useState(true);

  React.useEffect(() => {
    const fn = () => setOpen(true);
    window.addEventListener("shiftflow:open-analytics" as any, fn as any);
    return () =>
      window.removeEventListener("shiftflow:open-analytics" as any, fn as any);
  }, []);

  const settings = React.useMemo(() => loadSettings(), []);

  const totals = React.useMemo(() => {
    const totalHours = employees.reduce((s, e) => s + weeklyHours(e), 0);
    const overtimeEmployees = employees.filter(
      (e) => weeklyHours(e) > settings.overtimeThreshold,
    ).length;
    return { totalHours, overtimeEmployees };
  }, [employees, settings.overtimeThreshold]);

  const byDay = React.useMemo(() => {
    return DAYS.map((day) => {
      const dayHours = employees.reduce((s, e) => {
        const shift = (e as any).shifts?.[day as any];
        if (!shift) return s;
        const hours = Number(shift.hours ?? 0);
        return s + (Number.isFinite(hours) ? hours : 0);
      }, 0);
      return { day, hours: dayHours };
    });
  }, [employees]);

  if (embedded) {
    return (
      <div className="grid gap-4">
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          <div className="border rounded p-3 bg-muted/30">
            <div className="text-xs text-muted-foreground">Employees</div>
            <div className="text-2xl font-bold mt-1">{employees.length}</div>
          </div>
          <div className="border rounded p-3 bg-muted/30">
            <div className="text-xs text-muted-foreground">Total Hours</div>
            <div className="text-2xl font-bold mt-1">
              {totals.totalHours.toFixed(1)}h
            </div>
          </div>
          <div className="border rounded p-3 bg-muted/30">
            <div className="text-xs text-muted-foreground">Overtime Employees</div>
            <div className="text-2xl font-bold mt-1">{totals.overtimeEmployees}</div>
          </div>
        </div>

        <div className="border rounded overflow-hidden bg-background">
          <div className="bg-muted/50 p-3 font-semibold">Hours by Day (approx.)</div>
          <div className="divide-y">
            {byDay.map((d) => (
              <div key={d.day} className="flex items-center justify-between p-2">
                <div className="text-sm">{d.day}</div>
                <div className="text-sm font-medium">{d.hours.toFixed(1)}h</div>
              </div>
            ))}
          </div>
          <div className="p-2 text-xs text-muted-foreground">
            Note: If shift rows don’t store explicit daily hours, this view will be light until integrated with the scheduler grid’s shift duration.
          </div>
        </div>
      </div>
    );
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="w-[96vw] max-w-3xl max-h-[90vh] overflow-auto">
        <DialogHeader>
          <DialogTitle>Analytics & Reporting</DialogTitle>
        </DialogHeader>

        <div className="grid gap-4">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            <div className="border rounded p-3 bg-muted/30">
              <div className="text-xs text-muted-foreground">Employees</div>
              <div className="text-2xl font-bold mt-1">{employees.length}</div>
            </div>
            <div className="border rounded p-3 bg-muted/30">
              <div className="text-xs text-muted-foreground">Total Hours</div>
              <div className="text-2xl font-bold mt-1">
                {totals.totalHours.toFixed(1)}h
              </div>
            </div>
            <div className="border rounded p-3 bg-muted/30">
              <div className="text-xs text-muted-foreground">
                Overtime Employees
              </div>
              <div className="text-2xl font-bold mt-1">
                {totals.overtimeEmployees}
              </div>
            </div>
          </div>

          <div className="border rounded overflow-hidden">
            <div className="bg-muted/50 p-3 font-semibold">
              Hours by Day (approx.)
            </div>
            <div className="divide-y">
              {byDay.map((d) => (
                <div
                  key={d.day}
                  className="flex items-center justify-between p-2"
                >
                  <div className="text-sm">{d.day}</div>
                  <div className="text-sm font-medium">
                    {d.hours.toFixed(1)}h
                  </div>
                </div>
              ))}
            </div>
            <div className="p-2 text-xs text-muted-foreground">
              Note: If shift rows don’t store explicit daily hours, this view
              will be light until integrated with the scheduler grid’s shift
              duration.
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
