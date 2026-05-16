import express, { Router, Request, Response } from "express";
import { createClient } from "@supabase/supabase-js";
import { validateAuth } from "../middleware/validateAuth";
import { asyncHandler, throwAppError } from "../middleware/errorHandler";
import {
  getSecretsManager,
  sanitizeSecretFromResponse,
} from "../lib/secretsManager";
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
router.use(featureGate("tier3_sso"));
router.use(requireOrgAdmin);

router.post(
  "/configure",
  asyncHandler(async (req: Request, res: Response) => {
    const { workspace_id, provider, client_id, client_secret } = req.body;
    const userId = (req as any).user?.id;

    if (!workspace_id || !provider || !client_id || !client_secret) {
      throwAppError(
        "workspace_id, provider, client_id, and client_secret are required",
        400,
      );
    }

    // Encrypt the client secret before storage
    const secretsManager = getSecretsManager();
    const encrypted_secret = secretsManager.encrypt(client_secret);

    const { data, error } = await supabase
      .from("sso_config")
      .insert([
        {
          workspace_id,
          provider,
          client_id,
          client_secret: encrypted_secret, // Store encrypted
          metadata: {},
        },
      ])
      .select()
      .single();

    if (error) throw error;

    // Don't return the secret (encrypted or not) in response
    const sanitized = sanitizeSecretFromResponse(data);
    return res.status(201).json({
      success: true,
      data: sanitized,
      message: "SSO configuration saved",
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
      .from("sso_config")
      .select("id, workspace_id, provider, metadata, created_at")
      .eq("workspace_id", workspace_id);

    if (error) throw error;

    return res.status(200).json({
      success: true,
      data: data || [],
      message: "SSO configuration retrieved",
    });
  }),
);

router.put(
  "/:configId",
  asyncHandler(async (req: Request, res: Response) => {
    const { configId } = req.params;
    const { client_id, client_secret, metadata } = req.body;
    const userId = (req as any).user?.id;

    if (!userId) {
      throwAppError("User not authenticated", 401);
    }

    const { data, error } = await supabase
      .from("sso_config")
      .update({ client_id, client_secret, metadata })
      .eq("id", configId)
      .select()
      .single();

    if (error) throw error;

    return res.status(200).json({
      success: true,
      data: { ...data, client_secret: "***" },
      message: "SSO configuration updated",
    });
  }),
);

router.delete(
  "/:configId",
  asyncHandler(async (req: Request, res: Response) => {
    const { configId } = req.params;
    const userId = (req as any).user?.id;

    if (!userId) {
      throwAppError("User not authenticated", 401);
    }

    const { error } = await supabase
      .from("sso_config")
      .delete()
      .eq("id", configId);

    if (error) throw error;

    return res.status(200).json({
      success: true,
      message: "SSO configuration deleted",
    });
  }),
);

export default router;
