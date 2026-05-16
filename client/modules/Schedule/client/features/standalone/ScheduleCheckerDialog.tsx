import React from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  appendAudit,
  evaluateCompliance,
  getComplianceConfig,
} from "../../lib/compliance";
import { DAYS, DayKey, EmployeeRow, parseTimeRange } from "../../lib/schedule";
import { loadSettings } from "./settings";
export default function ScheduleCheckerDialog({
  weekStartISO,
  employees,
}: {
  weekStartISO: string;
  employees: EmployeeRow[];
}) {
  const [open, setOpen] = React.useState(false);
  const baseline = (() => {
    const out: string[] = [];
    employees.forEach((e) => {
      (DAYS as DayKey[]).forEach((d) => {
        const c = e.shifts[d];
        if (!c) return;
        const has = (c.in && c.out) || c.value;
        if (!has && (c.position || "").trim().length > 0)
          out.push(`${e.name} ${d}: position without time`);
        if (c.in && c.out) {
          const r = parseTimeRange(`${c.in}-${c.out}`);
          if (r && r.end - r.start > 12 * 60)
            out.push(`${e.name} ${d}: shift exceeds 12h`);
        }
      });
    });
    return out;
  })();
  const s = loadSettings();
  const publishedAt =
    Number(
      localStorage.getItem(`shiftflow:publishedAt:${weekStartISO}`) || 0,
    ) || undefined;
  const cc = getComplianceConfig();
  const rep = evaluateCompliance(
    weekStartISO,
    employees,
    {
      predictiveNoticeDays: cc.predictiveNoticeDays,
      restPeriodHours: cc.restPeriodHours,
      maxConsecutiveDays: cc.maxConsecutiveDays,
      overtimeThreshold: s.overtimeThreshold,
    },
    publishedAt,
  );
  const issues = [...baseline, ...((rep?.issues ?? []).map((i) => i.message))];
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          Schedule Checker
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Schedule Checker</DialogTitle>
        </DialogHeader>
        {issues.length ? (
          <ul className="list-disc pl-5 text-sm space-y-1">
            {issues.map((x, i) => (
              <li key={i}>{x}</li>
            ))}
          </ul>
        ) : (
          <div className="text-sm text-emerald-500">
            No issues found for week {weekStartISO}.
          </div>
        )}
        <div className="text-xs text-muted-foreground mt-2">
          Overtime hours: {(rep?.overtimeHours ?? 0).toFixed(2)} • Predictability pay
          hours: {(rep?.predictabilityPayHours ?? 0).toFixed(2)}
        </div>
      </DialogContent>
    </Dialog>
  );
}
