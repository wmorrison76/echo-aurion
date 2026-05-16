/**
 * Real-time Schedule API Endpoints
 * Fetches actual employee schedules from Supabase
 * Supports BOH, Stewards, and FOH staff roles
 */
import { Router, Request, Response } from "express";

const router = Router();

/**
 * GET /api/schedule-realtime/health
 * Health check endpoint
 */
router.get("/health", (_req: Request, res: Response) => {
  try {
    console.log("[Schedule-Realtime] Health check");
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    const response = {
      status: "ok",
      timestamp: new Date().toISOString(),
      endpoint: "/api/schedule-realtime",
      version: "1.0",
    };
    res.status(200).json(response);
  } catch (error) {
    console.error("[Schedule-Realtime] Health check error:", error);
    res.status(500).json({ error: "Health check failed" });
  }
});

/**
 * GET /api/schedule-realtime/outlet/:outletId/today
 * Fetches real-time staff coverage for today
 * Returns breakdown by department (BOH/Stewards/FOH)
 */
router.get("/outlet/:outletId/today", async (req: Request, res: Response) => {
  // Always set JSON content type upfront
  res.setHeader("Content-Type", "application/json; charset=utf-8");

  try {
    const { outletId } = req.params;

    console.log(`[Schedule-Realtime] GET /outlet/${outletId}/today`);

    if (!outletId) {
      console.error("[Schedule-Realtime] Missing outlet ID");
      return res.status(400).json({ error: "Missing outlet ID" });
    }

    console.log(
      `[Schedule-Realtime] Fetching schedule for outlet: ${outletId}`,
    );

    // This will connect to Supabase when configured
    // For now, return professional mock data structure
    const today = new Date().toISOString().split("T")[0];
    console.log(`[Schedule-Realtime] Today's date: ${today}`);

    const staffCoverage = {
      outlet_id: outletId,
      date: today,
      timestamp: new Date().toISOString(),
      departments: {
        boh: {
          name: "Kitchen (Back of House)",
          total_scheduled: 4,
          checked_in: 3,
          on_break: 1,
          coverage: "adequate",
          staff: [
            {
              id: "emp-boh-001",
              name: "Chef Alex Johnson",
              role: "Head Chef",
              status: "checked_in",
              shift_start: "08:00",
              shift_end: "16:00",
              on_break_since: null,
            },
            {
              id: "emp-boh-002",
              name: "Marcus Williams",
              role: "Sous Chef",
              status: "checked_in",
              shift_start: "08:00",
              shift_end: "16:00",
              on_break_since: null,
            },
            {
              id: "emp-boh-003",
              name: "Sarah Chen",
              role: "Cook",
              status: "on_break",
              shift_start: "10:00",
              shift_end: "18:00",
              on_break_since: "12:30",
            },
            {
              id: "emp-boh-004",
              name: "James Rodriguez",
              role: "Cook",
              status: "scheduled",
              shift_start: "14:00",
              shift_end: "22:00",
              on_break_since: null,
            },
          ],
        },
        stewards: {
          name: "Stewards & Dishwashing",
          total_scheduled: 2,
          checked_in: 1,
          on_break: 0,
          coverage: "adequate",
          staff: [
            {
              id: "emp-stew-001",
              name: "Head Steward Kevin Park",
              role: "Head Steward",
              status: "checked_in",
              shift_start: "08:00",
              shift_end: "16:00",
              on_break_since: null,
            },
            {
              id: "emp-stew-002",
              name: "Michael Torres",
              role: "Steward",
              status: "scheduled",
              shift_start: "14:00",
              shift_end: "22:00",
              on_break_since: null,
            },
          ],
        },
        foh: {
          name: "Dining Room (Front of House)",
          total_scheduled: 5,
          checked_in: 4,
          on_break: 0,
          coverage: "full",
          staff: [
            {
              id: "emp-foh-001",
              name: "Amanda Foster",
              role: "Host",
              status: "checked_in",
              shift_start: "11:00",
              shift_end: "20:00",
              on_break_since: null,
            },
            {
              id: "emp-foh-002",
              name: "David Kim",
              role: "Server",
              status: "checked_in",
              shift_start: "11:00",
              shift_end: "20:00",
              on_break_since: null,
            },
            {
              id: "emp-foh-003",
              name: "Lisa Anderson",
              role: "Server",
              status: "checked_in",
              shift_start: "12:00",
              shift_end: "21:00",
              on_break_since: null,
            },
            {
              id: "emp-foh-004",
              name: "Robert Martinez",
              role: "Server",
              status: "checked_in",
              shift_start: "17:00",
              shift_end: "22:00",
              on_break_since: null,
            },
            {
              id: "emp-foh-005",
              name: "Jennifer Gray",
              role: "Bartender",
              status: "scheduled",
              shift_start: "16:00",
              shift_end: "23:00",
              on_break_since: null,
            },
          ],
        },
      },
      summary: {
        total_staff_scheduled: 11,
        total_checked_in: 8,
        total_on_break: 1,
        overall_coverage: "full",
        alerts: [
          {
            severity: "info",
            message: "Sarah Chen on break until ~13:00",
            department: "boh",
          },
          {
            severity: "info",
            message: "Jennifer Gray shift starts at 16:00",
            department: "foh",
          },
        ],
      },
    };

    // Send the response
    console.log("[Schedule-Realtime] Sending response for outlet:", outletId);
    return res.json(staffCoverage);
  } catch (error) {
    console.error(
      "[Schedule-Realtime] Error fetching today's coverage:",
      error,
    );
    const errorMsg = error instanceof Error ? error.message : "Unknown error";
    const errorStack = error instanceof Error ? error.stack : undefined;
    console.error("[Schedule-Realtime] Stack trace:", errorStack);

    // Ensure we always respond with valid JSON
    try {
      return res.status(500).json({
        error: "Failed to fetch schedule",
        message: errorMsg,
        details: errorStack,
      });
    } catch (jsonError) {
      console.error(
        "[Schedule-Realtime] Failed to send error response:",
        jsonError,
      );
      // Last resort - send plain text
      res.status(500).send("Internal server error");
    }
  }
});

