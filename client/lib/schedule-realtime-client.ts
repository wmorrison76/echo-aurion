/**
 * Schedule Real-time Client
 * Client-side integration for fetching and updating schedule data from Supabase
 */

export interface ScheduleDataResponse {
  outlet_id: string;
  date: string;
  timestamp: string;
  departments: {
    boh: DepartmentData;
    stewards: DepartmentData;
    foh: DepartmentData;
  };
  summary: ScheduleSummary;
}

export interface DepartmentData {
  name: string;
  total_scheduled: number;
  checked_in: number;
  on_break: number;
  coverage: "full" | "adequate" | "short";
  staff: StaffMember[];
}

export interface StaffMember {
  id: string;
  name: string;
  role: string;
  status: "checked_in" | "on_break" | "scheduled" | "checked_out";
  shift_start: string;
  shift_end: string;
  on_break_since: string | null;
}

export interface ScheduleSummary {
  total_staff_scheduled: number;
  total_checked_in: number;
  total_on_break: number;
  overall_coverage: "full" | "adequate" | "short";
  alerts: Alert[];
}

export interface Alert {
  severity: "info" | "warning" | "error";
  message: string;
  department: string;
}

export interface HUDDataResponse {
  timestamp: string;
  outlet: {
    name: string;
    status: "operational" | "closed" | "maintenance";
  };
  departments: HUDDepartment[];
  overall_status: {
    operational: boolean;
    coverage: "optimal" | "adequate" | "critical";
    alerts_count: number;
  };
}

export interface HUDDepartment {
  id: string;
  name: string;
  icon: string;
  staff_count: number;
  checked_in: number;
  coverage_percent: number;
  status_indicator: "full" | "adequate" | "short";
  position: { x: number; y: number; z: number };
  alerts: string[];
}

export interface EmployeeStatusUpdate {
  employee_id: string;
  status: "scheduled" | "checked_in" | "on_break" | "checked_out" | "no_show";
  timestamp?: string;
  details?: Record<string, any>;
}

export interface WeekScheduleResponse {
  outlet_id: string;
  week_start: string;
  days: DaySchedule[];
  metrics: {
    total_hours_scheduled: number;
    total_labor_cost: number;
    average_coverage_by_department: {
      boh: number;
      stewards: number;
      foh: number;
    };
  };
}

export interface DaySchedule {
  date: string;
  day_name: string;
  scheduled: Array<{
    department: string;
    count: number;
  }>;
  total_hours: number;
  labor_cost: number;
}

/**
 * Fetch today's staff coverage from the API
 */
export async function fetchTodaySchedule(outletId: string = "main"): Promise<ScheduleDataResponse> {
  try {
    const response = await fetch(`/api/schedule-realtime/outlet/${outletId}/today`);

    if (!response.ok) {
      throw new Error(
        `Failed to fetch schedule: ${response.status} ${response.statusText}`
      );
    }

    return await response.json();
  } catch (error) {
    console.error("[ScheduleClient] Error fetching today's schedule:", error);
    throw error;
  }
}

/**
 * Fetch week's schedule with aggregated metrics
 */
export async function fetchWeekSchedule(
  outletId: string = "main",
  weekStart?: string
): Promise<WeekScheduleResponse> {
  try {
    const params = new URLSearchParams();
    if (weekStart) {
      params.append("week_start", weekStart);
    }

    const response = await fetch(
      `/api/schedule-realtime/outlet/${outletId}/week?${params}`
    );

    if (!response.ok) {
      throw new Error(`Failed to fetch week schedule: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error("[ScheduleClient] Error fetching week schedule:", error);
    throw error;
  }
}

/**
 * Fetch HUD data for 3D visualization
 */
export async function fetchHUDData(): Promise<HUDDataResponse> {
  try {
    const response = await fetch("/api/schedule-realtime/hud");

    if (!response.ok) {
      throw new Error(`Failed to fetch HUD data: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error("[ScheduleClient] Error fetching HUD data:", error);
    throw error;
  }
}

/**
 * Update employee status (check-in, break, check-out, etc.)
 */
export async function updateEmployeeStatus(
  update: EmployeeStatusUpdate
): Promise<{ success: boolean; employee_id: string; status: string }> {
  try {
    const response = await fetch("/api/schedule-realtime/employee/status", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        ...update,
        timestamp: update.timestamp || new Date().toISOString(),
      }),
    });

    if (!response.ok) {
      throw new Error(`Failed to update status: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error("[ScheduleClient] Error updating employee status:", error);
    throw error;
  }
}

/**
 * Helper function to get department by category
 */
export function getDepartmentByCategory(
  schedule: ScheduleDataResponse,
  category: "BOH" | "Stewards" | "FOH"
): DepartmentData | null {
  const departments = schedule.departments;

  switch (category) {
    case "BOH":
      return departments.boh;
    case "Stewards":
      return departments.stewards;
    case "FOH":
      return departments.foh;
  }
}

/**
 * Get checked-in staff for a department
 */
export function getCheckedInStaff(department: DepartmentData): StaffMember[] {
  return department.staff.filter((s) => s.status === "checked_in");
}

/**
 * Get staff on break
 */
export function getStaffOnBreak(department: DepartmentData): StaffMember[] {
  return department.staff.filter((s) => s.status === "on_break");
}

/**
 * Get scheduled but not checked in
 */
export function getScheduledStaff(department: DepartmentData): StaffMember[] {
  return department.staff.filter((s) => s.status === "scheduled");
}

/**
 * Calculate coverage percentage
 */
export function calculateCoverage(
  checkedIn: number,
  scheduled: number
): number {
  if (scheduled === 0) return 0;
  return Math.round((checkedIn / scheduled) * 100);
}

/**
 * Get coverage status label
 */
export function getCoverageStatus(
  coverage: "full" | "adequate" | "short"
): string {
  switch (coverage) {
    case "full":
      return "✓ Full Coverage";
    case "adequate":
      return "≈ Adequate";
    case "short":
      return "⚠ Short Staffed";
  }
}

/**
 * Format timestamp for display
 */
export function formatTimestamp(timestamp: string): string {
  return new Date(timestamp).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
}

/**
 * Subscribe to real-time updates (polling implementation)
 * For production, use Supabase Realtime subscriptions
 */
export function subscribeToScheduleUpdates(
  outletId: string,
  onUpdate: (schedule: ScheduleDataResponse) => void,
  intervalMs: number = 30000
): () => void {
  const interval = setInterval(async () => {
    try {
      const schedule = await fetchTodaySchedule(outletId);
      onUpdate(schedule);
    } catch (error) {
      console.error("[ScheduleClient] Error in subscription:", error);
    }
  }, intervalMs);

  // Return unsubscribe function
  return () => clearInterval(interval);
}
