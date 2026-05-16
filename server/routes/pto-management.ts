import { Router, Request, Response } from "express";
import { realtimeManager } from "../lib/realtime";
import * as Sentry from "@sentry/node";

const ptoManagementRouter = Router();

interface PTORequest {
  id: string;
  employeeId: string;
  employeeName: string;
  dateRange: {
    startDate: string;
    endDate: string;
  };
  reason: string;
  type: "vacation" | "sick_leave" | "personal" | "unpaid";
  hoursRequested: number;
  status: "pending" | "approved" | "rejected";
  approvalChain: ApprovalStep[];
  conflictingEmployees?: string[];
  coverage?: {
    isCovered: boolean;
    message: string;
  };
}

interface ApprovalStep {
  step: 1 | 2 | 3;
  stepName: "dept_manager" | "outlet_manager" | "hr";
  approver: string;
  approved: boolean;
  approvedAt?: string;
  notes?: string;
}

interface BlackoutDate {
  id: string;
  dateRange: {
    startDate: string;
    endDate: string;
  };
  reason: string;
  scope: "corporate" | "outlet" | "department";
  scopeId?: string;
  allowOverride: boolean;
}

// Mock data
const ptoRequests: Map<string, PTORequest> = new Map([
  [
    "pto-1",
    {
      id: "pto-1",
      employeeId: "emp-001",
      employeeName: "James",
      dateRange: {
        startDate: "2024-12-20",
        endDate: "2024-12-25",
      },
      reason: "Holiday vacation",
      type: "vacation",
      hoursRequested: 48,
      status: "pending",
      approvalChain: [
        {
          step: 1,
          stepName: "dept_manager",
          approver: "Chef_Frank",
          approved: false,
        },
        {
          step: 2,
          stepName: "outlet_manager",
          approver: "",
          approved: false,
        },
        {
          step: 3,
          stepName: "hr",
          approver: "",
          approved: false,
        },
      ],
      conflictingEmployees: ["emp-005", "emp-008"],
      coverage: {
        isCovered: false,
        message:
          "Kitchen understaffed by 2 people on 2024-12-21 and 2024-12-22",
      },
    },
  ],
]);

const blackoutDates: Map<string, BlackoutDate> = new Map([
  [
    "blackout-1",
    {
      id: "blackout-1",
      dateRange: {
        startDate: "2024-12-25",
        endDate: "2024-12-26",
      },
      reason: "Christmas Holiday",
      scope: "corporate",
      allowOverride: false,
    },
  ],
  [
    "blackout-2",
    {
      id: "blackout-2",
      dateRange: {
        startDate: "2024-11-28",
        endDate: "2024-11-28",
      },
      reason: "Thanksgiving",
      scope: "corporate",
      allowOverride: false,
    },
  ],
]);

// Submit PTO request
ptoManagementRouter.post(
  "/api/pto/request",
  async (req: Request, res: Response) => {
    try {
      const {
        employeeId,
        employeeName,
        startDate,
        endDate,
        reason,
        type,
        hoursRequested,
      } = req.body;

      const ptoRequest: PTORequest = {
        id: `pto-${Date.now()}`,
        employeeId,
        employeeName,
        dateRange: {
          startDate,
          endDate,
        },
        reason,
        type,
        hoursRequested,
        status: "pending",
        approvalChain: [
          {
            step: 1,
            stepName: "dept_manager",
            approver: "",
            approved: false,
          },
          {
            step: 2,
            stepName: "outlet_manager",
            approver: "",
            approved: false,
          },
          {
            step: 3,
            stepName: "hr",
            approver: "",
            approved: false,
          },
        ],
        coverage: {
          isCovered: false,
          message: "Coverage analysis pending",
        },
      };

      ptoRequests.set(ptoRequest.id, ptoRequest);

      // Broadcast PTO request
      realtimeManager.sendEvent("pto-management", {
        type: "pto-request-created",
        data: ptoRequest,
        timestamp: Date.now(),
      });

      res.json({
        success: true,
        ptoRequest,
        message: "PTO request submitted successfully",
      });
    } catch (error) {
      console.error("[PTO] Request error:", error);
      Sentry.captureException(error, {
        tags: { feature: "pto-management", action: "request" },
        extra: { employeeId, dateRange: { startDate, endDate } },
      });
      res.status(500).json({
        success: false,
        error: "Failed to submit PTO request",
      });
    }
  },
);

// Get pending PTO requests
ptoManagementRouter.get(
  "/api/pto/pending",
  async (req: Request, res: Response) => {
    try {
      const pending = Array.from(ptoRequests.values()).filter(
        (req) => req.status === "pending",
      );

      // Sort by date
      pending.sort(
        (a, b) =>
          new Date(a.dateRange.startDate).getTime() -
          new Date(b.dateRange.startDate).getTime(),
      );

      res.json({
        success: true,
        pending,
        count: pending.length,
      });
    } catch (error) {
      console.error("[PTO] Get pending error:", error);
      Sentry.captureException(error, {
        tags: { feature: "pto-management", action: "get-pending" },
      });
      res.status(500).json({
        success: false,
        error: "Failed to fetch pending requests",
      });
    }
  },
);

