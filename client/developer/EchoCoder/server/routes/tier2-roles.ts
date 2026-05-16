import express, { Router, Request, Response } from "express";
import { createClient } from "@supabase/supabase-js";
import { validateAuth, requireRole } from "../middleware/validateAuth";
import { asyncHandler, throwAppError } from "../middleware/errorHandler";
import {
  logBreadcrumb,
  logSensitiveOperationFailure,
} from "../lib/sentryBreadcrumbs";
import {
  verifySupabaseAuth,
  verifyOrganizationAccess,
  requireOrgAdmin,
} from "../middleware/supabaseAuth";
import { featureGate } from "../middleware/featureGate";
import { tier2Limiter } from "../middleware/rateLimit";

const router: Router = express.Router();

const supabase = createClient(
  process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || "",
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.VITE_SUPABASE_ANON_KEY ||
    "",
);

// Security middleware stack: Auth -> Org Access -> Rate Limiting -> Feature Gating -> Admin Check
router.use(verifySupabaseAuth);
router.use(verifyOrganizationAccess);
router.use(tier2Limiter);
router.use(featureGate("tier2_roles"));
router.use(requireOrgAdmin);

// Create custom role (admin only)
router.post(
  "/",
  requireRole(["admin"]),
  asyncHandler(async (req: Request, res: Response) => {
    const { workspace_id, name, description, permissions } = req.body;
    const userId = (req as any).user?.id;

    if (!name || !workspace_id) {
      throwAppError("Name and workspace_id are required", 400);
    }

    const { data, error } = await supabase
      .from("tier2_role_definitions")
      .insert([
        { workspace_id, name, description, permissions, is_custom: true },
      ])
      .select()
      .single();

    if (error) throw error;

    logBreadcrumb({
      operation: "Create custom role",
      operationType: "create",
      resourceType: "role",
      resourceId: data.id,
      userId,
      workspaceId: workspace_id,
      status: "success",
      details: { roleName: name },
    });

    return res.status(201).json({
      success: true,
      data,
      message: "Role created successfully",
    });
  }),
);

// List roles for workspace
router.get(
  "/:workspace_id",
  asyncHandler(async (req: Request, res: Response) => {
    const { workspace_id } = req.params;
    const userId = (req as any).user?.id;

    if (!userId) {
      throwAppError("User not authenticated", 401);
    }

    const { data, error } = await supabase
      .from("tier2_role_definitions")
      .select("*")
      .eq("workspace_id", workspace_id);

    if (error) throw error;

    return res.status(200).json({
      success: true,
      data: data || [],
      message: "Roles retrieved successfully",
    });
  }),
);

// Update role (admin only)
router.put(
  "/:id",
  requireRole(["admin"]),
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const { name, description, permissions } = req.body;

    const { data, error } = await supabase
      .from("tier2_role_definitions")
      .update({ name, description, permissions })
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;

    return res.status(200).json({
      success: true,
      data,
      message: "Role updated successfully",
    });
  }),
);

// Delete role (admin only)
router.delete(
  "/:id",
  requireRole(["admin"]),
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const userId = (req as any).user?.id;

    const { error } = await supabase
      .from("tier2_role_definitions")
      .delete()
      .eq("id", id);

    if (error) {
      logSensitiveOperationFailure("Delete role", error as Error, {
        operationType: "delete",
        resourceType: "role",
        resourceId: id,
        userId,
      });
      throw error;
    }

    logBreadcrumb({
      operation: "Delete custom role",
      operationType: "delete",
      resourceType: "role",
      resourceId: id,
      userId,
      status: "success",
      details: { permanent: true },
    });

    return res.status(200).json({
      success: true,
      message: "Role deleted successfully",
    });
  }),
);

export default router;
