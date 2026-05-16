/**
 * Risk Playbook API Routes
 * 
 * Endpoints for playbook management, execution, and history
 */

import { Router, Request, Response } from "express";
import { riskPlaybookService } from "../services/risk-playbook-service";
import { requireAuth } from "../middleware/auth";
import { getUserOrgId } from "../lib/multi-tenant";
import { logger } from "../lib/logger";

const router = Router();

/**
 * GET /api/risk-playbook/playbooks
 * Get all playbooks for an organization
 */
router.get("/playbooks", requireAuth, async (req: Request, res: Response) => {
  try {
    const orgId = getUserOrgId(req);
    const { category, department, riskType, isActive } = req.query;

    if (!orgId) {
      return res.status(400).json({
        error: "MISSING_ORG_ID",
        message: "Organization ID is required",
      });
    }

    const filters: any = {};
    if (category) filters.category = category as string;
    if (department) filters.department = department as string;
    if (riskType) filters.riskType = riskType as string;
    if (isActive !== undefined) filters.isActive = isActive === "true";

    const playbooks = await riskPlaybookService.getPlaybooks(orgId, filters);

    res.json({
      success: true,
      data: playbooks,
    });
  } catch (error) {
    logger.error("[RiskPlaybook] Error getting playbooks", { error, body: req.body });
    res.status(500).json({
      error: "FETCH_FAILED",
      message: "Failed to retrieve playbooks",
    });
  }
});

/**
 * GET /api/risk-playbook/playbooks/:playbookId
 * Get specific playbook
 */
router.get("/playbooks/:playbookId", requireAuth, async (req: Request, res: Response) => {
  try {
    const { playbookId } = req.params;
    const orgId = getUserOrgId(req);

    if (!orgId) {
      return res.status(400).json({
        error: "MISSING_ORG_ID",
        message: "Organization ID is required",
      });
    }

    const playbook = await riskPlaybookService.getPlaybook(playbookId, orgId);

    if (!playbook) {
      return res.status(404).json({
        error: "PLAYBOOK_NOT_FOUND",
        message: "Playbook not found",
      });
    }

    res.json({
      success: true,
      data: playbook,
    });
  } catch (error) {
    logger.error("[RiskPlaybook] Error getting playbook", { error, playbookId: req.params.playbookId });
    res.status(500).json({
      error: "FETCH_FAILED",
      message: "Failed to retrieve playbook",
    });
  }
});

/**
 * POST /api/risk-playbook/playbooks
 * Create new playbook
 */
router.post("/playbooks", requireAuth, async (req: Request, res: Response) => {
  try {
    const orgId = getUserOrgId(req);
    const userId = (req as any).user?.id || (req as any).user?.sub;

    if (!orgId || !userId) {
      return res.status(400).json({
        error: "MISSING_PARAMETERS",
        message: "Organization ID and user ID are required",
      });
    }

    const { name, description, category, department, riskTypes, priority, steps, contactPerson, link, isActive } =
      req.body;

    if (!name || !category || !department || !steps || !Array.isArray(steps)) {
      return res.status(400).json({
        error: "INVALID_PARAMETERS",
        message: "name, category, department, and steps array are required",
      });
    }

    const playbook = await riskPlaybookService.createPlaybook(
      {
        orgId,
        name,
        description,
        category,
        department,
        riskTypes: riskTypes || [],
        priority: priority || "medium",
        steps: steps.map((step: any, idx: number) => ({
          id: step.id || `step-${idx + 1}`,
          sequence: step.sequence || idx + 1,
          title: step.title,
          description: step.description,
          action: step.action,
          parameters: step.parameters,
          dependencies: step.dependencies || [],
          estimatedDuration: step.estimatedDuration,
          assignee: step.assignee,
          isRequired: step.isRequired !== false,
        })),
        contactPerson,
        link,
        isActive: isActive !== false,
        createdBy: userId,
      },
      orgId
    );

    res.json({
      success: true,
      data: playbook,
    });
  } catch (error) {
    logger.error("[RiskPlaybook] Error creating playbook", { error, body: req.body });
    res.status(500).json({
      error: "CREATE_FAILED",
      message: "Failed to create playbook",
    });
  }
});

