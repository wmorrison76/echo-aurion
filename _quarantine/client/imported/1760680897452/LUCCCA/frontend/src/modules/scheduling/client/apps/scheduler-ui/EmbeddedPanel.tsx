import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import WeekGrid from "@/components/scheduler/WeekGrid";
import {
  DayKey,
  EmployeeRow,
  loadSchedule,
  newEmployee,
  parseTimeRange,
  saveSchedule,
  ScheduleState,
  startOfWeekISO,
  ShiftCell,
  createEmptyShifts,
} from "@/lib/schedule";
import { Plus, RotateCcw } from "lucide-react";
import Toolbar from "@/features/standalone/Toolbar";
import TopMenu from "@/features/standalone/TopMenu";
import { appendAudit } from "@/lib/compliance";
import { loadSettings } from "@/features/standalone/settings";
import TimesheetReview from "@/apps/scheduler-ui/blocks/TimesheetReview";
import ForecastSparkline from "@/features/standalone/ForecastSparkline";
import LMSPanel from "@/features/manager/LMSPanel";
import AnalyticsPanel from "@/features/manager/AnalyticsPanel";
import RightDrawerPanel from "@/features/layout/RightDrawerPanel";
import { cloudGetSchedule, cloudSaveSchedule } from "@/lib/scheduleCloud";