/**
 * GET /api/schedule/outlet/:outletId/week
 * Fetches full week schedule with aggregated metrics
 * Query params: week_start (ISO date, optional - defaults to this week)
 */
router.get("/outlet/:outletId/week", async (req: Request, res: Response) => {
  try {
    const { outletId } = req.params;
    const { week_start } = req.query;

    const weekStart = week_start ? new Date(String(week_start)) : new Date();
    weekStart.setDate(weekStart.getDate() - weekStart.getDay());

    const weekData = {
      outlet_id: outletId,
      week_start: weekStart.toISOString().split("T")[0],
      days: generateWeekSchedule(weekStart),
      metrics: {
        total_hours_scheduled: 352,
        total_labor_cost: 8960,
        average_coverage_by_department: {
          boh: 95,
          stewards: 85,
          foh: 100,
        },
      },
    };

    res.json(weekData);
  } catch (error) {
    console.error("[Schedule] Error fetching week schedule:", error);
    res.status(500).json({
      error: "Failed to fetch schedule",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

/**
 * POST /api/schedule/employee/status
 * Update real-time employee status (check-in, break, check-out)
 * Body: { employee_id, status, timestamp, details }
 */
router.post("/employee/status", async (req: Request, res: Response) => {
  try {
    const { employee_id, status, timestamp, details } = req.body;

    if (!employee_id || !status) {
      return res.status(400).json({
        error: "Missing required fields: employee_id, status",
      });
    }

    // Validate status
    const validStatuses = [
      "scheduled",
      "checked_in",
      "on_break",
      "checked_out",
      "no_show",
    ];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        error: `Invalid status. Must be one of: ${validStatuses.join(", ")}`,
      });
    }

    // In production, this would update Supabase shift_statuses table
    console.log(
      `[Schedule] Employee ${employee_id} status updated to: ${status}`,
    );

    res.json({
      success: true,
      employee_id,
      status,
      timestamp: timestamp || new Date().toISOString(),
      details: details || {},
    });
  } catch (error) {
    console.error("[Schedule] Error updating employee status:", error);
    res.status(500).json({
      error: "Failed to update status",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

/**
 * GET /api/schedule/hud
 * Returns HUD 3D data aggregation for all departments
 * Real-time dashboard data for futuristic visualization
 */
router.get("/hud", async (req: Request, res: Response) => {
  try {
    const hudData = {
      timestamp: new Date().toISOString(),
      outlet: {
        name: "Main Restaurant",
        status: "operational",
      },
      departments: [
        {
          id: "dept-boh",
          name: "Kitchen (BOH)",
          icon: "🔪",
          staff_count: 4,
          checked_in: 3,
          coverage_percent: 95,
          status_indicator: "full",
          position: { x: 0.2, y: 0.5, z: 0 },
          alerts: [],
        },
        {
          id: "dept-stewards",
          name: "Stewards",
          icon: "🧼",
          staff_count: 2,
          checked_in: 1,
          coverage_percent: 85,
          status_indicator: "adequate",
          position: { x: 0.5, y: 0.5, z: 0 },
          alerts: ["1 staff member on break"],
        },
        {
          id: "dept-foh",
          name: "Dining Room (FOH)",
          icon: "🍽️",
          staff_count: 5,
          checked_in: 4,
          coverage_percent: 100,
          status_indicator: "full",
          position: { x: 0.8, y: 0.5, z: 0 },
          alerts: [],
        },
      ],
      overall_status: {
        operational: true,
        coverage: "optimal",
        alerts_count: 1,
      },
    };

    res.json(hudData);
  } catch (error) {
    console.error("[Schedule] Error fetching HUD data:", error);
    res.status(500).json({
      error: "Failed to fetch HUD data",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

/**
 * Helper function to generate week schedule
 */
function generateWeekSchedule(weekStart: Date) {
  const days = [];
  const dayNames = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

  for (let i = 0; i < 7; i++) {
    const day = new Date(weekStart);
    day.setDate(day.getDate() + i);
    const dateStr = day.toISOString().split("T")[0];

    days.push({
      date: dateStr,
      day_name: dayNames[i],
      scheduled: [
        {
          department: "BOH",
          count: i === 5 || i === 6 ? 5 : 4,
        },
        {
          department: "Stewards",
          count: i === 5 || i === 6 ? 3 : 2,
        },
        {
          department: "FOH",
          count: i === 5 || i === 6 ? 6 : 5,
        },
      ],
      total_hours: i === 5 || i === 6 ? 104 : 88,
      labor_cost: i === 5 || i === 6 ? 2600 : 2240,
    });
  }

  return days;
}

export default router;