// Approve PTO at step
ptoManagementRouter.post(
  "/api/pto/approve",
  async (req: Request, res: Response) => {
    try {
      const { ptoRequestId, step, approverId, notes } = req.body;
      const orgId = (req as any).user?.org_id || "default";

      const ptoRequest = ptoRequests.get(ptoRequestId);
      if (!ptoRequest) {
        return res.status(404).json({ error: "PTO request not found" });
      }

      // Check for prospect conflicts using the schedule detector
      let prospectConflicts: any = null;
      try {
        const { ProspectScheduleDetector } =
          await import("../services/prospect-schedule-detector");
        const validation =
          await ProspectScheduleDetector.validatePTOAgainstProspects(
            ptoRequest.employeeId,
            orgId,
            new Date(ptoRequest.dateRange.startDate),
            new Date(ptoRequest.dateRange.endDate),
          );
        prospectConflicts = validation;
      } catch (err) {
        console.warn(
          "[PTO] Prospect conflict check failed (non-fatal):",
          err instanceof Error ? err.message : String(err),
        );
        // Continue with approval even if conflict check fails
      }

      // Update approval step
      const approvalStep = ptoRequest.approvalChain.find(
        (a) => a.step === step,
      );
      if (approvalStep) {
        approvalStep.approver = approverId;
        approvalStep.approved = true;
        approvalStep.approvedAt = new Date().toISOString();
        approvalStep.notes = notes;
      }

      // Check if all approved
      const allApproved = ptoRequest.approvalChain.every(
        (step) => step.approved,
      );
      if (allApproved) {
        ptoRequest.status = "approved";
      }

      ptoRequests.set(ptoRequestId, ptoRequest);

      // Broadcast approval
      realtimeManager.sendEvent("pto-management", {
        type: "pto-approved",
        data: ptoRequest,
        timestamp: Date.now(),
      });

      res.json({
        success: true,
        ptoRequest,
        message: `PTO request approved at step ${step}`,
        prospectConflicts,
        warnings: prospectConflicts?.conflicts?.map((c: any) => ({
          severity: c.severity,
          description: c.description,
          recommendation: c.recommendation,
        })),
      });
    } catch (error) {
      console.error("[PTO] Approve error:", error);
      Sentry.captureException(error, {
        tags: { feature: "pto-management", action: "approve" },
        extra: { ptoRequestId, step, approverId },
      });
      res.status(500).json({
        success: false,
        error: "Failed to approve PTO request",
      });
    }
  },
);

// Reject PTO request
ptoManagementRouter.post(
  "/api/pto/reject",
  async (req: Request, res: Response) => {
    try {
      const { ptoRequestId, reason } = req.body;

      const ptoRequest = ptoRequests.get(ptoRequestId);
      if (!ptoRequest) {
        return res.status(404).json({ error: "PTO request not found" });
      }

      ptoRequest.status = "rejected";

      ptoRequests.set(ptoRequestId, ptoRequest);

      // Broadcast rejection
      realtimeManager.sendEvent("pto-management", {
        type: "pto-rejected",
        data: { ...ptoRequest, rejectionReason: reason },
        timestamp: Date.now(),
      });

      res.json({
        success: true,
        ptoRequest,
        message: "PTO request rejected",
      });
    } catch (error) {
      console.error("[PTO] Reject error:", error);
      Sentry.captureException(error, {
        tags: { feature: "pto-management", action: "reject" },
        extra: { ptoRequestId },
      });
      res.status(500).json({
        success: false,
        error: "Failed to reject PTO request",
      });
    }
  },
);

// Get blackout dates
ptoManagementRouter.get(
  "/api/pto/blackout-dates",
  async (req: Request, res: Response) => {
    try {
      const blackouts = Array.from(blackoutDates.values());

      res.json({
        success: true,
        blackoutDates: blackouts,
        count: blackouts.length,
      });
    } catch (error) {
      console.error("[PTO] Get blackout dates error:", error);
      Sentry.captureException(error, {
        tags: { feature: "pto-management", action: "get-blackout-dates" },
      });
      res.status(500).json({
        success: false,
        error: "Failed to fetch blackout dates",
      });
    }
  },
);

// Check for blackout date conflicts
ptoManagementRouter.post(
  "/api/pto/check-conflicts",
  async (req: Request, res: Response) => {
    try {
      const { startDate, endDate } = req.body;

      const conflicts: BlackoutDate[] = [];

      for (const blackout of blackoutDates.values()) {
        const blackoutStart = new Date(blackout.dateRange.startDate);
        const blackoutEnd = new Date(blackout.dateRange.endDate);
        const reqStart = new Date(startDate);
        const reqEnd = new Date(endDate);

        if (reqStart <= blackoutEnd && reqEnd >= blackoutStart) {
          conflicts.push(blackout);
        }
      }

      res.json({
        success: true,
        conflicts,
        hasConflicts: conflicts.length > 0,
        message:
          conflicts.length > 0
            ? `${conflicts.length} blackout date(s) found in this range`
            : "No blackout dates in this range",
      });
    } catch (error) {
      console.error("[PTO] Check conflicts error:", error);
      Sentry.captureException(error, {
        tags: { feature: "pto-management", action: "check-conflicts" },
        extra: { startDate, endDate },
      });
      res.status(500).json({
        success: false,
        error: "Failed to check conflicts",
      });
    }
  },
);

// Get PTO summary for employee
ptoManagementRouter.get(
  "/api/pto/summary/:employeeId",
  async (req: Request, res: Response) => {
    try {
      const { employeeId } = req.params;

      const employeePTOs = Array.from(ptoRequests.values()).filter(
        (req) => req.employeeId === employeeId,
      );

      const approved = employeePTOs.filter((r) => r.status === "approved");
      const totalHours = approved.reduce((sum, r) => sum + r.hoursRequested, 0);

      res.json({
        success: true,
        employeeId,
        totalRequests: employeePTOs.length,
        approvedRequests: approved.length,
        totalPTOHours: totalHours,
        requests: employeePTOs,
      });
    } catch (error) {
      console.error("[PTO] Get summary error:", error);
      Sentry.captureException(error, {
        tags: { feature: "pto-management", action: "get-summary" },
        extra: { employeeId },
      });
      res.status(500).json({
        success: false,
        error: "Failed to fetch PTO summary",
      });
    }
  },
);

export default ptoManagementRouter;
