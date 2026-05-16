import { Router, Request, Response } from "express";
import {
  hrPayrollManager,
  Employee,
  BenefitPlan,
  TrainingProgram,
} from "../../cognition/phases/phase-9-hr-payroll";
import { requireRole } from "../middleware/auth";
import { validateOrgContext } from "../middleware/org-context";

const router = Router();

router.use(validateOrgContext);

/**
 * Get Employees
 * GET /api/hr/employees?outletId=outlet-1
 */
router.get("/employees", async (req: Request, res: Response) => {
  try {
    const outletId = req.query.outletId as string | undefined;
    const employees = await hrPayrollManager.getEmployees(outletId);
    res.json(employees);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch employees" });
  }
});

/**
 * Get Employee by ID
 * GET /api/hr/employees/:employeeId
 */
router.get("/employees/:employeeId", async (req: Request, res: Response) => {
  try {
    const { employeeId } = req.params;
    const employee = await hrPayrollManager.getEmployee(employeeId);
    if (!employee) {
      return res.status(404).json({ error: "Employee not found" });
    }
    res.json(employee);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch employee" });
  }
});

/**
 * Create Employee
 * POST /api/hr/employees
 */
router.post(
  "/employees",
  requireRole("hr", "manager", "admin"),
  async (req: Request, res: Response) => {
    try {
      const employeeData = req.body as Omit<Employee, "id">;
      const employeeId = await hrPayrollManager.createEmployee(employeeData);
      res.status(201).json({ employeeId, message: "Employee created" });
    } catch (error) {
      res.status(400).json({ error: "Failed to create employee" });
    }
  },
);

/**
 * Record Time Entry
 * POST /api/hr/time-entries
 */
router.post("/time-entries", async (req: Request, res: Response) => {
  try {
    const { employeeId, clockIn, breakMinutes } = req.body;
    const entryId = await hrPayrollManager.recordTimeEntry(
      employeeId,
      new Date(clockIn),
      breakMinutes || 0,
    );
    res.status(201).json({ entryId, message: "Time entry recorded" });
  } catch (error) {
    res.status(400).json({ error: "Failed to record time entry" });
  }
});

/**
 * Clock Out
 * POST /api/hr/time-entries/:entryId/clock-out
 */
router.post(
  "/time-entries/:entryId/clock-out",
  async (req: Request, res: Response) => {
    try {
      const { entryId } = req.params;
      await hrPayrollManager.clockOut(entryId);
      res.json({ message: "Clocked out successfully" });
    } catch (error) {
      res.status(400).json({ error: "Failed to clock out" });
    }
  },
);

/**
 * Create Schedule
 * POST /api/hr/schedules
 */
router.post(
  "/schedules",
  requireRole("manager", "admin"),
  async (req: Request, res: Response) => {
    try {
      const scheduleData = req.body;
      const scheduleId = await hrPayrollManager.createSchedule(scheduleData);
      res.status(201).json({ scheduleId, message: "Schedule created" });
    } catch (error) {
      res.status(400).json({ error: "Failed to create schedule" });
    }
  },
);

/**
 * Publish Schedule
 * POST /api/hr/schedules/:scheduleId/publish
 */
router.post(
  "/schedules/:scheduleId/publish",
  requireRole("manager", "admin"),
  async (req: Request, res: Response) => {
    try {
      const { scheduleId } = req.params;
      await hrPayrollManager.publishSchedule(scheduleId);
      res.json({ message: "Schedule published" });
    } catch (error) {
      res.status(400).json({ error: "Failed to publish schedule" });
    }
  },
);

/**
 * Get Schedules
 * GET /api/hr/schedules?status=published
 */
router.get("/schedules", async (req: Request, res: Response) => {
  try {
    const status = req.query.status as string | undefined;
    const schedules = await hrPayrollManager.getSchedules(status);
    res.json(schedules);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch schedules" });
  }
});

/**
 * Get Payroll Cycles
 * GET /api/hr/payroll/cycles
 */
router.get("/payroll/cycles", async (_req: Request, res: Response) => {
  try {
    const cycles = await hrPayrollManager.getPayrollCycles();
    res.json(cycles);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch payroll cycles" });
  }
});

/**
 * Get Payroll Cycle
 * GET /api/hr/payroll/cycles/:cycleId
 */
router.get("/payroll/cycles/:cycleId", async (req: Request, res: Response) => {
  try {
    const { cycleId } = req.params;
    const cycle = await hrPayrollManager.getPayrollCycle(cycleId);
    if (!cycle)
      return res.status(404).json({ error: "Payroll cycle not found" });
    res.json(cycle);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch payroll cycle" });
  }
});

/**
 * Create Payroll Cycle
 * POST /api/hr/payroll/cycles
 */
