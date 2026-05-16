import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useEffect, useMemo, useState } from "react";
import type {
  EmployeeRow,
  ScheduleState,
  weeklyHours,
  DayKey,
} from "@/lib/schedule";
import { weeklyHours as wh, hoursForCell, DAYS } from "@/lib/schedule";
import { loadSettings } from "@/features/standalone/settings";
import { getOnboarding } from "@/lib/onboarding";
import { cloudGetSchedule } from "@/lib/scheduleCloud";
import { getLeave } from "@/lib/leave";

function shiftISO(iso: string, days: number) {
  const d = new Date(iso);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

export default function EmployeeReportDialog({
  open,
  onOpenChange,
  employee,
  weekStartISO,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  employee: EmployeeRow;
  weekStartISO: string;
}) {
  const [prev, setPrev] = useState<ScheduleState | null>(null);
  useEffect(() => {
    if (!open) return;
    (async () => {
      try {
        const outlet = localStorage.getItem("shiftflow:outlet") || "Main";
        const iso = shiftISO(weekStartISO, -7);
        const rec = await cloudGetSchedule(outlet, iso);
        if (rec?.data) setPrev(rec.data as any);
      } catch {}
    })();
  }, [open, weekStartISO]);
  const settings = loadSettings();

  const row = useMemo(() => {
    if (!prev) return null;
    const byId = prev.employees.find((e) => e.id === employee.id);
    const byName = prev.employees.find((e) => e.name === employee.name);
    return byId || byName || null;
  }, [prev, employee.id, employee.name]);

  const totals = useMemo(() => {
    const base = row ? wh(row) : 0;
    const ot = Math.max(0, base - settings.overtimeThreshold);
    const reg = base - ot;
    const leave = getLeave(employee.id, shiftISO(weekStartISO, -7));
    const pto = leave.pto || 0;
    const sick = leave.sick || 0;
    const rate = employee.rate ?? settings.hourlyDefaultRate;
    const totalPay = reg * rate + ot * rate * 1.5 + (pto + sick) * rate;
    return { reg, ot, pto, sick, totalHours: reg + ot + pto + sick, totalPay };
  }, [
    row,
    settings.overtimeThreshold,
    employee.rate,
    weekStartISO,
    employee.id,
  ]);

  const ob = getOnboarding(employee.id);
  const shares = ob.shares || (ob.homeDept ? { [ob.homeDept]: 100 } : {});
  const shareEntries = Object.entries(shares);
  const norm = shareEntries.reduce((s, [, v]) => s + (v || 0), 0) || 100;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Last Week • {employee.name}</DialogTitle>
        </DialogHeader>
        {!row ? (
          <div className="text-sm text-muted-foreground">
            No data found for last week.
          </div>
        ) : (
          <div className="grid gap-3 text-sm">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <div className="text-xs text-muted-foreground">Department</div>
                <div>{ob.homeDept || "-"}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Title</div>
                <div>{ob.title || employee.role || "-"}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Reg</div>
                <div>{totals.reg.toFixed(2)}h</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">OT</div>
                <div>{totals.ot.toFixed(2)}h</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">PTO</div>
                <div>{totals.pto.toFixed(2)}h</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Sick</div>
                <div>{totals.sick.toFixed(2)}h</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Total</div>
                <div>{totals.totalHours.toFixed(2)}h</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Total Cost</div>
                <div>${totals.totalPay.toFixed(2)}</div>
              </div>
            </div>
            <div>
              <div className="font-medium">Cost by Department</div>
              <div className="grid gap-1">
                {shareEntries.length === 0 ? (
                  <div className="text-xs text-muted-foreground">
                    Assign departments in Onboarding to break out costs.
                  </div>
                ) : (
                  shareEntries.map(([dept, pct]) => {
                    const ratio = (pct || 0) / norm;
                    const cost = totals.totalPay * ratio;
                    return (
                      <div key={dept} className="flex justify-between">
                        <span>{dept}</span>
                        <span>${cost.toFixed(2)}</span>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
