import express, { Router, Request, Response } from "express";
import { createClient } from "@supabase/supabase-js";
import { validateAuth } from "../middleware/validateAuth";
import { asyncHandler, throwAppError } from "../middleware/errorHandler";
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
router.use(featureGate("tier3_logging"));

router.post(
  "/log",
  asyncHandler(async (req: Request, res: Response) => {
    const { workspace_id, action, resource_type, resource_id, changes } =
      req.body;
    const userId = (req as any).user?.id;

    if (!workspace_id || !action) {
      throwAppError("workspace_id and action are required", 400);
    }

    const { data, error } = await supabase
      .from("audit_logs")
      .insert([
        {
          workspace_id,
          user_id: userId,
          action,
          resource_type,
          resource_id,
          changes,
          ip_address: (req as any).ip,
          status: "success",
        },
      ])
      .select()
      .single();

    if (error) throw error;

    return res.status(201).json({
      success: true,
      data,
      message: "Audit log created",
    });
  }),
);

router.get(
  "/:workspace_id",
  asyncHandler(async (req: Request, res: Response) => {
    const { workspace_id } = req.params;
    const { limit = 50, offset = 0 } = req.query;
    const userId = (req as any).user?.id;

    if (!userId) {
      throwAppError("User not authenticated", 401);
    }

    const { data, error } = await supabase
      .from("audit_logs")
      .select("*")
      .eq("workspace_id", workspace_id)
      .order("created_at", { ascending: false })
      .range(Number(offset), Number(offset) + Number(limit) - 1);

    if (error) throw error;

    return res.status(200).json({
      success: true,
      data: data || [],
      message: "Audit logs retrieved",
    });
  }),
);

router.get(
  "/:workspace_id/:user_id",
  asyncHandler(async (req: Request, res: Response) => {
    const { workspace_id, user_id } = req.params;
    const userId = (req as any).user?.id;

    if (!userId) {
      throwAppError("User not authenticated", 401);
    }

    const { data, error } = await supabase
      .from("audit_logs")
      .select("*")
      .eq("workspace_id", workspace_id)
      .eq("user_id", user_id)
      .order("created_at", { ascending: false })
      .limit(100);

    if (error) throw error;

    return res.status(200).json({
      success: true,
      data: data || [],
      message: "User audit logs retrieved",
    });
  }),
);

export default router;
