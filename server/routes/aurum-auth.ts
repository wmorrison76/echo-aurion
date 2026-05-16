/**
 * EchoAurum Authentication Router
 * Handles persona selection, session management, and authentication
 */

import { Router, type Request, type Response } from "express";
import { extractSessionToken } from "../../client/modules/EchoAurum/server/middleware/session";
import {
  issueSession,
  listSessionPersonas,
  revokeSession,
  getSession,
  touchSession,
} from "../../client/modules/EchoAurum/server/services/session";

export const aurumAuthRouter = Router();

/**
 * GET /api/auth/personas
 * List all available LUCCCA finance personas for authentication
 */
aurumAuthRouter.get("/auth/personas", (_req: Request, res: Response) => {
  try {
    const personas = listSessionPersonas();
    res.json({ personas });
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : "Failed to list personas",
    });
  }
});

/**
 * POST /api/auth/session
 * Create a new session by selecting a persona
 * Body: { personaId: string }
 */
aurumAuthRouter.post("/auth/session", (req: Request, res: Response) => {
  try {
    const { personaId } = req.body ?? {};
    if (typeof personaId !== "string" || personaId.length === 0) {
      return res.status(400).json({ error: "personaId is required" });
    }

    const session = issueSession(personaId);
    res.json({ session });
  } catch (error) {
    res.status(404).json({
      error: error instanceof Error ? error.message : "Persona not found",
    });
  }
});

/**
 * GET /api/auth/session
 * Get current active session
 * Header: Authorization: Bearer <token> OR X-LUCCCA-Session: <token>
 */
aurumAuthRouter.get("/auth/session", (req: Request, res: Response) => {
  try {
    const token = extractSessionToken(req);
    if (!token) {
      return res.status(401).json({ error: "Authentication required" });
    }

    const session = getSession(token);
    if (!session) {
      return res.status(401).json({ error: "Session expired or invalid" });
    }

    touchSession(token);
    res.json({ session });
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : "Failed to get session",
    });
  }
});

/**
 * DELETE /api/auth/session
 * Revoke current session
 * Header: Authorization: Bearer <token> OR X-LUCCCA-Session: <token>
 */
aurumAuthRouter.delete("/auth/session", (req: Request, res: Response) => {
  try {
    const token = extractSessionToken(req);
    if (token) {
      revokeSession(token);
    }
    res.status(204).send();
  } catch (error) {
    res.status(500).json({
      error:
        error instanceof Error ? error.message : "Failed to revoke session",
    });
  }
});
