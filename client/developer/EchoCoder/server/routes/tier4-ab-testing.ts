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
router.use(featureGate("tier4_ab_testing"));

router.post(
  "/",
  asyncHandler(async (req: Request, res: Response) => {
    const { content_id, variant_a, variant_b, traffic_split = 50 } = req.body;
    const userId = (req as any).user?.id;

    if (!content_id || !variant_a || !variant_b) {
      throwAppError("content_id, variant_a, and variant_b are required", 400);
    }

    const { data, error } = await supabase
      .from("ab_tests")
      .insert([
        {
          content_id,
          variant_a,
          variant_b,
          traffic_split,
          status: "active",
        },
      ])
      .select()
      .single();

    if (error) throw error;

    return res.status(201).json({
      success: true,
      data,
      message: "A/B test created",
    });
  }),
);

router.get(
  "/:content_id",
  asyncHandler(async (req: Request, res: Response) => {
    const { content_id } = req.params;
    const userId = (req as any).user?.id;

    if (!userId) {
      throwAppError("User not authenticated", 401);
    }

    const { data, error } = await supabase
      .from("ab_tests")
      .select("*")
      .eq("content_id", content_id)
      .eq("status", "active")
      .single();

    if (error && error.code !== "PGRST116") throw error;

    return res.status(200).json({
      success: true,
      data: data || null,
      message: "A/B test retrieved",
    });
  }),
);

router.post(
  "/:testId/result",
  asyncHandler(async (req: Request, res: Response) => {
    const { testId } = req.params;
    const { variant, metric_name, metric_value } = req.body;
    const userId = (req as any).user?.id;

    if (!userId) {
      throwAppError("User not authenticated", 401);
    }

    const { data, error } = await supabase
      .from("ab_test_results")
      .insert([
        {
          test_id: testId,
          variant,
          views: metric_name === "views" ? metric_value : 0,
          conversions: metric_name === "conversions" ? metric_value : 0,
        },
      ])
      .select()
      .single();

    if (error) throw error;

    return res.status(201).json({
      success: true,
      data,
      message: "A/B test result recorded",
    });
  }),
);

router.put(
  "/:testId/complete",
  asyncHandler(async (req: Request, res: Response) => {
    const { testId } = req.params;
    const { winner } = req.body;
    const userId = (req as any).user?.id;

    if (!userId) {
      throwAppError("User not authenticated", 401);
    }

    const { data, error } = await supabase
      .from("ab_tests")
      .update({ status: "completed", winner })
      .eq("id", testId)
      .select()
      .single();

    if (error) throw error;

    return res.status(200).json({
      success: true,
      data,
      message: "A/B test completed",
    });
  }),
);

export default router;
