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
router.use(featureGate("tier4_image_optimization"));

router.post(
  "/optimize",
  asyncHandler(async (req: Request, res: Response) => {
    const { asset_id, format = "webp", quality = 85 } = req.body;
    const userId = (req as any).user?.id;

    if (!asset_id) {
      throwAppError("asset_id is required", 400);
    }

    const { data, error } = await supabase
      .from("image_optimization_logs")
      .insert([
        {
          asset_id,
          format,
          quality,
          original_size: 0,
          optimized_size: 0,
          status: "pending",
        },
      ])
      .select()
      .single();

    if (error) throw error;

    return res.status(201).json({
      success: true,
      data,
      message: "Image optimization initiated",
    });
  }),
);

router.get(
  "/status/:assetId",
  asyncHandler(async (req: Request, res: Response) => {
    const { assetId } = req.params;
    const userId = (req as any).user?.id;

    if (!userId) {
      throwAppError("User not authenticated", 401);
    }

    const { data, error } = await supabase
      .from("image_optimization_logs")
      .select("*")
      .eq("asset_id", assetId)
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    if (error && error.code !== "PGRST116") throw error;

    return res.status(200).json({
      success: true,
      data: data || null,
      message: "Optimization status retrieved",
    });
  }),
);

router.get(
  "/logs/:workspaceId",
  asyncHandler(async (req: Request, res: Response) => {
    const { workspaceId } = req.params;
    const { limit = 50 } = req.query;
    const userId = (req as any).user?.id;

    if (!userId) {
      throwAppError("User not authenticated", 401);
    }

    const { data, error } = await supabase
      .from("image_optimization_logs")
      .select("*")
      .limit(Number(limit))
      .order("created_at", { ascending: false });

    if (error) throw error;

    return res.status(200).json({
      success: true,
      data: data || [],
      message: "Optimization logs retrieved",
    });
  }),
);

export default router;
