import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  dayTotals,
  DayKey,
  EmployeeRow,
  weekdayToDayKey,
  weeklyHours,
  ShiftCell,
  hoursForCell,
} from "@/lib/schedule";
import DayCell from "./DayCell";
import {
  Trash2,
  FileText,
  UserCog,
  ClipboardPlus,
  ShieldCheck,
} from "lucide-react";
import { loadSettings } from "@/features/standalone/settings";
import { useEffect, useRef, useState } from "react";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
  ContextMenuSeparator,
} from "@/components/ui/context-menu";
import EmployeeOnboarding from "@/features/manager/EmployeeOnboarding";
import EmployeeReportDialog from "@/features/manager/EmployeeReportDialog";
import { addToTimesheet } from "@/lib/timesheet";
import {
  getApprovedLeaveDay,
  getLeave,
  getLeaveRequestDay,
  setLeaveStatus,
} from "@/lib/leave";

interface Props {
  weekStartISO: string;
  employees: EmployeeRow[];
  onChangeCell: (empId: string, day: DayKey, patch: Partial<ShiftCell>) => void;
  onRemoveEmployee: (empId: string) => void;
}

function dayLabels(
  weekStartISO: string,
): { key: DayKey; label: string; date: string; dt: Date }[] {
  const start = new Date(weekStartISO);
  return Array.from({ length: 7 }, (_, i) => {
    const dt = new Date(start);
    dt.setDate(start.getDate() + i);
    const key = weekdayToDayKey(dt.getDay());
    const label = dt
      .toLocaleDateString(undefined, {
        weekday: "short",
        month: "short",
        day: "2-digit",
      })
      .replace(/\s+/g, " ");
    return { key, label, date: dt.toISOString().slice(0, 10), dt };
  });
}

function displayName(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "";
  if (parts.length === 1) return parts[0];
  const first = parts[0];
  const last = parts[parts.length - 1];
  const initial = last.charAt(0).toUpperCase();
  return `${first} ${initial}.`;
}

