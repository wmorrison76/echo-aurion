/** * Authentication and authorization middleware * Validates JWT tokens and checks user roles */ import { Request, Response, NextFunction } from"express";
import jwt from"jsonwebtoken";
// D17e · same fail-fast policy as the main fuse box. Sub-module
// isolation prevents importing server/lib/env.ts directly, so the
// minimal helper is inlined here.
function _getJwtSecretOrThrow(): string {
  const v = process.env.JWT_SECRET;
  if (v && v.length > 0) return v;
  const env = (process.env.LUCCCA_ENV ?? process.env.NODE_ENV ?? "").toLowerCase();
  if (env === "prod" || env === "production") {
    throw new Error("fuse-box: JWT_SECRET unset in production (Schedule)");
  }
  return "luccca-dev-jwt-secret-not-for-production";
}
export interface AuthUser { id: string; org_id: string; outlet_id?: string; dept_id?: string; role:"EMPLOYEE" |"DEPT_MGR" |"GM" |"ADMIN"; email?: string;
} export function authenticateUser( req: Request, res: Response, next: NextFunction,
) { const token = req.headers.authorization?.split("")[1]; if (!token) { // In development, allow mock user if (process.env.NODE_ENV ==="development") { (req as any).user = { id:"dev-user-123", org_id:"dev-org", role:"ADMIN", } as AuthUser; return next(); } return res.status(401).json({ error:"Missing authorization token" }); } try { const secret = _getJwtSecretOrThrow(); const payload = jwt.verify(token, secret) as AuthUser; (req as any).user = payload; next(); } catch (e) { return res.status(401).json({ error:"Invalid or expired token", code:"AUTH_INVALID", }); }
} export function requireRole(...roles: string[]) { return (req: Request, res: Response, next: NextFunction) => { const user = (req as any).user as AuthUser | undefined; if (!user) { return res.status(401).json({ error:"Authentication required" }); } if (!roles.includes(user.role)) { return res.status(403).json({ error: `Access denied: Required one of [${roles.join(",")}], got ${user.role}`, code:"INSUFFICIENT_ROLE", }); } next(); };
} export function validateTenant( req: Request, res: Response, next: NextFunction,
) { const user = (req as any).user as AuthUser | undefined; const org_id = req.body?.org_id || req.query?.org_id; if (!user) { return res.status(401).json({ error:"Authentication required" }); } if (org_id && user.org_id !== org_id) { return res.status(403).json({ error:"Access denied: User does not belong to this organization", code:"TENANT_MISMATCH", }); } next();
}