/**
 * PATCH /api/risk-playbook/playbooks/:playbookId
 * Update playbook
 */
router.patch("/playbooks/:playbookId", requireAuth, async (req: Request, res: Response) => {
  try {
    const { playbookId } = req.params;
    const orgId = getUserOrgId(req);

    if (!orgId) {
      return res.status(400).json({
        error: "MISSING_ORG_ID",
        message: "Organization ID is required",
      });
    }

    const updates = req.body;
    const playbook = await riskPlaybookService.updatePlaybook(playbookId, updates, orgId);

    res.json({
      success: true,
      data: playbook,
    });
  } catch (error) {
    logger.error("[RiskPlaybook] Error updating playbook", { error, playbookId: req.params.playbookId });
    res.status(500).json({
      error: "UPDATE_FAILED",
      message: "Failed to update playbook",
    });
  }
});

/**
 * DELETE /api/risk-playbook/playbooks/:playbookId
 * Delete playbook (soft delete)
 */
router.delete("/playbooks/:playbookId", requireAuth, async (req: Request, res: Response) => {
  try {
    const { playbookId } = req.params;
    const orgId = getUserOrgId(req);

    if (!orgId) {
      return res.status(400).json({
        error: "MISSING_ORG_ID",
        message: "Organization ID is required",
      });
    }

    await riskPlaybookService.deletePlaybook(playbookId, orgId);

    res.json({
      success: true,
      message: "Playbook deleted successfully",
    });
  } catch (error) {
    logger.error("[RiskPlaybook] Error deleting playbook", { error, playbookId: req.params.playbookId });
    res.status(500).json({
      error: "DELETE_FAILED",
      message: "Failed to delete playbook",
    });
  }
});

/**
 * POST /api/risk-playbook/relevant
 * Get relevant playbooks for risk drivers
 */
router.post("/relevant", requireAuth, async (req: Request, res: Response) => {
  try {
    const { riskDrivers } = req.body;
    const orgId = getUserOrgId(req);

    if (!orgId) {
      return res.status(400).json({
        error: "MISSING_ORG_ID",
        message: "Organization ID is required",
      });
    }

    if (!riskDrivers || !Array.isArray(riskDrivers)) {
      return res.status(400).json({
        error: "INVALID_PARAMETERS",
        message: "riskDrivers array is required",
      });
    }

    const playbooks = await riskPlaybookService.getRelevantPlaybooks(riskDrivers, orgId);

    res.json({
      success: true,
      data: playbooks,
    });
  } catch (error) {
    logger.error("[RiskPlaybook] Error getting relevant playbooks", { error, body: req.body });
    res.status(500).json({
      error: "FETCH_FAILED",
      message: "Failed to retrieve relevant playbooks",
    });
  }
});

/**
 * POST /api/risk-playbook/execute
 * Execute a playbook
 */
router.post("/execute", requireAuth, async (req: Request, res: Response) => {
  try {
    const { playbookId, eventId, beoId, notes } = req.body;
    const orgId = getUserOrgId(req);
    const userId = (req as any).user?.id || (req as any).user?.sub;

    if (!orgId || !userId) {
      return res.status(400).json({
        error: "MISSING_PARAMETERS",
        message: "Organization ID and user ID are required",
      });
    }

    if (!playbookId) {
      return res.status(400).json({
        error: "MISSING_PARAMETERS",
        message: "playbookId is required",
      });
    }

    const execution = await riskPlaybookService.executePlaybook(playbookId, {
      eventId,
      beoId,
      orgId,
      triggeredBy: userId,
      notes,
    });

    res.json({
      success: true,
      data: execution,
    });
  } catch (error) {
    logger.error("[RiskPlaybook] Error executing playbook", { error, body: req.body });
    res.status(500).json({
      error: "EXECUTION_FAILED",
      message: "Failed to execute playbook",
    });
  }
});

