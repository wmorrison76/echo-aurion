import React from "react";
import type { DragEvent } from "react";
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
} from "../../lib/schedule";
import DayCell from "./DayCell";
import {
  Trash2,
  FileText,
  UserCog,
  ClipboardPlus,
  ShieldCheck,
  GripVertical,
} from "lucide-react";
import { loadSettings } from "../../features/standalone/settings";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
  ContextMenuSeparator,
} from "../ui/context-menu";
import EmployeeOnboarding from "../../features/manager/EmployeeOnboarding";
import EmployeeReportDialog from "../../features/manager/EmployeeReportDialog";
import { addToTimesheet } from "../../lib/timesheet";
import {
  getApprovedLeaveDay,
  getLeave,
  getLeaveRequestDay,
  setLeaveStatus,
} from "../../lib/leave";
import ForecastAccessControl from "../schedule/ForecastAccessControl";
interface Props {
  weekStartISO: string;
  employees: EmployeeRow[];
  onChangeCell: (empId: string, day: DayKey, patch: Partial<ShiftCell>) => void;
  onRemoveEmployee: (empId: string) => void;
  onEmployeesReorder?: (employees: EmployeeRow[]) => void;
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
      .replace(/\s+/g, "");
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
  onEmployeesReorder,
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
      const c = e?.shifts?.[k];
      return Boolean((c?.in && c?.out) || c?.value);
    }).length;
  const settings = loadSettings();
  const [forecast, setForecast] = React.useState<
    Record<DayKey, { breakfast: number | ""; lunch: number | "" }>
  >(() => {
    try {
      const s = localStorage.getItem(`shiftflow:forecast:${weekStartISO}`);
      return s ? JSON.parse(s) : ({} as any);
    } catch {
      return {} as any;
    }
  });
  React.useEffect(() => {
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
  const [selectedDay, setSelectedDay] = React.useState<DayKey | null>(null);
  const [copiedCol, setCopiedCol] = React.useState<string[] | null>(null);
  const wrapRef = React.useRef<HTMLDivElement | null>(null);
  const [onboardingFor, setOnboardingFor] = React.useState<EmployeeRow | null>(null);
  const [reportFor, setReportFor] = React.useState<EmployeeRow | null>(null);
  const [draggedEmpId, setDraggedEmpId] = React.useState<string | null>(null);
  const [dragOverIndex, setDragOverIndex] = React.useState<number | null>(null);
  const [forecastAccessOpen, setForecastAccessOpen] = React.useState(false);
  const [managerAuthenticated, setManagerAuthenticated] = React.useState(() => {
    try {
      return localStorage.getItem("shiftflow:manager-authenticated") === "true";
    } catch {
      return false;
    }
  });
  const handleDragStart = (empId: string) => {
    setDraggedEmpId(empId);
  };
  const handleDragOver = (e: DragEvent, index: number) => {
    e.preventDefault();
    setDragOverIndex(index);
  };
  const handleDrop = (e: DragEvent, targetIndex: number) => {
    e.preventDefault();
    if (!draggedEmpId) return;
    const draggedIndex = employees.findIndex((e) => e.id === draggedEmpId);
    if (draggedIndex === -1 || draggedIndex === targetIndex) {
      setDraggedEmpId(null);
      setDragOverIndex(null);
      return;
    }
    const newEmployees = [...employees];
    const [draggedItem] = newEmployees.splice(draggedIndex, 1);
    newEmployees.splice(targetIndex, 0, draggedItem);
    if (onEmployeesReorder) {
      onEmployeesReorder(newEmployees);
    }
    setDraggedEmpId(null);
    setDragOverIndex(null);
  };
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
    <Card className="overflow-hidden glass-panel scheduler-wrap w-full h-full flex flex-col">
      
      <div
        ref={wrapRef}
        tabIndex={0}
        className="flex-1 overflow-x-auto overflow-y-auto grid-backdrop outline-none min-w-0"
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
        
        <Table className="text-xs leading-normal border-collapse w-full table-auto">
          
          <TableHeader className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b">
            
            <TableRow className="bg-muted/20">
              
              <TableHead className="w-24 min-w-[6rem] px-2 py-2 whitespace-nowrap sticky left-0 z-20 bg-background/95 backdrop-blur">
                
                <span className="text-xs font-semibold">Employee</span>
              </TableHead>
              {headers.map((h) => (
                <TableHead
                  key={h.date}
                  className={`px-0.5 sm:px-1 py-1 sm:py-2 cursor-pointer min-w-[5rem] sm:min-w-[6.5rem] w-[5rem] sm:w-[6.5rem] max-w-[5rem] sm:max-w-[6.5rem] ${selectedDay === h.key ? "bg-primary/10" : ""}`}
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
                  
                  <div className="text-[9px] sm:text-xs font-semibold text-center mb-0.5 sm:mb-1 truncate">
                    
                    {h.label}
                  </div>
                  <div className="grid grid-cols-2 gap-0.5 sm:gap-1 text-[8px] sm:text-[10px] text-foreground/70">
                    
                    <div className="text-center truncate">IN</div>
                    <div className="text-center truncate">OUT</div>
                  </div>
                </TableHead>
              ))}
              <TableHead className="text-right w-12 sm:w-16 min-w-[3rem] sm:min-w-[4rem] px-1 sm:px-1.5 py-1 sm:py-2 whitespace-nowrap text-[9px] sm:text-xs">
                
                HRS
              </TableHead>
              <TableHead className="text-right w-10 sm:w-14 min-w-[2.5rem] sm:min-w-[3.5rem] px-1 sm:px-1.5 py-1 sm:py-2 whitespace-nowrap text-[9px] sm:text-xs">
                
                OT
              </TableHead>
              <TableHead className="text-right w-14 sm:w-18 min-w-[3.5rem] sm:min-w-[4.5rem] px-1 sm:px-1.5 py-1 sm:py-2 whitespace-nowrap text-[9px] sm:text-xs">
                
                COST
              </TableHead>
              <TableHead className="w-6 sm:w-8 min-w-[1.5rem] sm:min-w-[2rem] px-0.5 sm:px-1"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            
            <ForecastAccessControl
              isOpen={forecastAccessOpen}
              onAuthSuccess={() => {
                setManagerAuthenticated(true);
                setForecastAccessOpen(false);
              }}
            >
              
              <TableRow className="[&>td]:py-2 [&>td]:px-2 bg-accent/10 border-b border-border">
                
                <TableCell className="font-semibold px-2 text-xs sticky left-0 z-10 bg-background">
                  
                  FORECAST
                </TableCell>
                {headers.map((h) => (
                  <TableCell
                    key={h.date}
                    className={`p-1 ${selectedDay === h.key ? "bg-primary/5" : ""}`}
                  >
                    
                    <div className="flex items-center justify-between gap-1 bg-primary/10 border border-primary/20 rounded px-2 py-1">
                      
                      <input
                        type="text"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        maxLength={2}
                        disabled={!managerAuthenticated}
                        className={`w-8 h-6 rounded bg-transparent text-xs text-foreground px-1 border border-foreground/20 text-center font-mono tracking-wide ${!managerAuthenticated ? "cursor-not-allowed opacity-50" : ""}`}
                        value={String(
                          (forecast[h.key]?.breakfast as any) ?? "",
                        )}
                        onClick={() => {
                          if (!managerAuthenticated) {
                            setForecastAccessOpen(true);
                          }
                        }}
                        onChange={(e) => {
                          if (managerAuthenticated) {
                            const v = e.target.value.replace(/\D/g, "");
                            setForecast((prev) => ({
                              ...prev,
                              [h.key]: {
                                breakfast: v,
                                lunch: prev[h.key]?.lunch ?? "",
                              },
                            }));
                          }
                        }}
                        aria-label={`Breakfast forecast ${h.label}`}
                      />
                      <input
                        type="text"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        maxLength={2}
                        disabled={!managerAuthenticated}
                        className={`w-6 h-4 rounded bg-transparent text-[8px] text-foreground px-0 border border-foreground/20 text-center font-mono tracking-wide ${!managerAuthenticated ? "cursor-not-allowed opacity-50" : ""}`}
                        value={String((forecast[h.key]?.lunch as any) ?? "")}
                        onClick={() => {
                          if (!managerAuthenticated) {
                            setForecastAccessOpen(true);
                          }
                        }}
                        onChange={(e) => {
                          if (managerAuthenticated) {
                            const v = e.target.value.replace(/\D/g, "");
                            setForecast((prev) => ({
                              ...prev,
                              [h.key]: {
                                breakfast: prev[h.key]?.breakfast ?? "",
                                lunch: v,
                              },
                            }));
                          }
                        }}
                        aria-label={`Lunch forecast ${h.label}`}
                      />
                    </div>
                  </TableCell>
                ))}
                <TableCell></TableCell><TableCell></TableCell>
                <TableCell></TableCell><TableCell></TableCell>
              </TableRow>
            </ForecastAccessControl>
            {employees.map((emp) => {
              const hSched = weeklyHours(emp);
              const lv = getLeave(emp.id, weekStartISO);
              const leaveH = (lv.pto || 0) + (lv.sick || 0);
              const h = hSched + leaveH;
              const ot = Math.max(0, hSched - settings.overtimeThreshold);
              const rate = emp.rate ?? settings.hourlyDefaultRate;
              const cost = hSched * rate + ot * rate * 0.5 + leaveH * rate;
              const empIndex = employees.findIndex((e) => e.id === emp.id);
              return (
                <TableRow
                  key={emp.id}
                  className={`[&>td]:py-0.5 [&>td]:px-0.5 ${dragOverIndex === empIndex ? "bg-primary/10" : ""} ${draggedEmpId === emp.id ? "opacity-50" : ""}`}
                  draggable
                  onDragStart={() => handleDragStart(emp.id)}
                  onDragOver={(e) => handleDragOver(e, empIndex)}
                  onDrop={(e) => handleDrop(e, empIndex)}
                  onDragLeave={() => setDragOverIndex(null)}
                >
                  
                  <TableCell className="font-medium text-foreground px-1 sm:px-2 py-1 sm:py-2 w-16 sm:w-24 min-w-[4rem] sm:min-w-[6rem] sticky left-0 z-10 bg-background">
                    
                    <div className="flex items-start gap-1.5 min-w-0">
                      
                      <GripVertical className="w-4 h-4 text-muted-foreground mt-0.5 flex-shrink-0 cursor-grab active:cursor-grabbing" />
                      <ContextMenu>
                        
                        <ContextMenuTrigger className="min-w-0 flex-1">
                          
                          <div className="flex flex-col leading-normal min-w-0">
                            
                            <span
                              className="truncate text-[9px] sm:text-xs font-medium block"
                              title={emp.name}
                            >
                              
                              {displayName(emp.name)}
                            </span>
                            {emp.role && (
                              <span
                                className="text-[8px] sm:text-[10px] text-muted-foreground truncate"
                                title={emp.role}
                              >
                                
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
                          <ContextMenuItem
                            onClick={() => setOnboardingFor(emp)}
                          >
                            
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
                    </div>
                  </TableCell>
                  {headers.map((h) => (
                    <TableCell
                      key={h.date}
                      className={`min-w-[5rem] sm:min-w-[6.5rem] w-[5rem] sm:w-[6.5rem] max-w-[5rem] sm:max-w-[6.5rem] p-0.5 sm:p-1.5 align-top relative ${selectedDay === h.key ? "bg-primary/5 ring-2 ring-primary/20" : ""}`}
                      style={{ isolation: "isolate", margin: "0" }}
                    >
                      
                      <ContextMenu>
                        
                        <ContextMenuTrigger className="w-full">
                          
                          <DayCell
                            valueIn={emp.shifts[h.key]?.in ?? ""}
                            valueOut={emp.shifts[h.key]?.out ?? ""}
                            position={emp.shifts[h.key]?.position ?? ""}
                            breakMin={emp.shifts[h.key]?.breakMin ?? 0}
                            tip={emp.shifts[h.key]?.tip ?? 0}
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
                  <TableCell className="text-right font-semibold text-foreground px-2 py-2 text-xs">
                    
                    {h.toFixed(0)}h
                  </TableCell>
                  <TableCell className="text-right font-semibold text-foreground px-2 py-2 text-xs">
                    
                    {ot.toFixed(0)}
                  </TableCell>
                  <TableCell className="text-right font-semibold text-foreground px-2 py-2 text-xs">
                    
                    ${cost.toFixed(0)}
                  </TableCell>
                  <TableCell className="text-center px-1">
                    
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-7 h-7 p-0"
                      onClick={() => onRemoveEmployee(emp.id)}
                      aria-label="Remove employee"
                    >
                      
                      <Trash2 className="text-muted-foreground w-4 h-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}
            <TableRow className="[&>td]:py-2 [&>td]:px-2 bg-muted/30 border-t-2 border-border">
              
              <TableCell className="font-semibold px-2 text-xs sticky left-0 z-10 bg-background">
                
                Totals
              </TableCell>
              {headers.map((h) => (
                <TableCell
                  key={h.date}
                  className="text-center font-semibold text-foreground text-xs"
                >
                  
                  {(totals[h.key] + leaveTotals[h.key]).toFixed(0)}h
                </TableCell>
              ))}
              <TableCell className="text-right font-semibold text-foreground px-2 text-xs">
                
                {totalWeekly.toFixed(0)}h
              </TableCell>
              <TableCell className="text-right font-semibold text-foreground px-2 text-xs">
                
                {totalOt.toFixed(0)}
              </TableCell>
              <TableCell className="text-right font-semibold text-foreground px-2 text-xs">
                
                ${totalCost.toFixed(0)}
              </TableCell>
              <TableCell></TableCell>
            </TableRow>
            <TableRow className="[&>td]:py-2 [&>td]:px-2 bg-muted/20 border-t border-border">
              
              <TableCell className="font-semibold px-2 text-xs sticky left-0 z-10 bg-background">
                
                Daily Cost
              </TableCell>
              {headers.map((h) => (
                <TableCell
                  key={h.date}
                  className="text-center font-semibold text-foreground text-xs"
                >
                  
                  ${dailyCost[h.key].toFixed(0)}
                </TableCell>
              ))}
              <TableCell className="text-right"></TableCell>
              <TableCell className="text-right"></TableCell>
              <TableCell className="text-right font-semibold text-xs">
                
                $
                {Object.values(dailyCost)
                  .reduce((a, b) => a + b, 0)
                  .toFixed(0)}
              </TableCell>
              <TableCell></TableCell>
            </TableRow>
            <TableRow className="[&>td]:py-2 [&>td]:px-2 bg-muted/20 border-t border-border">
              
              <TableCell className="font-semibold px-2 text-xs sticky left-0 z-10 bg-background">
                
                Labor %
              </TableCell>
              {headers.map((h) => (
                <TableCell
                  key={h.date}
                  className="text-center font-semibold text-foreground text-xs"
                >
                  
                  {dailyLaborPct[h.key].toFixed(1)}%
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
