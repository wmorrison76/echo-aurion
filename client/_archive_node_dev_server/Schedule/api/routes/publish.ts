/** * Publish Workflow API Routes * POST /api/publish/publish - Publish schedule * POST /api/publish/ack - Acknowledge schedule * POST /api/publish/reopen - Reopen schedule * GET /api/publish/status - Get acknowledgement status */ import { Router } from "express";
import { z } from "zod";
import {
  publishSchedule,
  acknowledge,
  reopenSchedule,
  getAckStatus,
} from "../../services/publish_workflow";
import { requireRole, validateTenant } from "../../middleware/auth";
import { validateBody, validateQuery } from "../../middleware/validate";
const router = Router();
const publishSchema = z.object({
  schedule_id: z.string().uuid("Invalid schedule ID"),
  manager_id: z.string().uuid("Invalid manager ID"),
  notes: z.string().optional(),
  org_id: z.string().uuid("Invalid org ID"),
});
const ackSchema = z.object({
  schedule_id: z.string().uuid("Invalid schedule ID"),
  employee_id: z.string().uuid("Invalid employee ID"),
});
const reopenSchema = z.object({
  schedule_id: z.string().uuid("Invalid schedule ID"),
  manager_id: z.string().uuid("Invalid manager ID"),
  org_id: z.string().uuid("Invalid org ID"),
});
const statusSchema = z.object({
  schedule_id: z.string().uuid("Invalid schedule ID"),
}); // Publish schedule
router.post(
  "/publish",
  requireRole("DEPT_MGR", "GM", "ADMIN"),
  validateTenant,
  validateBody(publishSchema),
  async (req, res, next) => {
    try {
      const { schedule_id, manager_id, notes } = req.body;
      const result = await publishSchedule({ schedule_id, manager_id, notes });
      res.json(result);
    } catch (err) {
      next(err);
    }
  },
); // Acknowledge schedule
router.post(
  "/ack",
  requireRole("EMPLOYEE", "DEPT_MGR", "GM", "ADMIN"),
  validateBody(ackSchema),
  async (req, res, next) => {
    try {
      const { schedule_id, employee_id } = req.body;
      const result = await acknowledge({ schedule_id, employee_id });
      res.json(result);
    } catch (err) {
      next(err);
    }
  },
); // Reopen schedule
router.post(
  "/reopen",
  requireRole("DEPT_MGR", "GM", "ADMIN"),
  validateTenant,
  validateBody(reopenSchema),
  async (req, res, next) => {
    try {
      const { schedule_id, manager_id } = req.body;
      const result = await reopenSchedule({ schedule_id, manager_id });
      res.json(result);
    } catch (err) {
      next(err);
    }
  },
); // Get acknowledgement status
router.get("/status", validateQuery(statusSchema), async (req, res, next) => {
  try {
    const { schedule_id } = req.query as any;
    const result = await getAckStatus({ schedule_id });
    res.json(result);
  } catch (err) {
    next(err);
  }
});
export default router;
