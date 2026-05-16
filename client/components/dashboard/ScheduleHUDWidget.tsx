/**
 * Schedule HUD Widget
 * Professional futuristic dashboard showing real-time staff coverage
 * Displays BOH, Stewards, and FOH departments with live status
 */
import React, { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/glass";
import { MiniPanelManager } from "@/lib/mini-panel-storage";
import {
  AlertCircle,
  CheckCircle,
  AlertTriangle,
  Clock,
  Users,
} from "lucide-react";

interface StaffMember {
  id: string;
  name: string;
  role: string;
  status: "checked_in" | "on_break" | "scheduled" | "checked_out";
  shift_start: string;
  shift_end: string;
  on_break_since: string | null;
}

interface DepartmentData {
  name: string;
  total_scheduled: number;
  checked_in: number;
  on_break: number;
  coverage: "full" | "adequate" | "short";
  staff: StaffMember[];
}

interface ScheduleData {
  outlet_id: string;
  date: string;
  timestamp: string;
  departments: {
    boh: DepartmentData;
    stewards: DepartmentData;
    foh: DepartmentData;
  };
  summary: {
    total_staff_scheduled: number;
    total_checked_in: number;
    total_on_break: number;
    overall_coverage: "full" | "adequate" | "short";
    alerts: Array<{
      severity: "info" | "warning" | "error";
      message: string;
      department: string;
    }>;
  };
}

export function ScheduleHUDContent() {
  const [scheduleData, setScheduleData] = useState<ScheduleData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadScheduleData = () => {
      try {
        setLoading(true);

        // Read from actual Schedule module localStorage
        const scheduleKey = "shiftflow:schedule:Main";
        const scheduleStr = localStorage.getItem(scheduleKey);

        if (!scheduleStr) {
          // No schedule data yet
          setScheduleData({
            outlet_id: "main",
            date: new Date().toISOString().split("T")[0],
            timestamp: new Date().toISOString(),
            departments: {
              boh: {
                name: "Kitchen",
                total_scheduled: 0,
                checked_in: 0,
                on_break: 0,
                coverage: "short",
                staff: [],
              },
              stewards: {
                name: "Stewards",
                total_scheduled: 0,
                checked_in: 0,
                on_break: 0,
                coverage: "short",
                staff: [],
              },
              foh: {
                name: "Front of House",
                total_scheduled: 0,
                checked_in: 0,
                on_break: 0,
                coverage: "short",
                staff: [],
              },
            },
            summary: {
              total_staff_scheduled: 0,
              total_checked_in: 0,
              total_on_break: 0,
              overall_coverage: "short",
              alerts: [
                {
                  severity: "info",
                  message: "No schedule data loaded",
                  department: "",
                },
              ],
            },
          });
          return;
        }

        const scheduleData = JSON.parse(scheduleStr);
        const employees = scheduleData.employees || [];

        // Get today's day key
        const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
        const today = days[new Date().getDay()];

        // Count employees scheduled for today
        let scheduledCount = 0;
        employees.forEach((emp: any) => {
          const shift = emp.shifts?.[today];
          if (shift && (shift.value || shift.in || shift.out)) {
            scheduledCount++;
          }
        });

        // Build real schedule data from Schedule module
        setScheduleData({
          outlet_id: "main",
          date: new Date().toISOString().split("T")[0],
          timestamp: new Date().toISOString(),
          departments: {
            boh: {
              name: "Kitchen (Back of House)",
              total_scheduled: scheduledCount,
              checked_in: 0,
              on_break: 0,
              coverage: scheduledCount === 0 ? "short" : "adequate",
              staff: [],
            },
            stewards: {
              name: "Stewards",
              total_scheduled: 0,
              checked_in: 0,
              on_break: 0,
              coverage: "short",
              staff: [],
            },
            foh: {
              name: "Front of House",
              total_scheduled: scheduledCount,
              checked_in: 0,
              on_break: 0,
              coverage: scheduledCount === 0 ? "short" : "adequate",
              staff: [],
            },
          },
          summary: {
            total_staff_scheduled: scheduledCount,
            total_checked_in: 0,
            total_on_break: 0,
            overall_coverage: scheduledCount === 0 ? "short" : "adequate",
            alerts:
              scheduledCount === 0
                ? [
                    {
                      severity: "warning",
                      message: "No staff scheduled for today",
                      department: "",
                    },
                  ]
                : [],
          },
        });
      } catch (error) {
        console.error("[ScheduleHUD] Error loading data:", error);
        setError("Failed to load schedule data");
      } finally {
        setLoading(false);
      }
    };

    loadScheduleData();

    // Listen for Schedule module updates
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key?.includes("shiftflow:schedule")) {
        loadScheduleData();
      }
    };

    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, []);

  const getCoverageColor = (coverage: "full" | "adequate" | "short") => {
    switch (coverage) {
      case "full":
        return "bg-emerald-500/20 border-emerald-500/50 text-emerald-400";
      case "adequate":
        return "bg-amber-500/20 border-amber-500/50 text-amber-400";
      case "short":
        return "bg-red-500/20 border-red-500/50 text-red-400";
    }
  };

  const getCoverageIcon = (coverage: "full" | "adequate" | "short") => {
    switch (coverage) {
      case "full":
        return <CheckCircle className="w-5 h-5" />;
      case "adequate":
        return <AlertTriangle className="w-5 h-5" />;
      case "short":
        return <AlertCircle className="w-5 h-5" />;
    }
  };

  const getCoverageLabel = (coverage: "full" | "adequate" | "short") => {
    switch (coverage) {
      case "full":
        return "✓ Full Coverage";
      case "adequate":
        return "≈ Adequate";
      case "short":
        return "⚠ Short Staffed";
    }
  };

  if (loading) {
    return (
      <Card className="border-cyan-400/30 bg-gradient-to-br from-background/80 to-background/40 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="text-lg font-bold text-cyan-300">
            Schedule Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-cyan-400/10 rounded w-3/4"></div>
            <div className="h-4 bg-cyan-400/10 rounded w-1/2"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="border-red-400/30 bg-gradient-to-br from-background/80 to-background/40 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="text-lg font-bold text-red-300">
            Schedule Error
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-red-400">{error}</p>
        </CardContent>
      </Card>
    );
  }

  if (!scheduleData) {
    return null;
  }

  const departments = [
    {
      key: "boh",
      label: "Kitchen (BOH)",
      icon: "🔪",
      data: scheduleData.departments.boh,
    },
    {
      key: "stewards",
      label: "Stewards",
      icon: "🧼",
      data: scheduleData.departments.stewards,
    },
    {
      key: "foh",
      label: "Dining Room (FOH)",
      icon: "🍽️",
      data: scheduleData.departments.foh,
    },
  ];

  return (
    <div className="space-y-4">
      {/* Main Summary Card */}
      <Card className="border-cyan-400/30 bg-gradient-to-br from-cyan-500/10 to-background/40 backdrop-blur-sm">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-xl font-bold bg-gradient-to-r from-cyan-300 to-cyan-400 bg-clip-text text-transparent">
                Real-Time Staff Coverage
              </CardTitle>
              <p className="text-xs text-cyan-300/60 mt-1">
                {new Date(scheduleData.timestamp).toLocaleTimeString()}
              </p>
            </div>
            <Badge
              className={cn(
                "px-3 py-1 rounded-full border font-semibold",
                getCoverageColor(scheduleData.summary.overall_coverage),
              )}
            >
              <div className="flex items-center gap-1">
                {getCoverageIcon(scheduleData.summary.overall_coverage)}
                {getCoverageLabel(scheduleData.summary.overall_coverage)}
              </div>
            </Badge>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Summary Stats */}
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-background/60 rounded-lg p-3 border border-cyan-400/20">
              <div className="text-2xl font-bold text-cyan-300">
                {scheduleData.summary.total_checked_in}
              </div>
              <div className="text-xs text-cyan-300/60">Checked In</div>
            </div>
            <div className="bg-background/60 rounded-lg p-3 border border-cyan-400/20">
              <div className="text-2xl font-bold text-amber-300">
                {scheduleData.summary.total_on_break}
              </div>
              <div className="text-xs text-cyan-300/60">On Break</div>
            </div>
            <div className="bg-background/60 rounded-lg p-3 border border-cyan-400/20">
              <div className="text-2xl font-bold text-cyan-300">
                {scheduleData.summary.total_staff_scheduled}
              </div>
              <div className="text-xs text-cyan-300/60">Scheduled</div>
            </div>
          </div>

          {/* Department Cards */}
          <div className="space-y-2">
            {departments.map((dept) => (
              <div
                key={dept.key}
                className={cn(
                  "rounded-lg border p-3 bg-background/40 transition-all hover:bg-background/60",
                  getCoverageColor(dept.data.coverage),
                )}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{dept.icon}</span>
                    <div>
                      <div className="font-semibold text-sm">{dept.label}</div>
                      <div className="text-xs opacity-75">
                        {dept.data.checked_in}/{dept.data.total_scheduled}
                        scheduled
                      </div>
                    </div>
                  </div>
                  <Badge variant="outline" className="text-xs bg-background/60">
                    {getCoverageLabel(dept.data.coverage)}
                  </Badge>
                </div>

                {/* Staff List Preview */}
                <div className="text-xs space-y-1 pl-6">
                  {dept.data.staff.slice(0, 2).map((staff) => (
                    <div
                      key={staff.id}
                      className="flex items-center justify-between opacity-75"
                    >
                      <span>{staff.name}</span>
                      <span className="text-cyan-300/60">
                        {staff.status === "checked_in" && "✓"}
                        {staff.status === "on_break" && "⏸"}
                        {staff.status === "scheduled" && "⏰"}
                      </span>
                    </div>
                  ))}
                  {dept.data.staff.length > 2 && (
                    <div className="text-cyan-300/60 italic">
                      +{dept.data.staff.length - 2} more
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Alerts */}
          {scheduleData.summary.alerts.length > 0 && (
            <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-3 space-y-1">
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle className="w-4 h-4 text-amber-400" />
                <span className="text-sm font-semibold text-amber-300">
                  Alerts
                </span>
              </div>
              {scheduleData.summary.alerts.map((alert, idx) => (
                <div key={idx} className="text-xs text-amber-300/80">
                  • {alert.message}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export function RealTimeStaffCoverageMiniPanel({
  onInitialize,
}: {
  onInitialize?: () => void;
}) {

  return null;
}

export default function ScheduleHUDWidget() {
  return <ScheduleHUDContent />;
}
