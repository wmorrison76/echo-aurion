import { Request, Response, NextFunction } from "express";
import { createClient } from "@supabase/supabase-js";

// Extend Express Request to include user context
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email?: string;
        role?: string;
      };
      workspaceId?: string;
    }
  }
}

/**
 * Validates JWT token from Authorization header
 * Requires: Authorization: Bearer <token>
 * Sets req.user if valid, otherwise returns 401
 */
export async function validateAuth(req: Request, res: Response, next: NextFunction) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        success: false,
        error: "Missing or invalid Authorization header",
        code: "MISSING_AUTH",
      });
    }

    const token = authHeader.substring(7);
    
    // Validate with Supabase
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
      console.error("Missing Supabase credentials");
      return res.status(500).json({
        success: false,
        error: "Server authentication not configured",
        code: "AUTH_CONFIG_ERROR",
      });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const { data, error } = await supabase.auth.getUser(token);

    if (error || !data.user) {
      return res.status(401).json({
        success: false,
        error: "Invalid or expired token",
        code: "INVALID_TOKEN",
      });
    }

    // Set user context on request
    req.user = {
      id: data.user.id,
      email: data.user.email,
      role: data.user.user_metadata?.role || "user",
    };

    // Extract workspace ID from query or body if provided
    const workspaceId = (req.query.workspace_id || req.body?.workspace_id) as string;
    if (workspaceId) {
      req.workspaceId = workspaceId;
    }

    next();
  } catch (error) {
    console.error("Authentication middleware error:", error);
    res.status(500).json({
      success: false,
      error: "Authentication failed",
      code: "AUTH_ERROR",
    });
  }
}

/**
 * Optional auth - does not fail if no token, but sets user if valid token provided
 */
export async function validateAuthOptional(req: Request, res: Response, next: NextFunction) {
  try {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith("Bearer ")) {
      const token = authHeader.substring(7);
      const supabaseUrl = process.env.SUPABASE_URL;
      const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

      if (supabaseUrl && supabaseServiceKey) {
        const supabase = createClient(supabaseUrl, supabaseServiceKey);
        const { data } = await supabase.auth.getUser(token);
        if (data.user) {
          req.user = {
            id: data.user.id,
            email: data.user.email,
            role: data.user.user_metadata?.role || "user",
          };
        }
      }
    }
    next();
  } catch (error) {
    // Don't fail on optional auth errors, just continue
    next();
  }
}

/**
 * Requires specific role to access endpoint
 */
export function requireRole(roles: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: "Authentication required",
        code: "MISSING_AUTH",
      });
    }

    if (!roles.includes(req.user.role || "user")) {
      return res.status(403).json({
        success: false,
        error: "Insufficient permissions",
        code: "PERMISSION_DENIED",
      });
    }

    next();
  };
}

/**
 * Requires workspace membership
 */
export async function requireWorkspaceMember(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.user || !req.workspaceId) {
      return res.status(401).json({
        success: false,
        error: "Authentication and workspace required",
        code: "MISSING_AUTH",
      });
    }

    // Check workspace membership via Supabase
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
      return res.status(500).json({
        success: false,
        error: "Server not configured",
        code: "SERVER_ERROR",
      });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const { data, error } = await supabase
      .from("workspace_members")
      .select("*")
      .eq("workspace_id", req.workspaceId)
      .eq("user_id", req.user.id)
      .single();

    if (error || !data) {
      return res.status(403).json({
        success: false,
        error: "Not a member of this workspace",
        code: "NOT_MEMBER",
      });
    }

    next();
  } catch (error) {
    console.error("Workspace member check error:", error);
    res.status(500).json({
      success: false,
      error: "Authorization check failed",
      code: "AUTH_ERROR",
    });
  }
}
