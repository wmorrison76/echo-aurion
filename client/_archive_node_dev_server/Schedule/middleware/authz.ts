/** * Authorization middleware for role-based access control */
import { Request, Response, NextFunction } from "express";
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        role?: string;
        org_id?: string;
        outlet_id?: string;
        dept_id?: string;
      };
    }
  }
} /** * Requires user to have one of the specified roles */
export function requireRole(...allowed: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    const role = req.user?.role;
    if (!allowed.includes(role || "")) {
      return res.status(403).json({ error: "Forbidden: insufficient role" });
    }
    next();
  };
} /** * Requires user ID to match a request parameter (ownership check) * @param paramKey - query or body parameter name (e.g.,"employee_id") */
export function requireSelf(paramKey: string) {
  return (req: Request, res: Response, next: NextFunction) => {
    const userId = req.user?.id;
    const requested =
      req.method === "GET"
        ? (req.query[paramKey] as string)
        : (req.body[paramKey] as string);
    if (!userId || !requested) {
      return res.status(403).json({ error: "Forbidden: no user or target" });
    }
    if (userId !== requested) {
      return res
        .status(403)
        .json({ error: "Forbidden: cannot access other user's data" });
    }
    next();
  };
} /** * Requires user to be in the same department (scope by dept_id) * @param paramKey - query or body parameter name for dept_id */
export function requireDept(paramKey: string = "dept_id") {
  return (req: Request, res: Response, next: NextFunction) => {
    const userDept = req.user?.dept_id;
    const requestedDept =
      req.method === "GET"
        ? (req.query[paramKey] as string)
        : (req.body[paramKey] as string);
    if (!userDept || !requestedDept) {
      return res.status(403).json({ error: "Forbidden: no dept info" });
    }
    if (userDept !== requestedDept) {
      return res
        .status(403)
        .json({ error: "Forbidden: cross-dept access denied" });
    }
    next();
  };
} /** * Stub middleware to simulate role checking from JWT or session * In production, decode JWT or read from session store */
export function authenticateUser(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  // In production, extract from JWT (Authorization: Bearer <token>) // or from session middleware (req.session.user) // For now, support query param ?user_id=<id>&role=<role> for testing const userId = req.query.user_id as string; const role = req.query.role as string; const orgId = req.query.org_id as string; const outletId = req.query.outlet_id as string; const deptId = req.query.dept_id as string; if (userId) { req.user = { id: userId, role: role ||"EMPLOYEE", org_id: orgId, outlet_id: outletId, dept_id: deptId, }; } next();
}
