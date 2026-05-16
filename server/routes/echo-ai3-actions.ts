import { Router, Request, Response } from "express";
import { z } from "zod";
import { requireAuth } from "../middleware/auth";
import { logger } from "../lib/logger";
import { getEchoAI3ActionExecutor } from "../services/echo-ai3-action-executor";
import { getEchoAI3ActionRouter } from "../services/echo-ai3-action-router";
import { getEchoAI3ContextAggregator } from "../services/echo-ai3-context-aggregator";

const router = Router();
router.use(requireAuth);

/**
 * POST /api/echo-ai3/actions/execute
 * Execute an AI action. Requires ActionContext; traceId is idempotency key.
 */
const ExecuteActionSchema = z.object({
  actionType: z.string(),
  module: z.string(),
  parameters: z.record(z.any()),
  confidence: z.number().min(0).max(1),
  requiresConfirmation: z.boolean().optional(),
  organizationId: z.string().uuid(),
  traceId: z.string().min(1),
  orgId: z.string().min(1).optional(),
  actor: z.object({ userId: z.string(), role: z.string() }).optional(),
  sessionId: z.string().min(1).optional(),
}).refine((d) => d.orgId ?? d.organizationId, { message: "orgId or organizationId required" });

router.post("/execute", async (req: Request, res: Response) => {
  try {
    const validated = ExecuteActionSchema.parse(req.body);
    const userId = validated.actor?.userId ?? (req as any).user?.id;
    const orgId = validated.orgId ?? validated.organizationId;

    const router = getEchoAI3ActionRouter();
    const result = await router.routeAction(
      validated.module,
      validated.actionType,
      validated.parameters,
      validated.confidence,
      userId,
      orgId,
      validated.traceId,
    );

    if (result.success) {
      res.json({ success: true, route: result.route });
    } else {
      res.status(400).json({ success: false, error: result.error, route: result.route });
    }
  } catch (error) {
    logger.error("Failed to execute action", { error });
    res.status(500).json({ error: (error as Error).message });
  }
});

/**
 * GET /api/echo-ai3/actions/history
 * Get action execution history
 */
router.get("/history", async (req: Request, res: Response) => {
  try {
    const { actionId } = req.query;

    const executor = getEchoAI3ActionExecutor();
    const history = executor.getActionHistory(actionId as string | undefined);

    res.json({ history });
  } catch (error) {
    logger.error("Failed to get action history", { error });
    res.status(500).json({ error: (error as Error).message });
  }
});

/**
 * POST /api/echo-ai3/actions/undo
 * Undo an action. Requires prior traceId (or actionId as alias).
 */
const UndoActionSchema = z.object({
  actionId: z.string().min(1).optional(),
  traceId: z.string().min(1).optional(),
}).refine((d) => d.actionId ?? d.traceId, { message: "actionId or traceId required" });

router.post("/undo", async (req: Request, res: Response) => {
  try {
    const parsed = UndoActionSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: "actionId or traceId required" });
    }
    const { actionId, traceId } = parsed.data;
    const id = traceId ?? actionId;

    if (!id) {
      return res.status(400).json({ error: "actionId or traceId required" });
    }

    const executor = getEchoAI3ActionExecutor();
    const result = await executor.undoAction(id);

    if (result.success) {
      res.json({ success: true });
    } else {
      res.status(400).json({ success: false, error: result.error });
    }
  } catch (error) {
    logger.error("Failed to undo action", { error });
    res.status(500).json({ error: (error as Error).message });
  }
});

/**
 * POST /api/echo-ai3/context/add
 * Add module context for aggregation
 */
const AddContextSchema = z.object({
  module: z.string(),
  context: z.record(z.any()),
  relevanceScore: z.number().min(0).max(1).optional(),
  organizationId: z.string().uuid(),
});

router.post("/context/add", async (req: Request, res: Response) => {
  try {
    const validated = AddContextSchema.parse(req.body);

    const aggregator = getEchoAI3ContextAggregator();
    aggregator.addModuleContext(validated.organizationId, {
      module: validated.module,
      context: validated.context,
      timestamp: new Date().toISOString(),
      relevanceScore: validated.relevanceScore || 0.5,
    });

    res.json({ success: true });
  } catch (error) {
    logger.error("Failed to add context", { error });
    res.status(500).json({ error: (error as Error).message });
  }
});

/**
 * POST /api/echo-ai3/context/aggregate
 * Aggregate context across modules
 */
const AggregateContextSchema = z.object({
  query: z.string(),
  relevantModules: z.array(z.string()).optional(),
  organizationId: z.string().uuid(),
});

router.post("/context/aggregate", async (req: Request, res: Response) => {
  try {
    const validated = AggregateContextSchema.parse(req.body);

    const aggregator = getEchoAI3ContextAggregator();
    const aggregated = await aggregator.aggregateContext(
      validated.organizationId,
      validated.query,
      validated.relevantModules
    );

    res.json(aggregated);
  } catch (error) {
    logger.error("Failed to aggregate context", { error });
    res.status(500).json({ error: (error as Error).message });
  }
});

/**
 * GET /api/echo-ai3/actions/routes
 * Get all registered action routes
 */
router.get("/routes", async (req: Request, res: Response) => {
  try {
    const { module } = req.query;

    const router = getEchoAI3ActionRouter();
    const routes = module ? router.getModuleRoutes(module as string) : router.getRoutes();

    res.json({ routes });
  } catch (error) {
    logger.error("Failed to get routes", { error });
    res.status(500).json({ error: (error as Error).message });
  }
});

export default router;
