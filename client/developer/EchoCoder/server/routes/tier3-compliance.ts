import express, { Router, Request, Response } from "express";
import { createClient } from "@supabase/supabase-js";
import { validateAuth } from "../middleware/validateAuth";
import { asyncHandler, throwAppError } from "../middleware/errorHandler";
import { logComplianceOperation } from "../lib/sentryBreadcrumbs";
import {
  verifySupabaseAuth,
  verifyOrganizationAccess,
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

// Security middleware stack: Auth -> Org Access -> Rate Limiting -> Feature Gating
router.use(verifySupabaseAuth);
router.use(verifyOrganizationAccess);
router.use(tier3Limiter);
router.use(featureGate("tier3_compliance"));

router.post(
  "/check",
  asyncHandler(async (req: Request, res: Response) => {
    const { workspace_id, check_type } = req.body;
    const userId = (req as any).user?.id;

    if (!workspace_id || !check_type) {
      throwAppError("workspace_id and check_type are required", 400);
    }

    const { data, error } = await supabase
      .from("compliance_checks")
      .insert([
        {
          workspace_id,
          check_type,
          status: "pending",
          findings: [],
          last_checked: new Date(),
        },
      ])
      .select()
      .single();

    if (error) {
      logComplianceOperation(
        `Compliance check failed: ${check_type}`,
        workspace_id,
        userId,
        "failure",
        { checkType: check_type, error: error.message },
      );
      throw error;
    }

    logComplianceOperation(
      `Compliance check initiated: ${check_type}`,
      workspace_id,
      userId,
      "success",
      { checkType: check_type, checkId: data.id },
    );

    return res.status(201).json({
      success: true,
      data,
      message: "Compliance check initiated",
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
      .from("compliance_checks")
      .select("*")
      .eq("workspace_id", workspace_id)
      .order("last_checked", { ascending: false });

    if (error) throw error;

    return res.status(200).json({
      success: true,
      data: data || [],
      message: "Compliance checks retrieved",
    });
  }),
);

router.get(
  "/report/:workspace_id",
  asyncHandler(async (req: Request, res: Response) => {
    const { workspace_id } = req.params;
    const userId = (req as any).user?.id;

    if (!userId) {
      throwAppError("User not authenticated", 401);
    }

    const { data, error } = await supabase
      .from("compliance_checks")
      .select("*")
      .eq("workspace_id", workspace_id);

    if (error) throw error;

    const report = {
      workspace_id,
      total_checks: data?.length || 0,
      passed: data?.filter((c: any) => c.status === "passed").length || 0,
      failed: data?.filter((c: any) => c.status === "failed").length || 0,
      checks: data || [],
    };

    return res.status(200).json({
      success: true,
      data: report,
      message: "Compliance report generated",
    });
  }),
);

export default router;