router.post(
  "/payroll/cycles",
  requireRole("payroll", "admin"),
  async (req: Request, res: Response) => {
    try {
      const { periodStart, periodEnd } = req.body;
      const cycleId = await hrPayrollManager.createPayrollCycle(
        new Date(periodStart),
        new Date(periodEnd),
      );
      res.status(201).json({ cycleId, message: "Payroll cycle created" });
    } catch (error) {
      res.status(400).json({ error: "Failed to create payroll cycle" });
    }
  },
);

/**
 * Process Payroll
 * POST /api/hr/payroll/cycles/:cycleId/process
 */
router.post(
  "/payroll/cycles/:cycleId/process",
  requireRole("payroll", "admin"),
  async (req: Request, res: Response) => {
    try {
      const { cycleId } = req.params;
      await hrPayrollManager.processPayroll(cycleId);
      res.json({ message: "Payroll processed" });
    } catch (error) {
      res.status(400).json({ error: "Failed to process payroll" });
    }
  },
);

/**
 * Approve Payroll
 * POST /api/hr/payroll/cycles/:cycleId/approve
 */
router.post(
  "/payroll/cycles/:cycleId/approve",
  requireRole("payroll", "admin"),
  async (req: Request, res: Response) => {
    try {
      const { cycleId } = req.params;
      await hrPayrollManager.approvePayroll(cycleId);
      res.json({ message: "Payroll approved" });
    } catch (error) {
      res.status(400).json({ error: "Failed to approve payroll" });
    }
  },
);

/**
 * Create Benefit Plan
 * POST /api/hr/benefits/plans
 */
router.post(
  "/benefits/plans",
  requireRole("hr", "admin"),
  async (req: Request, res: Response) => {
    try {
      const planData = req.body as Omit<BenefitPlan, "id">;
      const planId = await hrPayrollManager.createBenefitPlan(planData);
      res.status(201).json({ planId, message: "Benefit plan created" });
    } catch (error) {
      res.status(400).json({ error: "Failed to create benefit plan" });
    }
  },
);

/**
 * Get Benefit Plans
 * GET /api/hr/benefits/plans
 */
router.get("/benefits/plans", async (req: Request, res: Response) => {
  try {
    const plans = await hrPayrollManager.getBenefitPlans();
    res.json(plans);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch benefit plans" });
  }
});

/**
 * Enroll in Benefit
 * POST /api/hr/benefits/plans/:planId/enroll
 */
router.post(
  "/benefits/plans/:planId/enroll",
  async (req: Request, res: Response) => {
    try {
      const { planId } = req.params;
      const { employeeId } = req.body;
      await hrPayrollManager.enrollBenefit(planId, employeeId);
      res.json({ message: "Enrolled in benefit plan" });
    } catch (error) {
      res.status(400).json({ error: "Failed to enroll in benefit" });
    }
  },
);

/**
 * Get Training Programs
 * GET /api/hr/training/programs
 */
router.get("/training/programs", async (_req: Request, res: Response) => {
  try {
    const programs = await hrPayrollManager.getTrainingPrograms();
    res.json(programs);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch training programs" });
  }
});

/**
 * Create Training Program
 * POST /api/hr/training/programs
 */
router.post(
  "/training/programs",
  requireRole("hr", "admin"),
  async (req: Request, res: Response) => {
    try {
      const programData = req.body as Omit<TrainingProgram, "id">;
      const programId =
        await hrPayrollManager.createTrainingProgram(programData);
      res.status(201).json({ programId, message: "Training program created" });
    } catch (error) {
      res.status(400).json({ error: "Failed to create training program" });
    }
  },
);

/**
 * Enroll in Training
 * POST /api/hr/training/programs/:programId/enroll
 */
router.post(
  "/training/programs/:programId/enroll",
  async (req: Request, res: Response) => {
    try {
      const { programId } = req.params;
      const { employeeId } = req.body;
      await hrPayrollManager.enrollTraining(programId, employeeId);
      res.json({ message: "Enrolled in training program" });
    } catch (error) {
      res.status(400).json({ error: "Failed to enroll in training" });
    }
  },
);

/**
 * Get Attendance Report
 * GET /api/hr/attendance?outletId=outlet-1&period=2024-01
 */
router.get("/attendance", async (req: Request, res: Response) => {
  try {
    const { outletId, period } = req.query;
    const attendance = await hrPayrollManager.getAttendanceReport(
      outletId as string,
      period as string,
    );
    res.json(attendance);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch attendance report" });
  }
});

/**
 * Get HR Metrics
 * GET /api/hr/metrics?outletId=outlet-1
 */
router.get("/metrics", async (req: Request, res: Response) => {
  try {
    const outletId = req.query.outletId as string | undefined;
    const metrics = await hrPayrollManager.getHRMetrics(outletId);
    res.json(metrics);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch HR metrics" });
  }
});

export default router;
