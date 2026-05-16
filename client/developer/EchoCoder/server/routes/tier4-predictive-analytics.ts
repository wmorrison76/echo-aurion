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
router.use(featureGate("tier4_predictive_analytics"));

router.post(
  "/predict",
  asyncHandler(async (req: Request, res: Response) => {
    const { content_id, historical_data } = req.body;
    const userId = (req as any).user?.id;

    if (!content_id || !historical_data) {
      throwAppError("content_id and historical_data are required", 400);
    }

    // Simple prediction based on historical average
    const avgViews =
      historical_data.reduce((sum: number, d: any) => sum + (d.views || 0), 0) /
      historical_data.length;
    const avgEngagement =
      historical_data.reduce(
        (sum: number, d: any) => sum + (d.engagement || 0),
        0,
      ) / historical_data.length;

    const { data, error } = await supabase
      .from("predictive_metrics")
      .insert([
        {
          content_id,
          predicted_views: Math.round(avgViews * 1.1),
          predicted_engagement: Math.round(avgEngagement * 1.1),
          confidence: 0.75,
        },
      ])
      .select()
      .single();

    if (error) throw error;

    return res.status(201).json({
      success: true,
      data,
      message: "Predictions generated",
    });
  }),
);

router.get(
  "/content/:contentId",
  asyncHandler(async (req: Request, res: Response) => {
    const { contentId } = req.params;
    const userId = (req as any).user?.id;

    if (!userId) {
      throwAppError("User not authenticated", 401);
    }

    const { data, error } = await supabase
      .from("predictive_metrics")
      .select("*")
      .eq("content_id", contentId)
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    if (error && error.code !== "PGRST116") throw error;

    return res.status(200).json({
      success: true,
      data: data || null,
      message: "Predictions retrieved",
    });
  }),
);

router.post(
  "/evaluate",
  asyncHandler(async (req: Request, res: Response) => {
    const { prediction_id, actual_views, actual_engagement } = req.body;
    const userId = (req as any).user?.id;

    if (!userId) {
      throwAppError("User not authenticated", 401);
    }

    // Calculate accuracy
    const { data: prediction, error: fetchError } = await supabase
      .from("predictive_metrics")
      .select("*")
      .eq("id", prediction_id)
      .single();

    if (fetchError) throw fetchError;

    const viewsAccuracy = prediction
      ? (1 -
          Math.abs(prediction.predicted_views - actual_views) / actual_views) *
        100
      : 0;
    const engagementAccuracy = prediction
      ? (1 -
          Math.abs(prediction.predicted_engagement - actual_engagement) /
            actual_engagement) *
        100
      : 0;

    return res.status(200).json({
      success: true,
      data: {
        prediction_id,
        views_accuracy: Math.max(0, Math.min(100, viewsAccuracy)),
        engagement_accuracy: Math.max(0, Math.min(100, engagementAccuracy)),
      },
      message: "Prediction accuracy evaluated",
    });
  }),
);

export default router;
