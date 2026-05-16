import { useMemo } from "react";
import type { EmployeeRow } from "@/lib/schedule";
import { hoursForCell, weeklyHours } from "@/lib/schedule";
import { getLeave } from "@/lib/leave";
import { loadSettings } from "@/features/standalone/settings";
import { getPayPeriod } from "@/lib/payPeriod";

interface TimesheetDetailProps {
  weekStartISO: string;
  employees: EmployeeRow[];
}

export default function TimesheetDetail({ weekStartISO, employees }: TimesheetDetailProps) {
  const settings = loadSettings();
  const outlet = localStorage.getItem("shiftflow:outlet") || "Main";

  const payPeriod = useMemo(
    () => getPayPeriod(weekStartISO, settings),
    [weekStartISO, settings],
  );

  const payPeriodTotals = useMemo(() => {
    const totals: Record<string, { regular: number; overtime: number; leave: number }> = {};

    employees.forEach((emp) => {
      const empRegular = weeklyHours(emp);
      const empOvertime = Math.max(0, empRegular - settings.overtimeThreshold);
      const empRegularNet = Math.max(0, empRegular - empOvertime);
      const leave = getLeave(emp.id, weekStartISO);
      const empLeave = (leave.pto || 0) + (leave.sick || 0);

      totals[emp.id] = {
        regular: empRegularNet,
        overtime: empOvertime,
        leave: empLeave,
      };
    });

    return totals;
  }, [employees, weekStartISO, settings]);

  const getDayLabel = (index: number) => {
    const date = new Date(weekStartISO);
    date.setDate(date.getDate() + index);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      weekday: "short",
    });
  };

  const formatTime = (time: string) => {
    if (!time) return "—";
    const [hh, mm] = time.split(":");
    if (settings.timeFormat24h) {
      return `${hh}:${mm}`;
    }
    const h = parseInt(hh);
    const ampm = h >= 12 ? "PM" : "AM";
    const h12 = h > 12 ? h - 12 : h === 0 ? 12 : h;
    return `${h12}:${mm} ${ampm}`;
  };

  return (
    <div className="space-y-6 text-sm">
      <div className="bg-muted/50 rounded-lg p-4 border">
        <div className="flex items-center justify-between mb-3">
          <div>
            <div className="font-semibold text-base">{payPeriod.label}</div>
            <div className="text-xs text-muted-foreground">
              {payPeriod.startDate} to {payPeriod.endDate}
            </div>
          </div>
          <div className="text-right text-xs font-semibold">
            <div>{settings.payPeriod === "weekly" ? "Week" : "Period"} #{payPeriod.periodNumber}</div>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
          <div className="bg-background rounded p-2">
            <div className="text-muted-foreground mb-1">Regular Hrs</div>
            <div className="text-base font-bold">
              {Object.values(payPeriodTotals)
                .reduce((s, t) => s + t.regular, 0)
                .toFixed(1)}h
            </div>
          </div>
          <div className="bg-background rounded p-2">
            <div className="text-muted-foreground mb-1">OT Hrs</div>
            <div className="text-base font-bold">
              {Object.values(payPeriodTotals)
                .reduce((s, t) => s + t.overtime, 0)
                .toFixed(1)}h
            </div>
          </div>
          <div className="bg-background rounded p-2">
            <div className="text-muted-foreground mb-1">PTO/Sick</div>
            <div className="text-base font-bold">
              {Object.values(payPeriodTotals)
                .reduce((s, t) => s + t.leave, 0)
                .toFixed(1)}h
            </div>
          </div>
          <div className="bg-background rounded p-2">
            <div className="text-muted-foreground mb-1">Total Hrs</div>
            <div className="text-base font-bold">
              {Object.values(payPeriodTotals)
                .reduce((s, t) => s + t.regular + t.overtime + t.leave, 0)
                .toFixed(1)}h
            </div>
          </div>
        </div>
      </div>

      {employees.map((emp) => {
        const weeklyHrs = weeklyHours(emp);
        const leave = getLeave(emp.id, weekStartISO);
        const leaveHrs = (leave.pto || 0) + (leave.sick || 0);
        const overtimeHrs = Math.max(0, weeklyHrs - settings.overtimeThreshold);
        const regularHrs = Math.max(0, weeklyHrs - overtimeHrs);

        const hoursByDept: Record<string, number> = {};
        const dayRows = Array.from({ length: 7 }, (_, i) => {
          const dayKeys = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"] as const;
          const dayKey = dayKeys[i];
          const cell = emp.shifts[dayKey];
          const hrs = cell ? hoursForCell(cell) : 0;

          if (hrs > 0 && cell?.in && cell?.out) {
            const dept = (cell as { department?: string }).department || "General";
            hoursByDept[dept] = (hoursByDept[dept] || 0) + hrs;
          }

          return {
            day: getDayLabel(i),
            in: cell?.in || "",
            out: cell?.out || "",
            breakMin: cell?.breakMin || 0,
            hours: hrs,
            department: cell ? (cell as { department?: string }).department || "—" : "—",
          };
        });

        const shiftedDays = dayRows.filter((d) => d.hours > 0);

        return (
          <div key={emp.id} className="border rounded-lg p-4 bg-card">
            <div className="flex items-center justify-between mb-3 pb-3 border-b">
              <div>
                <div className="font-semibold text-base">{emp.name}</div>
                {emp.role && <div className="text-xs text-muted-foreground">{emp.role}</div>}
              </div>
              <div className="text-right text-xs text-muted-foreground">
                <div>Outlet: {outlet}</div>
              </div>
            </div>

            {shiftedDays.length > 0 && (
              <div className="mb-4">
                <div className="font-semibold text-xs mb-2 text-muted-foreground uppercase">
                  Punch Details
                </div>
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b text-left text-muted-foreground">
                      <th className="py-1 px-2">Date</th>
                      <th className="py-1 px-2">Clock In</th>
                      <th className="py-1 px-2">Clock Out</th>
                      <th className="py-1 px-2">Break (min)</th>
                      <th className="py-1 px-2 text-right">Hours</th>
                      <th className="py-1 px-2">Department</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dayRows.map((day, idx) => {
                      if (day.hours === 0) return null;
                      return (
                        <tr key={idx} className="border-b">
                          <td className="py-2 px-2">{day.day}</td>
                          <td className="py-2 px-2">{formatTime(day.in)}</td>
                          <td className="py-2 px-2">{formatTime(day.out)}</td>
                          <td className="py-2 px-2 text-center">{day.breakMin}</td>
                          <td className="py-2 px-2 text-right font-medium">{day.hours.toFixed(2)}h</td>
                          <td className="py-2 px-2">
                            <span className="bg-muted px-1.5 py-0.5 rounded text-xs">
                              {day.department}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {Object.keys(hoursByDept).length > 1 && (
              <div className="mb-4">
                <div className="font-semibold text-xs mb-2 text-muted-foreground uppercase">
                  Hours by Department
                </div>
                <div className="flex flex-wrap gap-3">
                  {Object.entries(hoursByDept).map(([dept, hrs]) => (
                    <div key={dept} className="flex items-center gap-2">
                      <span className="bg-muted px-2 py-1 rounded text-xs">{dept}</span>
                      <span className="font-medium text-xs">{hrs.toFixed(2)}h</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="bg-muted/50 rounded p-3 text-xs space-y-1">
              <div className="flex justify-between">
                <span>Regular Hours:</span>
                <span className="font-semibold">{regularHrs.toFixed(2)}h</span>
              </div>
              <div className="flex justify-between">
                <span>Overtime Hours:</span>
                <span className="font-semibold">{overtimeHrs.toFixed(2)}h</span>
              </div>
              {leaveHrs > 0 && (
                <div className="flex justify-between">
                  <span>Paid Time Off / Sick:</span>
                  <span className="font-semibold">{leaveHrs.toFixed(2)}h</span>
                </div>
              )}
              <div className="border-t pt-1 mt-1 flex justify-between font-semibold">
                <span>Total Hours:</span>
                <span>{(weeklyHrs + leaveHrs).toFixed(2)}h</span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
