import express, { Router, Request, Response } from "express";
import { createClient } from "@supabase/supabase-js";
import { validateAuth, requireRole } from "../middleware/validateAuth";
import { asyncHandler, throwAppError } from "../middleware/errorHandler";
import { validate, createWorkspaceSchema } from "../schemas/validationSchemas";
import {
  logWorkspaceOperation,
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

// Security middleware stack: Auth -> Org Access -> Rate Limiting -> Feature Gating
router.use(verifySupabaseAuth);
router.use(verifyOrganizationAccess);
router.use(tier2Limiter);
router.use(featureGate("tier2_workspaces"));

// Create workspace
router.post(
  "/",
  asyncHandler(async (req: Request, res: Response) => {
    const { name, slug, description } = validate(
      createWorkspaceSchema,
      req.body,
    );
    const userId = (req as any).user?.id;

    if (!userId) {
      throwAppError("User not authenticated", 401);
    }

    const { data, error } = await supabase
      .from("tier2_workspaces")
      .insert([{ owner_id: userId, name, slug, description, status: "active" }])
      .select()
      .single();

    if (error) throw error;

    logWorkspaceOperation("Create workspace", "create", data.id, userId, {
      name,
      slug,
    });

    return res.status(201).json({
      success: true,
      data,
      message: "Workspace created successfully",
    });
  }),
);

// List workspaces
router.get(
  "/",
  asyncHandler(async (req: Request, res: Response) => {
    const userId = (req as any).user?.id;

    if (!userId) {
      throwAppError("User not authenticated", 401);
    }

    const { data, error } = await supabase
      .from("tier2_workspaces")
      .select("*")
      .eq("owner_id", userId);

    if (error) throw error;

    return res.status(200).json({
      success: true,
      data: data || [],
      message: "Workspaces retrieved successfully",
    });
  }),
);

// Get workspace
router.get(
  "/:id",
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const userId = (req as any).user?.id;

    if (!userId) {
      throwAppError("User not authenticated", 401);
    }

    const { data, error } = await supabase
      .from("tier2_workspaces")
      .select("*")
      .eq("id", id)
      .single();

    if (error) throw error;
    if (!data) {
      throwAppError("Workspace not found", 404);
    }

    // Verify user has access
    if (data.owner_id !== userId) {
      const memberCheck = await supabase
        .from("tier2_workspace_members")
        .select("id")
        .eq("workspace_id", id)
        .eq("user_id", userId)
        .single();

      if (memberCheck.error) {
        throwAppError("Access denied", 403);
      }
    }

    return res.status(200).json({
      success: true,
      data,
      message: "Workspace retrieved successfully",
    });
  }),
);

// Update workspace (owner only)
router.put(
  "/:id",
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const userId = (req as any).user?.id;
    const { name, description, plan, status } = req.body;

    if (!userId) {
      throwAppError("User not authenticated", 401);
    }

    // Verify ownership
    const { data: workspace, error: fetchError } = await supabase
      .from("tier2_workspaces")
      .select("owner_id")
      .eq("id", id)
      .single();

    if (fetchError || !workspace) {
      throwAppError("Workspace not found", 404);
    }

    if (workspace.owner_id !== userId) {
      throwAppError("Only workspace owner can update", 403);
    }

    const { data, error } = await supabase
      .from("tier2_workspaces")
      .update({ name, description, plan, status, updated_at: new Date() })
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;

    logWorkspaceOperation("Update workspace", "update", id, userId, {
      fields: Object.keys({ name, description, plan, status }).filter(
        (k) => (req.body as Record<string, any>)[k] !== undefined,
      ),
    });

    return res.status(200).json({
      success: true,
      data,
      message: "Workspace updated successfully",
    });
  }),
);

// Delete workspace (owner only)
router.delete(
  "/:id",
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const userId = (req as any).user?.id;

    if (!userId) {
      throwAppError("User not authenticated", 401);
    }

    // Verify ownership
    const { data: workspace, error: fetchError } = await supabase
      .from("tier2_workspaces")
      .select("owner_id")
      .eq("id", id)
      .single();

    if (fetchError || !workspace) {
      throwAppError("Workspace not found", 404);
    }

    if (workspace.owner_id !== userId) {
      throwAppError("Only workspace owner can delete", 403);
    }

    const { error } = await supabase
      .from("tier2_workspaces")
      .delete()
      .eq("id", id);

    if (error) {
      logSensitiveOperationFailure("Delete workspace", error as Error, {
        operationType: "delete",
        resourceType: "workspace",
        resourceId: id,
        userId,
        workspaceId: id,
      });
      throw error;
    }

    logWorkspaceOperation("Delete workspace", "delete", id, userId, {
      permanent: true,
    });

    return res.status(200).json({
      success: true,
      message: "Workspace deleted successfully",
    });
  }),
);

// Add member to workspace (owner only)
router.post(
  "/:id/members",
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const userId = (req as any).user?.id;
    const { user_id, role = "member" } = req.body;

    if (!userId) {
      throwAppError("User not authenticated", 401);
    }

    // Verify ownership
    const { data: workspace, error: fetchError } = await supabase
      .from("tier2_workspaces")
      .select("owner_id")
      .eq("id", id)
      .single();

    if (fetchError || !workspace) {
      throwAppError("Workspace not found", 404);
    }

    if (workspace.owner_id !== userId) {
      throwAppError("Only workspace owner can add members", 403);
    }

    const { data, error } = await supabase
      .from("tier2_workspace_members")
      .insert([{ workspace_id: id, user_id, role }])
      .select()
      .single();

    if (error) throw error;

    logWorkspaceOperation("Add workspace member", "create", id, userId, {
      newMemberId: user_id,
      memberRole: role,
    });

    return res.status(201).json({
      success: true,
      data,
      message: "Member added successfully",
    });
  }),
);

// List workspace members
router.get(
  "/:id/members",
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const userId = (req as any).user?.id;

    if (!userId) {
      throwAppError("User not authenticated", 401);
    }

    const { data, error } = await supabase
      .from("tier2_workspace_members")
      .select("*")
      .eq("workspace_id", id);

    if (error) throw error;

    return res.status(200).json({
      success: true,
      data: data || [],
      message: "Members retrieved successfully",
    });
  }),
);

export default router;
