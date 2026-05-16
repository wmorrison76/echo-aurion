import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { loadSettings, saveSettings } from "@/features/standalone/settings";
import { getComplianceConfig, saveComplianceConfig } from "@/lib/compliance";

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

import ScheduleChecker from "@/features/manager/ScheduleChecker";
import Dashboard from "@/features/standalone/Dashboard";
import StaffRatingsPanel from "@/features/manager/StaffRatingsPanel";
import AttendanceTracker from "@/features/standalone/AttendanceTracker";

export default function SidebarPanelsHub({
  employees,
  weekStartISO,
}: {
  employees: import("@/lib/schedule").EmployeeRow[];
  weekStartISO: string;
}) {
  const [open, setOpen] = useState<string | null>(null);
  const s0 = loadSettings();
  const c0 = getComplianceConfig();
  const [s, setS] = useState(s0);

  // small helper for persistent boolean controls
  const useStoredBool = (k: string, d = false) => {
    const [v, setV] = useState<boolean>(() => {
      try {
        return localStorage.getItem(k) ? localStorage.getItem(k) === "true" : d;
      } catch {
        return d;
      }
    });
    useEffect(() => {
      try {
        localStorage.setItem(k, String(v));
      } catch {}
    }, [k, v]);
    return [v, setV] as const;
  };

  const [c, setC] = useState(c0);
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

  useEffect(() => {
    const map: Record<string, string> = {
      "shiftflow:open-dashboard": "dashboard",
      "shiftflow:open-legal": "legal",
      "shiftflow:open-union": "union",
      "shiftflow:open-employee": "employee",
      "shiftflow:open-financial": "financial",
      "shiftflow:open-timeoff": "timeoff",
      "shiftflow:open-attendance": "attendance",
      "shiftflow:open-reliability": "reliability",
      "shiftflow:open-analytics-settings": "analytics",
      "shiftflow:open-checker": "checker",
      "shiftflow:open-ratings": "ratings",
    };
    const handlers: [string, any][] = Object.entries(map).map(([evt, key]) => {
      const fn = () => setOpen(key);
      window.addEventListener(evt as any, fn as any);
      return [evt, fn];
    });
    return () =>
      handlers.forEach(([evt, fn]) =>
        window.removeEventListener(evt as any, fn as any),
      );
  }, []);

  const items = [
    { key: "dashboard", label: "Dashboard" },
    { key: "checker", label: "Schedule Checker" },
    { key: "legal", label: "Legal & Compliance" },
    { key: "union", label: "Union Agreements" },
    { key: "employee", label: "Employee Rights" },
    { key: "analytics", label: "Analytics" },
    { key: "financial", label: "Financial" },
    { key: "ratings", label: "Staff Ratings" },
    { key: "timeoff", label: "Time-off" },
    { key: "attendance", label: "Attendance" },
    { key: "reliability", label: "Reliability" },
  ] as const;

  return (
    <>
      {items.map((it) => (
        <Dialog
          key={it.key}
          open={open === it.key}
          onOpenChange={(v) => setOpen(v ? it.key : null)}
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{it.label}</DialogTitle>
            </DialogHeader>
            {it.key === "dashboard" && (
              <div className="max-h-[80vh] overflow-y-auto pr-4">
                <Dashboard
                  employees={employees}
                  weekStartISO={weekStartISO}
                />
              </div>
            )}
            {it.key === "checker" && (
              <div className="grid gap-2">
                <p className="text-xs text-muted-foreground">
                  Checks each day’s positions against required staffing using
                  Labor Standards and Forecast covers (breakfast+lunch).
                </p>
                <ScheduleChecker
                  employees={employees}
                  weekStartISO={weekStartISO}
                />
              </div>
            )}
            {it.key === "legal" && (
              <div className="grid gap-3 text-sm">
                <p className="text-xs text-muted-foreground">
                  Schedule Checker configuration: these standards drive warnings
                  for overtime, rest periods, and predictability pay.
                </p>
                <Section title="Predictive Scheduling">
                  <label className="inline-flex items-center gap-2">
                    Notice days
                    <Input
                      type="number"
                      value={c.predictiveNoticeDays}
                      onChange={(e) =>
                        setC({
                          ...c,
                          predictiveNoticeDays: Number(e.target.value),
                        })
                      }
                    />
                  </label>
                </Section>
                <Section title="Rest & Overtime">
                  <label className="inline-flex items-center gap-2">
                    Rest period (hours)
                    <Input
                      type="number"
                      value={c.restPeriodHours}
                      onChange={(e) =>
                        setC({ ...c, restPeriodHours: Number(e.target.value) })
                      }
                    />
                  </label>
                  <label className="inline-flex items-center gap-2">
                    Max consecutive days
                    <Input
                      type="number"
                      value={c.maxConsecutiveDays}
                      onChange={(e) =>
                        setC({
                          ...c,
                          maxConsecutiveDays: Number(e.target.value),
                        })
                      }
                    />
                  </label>
                  <label className="inline-flex items-center gap-2">
                    Weekly OT threshold (h)
                    <Input
                      type="number"
                      value={s.overtimeThreshold}
                      onChange={(e) =>
                        setS({
                          ...s,
                          overtimeThreshold: Number(e.target.value),
                        })
                      }
                    />
                  </label>
                </Section>
                <div className="flex justify-end">
                  <Button
                    onClick={() => {
                      saveComplianceConfig(c);
                      saveSettings(s);
                      setOpen(null);
                    }}
                  >
                    Save
                  </Button>
                </div>
              </div>
            )}
            {it.key === "union" && (
              <div className="text-sm">
                <p className="text-xs text-muted-foreground">
                  Union policies guide scheduling priority and overtime
                  equalization.
                </p>
                <div className="mt-3 grid gap-2">
                  <label className="inline-flex items-center gap-2">
                    <input
                      type="checkbox"
                      onChange={(e) =>
                        localStorage.setItem(
                          "shiftflow:union:seniority",
                          String((e.target as HTMLInputElement).checked),
                        )
                      }
                    />{" "}
                    Enable seniority prioritization
                  </label>
                  <label className="inline-flex items-center gap-2">
                    <input
                      type="checkbox"
                      onChange={(e) =>
                        localStorage.setItem(
                          "shiftflow:union:otEqualize",
                          String((e.target as HTMLInputElement).checked),
                        )
                      }
                    />{" "}
                    Overtime equalization tracking
                  </label>
                </div>
              </div>
            )}
            {it.key === "employee" && (
              <div className="text-sm grid gap-2">
                <p className="text-xs text-muted-foreground">
                  Employee options control self-service features such as swaps
                  and availability.
                </p>
                <label className="inline-flex items-center gap-2">
                  <input
                    type="checkbox"
                    onChange={(e) =>
                      localStorage.setItem(
                        "shiftflow:employee:swap",
                        String((e.target as HTMLInputElement).checked),
                      )
                    }
                  />{" "}
                  Allow shift swaps (with approval)
                </label>
                <label className="inline-flex items-center gap-2">
                  <input
                    type="checkbox"
                    onChange={(e) =>
                      localStorage.setItem(
                        "shiftflow:employee:availability",
                        String((e.target as HTMLInputElement).checked),
                      )
                    }
                  />{" "}
                  Enable availability preferences
                </label>
              </div>
            )}
            {it.key === "analytics" && (
              <div className="text-sm grid gap-2">
                <p className="text-xs text-muted-foreground">
                  Analytics preferences affect forecasting and KPIs.
                </p>
                <label className="inline-flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={analyticsSales}
                    onChange={(e) => setAnalyticsSales(e.target.checked)}
                  />{" "}
                  Integrate sales for demand forecasting
                </label>
                <label className="inline-flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={analyticsSplh}
                    onChange={(e) => setAnalyticsSplh(e.target.checked)}
                  />{" "}
                  Show SPLH metrics
                </label>
              </div>
            )}
            {it.key === "financial" && (
              <div className="grid gap-2 text-sm">
                <p className="text-xs text-muted-foreground">
                  Financial targets inform budget warnings and labor percentage.
                </p>
                <label className="inline-flex items-center gap-2">
                  Weekly budget ($)
                  <Input
                    type="number"
                    value={s.weeklyBudget}
                    onChange={(e) =>
                      setS({ ...s, weeklyBudget: Number(e.target.value) })
                    }
                  />
                </label>
                <label className="inline-flex items-center gap-2">
                  Weekly sales ($)
                  <Input
                    type="number"
                    value={s.weeklySales}
                    onChange={(e) =>
                      setS({ ...s, weeklySales: Number(e.target.value) })
                    }
                  />
                </label>
                <div className="flex justify-end">
                  <Button
                    onClick={() => {
                      saveSettings(s);
                      setOpen(null);
                    }}
                  >
                    Save
                  </Button>
                </div>
              </div>
            )}
            {it.key === "timeoff" && (
              <div className="text-sm grid gap-2">
                <p className="text-xs text-muted-foreground">
                  Time off settings control PTO accrual and scheduling
                  restrictions.
                </p>
                <label className="inline-flex items-center gap-2">
                  PTO accrual (hrs/pay period)
                  <Input
                    type="number"
                    onChange={(e) =>
                      localStorage.setItem(
                        "shiftflow:pto:accrual",
                        (e.target as HTMLInputElement).value,
                      )
                    }
                  />
                </label>
                <label className="inline-flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={ptoBlackout}
                    onChange={(e) => setPtoBlackout(e.target.checked)}
                  />{" "}
                  Enable blackout dates
                </label>
              </div>
            )}
            {it.key === "attendance" && (
              <div className="text-sm grid gap-2">
                <p className="text-xs text-muted-foreground">
                  Attendance rules apply to the time tracker and compliance
                  reporting.
                </p>
                <label className="inline-flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={attGeo}
                    onChange={(e) => setAttGeo(e.target.checked)}
                  />{" "}
                  Require geofence on clock-in
                </label>
                <label className="inline-flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={attRealtime}
                    onChange={(e) => setAttRealtime(e.target.checked)}
                  />{" "}
                  Real-time monitoring
                </label>
              </div>
            )}
            {it.key === "reliability" && (
              <div className="text-sm grid gap-2">
                <p className="text-xs text-muted-foreground">
                  Reliability controls how the app syncs changes and enforces
                  access. Instant updates enables live synchronization;
                  Permissions enforces role-based access checks.
                </p>
                <label className="inline-flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={sysRealtime}
                    onChange={(e) => setSysRealtime(e.target.checked)}
                  />{" "}
                  Instant updates
                </label>
                <label className="inline-flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={sysPerms}
                    onChange={(e) => setSysPerms(e.target.checked)}
                  />{" "}
                  Enforce role-based permissions
                </label>
              </div>
            )}
            {it.key === "ratings" && (
              <div className="max-h-[80vh] overflow-y-auto pr-4">
                <StaffRatingsPanel employees={employees} />
              </div>
            )}
          </DialogContent>
        </Dialog>
      ))}
    </>
  );
}
