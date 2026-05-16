import express, { Router, Request, Response } from "express";
import { createClient } from "@supabase/supabase-js";
import { validateAuth } from "../middleware/validateAuth";
import { asyncHandler, throwAppError } from "../middleware/errorHandler";
import {
  verifySupabaseAuth,
  verifyOrganizationAccess,
  requireOrgAdmin,
} from "../middleware/supabaseAuth";
import { featureGate } from "../middleware/featureGate";
import { tier3Limiter } from "../middleware/rateLimit";

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
router.use(tier3Limiter);
router.use(featureGate("tier3_ip_whitelist"));
router.use(requireOrgAdmin);

router.post(
  "/",
  asyncHandler(async (req: Request, res: Response) => {
    const { workspace_id, ip_address, description } = req.body;
    const userId = (req as any).user?.id;

    if (!workspace_id || !ip_address) {
      throwAppError("workspace_id and ip_address are required", 400);
    }

    const { data, error } = await supabase
      .from("ip_whitelist")
      .insert([
        {
          workspace_id,
          ip_address,
          description,
          active: true,
        },
      ])
      .select()
      .single();

    if (error) throw error;

    return res.status(201).json({
      success: true,
      data,
      message: "IP address added to whitelist",
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
      .from("ip_whitelist")
      .select("*")
      .eq("workspace_id", workspace_id)
      .eq("active", true);

    if (error) throw error;

    return res.status(200).json({
      success: true,
      data: data || [],
      message: "IP whitelist retrieved",
    });
  }),
);

router.delete(
  "/:id",
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const userId = (req as any).user?.id;

    if (!userId) {
      throwAppError("User not authenticated", 401);
    }

    const { error } = await supabase
      .from("ip_whitelist")
      .update({ active: false })
      .eq("id", id);

    if (error) throw error;

    return res.status(200).json({
      success: true,
      message: "IP address removed from whitelist",
    });
  }),
);

export default router;
