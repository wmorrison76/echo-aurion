import type { RequestHandler, Request, Response, NextFunction } from"express";
import jwt from"jsonwebtoken";
// D17e · Read JWT_SECRET via the same fail-fast policy as the main
// fuse box (server/lib/env.ts). Production refuses to issue tokens
// without a real key. Sub-module isolation forces an inline copy
// of the policy here rather than importing across packages.
function _getJwtSecretOrThrow(): string {
  const v = process.env.JWT_SECRET;
  if (v && v.length > 0) return v;
  const env = (process.env.LUCCCA_ENV ?? process.env.NODE_ENV ?? "").toLowerCase();
  if (env === "prod" || env === "production") {
    throw new Error("fuse-box: JWT_SECRET unset in production (EchoAurum)");
  }
  return "luccca-dev-jwt-secret-not-for-production";
}
const JWT_SECRET = _getJwtSecretOrThrow();
export interface JWTPayload { userId: string; email: string; role:"admin" |"controller" |"auditor" |"viewer"; entityIds: string[]; permissions: string[]; iat: number; exp: number;
} export interface AuthenticatedRequest extends Request { user?: JWTPayload; token?: string;
} /** * JWT Authentication Middleware * Verifies JWT token in Authorization header */
export const jwtAuth: RequestHandler = ( req: AuthenticatedRequest, res: Response, next: NextFunction
) => { try { const authHeader = req.headers.authorization; if (!authHeader || !authHeader.startsWith("Bearer")) { return res.status(401).json({ error:"Missing or invalid Authorization header" }); } const token = authHeader.substring(7); try { const payload = jwt.verify(token, JWT_SECRET) as JWTPayload; req.user = payload; req.token = token; next(); } catch (err) { if (err instanceof jwt.TokenExpiredError) { return res.status(401).json({ error:"Token expired" }); } if (err instanceof jwt.JsonWebTokenError) { return res.status(401).json({ error:"Invalid token" }); } throw err; } } catch (error) { console.error("JWT auth error:", error); res.status(500).json({ error:"Authentication error" }); }
}; /** * Optional JWT verification (doesn't block if missing) */
export const optionalJwtAuth: RequestHandler = ( req: AuthenticatedRequest, res: Response, next: NextFunction
) => { try { const authHeader = req.headers.authorization; if (authHeader && authHeader.startsWith("Bearer")) { const token = authHeader.substring(7); try { const payload = jwt.verify(token, JWT_SECRET) as JWTPayload; req.user = payload; req.token = token; } catch (err) { // Silently ignore invalid tokens in optional mode console.warn("Optional JWT verification failed:", err instanceof Error ? err.message :"Unknown error"); } } next(); } catch (error) { console.error("Optional JWT auth error:", error); next(); }
}; /** * Generate JWT token for user */
export function generateToken(user: Omit<JWTPayload,"iat" |"exp">): string { return jwt.sign(user, JWT_SECRET, { expiresIn:"24h", });
} /** * Generate refresh token (longer expiration) */
export function generateRefreshToken(userId: string): string { return jwt.sign({ userId }, JWT_SECRET, { expiresIn:"7d", });
} /** * Role-based access control middleware factory */
export function requireRole(...allowedRoles: string[]) { return (req: AuthenticatedRequest, res: Response, next: NextFunction) => { if (!req.user) { return res.status(401).json({ error:"Authentication required" }); } if (!allowedRoles.includes(req.user.role)) { return res.status(403).json({ error:"Insufficient permissions", required: allowedRoles, userRole: req.user.role, }); } next(); };
} /** * Permission-based access control middleware factory */
export function requirePermission(...permissions: string[]) { return (req: AuthenticatedRequest, res: Response, next: NextFunction) => { if (!req.user) { return res.status(401).json({ error:"Authentication required" }); } const hasPermission = permissions.every((perm) => req.user!.permissions.includes(perm) ); if (!hasPermission) { return res.status(403).json({ error:"Missing required permissions", required: permissions, userPermissions: req.user.permissions, }); } next(); };
} /** * Entity access control - ensure user has access to entity */
export function requireEntityAccess(req: AuthenticatedRequest, res: Response, next: NextFunction) { if (!req.user) { return res.status(401).json({ error:"Authentication required" }); } const entityId = req.params.entityId || req.query.entityId || req.body?.entityId; if (!entityId) { return res.status(400).json({ error:"Entity ID required" }); } if (!req.user.entityIds.includes(entityId as string)) { return res.status(403).json({ error:"Access denied to this entity", entityId, }); } next();
} /** * Multi-entity access control - ensure user has access to all entities */
export function requireMultiEntityAccess( req: AuthenticatedRequest, res: Response, next: NextFunction
) { if (!req.user) { return res.status(401).json({ error:"Authentication required" }); } const entityIds = req.body?.entityIds || req.query?.entityIds; if (!Array.isArray(entityIds) || entityIds.length === 0) { return res.status(400).json({ error:"Entity IDs required" }); } const unauthorized = (entityIds as string[]).filter( (id) => !req.user!.entityIds.includes(id) ); if (unauthorized.length > 0) { return res.status(403).json({ error:"Access denied to some entities", unauthorized, }); } next();
} /** * Rate limiting by user */
export const userRateLimitMap = new Map<string, { count: number; reset: number }>(); export function rateLimit(options: { windowMs: number; maxRequests: number }) { return (req: AuthenticatedRequest, res: Response, next: NextFunction) => { const userId = req.user?.userId ||"anonymous"; const now = Date.now(); let userLimit = userRateLimitMap.get(userId); if (!userLimit || userLimit.reset < now) { userLimit = { count: 0, reset: now + options.windowMs }; userRateLimitMap.set(userId, userLimit); } if (userLimit.count >= options.maxRequests) { return res.status(429).json({ error:"Too many requests", retryAfter: Math.ceil((userLimit.reset - now) / 1000), }); } userLimit.count++; next(); };
}
