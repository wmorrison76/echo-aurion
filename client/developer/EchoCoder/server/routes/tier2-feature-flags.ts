import express, { Router, Request, Response } from "express";
import { createClient } from "@supabase/supabase-js";
import { validateAuth, requireRole } from "../middleware/validateAuth";
import { asyncHandler, throwAppError } from "../middleware/errorHandler";
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
router.use(featureGate("tier2_feature_flags"));
router.use(requireOrgAdmin);

// Create feature flag
router.post(
  "/",
  asyncHandler(async (req: Request, res: Response) => {
    const {
      workspace_id,
      key,
      enabled = false,
      rollout_percentage = 0,
    } = req.body;
    const userId = (req as any).user?.id;

    if (!workspace_id || !key) {
      throwAppError("workspace_id and key are required", 400);
    }

    const { data, error } = await supabase
      .from("tier2_feature_flags")
      .insert([
        { workspace_id, key, enabled, rollout_percentage, metadata: {} },
      ])
      .select()
      .single();

    if (error) throw error;

    return res.status(201).json({
      success: true,
      data,
      message: "Feature flag created successfully",
    });
  }),
);

// Get feature flags for workspace
router.get(
  "/:workspace_id",
  asyncHandler(async (req: Request, res: Response) => {
    const { workspace_id } = req.params;
    const userId = (req as any).user?.id;

    if (!userId) {
      throwAppError("User not authenticated", 401);
    }

    const { data, error } = await supabase
      .from("tier2_feature_flags")
      .select("*")
      .eq("workspace_id", workspace_id);

    if (error) throw error;

    return res.status(200).json({
      success: true,
      data: data || [],
      message: "Feature flags retrieved successfully",
    });
  }),
);

// Update feature flag (admin only)
router.put(
  "/:id",
  requireRole(["admin"]),
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const { enabled, rollout_percentage, metadata } = req.body;

    const { data, error } = await supabase
      .from("tier2_feature_flags")
      .update({
        enabled,
        rollout_percentage,
        metadata,
        updated_at: new Date(),
      })
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;

    return res.status(200).json({
      success: true,
      data,
      message: "Feature flag updated successfully",
    });
  }),
);

// Delete feature flag (admin only)
router.delete(
  "/:id",
  requireRole(["admin"]),
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;

    const { error } = await supabase
      .from("tier2_feature_flags")
      .delete()
      .eq("id", id);

    if (error) throw error;

    return res.status(200).json({
      success: true,
      message: "Feature flag deleted successfully",
    });
  }),
);

export default router;