/**
 * GET /api/risk-playbook/executions
 * Get playbook execution history
 */
router.get("/executions", requireAuth, async (req: Request, res: Response) => {
  try {
    const orgId = getUserOrgId(req);
    const { playbookId, eventId, beoId, status, limit } = req.query;

    if (!orgId) {
      return res.status(400).json({
        error: "MISSING_ORG_ID",
        message: "Organization ID is required",
      });
    }

    const filters: any = {};
    if (playbookId) filters.playbookId = playbookId as string;
    if (eventId) filters.eventId = eventId as string;
    if (beoId) filters.beoId = beoId as string;
    if (status) filters.status = status as string;
    if (limit) filters.limit = parseInt(limit as string);

    const executions = await riskPlaybookService.getExecutionHistory(orgId, filters);

    res.json({
      success: true,
      data: executions,
    });
  } catch (error) {
    logger.error("[RiskPlaybook] Error getting execution history", { error });
    res.status(500).json({
      error: "FETCH_FAILED",
      message: "Failed to retrieve execution history",
    });
  }
});

/**
 * GET /api/risk-playbook/executions/:executionId
 * Get execution status
 */
router.get("/executions/:executionId", requireAuth, async (req: Request, res: Response) => {
  try {
    const { executionId } = req.params;
    const orgId = getUserOrgId(req);

    if (!orgId) {
      return res.status(400).json({
        error: "MISSING_ORG_ID",
        message: "Organization ID is required",
      });
    }

    const execution = await riskPlaybookService.getExecutionStatus(executionId, orgId);

    if (!execution) {
      return res.status(404).json({
        error: "EXECUTION_NOT_FOUND",
        message: "Execution not found",
      });
    }

    res.json({
      success: true,
      data: execution,
    });
  } catch (error) {
    logger.error("[RiskPlaybook] Error getting execution status", { error, executionId: req.params.executionId });
    res.status(500).json({
      error: "FETCH_FAILED",
      message: "Failed to retrieve execution status",
    });
  }
});

/**
 * POST /api/risk-playbook/templates
 * Create playbook from template
 */
router.post("/templates", requireAuth, async (req: Request, res: Response) => {
  try {
    const { templateId } = req.body;
    const orgId = getUserOrgId(req);
    const userId = (req as any).user?.id || (req as any).user?.sub;

    if (!orgId || !userId) {
      return res.status(400).json({
        error: "MISSING_PARAMETERS",
        message: "Organization ID and user ID are required",
      });
    }

    // For now, create from hardcoded templates
    // In production, fetch from templates table
    const templates = {
      "inventory-gap": {
        name: "Inventory Gap Rapid Response",
        description: "Escalate to Purchasing, check substitutes, confirm vendor lead times.",
        category: "inventory",
        department: "Culinary",
        riskTypes: ["inventory", "shortage", "supply"],
        steps: [
          {
            sequence: 1,
            title: "Identify missing items",
            description: "Document all missing inventory items",
            isRequired: true,
          },
          {
            sequence: 2,
            title: "Check inventory substitutes",
            description: "Check for alternative ingredients",
            isRequired: true,
          },
          {
            sequence: 3,
            title: "Confirm vendor lead times",
            description: "Contact vendors for delivery times",
            action: "notify_department",
            parameters: { department: "Purchasing" },
            isRequired: true,
          },
        ],
      },
      // Add more templates as needed
    };

    const template = templates[templateId as keyof typeof templates];
    if (!template) {
      return res.status(404).json({
        error: "TEMPLATE_NOT_FOUND",
        message: "Template not found",
      });
    }

    const playbook = await riskPlaybookService.createFromTemplate(template, orgId, userId);

    res.json({
      success: true,
      data: playbook,
    });
  } catch (error) {
    logger.error("[RiskPlaybook] Error creating from template", { error, body: req.body });
    res.status(500).json({
      error: "CREATE_FAILED",
      message: "Failed to create playbook from template",
    });
  }
});

export default router;
