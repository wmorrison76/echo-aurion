import type { RequestHandler } from "express";
import { extractSessionToken } from "../middleware/session";
import {
  issueSession,
  listSessionPersonas,
  revokeSession,
  getSession,
  touchSession,
} from "../services/session";
export const listPersonas: RequestHandler = (_req, res) => {
  res.json({ personas: listSessionPersonas() });
};
export const createSession: RequestHandler = (req, res) => {
  const { personaId } = req.body ?? {};
  if (typeof personaId !== "string" || personaId.length === 0) {
    return res.status(400).json({ error: "personaId is required" });
  }
  try {
    const session = issueSession(personaId);
    return res.json({ session });
  } catch (error) {
    return res.status(404).json({
      error: error instanceof Error ? error.message : "Persona not found",
    });
  }
};
export const getActiveSession: RequestHandler = (req, res) => {
  const token = extractSessionToken(req);
  if (!token) {
    return res.status(401).json({ error: "Authentication required" });
  }
  const session = getSession(token);
  if (!session) {
    return res.status(401).json({ error: "Session expired or invalid" });
  }
  touchSession(token);
  return res.json({ session });
};
export const destroySession: RequestHandler = (req, res) => {
  const token = extractSessionToken(req);
  if (!token) {
    return res.status(204).send();
  }
  revokeSession(token);
  return res.status(204).send();
};
