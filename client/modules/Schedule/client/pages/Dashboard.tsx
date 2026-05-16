import React from "react";
import { useEffect as dashboardUseEffect, useMemo as dashboardUseMemo, useState as dashboardUseState, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, Building2, Loader2, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useTenancy } from "../hooks/useTenancy";
import CommandCenterDashboard from "../features/standalone/Dashboard";
import {
  buildTenancyFromOutletAccess,
  getOutletAccessOptions,
  getPrimaryDepartment,
} from "../lib/outletAccess";

const DASHBOARD_NAV_ITEMS = [
  { id: "dashboard", label: "Dashboard", href: "/dashboard" },
  { id: "schedule", label: "Schedule", href: "/schedule" },
];

function DashboardShell({
  navigate,
  title,
  subtitle,
  action,
  children,
}: {
  navigate: (path: string) => void;
  title: string;
  subtitle: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <SidebarProvider defaultOpen={false} panelMode>
      <div className="flex h-full min-h-[500px] w-full overflow-hidden bg-gradient-to-br from-background via-background to-background">
        <Sidebar variant="floating" collapsible="icon">
          <SidebarContent>
            <SidebarGroup>
              <SidebarGroupContent>
                <SidebarMenu>
                  {DASHBOARD_NAV_ITEMS.map((item) => (
                    <SidebarMenuItem key={item.id}>
                      <SidebarMenuButton
                        onClick={() => navigate(item.href)}
                        isActive={item.id === "dashboard"}
                        tooltip={item.label}
                      >
                        <span>{item.label}</span>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </SidebarContent>
        </Sidebar>

        <SidebarInset className="relative z-0 flex-1 min-w-0 overflow-y-auto overflow-x-hidden px-3 py-2 pb-4">
          <div className="mb-3 rounded-xl border border-border/60 bg-background/70 p-3 backdrop-blur">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <SidebarTrigger className="h-7 w-7" />
                  <div>
                    <h2 className="text-base font-semibold leading-tight">{title}</h2>
                    <p className="text-xs text-muted-foreground">{subtitle}</p>
                  </div>
                </div>
              </div>
              {action ? <div>{action}</div> : null}
            </div>
          </div>

          {children}
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}

function persistTenancyScope(outletId: string, deptId: string) {
  try {
    localStorage.setItem("shiftflow:outlet", outletId);
    localStorage.setItem("shiftflow:dept", deptId);
  } catch {
    // ignore storage errors
  }
}

export default function Dashboard() {
  const navigate = useNavigate();
  const { tenancy, setTenancy, loading } = useTenancy();
  const outlets = dashboardUseMemo(() => getOutletAccessOptions(), []);
  const [selectedOutletId, setSelectedOutletId] = dashboardUseState(
    tenancy.outlet_id || outlets[0]?.outlet_id || "",
  );
  const [selectedDeptId, setSelectedDeptId] = dashboardUseState(
    tenancy.dept_id || getPrimaryDepartment(outlets[0]?.outlet_id || "")?.id || "",
  );

  dashboardUseEffect(() => {
    if (tenancy.outlet_id) {
      setSelectedOutletId(tenancy.outlet_id);
    }
    if (tenancy.dept_id) {
      setSelectedDeptId(tenancy.dept_id);
    }
  }, [tenancy.dept_id, tenancy.outlet_id]);

  const selectedOutlet = outlets.find((outlet) => outlet.outlet_id === selectedOutletId) || null;
  const availableDepartments = dashboardUseMemo(() => selectedOutlet?.departments || [], [selectedOutlet]);

  dashboardUseEffect(() => {
    if (!selectedOutlet) {
      return;
    }

    if (!availableDepartments.some((department) => department.id === selectedDeptId)) {
      setSelectedDeptId(availableDepartments[0]?.id || "");
    }
  }, [availableDepartments, selectedDeptId, selectedOutlet]);

  dashboardUseEffect(() => {
    if (!loading && !tenancy.org_id && outlets.length === 1) {
      const next = buildTenancyFromOutletAccess(outlets[0]);
      setTenancy(next);
      persistTenancyScope(next.outlet_id, next.dept_id);
      return;
    }

    if (!selectedDeptId && availableDepartments.length > 0) {
      setSelectedDeptId(availableDepartments[0].id);
    }
  }, [
    availableDepartments,
    loading,
    outlets,
    selectedDeptId,
    setTenancy,
    tenancy.org_id,
  ]);

  const handleContinue = () => {
    if (!selectedOutlet) return;
    const next = buildTenancyFromOutletAccess(selectedOutlet, selectedDeptId || undefined);
    setTenancy(next);
    persistTenancyScope(next.outlet_id, next.dept_id);
  };

  const isAutoSelectingSingleOutlet = !loading && !tenancy.org_id && outlets.length === 1;

  if (loading || isAutoSelectingSingleOutlet) {
    return (
      <DashboardShell
        navigate={navigate}
        title="Schedule dashboard"
        subtitle="Overview and workspace context for the active schedule."
      >
        <div className="flex min-h-[420px] items-center justify-center px-6">
          <Card className="w-full max-w-md border-border/60 bg-background/80 shadow-[0_18px_50px_rgba(15,23,42,0.06)] backdrop-blur">
            <CardContent className="flex flex-col items-center gap-3 py-10 text-center">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
              <div className="space-y-1">
                <p className="text-sm font-medium text-foreground">Loading schedule workspace</p>
                <p className="text-xs text-muted-foreground">Restoring your outlet access and saved context.</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </DashboardShell>
    );
  }

  if (!tenancy.org_id) {
    return (
      <DashboardShell
        navigate={navigate}
        title="Schedule dashboard"
        subtitle="Overview and workspace context for the active schedule."
      >
        <div className="flex min-h-[calc(100svh-4rem)] w-full items-center justify-center px-4 py-8">
          <Card className="w-full max-w-xl border-border/60 bg-background/85 shadow-[0_24px_70px_rgba(15,23,42,0.10)] backdrop-blur-xl">
            <CardHeader className="space-y-3 text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full border border-primary/15 bg-primary/10 text-primary">
                <Building2 className="h-5 w-5" />
              </div>
              <div className="space-y-1">
                <CardTitle className="text-2xl font-semibold tracking-tight">Welcome</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Choose the outlet and department you want to work in. If only one outlet is available, the schedule will open automatically.
                </p>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <label className="space-y-2 text-sm">
                  <span className="flex items-center gap-2 font-medium text-foreground">
                    <Building2 className="h-4 w-4 text-muted-foreground" />
                    Outlet
                  </span>
                  <Select value={selectedOutletId} onValueChange={(value) => setSelectedOutletId(value)}>
                    <SelectTrigger className="h-11 rounded-xl">
                      <SelectValue placeholder="Select an outlet" />
                    </SelectTrigger>
                    <SelectContent>
                      {outlets.map((outlet) => (
                        <SelectItem key={outlet.outlet_id} value={outlet.outlet_id}>
                          {outlet.outlet_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </label>

                <label className="space-y-2 text-sm">
                  <span className="flex items-center gap-2 font-medium text-foreground">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    Department
                  </span>
                  <Select
                    value={selectedDeptId}
                    onValueChange={(value) => setSelectedDeptId(value)}
                    disabled={!selectedOutlet}
                  >
                    <SelectTrigger className="h-11 rounded-xl">
                      <SelectValue placeholder="Select a department" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableDepartments.map((department) => (
                        <SelectItem key={department.id} value={department.id}>
                          {department.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </label>
              </div>

              <div className="flex items-center justify-between rounded-2xl border border-border/60 bg-muted/30 px-4 py-3 text-xs text-muted-foreground">
                <span>{selectedOutlet ? selectedOutlet.org_name : "Restaurant Group"}</span>
                <span>{selectedOutlet?.departments.length || 0} departments available</span>
              </div>

              <div className="flex flex-wrap items-center justify-end gap-2">
                <Button
                  onClick={handleContinue}
                  disabled={!selectedOutlet}
                  className="h-11 rounded-xl px-5"
                >
                  Continue to dashboard
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </DashboardShell>
    );
  }

  return (
    <DashboardShell
      navigate={navigate}
      title="Schedule dashboard"
      subtitle="Overview and workspace context for the active schedule."
      action={(
        <Button size="sm" variant="outline" onClick={() => navigate("/schedule")}>
          Open schedule
        </Button>
      )}
    >
      <CommandCenterDashboard />
    </DashboardShell>
  );
}
