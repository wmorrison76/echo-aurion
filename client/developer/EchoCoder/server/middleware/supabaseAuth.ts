import { Request, Response, NextFunction } from "express";
import { createClient } from "@supabase/supabase-js";
import type { SupabaseClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

let supabase: SupabaseClient | null = null;

function getSupabaseClient(): SupabaseClient {
  if (!supabase) {
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error(
        "Missing Supabase configuration: VITE_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY required"
      );
    }
    supabase = createClient(supabaseUrl, supabaseServiceKey);
  }
  return supabase;
}

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    org_id?: string;
  };
  org_id?: string;
}

/**
 * Verify JWT token from Authorization header
 */
export async function verifySupabaseAuth(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      res.status(401).json({ error: "Missing or invalid authorization header" });
      return;
    }

    const token = authHeader.substring(7);
    const supabaseClient = getSupabaseClient();

    const {
      data: { user },
      error,
    } = await supabaseClient.auth.getUser(token);

    if (error || !user) {
      res.status(401).json({ error: "Invalid or expired token" });
      return;
    }

    // Attach user to request
    req.user = {
      id: user.id,
      email: user.email || "",
    };

    // Get user's primary organization from cookies or header
    const orgId = req.headers["x-organization-id"] as string;
    if (orgId) {
      req.org_id = orgId;
      req.user.org_id = orgId;
    }

    next();
  } catch (error) {
    console.error("Auth middleware error:", error);
    res.status(500).json({ error: "Authentication failed" });
  }
}

/**
 * Verify user is part of organization (RLS)
 */
export async function verifyOrganizationAccess(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    if (!req.user || !req.org_id) {
      res.status(401).json({ error: "Missing user or organization context" });
      return;
    }

    const supabaseClient = getSupabaseClient();

    // Check if user is member of organization
    const { data, error } = await supabaseClient
      .from("organization_members")
      .select("id, role")
      .eq("org_id", req.org_id)
      .eq("user_id", req.user.id)
      .eq("status", "accepted")
      .single();

    if (error || !data) {
      res.status(403).json({ error: "Access denied to organization" });
      return;
    }

    // Attach organization role to request
    req.user.org_id = req.org_id;

    next();
  } catch (error) {
    console.error("Organization access check error:", error);
    res.status(500).json({ error: "Access verification failed" });
  }
}

/**
 * Require admin role in organization
 */
export async function requireOrgAdmin(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    if (!req.user || !req.org_id) {
      res.status(401).json({ error: "Missing user or organization context" });
      return;
    }

    const supabaseClient = getSupabaseClient();

    const { data, error } = await supabaseClient
      .from("organization_members")
      .select("role")
      .eq("org_id", req.org_id)
      .eq("user_id", req.user.id)
      .eq("status", "accepted")
      .single();

    if (error || !data || data.role !== "admin") {
      res.status(403).json({ error: "Admin access required" });
      return;
    }

    next();
  } catch (error) {
    console.error("Admin check error:", error);
    res.status(500).json({ error: "Admin verification failed" });
  }
}

/**
 * Require specific role in organization
 */
export function requireRole(allowedRoles: string[]) {
  return async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      if (!req.user || !req.org_id) {
        res.status(401).json({ error: "Missing user or organization context" });
        return;
      }

      const supabaseClient = getSupabaseClient();

      const { data, error } = await supabaseClient
        .from("organization_members")
        .select("role")
        .eq("org_id", req.org_id)
        .eq("user_id", req.user.id)
        .eq("status", "accepted")
        .single();

      if (error || !data || !allowedRoles.includes(data.role)) {
        res.status(403).json({
          error: `Access denied. Required roles: ${allowedRoles.join(", ")}`,
        });
        return;
      }

      next();
    } catch (error) {
      console.error("Role verification error:", error);
      res.status(500).json({ error: "Role verification failed" });
    }
  };
}

/**
 * Log audit event
 */
export async function auditLog(
  orgId: string,
  userId: string,
  action: string,
  resourceType: string,
  resourceId: string | null = null,
  changes: any = null,
  status: string = "success",
  errorMessage: string | null = null
): Promise<void> {
  try {
    const supabaseClient = getSupabaseClient();

    await supabaseClient.from("audit_logs").insert({
      org_id: orgId,
      user_id: userId,
      action,
      resource_type: resourceType,
      resource_id: resourceId,
      changes,
      status,
      error_message: errorMessage,
      user_agent: "api",
    });
  } catch (error) {
    console.error("Audit log error:", error);
  }
}

export { getSupabaseClient };
