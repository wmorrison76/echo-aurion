import React from "react";
import { Button } from "@/components/ui/button";
import { useScheduleIntegration } from "../../integrations/scheduling-integration";
import {
  SidebarProvider,
  Sidebar,
  SidebarInset,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import WeekGrid from "../components/scheduler/WeekGrid";
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
} from "../lib/schedule";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Send,
  Printer,
  Download,
  AlertCircle,
  DollarSign,
  Edit,
  X,
  Search,
  Key,
  BarChart3,
  Scale,
  Award,
  Clock,
  FileText,
  Users,
  LayoutDashboard,
} from "lucide-react";
import Toolbar from "../features/standalone/Toolbar";
import ScheduleMenuBar, {
  SchedulePage,
} from "../features/standalone/ScheduleMenuBar";
import { appendAudit } from "../lib/compliance";
import { loadSettings } from "../features/standalone/settings";
import SettingsGear from "../features/standalone/SettingsGear";
import TimesheetReview from "../apps/scheduler-ui/blocks/TimesheetReview";
import TimesheetDetail from "../components/timesheet/TimesheetDetail";
import ScheduleCheckerDialog from "../features/standalone/ScheduleCheckerDialog";
import BottomCheckerBar from "../features/layout/BottomCheckerBar";
import RightDrawerPanel from "../features/layout/RightDrawerPanel";
import GlobalHeader from "../features/layout/GlobalHeader";
import LMSPanel from "../features/manager/LMSPanel";
import ForecastSparkline from "../features/standalone/ForecastSparkline";
import AdvancedAnalyticsDashboard from "../components/analytics/AdvancedAnalyticsDashboard";
import MobileBottomNav from "../features/layout/MobileBottomNav";
import { cloudGetSchedule, cloudSaveSchedule } from "../lib/scheduleCloud";
import { exportScheduleWorkbook, scheduleScopeKey } from "../lib/schedule";
import { generatePrintHTML } from "../lib/printSchedule";
import FinancePanel from "../features/manager/FinancePanel";
import LegalCompliancePanel from "../features/manager/LegalCompliancePanel";
import StaffRatingsPanel from "../features/manager/StaffRatingsPanel";
import TimeOffPanel from "../features/manager/TimeOffPanel";
import AttendanceTracker from "../features/standalone/AttendanceTracker";
import DashboardOverview from "../features/standalone/Dashboard";
import { getProfile, upsertProfile } from "../lib/employees";
import { useTenancy, type Tenancy } from "../hooks/useTenancy";
import { SecureEmployeeAdmin } from "../components/SecureEmployeeAdmin";
import ScheduleReportsHub from "../components/reports/ScheduleReportsHub";
import {
  buildTenancyFromOutletAccess,
  getOutletAccessOptions,
} from "../lib/outletAccess";

