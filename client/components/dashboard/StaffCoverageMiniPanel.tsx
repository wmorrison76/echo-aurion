import React, { useEffect } from "react";
import { MiniPanelManager, MiniPanelConfig } from "@/lib/mini-panel-storage";

interface StaffCoverageMiniPanelProps {
  onInitialize?: () => void;
}

export function StaffCoverageMiniPanel({ onInitialize }: StaffCoverageMiniPanelProps) {
  return null;
}

export function StaffCoverageContent() {
  const [staffData, setStaffData] = React.useState<{
    totalScheduled: number;
    withSchedule: number;
    today: string;
  } | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);

  const loadRealScheduleData = React.useCallback(() => {
    try {
      setIsLoading(true);
      // Read the actual Schedule module data from localStorage
      const scheduleKey = `shiftflow:schedule:Main`;
      const scheduleStr = localStorage.getItem(scheduleKey);

      if (!scheduleStr) {
        setStaffData(null);
        setIsLoading(false);
        return;
      }

      const scheduleData = JSON.parse(scheduleStr);
      const employees = scheduleData.employees || [];

      // Get today's day key (Mon, Tue, etc)
      const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
      const today = days[new Date().getDay()];

      // Count employees with shifts scheduled for today
      let withScheduleCount = 0;
      employees.forEach((emp: any) => {
        const shift = emp.shifts?.[today];
        if (shift && (shift.value || shift.in || shift.out)) {
          withScheduleCount++;
        }
      });

      setStaffData({
        totalScheduled: employees.length,
        withSchedule: withScheduleCount,
        today: today,
      });
    } catch (error) {
      console.error("Failed to load schedule data:", error);
      setStaffData(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  React.useEffect(() => {
    loadRealScheduleData();

    // Listen for Schedule module updates
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key?.includes("shiftflow:schedule")) {
        loadRealScheduleData();
      }
    };

    // Also listen for custom events from Schedule module
    const handleScheduleUpdate = () => {
      loadRealScheduleData();
    };

    window.addEventListener("storage", handleStorageChange);
    window.addEventListener("shiftflow:schedule-updated", handleScheduleUpdate);

    return () => {
      window.removeEventListener("storage", handleStorageChange);
      window.removeEventListener(
        "shiftflow:schedule-updated",
        handleScheduleUpdate
      );
    };
  }, [loadRealScheduleData]);

  if (isLoading) {
    return (
      <div className="p-0.5 text-center text-foreground/60">
        <div className="text-xs">Loading...</div>
      </div>
    );
  }

  if (!staffData) {
    return (
      <div className="p-0.5 text-center text-foreground/60">
        <div className="text-xs">No schedule data</div>
      </div>
    );
  }

  const coveragePercentage = staffData.totalScheduled
    ? Math.round((staffData.withSchedule / staffData.totalScheduled) * 100)
    : 0;

  return (
    <div className="p-0.5 space-y-0.5">
      {/* Coverage Overview */}
      <div className="space-y-0">
        <div className="text-xs font-semibold text-foreground/70 leading-none">
          {staffData.today}: {coveragePercentage}%
        </div>

        {/* Coverage Bar */}
        <div className="w-full bg-foreground/10 rounded-full h-1.5 overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-primary to-primary/70 transition-all duration-500"
            style={{ width: `${coveragePercentage}%` }}
          />
        </div>

        {/* Main Stats - Compact */}
        <div className="flex items-center justify-between gap-1 text-xs">
          <span className="font-bold text-primary">
            {staffData.withSchedule}/{staffData.totalScheduled}
          </span>
          <span className="text-foreground/60 text-xs">
            {staffData.totalScheduled - staffData.withSchedule} open
          </span>
        </div>
      </div>

      {/* Quick Action */}
      <button
        onClick={() => {
          window.dispatchEvent(
            new CustomEvent("open-panel", {
              detail: { id: "schedule" },
            })
          );
        }}
        className="w-full px-1.5 py-0.5 rounded text-xs bg-primary/20 text-primary hover:bg-primary/30 transition-colors font-medium"
      >
        Schedule
      </button>
    </div>
  );
}
