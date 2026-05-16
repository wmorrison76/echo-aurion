import { Router, Request, Response } from "express";
import { jwtAuthMiddleware, requireRole } from "../middleware/auth-jwt";
import { AgentSupervisor } from "../services/agent-supervisor";
import type {
  AgentActionAttemptRequest,
  AgentProposalRequest,
} from "@shared/types/agent-contracts";

const router = Router();
const supervisor = new AgentSupervisor();

const SHADOW_AGENT_ROLES = [
  "admin",
  "superadmin",
  "owner",
  "co-owner",
  "board-chair",
  "board-member",
  "investor",
  "ceo",
  "coo",
  "cfo",
  "cio",
  "cto",
  "cro",
  "vp-operations",
  "vp-food-beverage",
];

router.post(
  "/api/agents/proposals",
  jwtAuthMiddleware,
  requireRole(SHADOW_AGENT_ROLES),
  async (req: Request, res: Response) => {
    try {
      const orgId = (req as any).user?.org_id;
      const userId = (req as any).user?.id || "unknown";
      const userRole = (req as any).user?.role;

      if (!orgId) {
        return res.status(400).json({ error: "Missing org context" });
      }

      const proposal = req.body as AgentProposalRequest;
      if (!proposal?.agentId || !proposal?.actionType || !proposal?.target) {
        return res.status(400).json({
          error: "agentId, actionType, and target are required",
        });
      }

      const response = await supervisor.submitProposal(
        orgId,
        userId,
        userRole,
        proposal,
      );
      res.json(response);
    } catch (error) {
      res.status(500).json({ error: "Failed to submit agent proposal" });
    }
  },
);

router.post(
  "/api/agents/actions",
  jwtAuthMiddleware,
  requireRole(SHADOW_AGENT_ROLES),
  async (req: Request, res: Response) => {
    try {
      const orgId = (req as any).user?.org_id;
      const userId = (req as any).user?.id || "unknown";
      const userRole = (req as any).user?.role;

      if (!orgId) {
        return res.status(400).json({ error: "Missing org context" });
      }

      const attempt = req.body as AgentActionAttemptRequest;
      if (!attempt?.agentId || !attempt?.actionType || !attempt?.target) {
        return res.status(400).json({
          error: "agentId, actionType, and target are required",
        });
      }

      const response = await supervisor.attemptAction(
        orgId,
        userId,
        userRole,
        attempt,
      );
      res.status(403).json(response);
    } catch (error) {
      res.status(500).json({ error: "Failed to process agent action attempt" });
    }
  },
);

export default router;