// Navigation items for Sidebar
interface NavItem {
  id: SchedulePage;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

type MainPage = SchedulePage | "dashboard";

const NAV_ITEMS: NavItem[] = [
  { id: "schedule", label: "Schedule", icon: CalendarDays },
  { id: "reports", label: "Reports", icon: FileText },
  { id: "forecast", label: "Forecast", icon: BarChart3 },
  { id: "analytics", label: "Analytics", icon: BarChart3 },
  { id: "finance", label: "Finance", icon: DollarSign },
  { id: "legal", label: "Legal & Compliance", icon: Scale },
  { id: "ratings", label: "Ratings", icon: Award },
  { id: "timeoff", label: "Time Off", icon: Clock },
  { id: "attendance", label: "Attendance", icon: Users },
];

type DestinationShellProps = {
  title: string;
  subtitle: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
};

function DestinationShell({ title, subtitle, actions, children }: DestinationShellProps) {
  return (
    <section className="space-y-4">
      <div className="rounded-2xl border border-border/60 bg-background/70 p-4 backdrop-blur">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-1">
            <h2 className="text-xl font-semibold">{title}</h2>
            <p className="max-w-3xl text-sm text-muted-foreground">{subtitle}</p>
          </div>
          {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
        </div>
      </div>
      {children}
    </section>
  );
}

function addDaysISO(iso: string, days: number): string {
  const d = new Date(iso);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

function createDefaultSchedule(weekStartISO?: string): ScheduleState {
  const settings = loadSettings();
  return {
    weekStartISO: weekStartISO ?? startOfWeekISO(new Date(), settings.startDay),
    employees: [
      newEmployee("Alex Johnson", "Barista"),
      newEmployee("Jordan Smith", "Cashier"),
    ],
    managerMessage: "",
    headerLogoDataUrl: "",
  };
}

function downloadBlob(blob: Blob, filename: string) {
  const href = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = href;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(href);
}

export default function Index() {
  const scheduleIntegration = useScheduleIntegration();
  const { tenancy, setTenancy, loading: tenancyLoading } = useTenancy();

  const [state, setState] = React.useState<ScheduleState>(() => createDefaultSchedule());

  // If another module wants to open Schedule on a specific week, it can set this key.
  React.useEffect(() => {
    try {
      const focus = localStorage.getItem("shiftflow:focusWeekStartISO");
      if (!focus) return;
      localStorage.removeItem("shiftflow:focusWeekStartISO");
      setState((p) => ({ ...p, weekStartISO: String(focus) }));
    } catch {
      // ignore
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Sync schedule to financials when state changes
  React.useEffect(() => {
    if (state.employees.length > 0) {
      const schedule = scheduleIntegration.createScheduleFromState({
        weekStartISO: state.weekStartISO,
        employees: state.employees.map((emp) => ({
          id: emp.id || `emp-${emp.name}`,
          name: emp.name,
          role: emp.role || "employee",
          shifts: Object.entries(emp.shifts)
            .filter(([_, shift]) => shift !== null)
            .map(([day, shift]) => ({
              day,
              start: shift!.start,
              end: shift!.end,
            })),
        })),
        outletId: tenancy.outlet_id,
      });
      if (schedule) {
        scheduleIntegration.syncScheduleToFinancials(schedule.id);
      }
    }
  }, [state, scheduleIntegration, tenancy.outlet_id]);
  const [zoom, setZoom] = React.useState<number>(() => {
    try {
      return Number(localStorage.getItem("shiftflow:zoom")) || 1;
    } catch {
      return 1;
    }
  });
  const [editingEmployee, setEditingEmployee] = React.useState<EmployeeRow | null>(
    null,
  );
  const [payRate, setPayRate] = React.useState<string>("");
  const [employeeSearch, setEmployeeSearch] = React.useState("");
  const [adminPanelOpen, setAdminPanelOpen] = React.useState(false);
  const [adminPasswordSet, setAdminPasswordSet] = React.useState(() => {
    try {
      return !!localStorage.getItem("shiftflow:admin-password");
    } catch {
      return false;
    }
  });
  const [currentPage, setCurrentPage] = React.useState<MainPage>("dashboard");
  const [sidebarOpen, setSidebarOpen] = React.useState(false);
  const sidebarCloseTimerRef = React.useRef<number | null>(null);
  const [reportsQuery, setReportsQuery] = React.useState("");
  const [addOpen, setAddOpen] = React.useState(false);
  const [name, setName] = React.useState("");
  const [role, setRole] = React.useState("");
  const [drawerOpen, setDrawerOpen] = React.useState(false);
  const [settingsOpen, setSettingsOpen] = React.useState(false);
  const [contextDialogOpen, setContextDialogOpen] = React.useState(false);
  const [contextDraft, setContextDraft] = React.useState<Tenancy>(tenancy);
  const outletOptions = React.useMemo(() => getOutletAccessOptions(), []);
  const selectedOutletOption = React.useMemo(
    () =>
      outletOptions.find((outlet) => outlet.outlet_id === contextDraft.outlet_id) ||
      outletOptions[0] ||
      null,
    [contextDraft.outlet_id, outletOptions],
  );
  const selectedDepartmentOptions = selectedOutletOption?.departments || [];
  const activeScopeKey = React.useMemo(
    () => scheduleScopeKey({ outletId: tenancy.outlet_id, deptId: tenancy.dept_id }),
    [tenancy.outlet_id, tenancy.dept_id],
  );
  const contextLabel = React.useMemo(() => {
    const outlet = tenancy.outlet_name || tenancy.outlet_id || "Main";
    const dept = tenancy.dept_name || tenancy.dept_id || "Default";
    return `${outlet} · ${dept}`;
  }, [tenancy.dept_id, tenancy.dept_name, tenancy.outlet_id, tenancy.outlet_name]);

  React.useEffect(() => {
    if (contextDialogOpen) {
      setContextDraft(tenancy);
    }
  }, [contextDialogOpen, tenancy]);

  React.useEffect(() => {
    if (!contextDialogOpen || contextDraft.outlet_id || outletOptions.length === 0) {
      return;
    }

    const firstOutlet = outletOptions[0];
    setContextDraft((prev) => ({
      ...prev,
      ...buildTenancyFromOutletAccess(firstOutlet),
    }));
  }, [contextDialogOpen, contextDraft.outlet_id, outletOptions]);

  React.useEffect(() => {
    if (tenancyLoading) return;
    const loaded = loadSchedule({ outletId: tenancy.outlet_id, deptId: tenancy.dept_id });
    setState((prev) => loaded ?? createDefaultSchedule(prev.weekStartISO));
  }, [activeScopeKey, tenancy.dept_id, tenancy.outlet_id, tenancyLoading]);

  // CRITICAL: Save schedule state to localStorage whenever it changes React.useEffect(() => { saveSchedule(state); }, [state])
  const filteredEmployees = state.employees.filter((e) =>
    e.name.toLowerCase().includes(employeeSearch.toLowerCase()),
  );
  const handleEditEmployeePayRate = (employee: EmployeeRow) => {
    const profile = getProfile(employee.id, {
      id: employee.id,
      name: employee.name,
    });
    setEditingEmployee(employee);
    setPayRate(String(profile.payRate || ""));
  };
  const handleSavePayRate = () => {
    if (!editingEmployee) return;
    const rate = parseFloat(payRate);
    if (isNaN(rate) || rate < 0) {
      window.alert("Please enter a valid hourly rate");
      return;
    }
    const profile = getProfile(editingEmployee.id, {
      id: editingEmployee.id,
      name: editingEmployee.name,
    });
    upsertProfile({ ...profile, payRate: rate });
    appendAudit(state.weekStartISO, {
      ts: Date.now(),
      type: "payrate.updated",
      meta: {
        employeeId: editingEmployee.id,
        employeeName: editingEmployee.name,
        newRate: rate,
      },
    });
    setEditingEmployee(null);
    setPayRate("");
  };
  React.useEffect(() => {
    try {
      localStorage.setItem("shiftflow:zoom", String(zoom));
    } catch (error) {
      void error;
    }
  }, [zoom]);
  React.useEffect(() => {
    const printStyles = ` @media print { body { margin: 0; padding: 0; background: white; } * { color: black !important; background-color: transparent !important;
} header { display: none; } .floating-sidebar, .sidebar-hub, .bottom-bar { display: none !important; } .sticky { position: relative; } main > section { display: none;
} .glass-panel { page-break-inside: avoid; border: none; background: white; padding: 10px; margin: 0; } .space-y-4 { display: block;
} .space-y-4 > div:not(.zoom-root) { display: none; } .space-y-4 > .glass-panel { display: block; } .scheduler-wrap { width: 100%; page-break-inside: avoid; border: none;
padding: 0; margin: 0; } table { width: 100%; border-collapse: collapse; font-size: 10px; page-break-inside: avoid; } thead { display: table-header-group;
} tr { page-break-inside: avoid; } th, td { border: 1px solid #999; padding: 4px; text-align: left; } th { background-color: #f0f0f0; } .text-right { text-align: right;
} .text-center { text-align: center; } @page { margin: 0.25in; size: landscape; } } `;
    const style = document.createElement("style");
    style.textContent = printStyles;
    document.head.appendChild(style);
    return () => style.remove();
  }, []);
  React.useEffect(() => {
    const onKey = (e: globalThis.KeyboardEvent) => {
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
  const autosaveTimerRef = React.useRef<number | null>(null);
  React.useEffect(() => {
    saveSchedule(state, { outletId: tenancy.outlet_id, deptId: tenancy.dept_id });

    if (autosaveTimerRef.current) {
      window.clearTimeout(autosaveTimerRef.current);
    }

    autosaveTimerRef.current = window.setTimeout(() => {
      try {
        cloudSaveSchedule(activeScopeKey, state.weekStartISO, state);
      } catch (error) {
        void error;
      }
    }, 250);

    return () => {
      if (autosaveTimerRef.current) {
        window.clearTimeout(autosaveTimerRef.current);
      }
    };
  }, [activeScopeKey, state, tenancy.dept_id, tenancy.outlet_id]);
  React.useEffect(() => {
    const fn = (e: Event) => {
      const detail = (e as CustomEvent<{ startDay?: number }>).detail;
      const sd = Number(detail?.startDay ?? loadSettings().startDay);
      setState((p) => ({
        ...p,
        weekStartISO: startOfWeekISO(new Date(p.weekStartISO), sd),
      }));
    };
    window.addEventListener("shiftflow:settings-updated", fn);
    return () => window.removeEventListener("shiftflow:settings-updated", fn);
  }, []);
  React.useEffect(() => {
    const fn = (e: Event) => {
      const detail = (e as CustomEvent<{ query?: string }>).detail;
      setCurrentPage("reports");
      setReportsQuery(detail?.query ?? "");
    };
    window.addEventListener("shiftflow:open-reports", fn as EventListener);
    return () => window.removeEventListener("shiftflow:open-reports", fn as EventListener);
  }, []);
  React.useEffect(() => {
    const openPageMap: Record<string, MainPage> = {
      "shiftflow:open-dashboard": "dashboard",
      "shiftflow:open-schedule": "schedule",
      "shiftflow:open-reports": "reports",
      "shiftflow:open-forecast": "forecast",
      "shiftflow:open-analytics": "analytics",
      "shiftflow:open-finance": "finance",
      "shiftflow:open-legal": "legal",
      "shiftflow:open-ratings": "ratings",
      "shiftflow:open-timeoff": "timeoff",
      "shiftflow:open-attendance": "attendance",
    };

    const handlers = Object.entries(openPageMap).map(([eventName, page]) => {
      const handler = () => setCurrentPage(page);
      window.addEventListener(eventName, handler as EventListener);
      return [eventName, handler] as const;
    });

    return () => {
      handlers.forEach(([eventName, handler]) => {
        window.removeEventListener(eventName, handler as EventListener);
      });
    };
  }, []);

  React.useEffect(() => {
    return () => {
      if (sidebarCloseTimerRef.current) {
        window.clearTimeout(sidebarCloseTimerRef.current);
      }
    };
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

        const prevCell = e.shifts[day] ?? {
          value: "",
          range: null,
          in: "",
          out: "",
          position: "",
          breakMin: 0,
          tip: 0,
        };
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
      type: "publish" as const,
      meta: { action: "clear_week" },
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
  const titleRange = React.useMemo(() => {
    const start = new Date(state.weekStartISO);
    const end = new Date(state.weekStartISO);
    end.setDate(start.getDate() + 6);
    const fmt = (d: Date) =>
      d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
    return `${fmt(start)} – ${fmt(end)}`;
  }, [state.weekStartISO]);
  const handlePrintSchedule = () => {
    const html = generatePrintHTML(state.weekStartISO, state.employees, {
      layout: "horizontal",
      includeTotals: false,
      logoDataUrl: state.headerLogoDataUrl || undefined,
      scheduleTitle: "Weekly Schedule",
      contextLabel,
      managerMessage: state.managerMessage || undefined,
    });
    const printWindow = window.open("", "", "width=1200,height=800");
    if (printWindow) {
      printWindow.document.write(html);
      printWindow.document.close();
      printWindow.focus();
      printWindow.print();
    }
  };
  const handleExportExcel = async () => {
    const blob = await exportScheduleWorkbook(state.weekStartISO, state.employees, {
      title: "Weekly Schedule",
      contextLabel,
      managerMessage: state.managerMessage || undefined,
      logoDataUrl: state.headerLogoDataUrl || undefined,
    });
    downloadBlob(blob, `schedule_${state.weekStartISO}.xlsx`);
  };
  const handleLogoUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (loadEvent) => {
      setState((prev) => ({
        ...prev,
        headerLogoDataUrl: String(loadEvent.target?.result || ""),
      }));
    };
    reader.readAsDataURL(file);
  };
  const handleSaveContext = () => {
    const nextTenancy = selectedOutletOption
      ? {
          ...buildTenancyFromOutletAccess(
            selectedOutletOption,
            contextDraft.dept_id || selectedDepartmentOptions[0]?.id,
          ),
          role: contextDraft.role || tenancy.role || "EMPLOYEE",
        }
      : {
          ...tenancy,
          org_id: contextDraft.org_id.trim() || tenancy.org_id || "restaurant-group",
          org_name: contextDraft.org_name?.trim() || tenancy.org_name || "Restaurant Group",
          outlet_id: contextDraft.outlet_id.trim() || tenancy.outlet_id || "restaurant-1",
          outlet_name: contextDraft.outlet_name?.trim() || tenancy.outlet_name || "Restaurant 1",
          dept_id: contextDraft.dept_id.trim() || tenancy.dept_id || "front-of-house",
          dept_name: contextDraft.dept_name?.trim() || tenancy.dept_name || "Front of House",
          role: contextDraft.role || tenancy.role || "EMPLOYEE",
        };
    setTenancy(nextTenancy);
    try {
      localStorage.setItem("shiftflow:outlet", nextTenancy.outlet_id);
      localStorage.setItem("shiftflow:dept", nextTenancy.dept_id);
    } catch {
      // ignore
    }
    setContextDialogOpen(false);
  };
  React.useEffect(() => {
    if (tenancyLoading) return;
    (async () => {
      try {
        const rec = await cloudGetSchedule(activeScopeKey, state.weekStartISO);
        if (rec?.data) {
          setState(rec.data as ScheduleState);
        }
      } catch (error) {
        void error;
      }
    })();
  }, [activeScopeKey, state.weekStartISO, tenancyLoading]);
  const closeSidebarAfterNavigation = () => {
    if (sidebarCloseTimerRef.current) {
      window.clearTimeout(sidebarCloseTimerRef.current);
    }

    sidebarCloseTimerRef.current = window.setTimeout(() => {
      setSidebarOpen(false);
    }, 125);
  };

  return (
    <SidebarProvider open={sidebarOpen} onOpenChange={setSidebarOpen} panelMode>
      <div className="relative z-0 flex h-full min-h-svh w-full overflow-hidden bg-gradient-to-br from-background via-background to-background">
        <Sidebar variant="floating" collapsible="icon" className="z-[220]">
          <SidebarContent>
            <SidebarGroup>
              <SidebarGroupContent>
                <SidebarMenu>
                  <SidebarMenuItem>
                    <SidebarMenuButton
                      onClick={() => {
                        setCurrentPage("dashboard");
                        closeSidebarAfterNavigation();
                      }}
                      isActive={currentPage === "dashboard"}
                      tooltip="Dashboard"
                    >
                      <LayoutDashboard className="w-4 h-4" />
                      <span>Dashboard</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  {NAV_ITEMS.map((item) => {
                    const Icon = item.icon;
                    const isActive = currentPage === item.id;
                    return (
                      <SidebarMenuItem key={item.id}>
                        <SidebarMenuButton
                          onClick={() => {
                            setCurrentPage(item.id);
                            closeSidebarAfterNavigation();
                          }}
                          isActive={isActive}
                          tooltip={item.label}
                        >
                          <Icon className="w-4 h-4" />
                          <span>{item.label}</span>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    );
                  })}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </SidebarContent>
        </Sidebar>

        <SidebarInset className="relative z-0 flex-1 min-w-0 overflow-y-auto overflow-x-hidden px-4 py-3 pb-20">
          {" "}
          {/*
SCHEDULE PAGE - Default view with full schedule grid */}{" "}
          {currentPage === "dashboard" && (
            <DestinationShell
              title="Dashboard"
              subtitle="Operational overview and live schedule metrics for this outlet and department."
              actions={(
                <Button size="sm" variant="outline" onClick={() => setCurrentPage("schedule")}>
                  Back to schedule
                </Button>
              )}
            >
              <DashboardOverview employees={state.employees} weekStartISO={state.weekStartISO} />
            </DestinationShell>
          )}
          {currentPage === "schedule" && (
            <>
              <div className="mb-4 rounded-2xl border border-border/60 bg-background/70 p-4 backdrop-blur">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <SidebarTrigger className="h-8 w-8" />
                      <div>
                        <h2 className="text-lg font-semibold">{titleRange}</h2>
                        <p className="text-sm text-muted-foreground">Context: {contextLabel}</p>
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Notes and logo stay tied to this outlet and department.
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Dialog open={contextDialogOpen} onOpenChange={setContextDialogOpen}>
                      <Button size="sm" variant="outline" onClick={() => setContextDialogOpen(true)}>
                        Switch context
                      </Button>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Switch schedule context</DialogTitle>
                        </DialogHeader>
                        <div className="grid gap-4 py-2">
                          <div className="rounded-2xl border border-border/60 bg-muted/20 px-4 py-3 text-sm">
                            <p className="text-[11px] uppercase tracking-[0.28em] text-muted-foreground">
                              Onboarding & outlet access
                            </p>
                            <p className="mt-1 text-sm text-foreground">
                              Choose the outlet and department that should open for this schedule.
                            </p>
                          </div>

                          <div className="grid gap-4 md:grid-cols-2">
                            <div className="grid gap-1.5">
                              <label className="text-sm font-medium">Outlet</label>
                              <Select
                                value={contextDraft.outlet_id}
                                onValueChange={(value) => {
                                  const outlet = outletOptions.find((item) => item.outlet_id === value);
                                  const firstDept = outlet?.departments[0];
                                  setContextDraft((prev) => ({
                                    ...prev,
                                    org_id: outlet?.org_id || prev.org_id,
                                    org_name: outlet?.org_name || prev.org_name,
                                    outlet_id: value,
                                    outlet_name: outlet?.outlet_name || prev.outlet_name,
                                    dept_id: firstDept?.id || prev.dept_id,
                                    dept_name: firstDept?.name || prev.dept_name,
                                  }));
                                }}
                              >
                                <SelectTrigger className="h-10 rounded-xl">
                                  <SelectValue placeholder="Select an outlet" />
                                </SelectTrigger>
                                <SelectContent>
                                  {outletOptions.map((outlet) => (
                                    <SelectItem key={outlet.outlet_id} value={outlet.outlet_id}>
                                      {outlet.outlet_name}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>

                            <div className="grid gap-1.5">
                              <label className="text-sm font-medium">Department</label>
                              <Select
                                value={contextDraft.dept_id}
                                onValueChange={(value) => {
                                  const dept = selectedDepartmentOptions.find((item) => item.id === value);
                                  setContextDraft((prev) => ({
                                    ...prev,
                                    dept_id: value,
                                    dept_name: dept?.name || prev.dept_name,
                                  }));
                                }}
                                disabled={!selectedOutletOption}
                              >
                                <SelectTrigger className="h-10 rounded-xl">
                                  <SelectValue placeholder="Select a department" />
                                </SelectTrigger>
                                <SelectContent>
                                  {selectedDepartmentOptions.map((department) => (
                                    <SelectItem key={department.id} value={department.id}>
                                      {department.name}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                          </div>

                          <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-border/60 bg-background/80 px-4 py-3 text-xs text-muted-foreground">
                            <span>{selectedOutletOption?.org_name || contextDraft.org_name || "Restaurant Group"}</span>
                            <span>·</span>
                            <span>{selectedOutletOption?.outlet_name || contextDraft.outlet_name || "Select an outlet"}</span>
                            <span>·</span>
                            <span>
                              {selectedDepartmentOptions.find((item) => item.id === contextDraft.dept_id)?.name ||
                                contextDraft.dept_name ||
                                "Select a department"}
                            </span>
                          </div>
                        </div>
                        <DialogFooter>
                          <Button variant="secondary" onClick={() => setContextDialogOpen(false)}>
                            Cancel
                          </Button>
                          <Button onClick={handleSaveContext}>Save context</Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                    <Button size="sm" variant="outline" onClick={() => setAddOpen(true)}>
                      Add employee
                    </Button>
                    <Button size="sm" variant="outline" onClick={clearWeek}>
                      Clear week
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => setAdminPanelOpen(true)}>
                      Admin
                    </Button>
                    <Button size="sm" variant="outline" onClick={handlePrintSchedule}>
                      Print
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => void handleExportExcel()}>
                      Export Excel
                    </Button>
                  </div>
                </div>
                <Dialog open={addOpen} onOpenChange={setAddOpen}>
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
                        <label className="text-sm mb-1 block">Role (optional)</label>
                        <Input value={role} onChange={(e) => setRole(e.target.value)} />
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
                <div className="mt-4 flex justify-end">
                  <div className="space-y-2 w-full max-w-sm">
                    <label className="text-sm font-medium">Schedule logo</label>
                    <Input type="file" accept="image/*" onChange={handleLogoUpload} className="text-xs" />
                    {state.headerLogoDataUrl ? (
                      <img
                        src={state.headerLogoDataUrl}
                        alt="Schedule logo preview"
                        className="h-24 w-full rounded-xl border object-contain p-2"
                      />
                    ) : (
                      <div className="flex h-24 items-center justify-center rounded-xl border border-dashed text-sm text-muted-foreground">
                        No logo selected
                      </div>
                    )}
                  </div>
                </div>
              </div>
              <div
                className="sticky top-0 z-10 bg-background/80 backdrop-blur flex
items-center justify-between px-2 py-2 rounded-lg border border-border/30"
              >
                {" "}
                <ScheduleCheckerDialog
                  weekStartISO={state.weekStartISO}
                  employees={state.employees}
                />{" "}
                <div className="flex items-center gap-2">
                  {" "}
                  <ForecastSparkline employees={state.employees} />{" "}
                </div>{" "}
              </div>{" "}
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
                onOpenOnboarding={() => setContextDialogOpen(true)}
              />{" "}
              <div
                className="zoom-root w-full h-full overflow-hidden flex flex-col"
                style={{ "--app-zoom": zoom } as React.CSSProperties}
              >
                <div className="flex-1 overflow-auto min-w-0">
                  <WeekGrid
                    weekStartISO={state.weekStartISO}
                    employees={state.employees}
                    onChangeCell={onChangeCell}
                    onRemoveEmployee={onRemoveEmployee}
                    onEmployeesReorder={(employees) =>
                      setState((p) => ({ ...p, employees }))
                    }
                  />
                </div>
              </div>
              <div className="rounded-2xl border border-border/60 bg-background/70 p-4 backdrop-blur space-y-2 mt-4">
                <label className="text-sm font-medium">Manager message</label>
                <Textarea
                  value={state.managerMessage || ""}
                  onChange={(event) =>
                    setState((prev) => ({ ...prev, managerMessage: event.target.value }))
                  }
                  placeholder="Write notes for the team, special events, or coverage reminders..."
                  className="min-h-[112px]"
                />
              </div>
            </>
          )}{" "}
          {/* REPORTS PAGE */}{" "}
          {currentPage === "reports" && (
            <DestinationShell
              title="Reports"
              subtitle="Search, run, and export operational, predictive, and LUCCCA-exclusive reports from one place."
              actions={(
                <>
                  <Button size="sm" variant="outline" onClick={() => setCurrentPage("forecast")}>
                    Forecast
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => setCurrentPage("analytics")}>
                    Analytics
                  </Button>
                </>
              )}
            >
              <ScheduleReportsHub
                query={reportsQuery}
                onQueryChange={setReportsQuery}
                weekStartISO={state.weekStartISO}
                onOpenDestination={(destination) => {
                  if (destination === "reports") {
                    setCurrentPage("reports");
                    return;
                  }
                  setCurrentPage(destination as SchedulePage);
                }}
              />
            </DestinationShell>
          )}{" "}
          {/* FORECAST PAGE */}{" "}
          {currentPage === "forecast" && (
            <DestinationShell
              title="Forecast"
              subtitle="Predict staffing demand, workload spikes, and schedule pressure before the week starts."
              actions={(
                <>
                  <Button size="sm" variant="outline" onClick={() => setCurrentPage("reports")}>
                    Reports
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => setCurrentPage("analytics")}>
                    Analytics
                  </Button>
                </>
              )}
            >
              <div className="grid gap-4 xl:grid-cols-[minmax(0,1.5fr)_minmax(280px,0.85fr)]">
                <Card className="border-border/60 bg-background/70 backdrop-blur">
                  <CardHeader>
                    <CardTitle>Predictive staffing preview</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <ForecastSparkline employees={state.employees} />
                  </CardContent>
                </Card>
                <Card className="border-border/60 bg-background/70 backdrop-blur">
                  <CardHeader>
                    <CardTitle className="text-base">Power signals</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3 text-sm text-muted-foreground">
                    <div className="rounded-xl border px-3 py-2">
                      Staffing curve projection, open shifts, and event demand should all land here.
                    </div>
                    <div className="rounded-xl border px-3 py-2">
                      Pair forecast with labor vs contribution and recipe-driven demand once source data is connected.
                    </div>
                  </CardContent>
                </Card>
              </div>
            </DestinationShell>
          )}{" "}
          {/* ANALYTICS PAGE */}{" "}
          {currentPage === "analytics" && (
            <DestinationShell
              title="Analytics"
              subtitle="Track labor, throughput, overtime, and schedule performance across the active week."
              actions={(
                <>
                  <Button size="sm" variant="outline" onClick={() => setCurrentPage("forecast")}>
                    Forecast
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => setCurrentPage("ratings")}>
                    Ratings
                  </Button>
                </>
              )}
            >
              <div className="grid gap-4 xl:grid-cols-[minmax(0,1.35fr)_minmax(300px,0.8fr)]">
                <AdvancedAnalyticsDashboard
                  org_id={tenancy.org_id || "default-org"}
                  outlet_id={tenancy.outlet_id || "default-outlet"}
                  dept_id={tenancy.dept_id || undefined}
                />
                <Card className="border-border/60 bg-background/70 backdrop-blur">
                  <CardHeader>
                    <CardTitle className="text-base">What to watch</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3 text-sm text-muted-foreground">
                    <div className="rounded-xl border px-3 py-2">
                      Use this page for overtime risk, labor efficiency, and manager performance.
                    </div>
                    <div className="rounded-xl border px-3 py-2">
                      This is the place to connect Schedule to A/BEO, recipes, labor cost, and profit.
                    </div>
                  </CardContent>
                </Card>
              </div>
            </DestinationShell>
          )}{" "}
          {/* FINANCE PAGE */}{" "}
          {currentPage === "finance" && (
            <DestinationShell
              title="Finance & Costing"
              subtitle="Review labor spend, cost centers, and general ledger costing inline with the active schedule."
              actions={(
                <Button size="sm" variant="outline" onClick={() => setCurrentPage("analytics")}>
                  Analytics
                </Button>
              )}
            >
              <FinancePanel
                employees={state.employees}
                weekStartISO={state.weekStartISO}
              />
            </DestinationShell>
          )}{" "}
          {/* LEGAL PAGE */}{" "}
          {currentPage === "legal" && (
            <DestinationShell
              title="Legal & Compliance"
              subtitle="Keep schedules aligned with labor rules, break windows, publish history, and audit readiness."
              actions={(
                <>
                  <Button size="sm" variant="outline" onClick={() => setCurrentPage("reports")}>
                    Reports
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => setCurrentPage("ratings")}>
                    Ratings
                  </Button>
                </>
              )}
            >
              <div className="grid gap-4 xl:grid-cols-[minmax(0,1.35fr)_minmax(280px,0.8fr)]">
                <LegalCompliancePanel embedded />
                <Card className="border-border/60 bg-background/70 backdrop-blur">
                  <CardHeader>
                    <CardTitle className="text-base">Compliance focus</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3 text-sm text-muted-foreground">
                    <div className="rounded-xl border px-3 py-2">
                      Use this page to centralize policy checks, rest rules, and acknowledgement flow.
                    </div>
                    <div className="rounded-xl border px-3 py-2">
                      Make violations actionable with links back to the exact schedule context.
                    </div>
                  </CardContent>
                </Card>
              </div>
            </DestinationShell>
          )}{" "}
          {/* RATINGS PAGE */}{" "}
          {currentPage === "ratings" && (
            <DestinationShell
              title="Ratings"
              subtitle="Review reliability, coaching signals, attendance patterns, and manager feedback in one place."
              actions={(
                <>
                  <Button size="sm" variant="outline" onClick={() => setCurrentPage("attendance")}>
                    Attendance
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => setCurrentPage("analytics")}>
                    Analytics
                  </Button>
                </>
              )}
            >
              <div className="grid gap-4 xl:grid-cols-[minmax(0,1.35fr)_minmax(280px,0.8fr)]">
                <StaffRatingsPanel employees={state.employees} embedded />
                <Card className="border-border/60 bg-background/70 backdrop-blur">
                  <CardHeader>
                    <CardTitle className="text-base">Next evolution</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3 text-sm text-muted-foreground">
                    <div className="rounded-xl border px-3 py-2">
                      Add reliability scoring and coaching recommendations tied to attendance and compliance.
                    </div>
                    <div className="rounded-xl border px-3 py-2">
                      Tie ratings to staffing decisions so the system learns who can cover critical shifts.
                    </div>
                  </CardContent>
                </Card>
              </div>
            </DestinationShell>
          )}{" "}
          {/* TIME OFF PAGE */}{" "}
          {currentPage === "timeoff" && (
            <div className="space-y-3">
              <h2 className="text-lg font-semibold">Time Off Management</h2>
              <TimeOffPanel employees={state.employees} embedded />
            </div>
          )}
          {currentPage === "attendance" && (
            <div className="space-y-3">
              <h2 className="text-lg font-semibold">Attendance</h2>
              <AttendanceTracker employees={state.employees} weekStartISO={state.weekStartISO} embedded />
            </div>
          )}
          {/* Admin Panel Modal */}
          <Dialog open={adminPanelOpen} onOpenChange={setAdminPanelOpen}>
            {" "}
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
              {" "}
              <DialogHeader>
                {" "}
                <DialogTitle
                  className="flex
items-center gap-2"
                >
                  {" "}
                  <Key size={20} /> Employee Admin Panel{" "}
                </DialogTitle>{" "}
              </DialogHeader>{" "}
              <SecureEmployeeAdmin
                employees={state.employees}
                onEmployeeUpdate={(emp) => {
                  setState((prev) => ({
                    ...prev,
                    employees: prev.employees.map((e) =>
                      e.id === emp.id ? emp : e,
                    ),
                  }));
                }}
                onEmployeeAdd={(emp) => {
                  setState((prev) => ({
                    ...prev,
                    employees: [...prev.employees, emp],
                  }));
                }}
                onEmployeeRemove={(empId) => {
                  setState((prev) => ({
                    ...prev,
                    employees: prev.employees.filter((e) => e.id !== empId),
                  }));
                }}
              />{" "}
            </DialogContent>{" "}
          </Dialog>{" "}
          {/* Pay Rate Dialog */}{" "}
          <Dialog
            open={!!editingEmployee}
            onOpenChange={(open) => {
              if (!open) {
                setEditingEmployee(null);
                setPayRate("");
              }
            }}
          >
            {" "}
            <DialogContent>
              {" "}
              <DialogHeader>
                {" "}
                <DialogTitle className="flex items-center gap-2">
                  {" "}
                  <DollarSign size={20} /> Edit Pay Rate:
                  {editingEmployee?.name}{" "}
                </DialogTitle>{" "}
              </DialogHeader>{" "}
              <div className="space-y-4">
                {" "}
                <div>
                  {" "}
                  <label
                    className="text-sm
font-medium block mb-2"
                  >
                    {" "}
                    Hourly Rate{" "}
                  </label>{" "}
                  <div className="flex gap-2">
                    {" "}
                    <span className="text-2xl">$</span>{" "}
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="15.00"
                      value={payRate}
                      onChange={(e) => setPayRate(e.target.value)}
                      className="text-lg"
                      autoFocus
                    />{" "}
                    <span
                      className="text-sm
text-muted-foreground self-center"
                    >
                      {" "}
                      /hr{" "}
                    </span>{" "}
                  </div>{" "}
                </div>{" "}
              </div>{" "}
              <DialogFooter>
                {" "}
                <Button
                  variant="outline"
                  onClick={() => {
                    setEditingEmployee(null);
                    setPayRate("");
                  }}
                >
                  {" "}
                  Cancel{" "}
                </Button>{" "}
                <Button onClick={handleSavePayRate}>Save Rate</Button>{" "}
              </DialogFooter>{" "}
            </DialogContent>{" "}
          </Dialog>{" "}
        </SidebarInset>

        {/* Side Panels */}
        <RightDrawerPanel
          open={drawerOpen}
          onClose={() => setDrawerOpen(false)}
        />{" "}
      </div>

      {/* Bottom Components */}
      <MobileBottomNav
        onAdd={() => setAddOpen(true)}
        onToday={goThisWeek}
        onOpenDrawer={() => setDrawerOpen(true)}
      />{" "}
      <BottomCheckerBar
        weekStartISO={state.weekStartISO}
        employees={state.employees}
      />{" "}
    </SidebarProvider>
  );
}
