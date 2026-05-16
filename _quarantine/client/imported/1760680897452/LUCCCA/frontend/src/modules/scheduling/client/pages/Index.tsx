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
  DAYS,
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
import {
  Plus,
  RotateCcw,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import Toolbar from "@/features/standalone/Toolbar";
// import TopMenu from "@/features/standalone/TopMenu";
import { appendAudit } from "@/lib/compliance";
import { loadSettings } from "@/features/standalone/settings";
import SettingsGear from "@/features/standalone/SettingsGear";
import TimesheetReview from "@/apps/scheduler-ui/blocks/TimesheetReview";
// import LeftSidebarDock from "@/features/layout/LeftSidebarDock";
import FloatingSidebar from "@/features/layout/FloatingSidebar";
import BottomCheckerBar from "@/features/layout/BottomCheckerBar";
import RightDrawerPanel from "@/features/layout/RightDrawerPanel";
import GlobalHeader from "@/features/layout/GlobalHeader";
import LMSPanel from "@/features/manager/LMSPanel";
import ForecastSparkline from "@/features/standalone/ForecastSparkline";
import AnalyticsPanel from "@/features/manager/AnalyticsPanel";
import AssistantPanel from "@/features/manager/AssistantPanel";
import MobileBottomNav from "@/features/layout/MobileBottomNav";
import SidebarPanelsHub from "@/features/layout/SidebarPanelsHub";
import { cloudGetSchedule, cloudSaveSchedule } from "@/lib/scheduleCloud";
import FinancePanel from "@/features/manager/FinancePanel";
import LegalCompliancePanel from "@/features/manager/LegalCompliancePanel";
import StaffRatingsPanel from "@/features/manager/StaffRatingsPanel";
import TimeOffPanel from "@/features/manager/TimeOffPanel";
import AttendanceTracker from "@/features/standalone/AttendanceTracker";
import Dashboard from "@/features/standalone/Dashboard";

function addDaysISO(iso: string, days: number): string {
  const d = new Date(iso);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

export default function Index() {
  const initial = useMemo<ScheduleState>(() => {
    const loaded = loadSchedule();
    if (loaded) return loaded;
    const s = loadSettings();
    return {
      weekStartISO: startOfWeekISO(new Date(), s.startDay),
      employees: [
        newEmployee("Alex Johnson", "Barista"),
        newEmployee("Jordan Smith", "Cashier"),
      ],
    };
  }, []);

  const [state, setState] = useState<ScheduleState>(initial);
  const [zoom, setZoom] = useState<number>(() => {
    try {
      return Number(localStorage.getItem("shiftflow:zoom")) || 1;
    } catch {
      return 1;
    }
  });
  useEffect(() => {
    try {
      localStorage.setItem("shiftflow:zoom", String(zoom));
    } catch {}
  }, [zoom]);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!e.ctrlKey || !e.shiftKey) return;
      if (e.key === "+" || e.key === "=") {
        e.preventDefault();
        setZoom((z) => Math.min(1.5, Math.round((z + 0.1) * 10) / 10));
      }
      if (e.key === "-") {
        e.preventDefault();
        setZoom((z) => Math.max(0.5, Math.round((z - 0.1) * 10) / 10));
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
  const [addOpen, setAddOpen] = useState(false);
  const [name, setName] = useState("");
  const [role, setRole] = useState("");
  const [drawerOpen, setDrawerOpen] = useState(false);

  useEffect(() => {
    saveSchedule(state);
    try {
      const outlet = localStorage.getItem("shiftflow:outlet") || "Main";
      cloudSaveSchedule(outlet, state.weekStartISO, state);
    } catch {}
  }, [state]);

  useEffect(() => {
    const fn = (e: any) => {
      const sd = Number(e?.detail?.startDay ?? loadSettings().startDay);
      setState((p) => ({
        ...p,
        weekStartISO: startOfWeekISO(new Date(p.weekStartISO), sd),
      }));
    };
    window.addEventListener("shiftflow:settings-updated" as any, fn as any);
    return () =>
      window.removeEventListener(
        "shiftflow:settings-updated" as any,
        fn as any,
      );
  }, []);

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

  useEffect(() => {
    (async () => {
      try {
        const outlet = localStorage.getItem("shiftflow:outlet") || "Main";
        const rec = await cloudGetSchedule(outlet, state.weekStartISO);
        if (rec?.data) {
          setState(rec.data as any);
        }
      } catch {}
    })();
  }, [state.weekStartISO]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-background">
      <GlobalHeader />

      <FloatingSidebar />
      <SidebarPanelsHub
        employees={state.employees}
        weekStartISO={state.weekStartISO}
      />
      <div className="flex">
        {/* LeftSidebarDock removed in favor of floating sidebar */}
        <main className="container px-1 py-1 space-y-1 pl-[60px]">
          <section className="glass-panel p-1 space-y-1">
            <div className="flex items-center justify-between flex-wrap gap-1">
              <div>
                <h1 className="text-xl font-semibold tracking-tight">
                  {titleRange}
                </h1>
                <p className="text-muted-foreground text-xs">Weekly schedule</p>
              </div>
              <div className="flex items-center gap-2">
                <Dialog open={addOpen} onOpenChange={setAddOpen}>
                  <DialogTrigger asChild>
                    <Button>
                      <Plus className="mr-2" />
                      Add employee
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
                      <Button
                        variant="secondary"
                        onClick={() => setAddOpen(false)}
                      >
                        Cancel
                      </Button>
                      <Button onClick={addEmployee}>Add</Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
                <Button variant="outline" onClick={clearWeek}>
                  <RotateCcw className="mr-2" />
                  Clear week
                </Button>
                <LMSPanel employees={state.employees} />
                <AnalyticsPanel employees={state.employees} />
                <FinancePanel employees={state.employees} weekStartISO={state.weekStartISO} />
                <LegalCompliancePanel />
                <StaffRatingsPanel employees={state.employees} />
                <TimeOffPanel employees={state.employees} />
                <Button variant="ghost" onClick={() => setDrawerOpen(true)}>
                  Open Drawer
                </Button>
              </div>
            </div>
            <div className="sticky top-11 z-10 bg-background/80 backdrop-blur">
              <ForecastSparkline employees={state.employees} />
            </div>
            <Toolbar
              weekStartISO={state.weekStartISO}
              onPrev={prevWeek}
              onNext={nextWeek}
              onToday={goThisWeek}
              onPickDate={pickDate}
              employees={state.employees}
              onEmployeesChange={(e) =>
                setState((p) => ({ ...p, employees: e }))
              }
            />
          </section>

          <div
            className="space-y-4 zoom-root"
            style={{ ["--app-zoom" as any]: zoom }}
          >
            <WeekGrid
              weekStartISO={state.weekStartISO}
              employees={state.employees}
              onChangeCell={onChangeCell}
              onRemoveEmployee={onRemoveEmployee}
            />
            <section className="glass-panel p-2">
              <TimesheetReview weekStartISO={state.weekStartISO} employees={state.employees} />
            </section>
          </div>
        </main>
      </div>

      <RightDrawerPanel
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
      />
      <MobileBottomNav
        onAdd={() => setAddOpen(true)}
        onToday={goThisWeek}
        onOpenDrawer={() => setDrawerOpen(true)}
      />
      <BottomCheckerBar
        weekStartISO={state.weekStartISO}
        employees={state.employees}
      />
      <AssistantPanel employees={state.employees} />

      <footer className="border-t py-3 mt-14 text-center text-xs text-muted-foreground">
        <div className="container px-2">ShiftFlow • Build schedules fast</div>
      </footer>
    </div>
  );
}
