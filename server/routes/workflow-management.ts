import { Router, Request, Response } from "express";
import { workflowOrchestrator } from "../services/workflow-orchestrator";
import { logger } from "../lib/logger";

const router = Router();

router.post("/create", async (req: Request, res: Response) => {
  try {
    const { eventId, orgId, templateId, initiatedByUserId } = req.body;

    if (!eventId || !orgId || !templateId || !initiatedByUserId) {
      return res.status(400).json({
        success: false,
        error: "Missing required fields",
        timestamp: new Date().toISOString(),
      });
    }

    const instanceId = await workflowOrchestrator.createWorkflowInstance(
      eventId,
      orgId,
      templateId,
      initiatedByUserId,
    );

    res.status(201).json({
      success: true,
      data: { instanceId },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error(
      "[WorkflowManagement] Error creating workflow instance:",
      error,
    );
    res.status(500).json({
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to create workflow",
      timestamp: new Date().toISOString(),
    });
  }
});

router.post("/:instanceId/start", async (req: Request, res: Response) => {
  try {
    const { instanceId } = req.params;

    const started = await workflowOrchestrator.startWorkflow(instanceId);

    res.json({
      success: started,
      data: { started },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error("[WorkflowManagement] Error starting workflow:", error);
    res.status(500).json({
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to start workflow",
      timestamp: new Date().toISOString(),
    });
  }
});

router.get("/:instanceId/status", async (req: Request, res: Response) => {
  try {
    const { instanceId } = req.params;

    const status = await workflowOrchestrator.getWorkflowStatus(instanceId);

    if (!status) {
      return res.status(404).json({
        success: false,
        error: "Workflow instance not found",
        timestamp: new Date().toISOString(),
      });
    }

    res.json({
      success: true,
      data: status,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error("[WorkflowManagement] Error fetching workflow status:", error);
    res.status(500).json({
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Failed to fetch workflow status",
      timestamp: new Date().toISOString(),
    });
  }
});

router.post(
  "/:instanceId/step/:stepNumber/complete",
  async (req: Request, res: Response) => {
    try {
      const { instanceId, stepNumber } = req.params;
      const { notes } = req.body;

      const nextStepStarted = await workflowOrchestrator.completeStep(
        instanceId,
        parseInt(stepNumber),
        notes,
      );

      res.json({
        success: true,
        data: { nextStepStarted },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      logger.error("[WorkflowManagement] Error completing step:", error);
      res.status(500).json({
        success: false,
        error:
          error instanceof Error ? error.message : "Failed to complete step",
        timestamp: new Date().toISOString(),
      });
    }
  },
);

router.post(
  "/:instanceId/step/:stepNumber/approve",
  async (req: Request, res: Response) => {
    try {
      const { instanceId, stepNumber } = req.params;
      const { approverUserId, approvalNotes } = req.body;

      if (!approverUserId) {
        return res.status(400).json({
          success: false,
          error: "Approver user ID is required",
          timestamp: new Date().toISOString(),
        });
      }

      const allApprovalsReceived = await workflowOrchestrator.approveStep(
        instanceId,
        parseInt(stepNumber),
        approverUserId,
        approvalNotes,
      );

      res.json({
        success: true,
        data: { allApprovalsReceived },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      logger.error("[WorkflowManagement] Error approving step:", error);
      res.status(500).json({
        success: false,
        error:
          error instanceof Error ? error.message : "Failed to approve step",
        timestamp: new Date().toISOString(),
      });
    }
  },
);

router.post(
  "/:instanceId/step/:stepNumber/acknowledge",
  async (req: Request, res: Response) => {
    try {
      const { instanceId, stepNumber } = req.params;
      const { acknowledgerUserId } = req.body;

      if (!acknowledgerUserId) {
        return res.status(400).json({
          success: false,
          error: "Acknowledger user ID is required",
          timestamp: new Date().toISOString(),
        });
      }

      const allAcknowledged = await workflowOrchestrator.acknowledgeStep(
        instanceId,
        parseInt(stepNumber),
        acknowledgerUserId,
      );

      res.json({
        success: true,
        data: { allAcknowledged },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      logger.error("[WorkflowManagement] Error acknowledging step:", error);
      res.status(500).json({
        success: false,
        error:
          error instanceof Error ? error.message : "Failed to acknowledge step",
        timestamp: new Date().toISOString(),
      });
    }
  },
);

router.post(
  "/:instanceId/step/:stepNumber/skip",
  async (req: Request, res: Response) => {
    try {
      const { instanceId, stepNumber } = req.params;
      const { reason, userId } = req.body;

      if (!reason || !userId) {
        return res.status(400).json({
          success: false,
          error: "Reason and user ID are required",
          timestamp: new Date().toISOString(),
        });
      }

      const skipped = await workflowOrchestrator.skipStep(
        instanceId,
        parseInt(stepNumber),
        reason,
        userId,
      );

      res.json({
        success: skipped,
        data: { skipped },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      logger.error("[WorkflowManagement] Error skipping step:", error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : "Failed to skip step",
        timestamp: new Date().toISOString(),
      });
    }
  },
);

router.get(
  "/:instanceId/step/:stepNumber",
  async (req: Request, res: Response) => {
    try {
      const { instanceId, stepNumber } = req.params;

      const progression = await workflowOrchestrator.getStepProgression(
        instanceId,
        parseInt(stepNumber),
      );

      if (!progression) {
        return res.status(404).json({
          success: false,
          error: "Step progression not found",
          timestamp: new Date().toISOString(),
        });
      }

      res.json({
        success: true,
        data: progression,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      logger.error(
        "[WorkflowManagement] Error fetching step progression:",
        error,
      );
      res.status(500).json({
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to fetch step progression",
        timestamp: new Date().toISOString(),
      });
    }
  },
);

router.get(
  "/template/:templateId/steps",
  async (req: Request, res: Response) => {
    try {
      const { templateId } = req.params;

      const steps = await workflowOrchestrator.getWorkflowSteps(templateId);

      res.json({
        success: true,
        data: steps,
        count: steps.length,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      logger.error(
        "[WorkflowManagement] Error fetching workflow steps:",
        error,
      );
      res.status(500).json({
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to fetch workflow steps",
        timestamp: new Date().toISOString(),
      });
    }
  },
);

router.post("/:instanceId/pause", async (req: Request, res: Response) => {
  try {
    const { instanceId } = req.params;
    const { reason } = req.body;

    const paused = await workflowOrchestrator.pauseWorkflow(instanceId, reason);

    res.json({
      success: paused,
      data: { paused },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error("[WorkflowManagement] Error pausing workflow:", error);
    res.status(500).json({
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to pause workflow",
      timestamp: new Date().toISOString(),
    });
  }
});

router.post("/:instanceId/resume", async (req: Request, res: Response) => {
  try {
    const { instanceId } = req.params;

    const resumed = await workflowOrchestrator.resumeWorkflow(instanceId);

    res.json({
      success: resumed,
      data: { resumed },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error("[WorkflowManagement] Error resuming workflow:", error);
    res.status(500).json({
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to resume workflow",
      timestamp: new Date().toISOString(),
    });
  }
});

router.post("/:instanceId/complete", async (req: Request, res: Response) => {
  try {
    const { instanceId } = req.params;

    const completed = await workflowOrchestrator.completeWorkflow(instanceId);

    res.json({
      success: completed,
      data: { completed },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error("[WorkflowManagement] Error completing workflow:", error);
    res.status(500).json({
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to complete workflow",
      timestamp: new Date().toISOString(),
    });
  }
});

export default router;
