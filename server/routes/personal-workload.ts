import { Router, Request, Response } from "express";
import { personalWorkloadService } from "../services/personal-workload-service";
import { logger } from "../lib/logger";

const router = Router();

router.get(
  "/employee/:employeeId/obligations",
  async (req: Request, res: Response) => {
    try {
      const { employeeId } = req.params;

      const result =
        await personalWorkloadService.getEmployeeCrossDepartmentCommitments(
          employeeId,
        );

      res.json({
        success: true,
        data: result,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      logger.error(
        "[PersonalWorkload] Error fetching employee obligations:",
        error,
      );
      res.status(500).json({
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to fetch obligations",
        timestamp: new Date().toISOString(),
      });
    }
  },
);

router.get(
  "/employee/:employeeId/workload/:departmentId",
  async (req: Request, res: Response) => {
    try {
      const { employeeId, departmentId } = req.params;

      const workloadStatus =
        await personalWorkloadService.getEmployeeWorkloadStatus(
          employeeId,
          departmentId,
        );

      if (!workloadStatus) {
        return res.status(404).json({
          success: false,
          error: "Workload status not found",
          timestamp: new Date().toISOString(),
        });
      }

      res.json({
        success: true,
        data: workloadStatus,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      logger.error("[PersonalWorkload] Error fetching workload status:", error);
      res.status(500).json({
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to fetch workload status",
        timestamp: new Date().toISOString(),
      });
    }
  },
);

router.get(
  "/employee/:employeeId/capacity/:departmentId",
  async (req: Request, res: Response) => {
    try {
      const { employeeId, departmentId } = req.params;

      const capacityAnalysis =
        await personalWorkloadService.getWorkloadCapacityAnalysis(
          employeeId,
          departmentId,
        );

      if (!capacityAnalysis) {
        return res.status(404).json({
          success: false,
          error: "Capacity analysis not found",
          timestamp: new Date().toISOString(),
        });
      }

      res.json({
        success: true,
        data: capacityAnalysis,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      logger.error(
        "[PersonalWorkload] Error fetching capacity analysis:",
        error,
      );
      res.status(500).json({
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to fetch capacity analysis",
        timestamp: new Date().toISOString(),
      });
    }
  },
);

router.get("/overloaded/:orgId", async (req: Request, res: Response) => {
  try {
    const { orgId } = req.params;
    const { departmentId } = req.query;

    const overloadedEmployees =
      await personalWorkloadService.getOverloadedEmployees(
        orgId,
        departmentId ? String(departmentId) : undefined,
      );

    res.json({
      success: true,
      data: overloadedEmployees,
      count: overloadedEmployees.length,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error(
      "[PersonalWorkload] Error fetching overloaded employees:",
      error,
    );
    res.status(500).json({
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Failed to fetch overloaded employees",
      timestamp: new Date().toISOString(),
    });
  }
});

router.post("/obligation/record", async (req: Request, res: Response) => {
  try {
    const { eventId, employeeId, departmentId, obligationType, isPrimaryRole } =
      req.body;

    if (!eventId || !employeeId || !departmentId || !obligationType) {
      return res.status(400).json({
        success: false,
        error: "Missing required fields",
        timestamp: new Date().toISOString(),
      });
    }

    const obligationId = await personalWorkloadService.recordObligation(
      eventId,
      employeeId,
      departmentId,
      obligationType,
      isPrimaryRole || false,
    );

    res.json({
      success: true,
      data: { obligationId },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error("[PersonalWorkload] Error recording obligation:", error);
    res.status(500).json({
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to record obligation",
      timestamp: new Date().toISOString(),
    });
  }
});

router.post(
  "/obligation/:obligationId/acknowledge",
  async (req: Request, res: Response) => {
    try {
      const { obligationId } = req.params;
      const { employeeId } = req.body;

      if (!employeeId) {
        return res.status(400).json({
          success: false,
          error: "Employee ID is required",
          timestamp: new Date().toISOString(),
        });
      }

      const acknowledged = await personalWorkloadService.acknowledgeObligation(
        obligationId,
        employeeId,
      );

      if (!acknowledged) {
        return res.status(404).json({
          success: false,
          error: "Obligation not found",
          timestamp: new Date().toISOString(),
        });
      }

      res.json({
        success: true,
        data: { acknowledged: true },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      logger.error("[PersonalWorkload] Error acknowledging obligation:", error);
      res.status(500).json({
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to acknowledge obligation",
        timestamp: new Date().toISOString(),
      });
    }
  },
);

router.post(
  "/employee/:employeeId/workload/:departmentId/update",
  async (req: Request, res: Response) => {
    try {
      const { employeeId, departmentId } = req.params;

      await personalWorkloadService.updateEmployeeWorkload(
        employeeId,
        departmentId,
      );

      res.json({
        success: true,
        data: { updated: true },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      logger.error(
        "[PersonalWorkload] Error updating employee workload:",
        error,
      );
      res.status(500).json({
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to update employee workload",
        timestamp: new Date().toISOString(),
      });
    }
  },
);

router.get(
  "/event/:eventId/obligation/:employeeId",
  async (req: Request, res: Response) => {
    try {
      const { eventId, employeeId } = req.params;

      const obligation =
        await personalWorkloadService.calculateEmployeeObligation(
          eventId,
          employeeId,
        );

      if (!obligation) {
        return res.status(404).json({
          success: false,
          error: "Obligation not found",
          timestamp: new Date().toISOString(),
        });
      }

      res.json({
        success: true,
        data: obligation,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      logger.error("[PersonalWorkload] Error fetching obligation:", error);
      res.status(500).json({
        success: false,
        error:
          error instanceof Error ? error.message : "Failed to fetch obligation",
        timestamp: new Date().toISOString(),
      });
    }
  },
);

export default router;
