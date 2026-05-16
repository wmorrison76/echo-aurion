import type { Request, RequestHandler } from "express";
import type { UserRole } from "../../shared/auth";
import {
  ensureGuardrails,
  ensurePropertyScope,
  ensureRole,
  getSession,
  touchSession,
  type SessionRecord,
} from "../services/session";
export interface SessionRequirementOptions {
  role?: UserRole;
  guardrails?: string[];
  propertyField?: string;
  propertyResolver?: (req: Request) => string | null;
}
export function extractSessionToken(req: Request) {
  const authorization = req.get("authorization") ?? req.get("x-luccca-session");
  if (!authorization) {
    return null;
  }
  if (authorization.startsWith("Bearer")) {
    return authorization.slice(7).trim() || null;
  }
  return authorization.trim() || null;
}
function resolveProperty(req: Request, options: SessionRequirementOptions) {
  if (typeof options.propertyResolver === "function") {
    return options.propertyResolver(req);
  }
  if (options.propertyField && req.body && typeof req.body === "object") {
    const value = (req.body as Record<string, unknown>)[options.propertyField];
    return typeof value === "string" ? value : null;
  }
  return null;
}
export const requireSession = (
  options: SessionRequirementOptions = {},
): RequestHandler => {
  return (req, res, next) => {
    const token = extractSessionToken(req);
    if (!token) {
      return res.status(401).json({ error: "Authentication required" });
    }
    const session = getSession(token);
    if (!session) {
      return res.status(401).json({ error: "Session expired or invalid" });
    }
    if (options.role && !ensureRole(session, options.role)) {
      return res
        .status(403)
        .json({ error: `Insufficient role. ${options.role} required.` });
    }
    if (options.guardrails && options.guardrails.length > 0) {
      const evaluation = ensureGuardrails(session, options.guardrails);
      if (!evaluation.allowed) {
        return res.status(403).json({
          error: `Guardrail enforcement required: ${evaluation.missing.join(",")}`,
        });
      }
    }
    const propertyId = resolveProperty(req, options);
    if (!ensurePropertyScope(session, propertyId)) {
      return res.status(403).json({ error: "Property access denied" });
    }
    req.lucccaSession = session;
    touchSession(token);
    next();
  };
};
export type { SessionRecord };
