import express, { Router, Request, Response } from "express";
import { createClient } from "@supabase/supabase-js";
import { validateAuth } from "../middleware/validateAuth";
import { asyncHandler, throwAppError } from "../middleware/errorHandler";
import {
  verifySupabaseAuth,
  verifyOrganizationAccess,
} from "../middleware/supabaseAuth";
import { featureGate } from "../middleware/featureGate";
import { tier4Limiter } from "../middleware/rateLimit";

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
router.use(tier4Limiter);
router.use(featureGate("tier4_targeting"));

router.post(
  "/",
  asyncHandler(async (req: Request, res: Response) => {
    const { workspace_id, name, conditions } = req.body;
    const userId = (req as any).user?.id;

    if (!workspace_id || !name || !conditions) {
      throwAppError("workspace_id, name, and conditions are required", 400);
    }

    const { data, error } = await supabase
      .from("audience_rules")
      .insert([
        {
          workspace_id,
          name,
          conditions,
          target_count: 0,
        },
      ])
      .select()
      .single();

    if (error) throw error;

    return res.status(201).json({
      success: true,
      data,
      message: "Targeting rule created",
    });
  }),
);

router.get(
  "/:workspace_id",
  asyncHandler(async (req: Request, res: Response) => {
    const { workspace_id } = req.params;
    const userId = (req as any).user?.id;

    if (!userId) {
      throwAppError("User not authenticated", 401);
    }

    const { data, error } = await supabase
      .from("audience_rules")
      .select("*")
      .eq("workspace_id", workspace_id);

    if (error) throw error;

    return res.status(200).json({
      success: true,
      data: data || [],
      message: "Targeting rules retrieved",
    });
  }),
);

router.put(
  "/:ruleId",
  asyncHandler(async (req: Request, res: Response) => {
    const { ruleId } = req.params;
    const { name, conditions, target_count } = req.body;
    const userId = (req as any).user?.id;

    if (!userId) {
      throwAppError("User not authenticated", 401);
    }

    const { data, error } = await supabase
      .from("audience_rules")
      .update({ name, conditions, target_count })
      .eq("id", ruleId)
      .select()
      .single();

    if (error) throw error;

    return res.status(200).json({
      success: true,
      data,
      message: "Targeting rule updated",
    });
  }),
);

router.delete(
  "/:ruleId",
  asyncHandler(async (req: Request, res: Response) => {
    const { ruleId } = req.params;
    const userId = (req as any).user?.id;

    if (!userId) {
      throwAppError("User not authenticated", 401);
    }

    const { error } = await supabase
      .from("audience_rules")
      .delete()
      .eq("id", ruleId);

    if (error) throw error;

    return res.status(200).json({
      success: true,
      message: "Targeting rule deleted",
    });
  }),
);

export default router;
