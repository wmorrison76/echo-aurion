import React from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import ScheduleChecker from "@/features/manager/ScheduleChecker";
import Dashboard from "@/features/standalone/Dashboard";
import AttendanceTracker from "@/features/standalone/AttendanceTracker";
import StaffRatingsPanel from "@/features/manager/StaffRatingsPanel";
import { loadSettings } from "@/features/standalone/settings";
import { getComplianceConfig } from "@/lib/compliance";
import type { EmployeeRow } from "@/lib/schedule";

type PanelKey = "dashboard" | "checker" | "ratings" | "attendance" | "legal";

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <div className="text-sm font-medium">{title}</div>
      <div className="grid gap-2">{children}</div>
    </div>
  );
}

function useStoredBool(key: string, fallback = false) {
  const [value, setValue] = React.useState<boolean>(() => {
    try {
      const stored = localStorage.getItem(key);
      return stored ? stored === "true" : fallback;
    } catch {
      return fallback;
    }
  });

  React.useEffect(() => {
    try {
      localStorage.setItem(key, String(value));
    } catch {
      // ignore storage failures
    }
  }, [key, value]);

  return [value, setValue] as const;
}

export default function SidebarPanelsHub({
  employees,
  weekStartISO,
}: {
  employees: EmployeeRow[];
  weekStartISO: string;
}) {
  const [open, setOpen] = React.useState<PanelKey | null>(null);
  const settings = loadSettings();
  const compliance = getComplianceConfig();
  const [analyticsSales, setAnalyticsSales] = useStoredBool(
    "shiftflow:analytics:sales",
  );
  const [analyticsSplh, setAnalyticsSplh] = useStoredBool(
    "shiftflow:analytics:splh",
  );
  const [ptoBlackout, setPtoBlackout] = useStoredBool("shiftflow:pto:blackout");
  const [attGeo, setAttGeo] = useStoredBool("shiftflow:att:geofence");
  const [attRealtime, setAttRealtime] = useStoredBool("shiftflow:att:realtime");
  const [sysRealtime, setSysRealtime] = useStoredBool("shiftflow:sys:realtime");
  const [sysPerms, setSysPerms] = useStoredBool("shiftflow:sys:permissions");

  React.useEffect(() => {
    const map: Record<string, PanelKey> = {
      "shiftflow:open-dashboard": "dashboard",
      "shiftflow:open-legal": "legal",
      "shiftflow:open-employee": "attendance",
      "shiftflow:open-checker": "checker",
      "shiftflow:open-ratings": "ratings",
    };

    const handlers = Object.entries(map).map(([eventName, panel]) => {
      const handler = () => setOpen(panel);
      window.addEventListener(eventName, handler as EventListener);
      return [eventName, handler] as const;
    });

    return () => {
      handlers.forEach(([eventName, handler]) => {
        window.removeEventListener(eventName, handler as EventListener);
      });
    };
  }, []);

  const title =
    open === "dashboard"
      ? "Schedule Dashboard"
      : open === "checker"
        ? "Schedule Checker"
        : open === "ratings"
          ? "Staff Ratings"
          : open === "attendance"
            ? "Attendance Tracker"
            : "Legal & Compliance";

  return (
    <div className="space-y-3">
      <Section title="Quick Open">
        <div className="grid grid-cols-2 gap-2">
          <Button variant="outline" onClick={() => setOpen("dashboard")}>Dashboard</Button>
          <Button variant="outline" onClick={() => setOpen("checker")}>Checker</Button>
          <Button variant="outline" onClick={() => setOpen("ratings")}>Ratings</Button>
          <Button variant="outline" onClick={() => setOpen("attendance")}>Attendance</Button>
          <Button variant="outline" className="col-span-2" onClick={() => setOpen("legal")}>Legal</Button>
        </div>
      </Section>

      <Section title="Analytics & Ops">
        <div className="grid gap-2 text-xs text-muted-foreground">
          <div className="flex items-center justify-between gap-2 rounded border px-2 py-1">
            <span>Sales analytics</span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setAnalyticsSales((v) => !v)}
            >
              {analyticsSales ? "On" : "Off"}
            </Button>
          </div>
          <div className="flex items-center justify-between gap-2 rounded border px-2 py-1">
            <span>SPLH analytics</span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setAnalyticsSplh((v) => !v)}
            >
              {analyticsSplh ? "On" : "Off"}
            </Button>
          </div>
          <div className="flex items-center justify-between gap-2 rounded border px-2 py-1">
            <span>PTO blackout</span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setPtoBlackout((v) => !v)}
            >
              {ptoBlackout ? "On" : "Off"}
            </Button>
          </div>
          <div className="flex items-center justify-between gap-2 rounded border px-2 py-1">
            <span>Attendance geofence</span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setAttGeo((v) => !v)}
            >
              {attGeo ? "On" : "Off"}
            </Button>
          </div>
          <div className="flex items-center justify-between gap-2 rounded border px-2 py-1">
            <span>Attendance realtime</span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setAttRealtime((v) => !v)}
            >
              {attRealtime ? "On" : "Off"}
            </Button>
          </div>
          <div className="flex items-center justify-between gap-2 rounded border px-2 py-1">
            <span>System realtime</span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSysRealtime((v) => !v)}
            >
              {sysRealtime ? "On" : "Off"}
            </Button>
          </div>
          <div className="flex items-center justify-between gap-2 rounded border px-2 py-1">
            <span>System permissions</span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSysPerms((v) => !v)}
            >
              {sysPerms ? "On" : "Off"}
            </Button>
          </div>
        </div>
      </Section>

      <Section title="Current setup">
        <div className="text-xs text-muted-foreground rounded border px-2 py-2 space-y-1">
          <div>Overtime threshold: {settings.overtimeThreshold}</div>
          <div>Weekly budget: {settings.weeklyBudget}</div>
          <div>Compliance groups: {Object.keys(compliance).length}</div>
        </div>
      </Section>

      <Dialog open={open !== null} onOpenChange={(v) => !v && setOpen(null)}>
        <DialogContent className="max-w-5xl">
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
          </DialogHeader>

          {open === "dashboard" && (
            <Dashboard employees={employees} weekStartISO={weekStartISO} />
          )}
          {open === "checker" && (
            <ScheduleChecker employees={employees} weekStartISO={weekStartISO} />
          )}
          {open === "ratings" && <StaffRatingsPanel employees={employees} />}
          {open === "attendance" && (
            <AttendanceTracker employees={employees} weekStartISO={weekStartISO} />
          )}
          {open === "legal" && (
            <div className="space-y-2 text-sm text-muted-foreground">
              <div>Compliance controls are available from the schedule sidebar.</div>
              <div>Open the related panels from the quick actions above.</div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