function addDaysISO(iso: string, days: number): string {
  const d = new Date(iso);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

export interface EmbeddedPanelProps {
  className?: string;
  outlet?: string; // override outlet; defaults to localStorage 'shiftflow:outlet' or 'Main'
  initialWeekISO?: string;
  showTimesheet?: boolean;
  onClose?: () => void;
  onChange?: (state: ScheduleState) => void;
}

export default function EmbeddedPanel({
  className,
  outlet,
  initialWeekISO,
  showTimesheet = true,
  onClose,
  onChange,
}: EmbeddedPanelProps) {
  const initial = useMemo<ScheduleState>(() => {
    const loaded = loadSchedule();
    if (loaded) return loaded;
    const s = loadSettings();
    return {
      weekStartISO: initialWeekISO || startOfWeekISO(new Date(), s.startDay),
      employees: [
        newEmployee("Alex Johnson", "Barista"),
        newEmployee("Jordan Smith", "Cashier"),
      ],
    };
  }, [initialWeekISO]);

  const [state, setState] = useState<ScheduleState>(initial);
  const [addOpen, setAddOpen] = useState(false);
  const [name, setName] = useState("");
  const [role, setRole] = useState("");
  const [drawerOpen, setDrawerOpen] = useState(false);

  // Persist locally + cloud
  useEffect(() => {
    saveSchedule(state);
    onChange?.(state);
    try {
      const o = outlet || localStorage.getItem("shiftflow:outlet") || "Main";
      cloudSaveSchedule(o, state.weekStartISO, state);
    } catch {}
  }, [state, outlet, onChange]);

  // Load from cloud when week changes
  useEffect(() => {
    (async () => {
      try {
        const o = outlet || localStorage.getItem("shiftflow:outlet") || "Main";
        const rec = await cloudGetSchedule(o, state.weekStartISO);
        if (rec?.data) {
          setState(rec.data as any);
        }
      } catch {}
    })();
  }, [state.weekStartISO, outlet]);

  const onChangeCell = (
    empId: string,
    day: DayKey,
    patch: Partial<ShiftCell>,
  ) => {
    setState((prev) => ({
      ...prev,
      employees: prev.employees.map((e) => {
        if (e.id !== empId) return e;
        const prevCell = e.shifts[day];
        let nextValue = prevCell.value ?? "";
        let nextRange = prevCell.range ?? null;
        let nextIn = prevCell.in ?? "";
        let nextOut = prevCell.out ?? "";
        if (patch.value !== undefined) {
          nextValue = patch.value ?? "";
          nextRange = parseTimeRange(nextValue);
          nextIn = "";
          nextOut = "";
        } else if (patch.in !== undefined || patch.out !== undefined) {
          nextIn = patch.in ?? nextIn;
          nextOut = patch.out ?? nextOut;
          const composed = `${nextIn}-${nextOut}`.trim();
          nextValue = composed;
          nextRange = parseTimeRange(composed);
        }
        const nextCell: ShiftCell = {
          value: nextValue,
          range: nextRange,
          in: nextIn,
          out: nextOut,
          position: patch.position ?? prevCell.position ?? "",
          breakMin: patch.breakMin ?? prevCell.breakMin ?? 0,
          tip: patch.tip ?? prevCell.tip ?? 0,
        };
        appendAudit(prev.weekStartISO, {
          ts: Date.now(),
          type: "shift.update",
          meta: { empId, day, patch },
        });
        return { ...e, shifts: { ...e.shifts, [day]: nextCell } };
      }),
    }));
  };

  const onRemoveEmployee = (empId: string) => {
    appendAudit(state.weekStartISO, {
      ts: Date.now(),
      type: "shift.remove",
      meta: { empId },
    });
    setState((prev) => ({
      ...prev,
      employees: prev.employees.filter((e) => e.id !== empId),
    }));
  };

  const addEmployee = () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    setState((prev) => ({
      ...prev,
      employees: [...prev.employees, newEmployee(trimmed, role || undefined)],
    }));
    appendAudit(state.weekStartISO, {
      ts: Date.now(),
      type: "shift.add",
      meta: { name: trimmed, role },
    });
    setName("");
    setRole("");
    setAddOpen(false);
  };

  const clearWeek = () => {
    setState((prev) => ({
      ...prev,
      employees: prev.employees.map((e) => ({
        ...e,
        shifts: createEmptyShifts(),
      })),
    }));
    appendAudit(state.weekStartISO, {
      ts: Date.now(),
      type: "clear_week",
      meta: {},
    });
  };

  const nextWeek = () =>
    setState((p) => ({ ...p, weekStartISO: addDaysISO(p.weekStartISO, 7) }));
  const prevWeek = () =>
    setState((p) => ({ ...p, weekStartISO: addDaysISO(p.weekStartISO, -7) }));
  const goThisWeek = () =>
    setState((p) => ({
      ...p,
      weekStartISO: startOfWeekISO(new Date(), loadSettings().startDay),
    }));
  const pickDate = (iso: string) =>
    setState((p) => ({
      ...p,
      weekStartISO: startOfWeekISO(new Date(iso), loadSettings().startDay),
    }));

  const titleRange = useMemo(() => {
    const start = new Date(state.weekStartISO);
    const end = new Date(state.weekStartISO);
    end.setDate(start.getDate() + 6);
    const fmt = (d: Date) =>
      d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
    return `${fmt(start)} – ${fmt(end)}`;
  }, [state.weekStartISO]);

  return (
    <div
      className={
        "scheduler-embedded panel rounded-md border bg-background " +
        (className || "")
      }
    >
      <section className="p-2 space-y-2">
        <div className="flex items-center justify-between gap-2">
          <div>
            <h2 className="text-lg font-semibold tracking-tight">
              {titleRange}
            </h2>
            <p className="text-muted-foreground text-xs">Weekly schedule</p>
          </div>
          <div className="flex items-center gap-2">
            <Dialog open={addOpen} onOpenChange={setAddOpen}>
              <DialogTrigger asChild>
                <Button size="sm">
                  <Plus className="mr-1" />
                  Add
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add employee</DialogTitle>
                </DialogHeader>
                <div className="grid gap-3 py-2">
                  <div>
                    <label className="text-sm mb-1 block">Name</label>
                    <Input
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      autoFocus
                    />
                  </div>
                  <div>
                    <label className="text-sm mb-1 block">
                      Role (optional)
                    </label>
                    <Input
                      value={role}
                      onChange={(e) => setRole(e.target.value)}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="secondary" onClick={() => setAddOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={addEmployee}>Add</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
            <Button variant="outline" size="sm" onClick={clearWeek}>
              <RotateCcw className="mr-1" />
              Clear
            </Button>
            <LMSPanel employees={state.employees} />
            <AnalyticsPanel employees={state.employees} />
            {onClose && (
              <Button variant="ghost" size="sm" onClick={onClose}>
                Close
              </Button>
            )}
          </div>
        </div>
        <div>
          <TopMenu />
          <ForecastSparkline employees={state.employees} />
        </div>
        <Toolbar
          weekStartISO={state.weekStartISO}
          onPrev={prevWeek}
          onNext={nextWeek}
          onToday={goThisWeek}
          onPickDate={pickDate}
          employees={state.employees}
          onEmployeesChange={(e) => setState((p) => ({ ...p, employees: e }))}
        />
      </section>
      <div className="p-2 space-y-2">
        <WeekGrid
          weekStartISO={state.weekStartISO}
          employees={state.employees}
          onChangeCell={onChangeCell}
          onRemoveEmployee={onRemoveEmployee}
        />
        {showTimesheet && (
          <section className="glass-panel p-2">
            <TimesheetReview weekStartISO={state.weekStartISO} employees={state.employees} />
          </section>
        )}
      </div>
      <RightDrawerPanel
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
      />
    </div>
  );
}
