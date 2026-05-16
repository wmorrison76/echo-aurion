/**
 * Schedule API endpoint
 * Handles fetching shift data for a given outlet, department, and week
 */
import { Router, Request, Response } from "express";

const router = Router();

// Mock shift data - in production this would come from a database
const generateMockShifts = (
  outlet_id: string,
  dept_id: string,
  week_start: string,
) => {
  const startDate = new Date(week_start);
  const shifts = [];

  // Generate sample shifts for the week
  const employees = [
    { id: "emp1", name: "Alex Johnson", rate: 15 },
    { id: "emp2", name: "Jordan Smith", rate: 16 },
    { id: "emp3", name: "Casey Williams", rate: 14 },
  ];

  for (let dayOffset = 0; dayOffset < 7; dayOffset++) {
    const dayDate = new Date(startDate);
    dayDate.setDate(dayDate.getDate() + dayOffset);

    // Skip weekends for simplicity
    if (dayDate.getDay() === 0 || dayDate.getDay() === 6) continue;

    // Create shifts for some employees
    for (let i = 0; i < Math.min(2, employees.length); i++) {
      const emp = employees[i];
      const startHour = 9 + i; // 9am, 10am, etc.
      const endHour = startHour + 8; // 8 hour shifts

      const startsAt = new Date(dayDate);
      startsAt.setHours(startHour, 0, 0);

      const endsAt = new Date(dayDate);
      endsAt.setHours(endHour, 0, 0);

      shifts.push({
        id: `shift-${emp.id}-${dayOffset}-${i}`,
        employee_id: emp.id,
        employee_name: emp.name,
        starts_at: startsAt.toISOString(),
        ends_at: endsAt.toISOString(),
        break_min: 30,
        hourly_rate: emp.rate,
        tips_declared: Math.random() * 50,
      });
    }
  }

  return shifts;
};

/**
 * GET /api/schedule/get
 * Fetch saved schedule for a specific outlet and week
 * Query params:
 *   - outlet: string
 *   - weekStartISO: string (ISO date format: YYYY-MM-DD)
 */
router.get("/get", (req: Request, res: Response) => {
  try {
    const { outlet, weekStartISO } = req.query;

    // Validate required parameters
    if (!outlet || !weekStartISO) {
      return res.status(400).json({
        error: "Missing required parameters: outlet, weekStartISO",
      });
    }

    // In production, fetch from database
    // For now, return null to indicate no saved schedule yet
    // Client will use local state as fallback
    res.json({
      record: null,
    });
  } catch (error) {
    console.error("Schedule fetch error:", error);
    res.status(500).json({
      error: "Failed to fetch schedule",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

/**
 * GET /api/schedule (Legacy - for backward compatibility)
 * Query params:
 *   - outlet_id: string
 *   - dept_id: string
 *   - week_start: string (ISO date format: YYYY-MM-DD)
 */
router.get("/", (req: Request, res: Response) => {
  try {
    const { outlet_id, dept_id, week_start } = req.query;

    // Validate required parameters
    if (!outlet_id || !dept_id || !week_start) {
      return res.status(400).json({
        error: "Missing required parameters: outlet_id, dept_id, week_start",
      });
    }

    // Generate mock shifts based on parameters
    const shifts = generateMockShifts(
      outlet_id as string,
      dept_id as string,
      week_start as string,
    );

    // Return shifts as JSON array
    res.json(shifts);
  } catch (error) {
    console.error("Schedule fetch error:", error);
    res.status(500).json({
      error: "Failed to fetch schedule",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

/**
 * POST /api/schedule/upsert
 * Save schedule state for a specific outlet and week
 * Body: { outlet, weekStartISO, data }
 * where data is the complete ScheduleState from the Schedule module
 */
router.post("/upsert", (req: Request, res: Response) => {
  try {
    const { outlet, weekStartISO, data } = req.body;

    // Validate required fields
    if (!outlet || !weekStartISO || data === undefined) {
      return res.status(400).json({
        error: "Missing required fields: outlet, weekStartISO, data",
      });
    }

    // In production, save to database
    // For now, acknowledge the save (client uses localStorage as primary storage)
    console.log(`[Schedule] Saved schedule for outlet=${outlet}, week=${weekStartISO}`);
    console.log(`[Schedule] State contains ${data?.employees?.length || 0} employees`);

    res.json({
      success: true,
      outlet,
      weekStartISO,
      message: `Schedule saved for ${outlet} starting ${weekStartISO}`,
    });
  } catch (error) {
    console.error("Schedule upsert error:", error);
    res.status(500).json({
      error: "Failed to save schedule",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

/**
 * GET /api/payroll/weekly_totals
 * Get payroll totals for a week
 * Query params:
 *   - outlet_id: string
 *   - week_start: string (ISO date format: YYYY-MM-DD)
 */
router.get("/payroll/weekly_totals", (req: Request, res: Response) => {
  try {
    const { outlet_id, week_start } = req.query;

    if (!outlet_id || !week_start) {
      return res.status(400).json({
        error: "Missing required parameters: outlet_id, week_start",
      });
    }

    // Generate mock payroll data
    const shifts = generateMockShifts(outlet_id as string, "kitchen", week_start as string);

    const totals = shifts.reduce(
      (acc, shift) => {
        const hours = (new Date(shift.ends_at).getTime() - new Date(shift.starts_at).getTime()) / (1000 * 60 * 60);
        const wages = hours * shift.hourly_rate;
        return {
          totalHours: acc.totalHours + hours,
          totalWages: acc.totalWages + wages,
          totalTips: acc.totalTips + shift.tips_declared,
          employeeCount: acc.employeeCount + 1,
        };
      },
      { totalHours: 0, totalWages: 0, totalTips: 0, employeeCount: 0 },
    );

    res.json({
      outlet_id,
      week_start,
      ...totals,
      totalCost: totals.totalWages + totals.totalTips,
    });
  } catch (error) {
    console.error("Payroll calculation error:", error);
    res.status(500).json({
      error: "Failed to calculate payroll totals",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

/**
 * POST /api/payroll/weekly_totals
 * Alternative POST endpoint for getting payroll totals
 */
router.post("/payroll/weekly_totals", (req: Request, res: Response) => {
  try {
    const { outlet_id, week_start } = req.body;

    if (!outlet_id || !week_start) {
      return res.status(400).json({
        error: "Missing required parameters: outlet_id, week_start",
      });
    }

    // Generate mock payroll data
    const shifts = generateMockShifts(outlet_id, "kitchen", week_start);

    const totals = shifts.reduce(
      (acc, shift) => {
        const hours = (new Date(shift.ends_at).getTime() - new Date(shift.starts_at).getTime()) / (1000 * 60 * 60);
        const wages = hours * shift.hourly_rate;
        return {
          totalHours: acc.totalHours + hours,
          totalWages: acc.totalWages + wages,
          totalTips: acc.totalTips + shift.tips_declared,
          employeeCount: acc.employeeCount + 1,
        };
      },
      { totalHours: 0, totalWages: 0, totalTips: 0, employeeCount: 0 },
    );

    res.json({
      outlet_id,
      week_start,
      ...totals,
      totalCost: totals.totalWages + totals.totalTips,
    });
  } catch (error) {
    console.error("Payroll calculation error:", error);
    res.status(500).json({
      error: "Failed to calculate payroll totals",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

export default router;