export default function WeekGrid({
  weekStartISO,
  employees,
  onChangeCell,
  onRemoveEmployee,
}: Props) {
  const headers = dayLabels(weekStartISO);
  const totals = dayTotals(employees);
  const leaveTotals = headers.reduce(
    (acc, h) => {
      acc[h.key] = employees.reduce((s, e) => {
        const r = getApprovedLeaveDay(e.id, weekStartISO, h.key);
        return s + (r.pto || 0) + (r.sick || 0);
      }, 0);
      return acc;
    },
    {} as Record<DayKey, number>,
  );
  const covers = (k: DayKey) =>
    employees.filter((e) => {
      const c = e.shifts[k];
      return Boolean((c?.in && c?.out) || c?.value);
    }).length;
  const settings = loadSettings();
  const [forecast, setForecast] = useState<
    Record<DayKey, { breakfast: number | ""; lunch: number | "" }>
  >(() => {
    try {
      const s = localStorage.getItem(`shiftflow:forecast:${weekStartISO}`);
      return s ? JSON.parse(s) : ({} as any);
    } catch {
      return {} as any;
    }
  });
  useEffect(() => {
    try {
      localStorage.setItem(
        `shiftflow:forecast:${weekStartISO}`,
        JSON.stringify(forecast),
      );
    } catch {}
  }, [forecast, weekStartISO]);
  const totalWeeklySched = employees.reduce((s, e) => s + weeklyHours(e), 0);
  const totalWeeklyLeave = employees.reduce((s, e) => {
    const r = getLeave(e.id, weekStartISO);
    return s + (r.pto || 0) + (r.sick || 0);
  }, 0);
  const totalWeekly = totalWeeklySched + totalWeeklyLeave;
  const totalOt = employees.reduce(
    (s, e) => s + Math.max(0, weeklyHours(e) - settings.overtimeThreshold),
    0,
  );
  const totalCost = employees.reduce((s, e) => {
    const h = weeklyHours(e);
    const ot = Math.max(0, h - settings.overtimeThreshold);
    const rate = e.rate ?? settings.hourlyDefaultRate;
    return s + h * rate + ot * rate * 0.5;
  }, 0);
  const dailyCost = headers.reduce(
    (acc, h) => {
      let sum = 0;
      for (const e of employees) {
        const rate = e.rate ?? settings.hourlyDefaultRate;
        sum += hoursForCell(e.shifts[h.key]) * rate;
        const lv = getApprovedLeaveDay(e.id, weekStartISO, h.key);
        sum += ((lv.pto || 0) + (lv.sick || 0)) * rate;
      }
      acc[h.key] = sum;
      return acc;
    },
    {} as Record<DayKey, number>,
  );
  const dailySales = settings.weeklySales > 0 ? settings.weeklySales / 7 : 0;
  const dailyLaborPct = headers.reduce(
    (acc, h) => {
      const pct = dailySales > 0 ? (dailyCost[h.key] / dailySales) * 100 : 0;
      acc[h.key] = pct;
      return acc;
    },
    {} as Record<DayKey, number>,
  );

  const [selectedDay, setSelectedDay] = useState<DayKey | null>(null);
  const [copiedCol, setCopiedCol] = useState<string[] | null>(null);
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const [onboardingFor, setOnboardingFor] = useState<EmployeeRow | null>(null);
  const [reportFor, setReportFor] = useState<EmployeeRow | null>(null);

  function onCopyColumn(day: DayKey) {
    const col = employees.map((e) => {
      const c = e.shifts[day];
      const a = (c?.in ?? "").trim();
      const b = (c?.out ?? "").trim();
      return a || b ? `${a}-${b}` : "";
    });
    setCopiedCol(col);
    try {
      navigator.clipboard.writeText(col.join("\n"));
    } catch {}
  }
  function onPasteColumn(day: DayKey) {
    const parseLine = (s: string) => {
      const t = s.trim();
      if (!t) return { in: "", out: "" };
      const parts = t.split(/\s*(?:-|–|—|to|,)\s*/i);
      const a = parts[0] ?? "";
      const b = parts[1] ?? "";
      return { in: a, out: b };
    };
    const apply = (lines: string[]) => {
      const vals =
        lines.length === employees.length
          ? lines
          : lines.length === 1
            ? employees.map(() => lines[0])
            : employees.map((_, i) => copiedCol?.[i] ?? "");
      employees.forEach((e, i) => {
        const { in: a, out: b } = parseLine(vals[i] ?? "");
        onChangeCell(e.id, day, { in: a, out: b });
      });
    };
    if (navigator.clipboard && (navigator.clipboard as any).readText) {
      navigator.clipboard
        .readText()
        .then((t) => apply(t.split(/\r?\n/).map((s) => s.trim())))
        .catch(() => {
          if (copiedCol) apply(copiedCol);
        });
    } else if (copiedCol) apply(copiedCol);
  }

  return (
    <Card className="overflow-hidden glass-panel scheduler-wrap">
      <div
        ref={wrapRef}
        tabIndex={0}
        className="overflow-hidden grid-backdrop outline-none"
        onKeyDown={(e) => {
          if (!selectedDay) return;
          if (e.ctrlKey && (e.key === "c" || e.key === "C")) {
            e.preventDefault();
            onCopyColumn(selectedDay);
          }
          if (e.ctrlKey && (e.key === "v" || e.key === "V")) {
            e.preventDefault();
            onPasteColumn(selectedDay);
          }
        }}
      >
        <Table className="text-[11px] leading-tight">
          <TableHeader className="sticky top-0 z-10 bg-background/80 backdrop-blur">
            <TableRow className="bg-muted/20">
              <TableHead className="w-36 px-1">Employee</TableHead>
              {headers.map((h) => (
                <TableHead
                  key={h.date}
                  className={`px-1 h-8 cursor-pointer ${selectedDay === h.key ? "bg-primary/10" : ""}`}
                  title={
                    selectedDay === h.key
                      ? "Selected. Ctrl+C to copy, Ctrl+V to paste."
                      : "Click to select column. Ctrl+C to copy, Ctrl+V to paste."
                  }
                  onClick={() => {
                    setSelectedDay(h.key);
                    wrapRef.current?.focus();
                  }}
                >
                  <div className="text-[11px] font-medium mt-0 text-center col-span-2">
                    {h.label}
                  </div>
                  <div className="grid grid-cols-2 gap-1 text-[9px] text-foreground/70 mt-0">
                    <div className="text-center">IN</div>
                    <div className="text-center">OUT</div>
                  </div>
                </TableHead>
              ))}
              <TableHead className="text-right w-20 px-2">TOTAL HRS</TableHead>
              <TableHead className="text-right w-16 px-2">OT HRS</TableHead>
              <TableHead className="text-right w-24 px-2">TOTAL COST</TableHead>
              <TableHead className="w-10"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow className="[&>td]:py-0.5 [&>td]:px-1 bg-accent/10">
              <TableCell className="font-semibold px-1">FORECAST</TableCell>
              {headers.map((h) => (
                <TableCell
                  key={h.date}
                  className={`p-1 ${selectedDay === h.key ? "bg-primary/5" : ""}`}
                >
                  <div className="flex items-center justify-between gap-1 bg-primary/10 border border-primary/20 rounded-md px-1 py-0.5">
                    <input
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      maxLength={4}
                      className="w-16 h-5 rounded bg-transparent text-[11px] text-foreground px-0 border border-foreground/20 text-center font-mono tracking-wide"
                      value={String((forecast[h.key]?.breakfast as any) ?? "")}
                      onChange={(e) => {
                        const v = e.target.value.replace(/\D/g, "");
                        setForecast((prev) => ({
                          ...prev,
                          [h.key]: {
                            breakfast: v,
                            lunch: prev[h.key]?.lunch ?? "",
                          },
                        }));
                      }}
                      aria-label={`Breakfast forecast ${h.label}`}
                    />
                    <input
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      maxLength={4}
                      className="w-16 h-5 rounded bg-transparent text-[11px] text-foreground px-0 border border-foreground/20 text-center font-mono tracking-wide"
                      value={String((forecast[h.key]?.lunch as any) ?? "")}
                      onChange={(e) => {
                        const v = e.target.value.replace(/\D/g, "");
                        setForecast((prev) => ({
                          ...prev,
                          [h.key]: {
                            breakfast: prev[h.key]?.breakfast ?? "",
                            lunch: v,
                          },
                        }));
                      }}
                      aria-label={`Lunch forecast ${h.label}`}
                    />
                  </div>
                </TableCell>
              ))}
              <TableCell></TableCell>
              <TableCell></TableCell>
              <TableCell></TableCell>
              <TableCell></TableCell>
            </TableRow>
            {employees.map((emp) => {
              const hSched = weeklyHours(emp);
              const lv = getLeave(emp.id, weekStartISO);
              const leaveH = (lv.pto || 0) + (lv.sick || 0);
              const h = hSched + leaveH;
              const ot = Math.max(0, hSched - settings.overtimeThreshold);
              const rate = emp.rate ?? settings.hourlyDefaultRate;
              const cost = hSched * rate + ot * rate * 0.5 + leaveH * rate;
              return (
                <TableRow key={emp.id} className="[&>td]:py-0.5 [&>td]:px-1">
                  <TableCell className="font-medium text-foreground px-1">
                    <ContextMenu>
                      <ContextMenuTrigger className="w-full">
                        <div className="flex flex-col leading-tight">
                          <span>{displayName(emp.name)}</span>
                          {emp.role && (
                            <span className="text-[10px] text-muted-foreground">
                              {emp.role}
                            </span>
                          )}
                        </div>
                      </ContextMenuTrigger>
                      <ContextMenuContent>
                        <ContextMenuItem
                          onClick={() => {
                            addToTimesheet(emp.id);
                          }}
                        >
                          <ClipboardPlus className="mr-2 h-4 w-4" /> Add to
                          Timesheet
                        </ContextMenuItem>
                        <ContextMenuItem onClick={() => setReportFor(emp)}>
                          <FileText className="mr-2 h-4 w-4" /> View Last Week
                          Report
                        </ContextMenuItem>
                        <ContextMenuSeparator />
                        <ContextMenuItem onClick={() => setOnboardingFor(emp)}>
                          <UserCog className="mr-2 h-4 w-4" /> Onboarding &
                          Departments
                        </ContextMenuItem>
                        <ContextMenuItem
                          onClick={() =>
                            window.dispatchEvent(
                              new CustomEvent("shiftflow:open-legal" as any),
                            )
                          }
                        >
                          <ShieldCheck className="mr-2 h-4 w-4" /> Open LMS
                          Standards
                        </ContextMenuItem>
                      </ContextMenuContent>
                    </ContextMenu>
                  </TableCell>
                  {headers.map((h) => (
                    <TableCell
                      key={h.date}
                      className={`min-w-20 p-1 align-top ${selectedDay === h.key ? "bg-primary/5" : ""}`}
                    >
                      <ContextMenu>
                        <ContextMenuTrigger className="w-full">
                          <DayCell
                            valueIn={emp.shifts[h.key].in ?? ""}
                            valueOut={emp.shifts[h.key].out ?? ""}
                            position={emp.shifts[h.key].position ?? ""}
                            breakMin={emp.shifts[h.key].breakMin ?? 0}
                            tip={emp.shifts[h.key].tip ?? 0}
                            leaveReq={
                              getLeaveRequestDay(emp.id, weekStartISO, h.key) ||
                              undefined
                            }
                            onChange={(next) => {
                              onChangeCell(emp.id, h.key, {
                                in: next.in,
                                out: next.out,
                                position: next.position,
                                breakMin: next.breakMin,
                                tip: next.tip,
                              });
                            }}
                          />
                        </ContextMenuTrigger>
                        <ContextMenuContent>
                          {(() => {
                            const req = getLeaveRequestDay(
                              emp.id,
                              weekStartISO,
                              h.key,
                            );
                            if (!req)
                              return (
                                <ContextMenuItem disabled>
                                  No leave request
                                </ContextMenuItem>
                              );
                            return (
                              <>
                                <ContextMenuItem
                                  onClick={() =>
                                    setLeaveStatus(
                                      emp.id,
                                      weekStartISO,
                                      h.key,
                                      "approved",
                                    )
                                  }
                                >
                                  Approve {req.type.toUpperCase()} ({req.hours}
                                  h)
                                </ContextMenuItem>
                                <ContextMenuItem
                                  onClick={() => {
                                    const reason =
                                      prompt("Reason for denial") || "";
                                    setLeaveStatus(
                                      emp.id,
                                      weekStartISO,
                                      h.key,
                                      "denied",
                                      reason,
                                    );
                                  }}
                                >
                                  Deny {req.type.toUpperCase()}
                                </ContextMenuItem>
                              </>
                            );
                          })()}
                        </ContextMenuContent>
                      </ContextMenu>
                    </TableCell>
                  ))}
                  <TableCell className="text-right font-semibold text-foreground px-2">
                    {h.toFixed(0)} HR
                  </TableCell>
                  <TableCell className="text-right font-semibold text-foreground px-2">
                    {ot.toFixed(0)}
                  </TableCell>
                  <TableCell className="text-right font-semibold text-foreground px-2">
                    ${cost.toFixed(2)}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => onRemoveEmployee(emp.id)}
                      aria-label="Remove employee"
                    >
                      <Trash2 className="text-muted-foreground" />
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}
            <TableRow className="[&>td]:py-0.5 [&>td]:px-1">
              <TableCell className="font-semibold px-2">Totals</TableCell>
              {headers.map((h) => (
                <TableCell
                  key={h.date}
                  className="text-center font-semibold text-foreground"
                >
                  {(totals[h.key] + leaveTotals[h.key]).toFixed(0)}h
                </TableCell>
              ))}
              <TableCell className="text-right font-semibold text-foreground px-2">
                {totalWeekly.toFixed(0)} HR
              </TableCell>
              <TableCell className="text-right font-semibold text-foreground px-2">
                {totalOt.toFixed(0)}
              </TableCell>
              <TableCell className="text-right font-semibold text-foreground px-2">
                ${totalCost.toFixed(2)}
              </TableCell>
              <TableCell></TableCell>
            </TableRow>
            <TableRow className="[&>td]:py-0.5 [&>td]:px-1">
              <TableCell className="font-semibold px-2">Daily Cost</TableCell>
              {headers.map((h) => (
                <TableCell
                  key={h.date}
                  className="text-center font-semibold text-foreground"
                >
                  ${dailyCost[h.key].toFixed(2)}
                </TableCell>
              ))}
              <TableCell className="text-right"></TableCell>
              <TableCell className="text-right"></TableCell>
              <TableCell className="text-right font-semibold">
                $
                {Object.values(dailyCost)
                  .reduce((a, b) => a + b, 0)
                  .toFixed(2)}
              </TableCell>
              <TableCell></TableCell>
            </TableRow>
            <TableRow className="[&>td]:py-0.5 [&>td]:px-1">
              <TableCell className="font-semibold px-2">
                Daily Labor %
              </TableCell>
              {headers.map((h) => (
                <TableCell
                  key={h.date}
                  className="text-center font-semibold text-foreground"
                >
                  {dailyLaborPct[h.key].toFixed(2)}%
                </TableCell>
              ))}
              <TableCell className="text-right"></TableCell>
              <TableCell className="text-right"></TableCell>
              <TableCell className="text-right"></TableCell>
              <TableCell></TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </div>
      {onboardingFor && (
        <EmployeeOnboarding
          open={!!onboardingFor}
          onOpenChange={(v) => setOnboardingFor(v ? onboardingFor : null)}
          employee={onboardingFor}
        />
      )}
      {reportFor && (
        <EmployeeReportDialog
          open={!!reportFor}
          onOpenChange={(v) => setReportFor(v ? reportFor : null)}
          employee={reportFor}
          weekStartISO={weekStartISO}
        />
      )}
    </Card>
  );
}
